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
    Contract,
    Gateway,
    GatewayError,
    Network
} from '@hyperledger/fabric-gateway';
import {TextDecoder} from 'util';
import {newGrpcConnection, newIdentity, newSigner} from './connect';
import {
    chaincodeName,
    channelName,
    influxDBHost,
    influxDBMeasurement,
    influxDBName, influxDBPassword,
    influxDBPort,
    influxDBUserName
} from "./config";
import express from 'express'
import {FieldType, InfluxDB} from "influx";

const app: express.Express = express()
let gateway: Gateway | undefined
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const utf8Decoder = new TextDecoder();

const historys = Array();

const influxDB = new InfluxDB({
    host: influxDBHost,
    port: influxDBPort,
    database: influxDBName,
    username: influxDBUserName,
    password: influxDBPassword,
    schema: [{
        measurement: influxDBMeasurement,
        fields: {
            start_node: FieldType.STRING,
            end_node: FieldType.STRING,
            requests: FieldType.INTEGER
        },
        tags: [
            'user'
        ]
    }]
})

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
        // Listen for events emitted by subsequent transactions
        events = await startEventListening(network);
        // Replay events from the block containing the first transaction
        await replayChaincodeEvents(network);
    }
    finally {
        events?.close();
        gateway.close();
    }
})
async function startEventListening(network: Network): Promise<CloseableAsyncIterable<ChaincodeEvent> | undefined> {
    try{
        console.log('\n*** Start chaincode event listening');

        const events = await network.getChaincodeEvents(chaincodeName);

        void readEvents(events); // Don't await - run asynchronously
        return events;
    }catch (e){
        console.log(e)
        return undefined;
    }
}

async function readEvents(events: CloseableAsyncIterable<ChaincodeEvent>): Promise<void> {
    try {
        for await (const event of events) {
            const payload = parseHistory(event.payload);
            console.log(`\n<-- Chaincode event received: ${event.eventName} -`, payload);
            for(const node of payload.graph_nodes) {
                const result = await influxDB.query(`
                    select * from ${influxDBMeasurement} where start_node = $start_node and end_node = $end_node
                `, {
                    placeholders: {
                        start_node: node.start_node,
                        end_node: node.end_node,
                    }
                })
                await influxDB.writePoints([{
                    measurement: influxDBMeasurement,
                    tags: {user: payload.user_id},
                    fields: {start_node: node.start_node, end_node: node.end_node, requests: result.length}
                }
                ])
            }

        }
    } catch (error: unknown) {
        // Ignore the read error when events.close() is called explicitly
        if (!(error instanceof GatewayError) || error.code !== grpc.status.CANCELLED) {
            throw error;
        }
    }
}

interface History {
    event_name: string
    time: string
    tx_id: string
    user_id: string
    user_mspid: string
    graph_nodes: {
        start_node: string
        end_node: string
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
