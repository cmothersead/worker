import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import AdmZip from 'adm-zip';
import { chromium, type Page } from 'playwright';
import { BrowserWindow } from 'electron';
import { getToday, getYesterday } from '.';

const dests = {
	1623: 'BUR',
	1633: 'BUR',
	1685: 'LAX',
	1642: 'SJC',
	1686: 'SJC',
	1645: 'OAK',
	1648: 'ONT',
	1650: 'LAX',
	151: 'YYZ',
	153: 'YMX',
	1600: 'EWR',
	1601: 'DFW',
	1602: 'ORD',
	1603: 'ATL',
	1604: 'PHL',
	1605: 'ATL',
	1606: 'MKE',
	1607: 'EWR',
	1608: 'STL',
	1609: 'DFW',
	1610: 'BOS',
	1611: 'DTW',
	1612: 'JFK',
	1613: 'MCI',
	1614: 'AFW',
	1615: 'LCK',
	1617: 'IAH',
	1618: 'MSP',
	1619: 'TYS',
	1621: 'EWR',
	1622: 'PIT',
	1624: 'GSO',
	1625: 'ELP',
	1627: 'ORD',
	1628: 'DEN',
	1630: 'BWI',
	1631: 'CLE',
	1635: 'CLT',
	1638: 'RDU',
	1639: 'BNA',
	1643: 'GRR',
	1647: 'BDL',
	1654: 'SAN',
	1661: 'SLC',
	1664: 'ABE',
	1667: 'SYR',
	1669: 'TPA',
	1670: 'MDT',
	1676: 'CID',
	1678: 'PHX',
	1679: 'IAD',
	1681: 'MCO',
	1682: 'BNA',
	22: 'ANC',
	9: 'STN'
};

export async function laneToLane({
	consNumber,
	templateFilePath,
	outputDirectoryPath,
	archiveDirectoryPath,
	headless,
	username,
	password,
	window
}: {
	consNumber: string;
	templateFilePath: string;
	outputDirectoryPath: string;
	archiveDirectoryPath: string;
	headless: boolean;
	username: string;
	password: string;
	window: BrowserWindow;
}) {
	const today = getToday();
	const yesterday = getYesterday();

	deleteOldLaneToLanes(yesterday, outputDirectoryPath, window);

	console.log('downloading data');
	if (consNumber == undefined) return undefined;
	console.log('cons number', consNumber);
	const downloadData = await downloadReportData({
		consNumber,
		username,
		password,
		headless
	});

	console.log('saving output');
	return await saveOutput({
		today,
		dataString: downloadData,
		templateFilePath,
		outputDirectoryPath,
		archiveDirectoryPath
	});
}

export async function laneToLaneExists({
	flightNumber,
	outputDirectoryPath
}: {
	flightNumber: number;
	outputDirectoryPath: string;
}) {
	const today = getToday();
	const path = `${outputDirectoryPath}/F${flightNumber} ${dests[flightNumber]} ${today.toLocaleDateString(
		'en-us',
		{
			month: '2-digit'
		}
	)}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`;
	return existsSync(path) ? path : undefined;
}

export async function getCONSNumber({
	flightNumber,
	headless,
	username,
	password
}: {
	flightNumber: number;
	headless: boolean;
	username: string;
	password: string;
}) {
	return await lookupConsFromFlight({
		flightNumber,
		headless,
		username,
		password,
		today: getToday()
	});
}

function deleteOldLaneToLanes(yesterday: Date, dir: string, window: BrowserWindow) {
	const old = readdirSync(dir).filter((fileName) =>
		fileName.includes(
			`${yesterday.toLocaleDateString('en-us', {
				month: '2-digit'
			})}${yesterday.toLocaleDateString('en-us', { day: '2-digit' })}`
		)
	);

	for (const oldFile of old) {
		window.webContents.send('log', `Deleting file: ${oldFile}`);
		unlinkSync(`${dir}/${oldFile}`);
	}
}

