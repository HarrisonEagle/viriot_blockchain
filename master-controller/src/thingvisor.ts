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
import {
  convertEnv,
  convertHostAliases,
  createDeploymentFromYaml,
  createServiceFromYaml,
  ENV,
  ServiceInstance
} from "./k8s";
import { mqttClient, kc } from "./index";

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED } = StatusCodes;

const thingVisorPrefix = "TV";
const outControlSuffix = "c_out"

export const createThingVisorOnKubernetes = async (
  debugMode: boolean,
  thingVisorID: string,
  thingVisorParams: any,
  thingVisorDescription: string,
  yamlFiles: k8s.V1Deployment[] | k8s.V1Service[],
  deployZone: string,
) => {
  logger.debug("Creating Thing Visor On K8s");
  const topic = `${thingVisorPrefix}/${thingVisorID}/${outControlSuffix}`
  mqttCallBack.set(topic, onTvOutControlMessage);
  mqttClient.subscribe(topic);
  const env : ENV= {
    MQTTDataBrokerIP: mqttDataBrokerHost,
    MQTTDataBrokerPort: mqttDataBrokerPort,
    MQTTControlBrokerIP: `${mqttControlBrokerSVCName}.${mqttControlBrokerHost}`,
    MQTTControlBrokerPort: mqttControlBrokerPort,
    params: thingVisorParams,
    thingVisorID: thingVisorID,
    //systemDatabaseIP: mong,
    //systemDatabasePort: mongo_port
  }
  let exposedorts= {};
  let deploymentName = "error";
  let serviceName = "";
  let deploymentsNamesList = [];
  let servicesNamesList = [];
  let servicesHostsAlias : ServiceInstance[] = [];
  try{
    const labelApp = thingVisorID.toLowerCase().replace("_", "-");
    for(let y of yamlFiles){
      if(y.kind === "Deployment"){
        const yaml = y as k8s.V1Deployment;
        logger.debug("Deployment Creation");
        yaml.metadata!.name += "-" + thingVisorID.toLowerCase().replace("_", "-");
        for(let container of yaml.spec!.template.spec!.containers){
          if("env" in container) {
            container.env = convertEnv(env, container['env']!);
          }else{
            container.env = convertEnv(env, []);
          }
          const tvImgName = container.image!;
          const url = `https://hub.docker.com/v2/repositories/${tvImgName.split(":")[0]}`

          /*const response = await fetch(url,{
            method: 'HEAD',
          });*/
        }
        yaml.spec!.selector.matchLabels!.thingVisorID = labelApp;
        yaml.spec!.template.metadata!.labels!.thingVisorID = labelApp;

        //TODO
        yaml.spec!.template.spec!.nodeSelector = {"viriot-zone": deployZone};
        //yaml.spec!.template.spec!.nodeSelector = {"viriot-zone": req.body.tvZone};
        //yaml["spec"]["template"]["spec"]["nodeSelector"] = {"viriot-zone": req.body.tvZone}

        const deploymentName = yaml.metadata!.name;
        deploymentsNamesList.push(deploymentName);
      }else if(y.kind === "Service"){
        const yaml = y as k8s.V1Service;
        logger.debug("Service Creation");
        const serviceName = yaml.metadata!.name + "-" + thingVisorID.toLowerCase().replace("_", "-");
        const serviceInstance : ServiceInstance = {prec: yaml.metadata!.name!, cluser_ip: ""};
        yaml.metadata!.name = serviceName;
        yaml.spec!.selector!.thingVisorID = labelApp;
        const apiResponseService = await createServiceFromYaml(kc, "viriot-network", yaml);
        serviceInstance.cluser_ip = apiResponseService.body.spec?.clusterIP!;
        servicesHostsAlias.push(serviceInstance);
        servicesNamesList.push(serviceName);
      }else{
        logger.debug(`Error: yaml kind not supported (thingVisor): ${thingVisorID}`);
      }
    }

    for(let y of yamlFiles){
      if(y.kind === "Deployment"){
        const yaml = y as k8s.V1Deployment;
        logger.debug("Injecting hostAliases for Deployment");
        if("hostAliases" in yaml.spec!.template.spec!){
          yaml.spec!.template.spec!.hostAliases = convertHostAliases(servicesHostsAlias, yaml.spec!.template.spec.hostAliases);
        }else{
          yaml.spec!.template.spec!.hostAliases = convertHostAliases(servicesHostsAlias, []);
        }
        logger.debug("Creating Deployment");
        logger.debug(yaml);
        await createDeploymentFromYaml(kc, "viriot-network", yaml);
        logger.debug("ThingVisor Created!");
      }
    }
  }catch (e) {

  }
}