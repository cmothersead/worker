import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
	laneToLane: (args) => ipcRenderer.invoke('laneToLane', args),
	laneToLaneFailed: (callback) =>
		ipcRenderer.on('laneToLane:fail', (_event, value) => callback(_event, value)),
	laneToLaneSucceeded: (callback) =>
		ipcRenderer.on('laneToLane:success', (_event, value) => callback(_event, value)),
	laneToLaneUpdateCONS: (callback) =>
		ipcRenderer.on('laneToLane:updateCONS', (_event, value) => callback(_event, value))
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
