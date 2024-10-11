import { ElectronAPI } from '@electron-toolkit/preload';

export declare global {
	interface Window {
		electron: ElectronAPI;
		api: {
			laneToLane: {
				run: (args: {
					consNumber: number;
					outputDirectoryPath: string;
					archiveDirectoryPath: string;
					headless: boolean;
				}) => Promise<any>;
				receiveUpdate;
				getExisting: (args: {
					flightNumbers: number[];
					outputDirectoryPath: string;
				}) => Promise<any>;
				cons: (args: { flightNumber: number; headless: boolean }) => Promise<number>;
				open: (path: string) => void;
				writeCONS: (flightCONS: { number: number; cons: string }) => void;
			};
			limbo: {
				run: (args: { date: Date; untilIndex: number; headless: boolean }) => Promise<{
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
			config: {
				read: () => Promise<any>;
				update: (updateObject: any) => void;
			};
			dialog: {
				folder: () => Promise<string>;
			};
		};
	}
}
