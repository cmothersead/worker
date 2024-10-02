export function getToday() {
	//Get current date. If after midnight, use previous day
	const today = new Date(Date.now());
	if (today.getHours() < 11) today.setDate(today.getDate() - 1);
	return today;
}

export function getYesterday() {
	const today = getToday();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	return yesterday;
}
