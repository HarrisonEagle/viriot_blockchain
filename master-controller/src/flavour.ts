import * as k8s from "@kubernetes/client-node";
import {STATUS_ERROR, STATUS_READY, VThingTVWithKey} from "./controller";
import {getContract} from "./fabric";
import {logger} from "./logger";
import {deleteThingVisorOnKubernetes, outControlSuffix, thingVisorPrefix} from "./thingvisor";
import {mqttClient} from "./index";
import {mqttCallBack} from "./mqttcallback";
export const createFlavourOnKubernetes = async (
    userID: string,
    imageName: string,
    flavourID: string,
    flavourParams: string,
    flavourDescription: string,
    yamlFiles: k8s.V1Deployment[] | k8s.V1Service[],
) => {
    const creationTime = new Date().toISOString();
    let imageList = [];
    let yamlList = [];
    const contract =  await getContract(userID);
    try{
        for(let y of yamlFiles){
            yamlList.push(JSON.stringify(y));
            if(y.kind === "Deployment"){
                const yaml = y as k8s.V1Deployment;
                for(let container of yaml.spec!.template.spec!.containers){
                    imageList.push(container.image)
                }
            }
        }
        logger.debug("Creation of Flavour on k8s");
        const newFlavourEntry = {
            flavourParams: flavourParams,
            imageName: imageList,
            flavourDescription: flavourDescription,
            creationTime: creationTime,
            status: STATUS_READY,
            yamlFiles: yamlList}
        await contract.submitTransaction("UpdateFlavour", flavourID, JSON.stringify(newFlavourEntry));
    }catch (e) {
        logger.debug({e},"Error to save Flavour!");
        try{
            const newFlavourEntry = {
                flavourParams: flavourParams,
                imageName: imageList,
                flavourDescription: flavourDescription,
                creationTime: creationTime,
                status: STATUS_ERROR,
                yamlFiles: yamlList}
            await contract.submitTransaction("UpdateFlavour", flavourID, JSON.stringify(newFlavourEntry));
        }catch (ex){
            logger.debug({ex},"Error to save Flavour for error case!");
        }
    }
}
