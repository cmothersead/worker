import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync, copyFileSync, writeFileSync } from 'fs';
import AdmZip from 'adm-zip';
import _ from 'lodash';
import { parse } from 'csv-parse/sync';
import { commCommentAllConfig, limboConfig, scorecardConfig } from './dreuiConfigs.js';

const blankTemplate = 'C:/Users/5260673/ONeDrive - MyFedEx/Documents/blank.xlsx';

export async function limboProcess(browser, customDate) {
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

	const today = new Date(customDate ?? Date.now());
	if (customDate == undefined && today.getHours() < 12) today.setDate(today.getDate() - 1);
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
	].map((row, rowIndex) =>
		row.map((value, columnIndex) => {
			const rowStyle = rowIndex === 0 ? 7 : rowIndex === 1 ? 10 : rowIndex === 2 ? 4 : 2;
			const columnStyle =
				rowIndex > 1 ? 0 : columnIndex === 0 ? -1 : columnIndex === row.length - 1 ? 1 : 0;
			const numberStyle = rowIndex < 2 ? 0 : Number.isSafeInteger(value) ? 1 : 0;
			const style = rowStyle + columnStyle + numberStyle;
			return {
				value,
				style
			};
		})
	);
	// console.log(originOutput);
	console.log(`Top Origin: ${originOutput[2].at(0).value} - ${originOutput[2].at(-1).value}`);
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
	].map((row, rowIndex) =>
		row.map((value, columnIndex) => {
			const rowStyle = rowIndex === 0 ? 7 : rowIndex === 1 ? 10 : rowIndex === 2 ? 4 : 2;
			const columnStyle =
				rowIndex > 1 ? 0 : columnIndex === 0 ? -1 : columnIndex === row.length - 1 ? 1 : 0;
			const numberStyle = rowIndex < 2 ? 0 : Number.isSafeInteger(value) ? 1 : 0;
			const style = rowStyle + columnStyle + numberStyle;
			return {
				value,
				style
			};
		})
	);
	console.log(`Top Destination: ${destOutput[2].at(0).value} - ${destOutput[2].at(-1).value}`);
	const topDest = destOutput[2][0].value;

	const blank = new AdmZip(blankTemplate);
	const newSheetData = blank.getEntry('xl/worksheets/sheet1.xml').getData().toString();

	const sheets = blank
		.getEntry('xl/workbook.xml')
		.getData()
		.toString()
		.match(/<sheet.*\/>/)
		.map((sheetString) => ({
			id: sheetString.match(/sheetId="(.*?)"/)[1],
			name: sheetString.match(/name="(.*?)"/)[1]
		}));
	sheets.find(({ id }) => id == 1).name = 'LIMBO';
	sheets.push({ id: 2, name: 'Research' });
	sheets.push({ id: 3, name: `From ${topOrigin}` });
	sheets.push({ id: 4, name: `To ${topDest}` });
	sheets.push({ id: 5, name: 'Origin' });
	sheets.push({ id: 6, name: 'Destination' });
	const workbookXml = blank.getEntry('xl/workbook.xml');
	const workbookXmlDataString = workbookXml.getData().toString();
	workbookXml.setData(
		workbookXmlDataString.replace(
			workbookXmlDataString.match(/<sheets>(.*?)<\/sheets>/)[1],
			sheets
				.map(({ id, name }) => `<sheet name="${name}" sheetId="${id}" r:id="rId${id}" />`)
				.join('')
		)
	);
	const relsXml = blank.getEntry('xl/_rels/workbook.xml.rels');
	const relsXmlDataString = relsXml.getData().toString();
	relsXml.setData(
		relsXmlDataString.replace(
			relsXmlDataString.match(/<Relationships.*?>(.*?)<\/Relationships>/)[1],
			sheets
				.map(
					({ id }) => `<Relationship Id="rId${id}"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
            Target="worksheets/sheet${id}.xml" />`
				)
				.join('') +
				`<Relationship Id="rId${sheets.length + 1}"
                Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
                Target="styles.xml" />
            <Relationship Id="rId${sheets.length + 2}"
                Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"
                Target="theme/theme1.xml" />`
		)
	);

	const styleXml = blank.getEntry('xl/styles.xml');
	const styleXmlDataString = styleXml.getData().toString();
	styleXml.setData(
		styleXmlDataString
			.replace(
				styleXmlDataString.match(/<cellXfs.*?<\/cellXfs>/)[0],
				`<cellXfs count="12">
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" />
                    <xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" />
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" />
                    <xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" />
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" />
                    <xf numFmtId="1" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1" />
                    <xf numFmtId="0" fontId="1" fillId="2" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
                        <alignment wrapText="1" />
                    </xf>
                    <xf numFmtId="0" fontId="1" fillId="2" borderId="4" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
                        <alignment wrapText="1" />
                    </xf>
                    <xf numFmtId="0" fontId="1" fillId="2" borderId="5" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
                        <alignment wrapText="1" />
                    </xf>
                    <xf numFmtId="0" fontId="1" fillId="0" borderId="6" xfId="0" applyFont="1" applyBorder="1" />
                    <xf numFmtId="1" fontId="1" fillId="0" borderId="7" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" />
                    <xf numFmtId="1" fontId="1" fillId="0" borderId="8" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" />
                </cellXfs>`
			)
			.replace(
				styleXmlDataString.match(/<fills.*?<\/fills>/)[0],
				`<fills count="2">
                    <fill>
                        <patternFill patternType="none" />
                    </fill>
                    <fill>
                        <patternFill patternType="gray125" />
                    </fill>
                    <fill>
                        <patternFill patternType="solid">
                            <fgColor rgb="FFFFFF00" />
                            <bgColor indexed="64" />
                        </patternFill>
                    </fill>
                </fills>`
			)
			.replace(
				styleXmlDataString.match(/<borders.*?<\/borders>/)[0],
				`<borders count="9">
                    <border />
                    <border>
                        <left style="thin" />
                        <right style="thin" />
                        <top style="thin" />
                        <bottom style="thin" />
                    </border>
                    <border>
                        <left style="thin" />
                        <right style="thin" />
                        <bottom style="thin" />
                    </border>
                    <border>
                        <left style="medium" />
                        <right style="thin" />
                        <top style="medium" />
                    </border>
                    <border>
                        <left style="thin" />
                        <right style="thin" />
                        <top style="medium" />
                    </border>
                    <border>
                        <left style="thin" />
                        <right style="medium" />
                        <top style="medium" />
                    </border>
                    <border>
                        <left style="medium" />
                        <right style="thin" />
                        <bottom style="medium" />
                    </border>
                    <border>
                        <left style="thin" />
                        <right style="thin" />
                        <bottom style="medium" />
                    </border>
                    <border>
                        <left style="thin" />
                        <right style="medium" />
                        <bottom style="medium" />
                    </border>
                </borders>`
			)
			.replace(
				styleXmlDataString.match(/<fonts.*?<\/fonts>/)[0],
				`<fonts count="2" x14ac:knownFonts="1">
                    <font>
                        <sz val="11" />
                        <color theme="1" />
                        <name val="Calibri" />
                        <family val="2" />
                        <scheme val="minor" />
                    </font>
                    <font>
                        <b />
                        <sz val="11" />
                        <color theme="1" />
                        <name val="Calibri" />
                        <family val="2" />
                        <scheme val="minor" />
                    </font>
                </fonts>`
			)
	);

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

	blank
		.getEntry('xl/worksheets/sheet1.xml')
		.setData(newSheetData.replace('<sheetData/>', createSheetData(output)));
	blank.addFile(
		'xl/worksheets/sheet2.xml',
		Buffer.from(newSheetData.replace('<sheetData/>', createSheetData(researchOutput)))
	);
	blank.addFile(
		'xl/worksheets/sheet3.xml',
		Buffer.from(newSheetData.replace('<sheetData/>', createSheetData(originReseachOutput)))
	);
	blank.addFile(
		'xl/worksheets/sheet4.xml',
		Buffer.from(newSheetData.replace('<sheetData/>', createSheetData(destResearchOutput)))
	);
	blank.addFile(
		'xl/worksheets/sheet5.xml',
		Buffer.from(newSheetData.replace('<sheetData/>', createSheetData(originOutput)))
	);
	blank.addFile(
		'xl/worksheets/sheet6.xml',
		Buffer.from(newSheetData.replace('<sheetData/>', createSheetData(destOutput)))
	);
	if (
		!existsSync(
			`C:/Users/5260673/OneDrive - MyFedEx/SAA/LIMBO/LIMBO ${today.toLocaleDateString('en-us', {
				month: 'short',
				year: 'numeric'
			})}`
		)
	) {
		mkdirSync(
			`C:/Users/5260673/OneDrive - MyFedEx/SAA/LIMBO/LIMBO ${today.toLocaleDateString('en-us', {
				month: 'short',
				year: 'numeric'
			})}`
		);
	}
	blank.writeZip(
		`C:/Users/5260673/OneDrive - MyFedEx/SAA/LIMBO/LIMBO ${today.toLocaleDateString('en-us', {
			month: 'short',
			year: 'numeric'
		})}/LIMBO - ${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', {
			day: '2-digit'
		})}.xlsx`
	);
	copyFileSync(
		`C:/Users/5260673/OneDrive - MyFedEx/SAA/LIMBO/LIMBO ${today.toLocaleDateString('en-us', {
			month: 'short',
			year: 'numeric'
		})}/LIMBO - ${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', {
			day: '2-digit'
		})}.xlsx`,
		`C:/Users/5260673/OneDrive - MyFedEx/Communication/Reports/LIMBO/LIMBO - ${today.toLocaleDateString(
			'en-us',
			{
				month: '2-digit'
			}
		)}${today.toLocaleDateString('en-us', {
			day: '2-digit'
		})}.xlsx`
	);
}

