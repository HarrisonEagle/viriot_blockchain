import { controller } from "./controller";
import { body, validationResult } from "express-validator";
import { Request, Response } from "express";
import { Wallet } from "fabric-network";
import { getReasonPhrase, StatusCodes } from "http-status-codes";
import { logger } from "./logger";
import * as k8s from '@kubernetes/client-node';
import * as mqtt from 'mqtt'
import fetch from 'node-fetch';
import {
  mqttControlBrokerHost,
  mqttControlBrokerPort,
  mqttControlBrokerSVCName,
  mqttDataBrokerHost,
  mqttDataBrokerPort
} from "./config";
import { mqttCallBack, onTvOutControlMessage } from "./mqttcallback";
import { convertEnv, convertHostAliases, createDeploymentFromYaml, createServiceFromYaml } from "./k8s";

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED } = StatusCodes;

