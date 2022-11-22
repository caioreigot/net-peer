const { SCREEN_SIZE } = require('./utils');

function moveSnake(snake) {
  // !(x XOR y), this means, return whether x and y == 0 or x and y == 1
  if (!(snake.direction.x ^ snake.direction.y)) {
    return;
  }

  /* Starting from the last pixel of the tail, when moving,
  it will always take the position of the next pixel */

  for (let i = snake.body.length - 1; i > 0; i--) {
    snake.body[i] = snake.body[i - 1];
  }

  const xTargetPosition = snake.body[0].x + snake.direction.x;
  const yTargetPosition = snake.body[0].y + snake.direction.y;

  let newCoords = { x: xTargetPosition, y: yTargetPosition };

  // If the snake is reaching the horizontal edge of the screen
  if (xTargetPosition > SCREEN_SIZE.WIDTH - 1) newCoords.x = 0;
  else if (xTargetPosition < 0) newCoords.x = SCREEN_SIZE.WIDTH - 1;

  // If the snake is reaching the vertical limit of the screen
  if (yTargetPosition > SCREEN_SIZE.HEIGHT - 1) newCoords.y = 0;
  else if (yTargetPosition < 0) newCoords.y = SCREEN_SIZE.HEIGHT - 1;

  snake.body[0] = newCoords;
}

module.exports = moveSnake;