function createSheetData(dataArray) {
	let sheetData =
		dataArray[0][0] == 'Tracking Number'
			? `<cols><col min="1" max="1" width="16.140625" bestFit="1" customWidth="1" /></cols><sheetData>`
			: '<sheetData>';
	const replacements = [
		{ search: '&', replace: '&amp;' },
		{ search: '<', replace: '&lt;' },
		{ search: '>', replace: '&gt;' }
	];
	for (const values of dataArray) {
		sheetData += '<row>';
		for (const data of values) {
			let value = data.value != undefined ? data.value : data;
			replacements.forEach(
				({ search, replace }) => (value = value.toString().replaceAll(search, replace))
			);

			const style =
				data.style != undefined && data.style != 0
					? ` s="${data.style}"`
					: Number.isSafeInteger(parseInt(value))
						? ` s="1"`
						: '';
			sheetData += Number.isSafeInteger(parseInt(value))
				? `<c${style}><v>${parseInt(value)}</v></c>`
				: `<c t="inlineStr"${style}><is><t>${value}</t></is></c>`;
		}
		sheetData += '</row>';
	}
	sheetData += '</sheetData>';
	return sheetData;
}

async function waitForLoad(page) {
	const loader = page.locator('svg[class="sf-svg-loader-12x12"]');

	await loader.waitFor({ state: 'visible' });
	await loader.waitFor({ state: 'hidden', timeout: 480000 });
}

