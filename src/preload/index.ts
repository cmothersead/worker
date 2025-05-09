import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
	laneToLane: {
		run: (args: {
			consNumber: string;
			templateFilePath: string;
			outputDirectoryPath: string;
			archiveDirectoryPath: string;
			headless: boolean;
		}) => ipcRenderer.invoke('laneToLane:run', args),
		exists: (args: { flightNumber: number; outputDirectoryPath: string }) =>
			ipcRenderer.invoke('laneToLane:exists', args),
		cons: (args: { flightNumber: number; headless: boolean }) =>
			ipcRenderer.invoke('laneToLane:cons', args)
	},
	limbo: {
		run: (args: { date: Date; untilIndex: number; headless: boolean }) =>
			ipcRenderer.invoke('limbo:run', args),
		receiveUpdate: (callback) =>
			ipcRenderer.on('limbo:update', (_event, value) => callback(_event, value)),
		getExisting: () => ipcRenderer.invoke('limbo:existing')
	},
	monitor: {
		run: (args: { data: { inPath: string; outPath: string }; headless: boolean }) =>
			ipcRenderer.invoke('monitor:run', args),
		shippers: () => ipcRenderer.invoke('monitor:shippers')
	},
	scorecard: {
		run: (args: { trackingNumbers: number[]; headless: boolean }) =>
			ipcRenderer.invoke('scorecard:run', args)
	},
	shippers: {
		run: (args: { name: string; accountNumbers: string | string[]; headless: boolean }) =>
			ipcRenderer.invoke('shippers:run', args),
		aggregate: (args: { name: string; preAlert: boolean }[]) =>
			ipcRenderer.send('shippers:aggregate', args),
		existing: (args: { name: string; preAlert: boolean }) =>
			ipcRenderer.invoke('shippers:existing', args)
	},
	cache: {
		read: () => ipcRenderer.invoke('cache:read'),
		update: (updateObject) => ipcRenderer.send('cache:update', updateObject)
	},
	config: {
		read: () => ipcRenderer.invoke('config:read'),
		update: (updateObject) => ipcRenderer.send('config:update', updateObject)
	},
	file: {
		open: (path: string) => ipcRenderer.send('file:open', path),
		exists: (path: string) => ipcRenderer.invoke('file:exists', path)
	},
	dialog: {
		file: () => ipcRenderer.invoke('dialog:file'),
		folder: () => ipcRenderer.invoke('dialog:folder')
	}
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('electron', electronAPI);
		contextBridge.exposeInMainWorld('api', api);
	} catch (error) {
		console.error(error);
	}
} else {
	// @ts-ignore (define in dts)
	window.electron = electronAPI;
	// @ts-ignore (define in dts)
	window.api = api;
}
