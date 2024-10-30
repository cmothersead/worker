import { chromium } from 'playwright';
import { waitForLoad } from './browser';
import { getToday } from '.';
import { readFileSync } from 'fs';
import Excel from 'exceljs';
import _ from 'lodash';

const rampConversionPath = 'C:/Users/5260673/OneDrive - MyFedEx/SAA/New Ramp Conversion.xlsx';
const managerConversionPath = 'C:/Users/5260673/OneDrive - MyFedEx/SAA/Flight-Manager.xlsx';
const criticalDirPath = 'C:/Users/5260673/OneDrive - MyFedEx/SAA/Critical Shippers';
const preAlertDirPath = 'C:/Users/5260673/OneDrive - MyFedEx/SAA/- Pre-Alerts';

async function getRampLookup() {
	const rampConversionWorkbook = new Excel.Workbook();
	await rampConversionWorkbook.xlsx.readFile(rampConversionPath);
	const rampConversionSheet = rampConversionWorkbook.getWorksheet('Data Sheet');
	if (rampConversionSheet === undefined) throw new Error('Conversion sheet not found');
	const stations = rampConversionSheet
		.getColumn(1)
		.values.filter((value) => value != undefined)
		.map((station) => station.toString());
	const ramps = rampConversionSheet.getColumn(2).values;
	return _.zipObject(stations, ramps);
}

async function getManagerLookup() {
	const managerConversionWorkbook = new Excel.Workbook();
	await managerConversionWorkbook.xlsx.readFile(managerConversionPath);
	const managerConversionSheet = managerConversionWorkbook.getWorksheet('Outbound Flts');
	if (managerConversionSheet === undefined) throw new Error('Conversion sheet not found');
	const headerValues = managerConversionSheet.getRow(1).values;
	const lookupData = managerConversionSheet.getRows(2, managerConversionSheet.rowCount - 1);
	if (lookupData === undefined) throw new Error('No lookup data found');
	const lookupObjects = lookupData.map((row) =>
		_.zipObject(headerValues.slice(1), row.values.slice(1))
	);
	return _.zipObject(
		lookupObjects.map((obj) => obj['Destination']),
		lookupObjects
	);
}

