/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as grpc from '@grpc/grpc-js';
import {  Identity,  Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import {certificateOrg, mspIdOrg, peerEndopint, privateKeyOrg, rootCertificateOrg} from "./config";
export async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsCredentials = grpc.credentials.createSsl(Buffer.from(rootCertificateOrg));
    return new grpc.Client(peerEndopint, tlsCredentials);
}

export async function newIdentity(): Promise<Identity> { //certificateOrg
    const credentials = Buffer.from(certificateOrg)
    return { mspId: mspIdOrg, credentials };//certificateOrg
}

export async function newSigner(): Promise<Signer> {
    const privateKey = crypto.createPrivateKey(privateKeyOrg);
    return signers.newPrivateKeySigner(privateKey); // privateKeyOrg
}
