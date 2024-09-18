import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import AdmZip from 'adm-zip';
import { chromium, Download, Page } from 'playwright';

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

export async function laneToLaneProcess(
	data,
	headless: boolean,
	username: string,
	password: string,
	signal: AbortSignal
) {
	let { flightNumbers, consNumbers } = data;

	//Get current date. If after midnight, use previous day
	const today = new Date(Date.now());
	if (today.getHours() < 11) today.setDate(today.getDate() - 1);
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const todayString = today.toLocaleDateString('en-us', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});

	deleteOldLaneToLanes(yesterday, outputDirectory);

	if (flightNumbers) {
		consNumbers = await lookupConsFromFlight({
			flightNumbers,
			username,
			password,
			todayString,
			headless
		});
	}

	const downloadPaths = await downloadReportData({
		consNumbers,
		signal,
		username,
		password,
		headless
	});

	saveOutput(today, downloadPaths);
}

function deleteOldLaneToLanes(yesterday: Date, dir: string) {
	const old = readdirSync(dir).filter((fileName) =>
		fileName.includes(
			`${yesterday.toLocaleDateString('en-us', {
				month: '2-digit'
			})}${yesterday.toLocaleDateString('en-us', { day: '2-digit' })}`
		)
	);

	for (const oldFile of old) {
		console.log(`Deleting file: ${oldFile}`);
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
	todayString,
	headless
}: {
	flightNumbers: (string | number)[];
	username: string;
	password: string;
	todayString: string;
	headless: boolean;
}) {
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
	indexes.forEach((value, index) => {
		if (value == -1) console.log(`Flight ${flightNumbers[index]} not found.`);
	});
	await page.close();
	return indexes.map((index) => consNumberValues[index]).filter((consNumber) => !!consNumber);
}

async function downloadReportData({
	consNumbers,
	signal,
	username,
	password,
	headless
}: {
	consNumbers: string[];
	signal: AbortSignal;
	username: string;
	password: string;
	headless: boolean;
}) {
	return await new Promise<string[]>((resolve, reject) => {
		let aborted = false;
		(async () => {
			const data = Promise.all(
				consNumbers.map(async (consNumber) => {
					const browser = await chromium.launch({ headless });
					const page = await browser.newPage();
					await page.goto(
						'https://myapps-atl03.secure.fedex.com/consreport/displayReportMenuPage.do'
					);
					await signIn(page, username, password);
					const dropdown = page.locator('select[name="reportType"]');
					const selectReportButton = page.locator('input[value="Select Report"]');
					const consNumbersField = page.locator('textarea[name="delimitedTrackingNumber"]');
					const nestedCheckbox = page.locator('input[name="processNestedConsFlag"]');
					const queryReportButton = page.locator('input[value="Query Report"]');
					const link = page.locator(
						`a[href="/consreport/reportResultAction.do?method=exportCSV&consNumber=${consNumber}"]`
					);
					console.log('Opening CONS Report');
					await dropdown.selectOption('ursalane');
					await selectReportButton.click();
					await consNumbersField.fill(consNumber);
					await nestedCheckbox.click();
					await queryReportButton.click();
					console.log('Query processing...');
					await page.bringToFront();

					while (!aborted) {
						try {
							await link.waitFor({ timeout: 1000 });
							break;
						} catch (error: any) {
							if (error.name !== 'TimeoutError') console.log(error);
						}
					}
					const downloadPromise = page.waitForEvent('download');
					await link.click();
					const download = await downloadPromise;
					const path = await download.path();
					const data = readFileSync(path).toString();
					await browser.close();
					return data;
				})
			);
			resolve(data);
		})();

		signal.addEventListener('abort', () => {
			aborted = true;
			reject(new DOMException('User aborted', 'AbortError'));
		});
	});
}

function saveOutput(today: Date, data: string[]) {
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

	for (const dataString of data) {
		const source = new AdmZip(laneToLaneTemplatePath);
		const sheet = source.getEntry('xl/worksheets/sheet5.xml');
		console.log('Processing...');
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
		copyFileSync(
			`${outputDirectory}/F${flight} ${dests[flight]} ${today.toLocaleDateString('en-us', {
				month: '2-digit'
			})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`,
			`${dayDir}/Lane to Lane - ${flight}-${dests[flight]} - ${today.toLocaleDateString('en-us', {
				month: '2-digit'
			})}${today.toLocaleDateString('en-us', { day: '2-digit' })}.xlsx`
		);
		console.log(`Flight: ${flight} complete.`);
	}
}
