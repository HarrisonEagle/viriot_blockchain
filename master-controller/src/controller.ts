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
import {jobQueue, mqttClient, wallet} from "./index";
import {vThingPrefix} from "./VThing";
import {
  deleteThingVisorOnKubernetes,
  inControlSuffix,
  outControlSuffix,
  thingVisorPrefix,
  vSiloPrefix
} from "./thingvisor";
import {getDeployZoneOnKubernetes} from "./k8s";
import {defaultDeployZone} from "./config";
import {getUserByID, User} from "./user";
import mongoose from "mongoose";
import * as config from "./config";
import {buildCAClient, getContract} from "./fabric";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {createClient} from "redis";
import {deleteVirtualSiloOnKubernetes} from "./silo";

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK, UNAUTHORIZED, CONFLICT } = StatusCodes;

export const controller = express.Router();
export const STATUS_PENDING = "pending";
export const STATUS_RUNNING = "running";
export const STATUS_READY = "ready";
export const STATUS_ERROR = "error";
// MiddlewareをbodyのVerificationの後に入れないとJSに変換した時エラーが出てしまう

controller.post(
    '/register',
    body().isObject().withMessage('body must contain an user object'),
    body('userID', 'must be a string').notEmpty(),
    body('password', 'must be a string').notEmpty(),
    body('role', 'must be a string').notEmpty(),
    async (req: Request, res: Response) => {
      logger.debug('Create User request received');

      const errors = validationResult(req);
      const session = await mongoose.startSession();
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
      session.startTransaction();

      try {
        logger.debug('Creating Provider');
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "You're not admin!",
          });
        }
        const adminIdentity = await wallet!.get(config.orgAdminUser);
        if (!adminIdentity) {
          logger.debug("Failed to get Admin Identity");
          return res.status(UNAUTHORIZED).json({
            message: "You're not admin!",
          });
        }


        // build a user object for authenticating with the CA
        const provider = wallet!.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, config.orgAdminUser);


        logger.debug('Creating CaClient');
        const caClient = buildCAClient(config.connectionProfileOrg, config.CA);
        // Register the user, enroll the user, and import the new identity into the wallet.
        // if affiliation is specified by client, the affiliation value must be configured in CA
        logger.debug('Registering User');
        const secret = await caClient.register({
          affiliation: config.orgCADepartment,
          enrollmentID: req.body.userID,
          role: "client", //Put "Client"  * see line 70 of channel.sh
          enrollmentSecret: req.body.password,
          attrs: [
            {name:"hf.Revoker", value:"true"},
          ]
        }, adminUser);
        logger.debug('Enrolling User');
        const enrollment = await caClient.enroll({
          enrollmentID: req.body.userID,
          enrollmentSecret: secret,
        });
        logger.debug('Calling Mongo');
        const hashedPW = await bcrypt.hash(req.body.password, 10);
        const user = new User({
          userID: req.body.userID,
          password: hashedPW,
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
          role: req.body.role, //Put "Client"  * see line 70 of channel.sh
        });
        await user.save();
        await session.commitTransaction();
        await session.endSession();
        return res.status(200).json({
          result: 'OK',
        });
      } catch (err) {
        await session.abortTransaction();
        await session.endSession();
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

controller.delete('/unregister',
    body().isObject().withMessage('body must contain an user object'),
    body('userID', 'must be a string').notEmpty(),
    async (req: Request, res: Response) => {
      console.log('Get all assets request received');
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
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
        logger.debug('Creating Provider');

        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "You're not admin!",
          });
        }
        const adminIdentity = await wallet!.get(config.orgAdminUser);
        if (!adminIdentity) {
          logger.debug("Failed to get Admin Identity");
          return res.status(UNAUTHORIZED).json({
            message: "You're not admin!",
          });
        }

        const provider = wallet!.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, config.orgAdminUser);

        await User.deleteOne({ userID: req.body.userID});
        logger.debug('Creating CaClient');
        const caClient = buildCAClient(config.connectionProfileOrg, config.CA);
        // Register the user, enroll the user, and import the new identity into the wallet.
        // if affiliation is specified by client, the affiliation value must be configured in CA
        logger.debug('Registering User');
        await caClient.newIdentityService().delete(req.body.userID, adminUser);
        const wExist = await wallet!.get(req.body.userID);
        if(wExist){
          await wallet!.remove(req.body.userID);
        }
        await session.commitTransaction();
        await session.endSession();
        return res.status(OK).json({
          message: "User unregistered successfully",
        });
      } catch (err) {
        logger.error({ err }, 'Error processing get all assets request');
        await session.abortTransaction();
        await session.endSession();
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: getReasonPhrase(INTERNAL_SERVER_ERROR),
          timestamp: new Date().toISOString(),
        });
      }
    });

