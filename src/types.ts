import { Socket } from 'net';

export type ReceiveConnectionCallback = (peerName: string, socket: Socket) => void;
export type ReceiveStateCallback = (data: PeerData) => void;
export type DisconnectCallback = (host: Host, socket: Socket) => void;
export type DataCallback = (data: PeerData, socket: Socket) => void;

export interface Host {
  name: string,
  ip: string,
  portImConnected: number,
  serverPort: number
}

export interface PeerData {
  type: string,
  senderName: string,
  content: any
}

export enum DataType {
  PEER_INTRODUCTION = 'INTERNAL_PEER_INTRODUCTION',
  CLOSED_CONNECTION = 'INTERNAL_CLOSED_CONNECTION',
  KNOWN_HOSTS = 'INTERNAL_KNOWN_HOSTS',
  STATE = 'INTERNAL_STATE'
}