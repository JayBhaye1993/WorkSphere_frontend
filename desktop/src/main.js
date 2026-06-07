const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        1024,
    minHeight:       600,
    frame:           true,
    backgroundColor: '#F8FAFC',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'WorkSphere',
    show: false,
  });

  // Load Angular dev server in dev, built files in prod
  const url = isDev
    ? 'http://localhost:4200'
    : `file://${path.join(__dirname, '..', 'www', 'index.html')}`;

  mainWindow.loadURL(url);

  // Show window once ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  // Create a simple tray icon
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('WorkSphere');
  const menu = Menu.buildFromTemplate([
    { label: 'Open WorkSphere', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => mainWindow?.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for future use
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-version',  () => app.getVersion());
