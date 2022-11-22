const { ipcRenderer } = window.require('electron');

const enterNicknameModal = document.querySelector('#enter-nickname-modal');
const nicknameInput = document.querySelector('#nickname-input');
const readyButton = document.querySelector('#ready-button');

nicknameInput.onkeydown = (event) => {
  if (event.key === 'Enter') {
    readyButton.click();
  }
}

readyButton.onclick = () => {
  if (nicknameInput.value.trim() === '') return;

  enterNicknameModal.style.display = 'none';
  ipcRenderer.send('player-chose-nickname', nicknameInput.value);
}