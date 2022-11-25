import * as grpc from '@grpc/grpc-js';
import { Identity, Signer } from '@hyperledger/fabric-gateway';
export declare function newGrpcConnection(): Promise<grpc.Client>;
export declare function newIdentity(): Promise<Identity>;
export declare function newSigner(): Promise<Signer>;
