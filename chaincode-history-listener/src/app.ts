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
    mainStat: number,
}

interface Node {
    id: string,
    title: string,
    mainStat: string,
    arc__deleted?: number,
    arc__org_provider?: number,
    arc__user?: number,
    arc__thingvisor?: number,
    arc__vthing?: number,
    arc__flavour?: number,
    arc__vsilo?: number,
    arc__org_consumer?: number,
}

app.get('/api/health', async (req: express.Request, res: express.Response) => {
    return res.status(200).json({});
})

app.get('/', async (req: express.Request, res: express.Response) => {
    return res.status(200).json({});
})


app.get('/api/graph/fields', async (req: express.Request, res: express.Response) => {
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
                "type": "number"
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
                "color": "lime",
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
                "color": "cyan",
                "displayName": "Organization Consumer",
                "field_name": "arc__org_consumer",
                "type": "number"
            }
        ]

    }
    return res.status(200).json(format);
})

app.get('/api/graph/data', async (req: express.Request, res: express.Response) => {
    return res.status(200).json({
        "edges": [
            {
                "id": "1",
                "mainStat": "53 requests",
                "source": "1",
                "target": "2"
            }
        ],
        "nodes": [
            {
                "arc__org_provider": 1,
                "id": "1",
                "subTitle": "instance:#2",
                "title": "Service1"
            },
            {
                "arc__deleted": 1,
                "id": "2",
                "subTitle": "instance:#3",
                "title": "Service2"
            }
        ]
    });
})
app.get('/api/history', async (req: express.Request, res: express.Response) => {
    return res.status(200).json(historys);
})

app.listen(3000, async () => {
    console.log("Start on port 3000.")
    const client = await newGrpcConnection();
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
        await replayChaincodeEvents(network);
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


async function replayChaincodeEvents(network: Network) {
    const events = await network.getChaincodeEvents(chaincodeName, {startBlock: BigInt(0)}); // 0 to replay all
    try {
        console.log('\n*** Start chaincode event replay ');
        for await (const event of events) {
            console.log("Parsing events")
            const payload = parseHistory(event.payload);
            historys.push(payload)
            console.log(`\n<-- Chaincode event replayed: ${event.eventName} -`, payload);
        }
        console.log("*** finished replay chaincode events")
    } catch (e) {
        console.log(e)
    } finally {
        events.close();
    }
}