export async function scorecard(trackingNumbers: number[]) {
	const getData = async () => {
		const data = await dreuiReport(scorecardConfig, trackingNumbers);
		console.log(data.length);
		const dataNoDuplicates = data.filter(
			(line, index) => data.findIndex((find) => find[0] == line[0]) == index
		);
		console.log(dataNoDuplicates.length);
		return dataNoDuplicates;
	};
	const getCommData = async () => {
		const commData = await dreuiReport(commCommentAllConfig, trackingNumbers);
		console.log(commData.length);
		const commDataNoDuplicates = commData.filter(
			(line, index) => commData.findIndex((find) => find[0] == line[0]) == index
		);
		console.log(commDataNoDuplicates.length);
		return commDataNoDuplicates;
	};

	const [data, commData] = await Promise.all([getData(), getCommData()]);
	const unzipData = _(data).unzip().value();
	const unzipCommData = _(commData).unzip().value();
	unzipData.splice(4, 0, unzipCommData[1]);
	const outputData = _.zip(...unzipData);
	writeFileSync(
		'C:/Users/5260673/Downloads/out.csv',
		outputData.map((line) => line.map((item) => `"${item}"`).join(',')).join('\n')
	);
}

export async function dreuiReport(config, trackingNumbers) {
	const trackingNumbersRemaining = [...trackingNumbers];
	const sessions: any[] = [];

	while (trackingNumbersRemaining.length > 0) {
		const currentTrackingNumbers = trackingNumbersRemaining.splice(0, 18000);
		sessions.push(dreuiSession(config, currentTrackingNumbers));
	}

	const results = await Promise.all(sessions);
	const headers = results[0][0];
	headers[0] = 'Tracking Number';
	return [headers, ...results.flatMap((result) => result.slice(1))];
}

