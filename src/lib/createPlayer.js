function createPlayer(name, color, coords) {
  const player = {
    name,
    width: 1,
    height: 1,
    coords,
    color,
  }

  return player;
}

module.exports = createPlayer;