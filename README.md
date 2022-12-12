# [WIP]VirIoT Network with Hyperldger Fabric

This is the VirIoT Platform developed with HyperLedger Fabric network.

Original VirIoT Project: https://github.com/fed4iot/VirIoT
This project is based on test-network sample developed by HyperLedger Fabric:https://github.com/hyperledger/fabric-samples/tree/main/test-network-k8s

## Prerequisites:

- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [jq](https://stedolan.github.io/jq/)
- [envsubst](https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation.html) (`brew install gettext` on OSX)

- K8s - either:
  - (Only tested at KIND) [KIND](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) + [Docker](https://www.docker.com)


## Quickstart 

Create a KIND cluster:  
```shell
./network kind
./network cluster init
```

Launch the network, create a channel, and deploy the [viriot-chaincode](../chaincode) to local blockchain network: 
```shell
make init
```

Invoke and query chaincode:
```shell
./network chaincode invoke viriot-chaincode '{"Args":["InitLedger"]}'
./network chaincode query  viriot-chaincode '{"Args":["ReadAsset","asset1"]}'
```

Start VirIoT MasterController
```shell
make start-master
```

Shut down the local network: 
```shell
make down 
```

Tear down the cluster (KIND): 
```shell
./network unkind
```

## References
- [fabric-samples/test-network-k8s](https://github.com/hyperledger/fabric-samples/tree/main/test-network-k8s)
