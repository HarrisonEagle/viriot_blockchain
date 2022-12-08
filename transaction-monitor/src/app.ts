/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as grpc from '@grpc/grpc-js';
import {
    ChaincodeEvent,
    CloseableAsyncIterable,
    connect,
    Gateway,
    Network
} from '@hyperledger/fabric-gateway';
import {TextDecoder} from 'util';
import {newGrpcConnection, newIdentity, newSigner} from './connect';
import {
    chaincodeName,
    channelName,
} from "./config";
import express from 'express'
import {createClient, RedisClientType} from "redis";

const app: express.Express = express()
let gateway: Gateway | undefined
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const utf8Decoder = new TextDecoder();

const historys = Array();

interface ContentFormat {
    edges_fields: {
        field_name: string,
        type: string
    }[]
    nodes_fields: {
        displayName?: string
        field_name: string,
        type: string
        color?: string
    }[]
}

interface Edge {
    id: string,
    source: string,
    target: string,
    mainStat: string,
    transaction_logs: TransactionLog[]
}

interface Node {
    id: string,
    title: string,
    arc__deleted?: number,
    arc__org_provider?: number,
    arc__user?: number,
    arc__thingvisor?: number,
    arc__vthing?: number,
    arc__flavour?: number,
    arc__vsilo?: number,
    arc__org_consumer?: number,
}

const format: ContentFormat = {
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

}

const logCache = createClient({
    url: `redis://localhost:6379`
});

app.get('/api/health', async (req: express.Request, res: express.Response) => {
    return res.status(200).json({});
})

app.get('/', async (req: express.Request, res: express.Response) => {
    return res.status(200).json({});
})


app.get('/api/graph/fields', async (req: express.Request, res: express.Response) => {
    return res.status(200).json(format);
})

interface Transaction {
    event_name: string
    time: string
    tx_id: string
    user_id: string
    user_mspid: string
    graph_data: {
        source: string
        source_type: "org-provider" | "user" | "deleted" | "thingvisor" | "vthing" | "flavour" | "virtualsilo" | "org-consumer"
        target: string
        target_type: "org-provider" | "user" | "deleted" | "thingvisor" | "vthing" | "flavour" | "virtualsilo" | "org-consumer"
    }[]
}

interface TransactionLog {
    time: Date
    tx_id: string
    user_id: string
    user_mspid: string

}

app.get('/api/graph/data', async (req: express.Request, res: express.Response) => {
    const logs = await logCache.LRANGE("log-cache",0, -1)
    /// TODO: USE Redis to cache in better way and refactor
    const nodes = new Map<string, Node>();
    const edges = new Map<string, Edge>();
    const start_time = req.query["start_time"]
    const end_time = req.query["end_time"]
    for(const element of logs) {
        const transaction: Transaction = JSON.parse(element);
        const time = new Date(Number(transaction.time.split(/\s+/)[0].replace("seconds:", "")) * 1000)
        if(start_time && time.getTime() < Date.parse(start_time as string) || (end_time && time.getTime() > Date.parse(end_time as string))){
            break
        }
        for(const data of transaction.graph_data){
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
            })
            nodes.set(data.target, {
                id: data.target,
                title: data.target,
                arc__deleted: data.target_type === "deleted" ? 1 : 0,
                arc__org_provider: data.target_type=== "org-provider" ? 1 : 0,
                arc__user: data.target_type === "user" ? 1 : 0,
                arc__thingvisor: data.target_type === "thingvisor" ? 1 : 0,
                arc__vthing: data.target_type === "vthing" ? 1 : 0,
                arc__flavour: data.target_type === "flavour" ? 1 : 0,
                arc__vsilo: data.target_type === "virtualsilo" ? 1 : 0,
                arc__org_consumer: data.target_type === "org-consumer" ? 1 : 0,
            })
            if(data.target_type !== "deleted"){
                const edge_key = data.source + "-" + data.target
                const edge = edges.get(edge_key) ?? {
                    id: edge_key,
                    source: data.source,
                    target: data.target,
                    mainStat: 0+" requests",
                    transaction_logs: []
                }
                const transaction_log: TransactionLog = {
                    time: time,
                    tx_id: transaction.tx_id,
                    user_id: transaction.user_id,
                    user_mspid: transaction.user_mspid
                }
                edge.transaction_logs.push(transaction_log)
                edge.mainStat = edge.transaction_logs.length+ " requests"
                edges.set(edge_key, edge)
            }
        }
    }
    return res.status(200).json({
        edges: Array.from(edges.values()),
        nodes: Array.from(nodes.values())
    });
})
app.get('/api/history', async (req: express.Request, res: express.Response) => {
    return res.status(200).json(historys);
})

app.listen(3000, async () => {
    console.log("Start on port 3000.")
    const client = await newGrpcConnection();
    await logCache.connect()
    await logCache.FLUSHDB()
    gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        evaluateOptions: () => {
            return {deadline: Date.now() + 5000}; // 5 seconds
        },
        endorseOptions: () => {
            return {deadline: Date.now() + 15000}; // 15 seconds
        },
        submitOptions: () => {
            return {deadline: Date.now() + 5000}; // 5 seconds
        },
        commitStatusOptions: () => {
            return {deadline: Date.now() + 60000}; // 1 minute
        },
    });
    let events: CloseableAsyncIterable<ChaincodeEvent> | undefined;

    try {
        const network = gateway.getNetwork(channelName);
        await listenChaincodeEvents(network);
    } finally {
        events?.close();
        gateway.close();
    }
})

interface History {
    event_name: string
    time: string
    tx_id: string
    user_id: string
    user_mspid: string
    graph_nodes: {
        start_node: string
        end_node: string
        delete: boolean
    }[]
}

function parseHistory(jsonBytes: Uint8Array): History {
    const json = utf8Decoder.decode(jsonBytes);
    return JSON.parse(json);
}


async function listenChaincodeEvents(network: Network) {
    const events = await network.getChaincodeEvents(chaincodeName, {startBlock: BigInt(0)}); // 0 to replay all
    try {
        console.log('\n*** Start chaincode event replay ');
        for await (const event of events) {
            console.log("Parsing events")
            const payload = parseHistory(event.payload);
            await logCache.RPUSH("log-cache", JSON.stringify(payload))
            console.log(`\n<-- Chaincode event replayed: ${event.eventName} -`, payload);
        }
        console.log("*** finished replay chaincode events")
    } catch (e) {
        console.log(e)
    } finally {
        events.close();
    }
}