async function signIn(page: Page, username: string, password: string) {
	const usernameTextbox = page.locator('input#input28');
	const passwordTextbox = page.locator('input#input36');
	const signInButton = page.locator('input[value="Sign in"]');
	await usernameTextbox.fill(username);
	await passwordTextbox.fill(password);
	await signInButton.click();
}

async function lookupConsFromFlight({
	flightNumber,
	username,
	password,
	today,
	headless
}: {
	flightNumber: string | number;
	username: string;
	password: string;
	today: Date;
	headless: boolean;
}) {
	const todayString = today.toLocaleDateString('en-us', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
	const browser = await chromium.launch({ headless });
	const page = await browser.newPage();
	await page.goto('https://myapps-atl03.secure.fedex.com/eShipmentGUI/DisplayLinkHandler?id=5');

	await signIn(page, username, password);

	const consExplorerLink = page
		.frameLocator('#contentFrame')
		.locator('a[href="/consreport/explorer"]');
	const destinationTextbox = page
		.frameLocator('#contentFrame')
		.locator('input[name="destination"]');
	const startDateSelect = page.frameLocator('#contentFrame').locator('#currentDateSelectBox');
	const endDateSelect = page.frameLocator('#contentFrame').locator('#dateBackToSelectBox');
	const searchButton = page.frameLocator('#contentFrame').locator('input[value="Search"]');

	await consExplorerLink.click();
	await destinationTextbox.fill('INDH');
	await startDateSelect.selectOption(todayString);
	await endDateSelect.selectOption(todayString);

	let consNumber: string | undefined = undefined;
	while (consNumber == undefined) {
		await searchButton.click();

		const flightNumberColumn = page.frameLocator('#contentFrame').locator('td:nth-child(8)');
		const consNumberColumn = page.frameLocator('#contentFrame').locator('td:first-child > a');
		await flightNumberColumn.first().waitFor();
		await consNumberColumn.first().waitFor();
		await new Promise((r) => setTimeout(r, 5000));
		const flightNumberValues = await flightNumberColumn.evaluateAll((elements) =>
			elements.map((element) => (element as HTMLElement).innerText)
		);
		const index = flightNumberValues.findIndex((value) => value == flightNumber);
		const consNumberValues = await consNumberColumn.evaluateAll((elements) =>
			elements.map((element) => (element as HTMLElement).innerText)
		);
		consNumber = consNumberValues[index];
	}

	await page.close();
	return consNumber;
}

async function downloadReportData({
	consNumber,
	username,
	password,
	headless
}: {
	consNumber: number | string;
	username: string;
	password: string;
	headless: boolean;
}) {
	while (true) {
		try {
			const browser = await chromium.launch({ headless });
			const page = await browser.newPage();
			await page.goto('https://myapps-atl03.secure.fedex.com/eShipmentGUI/DisplayLinkHandler?id=5');
			await signIn(page, username, password);

			const dropdown = page.frameLocator('#contentFrame').locator('select[name="reportType"]');
			const selectReportButton = page
				.frameLocator('#contentFrame')
				.locator('input[value="Select Report"]');
			const consNumbersField = page
				.frameLocator('#contentFrame')
				.locator('textarea[name="delimitedTrackingNumber"]');
			const nestedCheckbox = page
				.frameLocator('#contentFrame')
				.locator('input[name="processNestedConsFlag"]');
			const queryReportButton = page
				.frameLocator('#contentFrame')
				.locator('input[value="Query Report"]');
			const link = page
				.frameLocator('#contentFrame')
				.locator(
					`a[href="/consreport/reportResultAction.do?method=exportCSV&consNumber=${consNumber}"]`
				);
			const reportError = page.getByText('An error has occurred. Please try again.');
			await dropdown.selectOption('ursalane');
			await selectReportButton.click();
			await consNumbersField.fill(consNumber.toString());
			await nestedCheckbox.click();
			await queryReportButton.click();
			await page.bringToFront();

			while (true) {
				try {
					await reportError.waitFor({ timeout: 10 });
					browser.close();
					break;
				} catch (error: any) {
					if (error.name !== 'TimeoutError') console.error(error);
				}
				try {
					await link.waitFor({ timeout: 1000 });
					break;
				} catch (error: any) {
					if (error.name !== 'TimeoutError') console.error(error);
				}
			}

			const downloadPromise = page.waitForEvent('download');
			await link.click();
			const download = await downloadPromise;
			const path = await download.path();
			const data = readFileSync(path).toString();
			await browser.close();

			return data;
		} catch {}
	}
}

async function saveOutput({
	today,
	dataString,
	templateFilePath,
	outputDirectoryPath,
	archiveDirectoryPath
}: {
	today: Date;
	dataString: string;
	templateFilePath: string;
	outputDirectoryPath: string;
	archiveDirectoryPath: string;
}) {
	const source = new AdmZip(templateFilePath);
	const sheet = source.getEntry('xl/worksheets/sheet4.xml');
	let flight = '';
	let output = '<sheetData>';
	const lines = dataString.split('\n');
	for (const line of lines) {
		const values = line.split(',');
		if (values.length === 4 && values[1] === 'Flight') flight = values[3];
		output += '<row>';
		for (let value of values) {
			if (value.startsWith('="')) value = value.slice(2);
			if (value.endsWith('"')) value = value.slice(0, -1);
			output += `<c t="inlineStr"><is><t>${value}</t></is></c>`;
		}
		output += '</row>';
	}
	output += '</sheetData>';
	const newData = sheet.getData().toString().replace('<sheetData/>', output);
	sheet.setData(newData);

	source.writeZip(
		`${outputDirectoryPath}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`
	);

	// const source = new Excel.Workbook();
	// await source.xlsx.readFile(laneToLaneTemplatePath);
	// source.calcProperties.fullCalcOnLoad = true;

	// const dataSheet = source.getWorksheet('Raw Data');
	// if (!dataSheet) throw new Error('Data sheet not found in template.');
	// // console.log(source.worksheets.map((sheet) => sheet.name));
	// const data = dataString.split('\n').map((line) =>
	// 	line.split(',').map((value) => {
	// 		if (value.startsWith('="')) value = value.slice(2);
	// 		if (value.endsWith('"')) value = value.slice(0, -1);
	// 		if (Number.isSafeInteger(parseInt(value))) value = parseInt(value);
	// 		return value;
	// 	})
	// );
	// const flight = data.find((line) => line.length === 4 && line[1] === 'Flight')?.at(3);
	// if (!flight) throw new Error('Flight number not found in output data');

	// dataSheet.addRows(data);
	// dataSheet.getColumn('A').numFmt = '0';
	// dataSheet.getColumn('A').width = 13;

	// await source.xlsx.writeFile(
	// 	`${outputDirectory}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
	// 		month: '2-digit'
	// 	})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`
	// );

	if (archiveDirectoryPath != undefined && archiveDirectoryPath != '') {
		const root = archiveDirectoryPath;
		const monthDir = `${root}/${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}-${today.toLocaleDateString('en-us', {
			year: '2-digit'
		})} ${today.toLocaleDateString('en-us', { month: 'short' })}`;
		const dayDir = `${monthDir}/${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;

		if (!existsSync(dayDir)) {
			mkdirSync(dayDir, { recursive: true });
		}
		copyFileSync(
			`${outputDirectoryPath}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
				month: '2-digit'
			})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`,
			`${dayDir}/Lane to Lane - ${flight}-${dests[flight]} - ${today.toLocaleDateString('en-us', {
				month: '2-digit'
			})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`
		);
	}

	console.log(`Flight: ${flight} complete.`);
	return {
		number: parseInt(flight),
		path: `${outputDirectoryPath}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`
	};
}
