const randomNumber = (min, max) => {
	return Math.round(Math.random() * (max - min)) + min;
}

function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

const SCREEN_SIZE = {
  WIDTH: 41,
  HEIGHT: 41,
}

module.exports = {
  randomNumber,
  clamp,
  SCREEN_SIZE,
}