import { ConnectionOptions, Job, Queue, QueueScheduler, Worker } from "bullmq";
import { Application } from "express";
import { Transaction } from "fabric-network";
import * as config from "./config";
import { logger } from "./logger";
import { v4 as uuidv4 } from "uuid";
import { createThingVisorOnKubernetes } from "./thingvisor";
import {onMessageCreateVThing} from "./mqttcallback";

export type JobData = {
  command: string;
  userID: string;
  reqBody: any;
};

export type JobResult = {
  transactionPayload?: Buffer;
  transactionError?: string;
};

const connection: ConnectionOptions = {
  port: config.redisPort,
  host: config.redisHost,
  username: config.redisUsername,
  password: config.redisPassword,
};

/**
 * Set up the queue for submit jobs
 */
export const initJobQueue = (): Queue => {
  return new Queue(config.JOB_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: config.submitJobAttempts,
      backoff: {
        type: config.submitJobBackoffType,
        delay: config.submitJobBackoffDelay,
      },
      removeOnComplete: config.maxCompletedSubmitJobs,
      removeOnFail: config.maxFailedSubmitJobs,
    },
  });
};

/**
 * Set up a worker to process submit jobs on the queue, using the
 * processSubmitTransactionJob function below
 */
export const initJobQueueWorker = (app: Application): Worker => {
  const worker = new Worker<JobData>(
    config.JOB_QUEUE_NAME,
    async job => {
      await processBackgroundJob(app, job);
    },
    { connection, concurrency: config.submitJobConcurrency }
  );

  worker.on('failed', (job) => {
    logger.warn({ job }, 'Job failed');
  });

  // Important: need to handle this error otherwise worker may stop
  // processing jobs
  worker.on('error', (err) => {
    logger.error({ err }, 'Worker error');
  });

  if (logger.isLevelEnabled('debug')) {
    worker.on('completed', (job) => {
      logger.debug({ job }, 'Job completed');
    });
  }

  return worker;
};

/**
 * Process a submit transaction request from the job queue
 *
 * The job will be retried if this function throws an error
 */
export const processBackgroundJob = async (
  app: Application,
  job: Job<JobData, JobResult>
) => {
  logger.debug({ jobId: job.id, jobName: job.name }, 'Processing job');
  if(job.data.command == "create_thingvisor"){
    await createThingVisorOnKubernetes(
      job.data.reqBody.debug_mode === "true",
      job.data.reqBody.thingVisorID,
      JSON.stringify(job.data.reqBody.params),
      job.data.reqBody.description,
      job.data.reqBody.yamlFiles,
      job.data.reqBody.tvZone,
        job.data.userID,
    );
  }else if(job.data.command == "create_thingvisor_vthing"){
    await onMessageCreateVThing(job.data.reqBody);
  }
  /*
  try {
    const payload = await submitTransaction(transaction, ...args);

    return {
      transactionError: undefined,
      transactionPayload: payload,
    };
  } catch (err) {
    const retryAction = getRetryAction(err);

    if (retryAction === RetryAction.None) {
      logger.error(
        { jobId: job.id, jobName: job.name, err },
        'Fatal transaction error occurred'
      );

      // Not retriable so return a job result with the error details
      return {
        transactionError: `${err}`,
        transactionPayload: undefined,
      };
    }

    logger.warn(
      { jobId: job.id, jobName: job.name, err },
      'Retryable transaction error occurred'
    );

    if (retryAction === RetryAction.WithNewTransactionId) {
      logger.debug(
        { jobId: job.id, jobName: job.name },
        'Clearing saved transaction state'
      );
      await updateJobData(job, undefined);
    }

    // Rethrow the error to keep retrying
    throw err;
  }
   */
};

/**
 * Set up a scheduler for the submit job queue
 *
 * This manages stalled and delayed jobs and is required for retries with backoff
 */
export const initJobQueueScheduler = (): QueueScheduler => {
  const queueScheduler = new QueueScheduler(config.JOB_QUEUE_NAME, {
    connection,
  });

  queueScheduler.on('failed', (jobId, failedReason) => {
    logger.error({ jobId, failedReason }, 'Queue sceduler failure');
  });

  return queueScheduler;
};

/**
 * Helper to add a new submit transaction job to the queue
 */
export const addBackgroundJob = async (
  submitQueue: Queue<JobData, JobResult>,
  command: string,
  userID: string,
  reqBody: any,
): Promise<string> => {
  const jobName = `job${uuidv4()}`;
  const job = await submitQueue.add(jobName, {
    command: command,
    userID: userID,
    reqBody: reqBody
  });

  logger.debug("Added Background Job to Queye");

  if (job?.id === undefined) {
    throw new Error('Submit transaction job ID not available');
  }

  return job.id;
};

/**
 * Helper to update the data for an existing job
 */
export const updateJobData = async (
  job: Job<JobData, JobResult>,
  transaction: Transaction | undefined
): Promise<void> => {
  const newData = { ...job.data };
  newData.command = "";
  await job.update(newData);
};
