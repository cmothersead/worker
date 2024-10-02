import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { chromium, Page } from 'playwright';
import _ from 'lodash';
import Excel from 'exceljs';
import { dreuiReport } from './browser';
import { limboConfig } from './dreuiConfigs';

const blankTemplate = 'C:/Users/5260673/ONeDrive - MyFedEx/Documents/blank.xlsx';

async function waitForLoad(page: Page) {
	const loader = page.locator('svg[class="sf-svg-loader-12x12"]');

	await loader.waitFor({ state: 'visible' });
	await loader.waitFor({ state: 'hidden', timeout: 480000 });
}

export async function limbo({ date, headless }: { date: Date; headless: boolean }) {
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
	const objects = limboData
		.map((entry) => _.zipObject(headers, entry))
		.filter(
			(values) =>
				values['LIMBO Location'].includes('IND') &&
				['B4 22:00', '22:00-22:59', '23:00-23:59', '00:00-00:29', '00:30-00:59'].includes(
					values['At MSL First Scan Window']
				)
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
	// console.log(originOutput);
	console.log(`Top Origin: ${originOutput[2].at(0)?.value} - ${originOutput[2].at(-1)?.value}`);
	// window.webContents.send('limbo:update', {
	// 	topOrigin: { code: originOutput[2].at(0)?.value, quantity: originOutput[2].at(-1)?.value }
	// });
	const topOrigin = originOutput[2][0].value;

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
	console.log(`Top Destination: ${destOutput[2].at(0)?.value} - ${destOutput[2].at(-1)?.value}`);
	// window.webContents.send('limbo:update', {
	// 	topDestination: { code: destOutput[2].at(0)?.value, quantity: destOutput[2].at(-1)?.value }
	// });
	const topDest = destOutput[2][0].value;

	const blank = new Excel.Workbook();
	await blank.xlsx.readFile(blankTemplate);
	blank.removeWorksheet('Sheet1');

	console.log('Researching LIMBO data...');

	const researchOutput = await dreuiReport(
		limboConfig,
		objects.map((item) => item['Tracking Number'])
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
	mapping.forEach(({ name, data }) => blank.addWorksheet(name).addRows(data));

	const monthDirPath = `C:/Users/5260673/OneDrive - MyFedEx/SAA/LIMBO/LIMBO ${today.toLocaleDateString(
		'en-us',
		{
			month: 'short',
			year: 'numeric'
		}
	)}`;
	const archiveFilePath = `${monthDirPath}/LIMBO - ${today.toLocaleDateString('en-us', {
		month: '2-digit'
	})}${today.toLocaleDateString('en-us', {
		day: '2-digit'
	})}.xlsx`;
	const shareFilePath = `C:/Users/5260673/OneDrive - MyFedEx/Communication/Reports/LIMBO/LIMBO - ${today.toLocaleDateString(
		'en-us',
		{
			month: '2-digit'
		}
	)}${today.toLocaleDateString('en-us', {
		day: '2-digit'
	})}.xlsx`;

	if (!existsSync(monthDirPath)) {
		mkdirSync(monthDirPath);
	}
	blank.xlsx.writeFile(archiveFilePath);
	// copyFileSync(archiveFilePath, shareFilePath);
}
