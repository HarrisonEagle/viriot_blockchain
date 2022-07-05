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

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Contract, Wallet } from "fabric-network";
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from './logger';
import {
  mqttControlBrokerHost,
  mqttControlBrokerPort,
  mqttControlBrokerSVCName,
  mqttDataBrokerHost,
  mqttDataBrokerPort
} from "./config";
import * as k8s from "@kubernetes/client-node";
import * as mqtt from "mqtt";
import {mqttCallBack, onTvOutControlMessage, thingVisorUser} from "./mqttcallback";
import {
  convertEnv,
  convertHostAliases,
  createDeploymentFromYaml,
  createServiceFromYaml,
  ENV,
  ServiceInstance
} from "./k8s";
import { Queue } from "bullmq";
import { addBackgroundJob } from "./jobs";
import { dnsSubdomainConverter } from "./util";
import {jobQueue, mqttClient} from "./index";
import {vThingPrefix} from "./VThing";
import {deleteThingVisorOnKubernetes, inControlSuffix, outControlSuffix, thingVisorPrefix} from "./thingvisor";

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, CONFLICT, UNAUTHORIZED } = StatusCodes;

export const controller = express.Router();
export const MessageOK = "OK";
export const MessageAssetExist = "Asset Exist!";
export const MessageAssetNotExist= "Asset Not Exist!"
export const STATUS_PENDING = "pending";
export const STATUS_RUNNING = "running";
export const STATUS_STOPPING = "stopping";
export const STATUS_STOPPED = "stopped";
export const STATUS_SHUTTING_DOWN = "shutting_down";
export const STATUS_TERMINATED = "terminated";
export const STATUS_READY = "ready";
export const STATUS_ERROR = "error";




// MiddlewareをbodyのVerificationの後に入れないとJSに変換した時エラーが出てしまう
controller.post(
  '/api/assets/',
  body().isObject().withMessage('body must contain an asset object'),
  body('ID', 'must be a string').notEmpty(),
  body('Color', 'must be a string').notEmpty(),
  body('Size', 'must be a number').isNumeric(),
  body('Owner', 'must be a string').notEmpty(),
  body('AppraisedValue', 'must be a number').isNumeric(),
  async (req: Request, res: Response) => {
    logger.debug(req.body, 'Create asset request received');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(BAD_REQUEST).json({
        status: getReasonPhrase(BAD_REQUEST),
        reason: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        timestamp: new Date().toISOString(),
        errors: errors.array(),
      });
    }

    const assetId = req.body.ID;

    try {
      const contract =  res.locals.contract as Contract;
      await contract.submitTransaction(
        'CreateAsset',
        assetId,
        req.body.Color,
        req.body.Size,
        req.body.Owner,
        req.body.AppraisedValue
      );
      return res.status(200).json({
        result: 'OK',
      });

    } catch (err) {
      logger.error(
        { err },
        'Error processing create asset request for asset ID %s',
        assetId
      );
      return res.status(500).json({
        error: err,
      });
    }
  }
);

export interface ChaincodeMessage {
 message : string
}
controller.post('/addThingVisor',
  body('thingVisorID', 'must be a string').notEmpty(),
  body('params', 'must be a string').notEmpty(),
  body('description', 'must be a string').notEmpty(),
  body('debug_mode', 'must be a string').notEmpty(),
  body('tvZone', 'must be a string').notEmpty(),
  body('yamlFiles', 'must be a string').notEmpty(),
  async (req: Request, res: Response) => {
    console.log('Create Thing Visor request received');
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(BAD_REQUEST).json({
          status: getReasonPhrase(BAD_REQUEST),
          reason: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          timestamp: new Date().toISOString(),
          errors: errors.array(),
        });
      }
      const tvId : string = req.body.thingVisorID;
      /*
      const tvIdDns : string = dnsSubdomainConverter(tvId);
      if(tvId != tvIdDns){
        logger.info("Add fails - ThingVisorID must be a subdomain name");
        return res.status(409).json({
          message: "Add fails - ThingVisorID must be a subdomain name, regex('^[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?') - suggested name is: " + tvIdDns
        });
      }*/
      const contract =  res.locals.contract as Contract;
      const userID =  res.locals.userID as string;
      const data = await contract.evaluateTransaction('ThingVisorExists', tvId);
      const cm : ChaincodeMessage = JSON.parse(data.toString());
      if(cm.message == MessageAssetExist){
        return res.status(CONFLICT).json({
          message: `Add fails - thingVisor ${tvId} already exists`
        });
      }
      const thingVisorEntry = {thingVisorID: tvId, status: STATUS_PENDING};
      await contract.submitTransaction('CreateThingVisor', tvId, JSON.stringify(thingVisorEntry));

      const kc = req.app.locals["k8sconfig"] as k8s.KubeConfig;
      const mqttc = res.app.locals["mqtt"] as  mqtt.MqttClient
      await addBackgroundJob(
        jobQueue!,
        "create_thingvisor",
        userID,
        req.body,
      );


      return res.status(OK).json({
        result: "Thing Visor is Starting",
      });
    } catch (err) {
      logger.error({ err }, 'Error processing add thing visor request');
      return res.status(INTERNAL_SERVER_ERROR).json({
        status: getReasonPhrase(INTERNAL_SERVER_ERROR),
        timestamp: new Date().toISOString(),
      });
    }
  });

