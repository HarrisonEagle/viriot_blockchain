"use strict";
/*
 * SPDX-License-Identifier: Apache-2.0
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
var jobs_1 = require("./jobs");
var jest_mock_extended_1 = require("jest-mock-extended");
describe('addSubmitTransactionJob', function () {
    var mockJob;
    var mockQueue;
    beforeEach(function () {
        mockJob = (0, jest_mock_extended_1.mock)();
        mockQueue = (0, jest_mock_extended_1.mock)();
        mockQueue.add.mockResolvedValue(mockJob);
    });
    it('returns the new job ID', function () { return __awaiter(void 0, void 0, void 0, function () {
        var jobid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockJob.id = 'mockJobId';
                    return [4 /*yield*/, (0, jobs_1.addSubmitTransactionJob)(mockQueue, 'mockMspId', 'txn', 'arg1', 'arg2')];
                case 1:
                    jobid = _a.sent();
                    expect(jobid).toBe('mockJobId');
                    return [2 /*return*/];
            }
        });
    }); });
    it('throws an error if there is no job ID', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockJob.id = undefined;
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, jobs_1.addSubmitTransactionJob)(mockQueue, 'mockMspId', 'txn', 'arg1', 'arg2')];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrowError('Submit transaction job ID not available')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('getJobSummary', function () {
    var mockQueue;
    var mockJob;
    beforeEach(function () {
        mockQueue = (0, jest_mock_extended_1.mock)();
        mockJob = (0, jest_mock_extended_1.mock)();
    });
    it('throws a JobNotFoundError if the Job is undefined', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockQueue.getJob.calledWith('1').mockResolvedValue(undefined);
                    return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, jobs_1.getJobSummary)(mockQueue, '1')];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow(jobs_1.JobNotFoundError)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('gets a job summary with transaction payload data', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mockQueue.getJob.calledWith('1').mockResolvedValue(mockJob);
                    mockJob.id = '1';
                    mockJob.data = {
                        transactionIds: ['txn1'],
                    };
                    mockJob.returnvalue = {
                        transactionPayload: Buffer.from('MOCK PAYLOAD'),
                    };
                    _a = expect;
                    return [4 /*yield*/, (0, jobs_1.getJobSummary)(mockQueue, '1')];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toStrictEqual({
                        jobId: '1',
                        transactionIds: ['txn1'],
                        transactionError: undefined,
                        transactionPayload: 'MOCK PAYLOAD',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('gets a job summary with empty transaction payload data', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mockQueue.getJob.calledWith('1').mockResolvedValue(mockJob);
                    mockJob.id = '1';
                    mockJob.data = {
                        transactionIds: ['txn1'],
                    };
                    mockJob.returnvalue = {
                        transactionPayload: Buffer.from(''),
                    };
                    _a = expect;
                    return [4 /*yield*/, (0, jobs_1.getJobSummary)(mockQueue, '1')];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toStrictEqual({
                        jobId: '1',
                        transactionIds: ['txn1'],
                        transactionError: undefined,
                        transactionPayload: '',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('gets a job summary with a transaction error', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mockQueue.getJob.calledWith('1').mockResolvedValue(mockJob);
                    mockJob.id = '1';
                    mockJob.data = {
                        transactionIds: ['txn1'],
                    };
                    mockJob.returnvalue = {
                        transactionError: 'MOCK ERROR',
                    };
                    _a = expect;
                    return [4 /*yield*/, (0, jobs_1.getJobSummary)(mockQueue, '1')];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toStrictEqual({
                        jobId: '1',
                        transactionIds: ['txn1'],
                        transactionError: 'MOCK ERROR',
                        transactionPayload: '',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('gets a job summary when there is no return value', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mockQueue.getJob.calledWith('1').mockResolvedValue(mockJob);
                    mockJob.id = '1';
                    mockJob.returnvalue = undefined;
                    mockJob.data = {
                        transactionIds: ['txn1'],
                    };
                    _a = expect;
                    return [4 /*yield*/, (0, jobs_1.getJobSummary)(mockQueue, '1')];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toStrictEqual({
                        jobId: '1',
                        transactionIds: ['txn1'],
                        transactionError: undefined,
                        transactionPayload: undefined,
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('gets a job summary when there is no job data', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mockQueue.getJob.calledWith('1').mockResolvedValue(mockJob);
                    mockJob.id = '1';
                    mockJob.data = undefined;
                    mockJob.returnvalue = {
                        transactionPayload: Buffer.from('MOCK PAYLOAD'),
                    };
                    _a = expect;
                    return [4 /*yield*/, (0, jobs_1.getJobSummary)(mockQueue, '1')];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toStrictEqual({
                        jobId: '1',
                        transactionIds: [],
                        transactionError: undefined,
                        transactionPayload: 'MOCK PAYLOAD',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('updateJobData', function () {
    var mockJob;
    beforeEach(function () {
        mockJob = (0, jest_mock_extended_1.mock)();
        mockJob.data = {
            transactionIds: ['txn1'],
        };
    });
    it('stores the serialized state in the job data if a transaction is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockSavedState, mockTransaction;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockSavedState = Buffer.from('MOCK SAVED STATE');
                    mockTransaction = (0, jest_mock_extended_1.mock)();
                    mockTransaction.getTransactionId.mockReturnValue('txn2');
                    mockTransaction.serialize.mockReturnValue(mockSavedState);
                    return [4 /*yield*/, (0, jobs_1.updateJobData)(mockJob, mockTransaction)];
                case 1:
                    _a.sent();
                    expect(mockJob.update).toBeCalledTimes(1);
                    expect(mockJob.update).toBeCalledWith({
                        transactionIds: ['txn1', 'txn2'],
                        transactionState: mockSavedState,
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('removes the serialized state from the job data if a transaction is not specified', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, jobs_1.updateJobData)(mockJob, undefined)];
                case 1:
                    _a.sent();
                    expect(mockJob.update).toBeCalledTimes(1);
                    expect(mockJob.update).toBeCalledWith({
                        transactionIds: ['txn1'],
                        transactionState: undefined,
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('getJobCounts', function () {
    it('gets job counts from the specified queue', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockQueue, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mockQueue = (0, jest_mock_extended_1.mock)();
                    mockQueue.getJobCounts
                        .calledWith('active', 'completed', 'delayed', 'failed', 'waiting')
                        .mockResolvedValue({
                        active: 1,
                        completed: 2,
                        delayed: 3,
                        failed: 4,
                        waiting: 5,
                    });
                    _a = expect;
                    return [4 /*yield*/, (0, jobs_1.getJobCounts)(mockQueue)];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toStrictEqual({
                        active: 1,
                        completed: 2,
                        delayed: 3,
                        failed: 4,
                        waiting: 5,
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    describe('processSubmitTransactionJob', function () {
        var mockContracts = new Map();
        var mockPayload = Buffer.from('MOCK PAYLOAD');
        var mockSavedState = Buffer.from('MOCK SAVED STATE');
        var mockTransaction;
        var mockContract;
        var mockApplication;
        var mockJob;
        beforeEach(function () {
            mockTransaction = (0, jest_mock_extended_1.mock)();
            mockTransaction.getTransactionId.mockReturnValue('mockTransactionId');
            mockContract = (0, jest_mock_extended_1.mock)();
            mockContract.createTransaction
                .calledWith('txn')
                .mockReturnValue(mockTransaction);
            mockContract.deserializeTransaction
                .calledWith(mockSavedState)
                .mockReturnValue(mockTransaction);
            mockContracts.set('mockMspid', mockContract);
            mockApplication = (0, jest_mock_extended_1.mock)();
            mockApplication.locals.mockMspid = { assetContract: mockContract };
            mockJob = (0, jest_mock_extended_1.mock)();
        });
        it('gets job result with no error or payload if no contract is available for the required mspid', function () { return __awaiter(void 0, void 0, void 0, function () {
            var jobResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockJob.data = {
                            mspid: 'missingMspid',
                        };
                        return [4 /*yield*/, (0, jobs_1.processSubmitTransactionJob)(mockApplication, mockJob)];
                    case 1:
                        jobResult = _a.sent();
                        expect(jobResult).toStrictEqual({
                            transactionError: undefined,
                            transactionPayload: undefined,
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('gets a job result containing a payload if the transaction was successful first time', function () { return __awaiter(void 0, void 0, void 0, function () {
            var jobResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockJob.data = {
                            mspid: 'mockMspid',
                            transactionName: 'txn',
                            transactionArgs: ['arg1', 'arg2'],
                        };
                        mockTransaction.submit
                            .calledWith('arg1', 'arg2')
                            .mockResolvedValue(mockPayload);
                        return [4 /*yield*/, (0, jobs_1.processSubmitTransactionJob)(mockApplication, mockJob)];
                    case 1:
                        jobResult = _a.sent();
                        expect(jobResult).toStrictEqual({
                            transactionError: undefined,
                            transactionPayload: Buffer.from('MOCK PAYLOAD'),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('gets a job result containing a payload if the transaction was successfully rerun using saved transaction state', function () { return __awaiter(void 0, void 0, void 0, function () {
            var jobResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockJob.data = {
                            mspid: 'mockMspid',
                            transactionName: 'txn',
                            transactionArgs: ['arg1', 'arg2'],
                            transactionState: mockSavedState,
                        };
                        mockTransaction.submit
                            .calledWith('arg1', 'arg2')
                            .mockResolvedValue(mockPayload);
                        return [4 /*yield*/, (0, jobs_1.processSubmitTransactionJob)(mockApplication, mockJob)];
                    case 1:
                        jobResult = _a.sent();
                        expect(jobResult).toStrictEqual({
                            transactionError: undefined,
                            transactionPayload: Buffer.from('MOCK PAYLOAD'),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('gets a job result containing an error message if the transaction fails but cannot be retried', function () { return __awaiter(void 0, void 0, void 0, function () {
            var jobResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockJob.data = {
                            mspid: 'mockMspid',
                            transactionName: 'txn',
                            transactionArgs: ['arg1', 'arg2'],
                            transactionState: mockSavedState,
                        };
                        mockTransaction.submit
                            .calledWith('arg1', 'arg2')
                            .mockRejectedValue(new Error('Failed to get transaction with id txn, error Entry not found in index'));
                        return [4 /*yield*/, (0, jobs_1.processSubmitTransactionJob)(mockApplication, mockJob)];
                    case 1:
                        jobResult = _a.sent();
                        expect(jobResult).toStrictEqual({
                            transactionError: 'TransactionNotFoundError: Failed to get transaction with id txn, error Entry not found in index',
                            transactionPayload: undefined,
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws an error if the transaction fails but can be retried', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockJob.data = {
                            mspid: 'mockMspid',
                            transactionName: 'txn',
                            transactionArgs: ['arg1', 'arg2'],
                            transactionState: mockSavedState,
                        };
                        mockTransaction.submit
                            .calledWith('arg1', 'arg2')
                            .mockRejectedValue(new Error('MOCK ERROR'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, jobs_1.processSubmitTransactionJob)(mockApplication, mockJob)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow('MOCK ERROR')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=jobs.spec.js.map