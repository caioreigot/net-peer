function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

function generateRandomRgb() {
  const values = [];

  for (let i = 0; i < 3; i++) {
    const min = 30;
    const max = 220;
    const random = Math.random() * max;
    values.push(Math.floor(clamp(random, min, max)));
  }

  return `rgb(${values[0]},${values[1]},${values[2]})`;
}

function generateRandomCoords() {
  const generateRandomPosition = (min, max) => Math.floor(
    clamp(Math.random() * max + 1, min, max)
  );

  const coords = {
    x: generateRandomPosition(0, 15),
    y: generateRandomPosition(0, 8),
  }

  return coords;
}

module.exports = {
  generateRandomCoords,
  generateRandomRgb,
}