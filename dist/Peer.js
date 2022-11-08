"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const types_js_1 = require("./types.js");
class Peer {
    /** State that will be shared among all peers */
    state;
    /** Unique peer name */
    name;
    /** Port on which this peer will listen for connections */
    port = 0;
    /** Boolean that defines whether debug mode is active or not */
    isDebugEnabled;
    /** TCP server of this peer */
    server = null;
    /** Array containing all connections established by this peer */
    connections = [];
    /** Array of all hosts known to this peer */
    knownHosts = [];
    onReceiveConnectionCallback;
    onReceiveStateCallback;
    onDisconnectCallback;
    onDataCallback;
    constructor(name, state = {}, debugMode = false) {
        this.name = name;
        this.state = state;
        this.isDebugEnabled = debugMode;
    }
    /**
     * Open the server for this peer on the given port
     * @returns {Promise<number>} Returns a Promise that resolves
     * to the port number the server is listening on or rejected
     * with Error object if an error has occurred
    */
    listen = async (port = 0) => {
        return new Promise((resolve, reject) => {
            this.server = net_1.default.createServer((socket) => {
                this.addConnection(socket);
                this.addSocketListeners(socket);
                this.introduceMyselfTo(socket, this.port);
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
    handleDisconnection = (socket) => {
        this.forgetConnection(socket);
    };
    /** Remove socket from arrays of known connections and hosts */
    forgetConnection = (socket) => {
        /* Assign a new array to this.connections,
        however, without the socket that disconnected */
        this.connections = this.connections.filter(conn => {
            return conn !== socket;
        });
        this.knownHosts.forEach(host => {
            const isKnownPort = (host.portImConnected === socket.remotePort
                || host.serverPort === socket.remotePort);
            if ((host.ip === socket.remoteAddress) && isKnownPort) {
                const indexToRemove = this.knownHosts.indexOf(host);
                this.knownHosts.splice(indexToRemove, 1);
                this.onDisconnectCallback?.(host, socket);
            }
        });
    };
    /** Send hosts known to this
    peer to the client peer */
    sendKnownHostsTo = (socket, knownHosts) => {
        const data = {
            type: types_js_1.DataType.KNOWN_HOSTS,
            senderName: this.name,
            content: knownHosts
        };
        this.sendData(socket, data);
    };
    /** Send the state of this peer to the client peer */
    sendStateTo = (socket, state) => {
        const data = {
            type: types_js_1.DataType.STATE,
            senderName: this.name,
            content: state
        };
        this.sendData(socket, data);
    };
    /**
     * Try to connect to a peer using the given ip and port
     * @returns {Promise<void>} Returns a Promise that is resolved if
     * the connection was successfully established or rejected otherwise
    */
    connectTo = async (host, port, timeoutInSeconds = 20) => {
        return new Promise((resolve, reject) => {
            const connect = () => {
                const socket = net_1.default.createConnection({ port, host }, () => {
                    /* If the host this peer is connecting to
                    is not known, then add to known array
                    Note: the name is unknown, only after the server
                    present that he will be assigned */
                    const hostImConnected = {
                        name: '',
                        ip: host,
                        portImConnected: socket.remotePort,
                        serverPort: port,
                    };
                    if (!this.isKnownHost(hostImConnected)) {
                        this.addKnownHost(hostImConnected);
                    }
                    this.addConnection(socket);
                    this.addSocketListeners(socket);
                    this.introduceMyselfTo(socket, this.port);
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
    addKnownHost = (host) => {
        this.knownHosts.push(host);
    };
    addConnection = (socket) => {
        this.connections.push(socket);
    };
    /** Checks if the given host is among the known hosts array */
    isKnownHost = (host) => {
        const hostFound = this.knownHosts.find((knownHost) => {
            const isKnownIp = knownHost.ip === host.ip.slice(7) || knownHost.ip === host.ip;
            const isKnownPort = knownHost.serverPort === host.serverPort;
            const isKnownName = knownHost.name === host.name;
            return (isKnownIp && isKnownPort) || isKnownName;
        });
        return hostFound !== undefined;
    };
    /** Checks if the name passed is being used by some known host */
    isNameUsed = (name) => {
        for (let i = 0; i < this.knownHosts.length; i++) {
            if (this.knownHosts[i].name === name) {
                return true;
            }
        }
        // Lastly, if the name is not the same as this peer, then return false
        return name === this.name;
    };
    /** Receives known hosts from another peer */
    receiveKnownHosts = (data) => {
        data.content.forEach((host) => {
            // If the host is not known
            if (!this.isKnownHost(host)) {
                /* Connects to the host and after that,
                adds it to the array of known hosts */
                this.connectTo(host.ip, host.serverPort)
                    .then(() => this.addKnownHost(host));
            }
        });
    };
    /** Set the state received by another peer */
    receiveState = (data) => {
        if (this.isDebugEnabled) {
            showDebugMessage('state received ->', data.content);
        }
        this.state = data.content;
        this.onReceiveStateCallback?.(data);
    };
    /** Receive the name of a peer and the port it is listening on */
    receiveIntroduction = (socket, data) => {
        for (let i = 0; i < this.knownHosts.length; i++) {
            const currentHost = this.knownHosts[i];
            // If the port is already known
            if (currentHost.serverPort === data.content) {
                /* If the name is empty, it is a sign that the server
                in which this peer connected introduced himself */
                if (currentHost.name.length === 0) {
                    currentHost.name = data.senderName;
                }
                /* Return as the server is already known and
                this peer has already configured its listeners */
                return;
            }
        }
        // If the name is being used within the network, it won't let you connect
        if (this.isNameUsed(data.senderName)) {
            const closedConnectionPacket = {
                type: types_js_1.DataType.CLOSED_CONNECTION,
                senderName: data.senderName,
                content: 'Nickname is already being used.'
            };
            this.sendData(socket, closedConnectionPacket);
            socket.end();
            return;
        }
        /* Call the onReceiveConnection callback
        because the peer received a connection */
        this.onReceiveConnectionCallback?.(data.senderName, socket);
        /* This peer sends all hosts that knows so
        that the other peer can also connect to the
        other network peers */
        this.sendKnownHostsTo(socket, this.knownHosts);
        // Add peer to known hosts array
        this.addKnownHost({
            name: data.senderName,
            ip: socket.remoteAddress || '',
            portImConnected: socket.remotePort,
            serverPort: data.content
        });
        // Sending the current state to the client
        this.sendStateTo(socket, this.state);
    };
    destroySocket(socket, errorMessage) {
        socket.destroy(new Error(errorMessage));
    }
    /** Send this peer's server name and port to another peer */
    introduceMyselfTo = (socket, portImListening) => {
        const data = {
            type: types_js_1.DataType.PEER_INTRODUCTION,
            senderName: this.name,
            content: portImListening
        };
        this.sendData(socket, data);
    };
    /** Send data to a single peer */
    sendData = (socket, data) => {
        // Concatenating with a '\n' to mark end of JSON in buffer
        const jsonData = JSON.stringify(data).concat('\n');
        if (!socket.writableEnded) {
            socket.write(jsonData);
        }
    };
    /** Send data to all known peers (this one is not included) */
    broadcastData = (data) => {
        this.connections.forEach((socket) => {
            this.sendData(socket, data);
        });
    };
    /* Sends the state of this peer to the other peers,
    that will overwrite the state itself with the received */
    broadcastState = (state, senderName) => {
        const data = {
            senderName,
            type: types_js_1.DataType.STATE,
            content: state,
        };
        this.broadcastData(data);
    };
    /* Listens to the data sent by the customer
    Note: the messages are always transmitted in
    the "PeerData" interface format in JSON */
    listenClientData = (socket) => {
        socket.on('data', bufferData => {
            const buffer = bufferData.toString();
            /* If there is more than one Json in the buffer,
            they are separated by the line break */
            const jsonDatas = buffer
                .split(/\r?\n/)
                .filter(json => json.length !== 0);
            jsonDatas.forEach(jsonData => {
                if (this.isDebugEnabled) {
                    showDebugMessage(jsonData);
                }
                const data = JSON.parse(jsonData);
                switch (data.type) {
                    case types_js_1.DataType.STATE:
                        this.receiveState(data);
                        break;
                    case types_js_1.DataType.KNOWN_HOSTS:
                        this.receiveKnownHosts(data);
                        break;
                    case types_js_1.DataType.PEER_INTRODUCTION:
                        this.receiveIntroduction(socket, data);
                        break;
                    case types_js_1.DataType.CLOSED_CONNECTION:
                        this.destroySocket(socket, data.content);
                        break;
                }
                this.onDataCallback?.(data, socket);
            });
        });
    };
    addSocketListeners = (socket) => {
        socket.setEncoding('utf8');
        socket.on('close', (hadError) => {
            if (this.isDebugEnabled) {
                showDebugMessage(`${socket.remoteAddress ?? 'unknown peer'} -> "close" event triggered. Had error: ${hadError}`);
            }
            this.handleDisconnection(socket);
        });
        socket.on('end', () => {
            if (this.isDebugEnabled) {
                showDebugMessage(`${socket.remoteAddress ?? 'unknown peer'} -> "end" event triggered.`);
            }
            this.handleDisconnection(socket);
        });
        /* Adds a listen to hear when
        the client socket send data */
        this.listenClientData(socket);
    };
    /** The given callback is called every time this peer receives a connection */
    onReceiveConnection(callback) {
        this.onReceiveConnectionCallback = callback;
    }
    /** The given callback is called every time this peer updates its own state */
    onReceiveState(callback) {
        this.onReceiveStateCallback = callback;
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
function showDebugMessage(message, ...args) {
    console.log('[DEBUG]', message, ...args);
}
