import { logger } from "./logger";

export const mqttCallBack = new Map<String,() => Promise<void>>();

export const onTvOutControlMessage = async () => {
  logger.debug("Receiverd Test Callback command");
};
