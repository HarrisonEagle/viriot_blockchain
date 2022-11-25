"use strict";
/*
 * Copyright IBM Corp. All Rights Reserved.
 *
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc = __importStar(require("@grpc/grpc-js"));
const fabric_gateway_1 = require("@hyperledger/fabric-gateway");
const util_1 = require("util");
const connect_1 = require("./connect");
const config_1 = require("./config");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
let gateway;
let firstBlockNumber = BigInt(0);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const utf8Decoder = new util_1.TextDecoder();
const historys = Array();
app.get('/history', async (req, res) => {
    return res.status(200).json(historys);
});
app.listen(3000, async () => {
    console.log("Start on port 3000.");
    const client = await (0, connect_1.newGrpcConnection)();
    gateway = (0, fabric_gateway_1.connect)({
        client,
        identity: await (0, connect_1.newIdentity)(),
        signer: await (0, connect_1.newSigner)(),
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });
    let events;
    try {
        const network = gateway.getNetwork(config_1.channelName);
        const contract = network.getContract(config_1.chaincodeName);
        firstBlockNumber = await createAsset(contract);
        console.log(`first block number ${firstBlockNumber}`);
        // Listen for events emitted by subsequent transactions
        events = await startEventListening(network);
        // Replay events from the block containing the first transaction
        await replayChaincodeEvents(network);
    }
    finally {
        events?.close();
        gateway.close();
    }
});
async function createAsset(contract) {
    const result = await contract.submitAsync('GetAllThingVisors');
    const status = await result.getStatus();
    if (!status.successful) {
        throw new Error(`failed to commit transaction ${status.transactionId} with status code ${status.code}`);
    }
    console.log('\n*** CreateAsset committed successfully');
    return status.blockNumber;
}
async function startEventListening(network) {
    try {
        console.log('\n*** Start chaincode event listening');
        const events = await network.getChaincodeEvents(config_1.chaincodeName);
        await readEvents(events); // Don't await - run asynchronously
        return events;
    }
    catch (e) {
        console.log(e);
        return undefined;
    }
}
async function readEvents(events) {
    try {
        for await (const event of events) {
            const payload = parseJson(event.payload);
            historys.push(payload);
            console.log(`\n<-- Chaincode event received: ${event.eventName} -`, payload);
        }
    }
    catch (error) {
        // Ignore the read error when events.close() is called explicitly
        if (!(error instanceof fabric_gateway_1.GatewayError) || error.code !== grpc.status.CANCELLED) {
            throw error;
        }
    }
}
function parseJson(jsonBytes) {
    const json = utf8Decoder.decode(jsonBytes);
    return JSON.parse(json);
}
async function replayChaincodeEvents(network) {
    const events = await network.getChaincodeEvents(config_1.chaincodeName, { startBlock: BigInt(0) }); // 0 to replay all
    try {
        console.log('\n*** Start chaincode event replay ');
        for await (const event of events) {
            console.log("Parsing events");
            const payload = parseJson(event.payload);
            historys.push(payload);
            console.log(`\n<-- Chaincode event replayed: ${event.eventName} -`, payload);
        }
        console.log("*** finished replay chaincode events");
    }
    catch (e) {
        console.log(e);
    }
    finally {
        events.close();
    }
}
//# sourceMappingURL=app.js.map