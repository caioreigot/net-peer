const sendCommand = (player, command) => {
  switch (command) {
    case 'ArrowUp':
    case 'w':
      if (player.coords.y - 1 >= 0) player.coords.y -= 1;
      break;
    case 'ArrowLeft':
    case 'a':
      if (player.coords.x - 1 >= 0) player.coords.x -= 1;
      break;
    case 'ArrowDown':
    case 's':
      if (player.coords.y + 1 <= 8) player.coords.y += 1;
      break;
    case 'ArrowRight':
    case 'd':
      if (player.coords.x + 1 <= 15) player.coords.x += 1;
      break;
  }
}

module.exports = sendCommand;