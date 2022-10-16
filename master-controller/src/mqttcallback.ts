import { logger } from "./logger";
import {getContract} from "./fabric";
import { mqttClient} from "./index";
import {VThingTVWithKey} from "./controller";
import {deleteThingVisorOnKubernetes, inControlSuffix, outControlSuffix, thingVisorPrefix} from "./thingvisor";

export const mqttCallBack = new Map<string,(message:Buffer) => Promise<void>>();
export const onTvOutControlMessage = async (message:Buffer) => {
  const res = JSON.parse(message.toString().replace("\'", "\""));
  logger.debug("Receiverd Test Callback command");
  if(res.command == "createVThing") {
    await onMessageCreateVThing(res);
  }else if(res.command == "requestInit"){
    await onMessageRequestInit(res.thingVisorID, res.ownerID);
  }else if(res.command == "destroyTVAck"){
    await onMessageDestroyThingVisorAck(res);
  }
};

export const onVSiloOutControlMessage = async (message:Buffer) => {
  const res = JSON.parse(message.toString().replace("\'", "\""));
};

export const onMessageRequestInit = async(thingVisorID: string, ownerID: string) => {
  try{
    const contract = await getContract(ownerID);
    let inited = false
    while(!inited){
      try{
        await contract.evaluateTransaction('ThingVisorRunning', thingVisorID);
        inited = true
      }catch (e){
        logger.debug({e}, "Maybe not started!")
      }
      await new Promise(f => setTimeout(f, 100));
    }
    const CreateVThingCmd = {command: "createVThings", thingVisorID: thingVisorID};
    mqttClient.publish(`${thingVisorPrefix}/${thingVisorID}/${inControlSuffix}`, JSON.stringify(CreateVThingCmd).replace("\'", "\""));
  }catch (e){
    logger.error(
        { e },
        "Error Init Thing Visor"
    );
  }
}

export const onMessageCreateVThing = async(res: any) => {
  try{
    const tvID = res.thingVisorID;
    const contract = await getContract(res.ownerID);
    let inited = false
    while(!inited){
      try{
        await contract.evaluateTransaction('ThingVisorRunning', tvID);
        inited = true
      }catch (e){
        logger.debug({e}, "Maybe not started!")
      }
      await new Promise(f => setTimeout(f, 100));
    }
    await contract.submitTransaction("AddVThingToThingVisor", res.thingVisorID, JSON.stringify(res.vThing));
  }catch (e){
    logger.error(
        { e },
        "Error Create VThing!"
    );
  }
}

export const onMessageDestroyThingVisorAck = async(res: any) => {
  try{
    const tvID = res.thingVisorID;
    const contract = await getContract(res.ownerID);
    const data = await contract.evaluateTransaction('GetThingVisorWithVThingKeys', tvID);
    const thingVisor = JSON.parse(data.toString());
    const vThings: VThingTVWithKey[] = thingVisor.vThings;
    const vThingKeys = vThings.map(element => element.key);
    await contract.submitTransaction("DeleteThingVisor", tvID, ...vThingKeys);
    if(!thingVisor.debug_mode){
      await deleteThingVisorOnKubernetes(thingVisor.thingVisor);
    }
    mqttCallBack.delete(`${thingVisorPrefix}/${tvID}/${outControlSuffix}`);
    mqttClient.unsubscribe(`${thingVisorPrefix}/${tvID}/${outControlSuffix}`);
  }catch (e){
    logger.error(
        { e },
        "Error Destroy Thing Visor"
    );
  }
}