export async function dreuiSession(config, trackingNumbers) {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	await page.goto(
		'https://emars-tssrealtime-las.g.fedex.com:8001/spotfire/wp/analysis?file=/DRE/DREReport/AnalysisFiles/DREReport&waid=IwquIJCnk0yWrdYUHb8A6-17132565edpaLr&wavid=0'
	);

	const launchReportButton = page.locator('input[value="Launch Report"]');
	const fieldsTextbox = page.getByText('Tracking Number ');
	const executeButton = page.locator('input[value="Execute"]').first();
	const accordionHeader = page.getByText('Tracking Item Number (TIN) Queries');
	const output = page.locator('.contentContainerParent');
	const exportButton = page.locator('div[title="Export"]');
	const exportTableButton = page.locator('div[title="Export table"]');
	const tinList = page.locator('#tinlist');

	async function applyLocationFilters(filterText) {
		const scanLocFilters = page.getByText('Scan Loc Filters:').getByText('(None)');
		const stationLocs = page.getByText('Station Loc(s)');
		const locationList = page.getByText('Location List:').locator('input');

		await scanLocFilters.scrollIntoViewIfNeeded();
		await scanLocFilters.click();
		await stationLocs.click();
		await waitForLoad(page);
		await locationList.fill(filterText);
	}

	async function applyOrdering(ordering = 'Original') {
		if (ordering == undefined) ordering = 'Original';
		const orderingOptions = page.getByText('TIN Query Results Ordering:').getByText('Standard');
		const optionToSelect = page.getByText(ordering);

		await orderingOptions.click();
		await optionToSelect.click();
	}

	await launchReportButton.click();
	await waitForLoad(page);

	const { fields, ordering, locFilter } = config;
	await fieldsTextbox.fill(fields.join('\n'));
	await applyOrdering(ordering);
	if (locFilter) await applyLocationFilters(locFilter);

	await accordionHeader.click();
	await tinList.evaluate((list, value) => (list.value = value), trackingNumbers.join('\n'));
	await tinList.type('\n');

	await executeButton.click();
	await waitForLoad(page);
	await output.click({ button: 'right', timeout: 300000 });
	await exportButton.click();

	const downloadPromise = page.waitForEvent('download');
	await exportTableButton.click();
	const download = await downloadPromise;
	const path = await download.path();
	const data = readFileSync(path).toString().replace(/\0/g, '');
	const outputData = parse(data, { delimiter: '\t' });

	await browser.close();

	return outputData;
}
