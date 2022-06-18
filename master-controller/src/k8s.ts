import * as k8s from '@kubernetes/client-node';
import { V1EnvVar } from "@kubernetes/client-node/dist/gen/model/v1EnvVar";
import { V1HostAlias } from "@kubernetes/client-node";

export type ENV =  {
  MQTTDataBrokerIP: string,
  MQTTDataBrokerPort: string,
  MQTTControlBrokerIP: string,
  MQTTControlBrokerPort: string,
  params: any,
  thingVisorID: any
}

export type ServiceInstance = {
  prec: string,
  cluser_ip: string
}


export const convertEnv = (env: ENV, precEnv : Array<V1EnvVar>) => {
  let newEnv = precEnv;
  for(const key of Object.keys(env) as (keyof ENV)[]){
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
      ip: JSON.stringify(host),
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


