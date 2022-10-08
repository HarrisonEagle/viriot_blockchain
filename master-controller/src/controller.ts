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
import { Contract } from "fabric-network";
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from './logger';
import {mqttCallBack,} from "./mqttcallback";
import { addBackgroundJob } from "./jobs";
import {jobQueue, mqttClient} from "./index";
import {vThingPrefix} from "./VThing";
import {deleteThingVisorOnKubernetes, inControlSuffix, outControlSuffix, thingVisorPrefix} from "./thingvisor";
import {getDeployZoneOnKubernetes} from "./k8s";
import {defaultDeployZone} from "./config";

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, CONFLICT, UNAUTHORIZED } = StatusCodes;

export const controller = express.Router();
export const STATUS_PENDING = "pending";
export const STATUS_RUNNING = "running";
export const STATUS_STOPPING = "stopping";
export const STATUS_STOPPED = "stopped";
export const STATUS_SHUTTING_DOWN = "shutting_down";
export const STATUS_TERMINATED = "terminated";
export const STATUS_READY = "ready";
export const STATUS_ERROR = "error";

// MiddlewareをbodyのVerificationの後に入れないとJSに変換した時エラーが出てしまう

/// APIs for ThingVisors
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
      const userRes = res.locals.user;
      if(userRes.role != "Admin"){
        logger.debug("User role is Not Admin!");
        return res.status(UNAUTHORIZED).json({
          message: "operation not allowed"
        });
      }
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
      const thingVisorEntry = {thingVisorID: tvId, status: STATUS_PENDING, additionalServicesNames: [], vThings: [], additionalDeploymentsNames: []};
      await contract.submitTransaction('CreateThingVisor', tvId, JSON.stringify(thingVisorEntry));

      await addBackgroundJob(
        jobQueue!,
        "create_thingvisor",
        userID,
        req.body,
      )
      return res.status(OK).json({
        result: "Thing Visor is Starting",
      });
    } catch (err) {
      const error = err as FabricError
      logger.error({ err }, 'Error processing add thing visor request');
      if(error.responses){
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
      }
      return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  });

controller.post('/updateThingVisor',
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
        const tvDescription : string = req.body.description ? req.body.description : "";
        const tvParams : string = req.body.params ? req.body.params : "";
        const tvID : string = req.body.thingVisorID;
        const userID =  res.locals.userID as string;
        const updateInfo: string = req.body.updateInfo ? req.body.updateInfo : "";
        const contract =  res.locals.contract as Contract;
        await contract.evaluateTransaction('GetThingVisor', tvID);
        const thingVisorEntry = {thingVisorID: tvID, tvDescription: "", params: ""};
        thingVisorEntry.tvDescription = tvDescription;
        thingVisorEntry.params = JSON.stringify(tvParams);
        if(thingVisorEntry.tvDescription !== "" || thingVisorEntry.params !== ""){
          //Update
          await addBackgroundJob(
              jobQueue!,
              "update_thingvisor",
              userID,
              thingVisorEntry,
          );
        }
        const updateCMD = {
          command: "updateTV",
          thingVisorID: tvID,
          tvDescription: tvDescription,
          params: tvParams,
          updateInfo: updateInfo
        }
        mqttClient.publish(`${thingVisorPrefix}/${tvID}/${inControlSuffix}`, JSON.stringify(updateCMD));

        return res.status(OK).json({
          message: `updating thingVisor ${tvID}`
        });
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing get all thing visors request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.get('/listThingVisors',
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
        const contract =  res.locals.contract as Contract;
        const data = await contract.evaluateTransaction('GetAllThingVisors');
        let assets = [];
        if (data.length > 0) {
          assets = JSON.parse(data.toString());
        }

        return res.status(OK).json(assets);
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing get all thing visors request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
});

