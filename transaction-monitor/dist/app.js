"use strict";
/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fabric_gateway_1 = require("@hyperledger/fabric-gateway");
const util_1 = require("util");
const connect_1 = require("./connect");
const config_1 = require("./config");
const express_1 = __importDefault(require("express"));
const redis_1 = require("redis");
const app = (0, express_1.default)();
let gateway;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const utf8Decoder = new util_1.TextDecoder();
const historys = Array();
const format = {
    edges_fields: [
        {
            "field_name": "id",
            "type": "string"
        },
        {
            "field_name": "source",
            "type": "string"
        },
        {
            "field_name": "target",
            "type": "string"
        },
        {
            "field_name": "mainStat",
            "type": "string"
        }
    ],
    nodes_fields: [
        {
            "field_name": "id",
            "type": "string"
        },
        {
            "field_name": "title",
            "type": "string"
        },
        {
            "field_name": "mainStat",
            "type": "string"
        },
        {
            "color": "red",
            "displayName": "Deleted",
            "field_name": "arc__deleted",
            "type": "number"
        },
        {
            "color": "green",
            "displayName": "Organization Provider",
            "field_name": "arc__org_provider",
            "type": "number"
        },
        {
            "color": "azure",
            "displayName": "User",
            "field_name": "arc__user",
            "type": "number"
        },
        {
            "color": "blue",
            "displayName": "ThingVisor",
            "field_name": "arc__thingvisor",
            "type": "number"
        },
        {
            "color": "lightseagreen",
            "displayName": "vThing",
            "field_name": "arc__vthing",
            "type": "number"
        },
        {
            "color": "blueviolet",
            "displayName": "Flavour",
            "field_name": "arc__flavour",
            "type": "number"
        },
        {
            "color": "darkseagreen",
            "displayName": "VirtualSilo",
            "field_name": "arc__vsilo",
            "type": "number"
        },
        {
            "color": "yellow",
            "displayName": "Organization Consumer",
            "field_name": "arc__org_consumer",
            "type": "number"
        }
    ]
};
const logCache = (0, redis_1.createClient)({
    url: `redis://localhost:6379`
});
app.get('/api/health', async (req, res) => {
    return res.status(200).json({});
});
app.get('/', async (req, res) => {
    return res.status(200).json({});
});
app.get('/api/graph/fields', async (req, res) => {
    return res.status(200).json(format);
});
app.get('/api/graph/data', async (req, res) => {
    const logs = await logCache.LRANGE("log-cache", 0, -1);
    /// TODO: USE Redis to cache in better way and refactor
    const nodes = new Map();
    const edges = new Map();
    const start_time = req.query["start_time"];
    const end_time = req.query["end_time"];
    for (const element of logs) {
        const transaction = JSON.parse(element);
        const time = new Date(Number(transaction.time.split(/\s+/)[0].replace("seconds:", "")) * 1000);
        if (start_time && time.getTime() < Date.parse(start_time) || (end_time && time.getTime() > Date.parse(end_time))) {
            break;
        }
        for (const data of transaction.graph_data) {
            nodes.set(data.source, {
                id: data.source,
                title: data.source,
                arc__deleted: data.source_type === "deleted" ? 1 : 0,
                arc__org_provider: data.source_type === "org-provider" ? 1 : 0,
                arc__user: data.source_type === "user" ? 1 : 0,
                arc__thingvisor: data.source_type === "thingvisor" ? 1 : 0,
                arc__vthing: data.source_type === "vthing" ? 1 : 0,
                arc__flavour: data.source_type === "flavour" ? 1 : 0,
                arc__vsilo: data.source_type === "virtualsilo" ? 1 : 0,
                arc__org_consumer: data.source_type === "org-consumer" ? 1 : 0,
            });
            nodes.set(data.target, {
                id: data.target,
                title: data.target,
                arc__deleted: data.target_type === "deleted" ? 1 : 0,
                arc__org_provider: data.target_type === "org-provider" ? 1 : 0,
                arc__user: data.target_type === "user" ? 1 : 0,
                arc__thingvisor: data.target_type === "thingvisor" ? 1 : 0,
                arc__vthing: data.target_type === "vthing" ? 1 : 0,
                arc__flavour: data.target_type === "flavour" ? 1 : 0,
                arc__vsilo: data.target_type === "virtualsilo" ? 1 : 0,
                arc__org_consumer: data.target_type === "org-consumer" ? 1 : 0,
            });
            if (data.target_type !== "deleted") {
                const edge_key = data.source + "-" + data.target;
                const edge = edges.get(edge_key) ?? {
                    id: edge_key,
                    source: data.source,
                    target: data.target,
                    mainStat: 0 + " requests",
                    transaction_logs: []
                };
                const transaction_log = {
                    time: time,
                    tx_id: transaction.tx_id,
                    user_id: transaction.user_id,
                    user_mspid: transaction.user_mspid
                };
                edge.transaction_logs.push(transaction_log);
                edge.mainStat = edge.transaction_logs.length + " requests";
                edges.set(edge_key, edge);
            }
        }
    }
    return res.status(200).json({
        edges: Array.from(edges.values()),
        nodes: Array.from(nodes.values())
    });
});
app.get('/api/history', async (req, res) => {
    return res.status(200).json(historys);
});
app.listen(3000, async () => {
    console.log("Start on port 3000.");
    const client = await (0, connect_1.newGrpcConnection)();
    await logCache.connect();
    await logCache.FLUSHDB();
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
        await listenChaincodeEvents(network);
    }
    finally {
        events?.close();
        gateway.close();
    }
});
function parseHistory(jsonBytes) {
    const json = utf8Decoder.decode(jsonBytes);
    return JSON.parse(json);
}
async function listenChaincodeEvents(network) {
    const events = await network.getChaincodeEvents(config_1.chaincodeName, { startBlock: BigInt(0) }); // 0 to replay all
    try {
        console.log('\n*** Start chaincode event replay ');
        for await (const event of events) {
            console.log("Parsing events");
            const payload = parseHistory(event.payload);
            await logCache.RPUSH("log-cache", JSON.stringify(payload));
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