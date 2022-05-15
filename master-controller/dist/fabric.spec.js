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
var fabric_1 = require("./fabric");
var config = __importStar(require("./config"));
var errors_1 = require("./errors");
var fabricProtos = __importStar(require("fabric-protos"));
var jest_mock_extended_1 = require("jest-mock-extended");
jest.mock('./config');
jest.mock('fabric-network', function () {
    var originalModule = jest.requireActual('fabric-network');
    var mockModule = jest.createMockFromModule('fabric-network');
    return __assign(__assign({ __esModule: true }, mockModule), { Wallets: originalModule.Wallets });
});
jest.mock('ioredis', function () { return require('ioredis-mock/jest'); });
describe('Fabric', function () {
    describe('createWallet', function () {
        it('creates a wallet containing identities for both orgs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var wallet, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, fabric_1.createWallet)()];
                    case 1:
                        wallet = _b.sent();
                        _a = expect;
                        return [4 /*yield*/, wallet.list()];
                    case 2:
                        _a.apply(void 0, [_b.sent()]).toStrictEqual(['Org1MSP', 'Org2MSP']);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('createGateway', function () {
        it('creates a Gateway and connects using the provided arguments', function () { return __awaiter(void 0, void 0, void 0, function () {
            var connectionProfile, identity, mockWallet, gateway;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connectionProfile = config.connectionProfileOrg1;
                        identity = config.mspIdOrg1;
                        mockWallet = (0, jest_mock_extended_1.mock)();
                        return [4 /*yield*/, (0, fabric_1.createGateway)(connectionProfile, identity, mockWallet)];
                    case 1:
                        gateway = _a.sent();
                        expect(gateway.connect).toBeCalledWith(connectionProfile, expect.objectContaining({
                            wallet: mockWallet,
                            identity: identity,
                            discovery: expect.any(Object),
                            eventHandlerOptions: expect.any(Object),
                            queryHandlerOptions: expect.any(Object),
                        }));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('getNetwork', function () {
        it('gets a Network instance for the required channel from the Gateway', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockGateway;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockGateway = (0, jest_mock_extended_1.mock)();
                        return [4 /*yield*/, (0, fabric_1.getNetwork)(mockGateway)];
                    case 1:
                        _a.sent();
                        expect(mockGateway.getNetwork).toHaveBeenCalledWith(config.channelName);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('getContracts', function () {
        it('gets the asset and qscc contracts from the network', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockBasicContract, mockSystemContract, mockNetwork, contracts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockBasicContract = (0, jest_mock_extended_1.mock)();
                        mockSystemContract = (0, jest_mock_extended_1.mock)();
                        mockNetwork = (0, jest_mock_extended_1.mock)();
                        mockNetwork.getContract
                            .calledWith(config.chaincodeName)
                            .mockReturnValue(mockBasicContract);
                        mockNetwork.getContract
                            .calledWith('qscc')
                            .mockReturnValue(mockSystemContract);
                        return [4 /*yield*/, (0, fabric_1.getContracts)(mockNetwork)];
                    case 1:
                        contracts = _a.sent();
                        expect(contracts).toStrictEqual({
                            assetContract: mockBasicContract,
                            qsccContract: mockSystemContract,
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('evatuateTransaction', function () {
        var mockPayload = Buffer.from('MOCK PAYLOAD');
        var mockTransaction;
        var mockContract;
        beforeEach(function () {
            mockTransaction = (0, jest_mock_extended_1.mock)();
            mockTransaction.evaluate.mockResolvedValue(mockPayload);
            mockContract = (0, jest_mock_extended_1.mock)();
            mockContract.createTransaction
                .calledWith('txn')
                .mockReturnValue(mockTransaction);
        });
        it('gets the result of evaluating a transaction', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, fabric_1.evatuateTransaction)(mockContract, 'txn', 'arga', 'argb')];
                    case 1:
                        result = _a.sent();
                        expect(result.toString()).toBe(mockPayload.toString());
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws an AssetExistsError an asset already exists error occurs', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockTransaction.evaluate.mockRejectedValue(new Error('The asset JSCHAINCODE already exists'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, fabric_1.evatuateTransaction)(mockContract, 'txn', 'arga', 'argb')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow(errors_1.AssetExistsError)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws an AssetNotFoundError if an asset does not exist error occurs', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockTransaction.evaluate.mockRejectedValue(new Error('The asset JSCHAINCODE does not exist'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, fabric_1.evatuateTransaction)(mockContract, 'txn', 'arga', 'argb')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow(errors_1.AssetNotFoundError)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws a TransactionNotFoundError if a transaction not found error occurs', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockTransaction.evaluate.mockRejectedValue(new Error('Failed to get transaction with id txn, error Entry not found in index'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, fabric_1.evatuateTransaction)(mockContract, 'txn', 'arga', 'argb')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow(errors_1.TransactionNotFoundError)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws an Error for other errors', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockTransaction.evaluate.mockRejectedValue(new Error('MOCK ERROR'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, fabric_1.evatuateTransaction)(mockContract, 'txn', 'arga', 'argb')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow(Error)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('submitTransaction', function () {
        var mockTransaction;
        beforeEach(function () {
            mockTransaction = (0, jest_mock_extended_1.mock)();
        });
        it('gets the result of submitting a transaction', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockPayload, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPayload = Buffer.from('MOCK PAYLOAD');
                        mockTransaction.submit.mockResolvedValue(mockPayload);
                        return [4 /*yield*/, (0, fabric_1.submitTransaction)(mockTransaction, 'txn', 'arga', 'argb')];
                    case 1:
                        result = _a.sent();
                        expect(result.toString()).toBe(mockPayload.toString());
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws an AssetExistsError an asset already exists error occurs', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockTransaction.submit.mockRejectedValue(new Error('The asset JSCHAINCODE already exists'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, fabric_1.submitTransaction)(mockTransaction, 'mspid', 'txn', 'arga', 'argb')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow(errors_1.AssetExistsError)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws an AssetNotFoundError if an asset does not exist error occurs', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockTransaction.submit.mockRejectedValue(new Error('The asset JSCHAINCODE does not exist'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, fabric_1.submitTransaction)(mockTransaction, 'mspid', 'txn', 'arga', 'argb')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow(errors_1.AssetNotFoundError)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws a TransactionNotFoundError if a transaction not found error occurs', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockTransaction.submit.mockRejectedValue(new Error('Failed to get transaction with id txn, error Entry not found in index'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, fabric_1.submitTransaction)(mockTransaction, 'mspid', 'txn', 'arga', 'argb')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow(errors_1.TransactionNotFoundError)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('throws an Error for other errors', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockTransaction.submit.mockRejectedValue(new Error('MOCK ERROR'));
                        return [4 /*yield*/, expect(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, fabric_1.submitTransaction)(mockTransaction, 'mspid', 'txn', 'arga', 'argb')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }).rejects.toThrow(Error)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('getTransactionValidationCode', function () {
        it('gets the validation code from a processed transaction', function () { return __awaiter(void 0, void 0, void 0, function () {
            var processedTransactionProto, processedTransactionBuffer, mockTransaction, mockContract, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        processedTransactionProto = fabricProtos.protos.ProcessedTransaction.create();
                        processedTransactionProto.validationCode =
                            fabricProtos.protos.TxValidationCode.VALID;
                        processedTransactionBuffer = Buffer.from(fabricProtos.protos.ProcessedTransaction.encode(processedTransactionProto).finish());
                        mockTransaction = (0, jest_mock_extended_1.mock)();
                        mockTransaction.evaluate.mockResolvedValue(processedTransactionBuffer);
                        mockContract = (0, jest_mock_extended_1.mock)();
                        mockContract.createTransaction
                            .calledWith('GetTransactionByID')
                            .mockReturnValue(mockTransaction);
                        _a = expect;
                        return [4 /*yield*/, (0, fabric_1.getTransactionValidationCode)(mockContract, 'txn1')];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBe('VALID');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('getBlockHeight', function () {
        it('gets the current block height', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockBlockchainInfoProto, mockBlockchainInfoBuffer, mockContract, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockBlockchainInfoProto = fabricProtos.common.BlockchainInfo.create();
                        mockBlockchainInfoProto.height = 42;
                        mockBlockchainInfoBuffer = Buffer.from(fabricProtos.common.BlockchainInfo.encode(mockBlockchainInfoProto).finish());
                        mockContract = (0, jest_mock_extended_1.mock)();
                        mockContract.evaluateTransaction
                            .calledWith('GetChainInfo', 'mychannel')
                            .mockResolvedValue(mockBlockchainInfoBuffer);
                        return [4 /*yield*/, (0, fabric_1.getBlockHeight)(mockContract)];
                    case 1:
                        result = (_a.sent());
                        expect(result.toInt()).toStrictEqual(42);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=fabric.spec.js.map