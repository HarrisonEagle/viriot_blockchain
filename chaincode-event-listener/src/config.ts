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

export const influxDBHost = env
    .get('INFLUXDB_HOST')
    .required()
    .default('influxdb')
    .example('influxdb')
    .asString();

export const influxDBPort = env
    .get('INFLUXDB_PORT')
    .required()
    .default('8086')
    .example('8086')
    .asPortNumber();

export const influxDBProtocol = env
    .get('INFLUXDB_PROTOCOL')
    .required()
    .default('http')
    .example('http')
    .asString();

export const influxDBName = env
    .get('INFLUXDB_DBNAME')
    .required()
    .default('monitoring')
    .example('monitoring')
    .asString();

export const influxDBMeasurement = env
    .get('INFLUXDB_MEASUREMENT')
    .required()
    .default('viriot_blockchain_history')
    .example('viriot_blockchain_history')
    .asString();

export const influxDBUserName = env
    .get('INFLUXDB_USERNAME')
    .required()
    .default('user')
    .example('user')
    .asString();

export const influxDBPassword = env
    .get('INFLUXDB_PASSWORD')
    .required()
    .default('influxdbpw')
    .example('influxdbpw')
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
