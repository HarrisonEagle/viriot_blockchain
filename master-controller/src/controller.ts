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
import { mqttCallBack, onTvOutControlMessage } from "./mqttcallback";
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

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } = StatusCodes;

export const controller = express.Router();

controller.get('/api/assets/',
  async (req: Request, res: Response) => {
  console.log('Get all assets request received');
  try {
    const contract =  res.locals.contract as Contract;
    const data = await contract.evaluateTransaction('GetAllAssets');
    let assets = [];
    if (data.length > 0) {
      assets = JSON.parse(data.toString());
    }

    return res.status(OK).json(assets);
  } catch (err) {
    logger.error({ err }, 'Error processing get all assets request');
    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

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
      const wallet = res.app.locals["wallet"] as Wallet;
      if (!errors.isEmpty()) {
        return res.status(BAD_REQUEST).json({
          status: getReasonPhrase(BAD_REQUEST),
          reason: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          timestamp: new Date().toISOString(),
          errors: errors.array(),
        });
      }
      const mqttDataBroker = {
        ip: mqttDataBrokerHost,
        port: mqttDataBrokerPort
      };
      const mqttControlBroker = {
        ip: `${mqttControlBrokerSVCName}.${mqttControlBrokerHost}`,
        port: mqttControlBrokerPort
      };
      const thingVisorEntry = {
        creationTime: new Date().toISOString(),
        tvDescription: req.body.description,
        imageName: req.body.imageName,
        debug_mode: req.body.debug_mode,
        vThings: [],
        params: req.body.params,
        MQTTDataBroker: mqttDataBroker,
        MQTTControlBroker: mqttControlBroker,
        //IP: default_gateway_IP,
      }
      const kc = req.app.locals["k8sconfig"] as k8s.KubeConfig;
      const mqttc = res.app.locals["mqtt"] as  mqtt.MqttClient;
      const submitQueue = req.app.locals.jobq as Queue;
      await addBackgroundJob(
        submitQueue,
        "create_thingvisor",
        req.body
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




