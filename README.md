# Net Peer
A P2P multi-directional communication module for exchanging data, built on top of the Node.js net package.

The code, which only uses Node's internal "net" module, establishes a TCP connection between the sockets where the messaging need is multi-directional. There is no centralized connection, the peers connect to each other and are aware of each other, maintaining a decentralized network.

## Documentation
<img width="2548" alt="Image illustrating the step by step the code does" src="https://user-images.githubusercontent.com/62410044/201552812-caa55497-9430-4506-acae-1a3e451842f1.png">

First of all, know that this repository has two more branches where you can see the practical use of this package, in the **example-project** a simple game with chat is made and in the **simple-example** there are only two files (client.js and server.js) that communicate with each other.

### Concept
Think that you opened a room in some co-op game and called that friend of yours to play, he enters the room and then the two of you start playing. In these situations, in games that don't have their own server to manage the rooms created by their players, if your internet connection goes down, your friend will go down with it, right? This is because you were the one who initially opened the room, what made you become the "host", the room server. The package present in this repository doesn't work this way, using the same situation as the example, if you had lost connection, your friend would still be inside the room (inside the network), and as soon as your internet connection comes back, you can still connect in the room through your friend. All members of the network become servers and clients at the same time and know the information in the room, thus being able to pass this information on to anyone who wants to connect to the network. The disadvantage of this approach is the lack of security regarding data integrity due to the fact that network information resides locally on each member's computer, being susceptible to undue modifications by them. Therefore, it is not recommended to use this package in situations dealing with sensitive data or in competitive games.

### How to use
- Install the package in your project:
```bash
npm install net-peer
```

- Import [Peer](src/Peer.ts) from the **net-peer** package:
```js
// ESModules
import { Peer } from 'net-peer';

// CommonJS
const { Peer } = require('net-peer');  
```

- To get started, you'll need a unique name (required) and a state (not required):
> Again, if your code doesn't need a state, you can omit the second parameter when instantiating **Peer**. See the project contained in the **example-project** branch of this repository to understand more about how state can be used.
```js
// Declare the state as a constant to ensure the reference is always the same
const state = { someProperty: 'someValue' };

/* Attention: do not directly pass a value to the second parameter, always pass an object because the reference
needs to be the same so that when you update the state the changes will also be reflected inside the Peer object

This peer will pass its state on to anyone who connects to it via the callback
onEnterNetwork defined by peer client (cited further below) */
const peer = new Peer('John Doe', state);
```

- Now, to open a server, you can use the **listen** function:
```js
// The parameter is the port on which the server will listen for connections
peer.listen(3000)
  .catch(error => console.warn('Could not open server.', error);
```
Or else:
```js
// When calling without passing parameters, the server will use a random available port
peer.listen()
  .then(port => console.log(`I'm listening on port ${port}...`));
```

- To connect to a Peer that has opened a connection, use the **connect** function:
```js
// The first parameter is the ip of the server and the second parameter is the port it listens on
peer.connect('127.0.0.1', 3000)
  .then(() => console.log("I connected! But I'm not part of the network yet."))
  .catch(error => console.warn("I couldn't connect!", error));
```

- To transmit data to all members of the network, use the **broadcast** function:
```js
peer.broadcast('greetings', `Hi, my name is ${peer.name}!`);
```

- To receive data from other members, use the **onData** callback:
> It is recommended that you assign these callbacks **before** calling **peer.connect** or **peer.listen**
```js
peer.onData((data) => {
  if (data.type === 'greetings') {
    console.log(`${data.senderName} sent greetings: ${data.content}`);
  }
});
```

- To transmit information to all members of the network after connecting, do not use **then** in the **connect** function, because as seen in the image at the beginning of this documentation, the connection is just the first step and the peer does not yet know all the members of the network. So use the **onEnterNetwork** callback:
```js
// networkState is the current state of the network provided by the peer server
peer.onEnterNetwork((networkState) => {
  // The first parameter is the type of data being sent
  // The second parameter is the content (can also be any serializable object)
  peer.broadcast('greetings', 'Hi :)');
  
  /* Don't assign the state directly, for example: state = networkState, this will change
  the object reference, making the state passed as the second parameter to the
  instantiate Peer does not keep track of values. Instead, do this: */
  state.someProperty = networkState.someProperty;
});
```

- To handle incoming connections and disconnections, use the **onReceiveConnection** and **onDisconnect** callbacks:
```js
peer.onReceiveConnection((peerName) => {
  console.log(`${peerName} connected.`);
});

peer.onDisconnect((peerName) => {
  console.log(`${peerName} disconnected.`);
});
```
