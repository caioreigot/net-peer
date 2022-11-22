const { Peer } = require('net-peer');
const { app, ipcMain } = require('electron');
const { SCREEN_SIZE, randomNumber } = require('./lib/utils');
const createWindow = require('./lib/createWindow');
const checkFruitCollision = require('./lib/checkFruitCollision');
const handleSnakesCollision = require('./lib/handleSnakesCollision');
const createSnake = require('./lib/createSnake');
const moveSnake = require('./lib/moveSnake');

/* Object passed into the Peer class that will
be shared among everyone on the network */
const state = {
  snakes: {},
  fruitCoords: [],
  playerList: [],
}

const timers = [];

// Game "core" function
function bootstrap(webContents, playerNickname) {
  // Using the Peer class to create a new user on the network
  const peer = new Peer(playerNickname, state);

  /* Try to connect to the room if it already exists or
  opens a server if the room does not yet exist */
  peer.connect('127.0.0.1', 3000)
    .catch(() => {
      peer.listen(3000).then(() => onEnterRoom(1));
      state.playerList.push(peer.name);
    });

  // Create, spawn and render a snake
  const spawnSnake = (name, color, headCoords) => {
    const snake = createSnake(name, color, headCoords);  
    state.snakes[name] = snake;
    
    return snake;
  }

  /* Create, spawn, render and notify everyone on
  the network that a new snake has joined */
  const onEnterRoom = (playerArrivalOrder) => {
    const color = ['#772ce8', '#21e065'][playerArrivalOrder - 1];

    const xCenter = Math.ceil(SCREEN_SIZE.WIDTH / 2);
    const yCenter = Math.ceil(SCREEN_SIZE.HEIGHT / 2);

    const headCoords = playerArrivalOrder === 1 
      ? { x: xCenter - 2, y: yCenter }
      : { x: xCenter + 2, y: yCenter };

    // Create my snake
    const snake = spawnSnake(peer.name, color, headCoords);

    // Add my name to player list
    webContents.send('add-nickname-to-list', peer.name);

    // Notify everyone on the network that I joined
    peer.broadcast('new-snake', { snake });
  }

  /* When this peer enters the network (that is, is
  connected to everyone) it incorporates the network
  state and creates a new snake notifying everyone */
  peer.onEnterNetwork((networkState) => {
    state.snakes = networkState.snakes;
    state.fruitCoords = networkState.fruitCoords;
    state.playerList = networkState.playerList;

    state.playerList.forEach((playerNickname) => {
      webContents.send('add-nickname-to-list', playerNickname);
    });

    onEnterRoom(2);
  });

  /* Callback called when this peer receives some data
  from anypeer in the network */
  peer.onData((data) => {
    switch (data.type) {
      case 'new-snake':
        webContents.send('add-nickname-to-list', data.senderName);
        state.playerList.push(data.senderName);
        state.snakes[data.senderName] = data.content.snake;
        break;
      case 'snake-moved':
        state.snakes[data.senderName].body = data.content.body;
        break;
      case 'new-fruit':
        state.fruitCoords.push(data.content.coord);
        break;
    }
  });

  peer.onDisconnect((peerName) => {
    state.playerList = state.playerList.filter(nickname => nickname != peerName);
    webContents.send('remove-nickname-from-list', peerName);
    
    delete state.snakes[peerName];
  });

  // When receiving from the "front-end" the pressed key event
  ipcMain.on('change-snake-direction', (event, direction) => {
    const snake = state.snakes[peer.name];

    /* Doesn't change directions if the new direction is the opposite of the
    current one (e.g. go up if going down or go left if going right) */
    if (
      (direction.x !== 0 && Math.abs(snake.direction.x) === Math.abs(direction.x)) ||
      (direction.y !== 0 && Math.abs(snake.direction.y) === Math.abs(direction.y))
    ) {
      return;
    }

    snake.direction = direction;
  });

  // Render game
  timers.push(setInterval(() => {
    moveSnake(state.snakes[peer.name]);
    handleSnakesCollision(state);
    checkFruitCollision(state);

    peer.broadcast('snake-moved', { body: state.snakes[peer.name].body });
    webContents.send('render', state);
  }, 70));

  // Spawn fruit recursively
  (function spawnFruit() {
    const delayToSpawnInMs = 1000 * randomNumber(2, 8);

    setTimeout(() => {
      (function generateFreeRandomCoord() {
        // If there are no more spaces for fruit on the canvas, return
        if (state.fruitCoords.length >= SCREEN_SIZE.WIDTH * SCREEN_SIZE.HEIGHT) {
          return;
        }

        const randomCoord = {
          x: randomNumber(0, SCREEN_SIZE.WIDTH - 1),
          y: randomNumber(0, SCREEN_SIZE.HEIGHT - 1),
        }

        for (let i = 0; i < state.fruitCoords.length; i++) {
          const fruitCoord = state.fruitCoords[i];

          // If there is already a fruit in the generated random coordinate
          if (
            randomCoord.x === fruitCoord.x && 
            randomCoord.y === fruitCoord.y
          ) {
            // Calls this function recursively and returns
            generateFreeRandomCoord();
            return;
          }
        }

        state.fruitCoords.push(randomCoord);
        peer.broadcast('new-fruit', { coord: randomCoord });
        spawnFruit();
      })();
    }, delayToSpawnInMs);
  })();
}

// Creates the Electron window and bootstrap the game
app.whenReady().then(async () => {
  const window = await createWindow();

  window.on('close', () => {
    timers.forEach((timer) => {
      clearInterval(timer);
    });
  });
  
  ipcMain.on('player-chose-nickname', (event, playerNickname) => {
    try {
      bootstrap(window.webContents, playerNickname)
    } catch(error) {
      console.error(error);
    }
  });
});