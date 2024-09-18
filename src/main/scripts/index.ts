import { chromium } from 'playwright';
import { dreuiReport, limboProcess, scorecard } from './browser.js';
import { laneToLaneProcess } from './laneToLane.js';
// import { readFileSync } from 'fs'

// const flightNumbers = [1609];

// const data = readFileSync("data.txt").toString().split("\r\n");

export async function laneToLanes({
	flightNumbers,
	headless,
	signal
}: {
	flightNumbers: number[];
	headless: boolean;
	signal: AbortSignal;
}) {
	const browser = await chromium.launch({ headless });
	while (true) {
		try {
			if (browser.contexts()[0]) {
				browser.contexts()[0].close();
			}
			browser.newContext();
			await laneToLaneProcess({ flightNumbers }, headless, '5260673', 'OldPosition1', signal);
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
// await limbo(browser);
// await scorecard(data);

// browser.close();

async function sleep(time): Promise<void> {
	await new Promise((r) => setTimeout(r, time));
}
