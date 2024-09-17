import { chromium } from 'playwright'
import { dreuiReport, laneToLaneConsReports, limbo, scorecard } from './browser.js'
// import { readFileSync } from 'fs'

// const flightNumbers = [1609];

// const data = readFileSync("data.txt").toString().split("\r\n");

export async function laneToLanes(): Promise<void> {
	const browser = await chromium.launch({ headless: false })
	const flightNumbers = [1642, 1686, 1645, 1648, 1650, 1654, 1601, 1609, 1614]
	while (true) {
		try {
			if (browser.contexts()[0]) {
				browser.contexts()[0].close()
			}
			browser.newContext()
			await laneToLaneConsReports(browser, { flightNumbers }, false, '5260673', 'OldPosition1')
		} catch (error) {
			console.error(error)
			continue
		}
		break
	}
}
// await limbo(browser);
// await scorecard(data);

// browser.close();

async function sleep(time): Promise<void> {
	await new Promise((r) => setTimeout(r, time))
}
