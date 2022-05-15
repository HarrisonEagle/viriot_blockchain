"use strict";
/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * This sample is intended to work with the basic asset transfer
 * chaincode which imposes some constraints on what is possible here.
 *
 * For example,
 *  - There is no validation for Asset IDs
 *  - There are no error codes from the chaincode
 *
 * To avoid timeouts, long running tasks should be decoupled from HTTP request
 * processing
 *
 * Submit transactions can potentially be very long running, especially if the
 * transaction fails and needs to be retried one or more times
 *
 * To allow requests to respond quickly enough, this sample queues submit
 * requests for processing asynchronously and immediately returns 202 Accepted
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetsRouter = void 0;
var express_1 = __importDefault(require("express"));
var express_validator_1 = require("express-validator");
var http_status_codes_1 = require("http-status-codes");
var errors_1 = require("./errors");
var fabric_1 = require("./fabric");
var jobs_1 = require("./jobs");
var logger_1 = require("./logger");
var ACCEPTED = http_status_codes_1.StatusCodes.ACCEPTED, BAD_REQUEST = http_status_codes_1.StatusCodes.BAD_REQUEST, INTERNAL_SERVER_ERROR = http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, NOT_FOUND = http_status_codes_1.StatusCodes.NOT_FOUND, OK = http_status_codes_1.StatusCodes.OK;
exports.assetsRouter = express_1.default.Router();
exports.assetsRouter.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var mspId, contract, data, assets, err_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                logger_1.logger.debug('Get all assets request received');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                mspId = req.user;
                contract = (_a = req.app.locals[mspId]) === null || _a === void 0 ? void 0 : _a.assetContract;
                return [4 /*yield*/, (0, fabric_1.evatuateTransaction)(contract, 'GetAllAssets')];
            case 2:
                data = _b.sent();
                assets = [];
                if (data.length > 0) {
                    assets = JSON.parse(data.toString());
                }
                return [2 /*return*/, res.status(OK).json(assets)];
            case 3:
                err_1 = _b.sent();
                logger_1.logger.error({ err: err_1 }, 'Error processing get all assets request');
                return [2 /*return*/, res.status(INTERNAL_SERVER_ERROR).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(INTERNAL_SERVER_ERROR),
                        timestamp: new Date().toISOString(),
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.assetsRouter.post('/', (0, express_validator_1.body)().isObject().withMessage('body must contain an asset object'), (0, express_validator_1.body)('ID', 'must be a string').notEmpty(), (0, express_validator_1.body)('Color', 'must be a string').notEmpty(), (0, express_validator_1.body)('Size', 'must be a number').isNumeric(), (0, express_validator_1.body)('Owner', 'must be a string').notEmpty(), (0, express_validator_1.body)('AppraisedValue', 'must be a number').isNumeric(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var errors, mspId, assetId, submitQueue, jobId, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.logger.debug(req.body, 'Create asset request received');
                errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    return [2 /*return*/, res.status(BAD_REQUEST).json({
                            status: (0, http_status_codes_1.getReasonPhrase)(BAD_REQUEST),
                            reason: 'VALIDATION_ERROR',
                            message: 'Invalid request body',
                            timestamp: new Date().toISOString(),
                            errors: errors.array(),
                        })];
                }
                mspId = req.user;
                assetId = req.body.ID;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                submitQueue = req.app.locals.jobq;
                return [4 /*yield*/, (0, jobs_1.addSubmitTransactionJob)(submitQueue, mspId, 'CreateAsset', assetId, req.body.Color, req.body.Size, req.body.Owner, req.body.AppraisedValue)];
            case 2:
                jobId = _a.sent();
                return [2 /*return*/, res.status(ACCEPTED).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(ACCEPTED),
                        jobId: jobId,
                        timestamp: new Date().toISOString(),
                    })];
            case 3:
                err_2 = _a.sent();
                logger_1.logger.error({ err: err_2 }, 'Error processing create asset request for asset ID %s', assetId);
                return [2 /*return*/, res.status(INTERNAL_SERVER_ERROR).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(INTERNAL_SERVER_ERROR),
                        timestamp: new Date().toISOString(),
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.assetsRouter.options('/:assetId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var assetId, mspId, contract, data, exists, err_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                assetId = req.params.assetId;
                logger_1.logger.debug('Asset options request received for asset ID %s', assetId);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                mspId = req.user;
                contract = (_a = req.app.locals[mspId]) === null || _a === void 0 ? void 0 : _a.assetContract;
                return [4 /*yield*/, (0, fabric_1.evatuateTransaction)(contract, 'AssetExists', assetId)];
            case 2:
                data = _b.sent();
                exists = data.toString() === 'true';
                if (exists) {
                    return [2 /*return*/, res
                            .status(OK)
                            .set({
                            Allow: 'DELETE,GET,OPTIONS,PATCH,PUT',
                        })
                            .json({
                            status: (0, http_status_codes_1.getReasonPhrase)(OK),
                            timestamp: new Date().toISOString(),
                        })];
                }
                else {
                    return [2 /*return*/, res.status(NOT_FOUND).json({
                            status: (0, http_status_codes_1.getReasonPhrase)(NOT_FOUND),
                            timestamp: new Date().toISOString(),
                        })];
                }
                return [3 /*break*/, 4];
            case 3:
                err_3 = _b.sent();
                logger_1.logger.error({ err: err_3 }, 'Error processing asset options request for asset ID %s', assetId);
                return [2 /*return*/, res.status(INTERNAL_SERVER_ERROR).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(INTERNAL_SERVER_ERROR),
                        timestamp: new Date().toISOString(),
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.assetsRouter.get('/:assetId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var assetId, mspId, contract, data, asset, err_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                assetId = req.params.assetId;
                logger_1.logger.debug('Read asset request received for asset ID %s', assetId);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                mspId = req.user;
                contract = (_a = req.app.locals[mspId]) === null || _a === void 0 ? void 0 : _a.assetContract;
                return [4 /*yield*/, (0, fabric_1.evatuateTransaction)(contract, 'ReadAsset', assetId)];
            case 2:
                data = _b.sent();
                asset = JSON.parse(data.toString());
                return [2 /*return*/, res.status(OK).json(asset)];
            case 3:
                err_4 = _b.sent();
                logger_1.logger.error({ err: err_4 }, 'Error processing read asset request for asset ID %s', assetId);
                if (err_4 instanceof errors_1.AssetNotFoundError) {
                    return [2 /*return*/, res.status(NOT_FOUND).json({
                            status: (0, http_status_codes_1.getReasonPhrase)(NOT_FOUND),
                            timestamp: new Date().toISOString(),
                        })];
                }
                return [2 /*return*/, res.status(INTERNAL_SERVER_ERROR).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(INTERNAL_SERVER_ERROR),
                        timestamp: new Date().toISOString(),
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.assetsRouter.put('/:assetId', (0, express_validator_1.body)().isObject().withMessage('body must contain an asset object'), (0, express_validator_1.body)('ID', 'must be a string').notEmpty(), (0, express_validator_1.body)('Color', 'must be a string').notEmpty(), (0, express_validator_1.body)('Size', 'must be a number').isNumeric(), (0, express_validator_1.body)('Owner', 'must be a string').notEmpty(), (0, express_validator_1.body)('AppraisedValue', 'must be a number').isNumeric(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var errors, mspId, assetId, submitQueue, jobId, err_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.logger.debug(req.body, 'Update asset request received');
                errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    return [2 /*return*/, res.status(BAD_REQUEST).json({
                            status: (0, http_status_codes_1.getReasonPhrase)(BAD_REQUEST),
                            reason: 'VALIDATION_ERROR',
                            message: 'Invalid request body',
                            timestamp: new Date().toISOString(),
                            errors: errors.array(),
                        })];
                }
                if (req.params.assetId != req.body.ID) {
                    return [2 /*return*/, res.status(BAD_REQUEST).json({
                            status: (0, http_status_codes_1.getReasonPhrase)(BAD_REQUEST),
                            reason: 'ASSET_ID_MISMATCH',
                            message: 'Asset IDs must match',
                            timestamp: new Date().toISOString(),
                        })];
                }
                mspId = req.user;
                assetId = req.params.assetId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                submitQueue = req.app.locals.jobq;
                return [4 /*yield*/, (0, jobs_1.addSubmitTransactionJob)(submitQueue, mspId, 'UpdateAsset', assetId, req.body.color, req.body.size, req.body.owner, req.body.appraisedValue)];
            case 2:
                jobId = _a.sent();
                return [2 /*return*/, res.status(ACCEPTED).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(ACCEPTED),
                        jobId: jobId,
                        timestamp: new Date().toISOString(),
                    })];
            case 3:
                err_5 = _a.sent();
                logger_1.logger.error({ err: err_5 }, 'Error processing update asset request for asset ID %s', assetId);
                return [2 /*return*/, res.status(INTERNAL_SERVER_ERROR).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(INTERNAL_SERVER_ERROR),
                        timestamp: new Date().toISOString(),
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.assetsRouter.patch('/:assetId', (0, express_validator_1.body)()
    .isArray({
    min: 1,
    max: 1,
})
    .withMessage('body must contain an array with a single patch operation'), (0, express_validator_1.body)('*.op', "operation must be 'replace'").equals('replace'), (0, express_validator_1.body)('*.path', "path must be '/Owner'").equals('/Owner'), (0, express_validator_1.body)('*.value', 'must be a string').isString(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var errors, mspId, assetId, newOwner, submitQueue, jobId, err_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.logger.debug(req.body, 'Transfer asset request received');
                errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    return [2 /*return*/, res.status(BAD_REQUEST).json({
                            status: (0, http_status_codes_1.getReasonPhrase)(BAD_REQUEST),
                            reason: 'VALIDATION_ERROR',
                            message: 'Invalid request body',
                            timestamp: new Date().toISOString(),
                            errors: errors.array(),
                        })];
                }
                mspId = req.user;
                assetId = req.params.assetId;
                newOwner = req.body[0].value;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                submitQueue = req.app.locals.jobq;
                return [4 /*yield*/, (0, jobs_1.addSubmitTransactionJob)(submitQueue, mspId, 'TransferAsset', assetId, newOwner)];
            case 2:
                jobId = _a.sent();
                return [2 /*return*/, res.status(ACCEPTED).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(ACCEPTED),
                        jobId: jobId,
                        timestamp: new Date().toISOString(),
                    })];
            case 3:
                err_6 = _a.sent();
                logger_1.logger.error({ err: err_6 }, 'Error processing update asset request for asset ID %s', req.params.assetId);
                return [2 /*return*/, res.status(INTERNAL_SERVER_ERROR).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(INTERNAL_SERVER_ERROR),
                        timestamp: new Date().toISOString(),
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.assetsRouter.delete('/:assetId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var mspId, assetId, submitQueue, jobId, err_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.logger.debug(req.body, 'Delete asset request received');
                mspId = req.user;
                assetId = req.params.assetId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                submitQueue = req.app.locals.jobq;
                return [4 /*yield*/, (0, jobs_1.addSubmitTransactionJob)(submitQueue, mspId, 'DeleteAsset', assetId)];
            case 2:
                jobId = _a.sent();
                return [2 /*return*/, res.status(ACCEPTED).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(ACCEPTED),
                        jobId: jobId,
                        timestamp: new Date().toISOString(),
                    })];
            case 3:
                err_7 = _a.sent();
                logger_1.logger.error({ err: err_7 }, 'Error processing delete asset request for asset ID %s', assetId);
                return [2 /*return*/, res.status(INTERNAL_SERVER_ERROR).json({
                        status: (0, http_status_codes_1.getReasonPhrase)(INTERNAL_SERVER_ERROR),
                        timestamp: new Date().toISOString(),
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=assets.router.js.map