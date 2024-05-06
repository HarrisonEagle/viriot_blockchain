up:
	./network up
init:
	./network up
	./network channel create
	./network chaincode deploy viriot-chaincode ./chaincode
down:
	./network down
chaincode:
	./network chaincode deploy viriot-chaincode ./chaincode
start-master:
	./network master-controller
setup-grafana:
	kubectl create secret generic grafana-creds \
		--from-literal=GF_SECURITY_ADMIN_USER=admin \
		--from-literal=GF_SECURITY_ADMIN_PASSWORD=admin123 \
		-n viriot-network
	kubectl apply -f kube/grafana.yaml -n viriot-network
update-local-master:
	docker build -t viriot/mastercontroller-on-fabric ./master-controller
	docker build -t viriot/transaction-monitor ./transaction-monitor
	kind load docker-image viriot/mastercontroller-on-fabric
	kind load docker-image viriot/transaction-monitor
	./network master-controller
