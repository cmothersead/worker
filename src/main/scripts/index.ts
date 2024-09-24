import { chromium } from 'playwright';
import { dreuiReport, limboProcess, scorecard } from './browser.js';
import { laneToLanes } from './laneToLane.js';
import { BrowserWindow } from 'electron';
// import { readFileSync } from 'fs'

// const flightNumbers = [1609];

// const data = readFileSync("data.txt").toString().split("\r\n");

export async function laneToLanes({
	flightNumbers,
	headless,
	signal,
	window
}: {
	flightNumbers: number[];
	headless: boolean;
	signal: AbortSignal;
	window: BrowserWindow;
}) {
	const browser = await chromium.launch({ headless });
	while (true) {
		try {
			if (browser.contexts()[0]) {
				browser.contexts()[0].close();
			}
			browser.newContext();
			await laneToLanes(
				{ flightNumbers },
				headless,

				signal,
				window
			);
			return;
		} catch (error) {
			console.error(error);
			continue;
		}
	}
}

export async function limbo(date: Date, headless = true) {
	const browser = await chromium.launch({ headless });
	await limboProcess(browser, date);
}
