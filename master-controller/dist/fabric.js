"use strict";
/*
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
exports.getBlockHeight = exports.getTransactionValidationCode = exports.submitTransaction = exports.evatuateTransaction = exports.getContracts = exports.getNetwork = exports.createGateway = exports.createWallet = void 0;
var fabric_network_1 = require("fabric-network");
var config = __importStar(require("./config"));
var logger_1 = require("./logger");
var errors_1 = require("./errors");
var protos = __importStar(require("fabric-protos"));
/**
 * Creates an in memory wallet to hold credentials for an Org1 and Org2 user
 *
 * In this sample there is a single user for each MSP ID to demonstrate how
 * a client app might submit transactions for different users
 *
 * Alternatively a REST server could use its own identity for all transactions,
 * or it could use credentials supplied in the REST requests
 */
var createWallet = function () { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, org1Identity, org2Identity;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fabric_network_1.Wallets.newInMemoryWallet()];
            case 1:
                wallet = _a.sent();
                org1Identity = {
                    credentials: {
                        certificate: config.certificateOrg1,
                        privateKey: config.privateKeyOrg1,
                    },
                    mspId: config.mspIdOrg1,
                    type: 'X.509',
                };
                return [4 /*yield*/, wallet.put(config.mspIdOrg1, org1Identity)];
            case 2:
                _a.sent();
                org2Identity = {
                    credentials: {
                        certificate: config.certificateOrg2,
                        privateKey: config.privateKeyOrg2,
                    },
                    mspId: config.mspIdOrg2,
                    type: 'X.509',
                };
                return [4 /*yield*/, wallet.put(config.mspIdOrg2, org2Identity)];
            case 3:
                _a.sent();
                return [2 /*return*/, wallet];
        }
    });
}); };
exports.createWallet = createWallet;
/**
 * Create a Gateway connection
 *
 * Gateway instances can and should be reused rather than connecting to submit every transaction
 */
var createGateway = function (connectionProfile, identity, wallet) { return __awaiter(void 0, void 0, void 0, function () {
    var gateway, options;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.logger.debug({ connectionProfile: connectionProfile, identity: identity }, 'Configuring gateway');
                gateway = new fabric_network_1.Gateway();
                options = {
                    wallet: wallet,
                    identity: identity,
                    discovery: { enabled: true, asLocalhost: config.asLocalhost },
                    eventHandlerOptions: {
                        commitTimeout: config.commitTimeout,
                        endorseTimeout: config.endorseTimeout,
                        strategy: fabric_network_1.DefaultEventHandlerStrategies.PREFER_MSPID_SCOPE_ANYFORTX,
                    },
                    queryHandlerOptions: {
                        timeout: config.queryTimeout,
                        strategy: fabric_network_1.DefaultQueryHandlerStrategies.PREFER_MSPID_SCOPE_ROUND_ROBIN,
                    },
                };
                return [4 /*yield*/, gateway.connect(connectionProfile, options)];
            case 1:
                _a.sent();
                return [2 /*return*/, gateway];
        }
    });
}); };
exports.createGateway = createGateway;
/**
 * Get the network which the asset transfer sample chaincode is running on
 *
 * In addion to getting the contract, the network will also be used to
 * start a block event listener
 */
var getNetwork = function (gateway) { return __awaiter(void 0, void 0, void 0, function () {
    var network;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, gateway.getNetwork(config.channelName)];
            case 1:
                network = _a.sent();
                return [2 /*return*/, network];
        }
    });
}); };
exports.getNetwork = getNetwork;
/**
 * Get the asset transfer sample contract and the qscc system contract
 *
 * The system contract is used for the liveness REST endpoint
 */
var getContracts = function (network) { return __awaiter(void 0, void 0, void 0, function () {
    var assetContract, qsccContract;
    return __generator(this, function (_a) {
        assetContract = network.getContract(config.chaincodeName);
        qsccContract = network.getContract('qscc');
        return [2 /*return*/, { assetContract: assetContract, qsccContract: qsccContract }];
    });
}); };
exports.getContracts = getContracts;
/**
 * Evaluate a transaction and handle any errors
 */
var evatuateTransaction = function (contract, transactionName) {
    var transactionArgs = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        transactionArgs[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, void 0, void 0, function () {
        var transaction, transactionId, payload, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transaction = contract.createTransaction(transactionName);
                    transactionId = transaction.getTransactionId();
                    logger_1.logger.trace({ transaction: transaction }, 'Evaluating transaction');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, transaction.evaluate.apply(transaction, transactionArgs)];
                case 2:
                    payload = _a.sent();
                    logger_1.logger.trace({ transactionId: transactionId, payload: payload.toString() }, 'Evaluate transaction response received');
                    return [2 /*return*/, payload];
                case 3:
                    err_1 = _a.sent();
                    throw (0, errors_1.handleError)(transactionId, err_1);
                case 4: return [2 /*return*/];
            }
        });
    });
};
exports.evatuateTransaction = evatuateTransaction;
/**
 * Submit a transaction and handle any errors
 */
var submitTransaction = function (transaction) {
    var transactionArgs = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        transactionArgs[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, void 0, void 0, function () {
        var txnId, payload, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.logger.trace({ transaction: transaction }, 'Submitting transaction');
                    txnId = transaction.getTransactionId();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, transaction.submit.apply(transaction, transactionArgs)];
                case 2:
                    payload = _a.sent();
                    logger_1.logger.trace({ transactionId: txnId, payload: payload.toString() }, 'Submit transaction response received');
                    return [2 /*return*/, payload];
                case 3:
                    err_2 = _a.sent();
                    throw (0, errors_1.handleError)(txnId, err_2);
                case 4: return [2 /*return*/];
            }
        });
    });
};
exports.submitTransaction = submitTransaction;
/**
 * Get the validation code of the specified transaction
 */
var getTransactionValidationCode = function (qsccContract, transactionId) { return __awaiter(void 0, void 0, void 0, function () {
    var data, processedTransaction, validationCode;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.evatuateTransaction)(qsccContract, 'GetTransactionByID', config.channelName, transactionId)];
            case 1:
                data = _a.sent();
                processedTransaction = protos.protos.ProcessedTransaction.decode(data);
                validationCode = protos.protos.TxValidationCode[processedTransaction.validationCode];
                logger_1.logger.debug({ transactionId: transactionId }, 'Validation code: %s', validationCode);
                return [2 /*return*/, validationCode];
        }
    });
}); };
exports.getTransactionValidationCode = getTransactionValidationCode;
/**
 * Get the current block height
 *
 * This example of using a system contract is used for the liveness REST
 * endpoint
 */
var getBlockHeight = function (qscc) { return __awaiter(void 0, void 0, void 0, function () {
    var data, info, blockHeight;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, qscc.evaluateTransaction('GetChainInfo', config.channelName)];
            case 1:
                data = _a.sent();
                info = protos.common.BlockchainInfo.decode(data);
                blockHeight = info.height;
                logger_1.logger.debug('Current block height: %d', blockHeight);
                return [2 /*return*/, blockHeight];
        }
    });
}); };
exports.getBlockHeight = getBlockHeight;
//# sourceMappingURL=fabric.js.map