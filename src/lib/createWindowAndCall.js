const { BrowserWindow } = require('electron');

const createWindowAndCall = (onLoadFileCallback) => {
  const window = new BrowserWindow({
    minWidth: 820,
    minHeight: 640,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  window.loadFile('src/index.html')
    .then(() => onLoadFileCallback(window.webContents));
}

module.exports = createWindowAndCall;