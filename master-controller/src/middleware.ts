/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './logger';
import passport from 'passport';
import { NextFunction, Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import * as config from './config';
import { createClient } from "redis";
import { User } from "./auth";
import jwt from "jsonwebtoken";
import { createGateway, getNetwork } from "./fabric";
import { Wallet } from "fabric-network";

const { UNAUTHORIZED } = StatusCodes;

type TokenPayload = {
  user_id: string;
};

export const authenticateAPI = async (
  req: Request,
  res: Response,
  next: NextFunction
  ) => {
  try {
    if(req.url != "/login"){
      const wallet = req.app.locals["wallet"] as Wallet;
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        logger.debug("Authoriztion header is not attached");
        throw new Error("Authoriztion header is not attached");
      }
      const blacklist = req.app.locals["blacklist"] as ReturnType<typeof createClient>;
      const secret = config.jwtSecret;
      if (!secret) {
        logger.debug("cannot read secret from environment variables");
        throw new Error("cannot read secret from environment variables");
      }
      const tokenExpired = await blacklist.get(token);
      if(tokenExpired != null){
        logger.debug("token expired");
        throw new Error("token expired");
      }
      const decoded: TokenPayload = jwt.verify(token, secret) as TokenPayload;;
      const user = await User.findOne({
        userID: decoded.user_id
      });
      if (!user) {
        logger.debug("User Not found");
        throw new Error("User Not found");
      }
      const gatewayOrg = await createGateway(
        config.connectionProfileOrg,
        user.userID,
        wallet
      );
      const networkOrg = await getNetwork(gatewayOrg);
      const contract =  await networkOrg.getContract(config.chaincodeName);
      res.locals.token = token;
      res.locals.user = user;
      res.locals.contract = contract;
    }
    next();
  } catch (err) {
    return res.status(UNAUTHORIZED).json({
      message: "Verification Failed!"
    });
  }
};
