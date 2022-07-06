import { logger } from "./logger";
import {getContract} from "./fabric";
import {addBackgroundJob} from "./jobs";
import {jobQueue, mqttClient} from "./index";
import {ChaincodeMessage, MessageOK} from "./controller";
import {deleteThingVisorOnKubernetes, outControlSuffix, thingVisorPrefix} from "./thingvisor";

export const mqttCallBack = new Map<string,(message:Buffer) => Promise<void>>();
export const thingVisorUser = new Map<string, string>();

export const onTvOutControlMessage = async (message:Buffer) => {
  const res = JSON.parse(message.toString().replace("\'", "\""));
  logger.debug("Receiverd Test Callback command");
  if(res.command == "createVThing"){
    await addBackgroundJob(
        jobQueue!,
        "create_thingvisor_vthing",
        thingVisorUser.get(res.thingVisorID)!,
        res,
    );
  }else if(res.command == "destroyTVAck"){
    await addBackgroundJob(
        jobQueue!,
        "destroy_thingvisor_ack",
        thingVisorUser.get(res.thingVisorID)!,
        res,
    );
  }
};

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
