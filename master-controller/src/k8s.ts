import * as k8s from '@kubernetes/client-node';
import { V1EnvVar } from "@kubernetes/client-node/dist/gen/model/v1EnvVar";
import { V1HostAlias } from "@kubernetes/client-node";
import {logger} from "./logger";
import {workingNamespace} from "./config";
import {kc} from "./index";

export type ENVThingVisor =  {
  MQTTDataBrokerIP: string,
  MQTTDataBrokerPort: string,
  MQTTControlBrokerIP: string,
  MQTTControlBrokerPort: string,
  params: string,
  thingVisorID: string,
  OwnerID: string
}

export type ENVVSilo =  {
  MQTTDataBrokerIP: string,
  MQTTDataBrokerPort: string,
  MQTTControlBrokerIP: string,
  MQTTControlBrokerPort: string,
  flavourParams: string,
  vSiloID: string,
  tenantID: string,
  OwnerID: string,
}
export type ServiceInstance = {
  prec: string,
  cluster_ip: string
}


export const convertThingVisorEnv = (env: ENVThingVisor, precEnv : Array<V1EnvVar>) => {
  let newEnv = precEnv;
  for(const key of Object.keys(env) as (keyof ENVThingVisor)[]){
    newEnv.push({
        name: key,
        value: String(env[key])
    });
  }
  return newEnv;
}

export const convertVSiloEnv = (env: ENVVSilo, precEnv : Array<V1EnvVar>) => {
  let newEnv = precEnv;
  for(const key of Object.keys(env) as (keyof ENVVSilo)[]){
    newEnv.push({
      name: key,
      value: String(env[key])
    });
  }
  return newEnv;
}

export const convertHostAliases = (hosts: ServiceInstance[], precHosts : V1HostAlias[] = []) => {
  let newHosts = precHosts;
  for(const host of hosts){
    newHosts.push({
      ip: host.cluster_ip,
      hostnames: [host.prec]
    });
  }
  return newHosts;
};


export const createServiceFromYaml = (kc: k8s.KubeConfig, namespace: string, body:  k8s.V1Service) => {
  const client = kc.makeApiClient(k8s.CoreV1Api);
  return client.createNamespacedService(namespace, body);
};

export const createDeploymentFromYaml = (kc: k8s.KubeConfig, namespace: string, body:  k8s.V1Deployment) => {
  const client = kc.makeApiClient(k8s.AppsV1Api);
  return client.createNamespacedDeployment(namespace, body, "true");
};

export const deleteDeployment = (kc: k8s.KubeConfig, namespace: string, name: string) => {
  const client = kc.makeApiClient(k8s.AppsV1Api);
  return client.deleteNamespacedDeployment(name, namespace, "true");
};

export const deleteService = (kc: k8s.KubeConfig, namespace: string, name: string) => {
  const client = kc.makeApiClient(k8s.CoreV1Api);
  return client.deleteNamespacedService(name, namespace, "true");
};

export const deleteAdditionalDeployments = async (deployments: string[]) => {
  deployments.map(async (deployment)=>{
    await deleteDeployment(kc, workingNamespace, deployment);
  });
}

export const deleteAdditionalServices = async (services: string[]) => {
  services.map(async (service)=>{
    await deleteService(kc, workingNamespace, service);
  });
}

export const getDeployZoneOnKubernetes = async (zone: string) => {
  const client = kc.makeApiClient(k8s.CoreV1Api);
  const response = await client.listNode()
  const zones = new Map<string, string>();
  response.body.items.forEach((node) => {
    if(node.metadata?.labels?.hasOwnProperty('viriot-zone')){
      if(node.metadata?.labels?.hasOwnProperty('viriot-gw')){
        zones.set(node.metadata?.labels["viriot-zone"], node.metadata?.labels["viriot-gw"])
      }else{
        if(!zones.has(node.metadata?.labels["viriot-zone"])){
          zones.set(node.metadata?.labels["viriot-zone"], "")
        }
      }
    }
  })
  if(zone !== "" && zones.has(zone)){
    return {
      zone: zone,
      gw: zones.get(zone),
      keys: zones.keys()
    }
  }
  return {
    keys: zones.keys()
  }
}


