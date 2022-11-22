import KeyboardListener from './KeyboardListener.js';

const { ipcRenderer } = window.require('electron');
const screen = document.getElementById('screen');
const context = screen.getContext('2d');

const keyboardListener = new KeyboardListener();

// Watch the keys pressed
keyboardListener.subscribe((keyPressed) => {
  const direction = (function() {
    switch (keyPressed) {
      case 'ArrowUp':
      case 'w':
        return { x: 0, y: -1 };
      case 'ArrowLeft':
      case 'a':
        return { x: -1, y: 0 };
      case 'ArrowDown':
      case 's':
        return { x: 0, y: 1 };
      case 'ArrowRight':
      case 'd':
        return { x: 1, y: 0 };
      default:
        return null;
    }
  })();
  
  if (direction) {
    ipcRenderer.send('change-snake-direction', direction);
  }
});

function render(state) {
  // Clear the screen before rendering again
  context.clearRect(0, 0, screen.width, screen.height);

  // Renders all snakes that are in the game state
  Object.values(state.snakes).forEach((snake) => {    
    const { color, body, width, height } = snake;
    context.fillStyle = color;

    for (let i = 0; i < body.length; i++) {
      const { x, y } = body[i];
      context.fillRect(x, y, width, height);
    }
  });

  // Renders all fruits that are in the game state
  state.fruitCoords.forEach((fruitCoord) => {    
    const { x, y } = fruitCoord;
    context.fillStyle = '#ff453c';
    context.fillRect(x, y, 1, 1);
  });
}

// When it receives the request to render the screen from the server
ipcRenderer.on('render', (event, gameState) => {
  render(gameState);
});

ipcRenderer.on('add-nickname-to-list', (event, nickname) => {
  const playerList = document.querySelector('#player-list');
  const span = document.createElement('span');
  span.innerText = nickname;

  playerList.append(span);
});

ipcRenderer.on('remove-nickname-from-list', (event, nickname) => {
  const playerList = document.querySelector('#player-list');
  
  for (let i = 0; i < playerList.children.length; i++) {
    if (playerList.children[i].innerText == nickname) {
      playerList.children[i].remove();
    }
  }
});