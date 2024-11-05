import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { getToday } from './scripts';
import icon from '../../resources/icon.png?asset';
import { getCONSNumber, getExistingLaneToLanes, laneToLane } from './scripts/laneToLane';
import { scorecard } from './scripts/browser';
import { monitorShipper } from './scripts/monitor';
import { readFileSync, writeFileSync } from 'fs';
import { getExistingLIMBO, limbo } from './scripts/limbo';
import { aggregate, checkExisting, shipper } from './scripts/shippers';

const { username, password } = readConfig();

function readConfig() {
	return JSON.parse(readFileSync('config.json').toString());
}

function writeConfig(data: any) {
	writeFileSync('config.json', JSON.stringify(data));
}

function readCache() {
	return JSON.parse(readFileSync('cache.json').toString());
}

function writeCache(data: string) {
	writeFileSync('cache.json', data);
}

function createWindow(): void {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 1160,
		height: 830,
		show: false,
		autoHideMenuBar: true,
		...(process.platform === 'linux' ? { icon } : {}),
		webPreferences: {
			preload: join(__dirname, '../preload/index.mjs'),
			sandbox: false
		}
	});

	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: 'deny' };
	});

	var controller = new AbortController();
	var { signal } = controller;

	// IPC
	ipcMain.on(
		'laneToLane:run',
		async (_, { consNumber, outputDirectoryPath, archiveDirectoryPath, headless }) =>
			await laneToLane({
				consNumber,
				outputDirectoryPath,
				archiveDirectoryPath,
				headless,
				signal,
				window: mainWindow,
				username,
				password
			})
	);
	ipcMain.handle('laneToLane:cons', async (_, { flightNumber, headless }) => {
		const todayString = getToday().toDateString();
		const cachedCONS = readCache()[todayString][flightNumber];
		if (cachedCONS != undefined) return cachedCONS;

		return await getCONSNumber({ flightNumber, headless, window: mainWindow, username, password });
	});
	ipcMain.on('laneToLane:open', (_, path) => shell.openPath(path));
	ipcMain.handle('laneToLane:existing', (_, args) => getExistingLaneToLanes(args));
	ipcMain.handle('limbo:run', async (_, args) => await limbo(args));
	ipcMain.handle('limbo:existing', async () => await getExistingLIMBO());
	ipcMain.handle('scorecard:run', async (_, args) => await scorecard(args));
	// ipcMain.on('stop', () => {
	// 	console.log('aborting');
	// 	controller.abort();
	// 	controller = new AbortController();
	// 	signal = controller.signal;
	// });
	ipcMain.handle('monitor:shippers', () => {
		return readConfig().monitor;
	});
	ipcMain.handle('monitor:run', async (_, { data, headless }) =>
		monitorShipper(data.inPath, data.outPath, headless)
	);
	ipcMain.handle('cache:read', () => readCache());
	ipcMain.on('cache:update', (_, update) => {
		const cache = readCache();
		const today = getToday().toDateString();
		writeCache(
			JSON.stringify({
				[today]: {
					...cache[today],
					...update
				}
			})
		);
	});
	ipcMain.handle('shippers:run', async (_, { name, accountNumbers, preAlert, headless }) => {
		return await shipper({ name, accountNumbers, preAlert, headless });
	});
	ipcMain.on('shippers:aggregate', async (_, args) => aggregate(args));
	ipcMain.handle('shippers:existing', async (_, args) => checkExisting(args));
	ipcMain.handle('config:read', () => readConfig());
	ipcMain.on('config:update', (_, updateObject) => {
		const config = readConfig();
		writeConfig({ ...config, ...updateObject });
	});
	ipcMain.handle('dialog:folder', () =>
		dialog.showOpenDialogSync({ properties: ['openDirectory'] })
	);

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
		mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
	} else {
		mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
	}
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// Set app user model id for windows
	electronApp.setAppUserModelId('com.electron');

	// Default open or close DevTools by F12 in development
	// and ignore CommandOrControl + R in production.
	// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
	app.on('browser-window-created', (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	createWindow();

	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
