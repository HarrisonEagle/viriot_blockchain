"use strict";
/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The sample REST server can be configured using the environment variables
 * documented below
 *
 * In a local development environment, these variables can be loaded from a
 * .env file by starting the server with the following command:
 *
 *   npm start:dev
 *
 * The scripts/generateEnv.sh script can be used to generate a suitable .env
 * file for the Fabric Test Network
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
exports.privateKeyOrg = exports.rootCertificateOrg = exports.certificateOrg = exports.chaincodeName = exports.channelName = exports.mspIdOrg = exports.peerEndopint = exports.ORG = void 0;
const env = __importStar(require("env-var"));
exports.ORG = env
    .get('HLF_ORG_ID')
    .default(`Org1`)
    .example(`Org1`)
    .asString();
exports.peerEndopint = env
    .get('HLF_PEER_ENDPOINT')
    .default(`org1-peer-gateway-svc:7051`)
    .example(`org1-peer-gateway-svc:7051`)
    .asString();
/**
 * The Org MSP ID
 */
exports.mspIdOrg = env
    .get('HLF_MSP_ID_ORG')
    .default(`${exports.ORG}MSP`)
    .example(`${exports.ORG}MSP`)
    .asString();
/**
 * Name of the channel which the basic asset sample chaincode has been installed on
 */
exports.channelName = env
    .get('HLF_CHANNEL_NAME')
    .default('mychannel')
    .example('mychannel')
    .asString();
/**
 * Name used to install the basic asset sample
 */
exports.chaincodeName = env
    .get('HLF_CHAINCODE_NAME')
    .default('basic')
    .example('basic')
    .asString();
/**
 * Certificate for an Org1 identity to evaluate and submit transactions
 */
exports.certificateOrg = env
    .get('HLF_CERTIFICATE_ORG')
    .required()
    .example('"-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----\\n"')
    .asString();
exports.rootCertificateOrg = env
    .get('HLF_ROOT_CERTIFICATE_ORG')
    .required()
    .example('"-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----\\n"')
    .asString();
/**
 * Private key for an Org1 identity to evaluate and submit transactions
 */
exports.privateKeyOrg = env
    .get('HLF_PRIVATE_KEY_ORG')
    .required()
    .example('"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"')
    .asString();
//# sourceMappingURL=config.js.map