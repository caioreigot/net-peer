export default class Chat {
  htmlMessagesContainer = null;

  constructor(htmlMessagesContainer) {
    this.htmlMessagesContainer = htmlMessagesContainer;
  }

  sendLog(logMessage) {
    const message = document.createElement('p');
    message.classList.add('log')
    message.append(logMessage);

    this.render(message);
  }

  sendMessage(senderName, messageContent) {
    const span = document.createElement('span');
    span.append(`${senderName}: `);

    const message = document.createElement('p');
    message.append(span);
    message.append(messageContent);

    this.render(message);
  }

  render(message) {
    this.htmlMessagesContainer.append(message);
    message.scrollIntoView();
  }
}