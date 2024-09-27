import { ElectronAPI } from '@electron-toolkit/preload';

export declare global {
	interface Window {
		electron: ElectronAPI;
		api: {
			laneToLane: {
				run;
				receiveUpdate;
				getExisting: (flightNumbers: number[]) => Promise<any>;
				cons;
				open: (path: string) => void;
				loadConfig: () => Promise<{ flightNumbers: number[] }>;
			};
			limbo: {
				run;
				receiveUpdate;
			};
			monitor: {
				run;
				shippers;
			};
			scorecard: {
				run;
			};
		};
	}
}
