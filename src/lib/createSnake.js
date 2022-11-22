function createSnake(name, color, headCoords) {
  const snake = {
    name,
    color,
    width: 1,
    height: 1,
    body: [headCoords, { x: headCoords.x, y: headCoords.y + 1 }],
    direction: { x: 0, y: 0 },
  }

  return snake;
}

module.exports = createSnake;