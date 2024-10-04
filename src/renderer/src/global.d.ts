import { ElectronAPI } from '@electron-toolkit/preload';

export declare global {
	interface Window {
		electron: ElectronAPI;
		api: {
			laneToLane: {
				run: (args: { consNumber: number; headless: boolean }) => Promise<any>;
				receiveUpdate;
				getExisting: (flightNumbers: number[]) => Promise<any>;
				cons: (args: { flightNumber: number; headless: boolean }) => Promise<number>;
				open: (path: string) => void;
				loadConfig: () => Promise<{ flightNumbers: number[] }>;
				writeCONS: (flightCONS: { number: number; cons: string }) => void;
			};
			limbo: {
				run: (args: {
					date: Date;
					headless: boolean;
				}) => Promise<{
					topOrigin: { code: string; quantity: number };
					topDestination: { code: string; quantity: number };
				}>;
				receiveUpdate;
				getExisting: () => Promise<any>;
			};
			monitor: {
				run;
				shippers;
			};
			scorecard: {
				run;
			};
			shippers: {
				run;
			};
		};
	}
}
