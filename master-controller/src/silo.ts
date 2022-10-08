import * as k8s from "@kubernetes/client-node";
import {
    mqttControlBrokerHost,
    mqttControlBrokerPort,
    mqttControlBrokerSVCName,
    mqttDataBrokerHost,
    mqttDataBrokerPort, workingNamespace
} from "./config";
import {STATUS_PENDING, STATUS_RUNNING} from "./controller";
import {getContract} from "./fabric";
import {logger} from "./logger";
import {
    mqttCallBack,
    onTvOutControlMessage,
    onVSiloOutControlMessage,
    thingVisorUser,
    VSiloTenant
} from "./mqttcallback";
import {kc, mqttClient} from "./index";
import {
    convertVSiloEnv,
    convertHostAliases,
    createDeploymentFromYaml,
    createServiceFromYaml,
    ENVVSilo,
    ServiceInstance
} from "./k8s";
import {outControlSuffix, thingVisorPrefix, vSiloPrefix} from "./thingvisor";

export const createVirtualSiloOnKubernetes = async (
    userID: string,
    vSiloID: string,
    vSiloName: string,
    tenantID: string,
    flavourParams: string,
    debugMode: boolean,
    flavourImageName: string,
    flavourID: string,
    yamlFiles: (k8s.V1Deployment | k8s.V1Service)[],
    deployZone: {zone: string, gw: string | undefined, keys: IterableIterator<string>} | {keys: IterableIterator<string>, zone?: undefined, gw?: undefined} | {zone: string}
) => {
    const mqttDataBroker = {
        ip: mqttDataBrokerHost,
        port: mqttDataBrokerPort
    };
    const mqttControlBroker = {
        ip: `${mqttControlBrokerSVCName}.${mqttControlBrokerHost}`,
        port: mqttControlBrokerPort
    };
    const contract =  await getContract(userID);
    const siloEntry = {
        creationTime: new Date().toISOString(),
        tenantID: tenantID,
        status: STATUS_PENDING,
        flavourParams: flavourParams,
        MQTTDataBroker: mqttDataBroker,
        MQTTControlBroker: mqttControlBroker,
        vSiloID: vSiloID,
        vSiloName: vSiloName,
        additionalServicesNames: [],
        additionalDeploymentsNames: []
    }
    await contract.submitTransaction("UpdateVirtualSilo", vSiloID, JSON.stringify(siloEntry));
    logger.debug("Creating VirtualSilo On K8s");
    const topic = `${vSiloPrefix}/${vSiloID}/${outControlSuffix}`;
    mqttCallBack.set(topic, onVSiloOutControlMessage);
    VSiloTenant.set(vSiloID, userID); /// TODO: Tenantを先に作るべきか確認する
    mqttClient.subscribe(topic);
    const env : ENVVSilo = {
        tenantID: tenantID,
        flavourParams: flavourParams,
        MQTTDataBrokerIP: mqttDataBrokerHost,
        MQTTDataBrokerPort: mqttDataBrokerPort,
        MQTTControlBrokerIP: `${mqttControlBrokerSVCName}.${mqttControlBrokerHost}`,
        MQTTControlBrokerPort: mqttControlBrokerPort,
        vSiloID: vSiloID
    }
    let exposedorts= {};
    let deploymentName = "error";
    let serviceName = "";
    let containerID = "";
    let deploymentsNamesList = [];
    let servicesNamesList = [];
    let servicesHostsAlias : ServiceInstance[] = [];
    try{
        const labelApp = `${tenantID.toLowerCase()}-${vSiloName.toLowerCase()}`;
        for(let y of yamlFiles){
            if(y.kind === "Deployment"){
                const yaml = y as k8s.V1Deployment;
                logger.debug("Deployment Creation");
                yaml.spec!.selector.matchLabels!.siloID = labelApp
                yaml.spec!.template.metadata!.labels!.siloID= labelApp
                for(let container of yaml.spec!.template.spec!.containers){
                    if("env" in container) {
                        container.env = convertVSiloEnv(env, container['env']!);
                    }else{
                        container.env = convertVSiloEnv(env, []);
                    }
                    const tvImgName = container.image!;
                    const url = `https://hub.docker.com/v2/repositories/${tvImgName.split(":")[0]}`

                    /*const response = await fetch(url,{
                      method: 'HEAD',
                    });*/
                }
                //TODO
                yaml.spec!.template.spec!.nodeSelector = {"viriot-zone": deployZone.zone!};
                //yaml.spec!.template.spec!.nodeSelector = {"viriot-zone": req.body.tvZone};
                //yaml["spec"]["template"]["spec"]["nodeSelector"] = {"viriot-zone": req.body.tvZone}

                deploymentName = `${yaml.metadata!.name!}-${labelApp}`;
                deploymentsNamesList.push(deploymentName);
            }else if(y.kind === "Service"){
                const yaml = y as k8s.V1Service;
                logger.debug("Service Creation");
                const serviceName = `${yaml.metadata!.name!}-${labelApp}`;
                const serviceInstance : ServiceInstance = {prec: yaml.metadata!.name!, cluster_ip: ""};
                yaml.metadata!.name = serviceName;
                yaml.spec!.selector!.thingVisorID = labelApp;
                const apiResponseService = await createServiceFromYaml(kc,workingNamespace, yaml);
                serviceInstance.cluster_ip = apiResponseService.body.spec?.clusterIP!;
                servicesHostsAlias.push(serviceInstance);
                servicesNamesList.push(serviceName);
            }else{
                logger.debug(`Error: yaml kind not supported (vSilo): ${vSiloID}`);
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
            }
        }

        const ipAddress = `${serviceName}.${workingNamespace}.svc.cluster.local`;
        containerID = deploymentName;
        const newvSiloEntry = {
            creationTime: new Date().toISOString(),
            tenantID: tenantID,
            flavourParams: flavourParams,
            status: STATUS_RUNNING,
            ipAddress: ipAddress,
            deploymentName: deploymentName,
            serviceName: serviceName,
            containerID: containerID,
            //"port": exposed_ports,
            MQTTDataBroker: mqttDataBroker,
            MQTTControlBroker: mqttControlBroker,
            vSiloID: vSiloID,
            vSiloName: vSiloName,
            additionalServicesNames: deploymentsNamesList.filter(name => name != deploymentName),
            additionalDeploymentsNames: servicesNamesList.filter(name => name != serviceName),
        }
        await contract.submitTransaction("UpdateVirtualSilo", vSiloID, JSON.stringify(newvSiloEntry));
    }catch (e) {
        logger.debug({e},"Error to Create ThingVisor!");
    }
}