export async function shipper({
	name,
	accountNumbers,
	preAlert,
	headless
}: {
	name: string;
	accountNumbers: string | string[];
	preAlert: boolean;
	headless: boolean;
}) {
	const today = getToday();
	const todayString = `${today.toLocaleDateString('en-us', { month: '2-digit' })}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;
	const data = await getShipperData(accountNumbers, headless);
	const outputPath = `${preAlert ? preAlertDirPath : criticalDirPath}/${name}.xlsx`;

	const lookup = await getRampLookup();

	const formattedData = data.map((row) =>
		row
			.map((value) => (Number.isSafeInteger(parseInt(value)) ? parseInt(value) : value))
			.toSpliced(1, 1, row[1].slice(0, 2), row[1].slice(2))
			.toSpliced(3, 0, lookup[row[1].slice(2)])
	);
	formattedData[0][3] = 'Ramp';

	if (formattedData[1] === undefined) return 0;

	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(outputPath);

	const sheet1 = workbook.getWorksheet('Sheet1') ?? workbook.addWorksheet('Sheet1');
	const dateSheet = workbook.getWorksheet(todayString) ?? workbook.addWorksheet(todayString);

	sheet1.getCell('A2').value = formattedData[1][0];
	sheet1.getCell('B2').value = formattedData[1][1];
	sheet1.getCell('C2').value = formattedData[1][2];
	sheet1.getCell('D2').value = formattedData[1][3];
	sheet1.spliceRows(
		3,
		sheet1.actualRowCount - 2,
		...formattedData.slice(2).map((row) => [...row.slice(0, 4), name])
	);

	dateSheet.spliceRows(1, dateSheet.actualRowCount, ...formattedData);
	// workbook.xlsx.writeFile(outputPath);
	console.log(`${name} done`);
	return formattedData.length - 1;
}

export async function getShipperData(accountNumbers: string | string[], headless: boolean) {
	const browser = await chromium.launch({ headless });
	const page = await browser.newPage();
	await page.goto(
		'https://emars-express-las.g.fedex.com:8001/spotfire/wp/analysis?file=/BT/GSQA/GSQA_RN_PVCC_NG/AnalysisFiles/ShipperPayor&waid=H-9Z5eMuUUWLycZG7--Ib-012316696aT4Es&wavid=0'
	);

	const accountNumberinput = page.locator('input[id="10bf7db48faa40d4bfe57063d29dcba4"]');
	const executeButton = page.locator('input[value="Execute"]');
	const shipperPayor2Tab = page.getByText('Shipper/Payor-2');
	const shipDateHeader = page.getByText('Ship Date').first();
	const shipDateSection = shipDateHeader.locator('+ div');
	const scrollHandle = shipDateSection.locator('.VerticalScrollbarContainer .ScrollbarHandle');
	const scrollUpButton = shipDateSection.locator('.ScrollbarButton.sfpc-top');
	const scrollDownButton = shipDateSection.locator('.ScrollbarButton.sfpc-bottom');
	const shipDateCell = shipDateSection
		.locator('.frozenColumnsContainer')
		.getByText(
			getToday().toLocaleDateString('en-us', {
				month: 'numeric',
				day: 'numeric',
				year: 'numeric'
			})
		)
		.locator('..');
	const totalDateCell = shipDateSection
		.locator('.frozenColumnsContainer')
		.getByText('Grand total')
		.locator('..');
	const ursaHeader = page.getByText('URSA').first();
	const ursaCell = ursaHeader
		.locator('+ div .frozenColumnsContainer')
		.getByText('N')
		.locator('..')
		.first();
	const packageInfoTab = page.getByText('Package Info');

	const exportButton = page.locator('div[title="Export"]');
	const exportTableButton = page.locator('div[title="Export table"]');

	await accountNumberinput.fill([accountNumbers].flat().join(', '));
	await executeButton.click();
	await shipperPayor2Tab.click();
	await waitForLoad(page);

	while (true) {
		try {
			//Scroll section to the bottom if possible
			await shipDateSection.hover();
			await scrollHandle.waitFor({ timeout: 1000 });
			await scrollHandle.dragTo(scrollDownButton);
			break;
		} catch {
			try {
				//If scrolling failed, check to see if already at the bottom/no scrollbar because list is too short
				await totalDateCell.waitFor({ timeout: 1000 });
				break;
			} catch {}
		}
	}

	while (true) {
		try {
			console.log('looking for ship date');
			const shipDateRow = await shipDateCell.getAttribute('row', { timeout: 1000 });
			const shipDateValue = shipDateSection.locator(
				`.valueCellsContainer div[row="${shipDateRow}"]`
			);
			await shipDateValue.click();
			break;
		} catch (error) {
			console.error(error);
			try {
				await shipDateSection.hover();
				await scrollUpButton.click();
			} catch {}
		}
	}
	const ursaRow = await ursaCell.getAttribute('row');
	const ursaSection = ursaHeader.locator(`+ div .valueCellsContainer div[row="${ursaRow}"]`);
	await ursaSection.click();
	await packageInfoTab.click();
	while (true) {
		try {
			await page.locator('.valueCellsContainer').first().click({ button: 'right' });
			await exportButton.click({ timeout: 1000 });
			break;
		} catch {}
	}
	const downloadPromise = page.waitForEvent('download');
	await exportTableButton.click();
	const download = await downloadPromise;
	const data = readFileSync(await download.path())
		.toString()
		.replace(/\0/g, '')
		.split('\r\n')
		.map((line) => line.split('\t'));
	await browser.close();
	data[0][0] = 'Tracking Number';
	return data;
}

export async function aggregate(shippers: { name: string; preAlert: boolean }[]) {
	const today = getToday();
	const dateString = `${today.toLocaleDateString('en-us', { month: '2-digit' })}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;

	const dataPromise = shippers.map(async (shipper) => {
		const inputPath = `${shipper.preAlert ? preAlertDirPath : criticalDirPath}/${shipper.name}.xlsx`;
		const workbook = new Excel.Workbook();
		await workbook.xlsx.readFile(inputPath);

		const dateSheetName = workbook.worksheets.find(({ name }) => name.trim() === dateString)?.name;
		if (!dateSheetName) {
			console.log(`Date sheet not found in ${shipper.name}`);
			return [];
		}
		const dateSheet = workbook.getWorksheet(dateSheetName);
		return dateSheet
			?.getRows(2, dateSheet.rowCount - 1)
			?.map((row) => row.values)
			.map((row) => ({
				trackingNumber: row[1],
				station: row[3],
				shipper:
					shipper.name === 'Reptiles by Mack'
						? row[16].toString().includes('06')
							? 'Reptiles Ice'
							: 'Reptiles Live'
						: shipper.name
			}))
			.filter(({ trackingNumber }) => trackingNumber != undefined);
	});
	const data = await Promise.all(dataPromise);
	const rampLookup = await getRampLookup();
	const outboundLookup = await getManagerLookup();

	const outWorkbook = new Excel.Workbook();
	const outputs = _.groupBy(
		data.flatMap((shipments) =>
			shipments?.map(({ trackingNumber, station, shipper }) => {
				const ramp = rampLookup[station];
				const outboundObject =
					ramp != undefined ? outboundLookup[ramp.toString().slice(0, 3)] : undefined;
				const outbound = outboundObject != undefined ? outboundObject['Outbound'] : undefined;
				return [, trackingNumber, station, ramp, shipper, outbound];
			})
		),
		(val) => val[5] ?? ''
	);
	await Promise.all(
		Object.keys(outputs)
			.filter((val) => val != '')
			.map(async (key) => {
				const sheet = outWorkbook.addWorksheet(key, {
					headerFooter: { oddHeader: '&L&D&C&A&RPage &P of &N' }
				});
				if (sheet === undefined) {
					console.error('Sheet not created');
					return;
				}
				sheet.addRow(['Tracking Number', 'Dest Station', 'Dest Ramp', 'Shipper']);
				sheet.addRows(outputs[key].map((row) => row?.slice(0, 5)));
				const trackingNumberColumn = sheet.getColumn(1);
				trackingNumberColumn.numFmt = '0';
				trackingNumberColumn.width = 16;
				sheet.getColumn(2).width = 12;
				sheet.getColumn(3).width = 11;
				sheet.getColumn(4).width = 19;
			})
	);
	await outWorkbook.xlsx.writeFile(
		`C:/Users/5260673/OneDrive - MyFedEx/SAA/CST Beginning of Night/Shipments by Outbound - ${dateString}.xlsx`
	);
	console.log('done');
}
