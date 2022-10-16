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
import {wallet} from "./index";

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

export async function createAdmin(){
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

export const getUserByID = async (userID: string) => {
  const user = await User.findOne({
    userID: userID,
  })
  if(user && !(await wallet!.get(user.userID!))){
    const x509Identity = {
      credentials: {
        certificate: user.certificate,
        privateKey: user.privateKey,
      },
      mspId: config.mspIdOrg,
      type: 'X.509',
    };
    await wallet!.put(user.userID!, x509Identity);
  }
  return user
}