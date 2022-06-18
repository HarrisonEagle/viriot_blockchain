
export const mqttCallBack = new Map<String,()=>void>();

export const onTvOutControlMessage = () => {
    mqttCallBack.set("shit", onTvOutControlMessage);
};
