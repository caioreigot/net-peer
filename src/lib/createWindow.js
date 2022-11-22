const { BrowserWindow } = require('electron');

const createWindow = () => {
  return new Promise(async (resolve) => {
    const window = new BrowserWindow({
      minWidth: 900,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });
  
    await window.loadFile('src/index.html');
    resolve(window);
  })
}

module.exports = createWindow;