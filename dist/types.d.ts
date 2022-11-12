/// <reference types="node" />
import { Socket } from 'net';
export declare type ReceiveConnectionCallback = (peerName: string, socket: Socket) => void;
export declare type EnterNetworkCallback = (state: any) => void;
export declare type DisconnectCallback = (host: Host, socket: Socket) => void;
export declare type DataCallback = (data: PeerData, socket: Socket) => void;
export interface Host {
    name?: string;
    ip: string;
    remotePort: number;
    mainPort: number;
}
export interface Network {
    hosts: Host[];
    state: any;
}
export interface PeerData {
    type: string;
    content: any;
}
export declare enum DataType {
    PRESENTATION = "@PRESENTATION",
    CONNECTION_CLOSED = "@CONNECTION_CLOSED",
    NETWORK_INFORMATION = "@NETWORK_INFORMATION",
    REQUEST_NETWORK_INFORMATION = "@REQUEST_NETWORK_INFORMATION"
}
//# sourceMappingURL=types.d.ts.map