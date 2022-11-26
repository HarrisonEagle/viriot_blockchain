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
setup-grafana:
	kubectl create secret generic influxdb-creds \
		--from-literal=INFLUXDB_DB=monitoring \
		--from-literal=INFLUXDB_USER=user \
		--from-literal=INFLUXDB_USER_PASSWORD=influxdbpw \
		--from-literal=INFLUXDB_READ_USER=readonly \
		--from-literal=INFLUXDB_READ_USER_PASSWORD=influxdbpw \
		--from-literal=INFLUXDB_ADMIN_USER=root \
		--from-literal=INFLUXDB_ADMIN_USER_PASSWORD=influxdbpw \
		--from-literal=INFLUXDB_HOST=influxdb  \
		--from-literal=INFLUXDB_HTTP_AUTH_ENABLED=true \
		-n viriot-network

	kubectl create secret generic grafana-creds \
		--from-literal=GF_SECURITY_ADMIN_USER=admin \
		--from-literal=GF_SECURITY_ADMIN_PASSWORD=admin123 \
		-n viriot-network
	kubectl apply -f kube/grafana.yaml -n viriot-network
	kubectl apply -f kube/influxdb.yaml -n viriot-network
update-local-master:
	docker build -t viriot/mastercontroller-on-fabric ./master-controller
	docker build -t viriot/chaincode-history-listener ./chaincode-history-listener
	docker build -t viriot/chaincode-event-listener ./chaincode-event-listener
	kind load docker-image viriot/mastercontroller-on-fabric
	kind load docker-image viriot/chaincode-history-listener
	kind load docker-image viriot/chaincode-event-listener
	./network master-controller
