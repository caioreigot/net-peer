import net from 'net';
import {
  ReceiveConnectionCallback,
  ReceiveStateCallback,
  DisconnectCallback,
  DataCallback,
  DataType,
  SignedPeerData,
  PeerData,
  Host,
} from './types.js';

export default class Peer {

  /** State that will be shared among all peers */
  public state: any;
  /** Unique peer name */
  public name: string;
  /** Port on which this peer will listen for connections */
  public port: number = 0;
  /** TCP server of this peer */
  private server: net.Server | null = null;
  /** Array containing all connections established by this peer */
  private connections: net.Socket[] = [];
  /** Array of all hosts known to this peer */
  private knownHosts: Host[] = [];
  /** Array of tasks that will be executed in queue (first in first out) */
  private taskQueue: Promise<void>[] = [];

  private onReceiveConnectionCallback: ReceiveConnectionCallback | undefined;
  private onReceiveStateCallback: ReceiveStateCallback | undefined;
  private onDisconnectCallback: DisconnectCallback | undefined;
  private onDataCallback: DataCallback | undefined;

  constructor(name: string, state: any = {}) {
    this.name = name;
    this.state = state;
  }

  /** 
   * Open the server for this peer on the given port 
   * @returns {Promise<number>} Returns a Promise that resolves
   * to the port number the server is listening on or rejected
   * with Error object if an error has occurred
  */
  listen = async (port: number = 0): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      this.server = net.createServer((socket: net.Socket) => {
        this.addConnection(socket);
        this.addSocketListeners(socket);
        this.introduceMyselfTo(socket, this.port);
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

  private handleDisconnection = (socket: net.Socket) => {
    this.forgetConnection(socket);
  }

  /** Remove socket from arrays of known connections and hosts */
  private forgetConnection = (socket: net.Socket) => {
    /* Assign a new array to this.connections,
    however, without the socket that disconnected */
    this.connections = this.connections.filter(conn => {
      return conn !== socket;
    });

    this.knownHosts.forEach(host => {
      const isKnownPort = (
        host.remotePort === socket.remotePort
        || host.mainPort === socket.remotePort
      );

      if ((host.ip === socket.remoteAddress) && isKnownPort) {
        const indexToRemove = this.knownHosts.indexOf(host);
        this.knownHosts.splice(indexToRemove, 1);

        this.onDisconnectCallback?.(host, socket);
      }
    });
  }

  /** Send hosts known to this
  peer to the client peer */
  private sendKnownHostsTo = (
    socket: net.Socket,
    knownHosts: Host[]
  ) => {
    const data: SignedPeerData = {
      senderName: this.name,
      type: DataType.KNOWN_HOSTS,
      content: knownHosts
    };

    this.sendData(socket, data);
  }

  /** Send the state of this peer to the client peer */
  private sendStateTo = (
    socket: net.Socket,
    state: any
  ) => {
    const data: SignedPeerData = {
      senderName: this.name,
      type: DataType.STATE,
      content: state
    };

    this.sendData(socket, data);
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
          /* If the host this peer is connecting to
          is not known, then add to known array
          Note: the name is unknown, only after the server
          present that he will be assigned */
          const hostImConnected: Host = {
            name: '',
            ip: host,
            remotePort: socket.remotePort!,
            mainPort: port,
          }

          if (!this.isKnownHost(hostImConnected)) {
            this.knownHosts.push(hostImConnected);
          }

          this.addConnection(socket);
          this.addSocketListeners(socket);
          this.introduceMyselfTo(socket, this.port);

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

  private addConnection = (socket: net.Socket) => {
    this.connections.push(socket);
  }

  /** Checks if the given host is among the known hosts array */
  private isKnownHost = (host: Host) => {
    const hostFound = this.knownHosts.find((knownHost) => {
      const isKnownIp = knownHost.ip === host.ip.slice(7) || knownHost.ip === host.ip;
      const isKnownPort = knownHost.mainPort === host.mainPort;
      const isKnownName = knownHost.name === host.name;

      return (isKnownIp && isKnownPort) || isKnownName;
    });

    return hostFound !== undefined;
  }

  /** Checks if the name passed is being used by some known host */
  private isNameUsed = (name: string) => {
    for (let i = 0; i < this.knownHosts.length; i++) {
      if (this.knownHosts[i].name === name) {
        return true;
      }
    }

    // Lastly, if the name is not the same as this peer, then return false
    return name === this.name;
  }

  /** Receives known hosts from another peer */
  private receiveKnownHosts = (data: PeerData) => {
    const task = async () => {
      for (let i = 0; i < data.content.length; i++) {
        const host = data.content[i];
        // If the host is not known
        if (!this.isKnownHost(host)) {
          // Connects to the new host
          await this.connect(host.ip, host.mainPort)
          this.knownHosts.push(host);
        }
      }
    }

    const jobsQueueLength = this.taskQueue.length;
    const callAndQueue = () => this.taskQueue.push(task());

    /* If the queue is empty, call the task and queue it
    If it is not empty, wait for the last task to finish and do the same */
    jobsQueueLength === 0
      ? callAndQueue()
      : this.taskQueue[jobsQueueLength - 1]
          .then(callAndQueue);
  }

  /** Set the state received by another peer */
  private receiveState = (data: PeerData) => {
    const state = data.content;
    this.state = state;
    this.onReceiveStateCallback?.(state);
  }

  /** Receive the name of a peer and the port it is listening on */
  private receiveIntroduction = (socket: net.Socket, data: SignedPeerData) => {
    for (let i = 0; i < this.knownHosts.length; i++) {
      const currentHost = this.knownHosts[i];

      // If the port is already known
      if (currentHost.ip == socket.remoteAddress && currentHost.mainPort === data.content) {
        /* If the name is empty, it is a sign that the server
        in which this peer connected introduced himself */
        if (currentHost.name.length === 0) {
          currentHost.name = data.senderName;

          /* Return as the server is already known and
          this peer has already configured its listeners */
          return;
        }
      }
    }

    // If the name is being used within the network, it won't let you connect
    if (this.isNameUsed(data.senderName)) {
      const closedConnectionPacket: PeerData = {
        type: DataType.CLOSED_CONNECTION,
        content: 'Nickname is already being used.'
      }

      this.sendData(socket, closedConnectionPacket);
      socket.end();
      return;
    }

    /* Call the onReceiveConnection callback
    because the peer received a connection */
    this.onReceiveConnectionCallback?.(data.senderName, this.state, socket);

    /* This peer sends all hosts that knows so
    that the other peer can also connect to the
    other network peers */
    this.sendKnownHostsTo(socket, this.knownHosts);

    // Add peer to known hosts array
    this.knownHosts.push({
      name: data.senderName,
      ip: socket.remoteAddress || '',
      remotePort: socket.remotePort!,
      mainPort: data.content
    });

    // Sending the current state to the client
    this.sendStateTo(socket, this.state);
  }

  private destroySocket(socket: net.Socket, errorMessage: string) {
    socket.destroy(new Error(errorMessage));
  }

  /** Send this peer's server name and port to another peer */
  private introduceMyselfTo = (
    socket: net.Socket,
    portImListening: number
  ) => {
    const data: SignedPeerData = {
      senderName: this.name,
      type: DataType.PEER_INTRODUCTION,
      content: portImListening
    }

    this.sendData(socket, data);
  }

  /** Send data to a single peer */
  sendData = (socket: net.Socket, data: PeerData) => {
    // Concatenating with a '\n' to mark end of JSON in buffer
    const jsonData: string = JSON.stringify(data).concat('\n');

    if (!socket.writableEnded) {
      socket.write(jsonData);
    }
  }

  /** Send data to all known peers (this one is not included) */
  broadcast = (type: string, content: any) => {
    const dataToBroadcast: SignedPeerData = {
      senderName: this.name,
      type,
      content,
    }

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
      const jsonDatas = buffer
        .split(/\r?\n/)
        .filter(json => json.length !== 0);

      jsonDatas.forEach(jsonData => {
        const parsedData = JSON.parse(jsonData);

        switch (parsedData.type) {
          case DataType.STATE:
            this.receiveState(parsedData);
            break;
          case DataType.KNOWN_HOSTS:
            this.receiveKnownHosts(parsedData);
            break;
          case DataType.PEER_INTRODUCTION:
            this.receiveIntroduction(socket, parsedData);
            break;
          case DataType.CLOSED_CONNECTION:
            this.destroySocket(socket, parsedData.content);
            break;
        }

        this.onDataCallback?.(parsedData, socket);
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

  /** The given callback is called every time this peer receives a connection */
  onReceiveConnection(callback: ReceiveConnectionCallback) {
    this.onReceiveConnectionCallback = callback;
  }

  /** The given callback is called every time this peer updates its own state */
  onReceiveState(callback: ReceiveStateCallback) {
    this.onReceiveStateCallback = callback;
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