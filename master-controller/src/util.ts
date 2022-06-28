import * as k8s from '@kubernetes/client-node';
import { logger } from './logger';

async function listAvailableNodeZone(k8s: k8s.CoreV1Api){
  let zones = new Map<string, string>();
  let apiResponse =await k8s.listNode();
  try{
    apiResponse.body.items.forEach(node => {
      const labels = Object.keys(node.metadata!.labels!);
      if(labels.some(item => item === "viriot-zone")){
        if(labels.some(item => item === "viriot-gw")){
          zones.set(node.metadata!.labels!["viriot-zone"], node.metadata!.labels!["viriot-gw"]);
        }else{
          if(!Array.from(zones.keys()).some(item => item === node.metadata!.labels!["viriot-zone"])){
            zones.set(node.metadata!.labels!["viriot-zone"], "");
          }
        }
      }
    });
    return zones;
  }catch (err){
    console.log(err);
  }
}

export async function getDeployZoneOnKubernetes(tvZone: string, k8s: k8s.CoreV1Api){
  try{
    const availableZones = await listAvailableNodeZone(k8s);
    if(tvZone != "" && availableZones!.has(tvZone)){
      return {
        zone: tvZone,
        gw: availableZones!.get(tvZone),
        availableZones: availableZones!.keys()
      };
    }else {
      return {
        availableZones: availableZones!.keys()
      };
    }
  }catch (err){
    console.log(err);
  }
}

export function dnsSubdomainConverter(s: string){
  let last;
  const regex = new RegExp('^[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?');
  s = s.toLowerCase();
  let ls = Array.from(s);

  while (true) {
    regex.exec(s);
    last = regex.lastIndex;
    if (last === s.length) {
      break;
    }

    ls[last] = "-";
    s = ls.join('');
  }
  return s;
}