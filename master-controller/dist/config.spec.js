"use strict";
/*
 * SPDX-License-Identifier: Apache-2.0
 */
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
/* eslint-disable @typescript-eslint/no-var-requires */
describe('Config values', function () {
    var ORIGINAL_ENV = process.env;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            jest.resetModules();
            process.env = __assign({}, ORIGINAL_ENV);
            return [2 /*return*/];
        });
    }); });
    afterAll(function () {
        process.env = __assign({}, ORIGINAL_ENV);
    });
    describe('logLevel', function () {
        it('defaults to "info"', function () {
            var config = require('./config');
            expect(config.logLevel).toBe('info');
        });
        it('can be configured using the "LOG_LEVEL" environment variable', function () {
            process.env.LOG_LEVEL = 'debug';
            var config = require('./config');
            expect(config.logLevel).toBe('debug');
        });
        it('throws an error when the "LOG_LEVEL" environment variable has an invalid log level', function () {
            process.env.LOG_LEVEL = 'ludicrous';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "LOG_LEVEL" should be one of [fatal, error, warn, info, debug, trace, silent]');
        });
    });
    describe('port', function () {
        it('defaults to "3000"', function () {
            var config = require('./config');
            expect(config.port).toBe(3000);
        });
        it('can be configured using the "PORT" environment variable', function () {
            process.env.PORT = '8000';
            var config = require('./config');
            expect(config.port).toBe(8000);
        });
        it('throws an error when the "PORT" environment variable has an invalid port number', function () {
            process.env.PORT = '65536';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "PORT" cannot assign a port number greater than 65535. An example of a valid value would be: 3000');
        });
    });
    describe('submitJobBackoffType', function () {
        it('defaults to "fixed"', function () {
            var config = require('./config');
            expect(config.submitJobBackoffType).toBe('fixed');
        });
        it('can be configured using the "SUBMIT_JOB_BACKOFF_TYPE" environment variable', function () {
            process.env.SUBMIT_JOB_BACKOFF_TYPE = 'exponential';
            var config = require('./config');
            expect(config.submitJobBackoffType).toBe('exponential');
        });
        it('throws an error when the "LOG_LEVEL" environment variable has an invalid log level', function () {
            process.env.SUBMIT_JOB_BACKOFF_TYPE = 'jitter';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "SUBMIT_JOB_BACKOFF_TYPE" should be one of [fixed, exponential]');
        });
    });
    describe('submitJobBackoffDelay', function () {
        it('defaults to "3000"', function () {
            var config = require('./config');
            expect(config.submitJobBackoffDelay).toBe(3000);
        });
        it('can be configured using the "SUBMIT_JOB_BACKOFF_DELAY" environment variable', function () {
            process.env.SUBMIT_JOB_BACKOFF_DELAY = '9999';
            var config = require('./config');
            expect(config.submitJobBackoffDelay).toBe(9999);
        });
        it('throws an error when the "SUBMIT_JOB_BACKOFF_DELAY" environment variable has an invalid number', function () {
            process.env.SUBMIT_JOB_BACKOFF_DELAY = 'short';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "SUBMIT_JOB_BACKOFF_DELAY" should be a valid integer. An example of a valid value would be: 3000');
        });
    });
    describe('submitJobAttempts', function () {
        it('defaults to "5"', function () {
            var config = require('./config');
            expect(config.submitJobAttempts).toBe(5);
        });
        it('can be configured using the "SUBMIT_JOB_ATTEMPTS" environment variable', function () {
            process.env.SUBMIT_JOB_ATTEMPTS = '9999';
            var config = require('./config');
            expect(config.submitJobAttempts).toBe(9999);
        });
        it('throws an error when the "SUBMIT_JOB_ATTEMPTS" environment variable has an invalid number', function () {
            process.env.SUBMIT_JOB_ATTEMPTS = 'lots';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "SUBMIT_JOB_ATTEMPTS" should be a valid integer. An example of a valid value would be: 5');
        });
    });
    describe('submitJobConcurrency', function () {
        it('defaults to "5"', function () {
            var config = require('./config');
            expect(config.submitJobConcurrency).toBe(5);
        });
        it('can be configured using the "SUBMIT_JOB_CONCURRENCY" environment variable', function () {
            process.env.SUBMIT_JOB_CONCURRENCY = '9999';
            var config = require('./config');
            expect(config.submitJobConcurrency).toBe(9999);
        });
        it('throws an error when the "SUBMIT_JOB_CONCURRENCY" environment variable has an invalid number', function () {
            process.env.SUBMIT_JOB_CONCURRENCY = 'lots';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "SUBMIT_JOB_CONCURRENCY" should be a valid integer. An example of a valid value would be: 5');
        });
    });
    describe('maxCompletedSubmitJobs', function () {
        it('defaults to "1000"', function () {
            var config = require('./config');
            expect(config.maxCompletedSubmitJobs).toBe(1000);
        });
        it('can be configured using the "MAX_COMPLETED_SUBMIT_JOBS" environment variable', function () {
            process.env.MAX_COMPLETED_SUBMIT_JOBS = '9999';
            var config = require('./config');
            expect(config.maxCompletedSubmitJobs).toBe(9999);
        });
        it('throws an error when the "MAX_COMPLETED_SUBMIT_JOBS" environment variable has an invalid number', function () {
            process.env.MAX_COMPLETED_SUBMIT_JOBS = 'lots';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "MAX_COMPLETED_SUBMIT_JOBS" should be a valid integer. An example of a valid value would be: 1000');
        });
    });
    describe('maxFailedSubmitJobs', function () {
        it('defaults to "1000"', function () {
            var config = require('./config');
            expect(config.maxFailedSubmitJobs).toBe(1000);
        });
        it('can be configured using the "MAX_FAILED_SUBMIT_JOBS" environment variable', function () {
            process.env.MAX_FAILED_SUBMIT_JOBS = '9999';
            var config = require('./config');
            expect(config.maxFailedSubmitJobs).toBe(9999);
        });
        it('throws an error when the "MAX_FAILED_SUBMIT_JOBS" environment variable has an invalid number', function () {
            process.env.MAX_FAILED_SUBMIT_JOBS = 'lots';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "MAX_FAILED_SUBMIT_JOBS" should be a valid integer. An example of a valid value would be: 1000');
        });
    });
    describe('submitJobQueueScheduler', function () {
        it('defaults to "true"', function () {
            var config = require('./config');
            expect(config.submitJobQueueScheduler).toBe(true);
        });
        it('can be configured using the "SUBMIT_JOB_QUEUE_SCHEDULER" environment variable', function () {
            process.env.SUBMIT_JOB_QUEUE_SCHEDULER = 'false';
            var config = require('./config');
            expect(config.submitJobQueueScheduler).toBe(false);
        });
        it('throws an error when the "SUBMIT_JOB_QUEUE_SCHEDULER" environment variable has an invalid boolean value', function () {
            process.env.SUBMIT_JOB_QUEUE_SCHEDULER = '11';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "SUBMIT_JOB_QUEUE_SCHEDULER" should be either "true", "false", "TRUE", or "FALSE". An example of a valid value would be: true');
        });
    });
    describe('asLocalhost', function () {
        it('defaults to "true"', function () {
            var config = require('./config');
            expect(config.asLocalhost).toBe(true);
        });
        it('can be configured using the "AS_LOCAL_HOST" environment variable', function () {
            process.env.AS_LOCAL_HOST = 'false';
            var config = require('./config');
            expect(config.asLocalhost).toBe(false);
        });
        it('throws an error when the "AS_LOCAL_HOST" environment variable has an invalid boolean value', function () {
            process.env.AS_LOCAL_HOST = '11';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "AS_LOCAL_HOST" should be either "true", "false", "TRUE", or "FALSE". An example of a valid value would be: true');
        });
    });
    describe('mspIdOrg1', function () {
        it('defaults to "Org1MSP"', function () {
            var config = require('./config');
            expect(config.mspIdOrg1).toBe('Org1MSP');
        });
        it('can be configured using the "HLF_MSP_ID_ORG1" environment variable', function () {
            process.env.HLF_MSP_ID_ORG1 = 'Test1MSP';
            var config = require('./config');
            expect(config.mspIdOrg1).toBe('Test1MSP');
        });
    });
    describe('mspIdOrg2', function () {
        it('defaults to "Org2MSP"', function () {
            var config = require('./config');
            expect(config.mspIdOrg2).toBe('Org2MSP');
        });
        it('can be configured using the "HLF_MSP_ID_ORG2" environment variable', function () {
            process.env.HLF_MSP_ID_ORG2 = 'Test2MSP';
            var config = require('./config');
            expect(config.mspIdOrg2).toBe('Test2MSP');
        });
    });
    describe('channelName', function () {
        it('defaults to "mychannel"', function () {
            var config = require('./config');
            expect(config.channelName).toBe('mychannel');
        });
        it('can be configured using the "HLF_CHANNEL_NAME" environment variable', function () {
            process.env.HLF_CHANNEL_NAME = 'testchannel';
            var config = require('./config');
            expect(config.channelName).toBe('testchannel');
        });
    });
    describe('chaincodeName', function () {
        it('defaults to "basic"', function () {
            var config = require('./config');
            expect(config.chaincodeName).toBe('basic');
        });
        it('can be configured using the "HLF_CHAINCODE_NAME" environment variable', function () {
            process.env.HLF_CHAINCODE_NAME = 'testcc';
            var config = require('./config');
            expect(config.chaincodeName).toBe('testcc');
        });
    });
    describe('commitTimeout', function () {
        it('defaults to "300"', function () {
            var config = require('./config');
            expect(config.commitTimeout).toBe(300);
        });
        it('can be configured using the "HLF_COMMIT_TIMEOUT" environment variable', function () {
            process.env.HLF_COMMIT_TIMEOUT = '9999';
            var config = require('./config');
            expect(config.commitTimeout).toBe(9999);
        });
        it('throws an error when the "HLF_COMMIT_TIMEOUT" environment variable has an invalid number', function () {
            process.env.HLF_COMMIT_TIMEOUT = 'short';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_COMMIT_TIMEOUT" should be a valid integer. An example of a valid value would be: 300');
        });
    });
    describe('endorseTimeout', function () {
        it('defaults to "30"', function () {
            var config = require('./config');
            expect(config.endorseTimeout).toBe(30);
        });
        it('can be configured using the "HLF_ENDORSE_TIMEOUT" environment variable', function () {
            process.env.HLF_ENDORSE_TIMEOUT = '9999';
            var config = require('./config');
            expect(config.endorseTimeout).toBe(9999);
        });
        it('throws an error when the "HLF_ENDORSE_TIMEOUT" environment variable has an invalid number', function () {
            process.env.HLF_ENDORSE_TIMEOUT = 'short';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_ENDORSE_TIMEOUT" should be a valid integer. An example of a valid value would be: 30');
        });
    });
    describe('queryTimeout', function () {
        it('defaults to "3"', function () {
            var config = require('./config');
            expect(config.queryTimeout).toBe(3);
        });
        it('can be configured using the "HLF_QUERY_TIMEOUT" environment variable', function () {
            process.env.HLF_QUERY_TIMEOUT = '9999';
            var config = require('./config');
            expect(config.queryTimeout).toBe(9999);
        });
        it('throws an error when the "HLF_QUERY_TIMEOUT" environment variable has an invalid number', function () {
            process.env.HLF_QUERY_TIMEOUT = 'long';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_QUERY_TIMEOUT" should be a valid integer. An example of a valid value would be: 3');
        });
    });
    describe('connectionProfileOrg1', function () {
        it('throws an error when the "HLF_CONNECTION_PROFILE_ORG1" environment variable is not set', function () {
            delete process.env.HLF_CONNECTION_PROFILE_ORG1;
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_CONNECTION_PROFILE_ORG1" is a required variable, but it was not set. An example of a valid value would be: {"name":"test-network-org1","version":"1.0.0","client":{"organization":"Org1" ... }');
        });
        it('can be configured using the "HLF_CONNECTION_PROFILE_ORG1" environment variable', function () {
            process.env.HLF_CONNECTION_PROFILE_ORG1 = '{"name":"test-network-org1"}';
            var config = require('./config');
            expect(config.connectionProfileOrg1).toStrictEqual({
                name: 'test-network-org1',
            });
        });
        it('throws an error when the "HLF_CONNECTION_PROFILE_ORG1" environment variable is set to invalid json', function () {
            process.env.HLF_CONNECTION_PROFILE_ORG1 = 'testing';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_CONNECTION_PROFILE_ORG1" should be valid (parseable) JSON. An example of a valid value would be: {"name":"test-network-org1","version":"1.0.0","client":{"organization":"Org1" ... }');
        });
    });
    describe('certificateOrg1', function () {
        it('throws an error when the "HLF_CERTIFICATE_ORG1" environment variable is not set', function () {
            delete process.env.HLF_CERTIFICATE_ORG1;
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_CERTIFICATE_ORG1" is a required variable, but it was not set. An example of a valid value would be: "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----\\n"');
        });
        it('can be configured using the "HLF_CERTIFICATE_ORG1" environment variable', function () {
            process.env.HLF_CERTIFICATE_ORG1 = 'ORG1CERT';
            var config = require('./config');
            expect(config.certificateOrg1).toBe('ORG1CERT');
        });
    });
    describe('privateKeyOrg1', function () {
        it('throws an error when the "HLF_PRIVATE_KEY_ORG1" environment variable is not set', function () {
            delete process.env.HLF_PRIVATE_KEY_ORG1;
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_PRIVATE_KEY_ORG1" is a required variable, but it was not set. An example of a valid value would be: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
        });
        it('can be configured using the "HLF_PRIVATE_KEY_ORG1" environment variable', function () {
            process.env.HLF_PRIVATE_KEY_ORG1 = 'ORG1PK';
            var config = require('./config');
            expect(config.privateKeyOrg1).toBe('ORG1PK');
        });
    });
    describe('connectionProfileOrg2', function () {
        it('throws an error when the "HLF_CONNECTION_PROFILE_ORG2" environment variable is not set', function () {
            delete process.env.HLF_CONNECTION_PROFILE_ORG2;
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_CONNECTION_PROFILE_ORG2" is a required variable, but it was not set. An example of a valid value would be: {"name":"test-network-org2","version":"1.0.0","client":{"organization":"Org2" ... }');
        });
        it('can be configured using the "HLF_CONNECTION_PROFILE_ORG2" environment variable', function () {
            process.env.HLF_CONNECTION_PROFILE_ORG2 = '{"name":"test-network-org2"}';
            var config = require('./config');
            expect(config.connectionProfileOrg2).toStrictEqual({
                name: 'test-network-org2',
            });
        });
        it('throws an error when the "HLF_CONNECTION_PROFILE_ORG2" environment variable is set to invalid json', function () {
            process.env.HLF_CONNECTION_PROFILE_ORG2 = 'testing';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_CONNECTION_PROFILE_ORG2" should be valid (parseable) JSON. An example of a valid value would be: {"name":"test-network-org2","version":"1.0.0","client":{"organization":"Org2" ... }');
        });
    });
    describe('certificateOrg2', function () {
        it('throws an error when the "HLF_CERTIFICATE_ORG2" environment variable is not set', function () {
            delete process.env.HLF_CERTIFICATE_ORG2;
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_CERTIFICATE_ORG2" is a required variable, but it was not set. An example of a valid value would be: "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----\\n"');
        });
        it('can be configured using the "HLF_CERTIFICATE_ORG2" environment variable', function () {
            process.env.HLF_CERTIFICATE_ORG2 = 'ORG2CERT';
            var config = require('./config');
            expect(config.certificateOrg2).toBe('ORG2CERT');
        });
    });
    describe('privateKeyOrg2', function () {
        it('throws an error when the "HLF_PRIVATE_KEY_ORG2" environment variable is not set', function () {
            delete process.env.HLF_PRIVATE_KEY_ORG2;
            expect(function () {
                require('./config');
            }).toThrow('env-var: "HLF_PRIVATE_KEY_ORG2" is a required variable, but it was not set. An example of a valid value would be: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
        });
        it('can be configured using the "HLF_PRIVATE_KEY_ORG2" environment variable', function () {
            process.env.HLF_PRIVATE_KEY_ORG2 = 'ORG2PK';
            var config = require('./config');
            expect(config.privateKeyOrg2).toBe('ORG2PK');
        });
    });
    describe('redisHost', function () {
        it('defaults to "localhost"', function () {
            var config = require('./config');
            expect(config.redisHost).toBe('localhost');
        });
        it('can be configured using the "REDIS_HOST" environment variable', function () {
            process.env.REDIS_HOST = 'redis.example.org';
            var config = require('./config');
            expect(config.redisHost).toBe('redis.example.org');
        });
    });
    describe('redisPort', function () {
        it('defaults to "6379"', function () {
            var config = require('./config');
            expect(config.redisPort).toBe(6379);
        });
        it('can be configured with a valid port number using the "REDIS_PORT" environment variable', function () {
            process.env.REDIS_PORT = '9736';
            var config = require('./config');
            expect(config.redisPort).toBe(9736);
        });
        it('throws an error when the "REDIS_PORT" environment variable has an invalid port number', function () {
            process.env.REDIS_PORT = '65536';
            expect(function () {
                require('./config');
            }).toThrow('env-var: "REDIS_PORT" cannot assign a port number greater than 65535. An example of a valid value would be: 6379');
        });
    });
    describe('redisUsername', function () {
        it('has no default value', function () {
            var config = require('./config');
            expect(config.redisUsername).toBeUndefined();
        });
        it('can be configured using the "REDIS_USERNAME" environment variable', function () {
            process.env.REDIS_USERNAME = 'test';
            var config = require('./config');
            expect(config.redisUsername).toBe('test');
        });
    });
    describe('redisPassword', function () {
        it('has no default value', function () {
            var config = require('./config');
            expect(config.redisPassword).toBeUndefined();
        });
        it('can be configured using the "REDIS_PASSWORD" environment variable', function () {
            process.env.REDIS_PASSWORD = 'testpw';
            var config = require('./config');
            expect(config.redisPassword).toBe('testpw');
        });
    });
    describe('org1ApiKey', function () {
        it('throws an error when the "ORG1_APIKEY" environment variable is not set', function () {
            delete process.env.ORG1_APIKEY;
            expect(function () {
                require('./config');
            }).toThrow('env-var: "ORG1_APIKEY" is a required variable, but it was not set. An example of a valid value would be: 123');
        });
        it('can be configured using the "ORG1_APIKEY" environment variable', function () {
            process.env.ORG1_APIKEY = 'org1ApiKey';
            var config = require('./config');
            expect(config.org1ApiKey).toBe('org1ApiKey');
        });
    });
    describe('org2ApiKey', function () {
        it('throws an error when the "ORG1_APIKEY" environment variable is not set', function () {
            delete process.env.ORG2_APIKEY;
            expect(function () {
                require('./config');
            }).toThrow('env-var: "ORG2_APIKEY" is a required variable, but it was not set. An example of a valid value would be: 456');
        });
        it('can be configured using the "ORG1_APIKEY" environment variable', function () {
            process.env.ORG2_APIKEY = 'org2ApiKey';
            var config = require('./config');
            expect(config.org2ApiKey).toBe('org2ApiKey');
        });
    });
});
//# sourceMappingURL=config.spec.js.map