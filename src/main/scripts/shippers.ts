import { chromium } from 'playwright';
import { waitForLoad } from './browser';
import { getToday } from '.';
import { readFileSync } from 'fs';
import Excel from 'exceljs';
import _ from 'lodash';

export async function shipper({
	name,
	accountNumbers,
	headless
}: {
	name: string;
	accountNumbers: string | string[];
	headless: boolean;
}) {
	const today = getToday();
	const todayString = `${today.toLocaleDateString('en-us', { month: '2-digit' })}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;
	const data = await getShipperData(accountNumbers, headless);
	const outputPath = `C:/Users/5260673/OneDrive - MyFedEx/SAA/Critical Shippers/${name}.xlsx`;

	const rampConversionWorkbook = new Excel.Workbook();
	await rampConversionWorkbook.xlsx.readFile(
		'C:/Users/5260673/OneDrive - MyFedEx/SAA/New Ramp Conversion.xlsx'
	);
	const rampConversionDataSheet = rampConversionWorkbook.getWorksheet('Data Sheet');
	const stations = rampConversionDataSheet?.getColumn(1).values;
	const ramps = rampConversionDataSheet?.getColumn(2).values;
	const lookup = _.fromPairs(_.zip(stations, ramps));

	const formattedData = data.map((row) =>
		row
			.map((value) => (Number.isSafeInteger(parseInt(value)) ? parseInt(value) : value))
			.toSpliced(1, 1, row[1].slice(0, 2), row[1].slice(2))
			.toSpliced(3, 0, lookup[row[1].slice(2)])
	);
	formattedData[0][3] = 'Ramp';

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
	workbook.xlsx.writeFile(outputPath);
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
			console.log('looking for ship date');
			const shipDateRow = await shipDateCell.getAttribute('row', { timeout: 1000 });
			const shipDateValue = shipDateSection.locator(
				`.valueCellsContainer div[row="${shipDateRow}"]`
			);
			await shipDateValue.click();
			const ursaRow = await ursaCell.getAttribute('row');
			const ursaSection = ursaHeader.locator(`+ div .valueCellsContainer div[row="${ursaRow}"]`);
			await ursaSection.click();
			break;
		} catch (error) {
			console.error(error);
			try {
				await shipDateSection.hover();
				await scrollHandle.waitFor({ timeout: 1000 });
				await scrollHandle.dragTo(scrollDownButton);
			} catch {}
		}
	}
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
