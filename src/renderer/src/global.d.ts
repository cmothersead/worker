import { ElectronAPI } from '@electron-toolkit/preload';

export declare global {
	interface Window {
		electron: ElectronAPI;
		api: {
			laneToLane: {
				run: (args: {
					consNumber: string;
					templateFilePath: string;
					outputDirectoryPath: string;
					archiveDirectoryPath: string;
					headless: boolean;
				}) => Promise<any>;
				exists: (args: {
					flightNumber: number;
					outputDirectoryPath: string;
				}) => Promise<string | undefined>;
				cons: (args: { flightNumber: number; headless: boolean }) => Promise<string>;
			};
			limbo: {
				run: (args: {
					date: Date;
					untilIndex: number;
					headless: boolean;
					templateFilePath: string;
					outputDirectoryPath: string;
					archiveDirectoryPath: string | undefined;
				}) => Promise<{
					topOrigin: { code: string; quantity: number };
					topDestination: { code: string; quantity: number };
				}>;
				receiveUpdate;
				getExisting: (args: string) => Promise<any>;
			};
			monitor: {
				run: (args: {
					data: { inPath: string; outPath: string };
					headless: boolean;
				}) => Promise<{ pieceCount: number; scannedCount: number }>;
				shippers;
			};
			scorecard: {
				run;
			};
			shippers: {
				run: (args: {
					name: string;
					accountNumbers: string | string[];
					preAlert: boolean;
					headless: boolean;
				}) => Promise<number>;
				aggregate: (args: {
					shippers: string[];
					summarizedShippers: string[];
					shipperDirectoryPath: string;
					preAlertDirectoryPath: string;
					outputDirectoryPath: string;
				}) => void;
				existing: (args: { name: string; preAlert: boolean }) => Promise<number>;
			};
			cache: {
				read: () => Promise<any>;
				update: (updateObject) => void;
			};
			config: {
				read: () => Promise<any>;
				update: (updateObject) => void;
			};
			file: {
				open: (path: string) => void;
				exists: (path: string) => Promise<boolean>;
			};
			dialog: {
				file: () => Promise<string>;
				folder: () => Promise<string>;
			};
		};
	}
}
