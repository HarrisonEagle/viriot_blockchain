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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var bullmq_1 = require("bullmq");
var fabricProtos = __importStar(require("fabric-protos"));
var jest_mock_extended_1 = require("jest-mock-extended");
var utils_1 = require("ts-jest/utils");
var supertest_1 = __importDefault(require("supertest"));
var config = __importStar(require("../config"));
var server_1 = require("../server");
jest.mock('../config');
jest.mock('bullmq');
var mockAsset1 = {
    ID: 'asset1',
    Color: 'blue',
    Size: 5,
    Owner: 'Tomoko',
    AppraisedValue: 300,
};
var mockAsset1Buffer = Buffer.from(JSON.stringify(mockAsset1));
var mockAsset2 = {
    ID: 'asset2',
    Color: 'red',
    Size: 5,
    Owner: 'Brad',
    AppraisedValue: 400,
};
var mockAllAssetsBuffer = Buffer.from(JSON.stringify([mockAsset1, mockAsset2]));
// TODO add tests for server errors
describe('Asset Transfer Besic REST API', function () {
    var app;
    var mockJobQueue;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockJob;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, server_1.createServer)()];
                case 1:
                    app = _a.sent();
                    mockJob = (0, jest_mock_extended_1.mock)();
                    mockJob.id = '1';
                    mockJobQueue = (0, jest_mock_extended_1.mock)();
                    mockJobQueue.add.mockResolvedValue(mockJob);
                    app.locals.jobq = mockJobQueue;
                    return [2 /*return*/];
            }
        });
    }); });
    describe('/ready', function () {
        it('GET should respond with 200 OK json', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app).get('/ready')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(200);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'OK',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('/live', function () {
        it('GET should respond with 200 OK json', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockBlockchainInfoProto, mockBlockchainInfoBuffer, mockOrg1QsccContract, mockOrg2QsccContract, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockBlockchainInfoProto = fabricProtos.common.BlockchainInfo.create();
                        mockBlockchainInfoProto.height = 42;
                        mockBlockchainInfoBuffer = Buffer.from(fabricProtos.common.BlockchainInfo.encode(mockBlockchainInfoProto).finish());
                        mockOrg1QsccContract = (0, jest_mock_extended_1.mock)();
                        mockOrg1QsccContract.evaluateTransaction
                            .calledWith('GetChainInfo')
                            .mockResolvedValue(mockBlockchainInfoBuffer);
                        app.locals[config.mspIdOrg1] = {
                            qsccContract: mockOrg1QsccContract,
                        };
                        mockOrg2QsccContract = (0, jest_mock_extended_1.mock)();
                        mockOrg2QsccContract.evaluateTransaction
                            .calledWith('GetChainInfo')
                            .mockResolvedValue(mockBlockchainInfoBuffer);
                        app.locals[config.mspIdOrg2] = {
                            qsccContract: mockOrg2QsccContract,
                        };
                        return [4 /*yield*/, (0, supertest_1.default)(app).get('/live')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(200);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'OK',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('/api/assets', function () {
        var mockGetAllAssetsTransaction;
        beforeEach(function () {
            mockGetAllAssetsTransaction = (0, jest_mock_extended_1.mock)();
            var mockBasicContract = (0, jest_mock_extended_1.mock)();
            mockBasicContract.createTransaction
                .calledWith('GetAllAssets')
                .mockReturnValue(mockGetAllAssetsTransaction);
            app.locals[config.mspIdOrg1] = {
                assetContract: mockBasicContract,
            };
        });
        it('GET should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .get('/api/assets')
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with an empty json array when there are no assets', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockGetAllAssetsTransaction.evaluate.mockResolvedValue(Buffer.from(''));
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .get('/api/assets')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(200);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual([]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with json array of assets', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockGetAllAssetsTransaction.evaluate.mockResolvedValue(mockAllAssetsBuffer);
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .get('/api/assets')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(200);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual([
                            {
                                ID: 'asset1',
                                Color: 'blue',
                                Size: 5,
                                Owner: 'Tomoko',
                                AppraisedValue: 300,
                            },
                            {
                                ID: 'asset2',
                                Color: 'red',
                                Size: 5,
                                Owner: 'Brad',
                                AppraisedValue: 400,
                            },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('POST should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .post('/api/assets')
                            .send({
                            ID: 'asset6',
                            Color: 'white',
                            Size: 15,
                            Owner: 'Michel',
                            AppraisedValue: 800,
                        })
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('POST should respond with 400 bad request json for invalid asset json', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .post('/api/assets')
                            .send({
                            wrongidfield: 'asset3',
                            Color: 'red',
                            Size: 5,
                            Owner: 'Brad',
                            AppraisedValue: 400,
                        })
                            .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(400);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Bad Request',
                            reason: 'VALIDATION_ERROR',
                            errors: [
                                {
                                    location: 'body',
                                    msg: 'must be a string',
                                    param: 'ID',
                                },
                            ],
                            message: 'Invalid request body',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('POST should respond with 202 accepted json', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .post('/api/assets')
                            .send({
                            ID: 'asset3',
                            Color: 'red',
                            Size: 5,
                            Owner: 'Brad',
                            AppraisedValue: 400,
                        })
                            .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(202);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Accepted',
                            jobId: '1',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('/api/assets/:id', function () {
        var mockAssetExistsTransaction;
        var mockReadAssetTransaction;
        beforeEach(function () {
            var mockBasicContract = (0, jest_mock_extended_1.mock)();
            mockAssetExistsTransaction = (0, jest_mock_extended_1.mock)();
            mockBasicContract.createTransaction
                .calledWith('AssetExists')
                .mockReturnValue(mockAssetExistsTransaction);
            mockReadAssetTransaction = (0, jest_mock_extended_1.mock)();
            mockBasicContract.createTransaction
                .calledWith('ReadAsset')
                .mockReturnValue(mockReadAssetTransaction);
            app.locals[config.mspIdOrg1] = {
                assetContract: mockBasicContract,
            };
        });
        it('OPTIONS should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .options('/api/assets/asset1')
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('OPTIONS should respond with 404 not found json without the allow header when there is no asset with the specified ID', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockAssetExistsTransaction.evaluate
                            .calledWith('asset3')
                            .mockResolvedValue(Buffer.from('false'));
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .options('/api/assets/asset3')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(404);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.header).not.toHaveProperty('allow');
                        expect(response.body).toEqual({
                            status: 'Not Found',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('OPTIONS should respond with 200 OK json with the allow header', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockAssetExistsTransaction.evaluate
                            .calledWith('asset1')
                            .mockResolvedValue(Buffer.from('true'));
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .options('/api/assets/asset1')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(200);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.header).toHaveProperty('allow', 'DELETE,GET,OPTIONS,PATCH,PUT');
                        expect(response.body).toEqual({
                            status: 'OK',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .get('/api/assets/asset1')
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with 404 not found json when there is no asset with the specified ID', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockReadAssetTransaction.evaluate
                            .calledWith('asset3')
                            .mockRejectedValue(new Error('the asset asset3 does not exist'));
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .get('/api/assets/asset3')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(404);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Not Found',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with the asset json when the asset exists', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockReadAssetTransaction.evaluate
                            .calledWith('asset1')
                            .mockResolvedValue(mockAsset1Buffer);
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .get('/api/assets/asset1')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(200);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            ID: 'asset1',
                            Color: 'blue',
                            Size: 5,
                            Owner: 'Tomoko',
                            AppraisedValue: 300,
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('PUT should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .put('/api/assets/asset1')
                            .send({
                            ID: 'asset3',
                            Color: 'red',
                            Size: 5,
                            Owner: 'Brad',
                            AppraisedValue: 400,
                        })
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('PUT should respond with 400 bad request json when IDs do not match', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .put('/api/assets/asset1')
                            .send({
                            ID: 'asset2',
                            Color: 'red',
                            Size: 5,
                            Owner: 'Brad',
                            AppraisedValue: 400,
                        })
                            .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(400);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Bad Request',
                            reason: 'ASSET_ID_MISMATCH',
                            message: 'Asset IDs must match',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('PUT should respond with 400 bad request json for invalid asset json', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .put('/api/assets/asset1')
                            .send({
                            wrongID: 'asset1',
                            Color: 'red',
                            Size: 5,
                            Owner: 'Brad',
                            AppraisedValue: 400,
                        })
                            .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(400);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Bad Request',
                            reason: 'VALIDATION_ERROR',
                            errors: [
                                {
                                    location: 'body',
                                    msg: 'must be a string',
                                    param: 'ID',
                                },
                            ],
                            message: 'Invalid request body',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('PUT should respond with 202 accepted json', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .put('/api/assets/asset1')
                            .send({
                            ID: 'asset1',
                            Color: 'red',
                            Size: 5,
                            Owner: 'Brad',
                            AppraisedValue: 400,
                        })
                            .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(202);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Accepted',
                            jobId: '1',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('PATCH should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .patch('/api/assets/asset1')
                            .send([{ op: 'replace', path: '/Owner', value: 'Ashleigh' }])
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('PATCH should respond with 400 bad request json for invalid patch op/path', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .patch('/api/assets/asset1')
                            .send([{ op: 'replace', path: '/color', value: 'orange' }])
                            .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(400);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Bad Request',
                            reason: 'VALIDATION_ERROR',
                            errors: [
                                {
                                    location: 'body',
                                    msg: "path must be '/Owner'",
                                    param: '[0].path',
                                    value: '/color',
                                },
                            ],
                            message: 'Invalid request body',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('PATCH should respond with 202 accepted json', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .patch('/api/assets/asset1')
                            .send([{ op: 'replace', path: '/Owner', value: 'Ashleigh' }])
                            .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(202);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Accepted',
                            jobId: '1',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('DELETE should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .delete('/api/assets/asset1')
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('DELETE should respond with 202 accepted json', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .delete('/api/assets/asset1')
                            .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(202);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Accepted',
                            jobId: '1',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('/api/jobs/:id', function () {
        it('GET should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .get('/api/jobs/1')
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with 404 not found json when there is no job with the specified ID', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        (0, utils_1.mocked)(bullmq_1.Job.fromId).mockResolvedValue(undefined);
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .get('/api/jobs/3')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(404);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Not Found',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with json details for the specified job ID', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockJob, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockJob = (0, jest_mock_extended_1.mock)();
                        mockJob.id = '2';
                        mockJob.data = {
                            transactionIds: ['txn1', 'txn2'],
                        };
                        mockJob.returnvalue = {
                            transactionError: 'Mock error',
                            transactionPayload: Buffer.from('Mock payload'),
                        };
                        mockJobQueue.getJob.calledWith('2').mockResolvedValue(mockJob);
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .get('/api/jobs/2')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(200);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            jobId: '2',
                            transactionIds: ['txn1', 'txn2'],
                            transactionError: 'Mock error',
                            transactionPayload: 'Mock payload',
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('/api/transactions/:id', function () {
        var mockGetTransactionByIDTransaction;
        beforeEach(function () {
            mockGetTransactionByIDTransaction = (0, jest_mock_extended_1.mock)();
            var mockQsccContract = (0, jest_mock_extended_1.mock)();
            mockQsccContract.createTransaction
                .calledWith('GetTransactionByID')
                .mockReturnValue(mockGetTransactionByIDTransaction);
            app.locals[config.mspIdOrg1] = {
                qsccContract: mockQsccContract,
            };
        });
        it('GET should respond with 401 unauthorized json when an invalid API key is specified', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supertest_1.default)(app)
                            .get('/api/transactions/txn1')
                            .set('X-Api-Key', 'NOTTHERIGHTAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(401);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            reason: 'NO_VALID_APIKEY',
                            status: 'Unauthorized',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with 404 not found json when there is no transaction with the specified ID', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockGetTransactionByIDTransaction.evaluate
                            .calledWith('mychannel', 'txn3')
                            .mockRejectedValue(new Error('Failed to get transaction with id txn3, error Entry not found in index'));
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .get('/api/transactions/txn3')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(404);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            status: 'Not Found',
                            timestamp: expect.any(String),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('GET should respond with json details for the specified transaction ID', function () { return __awaiter(void 0, void 0, void 0, function () {
            var processedTransactionProto, processedTransactionBuffer, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        processedTransactionProto = fabricProtos.protos.ProcessedTransaction.create();
                        processedTransactionProto.validationCode =
                            fabricProtos.protos.TxValidationCode.VALID;
                        processedTransactionBuffer = Buffer.from(fabricProtos.protos.ProcessedTransaction.encode(processedTransactionProto).finish());
                        mockGetTransactionByIDTransaction.evaluate
                            .calledWith('mychannel', 'txn2')
                            .mockResolvedValue(processedTransactionBuffer);
                        return [4 /*yield*/, (0, supertest_1.default)(app)
                                .get('/api/transactions/txn2')
                                .set('X-Api-Key', 'ORG1MOCKAPIKEY')];
                    case 1:
                        response = _a.sent();
                        expect(response.statusCode).toEqual(200);
                        expect(response.header).toHaveProperty('content-type', 'application/json; charset=utf-8');
                        expect(response.body).toEqual({
                            transactionId: 'txn2',
                            validationCode: 'VALID',
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=api.test.js.map