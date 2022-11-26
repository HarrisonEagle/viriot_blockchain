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
import {FieldType, InfluxDB} from "influx";

let gateway: Gateway | undefined

const utf8Decoder = new TextDecoder();

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


async function main(): Promise<void> {
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
    }
    finally {
        events?.close();
        gateway.close();
    }
}

main().catch(error => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

async function startEventListening(network: Network): Promise<CloseableAsyncIterable<ChaincodeEvent> | undefined> {
    try{
        console.log('\n*** Start chaincode event listening');

        const events = await network.getChaincodeEvents(chaincodeName);

        await readEvents(events); // Don't await - run asynchronously
        return events;
    }catch (e){
        console.log(e)
        return undefined;
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
        delete: boolean
    }[]
}

async function readEvents(events: CloseableAsyncIterable<ChaincodeEvent>): Promise<void> {
    try {
        for await (const event of events) {
            const payload = parseHistory(event.payload);
            console.log(`\n<-- Chaincode event received: ${event.eventName} -`, payload);
            for(const node of payload.graph_nodes) {

                const results = await influxDB.query(`
                    select * from ${influxDBMeasurement} where start_node = $start_node and end_node = $end_node
                `, {
                    placeholders: {
                        start_node: node.start_node,
                        end_node: node.end_node,
                    }
                })
                //物理削除:DELETE FROM "viriot_blockchain_history" WHERE time = '2022-11-26T05:33:04.411'
                await influxDB.writePoints([{
                    measurement: influxDBMeasurement,
                    tags: {user: payload.user_id},
                    fields: node.delete ? {start_node: node.start_node, end_node: node.end_node} :{start_node: node.start_node, end_node: node.end_node, requests: results.length + 1}
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

function parseHistory(jsonBytes: Uint8Array) : History{
    const json = utf8Decoder.decode(jsonBytes);
    return JSON.parse(json);
}