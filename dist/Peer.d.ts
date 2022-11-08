import net from 'net';
import { ReceiveConnectionCallback, ReceiveStateCallback, DisconnectCallback, DataCallback, PeerData } from './types.js';
export default class Peer {
    /** State that will be shared among all peers */
    state: any;
    /** Unique peer name */
    name: string;
    /** Port on which this peer will listen for connections */
    port: number;
    /** Boolean that defines whether debug mode is active or not */
    private isDebugEnabled;
    /** TCP server of this peer */
    private server;
    /** Array containing all connections established by this peer */
    private connections;
    /** Array of all hosts known to this peer */
    private knownHosts;
    private onReceiveConnectionCallback;
    private onReceiveStateCallback;
    private onDisconnectCallback;
    private onDataCallback;
    constructor(name: string, state?: any, debugMode?: boolean);
    /**
     * Open the server for this peer on the given port
     * @returns {Promise<number>} Returns a Promise that resolves
     * to the port number the server is listening on or rejected
     * with Error object if an error has occurred
    */
    listen: (port?: number) => Promise<number>;
    private handleDisconnection;
    /** Remove socket from arrays of known connections and hosts */
    private forgetConnection;
    /** Send hosts known to this
    peer to the client peer */
    private sendKnownHostsTo;
    /** Send the state of this peer to the client peer */
    private sendStateTo;
    /**
     * Try to connect to a peer using the given ip and port
     * @returns {Promise<void>} Returns a Promise that is resolved if
     * the connection was successfully established or rejected otherwise
    */
    connectTo: (host: string, port: number, timeoutInSeconds?: number) => Promise<void>;
    private addKnownHost;
    private addConnection;
    /** Checks if the given host is among the known hosts array */
    private isKnownHost;
    /** Checks if the name passed is being used by some known host */
    private isNameUsed;
    /** Receives known hosts from another peer */
    private receiveKnownHosts;
    /** Set the state received by another peer */
    private receiveState;
    /** Receive the name of a peer and the port it is listening on */
    private receiveIntroduction;
    private destroySocket;
    /** Send this peer's server name and port to another peer */
    private introduceMyselfTo;
    /** Send data to a single peer */
    sendData: (socket: net.Socket, data: PeerData) => void;
    /** Send data to all known peers (this one is not included) */
    broadcastData: (data: PeerData) => void;
    broadcastState: (state: any, senderName: string) => void;
    private listenClientData;
    private addSocketListeners;
    /** The given callback is called every time this peer receives a connection */
    onReceiveConnection(callback: ReceiveConnectionCallback): void;
    /** The given callback is called every time this peer updates its own state */
    onReceiveState(callback: ReceiveStateCallback): void;
    /** The given callback is called every time a peer disconnects from the network */
    onDisconnect(callback: DisconnectCallback): void;
    /** The given callback is called every time some data is transmitted to this peer */
    onData(callback: DataCallback): void;
}
//# sourceMappingURL=Peer.d.ts.map