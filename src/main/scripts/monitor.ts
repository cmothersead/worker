import Excel, { type FillPattern } from 'exceljs';
import { getToday } from '.';
import { dreuiReport } from './browser';
import { monitorConfig } from './dreuiConfigs';

export async function monitorShipper(inPath: string, outPath: string, headless: boolean) {
	console.log('Shipper started');
	const today = getToday();
	const todayString = `${today.toLocaleDateString('en-us', { month: '2-digit' })}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;
	const newWorkbook = new Excel.Workbook();
	await newWorkbook.xlsx.readFile(outPath);
	const oldWorkbook = new Excel.Workbook();
	await oldWorkbook.xlsx.readFile(inPath);

	const todaySheet = (newWorkbook.getWorksheet(todayString) ??
		newWorkbook.addWorksheet(todayString)) as Excel.Worksheet & { orderNo: number };

	newWorkbook.worksheets
		.map(({ name }) => name)
		.sort((a, b) => b.localeCompare(a))
		.forEach((name, index) => {
			const sheet = newWorkbook.getWorksheet(name) as Excel.Worksheet & { orderNo: number };
			if (sheet == undefined) return;
			sheet.orderNo = index + 1;
		});
	todaySheet.orderNo = 0;
	newWorkbook.views = [
		{
			x: 0,
			y: 0,
			width: 10000,
			height: 20000,
			firstSheet: 0,
			activeTab: 0,
			visibility: 'visible'
		}
	];

	const oldTodaySheet = oldWorkbook.getWorksheet(todayString);
	if (oldTodaySheet == undefined)
		throw new Error(`Sheet: ${todayString} not found in file: ${inPath}`);
	oldTodaySheet.eachRow((row) => todaySheet.addRow(row.values));
	const trackingNumberColumn = todaySheet.getColumn(1);
	trackingNumberColumn.numFmt = '0';
	trackingNumberColumn.width = 13;
	todaySheet.spliceColumns(5, 0, ...monitorConfig.fields.map((val) => [val]));
	todaySheet.getColumn('E').numFmt = '0';
	todaySheet.getColumn('E').width = 13;
	todaySheet.getColumn('H').numFmt = '0';

	const fills: { [key: string]: FillPattern } = {
		INDHU: {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFFFFF00' }
		}
	};
	const trackingNumbers = trackingNumberColumn.values.slice(2) as number[];
	const results = await dreuiReport(monitorConfig, trackingNumbers, headless);
	console.log('dreui done');
	todaySheet.eachRow((row, index) => {
		if (index == 1) return;
		const result = results
			.find((result) => result[0] == row.values[1])
			.map((value) => (value == '' ? null : value));
		if (Number.isSafeInteger(parseInt(result[0]))) result[0] = parseInt(result[0]);
		if (Number.isSafeInteger(parseInt(result[3]))) result[3] = parseInt(result[3]);
		row.values = [
			...(row.values as Excel.CellValue[]).slice(1, 5),
			...result,
			...(row.values as Excel.CellValue[]).slice(13)
		];
	});

	const consLocIndex = monitorConfig.fields.findIndex((val) => val === 'CONS Loc Latest') + 5;
	const sortedRows = todaySheet
		.getRows(1, todaySheet.rowCount - 1)
		?.map(({ values }) => values)
		// ?.filter((values) => values[2].startsWith('N'))
		?.toSorted((a, b) =>
			a[consLocIndex] === 'CONS Loc Latest'
				? -1
				: b[consLocIndex] === 'CONS Loc Latest'
					? 1
					: a[consLocIndex] === undefined
						? b[consLocIndex] === undefined
							? 0
							: -1
						: b[consLocIndex] === undefined
							? 1
							: a[consLocIndex].toString().localeCompare(b[consLocIndex].toString())
		) as Excel.CellValue[][] | undefined;

	if (sortedRows === undefined) return {};

	todaySheet.spliceRows(1, todaySheet.rowCount + 1, ...sortedRows);

	todaySheet.eachRow((row) => {
		if (row.getCell(consLocIndex).value === 'INDHU') {
			row.eachCell({ includeEmpty: true }, (cell, index) => {
				if (index < consLocIndex + 1) cell.fill = fills.INDHU;
			});
		}
	});

	const scannedCount = sortedRows.filter((row) => row[consLocIndex] == 'INDHU').length;

	await newWorkbook.xlsx.writeFile(outPath);
	console.log('all done');
	return { pieceCount: todaySheet.rowCount - 1, scannedCount };
}

export async function checkShipper(outPath: string) {
	const today = getToday();
	const todayString = `${today.toLocaleDateString('en-us', { month: '2-digit' })}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;
	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(outPath);
	const todaySheet = workbook.getWorksheet(todayString);
	if (todaySheet === undefined) return { pieceCount: undefined, scannedCount: undefined };

	const consLocIndex = monitorConfig.fields.findIndex((val) => val === 'CONS Loc Latest') + 5;
	const scannedCount = todaySheet
		.getRows(2, todaySheet.rowCount)
		?.filter((row) => row[consLocIndex] == 'INDHU').length;
	return { pieceCount: todaySheet.rowCount - 1, scannedCount };
}
