import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
	laneToLane: {
		run: (args) => ipcRenderer.send('laneToLane', args),
		receiveUpdate: (callback) =>
			ipcRenderer.on('laneToLane:update', (_event, value) => callback(_event, value)),
		getExisting: (flightNumbers: number[]) =>
			ipcRenderer.invoke('laneToLane:existing', flightNumbers),
		cons: (args) => ipcRenderer.send('laneToLane:cons', args),
		open: (path: string) => ipcRenderer.send('laneToLane:open', path)
	},
	limbo: {
		run: (args) => ipcRenderer.send('limbo:run', args)
	},
	scorecard: {
		run: (trackingNumbers: number[]) => ipcRenderer.invoke('scorecard:run', trackingNumbers)
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
