import KeyboardListener from "./KeyboardListener.js";
import Chat from "./Chat.js";

const { ipcRenderer } = window.require('electron');
const screen = document.getElementById('screen');
const context = screen.getContext('2d');

const keyboardListener = new KeyboardListener();
const chat = new Chat(document.getElementById('messages'));
const messageInput = document.querySelector('#chat-wrapper input');

// See keys pressed while user types in chat input
messageInput.onkeypress = (event) => {
  // If the key pressed was "Enter" && the text entered is not empty
  if (event.key === 'Enter' && messageInput.value.trim()) {
    ipcRenderer.send('message-sended', messageInput.value);
    messageInput.value = '';
  }
}

// Watch the keys pressed
keyboardListener.subscribe((keyPressed) => {
  // If user is not typing in chat input then he is trying to move player
  if (messageInput !== document.activeElement) {
    ipcRenderer.send('key-pressed', keyPressed);
  }
});

function render(gameState) {
  // Clear the screen before rendering again
  context.clearRect(0, 0, screen.width, screen.height);

  // Renders all players that are in the game state
  Object.values(gameState.players).forEach((player) => {    
    const { color, coords, width, height } = player;
    context.fillStyle = color;
    context.fillRect(coords.x, coords.y, width, height);
  })
}

// When it receives the request to render the screen from the server
ipcRenderer.on('render', (event, gameState) => {
  render(gameState);
});

// When it receives the request from the server to render a log in the chat
ipcRenderer.on('system-log', (event, logMessage) => {
  chat.sendLog(logMessage);
});

// When it receives the request from the server to render a message in the chat
ipcRenderer.on('message-sended', (event, senderName, messageContent) => {
  chat.sendMessage(senderName, messageContent);
});