import { logger } from "./logger";
import {getContract} from "./fabric";
import {jobQueue, mqttClient} from "./index";
import {ChaincodeMessage, MessageOK } from "./controller";
import {deleteThingVisorOnKubernetes, inControlSuffix, outControlSuffix, thingVisorPrefix} from "./thingvisor";

export const mqttCallBack = new Map<string,(message:Buffer) => Promise<void>>();
export const thingVisorUser = new Map<string, string>();


export const onTvOutControlMessage = async (message:Buffer) => {
  const res = JSON.parse(message.toString().replace("\'", "\""));
  logger.debug("Receiverd Test Callback command");
  if(res.command == "createVThing") {
    await onMessageCreateVThing(res);
  }else if(res.command == "requestInit"){
    await onMessageRequestInit(res.thingVisorID);
  }else if(res.command == "destroyTVAck"){
    await onMessageDestroyThingVisorAck(res);
  }
};

export const onMessageRequestInit = async(thingVisorID: string) => {
  try{
    const contract = await getContract(thingVisorUser.get(thingVisorID)!);
    let cmdata = await contract.evaluateTransaction('ThingVisorRunning', thingVisorID);
    let cm : ChaincodeMessage = JSON.parse(cmdata.toString());
    if(cm.message != MessageOK){
      while(cm.message != MessageOK){
        await new Promise(f => setTimeout(f, 100));
        cmdata = await contract.evaluateTransaction('ThingVisorRunning',thingVisorID);
        cm = JSON.parse(cmdata.toString());
      }
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
    const contract = await getContract(thingVisorUser.get(res.thingVisorID)!);
    let cmdata = await contract.evaluateTransaction('ThingVisorRunning', tvID);
    let cm : ChaincodeMessage = JSON.parse(cmdata.toString());
    if(cm.message != MessageOK){
      while(cm.message != MessageOK){
        await new Promise(f => setTimeout(f, 1000));
        cmdata = await contract.evaluateTransaction('ThingVisorRunning', tvID);
        cm = JSON.parse(cmdata.toString());
      }
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
    const contract = await getContract(thingVisorUser.get(res.thingVisorID)!);
    const data = await contract.evaluateTransaction('GetThingVisor', tvID);
    const thingVisor = JSON.parse(data.toString());
    await contract.submitTransaction("DeleteThingVisor", tvID);
    await contract.submitTransaction("DeleteAllVThingsFromThingVisor", tvID);
    if(!thingVisor.debug_mode){
      await deleteThingVisorOnKubernetes(thingVisor);
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
