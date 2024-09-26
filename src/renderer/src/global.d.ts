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
			};
			limbo: {
				run;
				receiveUpdate;
			};
			scorecard: {
				run;
			};
		};
	}
}
