/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * This is the main entrypoint for the sample REST server, which is responsible
 * for connecting to the Fabric network and setting up a job queue for
 * processing submit transactions
 */

import * as config from './config';
import { buildCAClient, createGateway, createWallet, getContracts, getNetwork } from "./fabric";
import { logger } from './logger';
import { createServer } from './server';
import mongoose from 'mongoose';
import { createClient } from "redis";
import { Wallet } from "fabric-network";
import * as k8s from '@kubernetes/client-node';
import { User } from "./auth";
import bcrypt from "bcrypt";
import * as mqtt from 'mqtt'
import { mqttControlBrokerPort, mqttControlBrokerSVCName } from "./config";
import { getDeployZoneOnKubernetes } from "./util";
import { mqttCallBack } from "./mqttcallback";
import { controller } from "./controller";
import { Queue, QueueScheduler, Worker } from "bullmq";
import { addBackgroundJob, initJobQueue, initJobQueueScheduler, initJobQueueWorker } from "./jobs";


async function createAdmin(){
  logger.info('Creating Admin');
  User.find({userID: config.orgAdminUser},null, async function (err, docs) {
    if (docs.length == 0){
      try {
        const caClient = buildCAClient(config.connectionProfileOrg, config.CA);
        const enrollment = await caClient.enroll({ enrollmentID: config.orgAdminUser, enrollmentSecret: config.orgAdminPW});
        logger.debug('Creating Admin to mongodb');
        const hashedPW = await bcrypt.hash(config.orgAdminPW, 10);
        const user = new User({
          userID: config.orgAdminUser,
          password: hashedPW,
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
          role: "Admin",
        });
        await user.save();
      } catch (err) {
        logger.debug('Failed to Save Admin!');
        throw err;
      }
    }else{
      logger.debug('admin exists! ');
    }
  });
}

export let jobQueue: Queue | undefined;
let jobQueueWorker: Worker | undefined;
let jobQueueScheduler: QueueScheduler | undefined;

export const kc = new k8s.KubeConfig();
//同一ノードじゃないと効かない可能性?
//文字によってはTopicとして使えない?
export const mqttClient = mqtt.connect(`mqtt://${config.mqttControlBrokerSVCName}.${config.mqttControlBrokerHost}:${config.mqttControlBrokerPort}`,{
  clientId: 'viriot-mqtt',
  clean: false,
  keepalive:5000, //必要なかったら消す
  reconnectPeriod: 1000 //必要なかったら消す
})

export let wallet : Wallet | undefined;


// TODO: すべての開発が終わったら CAとPeerのimagePullSecrets:
//             - name: tunaclocred
// を消す
//
// kubectl create secret generic tunaclocred \                                                                                              2022年06月18日 21時01分30秒
//            --from-file=.dockerconfigjson=$HOME/.docker/config.json \
//            --type=kubernetes.io/dockerconfigjson
//
// Mongooseが起動しなくなったらDocker Volumeを確認する
// db.user.find({}, {name:1, _id:0}) _id:0 を指定すると id がmongoDBの結果に出なくなる
async function main() {
  logger.info('Connecting to MongoDB');
  logger.info(`mongodb://localhost:27017/viriotuser`);
  await mongoose.connect(`mongodb://localhost:27017/viriotuser`);
  logger.info('Checking Redis config');

  logger.info('Creating REST server');
  wallet = await createWallet();
  //Gatewayの第2引数にUserIDを渡すべき
  const app = await createServer();

  const blacklist = await createClient({
    url: `redis://localhost:6380`
  });
  await blacklist.connect();
  kc.loadFromDefault();

  //const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
  app.locals["k8sconfig"] = kc;
  /*
  const result = await k8sApi.listPodForAllNamespaces();
  logger.debug(result.response);
  logger.debug(result.body)
  */
  logger.info('Connecting to Fabric network with org1 mspid');
  app.locals["blacklist"] = blacklist;
  await createAdmin();

  logger.info('Initialising submit job queue');
  jobQueue = initJobQueue();
  jobQueueWorker = initJobQueueWorker(app);
  if (config.submitJobQueueScheduler) {
    logger.info('Initialising submit job queue scheduler');
    jobQueueScheduler = initJobQueueScheduler();
  }

  mqttClient.on('connect', () => {
    logger.info("Success to connect MQTT!");
    //mqttClient.subscribe('presence');
    //mqttClient.publish('presence', 'Hello mqtt');
  })
  mqttClient.on('message', async (topic:string, message:Buffer) => {
    if(mqttCallBack.has(topic)){
      const callback = mqttCallBack.get(topic)!;
      await callback(message);
    }else{
      logger.info("received MQTT Topic Message without callback:"+topic.toString())
    }
    logger.info("received MQTT Mesaage:"+message.toString());
  });
  mqttClient.on('error', function(err){
    logger.info("MQTT Got ERROR!");
    logger.info(err);
  });
  app.locals["mqtt"] = mqttClient;
  logger.info('Starting REST server');
  app.listen(config.port, () => {
    logger.info('REST server started on port: %d', config.port);
  });
}

main().catch(async (err) => {
  logger.error({ err }, 'Unxepected error');
});