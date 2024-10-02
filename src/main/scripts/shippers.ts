import { chromium } from 'playwright';
import { waitForLoad } from './browser';
import { getToday } from '.';
import { readFileSync } from 'fs';

export async function shippers(accountNumbers: string | string[]) {
	const browser = await chromium.launch({ headless: false });
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
	const ursaCell = ursaHeader.locator('+ div .frozenColumnsContainer').getByText('N').locator('..');
	const packageInfoTab = page.getByText('Package Info');

	const exportButton = page.locator('div[title="Export"]');
	const exportTableButton = page.locator('div[title="Export table"]');

	await accountNumberinput.fill([accountNumbers].flat().join(', '));
	await executeButton.click();
	await shipperPayor2Tab.click();
	await waitForLoad(page);

	while (true) {
		try {
			const shipDateRow = await shipDateCell.getAttribute('row', { timeout: 10 });
			const shipDateValue = shipDateSection.locator(
				`.valueCellsContainer div[row="${shipDateRow}"]`
			);
			await shipDateValue.click();
			const ursaRow = await ursaCell.getAttribute('row');
			const ursaSection = ursaHeader.locator(`+ div .valueCellsContainer div[row="${ursaRow}"]`);
			await ursaSection.click();
			break;
		} catch {
			console.log('loop enter');
			await shipDateSection.hover();
			await scrollHandle.dragTo(scrollDownButton);
		}
	}
	await packageInfoTab.click();
	await page.locator('.valueCellsContainer').first().click({ button: 'right' });
	await exportButton.click();
	const downloadPromise = page.waitForEvent('download');
	await exportTableButton.click();
	const download = await downloadPromise;
	const data = readFileSync(await download.path())
		.toString()
		.replace(/\0/g, '')
		.split('\r\n')
		.map((line) => line.split('\t'));
	await browser.close();
	return data;
}