controller.get('/listVThings',
    async (req: Request, res: Response) => {
      console.log('Get all thing visors request received');
      try {
        const contract =  res.locals.contract as Contract;
        const data = await contract.evaluateTransaction('GetAllVThings');
        let assets = [];
        if (data.length > 0) {
          assets = JSON.parse(data.toString());
        }
        return res.status(OK).json(assets);
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing get all vthings request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.post('/inspectThingVisor',
    body('thingVisorID', 'must be a string').notEmpty(),
    async (req: Request, res: Response) => {
      console.log('Get all thing visors request received');
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
        const thingVisor = JSON.parse(data.toString());
        return res.status(OK).json(thingVisor);
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing inspect thing visors request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

export interface VThingTV{
  label: string
  id: string
  description: string
}

export interface VThingTVWithKey{
  key: string
  vThing: VThingTV
}

export interface FabricError {
  stack: string
  message: string
  responses: {
    version:number
    response: {
      status: number
      message: string
    }
  }[]
}


controller.post('/deleteThingVisor',
    async (req: Request, res: Response) => {
      console.log('Create Thing Visor request received');
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
        const data = await contract.evaluateTransaction('GetThingVisorWithVThingKeys', tvId);
        const thingVisor = JSON.parse(data.toString());
        if(req.body.force) {
          const vThings: VThingTVWithKey[] = thingVisor.vThings;
          const vThingKeys = (thingVisor.vThings.length > 0) ? vThings.map(element => {
            const msg = {command: "deleteVThing", vThingID: element.vThing.id, vSiloID: "ALL"};
            mqttClient.publish(`${vThingPrefix}/${element.vThing.id}/${outControlSuffix}`, JSON.stringify(msg));
            return element.key
          }) : [];
          await contract.submitTransaction("DeleteThingVisor", tvId, ...vThingKeys);
          if(!thingVisor.debug_mode){
            await deleteThingVisorOnKubernetes(thingVisor.thingVisor);
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
          result:  `thingVisor: ${tvId} deleting (force=false)`,
        });
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing add thing visor request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

/// APIs for Flavours

controller.post('/addFlavour',
    body('flavourID', 'must be a string').notEmpty(),
    body('flavourParams', 'must be a string').notEmpty(),
    body('flavourDescription', 'must be a string').notEmpty(),
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
        const flavourID: string  = req.body.flavourID;
        const userID =  res.locals.userID as string;
        const contract =  res.locals.contract as Contract;
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        await contract.submitTransaction('AddFlavour', flavourID);
        await addBackgroundJob(
            jobQueue!,
            "create_flavour",
            userID,
            req.body,
        );
        return res.status(OK).json({
          result: `Creating flavour ${flavourID}`,
        });
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing add flavour request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.get('/listFlavours',
    async (req: Request, res: Response) => {
      console.log('Get all flavours request received');
      try {
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        const contract =  res.locals.contract as Contract;
        const data = await contract.evaluateTransaction('GetAllFlavours');
        const assets =  (data.length > 0)  ? JSON.parse(data.toString()) : [];
        return res.status(OK).json(assets);
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error processing get all flavours request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.post('/inspectFlavour',
    body('flavourID', 'must be a string').notEmpty(),
    async (req: Request, res: Response) => {
      console.log('Get flavours request received');
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
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        const flavourID: string  = req.body.flavourID;
        const contract =  res.locals.contract as Contract;
        const data = await contract.evaluateTransaction('GetFlavour', flavourID);
        const thingVisor = JSON.parse(data.toString());
        return res.status(OK).json(thingVisor);
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing get all thing visors request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.post('/deleteFlavour',
    body('flavourID', 'must be a string').notEmpty(),
    async (req: Request, res: Response) => {
      console.log('Get flavours request received');
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
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        const flavourID: string  = req.body.flavourID;
        const contract =  res.locals.contract as Contract;
        await contract.submitTransaction('DeleteFlavour', flavourID);
        return res.status(OK).json({
          result: `Flavour ${flavourID} deleted.`
        });
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing get all thing visors request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

/// APIs for VirtualSilos

controller.post('/siloCreate',
    body('tenantID', 'must be a string').notEmpty(),
    body('vSiloName', 'must be a string').notEmpty(),
    body('flavourID', 'must be a string').notEmpty(),
    body('debug_mode', 'must be a string').notEmpty(),
    async (req: Request, res: Response) => {
      console.log('Create Virtual Silo request received');
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
        const tenantID : string = req.body.tenantID;
        const flavourID : string = req.body.flavourID;
        const vSiloName : string = req.body.vSiloName;
        const vSiloZone : string = req.body.vSiloZone;
        const vSiloID = tenantID + "_" + req.body.vSiloName;
        const userRes = res.locals.user;
        const userID =  res.locals.userID as string;
        const debugMode = req.body.debug_mode
        if(userRes.role != "Admin" && userID != tenantID){
          logger.debug("Permission denined!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        let deployZone : {zone: string, gw: string | undefined, keys: IterableIterator<string>} | {keys: IterableIterator<string>, zone?: undefined, gw?: undefined} | {zone: string} = {zone: defaultDeployZone}
        if(vSiloZone && vSiloZone !== ""){
          const zone = await getDeployZoneOnKubernetes(vSiloZone)
          if(!zone.zone){
            return res.status(UNAUTHORIZED).json({
              message: `Silo create fails, zone ${vSiloZone} is not available `
            });
          }
          /*
          if(!zone.gw){
            return res.status(UNAUTHORIZED).json({
              message: `Silo create fails, gateway for zone ${vSiloZone} is not defined!`
            });
          }*/
          deployZone = zone
        }
        const contract =  res.locals.contract as Contract;
        const flavour = JSON.parse((await contract.evaluateTransaction('GetFlavour', flavourID)).toString());
        await contract.submitTransaction('AddVirtualSilo', vSiloID)
        await addBackgroundJob(
            jobQueue!,
            "create_vsilo",
            userID,
            {
              vSiloID: vSiloID,
              vSiloName: vSiloName,
              tenantID: tenantID,
              flavourParams: flavour.flavourParams,
              debugMode: debugMode,
              flavourImageName: flavour.imageName,
              flavourID: flavour.flavourID,
              yamlFiles: flavour.yamlFiles,
              deployZone: deployZone
            },
        )
        return res.status(OK).json({
          result: `Creating VirtualSilo ${vSiloID}`,
        });
      } catch (err) {
        const error = err as FabricError
        logger.error({ err }, 'Error processing add thing visor request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.get('/listVirtualSilos',
    async (req: Request, res: Response) => {
      console.log('Get all virtual silos request received');
      try {
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        const contract =  res.locals.contract as Contract;
        const data = await contract.evaluateTransaction('GetAllVirtualSilos');
        const assets =  (data.length > 0)  ? JSON.parse(data.toString()) : [];
        return res.status(OK).json(assets);
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error processing get all virtual silos request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });


