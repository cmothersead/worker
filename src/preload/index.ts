import { contextBridge, dialog, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
	laneToLane: {
		run: (args: {
			consNumber: number;
			outputDirectoryPath: string;
			archiveDirectoryPath: string;
			headless: boolean;
		}) => ipcRenderer.send('laneToLane:run', args),
		receiveUpdate: (callback) =>
			ipcRenderer.on('laneToLane:update', (_event, value) => callback(_event, value)),
		getExisting: (args: { flightNumbers: number[]; outputDirectoryPath: string }) =>
			ipcRenderer.invoke('laneToLane:existing', args),
		cons: (args: { flightNumber: number; headless: boolean }) =>
			ipcRenderer.invoke('laneToLane:cons', args),
		open: (path: string) => ipcRenderer.send('laneToLane:open', path),
		writeCONS: (consNumbers: number[]) => ipcRenderer.send('laneToLane:writeCONS', consNumbers)
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
		aggregate: (args) => ipcRenderer.send('shippers:aggregate', args)
	},
	config: {
		read: () => ipcRenderer.invoke('config:read'),
		update: (updateObject) => ipcRenderer.send('config:update', updateObject)
	},
	dialog: {
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
