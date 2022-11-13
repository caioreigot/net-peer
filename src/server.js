const { Peer } = require('net-peer');
const { app, ipcMain } = require('electron');
const { generateRandomCoords, generateRandomRgb } = require('./lib/randomGenerator.js');
const createPlayer = require('./lib/createPlayer.js');
const sendCommand = require('./lib/sendCommand.js');
const createWindowAndCall = require('./lib/createWindowAndCall.js');

/* Object passed into the Peer class that will
be shared among everyone on the network */
const gameState = {
  players: {}
}

// Game "core" function
function bootstrap(webContents) {
  /* Generating a random ID for simplicity, you can
  ask the user to enter a nickname and use it */
  const uniqueName = Math.floor(
    new Date().valueOf() * Math.random()
  ).toString();

  // Using the Peer class to create a new user on the network
  const peer = new Peer(uniqueName, gameState);

  /* Try to connect to the room if it already exists or
  opens a server if the room does not yet exist */
  peer.connect('127.0.0.1', 3000)
    .catch(() => {
      peer.listen(3000).then(spawnPlayerAndBroadcast);
    });

  // Method that renders the game window
  const render = () => webContents.send('render', gameState);

  // Create, spawn and render a player
  const spawnPlayer = (name, color, coords) => {
    const player = createPlayer(name, color, coords);  
    gameState.players[name] = player;

    render();
  }

  /* Create, spawn, render and notify everyone on
  the network that a new player has joined */
  const spawnPlayerAndBroadcast = () => {
    const color = generateRandomRgb();
    const coords = generateRandomCoords();

    // Create my player
    spawnPlayer(peer.name, color, coords);

    // Notify everyone on the network about the change
    peer.broadcast('new-player', { coords, color });
  }

  /* When this peer enters the network (that is, is
  connected to everyone) it incorporates the network
  state and creates a new player notifying everyone */
  peer.onEnterNetwork((state) => {
    gameState.players = state.players;
    spawnPlayerAndBroadcast();
  });

  /* Callback called when this peer receives some data
  from anypeer in the network */
  peer.onData((data) => {
    switch (data.type) {
      // When a new player was created on the network
      case 'new-player':
        const { coords, color } = data.content;
        spawnPlayer(data.senderName, color, coords);
        break;
      // When any player on the network moves
      case 'player-moved':
        const { command } = data.content;
        const player = gameState.players[data.senderName];
        sendCommand(player, command);
        render();
        break;
      // When a peer on the network sends a message in chat
      case 'message-sended':
        const { message } = data.content;
        webContents.send('message-sended', data.senderName, message);
        break;
    }
  });

  // Callback called when this peer receives a connection from another peer
  peer.onReceiveConnection((name) => {
    webContents.send('system-log', `> ${name} connected.`);
  });

  // Callback called when someone disconnects from the network
  peer.onDisconnect((name) => {
    delete gameState.players[name];
    webContents.send('system-log', `> ${name} disconnected.`);
    render();
  })

  // When receiving from the "front-end" the pressed key event
  ipcMain.on('key-pressed', (event, keyPressed) => {
    const player = gameState.players[peer.name];
    sendCommand(player, keyPressed);
    peer.broadcast('player-moved', { command: keyPressed });
    
    render();
  });

  // When receiving from the "front-end" the event that the user sent a message
  ipcMain.on('message-sended', (event, message) => {
    webContents.send('message-sended', peer.name, message);
    peer.broadcast('message-sended', { message });
  });
}

// Creates the Electron window and bootstrap the game
app.whenReady().then(() => {
  createWindowAndCall(bootstrap);
});