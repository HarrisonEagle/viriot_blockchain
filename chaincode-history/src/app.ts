/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as grpc from '@grpc/grpc-js';
import { ChaincodeEvent, CloseableAsyncIterable, connect, Contract, GatewayError, Network, Gateway } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { newGrpcConnection, newIdentity, newSigner } from './connect';
import {chaincodeName, channelName} from "./config";
import express from 'express'
const app: express.Express = express()
let gateway: Gateway | undefined
let firstBlockNumber = BigInt(0)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const utf8Decoder = new TextDecoder();

app.get('/history', async (req: express.Request, res: express.Response) => {
    const network = gateway!.getNetwork(channelName);
    const results = await replayChaincodeEvents(network);
    console.log("returning")
    return res.status(200).json(results);
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
        const contract = network.getContract(chaincodeName);

        firstBlockNumber = await createAsset(contract);
        console.log(`first block number ${firstBlockNumber}`)
        // Listen for events emitted by subsequent transactions
        events = await startEventListening(network);
        // Replay events from the block containing the first transaction
        //await replayChaincodeEvents(network);
    }
    finally {
        events?.close();
        gateway.close();
    }
})

async function createAsset(contract: Contract): Promise<bigint> {

    const result = await contract.submitAsync('GetAllThingVisors' );
    const status = await result.getStatus();
    if (!status.successful) {
        throw new Error(`failed to commit transaction ${status.transactionId} with status code ${status.code}`);
    }
    console.log('\n*** CreateAsset committed successfully');

    return status.blockNumber;
}

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

async function readEvents(events: CloseableAsyncIterable<ChaincodeEvent>): Promise<void> {
    try {
        for await (const event of events) {
            const payload = parseJson(event.payload);
            console.log(`\n<-- Chaincode event received: ${event.eventName} -`, payload);
        }
    } catch (error: unknown) {
        // Ignore the read error when events.close() is called explicitly
        if (!(error instanceof GatewayError) || error.code !== grpc.status.CANCELLED) {
            throw error;
        }
    }
}

function parseJson(jsonBytes: Uint8Array): unknown {
    const json = utf8Decoder.decode(jsonBytes);
    return JSON.parse(json);
}


async function replayChaincodeEvents(network: Network){
    const events = await network.getChaincodeEvents(chaincodeName, { startBlock: BigInt(0) }); // 0 to replay all
    try {
        console.log('\n*** Start chaincode event replay ');
        let result = []
        for await (const event of events) {
            console.log("Parsing events")
            const payload = parseJson(event.payload);
            result.push(payload)
            console.log(`\n<-- Chaincode event replayed: ${event.eventName} -`, payload);
        }
        console.log("*** finished replay chaincode events")
        return result
    } catch (e) {
        console.log(e)
    }finally {
        events.close();
    }
}
