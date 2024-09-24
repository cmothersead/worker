import { ElectronAPI } from '@electron-toolkit/preload';

export declare global {
	interface Window {
		electron: ElectronAPI;
		api: {
			laneToLane: {
				run;
				receiveUpdate;
				getExisting: (flightNumbers: number[]) => Promise<any>;
				open: (path: string) => void;
			};
			scorecard: {
				run;
			};
		};
	}
}
