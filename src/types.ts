import { Socket } from 'net';

export type ReceiveConnectionCallback = (peerName: string, socket: Socket) => void;
export type EnterNetworkCallback = (state: any) => void;
export type DisconnectCallback = (host: Host, socket: Socket) => void;
export type DataCallback = (data: PeerData, socket: Socket) => void;

export interface Host {
  name?: string;
  ip: string;
  remotePort: number;
  mainPort: number;
}

export interface Network {
  hosts: Host[],
  state: any,
}

export interface PeerData {
  type: string;
  content: any;
}

export enum DataType {
  PRESENTATION = '@PRESENTATION',
  CONNECTION_CLOSED = '@CONNECTION_CLOSED',
  NETWORK_INFORMATION = '@NETWORK_INFORMATION',
  REQUEST_NETWORK_INFORMATION = '@REQUEST_NETWORK_INFORMATION',
}