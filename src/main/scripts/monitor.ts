import Excel, { FillPattern } from 'exceljs';
import { getToday } from '.';
import { dreuiReport } from './browser';
import { monitorConfig } from './dreuiConfigs';

export async function testStuff() {
	const monitorFiles = [
		// {
		// 	inPath:
		// 		'C:/Users/5260673/OneDrive - MyFedEx/SAA/Breakdown by Senior/Night Sort/OB1 Nights - Chatterton.xlsx',
		// 	outPath:
		// 		'C:/Users/5260673/OneDrive - MyFedEx/Communication/OB1 Files/OB1 Nights - Chatterton - Shared.xlsx'
		// },
		{
			inPath:
				'C:/Users/5260673/OneDrive - MyFedEx/SAA/Breakdown by Senior/Night Sort/OB1 Nights - Henderson.xlsx',
			outPath:
				'C:/Users/5260673/OneDrive - MyFedEx/Communication/OB1 Files/OB1 Nights - Henderson - Shared.xlsx'
		},
		{
			inPath:
				'C:/Users/5260673/OneDrive - MyFedEx/SAA/Breakdown by Senior/Night Sort/OB4 Nights - Lawrence.xlsx',
			outPath:
				'C:/Users/5260673/OneDrive - MyFedEx/Communication/OB4 Files/OB4 Nights - Lawrence - Shared.xlsx'
		},
		{
			inPath: 'C:/Users/5260673/OneDrive - MyFedEx/SAA/Critical Shippers/Ozark.xlsx',
			outPath: 'C:/Users/5260673/OneDrive - MyFedEx/Communication/Recaps/Ozark - Shared.xlsx'
		}
	];

	await Promise.all(monitorFiles.map(({ inPath, outPath }) => testStuff2(inPath, outPath)));
}

export async function testStuff2(inPath: string, outPath: string) {
	const today = getToday();
	const todayString = `${today.toLocaleDateString('en-us', { month: '2-digit' })}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;
	const oldWorkbook = new Excel.Workbook();
	await oldWorkbook.xlsx.readFile(inPath);
	const newWorkbook = new Excel.Workbook();
	await newWorkbook.xlsx.readFile(outPath);

	const testSheet = newWorkbook.getWorksheet(todayString) ?? newWorkbook.addWorksheet(todayString);
	testSheet.orderNo = 0;
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
	oldWorkbook.getWorksheet(todayString)?.eachRow((row) => testSheet.addRow(row.values));
	const trackingNumberColumn = testSheet.getColumn(1);
	trackingNumberColumn.numFmt = '0';
	trackingNumberColumn.width = 13;
	testSheet.spliceColumns(
		5,
		0,
		['Tracking Number'],
		['HIPS Date Time IND Earliest'],
		['COMM Comment Latest'],
		['CONS Time Latest'],
		['CONS Loc Latest'],
		['NAK All'],
		['LBL All'],
		['HOPS Date Time IND Latest']
	);
	testSheet.getColumn('E').numFmt = '0';
	testSheet.getColumn('E').width = 13;
	testSheet.getColumn('H').numFmt = '0';

	const fills: { [key: string]: FillPattern } = {
		INDHU: {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFFFFF00' }
		}
	};

	const trackingNumbers = trackingNumberColumn.values.slice(2);
	const results = await dreuiReport(monitorConfig, trackingNumbers);
	console.log('dreui done');
	testSheet.eachRow((row, index) => {
		if (index == 1) return;
		const result = results.find((result) => result[0] == row.values[1]);
		result[0] = parseInt(result[0]);
		result[3] = parseInt(result[3]);
		row.values = [...row.values.slice(1, 5), ...result, ...row.values.slice(13)];
		if (result[4] == 'INDHU') {
			row.eachCell((cell, index) => {
				if (index < 10) cell.fill = fills.INDHU;
			});
		}
	});

	await newWorkbook.xlsx.writeFile(outPath);
	console.log('all done');
}
