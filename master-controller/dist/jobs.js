"use strict";
/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * This sample uses BullMQ jobs to process submit transactions, which includes
 * retry support for failing jobs
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobCounts = exports.getJobSummary = exports.updateJobData = exports.addSubmitTransactionJob = exports.initJobQueueScheduler = exports.processSubmitTransactionJob = exports.initJobQueueWorker = exports.initJobQueue = exports.JobNotFoundError = void 0;
var bullmq_1 = require("bullmq");
var config = __importStar(require("./config"));
var errors_1 = require("./errors");
var fabric_1 = require("./fabric");
var logger_1 = require("./logger");
var JobNotFoundError = /** @class */ (function (_super) {
    __extends(JobNotFoundError, _super);
    function JobNotFoundError(message, jobId) {
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, JobNotFoundError.prototype);
        _this.name = 'JobNotFoundError';
        _this.jobId = jobId;
        return _this;
    }
    return JobNotFoundError;
}(Error));
exports.JobNotFoundError = JobNotFoundError;
var connection = {
    port: config.redisPort,
    host: config.redisHost,
    username: config.redisUsername,
    password: config.redisPassword,
};
/**
 * Set up the queue for submit jobs
 */
var initJobQueue = function () {
    var submitQueue = new bullmq_1.Queue(config.JOB_QUEUE_NAME, {
        connection: connection,
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
    return submitQueue;
};
exports.initJobQueue = initJobQueue;
/**
 * Set up a worker to process submit jobs on the queue, using the
 * processSubmitTransactionJob function below
 */
var initJobQueueWorker = function (app) {
    var worker = new bullmq_1.Worker(config.JOB_QUEUE_NAME, function (job) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.processSubmitTransactionJob)(app, job)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); }, { connection: connection, concurrency: config.submitJobConcurrency });
    worker.on('failed', function (job) {
        logger_1.logger.warn({ job: job }, 'Job failed');
    });
    // Important: need to handle this error otherwise worker may stop
    // processing jobs
    worker.on('error', function (err) {
        logger_1.logger.error({ err: err }, 'Worker error');
    });
    if (logger_1.logger.isLevelEnabled('debug')) {
        worker.on('completed', function (job) {
            logger_1.logger.debug({ job: job }, 'Job completed');
        });
    }
    return worker;
};
exports.initJobQueueWorker = initJobQueueWorker;
/**
 * Process a submit transaction request from the job queue
 *
 * The job will be retried if this function throws an error
 */
var processSubmitTransactionJob = function (app, job) { return __awaiter(void 0, void 0, void 0, function () {
    var contract, args, transaction, savedState, payload, err_1, retryAction;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                logger_1.logger.debug({ jobId: job.id, jobName: job.name }, 'Processing job');
                contract = (_a = app.locals[job.data.mspid]) === null || _a === void 0 ? void 0 : _a.assetContract;
                if (contract === undefined) {
                    logger_1.logger.error({ jobId: job.id, jobName: job.name }, 'Contract not found for MSP ID %s', job.data.mspid);
                    // Retrying will never work without a contract, so give up with an
                    // empty job result
                    return [2 /*return*/, {
                            transactionError: undefined,
                            transactionPayload: undefined,
                        }];
                }
                args = job.data.transactionArgs;
                if (!job.data.transactionState) return [3 /*break*/, 1];
                savedState = job.data.transactionState;
                logger_1.logger.debug({
                    jobId: job.id,
                    jobName: job.name,
                    savedState: savedState,
                }, 'Reusing previously saved transaction state');
                transaction = contract.deserializeTransaction(savedState);
                return [3 /*break*/, 3];
            case 1:
                logger_1.logger.debug({
                    jobId: job.id,
                    jobName: job.name,
                }, 'Using new transaction');
                transaction = contract.createTransaction(job.data.transactionName);
                return [4 /*yield*/, (0, exports.updateJobData)(job, transaction)];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                logger_1.logger.debug({
                    jobId: job.id,
                    jobName: job.name,
                    transactionId: transaction.getTransactionId(),
                }, 'Submitting transaction');
                _b.label = 4;
            case 4:
                _b.trys.push([4, 6, , 9]);
                return [4 /*yield*/, fabric_1.submitTransaction.apply(void 0, __spreadArray([transaction], args, false))];
            case 5:
                payload = _b.sent();
                return [2 /*return*/, {
                        transactionError: undefined,
                        transactionPayload: payload,
                    }];
            case 6:
                err_1 = _b.sent();
                retryAction = (0, errors_1.getRetryAction)(err_1);
                if (retryAction === errors_1.RetryAction.None) {
                    logger_1.logger.error({ jobId: job.id, jobName: job.name, err: err_1 }, 'Fatal transaction error occurred');
                    // Not retriable so return a job result with the error details
                    return [2 /*return*/, {
                            transactionError: "".concat(err_1),
                            transactionPayload: undefined,
                        }];
                }
                logger_1.logger.warn({ jobId: job.id, jobName: job.name, err: err_1 }, 'Retryable transaction error occurred');
                if (!(retryAction === errors_1.RetryAction.WithNewTransactionId)) return [3 /*break*/, 8];
                logger_1.logger.debug({ jobId: job.id, jobName: job.name }, 'Clearing saved transaction state');
                return [4 /*yield*/, (0, exports.updateJobData)(job, undefined)];
            case 7:
                _b.sent();
                _b.label = 8;
            case 8: 
            // Rethrow the error to keep retrying
            throw err_1;
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.processSubmitTransactionJob = processSubmitTransactionJob;
/**
 * Set up a scheduler for the submit job queue
 *
 * This manages stalled and delayed jobs and is required for retries with backoff
 */
var initJobQueueScheduler = function () {
    var queueScheduler = new bullmq_1.QueueScheduler(config.JOB_QUEUE_NAME, {
        connection: connection,
    });
    queueScheduler.on('failed', function (jobId, failedReason) {
        logger_1.logger.error({ jobId: jobId, failedReason: failedReason }, 'Queue sceduler failure');
    });
    return queueScheduler;
};
exports.initJobQueueScheduler = initJobQueueScheduler;
/**
 * Helper to add a new submit transaction job to the queue
 */
var addSubmitTransactionJob = function (submitQueue, mspid, transactionName) {
    var transactionArgs = [];
    for (var _i = 3; _i < arguments.length; _i++) {
        transactionArgs[_i - 3] = arguments[_i];
    }
    return __awaiter(void 0, void 0, void 0, function () {
        var jobName, job;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jobName = "submit ".concat(transactionName, " transaction");
                    return [4 /*yield*/, submitQueue.add(jobName, {
                            mspid: mspid,
                            transactionName: transactionName,
                            transactionArgs: transactionArgs,
                            transactionIds: [],
                        })];
                case 1:
                    job = _a.sent();
                    if ((job === null || job === void 0 ? void 0 : job.id) === undefined) {
                        throw new Error('Submit transaction job ID not available');
                    }
                    return [2 /*return*/, job.id];
            }
        });
    });
};
exports.addSubmitTransactionJob = addSubmitTransactionJob;
/**
 * Helper to update the data for an existing job
 */
