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

export const JOB_QUEUE_NAME = 'submit';


export const ORG = env
  .get('HLF_ORG_ID')
  .default(`Org1`)
  .example(`Org1`)
  .asString();

export const CA = env
  .get('HLF_ORG_CA')
  .default(`org1-ca`)
  .example(`org1-ca`)
  .asString();

/**
 * Log level for the REST server
 */
export const logLevel = env
  .get('LOG_LEVEL')
  .default('info')
  .asEnum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

export const defaultDeployZone = env
    .get('DEFAULT_VIRIOT_ZONE')
    .default(`Japan`)
    .example(`Japan`)
    .asString();

/**
 * The port to start the REST server on
 */
export const port = env
  .get('PORT')
  .default('3000')
  .example('3000')
  .asPortNumber();

/**
 * The type of backoff to use for retrying failed submit jobs
 */
export const submitJobBackoffType = env
  .get('SUBMIT_JOB_BACKOFF_TYPE')
  .default('fixed')
  .asEnum(['fixed', 'exponential']);

/**
 * Backoff delay for retrying failed submit jobs in milliseconds
 */
export const submitJobBackoffDelay = env
  .get('SUBMIT_JOB_BACKOFF_DELAY')
  .default('3000')
  .example('3000')
  .asIntPositive();

/**
 * The total number of attempts to try a submit job until it completes
 */
export const submitJobAttempts = env
  .get('SUBMIT_JOB_ATTEMPTS')
  .default('5')
  .example('5')
  .asIntPositive();

/**
 * The maximum number of submit jobs that can be processed in parallel
 */
export const submitJobConcurrency = env
  .get('SUBMIT_JOB_CONCURRENCY')
  .default('5')
  .example('5')
  .asIntPositive();

/**
 * The number of completed submit jobs to keep
 */
export const maxCompletedSubmitJobs = env
  .get('MAX_COMPLETED_SUBMIT_JOBS')
  .default('1000')
  .example('1000')
  .asIntPositive();

/**
 * The number of failed submit jobs to keep
 */
export const maxFailedSubmitJobs = env
  .get('MAX_FAILED_SUBMIT_JOBS')
  .default('1000')
  .example('1000')
  .asIntPositive();

/**
 * Whether to initialise a scheduler for the submit job queue
 * There must be at least on queue scheduler to handle retries and you may want
 * more than one for redundancy
 */
export const submitJobQueueScheduler = env
  .get('SUBMIT_JOB_QUEUE_SCHEDULER')
  .default('true')
  .example('true')
  .asBoolStrict();

/**
 * Whether to convert discovered host addresses to be 'localhost'
 * This should be set to 'true' when running a docker composed fabric network on the
 * local system, e.g. using the test network; otherwise should it should be 'false'
 */
export const asLocalhost = env
  .get('AS_LOCAL_HOST')
  .default('false')
  .example('true')
  .asBoolStrict();

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
 * The transaction submit timeout in seconds for commit notification to complete
 */
export const commitTimeout = env
  .get('HLF_COMMIT_TIMEOUT')
  .default('300')
  .example('300')
  .asIntPositive();

/**
 * The transaction submit timeout in seconds for the endorsement to complete
 */
export const endorseTimeout = env
  .get('HLF_ENDORSE_TIMEOUT')
  .default('30')
  .example('30')
  .asIntPositive();

/**
 * The transaction query timeout in seconds
 */
export const queryTimeout = env
  .get('HLF_QUERY_TIMEOUT')
  .default('3')
  .example('3')
  .asIntPositive();

/**
 * The Org1 connection profile JSON
 */
export const connectionProfileOrg = env
  .get('HLF_CONNECTION_PROFILE_ORG')
  .required()
  .example(
    '{"name":"test-network-org1","version":"1.0.0","client":{"organization":"Org1" ... }'
  )
  .asJsonObject() as Record<string, unknown>;

/**
 * Certificate for an Org1 identity to evaluate and submit transactions
 */
export const certificateOrg = env
  .get('HLF_CERTIFICATE_ORG')
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

/**
 * The host the Redis server is running on
 */
/**
 * The port the Redis server is running on
 */
export const redisHost = env
  .get('REDIS_HOST')
  .default('localhost')
  .example('localhost')
  .asString();

export const redisPort = env
  .get('REDIS_PORT')
  .default('6379')
  .example('6379')
  .asPortNumber();

/**
 * Username for the Redis server
 */
export const redisUsername = env
  .get('REDIS_USERNAME')
  .example('fabric')
  .asString();

/**
 * Password for the Redis server
 */
export const redisPassword = env.get('REDIS_PASSWORD').asString();

/**
 * API key for Org1
 * Specify this API key with the X-Api-Key header to use the Org1 connection profile and credentials
 */
export const orgApiKey = env
  .get('ORG_APIKEY')
  .required()
  .example('123')
  .asString();

export const orgAdminUser = env
  .get('HLF_ORG_ADMIN')
  .default(`org1admin`)
  .example(`org1admin`)
  .asString();

export const orgAdminPW = env
  .get('HLF_ORG_ADMINPW')
  .default(`org1adminpw`)
  .example(`org1adminpw`)
  .asString();

export const orgCADepartment = env
  .get('HLF_CA_DEPARTMENT')
  .default(`org1.department1`)
  .example(`org1.department1`)
  .asString();

export const orgMongoUser = env
  .get('MONGO_USERNAME')
  .default(`root`)
  .example(`root`)
  .asString();

export const orgMongoPW = env
  .get('MONGO_PASSWORD')
  .default(`example`)
  .example(`example`)
  .asString();

export const jwtSecret= env
  .get('JWT_SECRET')
  .default(`UYG867ti867f(/&$SWRUco)(YPO/T`)
  .example(`UYG867ti867f(/&$SWRUco)(YPO/T`)
  .asString();

export const workingNamespace = env
    .get('WORKING_NAMESPACE')
    .default(`viriot-network`)
    .example(`viriot-network`)
    .asString();

export const mqttDataBrokerHost = env
  .get('MQTT_DATA_BROKER_HOST')
  .default(`vernemq-org1.viriot-network.svc.cluster.local`)
  .example(`vernemq-org1.viriot-network.svc.cluster.local`)
  .asString();

export const mqttDataBrokerPort = env
  .get('MQTT_DATA_BROKER_PORT')
  .default(`1883`)
  .example(`1883`)
  .asString();

export const mqttControlBrokerSVCName = env
  .get('MQTT_CONTROL_BROKER_SVC_NAME')
  .default(`vernemq-org1`)
  .example(`vernemq-org1`)
  .asString();


export const mqttControlBrokerHost = env
  .get('MQTT_CONTROL_BROKER_HOST')
  .default(`viriot-network.svc.cluster.local`)
  .example(`viriot-network.svc.cluster.local`)
  .asString();


export const mqttControlBrokerPort = env
  .get('MQTT_CONTROL_BROKER_PORT')
  .default(`1883`)
  .example(`1883`)
  .asString();


