#!/usr/bin/python3

import os
import sys
import time
import signal
import traceback
import paho.mqtt.client as mqtt
import json
from threading import Thread
from bson.json_util import dumps

# MQTT settings
v_silo_prefix = "vSilo"  # prefix name for virtual IoT System communication topic
v_thing_prefix = "vThing"  # prefix name for virtual Thing data and control topics
v_thing_data_suffix = "data_out"
in_control_suffix = "c_in"
out_control_suffix = "c_out"

mqtt_virIoT_control_client = mqtt.Client()
mqtt_virIoT_data_client = mqtt.Client()


# -*- coding: utf-8 -*-


class MqttDataThread(Thread):
    def __init__(self):
        Thread.__init__(self)

    def run(self):
        mqtt_virIoT_data_client.connect(
            virIoT_mqtt_data_broker_IP, virIoT_mqtt_data_broker_port, 10)
        print("Thread mqtt_virIoT_data_client started")
        mqtt_virIoT_data_client.loop_forever()
        print("Thread mqtt_virIoT_data_client terminated")


class MqttControlThread(Thread):
    def __init__(self):
        Thread.__init__(self)

    def run(self):
        mqtt_virIoT_control_client.connect(
            virIoT_mqtt_control_broker_IP, virIoT_mqtt_control_broker_port, 10)
        # Add message callbacks that will only trigger on a specific subscription match
        mqtt_virIoT_control_client.message_callback_add(v_silo_prefix + "/" + v_silo_id + "/" + in_control_suffix,
                                                        on_in_control_msg)
        mqtt_virIoT_control_client.subscribe(
            v_silo_prefix + "/" + v_silo_id + "/" + in_control_suffix)
        print("Thread mqtt_virIoT_control_client started")
        send_restore_vthings_message()
        mqtt_virIoT_control_client.loop_forever()
        print("Thread mqtt_virIoT_data_client terminated")


class broker_thread(Thread):
    def __init__(self):
        Thread.__init__(self)

    def run(self):
        initEnv()
        print("Thread broker started")

def send_restore_vthings_message():
    msg = {"command": "restoreVThingsAck", "ownerID": owner_ID,  "vSiloID": v_silo_id}
    mqtt_virIoT_control_client.publish(
        v_silo_prefix + "/" + v_silo_id + "/" + out_control_suffix, str(msg).replace("\'", "\""))
    return

# topic messages
def on_in_control_msg(mosq, obj, msg):
    payload = msg.payload.decode("utf-8", "ignore")
    print(msg.topic + " " + str(payload))
    jres = json.loads(payload.replace("\'", "\""))
    try:
        commandType = jres["command"]
        if commandType == "addVThing":
            on_message_add_vThing(jres)
            return "creating vThing"
        elif commandType == "deleteVThing":
            on_message_delete_vThing(jres)
            return "deleting vThing"
        elif commandType == "destroyVSilo":
            on_message_destroy_v_silo(jres)
            return "destroying vSilo"
        elif commandType == "getContextResponse":
            del jres["command"]
            on_vThing_data(mosq, obj, json.dumps(jres))
            return "received context response"
        elif commandType == "restoreVThings":
            del jres["command"]
            on_message_restore_virtual_things(jres)
            return "received restore virtual things"
        else:
            return "invalid command"
    except Exception as ex:
        traceback.print_exc()
        return 'invalid command'

def on_message_restore_virtual_things(jres):
    print("restore_virtual_things called")
    connected_v_things = jres["vThings"]
    if len(connected_v_things) > 0:
        for vThing in connected_v_things:
            if "vThingID" in vThing:
                print("restoring virtual thing with ID: " + vThing['vThingID'])
                on_message_add_vThing(vThing)

def on_message_add_vThing(jres):
    print("on_message_add_vThing")
    try:
        v_thing_id = jres['vThingID']
        res = create_vThing_on_Broker(jres)
        if res:
            print("subscribing to vThing topics: ")
            # add subscription for virtual Thing data topic (on mqtt data client)
            print(v_thing_prefix + '/' + v_thing_id + '/' + v_thing_data_suffix)
            mqtt_virIoT_data_client.subscribe(
                v_thing_prefix + '/' + v_thing_id + '/' + v_thing_data_suffix)
            mqtt_virIoT_data_client.message_callback_add(v_thing_prefix + '/' + v_thing_id + '/' + v_thing_data_suffix,
                                                         on_vThing_data)
            # add subscription for virtual Thing control topic (on mqtt control client)
            print(v_thing_prefix + '/' + v_thing_id + '/' + out_control_suffix)
            mqtt_virIoT_control_client.subscribe(
                v_thing_prefix + '/' + v_thing_id + '/' + out_control_suffix)
            mqtt_virIoT_control_client.message_callback_add(v_thing_prefix + '/' + v_thing_id + '/' + out_control_suffix,
                                                            on_vThing_out_control)
            # retrieve last context for the virtual thing from the thing visor
            fetch_last_context(v_thing_id)
            return 'OK'
        else:
            return 'Creatiion fails'
    except Exception as ex:
        traceback.print_exc()
        return 'ERROR'