controller.get('/listUsers',
    async (req: Request, res: Response) => {
      console.log('Get all assets request received');
      try {
        logger.debug('Creating Provider');

        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "You're not admin!",
          });
        }
        const adminIdentity = await wallet!.get(config.orgAdminUser);
        if (!adminIdentity) {
          logger.debug("Failed to get Admin Identity");
          return res.status(UNAUTHORIZED).json({
            message: "You're not admin!",
          });
        }

        const users = await User.find({}, 'userID role');
        return res.status(OK).send(users);
      } catch (err) {
        logger.error({ err }, 'Error processing get all assets request');
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: getReasonPhrase(INTERNAL_SERVER_ERROR),
          timestamp: new Date().toISOString(),
        });
      }
    });

controller.post('/login',
    body('userID', 'must be a string').notEmpty(),
    body('password', 'must be a string').notEmpty(),
    async (req: Request, res: Response) => {
      console.log('Get all assets request received');
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
        const user = await User.findOne({
          userID: req.body.userID,
        });
        if(!user){
          logger.debug("User Not Exist!");
          return res.status(UNAUTHORIZED).json({
            message: "Login Failed!",
          });
        }
        const pwcorrect = await bcrypt.compare(req.body.password, user.password!);
        if(!pwcorrect){
          logger.debug("Password Not Correct!");
          return res.status(UNAUTHORIZED).json({
            message: "Login Failed!",
          });
        }
        const payload = {
          user_id: req.body.userID,
        };
        const expirationSeconds = 60 * 60 * 3;  // 有効期限180分
        const token = jwt.sign(payload, config.jwtSecret, { expiresIn: expirationSeconds, algorithm: 'HS256' });
        const x509Identity = {
          credentials: {
            certificate: user.certificate,
            privateKey: user.privateKey,
          },
          mspId: config.mspIdOrg,
          type: 'X.509',
        };
        await wallet!.put(user.userID!, x509Identity);
        return res.status(OK).json({
          token: token,
        });
      } catch (err) {
        logger.error({ err }, 'Error processing get all assets request');
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: getReasonPhrase(INTERNAL_SERVER_ERROR),
          timestamp: new Date().toISOString(),
        });
      }
    });

