import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { getToday } from './scripts';
import icon from '../../resources/icon.png?asset';
import { getCONSNumber, laneToLane, laneToLaneExists } from './scripts/laneToLane';
import { scorecard } from './scripts/browser';
import { monitorShipper } from './scripts/monitor';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { getExistingLIMBO, limbo } from './scripts/limbo';
import { aggregate, checkExisting, shipper } from './scripts/shippers';

const { username, password } = readConfig();

function readConfig() {
	if (!existsSync('config.json')) {
		writeFileSync('config.json', '{}');
	}
	return JSON.parse(readFileSync('config.json').toString());
}

function writeConfig(data: any) {
	writeFileSync('config.json', JSON.stringify(data));
}

function readCache() {
	if (!existsSync('cache.json')) {
		writeFileSync('cache.json', '{}');
	}
	const today = getToday();
	return JSON.parse(readFileSync('cache.json').toString())[today.toDateString()] ?? {};
}

function writeCache(update: any) {
	const today = getToday().toDateString();
	const data = JSON.stringify({
		[today]: {
			...readCache()[today],
			...update
		}
	});
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
		},
		icon: 'resources/icon.png'
	});

	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: 'deny' };
	});

	// IPC
	ipcMain.handle(
		'laneToLane:run',
		async (
			_,
			{ consNumber, templateFilePath, outputDirectoryPath, archiveDirectoryPath, headless }
		) =>
			laneToLane({
				consNumber,
				templateFilePath,
				outputDirectoryPath,
				archiveDirectoryPath,
				headless,
				window: mainWindow,
				username,
				password
			})
	);
	ipcMain.handle('laneToLane:cons', async (_, { flightNumber, headless }) =>
		getCONSNumber({ flightNumber, headless, username, password })
	);
	ipcMain.handle('laneToLane:exists', (_, args) => laneToLaneExists(args));

	ipcMain.handle('limbo:run', async (_, args) => await limbo(args));
	ipcMain.handle('limbo:existing', async () => await getExistingLIMBO());

	ipcMain.handle('scorecard:run', async (_, args) => await scorecard(args));

	ipcMain.handle('monitor:run', async (_, { data, headless }) =>
		monitorShipper(data.inPath, data.outPath, headless)
	);

	ipcMain.handle('shippers:run', async (_, args) => shipper(args));
	ipcMain.on('shippers:aggregate', async (_, args) => aggregate(args));
	ipcMain.handle('shippers:existing', async (_, args) => checkExisting(args));

	ipcMain.handle('cache:read', () => readCache());
	ipcMain.on('cache:update', (_, update) => {
		writeCache(update);
	});

	ipcMain.handle('config:read', () => readConfig());
	ipcMain.on('config:update', (_, updateObject) => {
		const config = readConfig();
		writeConfig({ ...config, ...updateObject });
	});

	ipcMain.on('file:open', (_, path) => shell.openPath(path));
	ipcMain.handle('file:exists', (_, path) => existsSync(path));

	ipcMain.handle('dialog:file', () => dialog.showOpenDialogSync({ properties: ['openFile'] }));
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
