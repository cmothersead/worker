export const scorecardConfig = {
	fields: [
		'Tracking Number',
		'HIPS Date Time IND Earliest',
		'HOPS Date Time IND Latest',
		'CONS Flt Dest IND OB Latest',
		'Commit Date',
		'Commit Time',
		'DEX All',
		'STAT 44 All',
		'MIS All',
		'HAL All',
		'SIPS All',
		'POD DDEX Time All',
		'POD DDEX Date All',
		'VANS All'
	]
};
export const commCommentAllConfig = {
	fields: ['Tracking Number', 'COMM Comment All'],
	locFilter: 'INDHU'
};

export const limboConfig = {
	fields: [
		'Tracking Number',
		'Origin Ramp',
		'URSA Code',
		'Dest Ramp',
		'Service Type',
		'Commit Date',
		'Special Handling Codes',
		'HIPS Date Time IND Earliest',
		'CONS Flt to IND Latest',
		'NAK All',
		'LBL All',
		'COMM Comment All',
		'HEX All',
		'HOPS Date Time IND Latest',
		'CONS Flt Dest IND OB Latest',
		'STAT 44 All',
		'DEX All',
		'SIPS All',
		'POD DDEX Time All',
		'POD DDEX Date All',
		'VANS All'
	]
};

export const monitorConfig = {
	fields: [
		'Tracking Number',
		'HIPS Date Time IND Earliest',
		'COMM Comment Latest',
		'COMM Time Latest',
		'CONS Time Latest',
		'CONS Loc Latest',
		'NAK All',
		'LBL All',
		'HOPS Date Time IND Latest'
	],
	locFilter: 'INDHU'
};
