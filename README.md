# Net Peer
A P2P multi-directional communication module for exchanging data, built on top of the Node.js net package.

The code, which only uses Node's internal "net" module, establishes a TCP connection between the sockets where the messaging need is multi-directional. There is no centralized connection, the peers connect to each other and are aware of each other, maintaining a decentralized network.