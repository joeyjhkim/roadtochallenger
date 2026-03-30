const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Data saves to: ~/Library/Application Support/LifeTracker Chronicles/data/lifetracker.json
const DATA_DIR  = path.join(app.getPath('userData'), 'data');
const DATA_FILE = path.join(DATA_DIR, 'lifetracker.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData() {
  ensureDataDir();
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, DATA_FILE.replace('.json', `.backup-${Date.now()}.json`));
    }
  }
  return null;
}

function writeData(data) {
  ensureDataDir();
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

ipcMain.handle('data:read',    ()        => readData());
ipcMain.handle('data:write',   (e, data) => { try { writeData(data); return { success: true }; } catch(err) { return { success: false, error: err.message }; } });
ipcMain.handle('data:getPath', ()        => DATA_FILE);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5f0e8',
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Always load from the built files — no dev server, no browser
  mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
