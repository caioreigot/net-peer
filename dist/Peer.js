"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const types_js_1 = require("./types.js");
class Peer {
    /** Unique peer name */
    name;
    /** Port on which this peer will listen for connections */
    port = 0;
    /** State that will be shared among all peers */
    network = { hosts: [], state: null };
    /** TCP server of this peer */
    server = null;
    /** Array containing all connections established by this peer */
    connections = [];
    onReceiveConnectionCallback;
    onEnterNetworkCallback;
    onDisconnectCallback;
    onDataCallback;
    constructor(name, state = {}) {
        this.name = name;
        this.network.state = state;
    }
    /**
     * Open the server for this peer on the given port
     * @returns {Promise<number>} Returns a Promise that resolves
     * to the port number the server is listening on or rejected
     * with Error object if an error has occurred
    */
    listen = async (port = 0) => {
        return new Promise((resolve, reject) => {
            /* Causes this peer to listen for other connections ("open the server") and pass
            a second-parameter callback that is invoked whenever it receives a connection */
            this.server = net_1.default.createServer((socket) => {
                this.connections.push(socket);
                this.addSocketListeners(socket);
            });
            const server = this.server.listen(port, () => {
                /* The port passed as a parameter in the listen can be 0,
                which makes to generate a random and free port for the server
                listen, then this.port receives this new generated port */
                this.port = server.address().port;
                console.log(`> Listening on 0.0.0.0:${this.port}`);
                resolve(this.port);
            })
                .on('error', reject);
        });
    };
    /** Remove socket from arrays of known connections and hosts */
    handleDisconnection = (socket) => {
        /* Assign a new array to this.connections,
        however, without the socket that disconnected */
        this.connections = this.connections.filter(conn => {
            return conn !== socket;
        });
        this.network.hosts.forEach(host => {
            const isKnownPort = (host.remotePort === socket.remotePort
                || host.mainPort === socket.remotePort);
            if ((host.ip === socket.remoteAddress) && isKnownPort) {
                const indexToRemove = this.network.hosts.indexOf(host);
                this.network.hosts.splice(indexToRemove, 1);
                this.onDisconnectCallback?.(host, socket);
            }
        });
    };
    /**
     * Try to connect to a peer using the given ip and port
     * @returns {Promise<void>} Returns a Promise that is resolved if
     * the connection was successfully established or rejected otherwise
    */
    connect = (host, port, timeoutInSeconds = 20) => {
        return new Promise((resolve, reject) => {
            const connect = () => {
                const socket = net_1.default.createConnection({ port, host }, () => {
                    /* If this is the first connection from this peer, it
                    asks the network information for the peer server */
                    if (this.network.hosts.length === 0) {
                        this.sendData(socket, {
                            type: types_js_1.DataType.REQUEST_NETWORK_INFORMATION,
                            content: null,
                        });
                    }
                    /* Add the server peer to the known hosts list
                    Note: the name is unknown, only after the server
                    present that he will be assigned */
                    this.network.hosts.push({
                        ip: host,
                        remotePort: socket.remotePort,
                        mainPort: port,
                    });
                    this.connections.push(socket);
                    this.addSocketListeners(socket);
                    this.sendPresentation(socket, this.port);
                    // Removing the established timeout
                    socket.setTimeout(0);
                    resolve();
                })
                    .on('error', reject);
                // Setting the time out for the connection attempt
                socket.setTimeout(timeoutInSeconds * 1000, () => {
                    socket.destroy();
                    reject(new Error('ETIMEDOUT'));
                });
            };
            /* It only connects if this peer's server is
            open (if not, open one and after that, connect) */
            this.server
                ? connect()
                : this.listen().then(connect);
        });
    };
    /** Receives the network information from another peer */
    receiveNetworkInformation = async (networkInformation) => {
        const { hosts, state } = networkInformation;
        this.network.state = state;
        /* It connects to all hosts on the network and only after that,
        invokes the onEnterNetwork callback if it has been provided */
        for (let i = 0; i < hosts.length; i++) {
            const host = hosts[i];
            await this.connect(host.ip, host.mainPort);
        }
        this.onEnterNetworkCallback?.(state);
    };
    /** Receive the name of a peer and the port it is listening on */
    receivePresentation = (socket, clientName, clientPort) => {
        for (let i = 0; i < this.network.hosts.length; i++) {
            const currentHost = this.network.hosts[i];
            /* If the ip:port is already known
            && If the name is empty, it is a sign that the server
            in which this peer connected introduced himself */
            if (currentHost.ip == socket.remoteAddress
                && currentHost.mainPort === clientPort
                && !currentHost.name) {
                currentHost.name = clientName;
                /* Return as the server is already known and
                this peer has already configured its listeners */
                return;
            }
        }
        // If the name is being used within the network, it won't let you connect
        if (this.isNameUsed(clientName)) {
            this.sendData(socket, {
                type: types_js_1.DataType.CONNECTION_CLOSED,
                content: { message: 'Nickname is already being used.' },
            });
            socket.end();
            return;
        }
        /* Call the onReceiveConnection callback
        because the peer received a connection */
        this.onReceiveConnectionCallback?.(clientName, socket);
        // Presents itself back to the connecting peer
        this.sendPresentation(socket, this.port);
        // Add peer to known hosts array
        this.network.hosts.push({
            name: clientName,
            ip: socket.remoteAddress,
            remotePort: socket.remotePort,
            mainPort: clientPort
        });
    };
    /** Send the network state to the client peer */
    sendNetworkInformation(socket, network) {
        this.sendData(socket, {
            type: types_js_1.DataType.NETWORK_INFORMATION,
            content: { network },
        });
    }
    destroySocket(socket, errorMessage) {
        socket.destroy(new Error(errorMessage));
    }
    /** Send this peer's server name and port to another peer */
    sendPresentation = (socket, port) => {
        this.sendData(socket, {
            type: types_js_1.DataType.PRESENTATION,
            content: { port },
        });
    };
    /** Send data to a single peer */
    sendData = (socket, data) => {
        const signedPackage = {
            senderName: this.name,
            type: data.type,
            content: data.content,
        };
        // Concatenating with a '\n' to mark end of JSON in buffer
        const json = JSON.stringify(signedPackage).concat('\n');
        if (!socket.writableEnded) {
            socket.write(json);
        }
    };
    /** Send data to all known peers (this one is not included) */
    broadcast = (type, content) => {
        const dataToBroadcast = { type, content };
        this.connections.forEach((socket) => {
            this.sendData(socket, dataToBroadcast);
        });
    };
    /* Listens to the data sent by the customer
    Note: the messages are always transmitted in
    the "PeerData" interface format in JSON */
    listenClientData = (socket) => {
        socket.on('data', bufferData => {
            const buffer = bufferData.toString();
            /* If there is more than one Json in the buffer,
            they are separated by the line break */
            const jsons = buffer
                .split(/\r?\n/)
                .filter(json => json.length !== 0);
            jsons.forEach(json => {
                const parsedJson = JSON.parse(json);
                switch (parsedJson.type) {
                    // When this peer receives an introduction from another peer
                    case types_js_1.DataType.PRESENTATION:
                        const { port } = parsedJson.content;
                        const senderName = parsedJson.senderName;
                        this.receivePresentation(socket, senderName, port);
                        break;
                    // When this peer is informed that its connection has been closed
                    case types_js_1.DataType.CONNECTION_CLOSED:
                        const { message } = parsedJson.content;
                        this.destroySocket(socket, message);
                        break;
                    // When this peer receives information from the network
                    case types_js_1.DataType.NETWORK_INFORMATION:
                        const { network } = parsedJson.content;
                        this.receiveNetworkInformation(network);
                        break;
                    // When this peer receives a request to send network information
                    case types_js_1.DataType.REQUEST_NETWORK_INFORMATION:
                        this.sendNetworkInformation(socket, this.network);
                        break;
                }
                this.onDataCallback?.(parsedJson, socket);
            });
        });
    };
    addSocketListeners = (socket) => {
        socket.setEncoding('utf8');
        socket.on('close', (hadError) => {
            this.handleDisconnection(socket);
        });
        socket.on('end', () => {
            this.handleDisconnection(socket);
        });
        /* Adds a listen to hear when
        the client socket send data */
        this.listenClientData(socket);
    };
    /** Checks if the name passed is being used by some known host */
    isNameUsed = (name) => {
        for (let i = 0; i < this.network.hosts.length; i++) {
            if (this.network.hosts[i].name === name) {
                return true;
            }
        }
        // Lastly, if the name is not the same as this peer, then return false
        return name === this.name;
    };
    /** The given callback is called every time this peer receives a connection */
    onReceiveConnection(callback) {
        this.onReceiveConnectionCallback = callback;
    }
    /** The given callback is called every time this peer updates its own state */
    onEnterNetwork(callback) {
        this.onEnterNetworkCallback = callback;
    }
    /** The given callback is called every time a peer disconnects from the network */
    onDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }
    /** The given callback is called every time some data is transmitted to this peer */
    onData(callback) {
        this.onDataCallback = callback;
    }
}
exports.default = Peer;
