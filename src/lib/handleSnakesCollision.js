function handleSnakesCollision(state) {
  const shrinkSnakes = () => {
    Object.values(state.snakes).forEach((snake) => {
      snake.body = [snake.body[0], snake.body[1]];
    });
  }

  Object.entries(state.snakes).forEach(([name, snake]) => {
    const snakeHeadCoord = snake.body[0];

    for (let i = 1; i < snake.body.length; i++) {
      const bodyCoord = snake.body[i];

      // Checking collision with itself
      if (
        snakeHeadCoord.x === bodyCoord.x &&
        snakeHeadCoord.y === bodyCoord.y
      ) {
        shrinkSnakes();
      }
    }

    // Checking collision with other snakes
    Object.entries(state.snakes).forEach(([otherName, otherSnake]) => {
      if (name === otherName) return;

      for (let i = 0; i < otherSnake.body.length; i++) {
        const otherBodyCoord = otherSnake.body[i];
      
        if (
          snakeHeadCoord.x === otherBodyCoord.x &&
          snakeHeadCoord.y === otherBodyCoord.y  
        ) {
          shrinkSnakes();
        }
      }
    });
  });
}

module.exports = handleSnakesCollision;