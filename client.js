const { Peer } = require('net-peer');

// State that will be transmitted between all peers
const state = { 
  rooms: {
    'room1': { participants: ['Audrey', 'Maggie'], theme: 'just-chatting' },
    'room2': { participants: ['Sean', 'Charles'], theme: 'just-chatting' },
  }
};

const peer = new Peer('Client', state);

/* Here is when this peer will have known
and connected to everyone on the network */
peer.onEnterNetwork((state) => {
  state.rooms = state.rooms;
  peer.broadcast('message', `Hi, my name is ${peer.name}!`)
});

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

peer.connect('127.0.0.1', 3000);