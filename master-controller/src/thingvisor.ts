import {controller, STATUS_PENDING, STATUS_RUNNING} from "./controller";
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
  mqttDataBrokerPort, workingNamespace
} from "./config";
import {mqttCallBack, onTvOutControlMessage} from "./mqttcallback";
import {
  convertThingVisorEnv,
  convertHostAliases,
  createDeploymentFromYaml,
  createServiceFromYaml, deleteAdditionalDeployments, deleteAdditionalServices, deleteDeployment, deleteService,
  ENVThingVisor,
  ServiceInstance
} from "./k8s";
import { mqttClient, kc } from "./index";
import {getContract} from "./fabric";

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED } = StatusCodes;

export const thingVisorPrefix = "TV";
export const vSiloPrefix = "vSilo";
export const outControlSuffix = "c_out"
export const inControlSuffix = "c_in"

export const createThingVisorOnKubernetes = async (
  debugMode: boolean,
  thingVisorID: string,
  thingVisorParams: string,
  thingVisorDescription: string,
  yamlFiles: (k8s.V1Deployment | k8s.V1Service)[],
  deployZone: string,
  userID: string,
) => {
  const mqttDataBroker = {
    ip: mqttDataBrokerHost,
    port: mqttDataBrokerPort
  };
  const mqttControlBroker = {
    ip: `${mqttControlBrokerSVCName}.${mqttControlBrokerHost}`,
    port: mqttControlBrokerPort
  };
  const creationTime = new Date().toISOString();
  const thingVisorEntry = {
    thingVisorID: thingVisorID,
    creationTime: creationTime,
    tvDescription: thingVisorDescription,
    //"imageName": tv_img_name,
    status: STATUS_PENDING,
    debug_mode: debugMode,
    vThings: [],
    params: thingVisorParams,
    MQTTDataBroker: mqttDataBroker,
    MQTTControlBroker: mqttControlBroker,
    yamlFiles: yamlFiles,
    additionalServicesNames: [],
    additionalDeploymentsNames: [],
  }
  const contract =  await getContract(userID);
  await contract.submitTransaction("UpdateThingVisor", thingVisorID, JSON.stringify(thingVisorEntry));
  logger.debug("Creating Thing Visor On K8s");
  const topic = `${thingVisorPrefix}/${thingVisorID}/${outControlSuffix}`;
  logger.debug("Subsribed Topic:"+topic);
  mqttCallBack.set(topic, onTvOutControlMessage);
  mqttClient.subscribe(topic);
  logger.debug("params:"+thingVisorParams)
  const env : ENVThingVisor= {
    MQTTDataBrokerIP: mqttDataBrokerHost,
    MQTTDataBrokerPort: mqttDataBrokerPort,
    MQTTControlBrokerIP: `${mqttControlBrokerSVCName}.${mqttControlBrokerHost}`,
    MQTTControlBrokerPort: mqttControlBrokerPort,
    params: thingVisorParams,
    thingVisorID: thingVisorID,
    OwnerID: userID,
  }
  let exposedorts= {};
  let deploymentName = "error";
  let serviceName = "";
  let containerID = "";
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
            container.env = convertThingVisorEnv(env, container['env']!);
          }else{
            container.env = convertThingVisorEnv(env, []);
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

        deploymentName = yaml.metadata!.name!;
        deploymentsNamesList.push(deploymentName);
      }else if(y.kind === "Service"){
        const yaml = y as k8s.V1Service;
        logger.debug("Service Creation");
        const serviceName = yaml.metadata!.name + "-" + thingVisorID.toLowerCase().replace("_", "-");
        const serviceInstance : ServiceInstance = {prec: yaml.metadata!.name!, cluster_ip: ""};
        yaml.metadata!.name = serviceName;
        yaml.spec!.selector!.thingVisorID = labelApp;
        const apiResponseService = await createServiceFromYaml(kc,workingNamespace, yaml);
        serviceInstance.cluster_ip = apiResponseService.body.spec?.clusterIP!;
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
        await createDeploymentFromYaml(kc, workingNamespace, yaml);
        logger.debug("ThingVisor Created!");
      }
    }

    const ipAddress = `${serviceName}.${workingNamespace}.svc.cluster.local`;
    containerID = deploymentName;

    const newThingVisorEntry = {
      thingVisorID: thingVisorID,
      creationTime: creationTime,
      tvDescription: thingVisorDescription,
      //"imageName": tv_img_name,
      status: STATUS_RUNNING,
      debug_mode: debugMode,
      containerID: containerID,
      ipAddress: ipAddress,
      deploymentName: deploymentName,
      serviceName: serviceName,
      //"port": exposed_ports,
      //"IP": gateway_IP,
      vThings: [],
      params: thingVisorParams,
      MQTTDataBroker: mqttDataBroker,
      MQTTControlBroker: mqttControlBroker,
      yamlFiles: yamlFiles,
      additionalServicesNames: deploymentsNamesList.filter(name => name != deploymentName),
      additionalDeploymentsNames: servicesNamesList.filter(name => name != serviceName),
    }
    await contract.submitTransaction("UpdateThingVisor", thingVisorID, JSON.stringify(newThingVisorEntry));
  }catch (e) {
    logger.debug({e},"Error to Create ThingVisor!");
  }
}


export const deleteThingVisorOnKubernetes = async (tvEntry : any) => {
  const tvId = tvEntry.thingVisorID;
  logger.debug(`Deleting Deployment ${tvId}`);
  const deploymentName = tvEntry.deploymentName;
  const serviceName = tvEntry.serviceName;
  if(deploymentName !== ""){
    logger.debug(`stopping deployment: ${deploymentName}, and service: ${serviceName}`);
    await deleteDeployment(kc, workingNamespace, deploymentName);
  }
  if(serviceName !== ""){
    await deleteService(kc, workingNamespace, serviceName);
  }
  await deleteAdditionalDeployments(tvEntry.additionalDeploymentsNames);
  await deleteAdditionalServices(tvEntry.additionalServicesNames);
}

export const updateThingVisor = async (userID: string, thingVisorID: string, tvDescription: string, params: string) => {
  try{
    const contract =  await getContract(userID);
    await contract.submitTransaction("UpdateThingVisorPartial", thingVisorID, tvDescription, params);
  }catch (e){
    logger.debug(`Update Thing Visor ${thingVisorID} Failed!`);
  }
}