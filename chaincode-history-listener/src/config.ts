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

import * as env from 'env-var';


export const ORG = env
    .get('HLF_ORG_ID')
    .default(`Org1`)
    .example(`Org1`)
    .asString();

export const peerEndopint = env
    .get('HLF_PEER_ENDPOINT')
    .default(`org1-peer-gateway-svc:7051`)
    .example(`org1-peer-gateway-svc:7051`)
    .asString();
/**
 * The Org MSP ID
 */
export const mspIdOrg = env
    .get('HLF_MSP_ID_ORG')
    .default(`${ORG}MSP`)
    .example(`${ORG}MSP`)
    .asString();

/**
 * Name of the channel which the basic asset sample chaincode has been installed on
 */
export const channelName = env
    .get('HLF_CHANNEL_NAME')
    .default('mychannel')
    .example('mychannel')
    .asString();

/**
 * Name used to install the basic asset sample
 */
export const chaincodeName = env
    .get('HLF_CHAINCODE_NAME')
    .default('basic')
    .example('basic')
    .asString();

/**
 * Certificate for an Org1 identity to evaluate and submit transactions
 */
export const certificateOrg = env
    .get('HLF_CERTIFICATE_ORG')
    .required()
    .example('"-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----\\n"')
    .asString();

export const rootCertificateOrg = env
    .get('HLF_ROOT_CERTIFICATE_ORG')
    .required()
    .example('"-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----\\n"')
    .asString();

/**
 * Private key for an Org1 identity to evaluate and submit transactions
 */
export const privateKeyOrg = env
    .get('HLF_PRIVATE_KEY_ORG')
    .required()
    .example('"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"')
    .asString();
