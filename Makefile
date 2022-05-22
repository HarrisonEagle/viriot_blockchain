up:
	./network up
init:
	./network up
	./network channel create
	./network chaincode deploy viriot-chaincode basic_1.0 chaincode
	./network chaincode invoke viriot-chaincode '{"Args":["InitLedger"]}'
down:
	./network down
chaincode:
	./network chaincode deploy viriot-chaincode basic_1.0 chaincode
start-master:
	./network master-controller
update-local-master:
	docker build -t viriot/mastercontroller-on-fabric ./master-controller
	kind load docker-image viriot/mastercontroller-on-fabric
	./network master-controller