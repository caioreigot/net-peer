const { Peer } = require('net-peer');
const { app, BrowserWindow, ipcMain } = require('electron');
const { generateRandomCoords, generateRandomRgb } = require('./lib/randomGenerator.js');
const createPlayer = require('./lib/createPlayer.js');
const sendCommand = require('./lib/sendCommand.js');

const createWindow = () => {
  const win = new BrowserWindow({
    minWidth: 820,
    minHeight: 640,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.loadFile('src/index.html')
    .then(() => bootstrap(win.webContents));
}

const gameState = {
  players: {}
}

function bootstrap(webContents) {
  const randomId = Math.floor(new Date().valueOf() * Math.random()).toString();
  const peer = new Peer(randomId, gameState);

  /* Try to connect to the room if it already exists or
  opens a server if the room does not yet exist */
  peer.connect('127.0.0.1', 3000)
    .catch(() => {
      peer.listen(3000).then(spawnPlayerAndBroadcast);
    });

  const render = () => webContents.send('render', gameState);

  const spawnPlayer = (name, color, coords) => {
    const player = createPlayer(name, color, coords);  
    gameState.players[name] = player;

    // Ask the renderer to re-render the game screen
    render();
  }

  const spawnPlayerAndBroadcast = () => {
    const color = generateRandomRgb();
    const coords = generateRandomCoords();

    // Create my player
    spawnPlayer(peer.name, color, coords);

    // Notify everyone on the network about the change
    peer.broadcast('new-player', { coords, color });
  }

  peer.onEnterNetwork((state) => {
    gameState.players = state.players;
    spawnPlayerAndBroadcast();
  });

  peer.onData((data) => {
    switch (data.type) {
      case 'new-player':
        const { coords, color } = data.content;
        spawnPlayer(data.senderName, color, coords);
        break;
      case 'player-moved':
        const { command } = data.content;
        const player = gameState.players[data.senderName];
        sendCommand(player, command);
        render();
        break;
      case 'message-sended':
        const { message } = data.content;
        webContents.send('message-sended', data.senderName, message);
        break;
    }
  });

  peer.onReceiveConnection((name) => {
    webContents.send('system-log', `> ${name} connected.`);
  });

  peer.onDisconnect((name) => {
    delete gameState.players[name];
    webContents.send('system-log', `> ${name} disconnected.`);
    render();
  })

  ipcMain.on('key-pressed', (event, keyPressed) => {
    const player = gameState.players[peer.name];
    sendCommand(player, keyPressed);
    peer.broadcast('player-moved', { command: keyPressed });
    
    render();
  });

  ipcMain.on('message-sended', (event, message) => {
    webContents.send('message-sended', peer.name, message);
    peer.broadcast('message-sended', { message });
    
    render();
  });
}

app.whenReady().then(createWindow);