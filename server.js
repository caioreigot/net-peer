const { Peer } = require('net-peer');

// State that will be transmitted between all peers
const state = { 
  rooms: {
    'room1': { participants: ['Audrey', 'Maggie'], theme: 'just-chatting' },
    'room2': { participants: ['Sean', 'Charles'], theme: 'just-chatting' },
  }
};

/*
  Remember: it is the programmer's responsibility to maintain peer state
  (in this example, the "const state") always with the same reference.

  How to do this?

  It's simple. Create a state that is an object, just like in this example,
  and pass it to the second parameter of the Peer class "new Peer(uniqueName, state)"
  from this point forward, do not directly pass a new value to state.

  Don't do this (wrong example): state = value
  Do this instead (good example): state.anyProperty = value

  Every time you change some property of the state object,
  the change will also reflect internally in the Peer object, as the
  object will have the same reference, and that's what we want.

  If you passed a variable directly to "state" (state = value), as seen in the wrong
  example, so the "state" became another object with another memory reference, which
  will cause the changes to not reflect the Peer's "state", which will also cause
  that it passes the out-of-date state to all peers that connect in the future.
*/

const peer = new Peer('Server', state);

// Callback called every time this peer receives some data
peer.onData((data) => {
  if (data.type === 'message') {
    console.log(data.content);
  }
})

peer.onReceiveConnection((name) => {
  console.log(`> ${name} connected.`);
});

peer.onDisconnect((name) => {
  console.log(`> ${name} disconnected.`);
});

peer.listen(3000);