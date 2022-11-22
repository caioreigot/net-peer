function checkFruitCollision(state) {
  Object.values(state.snakes).forEach((snake) => {
    const snakeHead = snake.body[0];
    
    state.fruitCoords.forEach((fruitCoord, index) => {
      if (snakeHead.x === fruitCoord.x && snakeHead.y === fruitCoord.y) {
        // Adds a new pixel at the position of the last pixel of the snake's tail
        snake.body.push(snake.body[snake.body.length - 1]);
  
        // Remove the fruit from the game
        state.fruitCoords.splice(index, 1);
      }
    });
  });
}

module.exports = checkFruitCollision;