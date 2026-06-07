const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to Angular renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getVersion:  () => ipcRenderer.invoke('get-version'),

  // OS-level notifications (future use)
  showNotification: (title, body) => {
    new Notification(title, { body });
  },

  // Check if running in Electron
  isElectron: true,
});