var updateJobData = function (job, transaction) { return __awaiter(void 0, void 0, void 0, function () {
    var newData, transationIds;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                newData = __assign({}, job.data);
                if (transaction != undefined) {
                    transationIds = [].concat(newData.transactionIds, transaction.getTransactionId());
                    newData.transactionIds = transationIds;
                    newData.transactionState = transaction.serialize();
                }
                else {
                    newData.transactionState = undefined;
                }
                return [4 /*yield*/, job.update(newData)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.updateJobData = updateJobData;
/**
 * Gets a job summary
 *
 * This function is used for the jobs REST endpoint
 */
var getJobSummary = function (queue, jobId) { return __awaiter(void 0, void 0, void 0, function () {
    var job, transactionIds, transactionError, transactionPayload, returnValue, jobSummary;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, queue.getJob(jobId)];
            case 1:
                job = _a.sent();
                logger_1.logger.debug({ job: job }, 'Got job');
                if (!(job && job.id != undefined)) {
                    throw new JobNotFoundError("Job ".concat(jobId, " not found"), jobId);
                }
                if (job.data && job.data.transactionIds) {
                    transactionIds = job.data.transactionIds;
                }
                else {
                    transactionIds = [];
                }
                returnValue = job.returnvalue;
                if (returnValue) {
                    if (returnValue.transactionError) {
                        transactionError = returnValue.transactionError;
                    }
                    if (returnValue.transactionPayload &&
                        returnValue.transactionPayload.length > 0) {
                        transactionPayload = returnValue.transactionPayload.toString();
                    }
                    else {
                        transactionPayload = '';
                    }
                }
                jobSummary = {
                    jobId: job.id,
                    transactionIds: transactionIds,
                    transactionError: transactionError,
                    transactionPayload: transactionPayload,
                };
                return [2 /*return*/, jobSummary];
        }
    });
}); };
exports.getJobSummary = getJobSummary;
/**
 * Get the current job counts
 *
 * This function is used for the liveness REST endpoint
 */
var getJobCounts = function (queue) { return __awaiter(void 0, void 0, void 0, function () {
    var jobCounts;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, queue.getJobCounts('active', 'completed', 'delayed', 'failed', 'waiting')];
            case 1:
                jobCounts = _a.sent();
                logger_1.logger.debug({ jobCounts: jobCounts }, 'Current job counts');
                return [2 /*return*/, jobCounts];
        }
    });
}); };
exports.getJobCounts = getJobCounts;
//# sourceMappingURL=jobs.js.map