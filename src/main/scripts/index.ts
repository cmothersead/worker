import { chromium } from 'playwright';
import { dreuiReport, limboProcess, scorecard } from './browser.js';
// import { readFileSync } from 'fs'

// const flightNumbers = [1609];

// const data = readFileSync("data.txt").toString().split("\r\n");

export async function limbo(date: Date, headless = true) {
	const browser = await chromium.launch({ headless });
	await limboProcess(browser, date);
}
