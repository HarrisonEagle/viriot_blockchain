"use strict";
/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * This is the main entrypoint for the sample REST server, which is responsible
 * for connecting to the Fabric network and setting up a job queue for
 * processing submit transactions
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
var config = __importStar(require("./config"));
var fabric_1 = require("./fabric");
var jobs_1 = require("./jobs");
var logger_1 = require("./logger");
var server_1 = require("./server");
var redis_1 = require("./redis");
var jobQueue;
var jobQueueWorker;
var jobQueueScheduler;
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var app, wallet, gatewayOrg1, networkOrg1, contractsOrg1, gatewayOrg2, networkOrg2, contractsOrg2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.logger.info('Checking Redis config');
                    return [4 /*yield*/, (0, redis_1.isMaxmemoryPolicyNoeviction)()];
                case 1:
                    if (!(_a.sent())) {
                        throw new Error('Invalid redis configuration: redis instance must have the setting maxmemory-policy=noeviction');
                    }
                    logger_1.logger.info('Creating REST server');
                    return [4 /*yield*/, (0, server_1.createServer)()];
                case 2:
                    app = _a.sent();
                    logger_1.logger.info('Connecting to Fabric network with org1 mspid');
                    return [4 /*yield*/, (0, fabric_1.createWallet)()];
                case 3:
                    wallet = _a.sent();
                    return [4 /*yield*/, (0, fabric_1.createGateway)(config.connectionProfileOrg1, config.mspIdOrg1, wallet)];
                case 4:
                    gatewayOrg1 = _a.sent();
                    return [4 /*yield*/, (0, fabric_1.getNetwork)(gatewayOrg1)];
                case 5:
                    networkOrg1 = _a.sent();
                    return [4 /*yield*/, (0, fabric_1.getContracts)(networkOrg1)];
                case 6:
                    contractsOrg1 = _a.sent();
                    app.locals[config.mspIdOrg1] = contractsOrg1;
                    logger_1.logger.info('Connecting to Fabric network with org2 mspid');
                    return [4 /*yield*/, (0, fabric_1.createGateway)(config.connectionProfileOrg2, config.mspIdOrg2, wallet)];
                case 7:
                    gatewayOrg2 = _a.sent();
                    return [4 /*yield*/, (0, fabric_1.getNetwork)(gatewayOrg2)];
                case 8:
                    networkOrg2 = _a.sent();
                    return [4 /*yield*/, (0, fabric_1.getContracts)(networkOrg2)];
                case 9:
                    contractsOrg2 = _a.sent();
                    app.locals[config.mspIdOrg2] = contractsOrg2;
                    logger_1.logger.info('Initialising submit job queue');
                    jobQueue = (0, jobs_1.initJobQueue)();
                    jobQueueWorker = (0, jobs_1.initJobQueueWorker)(app);
                    if (config.submitJobQueueScheduler === true) {
                        logger_1.logger.info('Initialising submit job queue scheduler');
                        jobQueueScheduler = (0, jobs_1.initJobQueueScheduler)();
                    }
                    app.locals.jobq = jobQueue;
                    logger_1.logger.info('Starting REST server');
                    app.listen(config.port, function () {
                        logger_1.logger.info('REST server started on port: %d', config.port);
                    });
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.logger.error({ err: err }, 'Unxepected error');
                if (!(jobQueueScheduler != undefined)) return [3 /*break*/, 2];
                logger_1.logger.debug('Closing job queue scheduler');
                return [4 /*yield*/, jobQueueScheduler.close()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                if (!(jobQueueWorker != undefined)) return [3 /*break*/, 4];
                logger_1.logger.debug('Closing job queue worker');
                return [4 /*yield*/, jobQueueWorker.close()];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                if (!(jobQueue != undefined)) return [3 /*break*/, 6];
                logger_1.logger.debug('Closing job queue');
                return [4 /*yield*/, jobQueue.close()];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6: return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=index.js.map