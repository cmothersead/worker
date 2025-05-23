import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import { chromium, type Page } from 'playwright';
import _ from 'lodash';
import Excel from 'exceljs';
import { dreuiReport } from './browser';
import { limboConfig } from './dreuiConfigs';
import { getToday, getYesterday } from '.';

async function waitForLoad(page: Page) {
	const loader = page.locator('svg[class="sf-svg-loader-12x12"]');

	await loader.waitFor({ state: 'visible' });
	await loader.waitFor({ state: 'hidden', timeout: 480000 });
}

export async function limbo({
	date,
	untilIndex,
	templateFilePath,
	outputDirectoryPath,
	archiveDirectoryPath,
	headless
}: {
	date: Date;
	untilIndex: number;
	templateFilePath: string;
	outputDirectoryPath: string;
	archiveDirectoryPath: string | undefined;
	headless: boolean;
}) {
	const browser = await chromium.launch({ headless });
	const page = await browser.newPage();
	await page.goto(
		'https://emars-express-las.g.fedex.com:8001/spotfire/wp/analysis?file=/BT/GSQA/LIMBO/AnalysisFiles/LIMBO&waid=gshklIgVHEaeDVbdZbPXH-0921566a8acoJP&wavid=0'
	);

	const limboDetailViewer = page.locator('div[title="LIMBO Detail Viewer"]');
	const limboLocationSearch = page.locator(
		'span[title="LIMBO Location"] + div + div + span input.SearchInput'
	);
	const searchButton = page.locator(
		'span[title="LIMBO Location"] + div + div + span div.VirtualBoxMagnifier'
	);
	const INDHFilter = page.locator(
		'span[title="LIMBO Location"] + div + div + span div[title="INDH"]'
	);
	const dateTextBox = page.locator('#ibDate > input');
	const getDataButton = page.locator('input[value="Get Data"]');
	const limboAtMSL = page.locator('div[title="LIMBO At MSL"]');

	const exportButton = page.locator('div[title="Export"]');
	const exportTableButton = page.locator('div[title="Export table"]');

	console.log('Opening LIMBO report.');
	await limboDetailViewer.click();
	await limboLocationSearch.fill('INDH');
	await searchButton.click();
	await INDHFilter.click();
	await waitForLoad(page);

	const today = new Date(date ?? Date.now());
	if (date == undefined && today.getHours() < 12) today.setDate(today.getDate() - 1);
	await dateTextBox.fill(
		today.toLocaleDateString('en-us', {
			month: '2-digit',
			day: '2-digit',
			year: 'numeric'
		})
	);
	await getDataButton.click();
	await limboAtMSL.click();
	await waitForLoad(page);

	await page.locator('.valueCellsContainer').first().click({ button: 'right' });
	await exportButton.click();
	const downloadPromise = page.waitForEvent('download');
	await exportTableButton.click();
	const download = await downloadPromise;
	const limboData = readFileSync(await download.path())
		.toString()
		.replace(/\0/g, '')
		.split('\r\n')
		.map((line) => line.split('\t'));
	console.log('LIMBO data downloaded.');
	await page.close();

	const headers = limboData
		.splice(0, 1)[0]
		.map((header) => (header.includes('Tracking Number') ? 'Tracking Number' : header));

	const until = [
		'B4 22:00',
		'22:00-22:59',
		'23:00-23:59',
		'00:00-00:29',
		'00:30-00:59',
		'01:00-01:29',
		'01:30-01:59',
		'02:00-02:59',
		'After 23:59'
	];
	const objects = limboData
		.map((entry) => _.zipObject(headers, entry))
		.filter(
			(values) =>
				values['LIMBO Location'].includes('IND') &&
				until.slice(0, untilIndex + 1).includes(values['At MSL First Scan Window'])
		);
	const output = [headers, ...objects.map((object) => headers.map((header) => object[header]))];

	const groupedByOrigin = {
		..._(objects)
			.groupBy('Origin Mkt IATA')
			.mapValues((list) => ({
				..._(list).groupBy('Exception Type').mapValues('length').value(),
				Total: list.length
			}))
			.value(),
		Total: {
			..._(objects).groupBy('Exception Type').mapValues('length').value(),
			Total: objects.length
		}
	};
	const originOutput = [
		['Origin Mkt IATA', ...Object.keys(groupedByOrigin['Total']).sort()],
		..._(groupedByOrigin)
			.mapValues((value) =>
				Object.keys(groupedByOrigin['Total'])
					.sort()
					.map((key) => value[key] ?? '')
			)
			.toPairs()
			.map((pair) => _(pair).flatten().value())
			.orderBy(
				(list) => list.at(Object.keys(groupedByOrigin['Total']).indexOf('Total') + 1),
				'desc'
			)
			.value()
	];
	const topOrigin = originOutput[2].at(0);
	const topOriginCount = originOutput[2].at(-1);
	console.log(`Top Origin: ${topOrigin} - ${topOriginCount}`);

	const groupedByDestination = {
		..._(objects)
			.groupBy('Dest Mkt IATA')
			.mapValues((list) => ({
				..._(list).groupBy('Exception Type').mapValues('length').value(),
				Total: list.length
			}))
			.value(),
		Total: {
			..._(objects).groupBy('Exception Type').mapValues('length').value(),
			Total: objects.length
		}
	};
	const destOutput = [
		['Dest Mkt IATA', ...Object.keys(groupedByDestination['Total']).sort()],
		..._(groupedByDestination)
			.mapValues((value) =>
				Object.keys(groupedByDestination['Total'])
					.sort()
					.map((key) => value[key] ?? '')
			)
			.toPairs()
			.map((pair) => _(pair).flatten().value())
			.orderBy(
				(list) => list.at(Object.keys(groupedByDestination['Total']).indexOf('Total') + 1),
				'desc'
			)
			.value()
	];
	const topDest = destOutput[2].at(0);
	const topDestCount = destOutput[2].at(-1);
	console.log(`Top Destination: ${topDest} - ${topDestCount}`);

	const blank = new Excel.Workbook();
	await blank.xlsx.readFile(templateFilePath);
	blank.removeWorksheet('Sheet1');

	console.log('Researching LIMBO data...');

	const researchOutput = await dreuiReport(
		limboConfig,
		objects.map((item) => parseInt(item['Tracking Number']))
	);
	console.log('LIMBO research downloaded.');
	researchOutput[0][0] = 'Tracking Number';

	const originReseachOutput = researchOutput.filter(
		(line) => line[0] == 'Tracking Number' || line[1] == topOrigin
	);
	const destResearchOutput = researchOutput.filter(
		(line) => line[0] == 'Tracking Number' || line[3] == topDest
	);

	const mapping = [
		{ name: 'LIMBO', data: output },
		{ name: 'Research', data: researchOutput },
		{ name: `To ${topOrigin}`, data: originReseachOutput },
		{ name: `From ${topDest}`, data: destResearchOutput },
		{ name: 'Origin', data: originOutput },
		{ name: 'Destination', data: destOutput }
	];
	mapping.forEach(({ name, data }) => {
		const sheet = blank.addWorksheet(name);
		sheet.addRows(data);
		if (name === 'LIMBO' || name === 'Research') {
			const columnA = sheet.getColumn('A');
			columnA.width = 13;
			columnA.numFmt = '0';
		}
		if (name === 'Origin' || name === 'Destination') {
			sheet.eachRow((row) =>
				row.eachCell(
					(cell) =>
						(cell.border = {
							top: { style: 'thin' },
							bottom: { style: 'thin' },
							left: { style: 'thin' },
							right: { style: 'thin' }
						})
				)
			);
			const row1 = sheet.getRow(1);
			const row2 = sheet.getRow(2);
			row1.eachCell((cell, colNumber) => {
				cell.font = { bold: true };
				cell.alignment = { wrapText: true };
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
				if (colNumber === 1) {
					cell.border = {
						top: { style: 'thick' },
						left: { style: 'thick' },
						right: { style: 'thin' }
					};
				} else if (colNumber === row1.cellCount) {
					cell.border = {
						top: { style: 'thick' },
						left: { style: 'thin' },
						right: { style: 'thick' }
					};
				} else {
					cell.border = {
						top: { style: 'thick' },
						left: { style: 'thin' },
						right: { style: 'thin' }
					};
				}
			});
			row2.eachCell((cell, colNumber) => {
				cell.font = { bold: true };
				if (colNumber === 1) {
					cell.border = {
						bottom: { style: 'thick' },
						left: { style: 'thick' },
						right: { style: 'thin' }
					};
				} else if (colNumber === row2.cellCount) {
					cell.border = {
						bottom: { style: 'thick' },
						left: { style: 'thin' },
						right: { style: 'thick' }
					};
				} else {
					cell.border = {
						bottom: { style: 'thick' },
						left: { style: 'thin' },
						right: { style: 'thin' }
					};
				}
			});
		}
	});

	const shareFilePath = `${outputDirectoryPath}/LIMBO - ${today.toLocaleDateString('en-us', {
		month: '2-digit'
	})}${today.toLocaleDateString('en-us', {
		day: '2-digit'
	})}.xlsx`;
	deleteOldLIMBO(outputDirectoryPath);
	await blank.xlsx.writeFile(shareFilePath);

	if (archiveDirectoryPath) {
		const monthDirPath = `${archiveDirectoryPath}/LIMBO ${today.toLocaleDateString('en-us', {
			month: 'short',
			year: 'numeric'
		})}`;
		const archiveFilePath = `${monthDirPath}/LIMBO - ${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', {
			day: '2-digit'
		})}.xlsx`;

		if (!existsSync(monthDirPath)) {
			mkdirSync(monthDirPath);
		}
		copyFileSync(shareFilePath, archiveFilePath);
	}

	return {
		topOrigin: { code: topOrigin, quantity: topOriginCount },
		topDestination: { code: topDest, quantity: topDestCount }
	};
}

