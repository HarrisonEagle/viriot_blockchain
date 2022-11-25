"use strict";
/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newSigner = exports.newIdentity = exports.newGrpcConnection = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const fabric_gateway_1 = require("@hyperledger/fabric-gateway");
const crypto = __importStar(require("crypto"));
const config_1 = require("./config");
async function newGrpcConnection() {
    const tlsCredentials = grpc.credentials.createSsl(Buffer.from(config_1.rootCertificateOrg));
    return new grpc.Client(config_1.peerEndopint, tlsCredentials);
}
exports.newGrpcConnection = newGrpcConnection;
async function newIdentity() {
    const credentials = Buffer.from(config_1.certificateOrg);
    return { mspId: config_1.mspIdOrg, credentials }; //certificateOrg
}
exports.newIdentity = newIdentity;
async function newSigner() {
    const privateKey = crypto.createPrivateKey(config_1.privateKeyOrg);
    return fabric_gateway_1.signers.newPrivateKeySigner(privateKey); // privateKeyOrg
}
exports.newSigner = newSigner;
//# sourceMappingURL=connect.js.map