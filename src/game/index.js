import KeyboardListener from "./KeyboardListener.js";
import Chat from "./Chat.js";

const { ipcRenderer } = window.require('electron');
const screen = document.getElementById('screen');
const context = screen.getContext('2d');

const keyboardListener = new KeyboardListener();
const chat = new Chat(document.getElementById('messages'));
const messageInput = document.querySelector('#chat-wrapper input');

messageInput.onkeypress = (event) => {
  if (event.key === 'Enter' && messageInput.value.trim()) {
    ipcRenderer.send('message-sended', messageInput.value);
    messageInput.value = '';
  }
}

keyboardListener.subscribe((keyPressed) => {
  if (messageInput !== document.activeElement) {
    ipcRenderer.send('key-pressed', keyPressed);
  }
});

function render(gameState) {
  // Clearing the screen to render again
  context.clearRect(0, 0, screen.width, screen.height);

  Object.values(gameState.players).forEach((player) => {    
    const { color, coords, width, height } = player;
    context.fillStyle = color;
    context.fillRect(coords.x, coords.y, width, height);
  })
}

ipcRenderer.on('render', (event, gameState) => {
  render(gameState);
});

ipcRenderer.on('system-log', (event, logMessage) => {
  chat.sendLog(logMessage);
});

ipcRenderer.on('message-sended', (event, senderName, messageContent) => {
  chat.sendMessage(senderName, messageContent);
});