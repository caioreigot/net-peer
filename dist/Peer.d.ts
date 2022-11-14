import net from 'net';
import { ReceiveConnectionCallback, EnterNetworkCallback, DisconnectCallback, DataCallback, PeerData, Network } from './types.js';
export default class Peer {
    /** Unique peer name */
    readonly name: string;
    /** Port on which this peer will listen for connections */
    private port;
    /** The network information */
    network: Network;
    /** TCP server of this peer */
    private server;
    /** Array containing all connections established by this peer */
    private connections;
    private onReceiveConnectionCallback;
    private onEnterNetworkCallback;
    private onDisconnectCallback;
    private onDataCallback;
    constructor(name: string, state?: any);
    /**
     * Open the server for this peer on the given port
     * @returns {Promise<number>} Returns a Promise that resolves
     * to the port number the server is listening on or rejected
     * with Error object if an error has occurred
    */
    listen: (port?: number) => Promise<number>;
    /** Remove socket from arrays of known connections and hosts */
    private handleDisconnection;
    /**
     * Try to connect to a peer using the given ip and port
     * @returns {Promise<void>} Returns a Promise that is resolved if
     * the connection was successfully established or rejected otherwise
    */
    connect: (host: string, port: number, timeoutInSeconds?: number) => Promise<void>;
    /** Receives the network information from another peer */
    private receiveNetworkInformation;
    /** Receive the name of a peer and the presentation with the port it is listening on */
    private receivePresentation;
    /** Send the network information to the client peer */
    private sendNetworkInformation;
    private destroySocket;
    /** Send this peer's server name and port to another peer */
    private sendPresentation;
    /** Send data to a single peer */
    sendData: (socket: net.Socket, data: PeerData) => void;
    /** Send data to all known peers (this one is not included) */
    broadcast: (type: string, content: any) => void;
    private listenClientData;
    private addSocketListeners;
    /** Checks if the name passed is being used by some known host */
    private isNameUsed;
    /** The given callback is called when the peer connects to everyone on the network  */
    onEnterNetwork(callback: EnterNetworkCallback): void;
    /** The given callback is called every time this peer receives a connection */
    onReceiveConnection(callback: ReceiveConnectionCallback): void;
    /** The given callback is called every time a peer disconnects from the network */
    onDisconnect(callback: DisconnectCallback): void;
    /** The given callback is called every time some data is transmitted to this peer */
    onData(callback: DataCallback): void;
}
//# sourceMappingURL=Peer.d.ts.map