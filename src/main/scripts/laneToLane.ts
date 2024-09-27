import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import AdmZip from 'adm-zip';
import Excel from 'exceljs';
import { chromium, Page } from 'playwright';
import { BrowserWindow } from 'electron';
import { getToday, getYesterday } from '.';

const laneToLaneTemplatePath = 'C:/Users/5260673/OneDrive - MyFedEx/Documents/lanetolane.xlsx';
const outputDirectory = 'C:/Users/5260673/OneDrive - MyFedEx/Communication/Control Room Files';
const archiveDirectory = 'C:/Users/5260673/OneDrive - MyFedEx/Lane to Lanes';
const dests = {
	1623: 'BUR',
	1633: 'BUR',
	1685: 'LAX',
	1642: 'SJC',
	1686: 'SJC',
	1645: 'OAK',
	1648: 'ONT',
	1650: 'LAX',
	'0151': 'YYZ',
	'0153': 'YMX',
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
	1682: 'BNA'
};

export async function laneToLanes({
	data,
	headless,
	username,
	password,
	signal,
	window
}: {
	data: { flightNumbers?: number[]; consNumbers?: string[] };
	headless: boolean;
	username: string;
	password: string;
	signal: AbortSignal;
	window: BrowserWindow;
}) {
	let { flightNumbers, consNumbers } = data;

	const today = getToday();
	const yesterday = getYesterday();

	if (signal.aborted) return;
	deleteOldLaneToLanes(yesterday, outputDirectory, window);

	if (signal.aborted) return;
	if (flightNumbers) {
		consNumbers = await lookupConsFromFlight({
			flightNumbers,
			username,
			password,
			today,
			headless,
			window
		});
	}

	if (consNumbers == undefined) return;
	await Promise.all(
		consNumbers.map(async (consNumber) => {
			if (signal.aborted) return;
			const downloadPath = await downloadReportData({
				consNumber,
				signal,
				username,
				password,
				headless
			});

			if (signal.aborted) return;
			await saveOutput(today, downloadPath, window);
		})
	);
}

export function getExistingLaneToLanes(flightNumbers: number[]) {
	const today = getToday();
	return flightNumbers
		.map((flight) => ({
			number: flight,
			path: `${outputDirectory}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
				month: '2-digit'
			})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`,
			status: 'done'
		}))
		.filter(({ path }) => existsSync(path));
}

export async function getCONSNumbers({
	flightNumbers,
	headless,
	username,
	password,
	window
}: {
	flightNumbers: number[];
	headless: boolean;
	username: string;
	password: string;
	window: BrowserWindow;
}) {
	await lookupConsFromFlight({
		flightNumbers,
		headless,
		username,
		password,
		window,
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
	flightNumbers,
	username,
	password,
	today,
	headless,
	window
}: {
	flightNumbers: (string | number)[];
	username: string;
	password: string;
	today: Date;
	headless: boolean;
	window: BrowserWindow;
}) {
	const todayString = today.toLocaleDateString('en-us', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
	const browser = await chromium.launch({ headless });
	const page = await browser.newPage();
	await page.goto('https://myapps-atl03.secure.fedex.com/consreport/explorer/');

	signIn(page, username, password);

	const destinationTextbox = page.locator('input[name="destination"]');
	const startDateSelect = page.locator('#currentDateSelectBox');
	const endDateSelect = page.locator('#dateBackToSelectBox');
	const searchButton = page.locator('input[value="Search"]');
	const flightNumberColumn = page.locator('td:nth-child(8)');
	const consNumberColumn = page.locator('td:first-child > a');

	await destinationTextbox.fill('INDH');
	await startDateSelect.selectOption(todayString);
	await endDateSelect.selectOption(todayString);
	await searchButton.click();

	await flightNumberColumn.first().waitFor();
	const flightNumberValues = await flightNumberColumn.evaluateAll((elements) =>
		elements.map((element) => element.innerText)
	);
	const indexes = flightNumbers.map((flightNumber) =>
		flightNumberValues.findIndex((value) => value == flightNumber)
	);
	const consNumberValues = await consNumberColumn.evaluateAll((elements) =>
		elements.map((element) => element.innerText)
	);
	const fails = indexes
		.map((value, index) => ({ value, flightNumber: flightNumbers[index] }))
		.filter(({ value }) => value == -1)
		.map(({ flightNumber }) => ({ number: flightNumber, status: 'error' }));
	window.webContents.send('laneToLane:update', fails);
	const cons = indexes.map((value, index) => ({
		number: flightNumbers[index],
		cons: consNumberValues[value]
	}));
	window.webContents.send('laneToLane:update', cons);
	await page.close();
	return indexes.map((index) => consNumberValues[index]).filter((consNumber) => !!consNumber);
}

async function downloadReportData({
	consNumber,
	signal,
	username,
	password,
	headless
}: {
	consNumber: string;
	signal: AbortSignal;
	username: string;
	password: string;
	headless: boolean;
}) {
	return await new Promise<string>((resolve, reject) => {
		(async () => {
			while (true) {
				try {
					if (signal.aborted) return;

					const browser = await chromium.launch({ headless });
					const page = await browser.newPage();
					await page.goto(
						'https://myapps-atl03.secure.fedex.com/consreport/displayReportMenuPage.do'
					);
					await signIn(page, username, password);

					if (signal.aborted) return;

					const dropdown = page.locator('select[name="reportType"]');
					const selectReportButton = page.locator('input[value="Select Report"]');
					const consNumbersField = page.locator('textarea[name="delimitedTrackingNumber"]');
					const nestedCheckbox = page.locator('input[name="processNestedConsFlag"]');
					const queryReportButton = page.locator('input[value="Query Report"]');
					const link = page.locator(
						`a[href="/consreport/reportResultAction.do?method=exportCSV&consNumber=${consNumber}"]`
					);
					const reportError = page.getByText('An error has occurred. Please try again.');
					await dropdown.selectOption('ursalane');
					await selectReportButton.click();
					await consNumbersField.fill(consNumber);
					await nestedCheckbox.click();
					await queryReportButton.click();
					await page.bringToFront();

					if (signal.aborted) return;

					while (!signal.aborted) {
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

					if (signal.aborted) return;

					const downloadPromise = page.waitForEvent('download');
					await link.click();
					const download = await downloadPromise;
					const path = await download.path();
					const data = readFileSync(path).toString();
					await browser.close();

					resolve(data);
					break;
				} catch {}
			}
		})();

		signal.addEventListener('abort', () => {
			console.log('abort received by download');
			reject(new DOMException('User aborted', 'AbortError'));
		});
	});
}

async function saveOutput(today: Date, dataString: string, window: BrowserWindow) {
	const root = archiveDirectory;
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

	const source = new AdmZip(laneToLaneTemplatePath);
	const sheet = source.getEntry('xl/worksheets/sheet5.xml');
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
		`${outputDirectory}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
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

	copyFileSync(
		`${outputDirectory}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`,
		`${dayDir}/Lane to Lane - ${flight}-${dests[flight]} - ${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`
	);

	window.webContents.send('laneToLane:update', {
		number: parseInt(flight),
		status: 'done',
		path: `${outputDirectory}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
			month: '2-digit'
		})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`
	});

	console.log(`Flight: ${flight} complete.`);
}
