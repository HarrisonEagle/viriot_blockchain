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
import { User } from "./auth";
import bcrypt from "bcrypt";

async function createAdmin(wallet: Wallet){
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
        const x509Identity = {
          credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
          },
          mspId: config.mspIdOrg,
          type: 'X.509',
        };
        logger.debug('Put Admin to Wallet');
        await wallet.put(config.orgAdminUser, x509Identity);
      } catch (err) {
        logger.debug('Failed to Save Admin!');
        throw err;
      }
    }else{
      logger.debug('admin exists! ');
    }
  });
}

// Mongooseが起動しなくなったらDocker Volumeを確認する
async function main() {
  logger.info('Connecting to MongoDB');
  logger.info(`mongodb://localhost:27017/viriotuser`);
  await mongoose.connect(`mongodb://localhost:27017/viriotuser`);
  logger.info('Checking Redis config');

  logger.info('Creating REST server');
  const wallet = await createWallet();
  //第2引数にUserIDを渡すべき
  const gatewayOrg = await createGateway(
    config.connectionProfileOrg,
    config.mspIdOrg,
    wallet
  );
  const networkOrg = await getNetwork(gatewayOrg);
  const app = await createServer();


  const blacklist = await createClient({
    url: `redis://localhost:6379`
  });
  await blacklist.connect();

  logger.info('Connecting to Fabric network with org1 mspid');
  app.locals["wallet"] = wallet;
  app.locals["blacklist"] = blacklist;

  app.locals[config.mspIdOrg] = await getContracts(networkOrg);

  await createAdmin(app.locals["wallet"] as Wallet);

  logger.info('Starting REST server');
  app.listen(config.port, () => {
    logger.info('REST server started on port: %d', config.port);
  });
}

main().catch(async (err) => {
  logger.error({ err }, 'Unxepected error');
});