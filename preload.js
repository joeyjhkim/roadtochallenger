/**
 * preload.js
 *
 * This runs in a sandboxed context between Electron's main process and the
 * React renderer. It exposes a safe, limited API (window.electronAPI) so
 * the React app can read/write data without having direct Node.js access.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Read all saved data from disk
  readData: () => ipcRenderer.invoke('data:read'),

  // Write all data to disk (called on every state change)
  writeData: (data) => ipcRenderer.invoke('data:write', data),

  // Get the file path so the user can find their data file
  getDataPath: () => ipcRenderer.invoke('data:getPath'),
});
