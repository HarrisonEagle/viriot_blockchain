import { Request, Response } from "express";
import { logger } from "./logger";
import { Wallet } from "fabric-network";
import { buildCAClient } from "./fabric";
import * as config from "./config";
import { body, validationResult } from "express-validator";
import { getReasonPhrase, StatusCodes } from "http-status-codes";
import { controller } from "./controller";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createClient } from "redis";

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED } = StatusCodes;

const userSchema = new mongoose.Schema({
  userID: String,
  password: String,
  role: String,
  certificate: String,
  privateKey: String,
});

// Model (大文字・単数)
export const User = mongoose.model('User', userSchema);

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
      const wallet = req.app.locals["wallet"] as Wallet;
      logger.debug('Creating Provider');
      const userRes = res.locals.user;
      if(userRes.role != "Admin"){
        logger.debug("User role is Not Admin!");
        return res.status(UNAUTHORIZED).json({
          message: "You're not admin!",
        });
      }
      const adminIdentity = await wallet.get(config.orgAdminUser);
      if (!adminIdentity) {
        logger.debug("Failed to get Admin Identity");
        return res.status(UNAUTHORIZED).json({
          message: "You're not admin!",
        });
      }


      // build a user object for authenticating with the CA
      const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
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
    const wallet = req.app.locals["wallet"] as Wallet;
    logger.debug('Creating Provider');

    const userRes = res.locals.user;
    if(userRes.role != "Admin"){
      logger.debug("User role is Not Admin!");
      return res.status(UNAUTHORIZED).json({
        message: "You're not admin!",
      });
    }
    const adminIdentity = await wallet.get(config.orgAdminUser);
    if (!adminIdentity) {
      logger.debug("Failed to get Admin Identity");
      return res.status(UNAUTHORIZED).json({
        message: "You're not admin!",
      });
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, config.orgAdminUser);

    await User.deleteOne({ userID: req.body.userID});
    logger.debug('Creating CaClient');
    const caClient = buildCAClient(config.connectionProfileOrg, config.CA);
    // Register the user, enroll the user, and import the new identity into the wallet.
    // if affiliation is specified by client, the affiliation value must be configured in CA
    logger.debug('Registering User');
    await caClient.newIdentityService().delete(req.body.userID, adminUser);
    const wExist = await wallet.get(req.body.userID);
    if(wExist){
      await wallet.remove(req.body.userID);
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
    const wallet = req.app.locals["wallet"] as Wallet;
    logger.debug('Creating Provider');

    const userRes = res.locals.user;
    if(userRes.role != "Admin"){
      logger.debug("User role is Not Admin!");
      return res.status(UNAUTHORIZED).json({
        message: "You're not admin!",
      });
    }
    const adminIdentity = await wallet.get(config.orgAdminUser);
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
    const user = await User.findOne({
      userID: req.body.userID,
    });
    if(!user){
      logger.debug("User Not Exist!");
      return res.status(UNAUTHORIZED).json({
        message: "Login Failed!",
      });
    }
    const pwcorrect = await bcrypt.compare(req.body.password, user.password);
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
    await wallet.put(user.userID, x509Identity);
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
      const wallet = req.app.locals["wallet"] as Wallet;
      const blacklist = req.app.locals["blacklist"] as ReturnType<typeof createClient>;
      const token = res.locals.token as string;
      const user = res.locals.user;
      const now = new Date();
      await blacklist.setEx(token, 2592000, now.toUTCString());
      await wallet.remove(user.userID);
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