def on_message_delete_vThing(jres):
    print("on_message_delete_vThing")
    try:
        v_thing_id = jres['vThingID']
        # removing mqtt subscriptions and callbacks
        mqtt_virIoT_data_client.message_callback_remove(
            v_thing_prefix + '/' + v_thing_id + '/' + v_thing_data_suffix)
        mqtt_virIoT_data_client.unsubscribe(
            v_thing_prefix + '/' + v_thing_id + '/' + v_thing_data_suffix)

        mqtt_virIoT_control_client.message_callback_remove(
            v_thing_prefix + '/' + v_thing_id + '/out_control')
        mqtt_virIoT_control_client.unsubscribe(
            v_thing_prefix + '/' + v_thing_id + '/out_control')
        delete_vThing_on_Broker(jres)

    except Exception:
        traceback.print_exc()
        return 'ERROR'


def on_vThing_data(mosq, obj, msg):
    try:
        if isinstance(msg, str):
            jres = json.loads(msg.replace("\'", "\""))
        else:
            payload = msg.payload.decode("utf-8", "ignore")
            jres = json.loads(payload.replace("\'", "\""))
        print("enter on_vThing_data, msg.payload: " + str(jres))
        on_vThing_data_on_broker(jres)
    except Exception as ex:
        traceback.print_exc()
        print('ERROR in on_vThing_data')
        return 'ERROR'
    return 'OK'


def on_vThing_out_control(mosq, obj, msg):
    print("on_vThing_out_control")
    payload = msg.payload.decode("utf-8", "ignore")
    jres = json.loads(payload.replace("\'", "\""))
    if jres["command"] == "deleteVThing":
        msg = {"vThingID": jres["vThingID"]}
        on_message_delete_vThing(msg)
    else:
        # TODO manage others commands
        return 'command not managed'
    return 'OK'


def send_destroy_v_silo_ack_message():
    msg = {"command": "destroyVSiloAck", "ownerID": owner_ID,  "vSiloID": v_silo_id}
    mqtt_virIoT_control_client.publish(
        v_silo_prefix + "/" + v_silo_id + "/" + out_control_suffix, str(msg).replace("\'", "\""))
    return


def on_message_destroy_v_silo(jres):
    send_destroy_v_silo_ack_message()
    mqtt_virIoT_control_client.disconnect()

    print("Shutdown completed")


def fetch_last_context(v_thing_id):
    message = {"command": "getContextRequest",
                "ownerID": owner_ID,
               "vSiloID": v_silo_id, "vThingID": v_thing_id}
    mqtt_virIoT_control_client.publish(
        v_thing_prefix + "/" + v_thing_id + "/" + in_control_suffix, json.dumps(message))


# ############ MQTT Broker Functions ############
# set used to store subscribed topics on broker,
# it is necessary to remove cmd subscriptions following vthing removal
cmd_subscription_set = set()


def init_Raw():
    global mqtt_broker_client
    mqtt_broker_client = mqtt.Client()
    mqtt_broker_client.connect("127.0.0.1")
    mqtt_broker_client.loop_forever()
    return True


def create_vThing_Raw(jres):
    # do nothing, virtual thing topics already subscribed
    return True


def delete_vThing_Raw(jres):
    # clean cmd subscription
    try:
        to_remove = set()
        for cmd_topic in cmd_subscription_set:
            if cmd_topic.startswith(tenant_id+"/"+jres['vThingID']):
                to_remove.add(cmd_topic)
                mqtt_broker_client.message_callback_remove(
                    cmd_topic)
                mqtt_broker_client.unsubscribe(cmd_topic)
        cmd_subscription_set.difference_update(to_remove)
        return True
    except Exception as ex:
        print(ex)
        traceback.print_exc()
        return False


def on_vThing_data_Raw(jmessage):
    try:
        v_thing_id = jmessage['meta']['vThingID']
        data = jmessage['data']
        for entity in data:
            id_LD = entity['id']
            if id_LD.startswith("urn:ngsi-ld:"):
                # remove urn:ngsi-ld: for readability
                id_LD = id_LD[len("urn:ngsi-ld:"):]
            if "commands" in entity:
                commands = entity['commands']['value']
                for cmd_name in commands:
                    # subscribe command topics to receive commands from tenant
                    cmd_topic = tenant_id + '/' + v_thing_id + '/' + id_LD + '/' + cmd_name
                    mqtt_broker_client.message_callback_add(
                        cmd_topic, on_commandRequest_on_Broker)
                    mqtt_broker_client.subscribe(cmd_topic)
                    cmd_subscription_set.add(cmd_topic)
            mqtt_broker_client.publish(
                tenant_id + '/' + v_thing_id + '/' + id_LD, json.dumps(entity))
        return 'OK'
    except Exception as ex:
        print(ex)
        traceback.print_exc()
        return 'FAIL'


