up:
	./network up
init:
	./network up
	./network channel create
	./network chaincode deploy viriot-chaincode basic_1.0 chaincode 1
down:
	./network down
chaincode:
	./network chaincode deploy viriot-chaincode basic_1.0 chaincode 1
start-master:
	./network master-controller
update-local-master:
	docker build -t viriot/mastercontroller-on-fabric ./master-controller
	docker build -t viriot/history-listener ./chaincode-history
	kind load docker-image viriot/mastercontroller-on-fabric
	kind load docker-image viriot/history-listener
	./network master-controller
