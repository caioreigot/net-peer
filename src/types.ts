import { Socket } from 'net';

export type ReceiveConnectionCallback = (peerName: string, socket: Socket) => void;
export type DisconnectCallback = (host: Host, socket: Socket) => void;
export type DataCallback = (data: PeerData, socket: Socket) => void;

export interface Host {
  name: string;
  ip: string;
  remotePort: number;
  mainPort: number;
}

export interface PeerData {
  type: string;
  content: any;
}

export interface SignedPeerData extends PeerData {
  senderName: string;
}

export enum DataType {
  PEER_INTRODUCTION = '@PEER_INTRODUCTION',
  CLOSED_CONNECTION = '@CLOSED_CONNECTION',
  KNOWN_HOSTS = '@KNOWN_HOSTS',
  STATE = '@STATE',
}