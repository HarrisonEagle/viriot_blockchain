#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# This magical awk script led to 30 hours of debugging a "TLS handshake error"
# moral: do not edit / alter the number of '\' in the following transform:
function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

function json_ccp {
  local ORG=$1
  local PP=$(one_line_pem $2)
  local CP=$(one_line_pem $3)
  local NS=$4
  sed -e "s/\${ORG}/$ORG/" \
      -e "s#\${PEERPEM}#$PP#" \
      -e "s#\${CAPEM}#$CP#" \
      -e "s#\${NS}#$NS#" \
      scripts/ccp-template.json
}


function construct_master_controller_configmap() {
  

  pop_fn
}

function rollout_master_controller() {
  push_fn "Starting VirIoT Master Controller"

  kubectl -n $NS apply -f kube/master-controller.yaml
  kubectl -n $NS rollout status deploy/viriot-master-controller

  pop_fn
}

function launch_master_controller() {

  push_fn "Constructing viriot-master-controller-org1 connection profiles"

  ENROLLMENT_DIR=${TEMP_DIR}/enrollments
  CHANNEL_MSP_DIR=${TEMP_DIR}/channel-msp
  CONFIG_DIR=${TEMP_DIR}/viriot-master-controller-config-org1 

  mkdir -p $CONFIG_DIR

  local peer_pem=$CHANNEL_MSP_DIR/peerOrganizations/org1/msp/tlscacerts/tlsca-signcert.pem
  local ca_pem=$CHANNEL_MSP_DIR/peerOrganizations/org1/msp/cacerts/ca-signcert.pem
  echo "$(json_ccp 1 $peer_pem $ca_pem $ORG1_NS)" > build/viriot-master-controller-config-org1/HLF_CONNECTION_PROFILE_ORG

  cp $ENROLLMENT_DIR/org1/users/org1admin/msp/signcerts/cert.pem $CONFIG_DIR/HLF_CERTIFICATE_ORG
  cp $ENROLLMENT_DIR/org1/users/org1admin/msp/keystore/key.pem $CONFIG_DIR/HLF_PRIVATE_KEY_ORG

  kubectl -n $NS delete configmap viriot-master-controller-config-org1 || true
  kubectl -n $NS create configmap viriot-master-controller-config-org1 --from-file=$CONFIG_DIR

  push_fn "Constructing viriot-fabric-transaction-monitor connection profiles"

  ENROLLMENT_DIR=${TEMP_DIR}/enrollments
  CHANNEL_MSP_DIR=${TEMP_DIR}/channel-msp
  CONFIG_DIR=${TEMP_DIR}/viriot-fabric-transaction-monitor

  mkdir -p $CONFIG_DIR

  local peer_pem=$CHANNEL_MSP_DIR/peerOrganizations/org1/msp/tlscacerts/tlsca-signcert.pem
  local ca_pem=$CHANNEL_MSP_DIR/peerOrganizations/org1/msp/cacerts/ca-signcert.pem
  echo "$(json_ccp 1 $peer_pem $ca_pem $ORG1_NS)" > build/viriot-fabric-transaction-monitor/HLF_CONNECTION_PROFILE_ORG

  cp $ENROLLMENT_DIR/org1/users/org1admin/msp/signcerts/cert.pem $CONFIG_DIR/HLF_CERTIFICATE_ORG
  cp $ENROLLMENT_DIR/org1/users/org1admin/msp/keystore/key.pem $CONFIG_DIR/HLF_PRIVATE_KEY_ORG
  cp ${TEMP_DIR}/cas/org1-ca/tlsca-cert.pem $CONFIG_DIR/HLF_ROOT_CERTIFICATE_ORG

  kubectl -n $NS delete configmap viriot-fabric-transaction-monitor || true
  kubectl -n $NS create configmap viriot-fabric-transaction-monitor --from-file=$CONFIG_DIR

  push_fn "Constructing viriot-master-controller-org2 connection profiles"

  ENROLLMENT_DIR=${TEMP_DIR}/enrollments
  CHANNEL_MSP_DIR=${TEMP_DIR}/channel-msp
  CONFIG_DIR=${TEMP_DIR}/viriot-master-controller-config-org2

  mkdir -p $CONFIG_DIR

  peer_pem=$CHANNEL_MSP_DIR/peerOrganizations/org2/msp/tlscacerts/tlsca-signcert.pem
  ca_pem=$CHANNEL_MSP_DIR/peerOrganizations/org2/msp/cacerts/ca-signcert.pem
  echo "$(json_ccp 2 $peer_pem $ca_pem $ORG2_NS)" > build/viriot-master-controller-config-org2/HLF_CONNECTION_PROFILE_ORG

  cp $ENROLLMENT_DIR/org2/users/org2admin/msp/signcerts/cert.pem $CONFIG_DIR/HLF_CERTIFICATE_ORG
  cp $ENROLLMENT_DIR/org2/users/org2admin/msp/keystore/key.pem $CONFIG_DIR/HLF_PRIVATE_KEY_ORG

  kubectl -n $NS delete configmap viriot-master-controller-config-org2 || true
  kubectl -n $NS create configmap viriot-master-controller-config-org2 --from-file=$CONFIG_DIR

  apply_template kube/vernemq-mqtt-org1.yaml $NS
  apply_template kube/master-controller-org1.yaml $NS

  kubectl -n $NS rollout status deploy/viriot-master-controller-org1

  apply_template kube/transaction-monitor.yaml $NS
  kubectl -n $NS rollout status deploy/viriot-fabric-transaction-monitor

  apply_template kube/vernemq-mqtt-org2.yaml $NS
  apply_template kube/master-controller-org2.yaml $NS
  kubectl -n $NS rollout status deploy/viriot-master-controller-org2

  log ""
  log "The viriot-master-controller has started."
  log "See https://github.com/hyperledger/fabric-samples/tree/main/asset-transfer-basic/rest-api-typescript for additional usage details."
  log "To access the endpoint:"
  log ""
  log "export SAMPLE_APIKEY=97834158-3224-4CE7-95F9-A148C886653E"
  log 'curl -s --header "X-Api-Key: ${SAMPLE_APIKEY}" viriot-master-controller-org1.'${DOMAIN}'/api/assets'
  log ""
  log "export SAMPLE_APIKEY=BC42E734-062D-4AEE-A591-5973CB763430"
  log 'curl -s --header "X-Api-Key: ${SAMPLE_APIKEY}" viriot-master-controller-org2.'${DOMAIN}'/api/assets'
  log ""
}
