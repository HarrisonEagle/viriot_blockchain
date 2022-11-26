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
app.use(express.urlencoded({ extended: true }))

const utf8Decoder = new TextDecoder();

const historys = Array();

app.get('/history', async (req: express.Request, res: express.Response) => {
    return res.status(200).json(historys);
})

app.listen(3000,  async () => {
    console.log("Start on port 3000.")
    const client = await newGrpcConnection();
    gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
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
    let events: CloseableAsyncIterable<ChaincodeEvent> | undefined;

    try {
        const network = gateway.getNetwork(channelName);
        await replayChaincodeEvents(network);
    }
    finally {
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

function parseHistory(jsonBytes: Uint8Array) : History{
    const json = utf8Decoder.decode(jsonBytes);
    return JSON.parse(json);
}


async function replayChaincodeEvents(network: Network){
    const events = await network.getChaincodeEvents(chaincodeName, { startBlock: BigInt(0) }); // 0 to replay all
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
    }finally {
        events.close();
    }
}
