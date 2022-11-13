export default class KeyboardListener {
  observers = [];

  constructor() {
    document.addEventListener('keydown', event => {
      for (const observerFunction of this.observers) {
        observerFunction(event.key);
      }
    });
  }

  subscribe(observerFunction) {
    this.observers.push(observerFunction);
  }
}