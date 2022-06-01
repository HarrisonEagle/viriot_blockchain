/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * This is the main entrypoint for the sample REST server, which is responsible
 * for connecting to the Fabric network and setting up a job queue for
 * processing submit transactions
 */

import * as config from './config';
import { createGateway, createWallet, getContracts, getNetwork } from "./fabric";
import { logger } from './logger';
import { createServer } from './server';

async function main() {
  logger.info('Checking Redis config');

  logger.info('Creating REST server');
  const app = await createServer();

  logger.info('Connecting to Fabric network with org1 mspid');
  const wallet = await createWallet();

  const gatewayOrg = await createGateway(
    config.connectionProfileOrg,
    config.mspIdOrg,
    wallet
  );
  const networkOrg = await getNetwork(gatewayOrg);
  app.locals[config.mspIdOrg] = await getContracts(networkOrg);

  logger.info('Starting REST server');
  app.listen(config.port, () => {
    logger.info('REST server started on port: %d', config.port);
  });
}

main().catch(async (err) => {
  logger.error({ err }, 'Unxepected error');
});