controller.delete('/logout',
    async (req: Request, res: Response) => {
      console.log('Get all assets request received');
      try {
        const blacklist = req.app.locals["blacklist"] as ReturnType<typeof createClient>;
        const token = res.locals.token as string;
        const user = res.locals.user;
        const now = new Date();
        await blacklist.setEx(token, 2592000, now.toUTCString());
        return res.status(OK).json({
          message: "User Logouted successfully",
        });
      } catch (err) {
        logger.error({ err }, 'Error processing get all assets request');
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: getReasonPhrase(INTERNAL_SERVER_ERROR),
          timestamp: new Date().toISOString(),
        });
      }
    });

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
  endpoint: string
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
        let userRes = res.locals.user;
        let userID =  res.locals.userID as string;
        const debugMode = req.body.debug_mode
        if(userID != tenantID){
          const tenant = await getUserByID(tenantID)
          if(userRes.role != "Admin" || !tenant){
            return res.status(UNAUTHORIZED).json({
              message: "operation not allowed"
            });
          }
          userID = tenant.userID!;
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
        const contract = await getContract(userID);
        const flavour = JSON.parse((await contract.evaluateTransaction('GetFlavour', flavourID)).toString());
        //key: tenantID/vSiloID
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

controller.post('/inspectVirtualSilo',
    async (req: Request, res: Response) => {
      console.log('Get all virtual silos request received');
      try {
        const userRes = res.locals.user;
        const vSiloID : string = req.body.vSiloID;
        const tenantID : string = vSiloID.split('_')[0]
        let userID =  res.locals.userID as string;
        if(userID != tenantID){
          const tenant = await getUserByID(tenantID)
          if(userRes.role != "Admin" || !tenant){
            return res.status(UNAUTHORIZED).json({
              message: "operation not allowed"
            });
          }
          userID = tenant.userID!;
        }
        const contract = await getContract(userID);
        const vSilo = JSON.parse((await contract.evaluateTransaction('GetVirtualSilo', vSiloID)).toString());
        const vThingsData = await contract.evaluateTransaction('GetVThingVSilosByVSiloID', vSiloID);
        const vThings = (vThingsData.length > 0) ? JSON.parse(vThingsData.toString()) : [];
        return res.status(OK).json({
          vSilo: vSilo,
          vThings: vThings
        });
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error processing inspect virtual silos request');
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

controller.post('/siloDestroy',
    async (req: Request, res: Response) => {
      console.log('Get all virtual silos request received');
      try {
        const userRes = res.locals.user;
        const tenantID : string = req.body.tenantID;
        const vSiloID = tenantID + "_" + req.body.vSiloName;
        let userID =  res.locals.userID as string;
        if(userID != tenantID){
          const tenant = await getUserByID(tenantID)
          if(userRes.role != "Admin" || !tenant){
            return res.status(UNAUTHORIZED).json({
              message: "operation not allowed"
            });
          }
          userID = tenant.userID!;
        }
        const contract = await getContract(userID);
        const vSilo = JSON.parse((await contract.evaluateTransaction('GetVirtualSilo', vSiloID)).toString());
        if(req.body.force){
          await deleteVirtualSiloOnKubernetes(vSilo);
          const vThingsData = await contract.evaluateTransaction('GetVThingVSilosByVSiloID', vSiloID);
          const vThings : VThingVSilo[] = (vThingsData.length > 0) ? JSON.parse(vThingsData.toString()) : [];
          const vThingIDs = vThings.map((element) => element.vThingID);
          await contract.submitTransaction("DeleteVirtualSilo", vSiloID, ...vThingIDs)
          mqttCallBack.delete(`${vSiloPrefix}/${vSiloID}/${outControlSuffix}`);
          mqttClient.unsubscribe(`${vSiloPrefix}/${vSiloID}/${outControlSuffix}`);
          return res.status(OK).json({
            message: `Virtual Silo ${vSiloID} destroyed (force=true)`
          });
        }
        const destroyCmd = {command: "destroyVSilo", vSiloID: vSiloID};
        mqttClient.publish(`${vSiloPrefix}/${vSiloID}/${inControlSuffix}`, JSON.stringify(destroyCmd).replace("\'", "\""));
        return res.status(OK).json({
          message: `Destroying virtual silo ${vSiloID}`
        });
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error destroy virtual silos request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.post('/inspectTenant',
    async (req: Request, res: Response) => {
      console.log('Get all virtual silos request received');
      try {
        const userRes = res.locals.user;
        const tenantID : string = req.body.tenantID;
        let userID =  res.locals.userID as string;
        if(userID != tenantID){
          const tenant = await getUserByID(tenantID)
          if(userRes.role != "Admin" || !tenant){
            return res.status(UNAUTHORIZED).json({
              message: "operation not allowed"
            });
          }
          userID = tenant.userID!;
        }
        const contract = await getContract(userID);
        const vSilosData = await contract.evaluateTransaction('GetVirtualSilosByTenantID', tenantID);
        const vSilos =  (vSilosData.length > 0)  ? JSON.parse(vSilosData.toString()) : [];
        const vThingsData = await contract.evaluateTransaction('GetVThingVSilosByTenantID', tenantID);
        const vThings = (vThingsData.length > 0)  ? JSON.parse(vThingsData.toString()) : [];
        return res.status(OK).json({
          vSilos: vSilos,
          vThings: vThings
        });
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error processing inspect virtual silos request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

/// VThing API
export interface VThingVSilo{
  tenantID: string
  vSiloID: string
  creationTime: string
  vThingID: string
}

controller.post('/addVThing',
    async (req: Request, res: Response) => {
      console.log('add vthing request received');
      try {
        let userID =  res.locals.userID as string;
        const tenantID : string = req.body.tenantID;
        const vThingID : string = req.body.vThingID;
        const userRes = res.locals.user;
        if(userID != tenantID){
          const tenant = await getUserByID(tenantID)
          if(userRes.role != "Admin" || !tenant){
            return res.status(UNAUTHORIZED).json({
              message: "operation not allowed"
            });
          }
          userID = tenant.userID!;
        }
        const contract = await getContract(userID);
        const vThing = JSON.parse((await contract.evaluateTransaction('GetVThingByID', vThingID)).toString());
        const vSiloID : string = tenantID + "_" + req.body.vSiloName;
        const vSilo = JSON.parse((await contract.evaluateTransaction('GetVirtualSilo', vSiloID)).toString());
        if(vSilo.status !== STATUS_RUNNING){
          return res.status(CONFLICT).json({
            message: `Add fails - virtual silo ${vSiloID} is not ready`
          });
        }
        //Check VThingVSilo Exist here
        /// TODO: xxx
        //key: tenantID/vSiloID/vThingID
        const vThingVSilos  = await contract.evaluateTransaction('GetVThingVSilo', vSiloID, vThingID);
        if(vThingVSilos.length > 0){
          return res.status(CONFLICT).json({
            message:  `Add fails - Virtual thing ${vThingID} already exists for tenantID ${tenantID} and vSiloID ${vSiloID}`
          });
        }
        const vThingType = vThing.type ?? ""
        const mqttMessage = {
          command: "addVThing",
          vSiloID: vSiloID,
          vThingID: vThingID,
          vThingType: vThingType,
        }
        mqttClient.publish(`${vSiloPrefix}/${vSiloID}/${inControlSuffix}`, JSON.stringify(mqttMessage).replace("\'", "\""));
        const vThingVSiloEntry = {
          tenantID: tenantID,
          vThingID: vThingID,
          creationTime: new Date().toISOString(),
          vSiloID: vSiloID
        }
        await contract.submitTransaction("AddVThingVSilo", vSiloID, vThingID, JSON.stringify(vThingVSiloEntry));
        return res.status(OK).json({"message": 'vThing created'});
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error processing add vthing request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.post('/deleteVThing',
    async (req: Request, res: Response) => {
      console.log('delete vthing request received');
      try {
        const tenantID : string = req.body.tenantID;
        const vThingID : string = req.body.vThingID;
        const userRes = res.locals.user;
        let userID =  res.locals.userID as string;
        if(userID != tenantID){
          const tenant = await getUserByID(tenantID)
          if(userRes.role != "Admin" || !tenant){
            return res.status(UNAUTHORIZED).json({
              message: "operation not allowed"
            });
          }
          userID = tenant.userID!;
        }
        const contract = await getContract(userID);
        const vSiloID : string= tenantID + "_" + req.body.vSiloName;
        //Check VThingVSilo Exist here
        /// TODO: xxx
        //key: tenantID/vSiloID/vThingID
        const vThingVSilos = await contract.evaluateTransaction('GetVThingVSilo', vSiloID, vThingID);
        if(vThingVSilos.length === 0){
          return res.status(CONFLICT).json({
            message:  `Delete fails - Virtual Thing ID, tenantID or vSiloID not valid`
          });
        }
        const mqttMessage = {
          command: "deleteVThing",
          vSiloID: vSiloID,
          vThingID: vThingID,
        }
        await contract.submitTransaction("DeleteVThingVSilo", vSiloID, vThingID);
        mqttClient.publish(`${vSiloPrefix}/${vSiloID}/${inControlSuffix}`, JSON.stringify(mqttMessage).replace("\'", "\""));
        return res.status(OK).json({"message": `deleted virtual thing: ${vThingID}`});
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error processing delete vthing request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.post('/setVThingEndpoint',
    async (req: Request, res: Response) => {
      try {
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        const contract =  res.locals.contract as Contract;
        const endpoint: string = req.body.endpoint;
        const vThingID: string = req.body.vThingID;
        const tvId: string = vThingID.split("/")[0];
        const thingVisor = JSON.parse((await contract.evaluateTransaction('GetThingVisor', tvId)).toString());
        if(thingVisor.status != STATUS_RUNNING){
          return res.status(CONFLICT).json({ message: `Set endpoint fails - ThingVisor ${tvId} is not ready` });
        }
        const vThing: VThingTV = JSON.parse((await contract.evaluateTransaction('GetVThingByID', vThingID)).toString());
        vThing.endpoint = endpoint
        const mqttMessage = {
          command: "setVThingEndpoint",
          vThingID: vThingID,
          endpoint: endpoint,
        }
        mqttClient.publish(`${thingVisorPrefix}/${tvId}/${inControlSuffix}`, JSON.stringify(mqttMessage).replace("\'", "\""));
        await contract.submitTransaction("UpdateVThingOfThingVisor", vThingID, JSON.stringify(vThing));
        return res.status(OK).json({"message": "vThing endpoint created"});
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error processing get all virtual silos request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });

controller.post('/delVThingEndpoint',
    async (req: Request, res: Response) => {
      try {
        const userRes = res.locals.user;
        if(userRes.role != "Admin"){
          logger.debug("User role is Not Admin!");
          return res.status(UNAUTHORIZED).json({
            message: "operation not allowed"
          });
        }
        const contract =  res.locals.contract as Contract;
        const vThingID: string = req.body.vThingID;
        const tvId: string = vThingID.split("/")[0];
        const thingVisor = JSON.parse((await contract.evaluateTransaction('GetThingVisor', tvId)).toString());
        if(thingVisor.status != STATUS_RUNNING){
          return res.status(CONFLICT).json({ message: `Set endpoint fails - ThingVisor ${tvId} is not ready` });
        }
        const vThing: VThingTV = JSON.parse((await contract.evaluateTransaction('GetVThingByID', vThingID)).toString());
        vThing.endpoint = ""
        const mqttMessage = {
          command: "delVThingEndpoint",
          vThingID: vThingID
        }
        mqttClient.publish(`${thingVisorPrefix}/${tvId}/${inControlSuffix}`, JSON.stringify(mqttMessage).replace("\'", "\""));
        await contract.submitTransaction("UpdateVThingOfThingVisor", vThingID, JSON.stringify(vThing));
        return res.status(OK).json({"message": "vThing endpoint deleted"});
      } catch (err) {
        const error = err as FabricError
        logger.error({err}, 'Error processing get all virtual silos request');
        if(error.responses){
          return res.status(INTERNAL_SERVER_ERROR).json({ error: error.responses[0].response.message });
        }
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message });
      }
    });