controller.get('/listThingVisors',
    async (req: Request, res: Response) => {
      console.log('Get all thing visors request received');
      try {
        const contract =  res.locals.contract as Contract;
        const data = await contract.evaluateTransaction('GetAllThingVisors');
        let assets = [];
        if (data.length > 0) {
          assets = JSON.parse(data.toString());
        }

        return res.status(OK).json(assets);
      } catch (err) {
        logger.error({ err }, 'Error processing get all thing visors request');
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: getReasonPhrase(INTERNAL_SERVER_ERROR),
          timestamp: new Date().toISOString(),
        });
      }
});

controller.post('/inspectThingVisor',
    async (req: Request, res: Response) => {
      console.log('Get all thing visors request received');
      try {
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        const tvId : string = req.body.thingVisorID;
        const contract =  res.locals.contract as Contract;
        const data = await contract.evaluateTransaction('GetThingVisor', tvId);
        if(data.toString() === ""){
          return res.status(CONFLICT).json({
            message: `Delete fails - thingVisor ${tvId} not exists`
          });
        }
        const thingVisor = JSON.parse(data.toString());
        return res.status(OK).json(thingVisor);
      } catch (err) {
        logger.error({ err }, 'Error processing get all thing visors request');
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: getReasonPhrase(INTERNAL_SERVER_ERROR),
          timestamp: new Date().toISOString(),
        });
      }
    });

interface VThingTV{
  label: string
  id: string
  description: string
}

controller.post('/deleteThingVisor',
    async (req: Request, res: Response) => {
      console.log('Create Thing Visor request received');
      try {
        const tvId : string = req.body.thingVisorID;
        const contract =  res.locals.contract as Contract;
        const data = await contract.evaluateTransaction('GetThingVisor', tvId);
        if(data.toString() === ""){
          return res.status(CONFLICT).json({
            message: `Delete fails - thingVisor ${tvId} not exists`
          });
        }
        const thingVisor = JSON.parse(data.toString());
        //const thingVisorEntry = {thingVisorID: tvId, status: STATUS_PENDING};
        //await contract.submitTransaction('CreateThingVisor', tvId, JSON.stringify(thingVisorEntry));
        if(req.body.force) {
          const vthingBuffer = await contract.evaluateTransaction('GetAllVThingOfThingVisor', tvId);
          const vThings: VThingTV[] = JSON.parse(vthingBuffer.toString());
          if(thingVisor.vThings.length > 0){
            vThings.map(vThing => {
              const msg = {command: "deleteVThing", vThingID: vThing.id, vSiloID: "ALL"};
              //TODO: VThingを削除するJOBをここに入れる
              mqttClient.publish(`${vThingPrefix}/${vThing.id}/${outControlSuffix}`, JSON.stringify(msg));
            });
          }
          await contract.submitTransaction("DeleteThingVisor", tvId);
          if(!thingVisor.debug_mode){
            await deleteThingVisorOnKubernetes(thingVisor);
          }
          mqttCallBack.delete(`${thingVisorPrefix}/${tvId}/${outControlSuffix}`);
          mqttClient.unsubscribe(`${thingVisorPrefix}/${tvId}/${outControlSuffix}`);
          return res.status(OK).json({
            message: `thingVisor: ${tvId} deleted (force=true)`,
          });
        }
        await contract.submitTransaction('StopThingVisor', tvId);
        const destroyCmd = {command: "destroyTV", thingVisorID: tvId};
        mqttClient.publish(`${thingVisorPrefix}/${tvId}/${inControlSuffix}`, JSON.stringify(destroyCmd).replace("\'", "\""));

        if(thingVisor.debug_mode){
          await contract.submitTransaction("DeleteThingVisor", tvId);
        }
        return res.status(OK).json({
          result:  `thingVisor: ${tvId} deleting (force=true)`,
        });
      } catch (err) {
        logger.error({ err }, 'Error processing add thing visor request');
        return res.status(INTERNAL_SERVER_ERROR).json({
          message: "thingVisor delete fails"
        });
      }
    });



