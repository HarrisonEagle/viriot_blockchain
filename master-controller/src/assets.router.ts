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
import { Contract } from 'fabric-network';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { AssetNotFoundError } from './errors';
import { createGateway, createWallet, evatuateTransaction } from "./fabric";
import { logger } from './logger';
import * as config from "./config";

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } = StatusCodes;

export const assetsRouter = express.Router();

assetsRouter.get('/', async (req: Request, res: Response) => {
  console.log('Get all assets request received');
  try {
    const wallet = await createWallet();
    console.log("CertificateProfile:\n");
    console.log(config.certificateOrg);
    console.log("PrivateKey:\n");
    console.log(config.privateKeyOrg);
    console.log("MspID:\n");
    console.log(config.mspIdOrg);
    const gateway = await createGateway(
      config.connectionProfileOrg,
      config.mspIdOrg,
      wallet
    );
    console.log("ConnectionProfile:\n");
    console.log(config.connectionProfileOrg);
    console.log("ChannelName:\n");
    const network = await gateway.getNetwork(config.channelName);
    console.log(config.channelName);
    console.log("ChaincodeName:\n");
    const contract = network.getContract(config.chaincodeName);
    console.log(config.chaincodeName);
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

assetsRouter.post(
  '/',
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
      const wallet = await createWallet();
      const gateway = await createGateway(
        config.connectionProfileOrg,
        config.mspIdOrg,
        wallet
      );
      const network = await gateway.getNetwork(config.channelName);
      const contract = network.getContract(config.chaincodeName);
      await contract.submitTransaction(
        'CreateAsset',
        assetId,
        req.body.Color,
        req.body.Size,
        req.body.Owner,
        req.body.AppraisedValue
      );

    } catch (err) {
      logger.error(
        { err },
        'Error processing create asset request for asset ID %s',
        assetId
      );
      return res.status(200).json({
        result: 'OK',
      });
    }
  }
);

assetsRouter.options('/:assetId', async (req: Request, res: Response) => {
  const assetId = req.params.assetId;
  logger.debug('Asset options request received for asset ID %s', assetId);

  try {
    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;

    const data = await contract.evaluateTransaction( 'AssetExists', assetId);
    const exists = data.toString() === 'true';

    if (exists) {
      return res
        .status(OK)
        .set({
          Allow: 'DELETE,GET,OPTIONS,PATCH,PUT',
        })
        .json({
          status: getReasonPhrase(OK),
          timestamp: new Date().toISOString(),
        });
    } else {
      return res.status(NOT_FOUND).json({
        status: getReasonPhrase(NOT_FOUND),
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error(
      { err },
      'Error processing asset options request for asset ID %s',
      assetId
    );
    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

assetsRouter.get('/:assetId', async (req: Request, res: Response) => {
  const assetId = req.params.assetId;
  logger.debug('Read asset request received for asset ID %s', assetId);

  try {
    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;

    const data = await contract.evaluateTransaction( 'ReadAsset', assetId);
    const asset = JSON.parse(data.toString());

    return res.status(OK).json(asset);
  } catch (err) {
    logger.error(
      { err },
      'Error processing read asset request for asset ID %s',
      assetId
    );

    if (err instanceof AssetNotFoundError) {
      return res.status(NOT_FOUND).json({
        status: getReasonPhrase(NOT_FOUND),
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});
