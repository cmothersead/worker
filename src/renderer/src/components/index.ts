export { default as CST } from './CST.svelte';
export { default as LaneToLanes } from './LaneToLanes.svelte';
export { default as Limbo } from './Limbo.svelte';
export { default as Monitor } from './Monitor.svelte';
export { default as Scorecard } from './Scorecard.svelte';
export { default as Shippers } from './Shippers.svelte';

export const statusIcons = {
	loading: 'eos-icons:three-dots-loading',
	error: 'material-symbols:error',
	done: 'icon-park-solid:check-one',
	refresh: 'iconoir:refresh-circle-solid'
};

export function openFile(path: string) {
	window.api.file.open(path);
}

export interface Shipper {
	name: string;
	inPath: string;
	outPath: string;
	active?: boolean;
	selected?: boolean;
}

export interface ShipperResult {
	loading?: boolean;
	pieceCount?: number;
	scannedCount?: number;
}

export interface Config {
	headless: boolean;
	laneToLane: LaneToLaneConfig;
	limbo: LimboConfig;
	monitor: MonitorConfig;
	shippers: ShipperConfig;
	cst: CSTConfig;
}

export interface Cache {
	laneToLane: LaneToLaneCache;
	limbo: LimboCache;
	monitor: MonitorCache;
	shippers: ShipperCache;
}

export interface CSTConfig {
	automatic: boolean;
	autoStartTime: {
		hour: number;
		minute: number;
	};
	shippers: string[];
	summarizedShippers: string[];
	shipperDirectoryPath: string;
	preAlertDirectoryPath: string;
	outputDirectoryPath: string;
}

export interface LaneToLaneConfig {
	automatic: boolean;
	flightNumbers: number[];
	allFlightNumbers: (string | number)[];
	templateFilePath: string;
	outputDirectoryPath: string;
	archiveDirectoryPath: string;
	showPending: boolean;
	showDone: boolean;
}

export interface LaneToLaneCache {
	[flightNumber: number]: {
		cons?: string;
		path?: string;
	};
}

export interface LimboConfig {
	automatic: boolean;
	untilIndex: number;
	templateFilePath: string;
	outputDirectoryPath: string;
	archiveDirectoryPath: string;
}

export interface LimboCache {
	topOrigin?: { code: string; quantity: number };
	topDestination?: { code: string; quantity: number };
}

export interface MonitorConfig {
	shippers: Shipper[];
	outbounds: Shipper[];
	pieceCountDisplay: boolean;
	automatic: boolean;
}

export interface MonitorCache {
	[name: string]: ShipperResult;
}

export interface ShipperConfig {
	criticalShippers: { name: string; accountNumbers: string | string[]; checked: boolean }[];
	preAlerts: { name: string; accountNumbers: string | string[]; checked: boolean }[];
	cstShippers: string[];
}

export interface ShipperCache {
	[name: string]: { count?: number };
}
