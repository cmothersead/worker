import { chromium } from 'playwright';
import { dreuiReport, limboProcess, scorecard } from './browser.js';
// import { readFileSync } from 'fs'

// const flightNumbers = [1609];

// const data = readFileSync("data.txt").toString().split("\r\n");

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

export async function limbo(date: Date, headless = true) {
	const browser = await chromium.launch({ headless });
	await limboProcess(browser, date);
}
