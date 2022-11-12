import net from 'net';
import {
  ReceiveConnectionCallback,
  EnterNetworkCallback,
  DisconnectCallback,
  DataCallback,
  DataType,
  PeerData,
  Network,
  Host,
} from './types.js';

export default class Peer {

  /** Unique peer name */
  public name: string;
  /** Port on which this peer will listen for connections */
  public port: number = 0;
  /** State that will be shared among all peers */
  public network: Network = { hosts: [], state: null };
  /** TCP server of this peer */
  private server: net.Server | null = null;
  /** Array containing all connections established by this peer */
  private connections: net.Socket[] = [];

  private onReceiveConnectionCallback: ReceiveConnectionCallback | undefined;
  private onEnterNetworkCallback: EnterNetworkCallback | undefined;
  private onDisconnectCallback: DisconnectCallback | undefined;
  private onDataCallback: DataCallback | undefined;

  constructor(name: string, state: any = {}) {
    this.name = name;
    this.network.state = state;
  }

  /** 
   * Open the server for this peer on the given port 
   * @returns {Promise<number>} Returns a Promise that resolves
   * to the port number the server is listening on or rejected
   * with Error object if an error has occurred
  */
  listen = async (port: number = 0): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      /* Causes this peer to listen for other connections ("open the server") and pass
      a second-parameter callback that is invoked whenever it receives a connection */
      this.server = net.createServer((socket: net.Socket) => {
        this.connections.push(socket);
        this.addSocketListeners(socket);
      });