def on_commandRequest_Raw(mosq, obj, msg):
    payload = msg.payload.decode("utf-8", "ignore")
    payload.replace("\'", "\"")
    try:
        topic_split = msg.topic.split("/")
        cmd_name = topic_split[-1]
        v_thing_id = "/".join(topic_split[1:-2])
        entity_id = topic_split[-2]
        if entity_id.startswith("urn:ngsi:ld:"):
            cmd_LD_ID = entity_id
        else:
            cmd_LD_ID = "urn:ngsi-ld:"+entity_id
        cmd_LD_Type = None
        cmd_value = json.loads(payload)
        send_command_out(cmd_LD_ID, cmd_LD_Type,
                         cmd_name, cmd_value, v_thing_id)

    except Exception as ex:
        traceback.print_exc()
    return 'OK'


def send_command_out(cmd_LD_ID, cmd_LD_Type, cmd_name, cmd_value, vThingID):

    if cmd_LD_Type != None:
        ngsiLdEntity = {"id": cmd_LD_ID, "type": cmd_LD_Type,
                        cmd_name: {"type": "Property", "value": cmd_value}}
    else:
        ngsiLdEntity = {"id": cmd_LD_ID, cmd_name: {
            "type": "Property", "value": cmd_value}}

    data = [ngsiLdEntity]
    topic = v_thing_prefix + "/" + vThingID + "/" + data_in_suffix
    # publish changed status
    message = {"data": data, "meta": {
        "vSiloID": v_silo_id}}  # neutral-format
    publish_on_virIoT(message, topic)
    return


def publish_on_virIoT(message, out_topic):
    msg = json.dumps(message)
    print("Message sent on "+out_topic + "\n" + msg+"\n")
    # publish data to out_topic
    mqtt_virIoT_data_client.publish(out_topic, msg)



def handler(signal, frame):
    sys.exit()


signal.signal(signal.SIGINT, handler)


if __name__ == '__main__':

    # -------------- DEBUG PARAMETERS --------------
    # tenant_id = "tenant1"
    # flavourParams = []
    # v_silo_id = "tenant1_Silo2"
    # virIoT_mqtt_data_broker_IP = "127.0.0.1"
    # virIoT_mqtt_data_broker_port = 1883
    # virIoT_mqtt_control_broker_IP = "127.0.0.1"
    # virIoT_mqtt_control_broker_port = 1883

    MAX_RETRY = 3
    v_silo_id = os.environ["vSiloID"]

    v_thing_collection = "vThingC"
    v_silo_collection = "vSiloC"

    try:
        # read paramenters from DB
        tenant_id = os.environ["tenantID"]
        parameters = os.environ["flavourParams"]
        virIoT_mqtt_data_broker_IP = os.environ["MQTTDataBrokerIP"]
        virIoT_mqtt_data_broker_port = int(os.environ["MQTTDataBrokerPort"])
        virIoT_mqtt_control_broker_IP = os.environ["MQTTControlBrokerIP"]
        virIoT_mqtt_control_broker_port = int(os.environ["MQTTControlBrokerPort"])
        owner_ID = os.environ["OwnerID"]

    except Exception as e:
        print("Error: Parameters not found in os_environment", e)
        exit()

    print("starting silo controller")

    # command mappping
    initEnv = init_Raw
    delete_vThing_on_Broker = delete_vThing_Raw
    create_vThing_on_Broker = create_vThing_Raw
    on_vThing_data_on_broker = on_vThing_data_Raw
    on_commandRequest_on_Broker = on_commandRequest_Raw

    v_silo_prefix = "vSilo"  # prefix name for virtual IoT System communication topic
    v_thing_prefix = "vThing"  # prefix name for virtual Thing data and control topics
    data_out_suffix = "data_out"
    data_in_suffix = "data_in"
    control_in_suffix = "c_in"
    control_out_suffix = "c_out"

    v_thing_collection = "vThingC"

    silo_broker_thread = broker_thread()
    silo_broker_thread.start()
    virIoT_mqtt_data_thread = MqttDataThread()
    virIoT_mqtt_data_thread.start()
    virIoT_mqtt_control_thread = MqttControlThread()
    virIoT_mqtt_control_thread.start()

    # restore virtual things found in the systemDB. It is useful after vSilo crash and restore (e.g. by k8s)

    while True:
        try:
            time.sleep(3)
        except:
            print("KeyboardInterrupt"+"\n")
            time.sleep(1)
            os._exit(1)