export function deleteOldLIMBO(outputDirectoryPath: string) {
	const yesterday = getYesterday();
	const old = readdirSync(outputDirectoryPath).filter((fileName) =>
		fileName.includes(
			`${yesterday.toLocaleDateString('en-us', {
				month: '2-digit'
			})}${yesterday.toLocaleDateString('en-us', { day: '2-digit' })}`
		)
	);

	for (const oldFile of old) {
		unlinkSync(`${outputDirectoryPath}/${oldFile}`);
	}
}

export async function getExistingLIMBO(outputDirectoryPath: string) {
	const today = getToday();
	const shareFilePath = `${outputDirectoryPath}/LIMBO - ${today.toLocaleDateString('en-us', {
		month: '2-digit'
	})}${today.toLocaleDateString('en-us', {
		day: '2-digit'
	})}.xlsx`;

	const workbook = new Excel.Workbook();
	if (!existsSync(shareFilePath)) return undefined;
	await workbook.xlsx.readFile(shareFilePath);
	const originSheet = workbook.getWorksheet('Origin');
	if (originSheet === undefined) throw new Error('Origin sheet not found');
	const topOrigin = {
		code: (originSheet.getRow(3).values as Excel.CellValue[]).at(1),
		quantity: (originSheet.getRow(3).values as Excel.CellValue[]).at(-1)
	};
	const destinationSheet = workbook.getWorksheet('Destination');
	if (destinationSheet === undefined) throw new Error('Destination sheet not found');
	const topDestination = {
		code: (destinationSheet.getRow(3).values as Excel.CellValue[]).at(1),
		quantity: (destinationSheet.getRow(3).values as Excel.CellValue[]).at(-1)
	};
	return { topOrigin, topDestination };
}