      const server = this.server.listen(port, () => {
        /* The port passed as a parameter in the listen can be 0,
        which makes to generate a random and free port for the server
        listen, then this.port receives this new generated port */
        this.port = (server.address() as net.AddressInfo).port;

        console.log(`> Listening on 0.0.0.0:${this.port}`);
        resolve(this.port);
      })
        .on('error', reject);
    });
  }

  /** Remove socket from arrays of known connections and hosts */
  private handleDisconnection = (socket: net.Socket) => {
    /* Assign a new array to this.connections,
    however, without the socket that disconnected */
    this.connections = this.connections.filter(conn => {
      return conn !== socket;
    });

    this.network.hosts.forEach(host => {
      const isKnownPort = (
        host.remotePort === socket.remotePort
        || host.mainPort === socket.remotePort
      );

      if ((host.ip === socket.remoteAddress) && isKnownPort) {
        const indexToRemove = this.network.hosts.indexOf(host);
        this.network.hosts.splice(indexToRemove, 1);

        this.onDisconnectCallback?.(host, socket);
      }
    });
  }

  /** 
   * Try to connect to a peer using the given ip and port
   * @returns {Promise<void>} Returns a Promise that is resolved if
   * the connection was successfully established or rejected otherwise
  */
  connect = (
    host: string,
    port: number,
    timeoutInSeconds: number = 20,
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const connect = () => {
        const socket = net.createConnection({ port, host }, () => {
          /* If this is the first connection from this peer, it
          asks the network information for the peer server */
          if (this.network.hosts.length === 0) {
            this.sendData(socket, {
              type: DataType.REQUEST_NETWORK_INFORMATION,
              content: null,
            });
          }

          /* Add the server peer to the known hosts list 
          Note: the name is unknown, only after the server
          present that he will be assigned */
          this.network.hosts.push({
            ip: host,
            remotePort: socket.remotePort!,
            mainPort: port,
          });

          this.connections.push(socket);
          this.addSocketListeners(socket);
          this.sendPresentation(socket, this.port);

          // Removing the established timeout
          socket.setTimeout(0);

          resolve();
        })
          .on('error', reject)

        // Setting the time out for the connection attempt
        socket.setTimeout(timeoutInSeconds * 1000, () => {
          socket.destroy();
          reject(new Error('ETIMEDOUT'));
        });
      }

      /* It only connects if this peer's server is
      open (if not, open one and after that, connect) */
      this.server
        ? connect()
        : this.listen().then(connect);
    });
  }

  /** Receives the network information from another peer */
  private receiveNetworkInformation = async (networkInformation: Network) => {
    const { hosts, state } = networkInformation;

    this.network.state = state;
    
    /* It connects to all hosts on the network and only after that,
    invokes the onEnterNetwork callback if it has been provided */

    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      await this.connect(host.ip, host.mainPort);
    }

    this.onEnterNetworkCallback?.(state);
  }

  /** Receive the name of a peer and the port it is listening on */
  private receivePresentation = (
    socket: net.Socket,
    clientName: string,
    clientPort: number
  ) => {
    for (let i = 0; i < this.network.hosts.length; i++) {
      const currentHost = this.network.hosts[i];

      /* If the ip:port is already known
      && If the name is empty, it is a sign that the server
      in which this peer connected introduced himself */
      if (
        currentHost.ip == socket.remoteAddress 
        && currentHost.mainPort === clientPort
        && !currentHost.name
      ) {
        currentHost.name = clientName;

        /* Return as the server is already known and
        this peer has already configured its listeners */
        return;
      }
    }

    // If the name is being used within the network, it won't let you connect
    if (this.isNameUsed(clientName)) {
      this.sendData(socket, {
        type: DataType.CONNECTION_CLOSED,
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
      ip: socket.remoteAddress!,
      remotePort: socket.remotePort!,
      mainPort: clientPort
    });
  }

  /** Send the network state to the client peer */
  private sendNetworkInformation(
    socket: net.Socket,
    network: Network,
  ) {
    this.sendData(socket, {
      type: DataType.NETWORK_INFORMATION,
      content: { network },
    });
  }

  private destroySocket(socket: net.Socket, errorMessage: string) {
    socket.destroy(new Error(errorMessage));
  }

  /** Send this peer's server name and port to another peer */
  private sendPresentation = (
    socket: net.Socket,
    port: number,
  ) => {
    this.sendData(socket, {
      type: DataType.PRESENTATION,
      content: { port },
    });
  }

  /** Send data to a single peer */
  sendData = (socket: net.Socket, data: PeerData) => {
    const signedPackage = {
      senderName: this.name,
      type: data.type,
      content: data.content,
    }

    // Concatenating with a '\n' to mark end of JSON in buffer
    const json: string = JSON.stringify(signedPackage).concat('\n');

    if (!socket.writableEnded) {
      socket.write(json);
    }
  }

  /** Send data to all known peers (this one is not included) */
  broadcast = (type: string, content: any) => {
    const dataToBroadcast: PeerData = { type, content };

    this.connections.forEach((socket) => {
      this.sendData(socket, dataToBroadcast);
    });
  }

  /* Listens to the data sent by the customer
  Note: the messages are always transmitted in
  the "PeerData" interface format in JSON */
  private listenClientData = (socket: net.Socket) => {
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
          case DataType.PRESENTATION:
            const { port } = parsedJson.content;
            const senderName = parsedJson.senderName;
            this.receivePresentation(socket, senderName, port);
            break;
          // When this peer is informed that its connection has been closed
          case DataType.CONNECTION_CLOSED:
            const { message } = parsedJson.content;
            this.destroySocket(socket, message);
            break;
          // When this peer receives information from the network
          case DataType.NETWORK_INFORMATION:
            const { network } = parsedJson.content;
            this.receiveNetworkInformation(network);
            break;
          // When this peer receives a request to send network information
          case DataType.REQUEST_NETWORK_INFORMATION:
            this.sendNetworkInformation(socket, this.network);
            break;
        }

        this.onDataCallback?.(parsedJson, socket);
      });
    });
  }

  private addSocketListeners = (socket: net.Socket) => {
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
  }

  /** Checks if the name passed is being used by some known host */
  private isNameUsed = (name: string) => {
    for (let i = 0; i < this.network.hosts.length; i++) {
      if (this.network.hosts[i].name === name) {
        return true;
      }
    }

    // Lastly, if the name is not the same as this peer, then return false
    return name === this.name;
  }

  /** The given callback is called every time this peer receives a connection */
  onReceiveConnection(callback: ReceiveConnectionCallback) {
    this.onReceiveConnectionCallback = callback;
  }

  /** The given callback is called every time this peer updates its own state */
  onEnterNetwork(callback: EnterNetworkCallback) {
    this.onEnterNetworkCallback = callback;
  }

  /** The given callback is called every time a peer disconnects from the network */
  onDisconnect(callback: DisconnectCallback) {
    this.onDisconnectCallback = callback;
  }

  /** The given callback is called every time some data is transmitted to this peer */
  onData(callback: DataCallback) {
    this.onDataCallback = callback;
  }
}