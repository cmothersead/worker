import Excel from 'exceljs';

export async function testStuff() {
	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(
		'C:/Users/5260673/OneDrive - MyFedEx/SAA/Critical Shippers/Ozark.xlsx'
	);
	const values = workbook.worksheets.at(0)?.getSheetValues();
	console.log(values);
}
