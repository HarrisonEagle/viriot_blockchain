/*
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"io/ioutil"
	"log"
	"os"
	"strconv"
	"strings"
)

const (
	CollectionThingVisors string = "collectionThingVisors"
	CollectionvThingTVs   string = "collectionvThingTVs"
	CollectionvThings     string = "collectionvThings"
	CollectionvSilos      string = "collectionvSilos"
	CollectionFlavours    string = "collectionFlavours"

	vThingTVObject string = "vThingTV"
	vThingPrefix   string = "{vtprefix}"

	MessageOK              string = "OK"
	MessageAssetNotExist   string = "Asset Not Exist!"
	MessageAssetExist      string = "Asset Exist!"
	MessageAssetNotRunning string = "Asset Not Running!"

	STATUS_PENDING       string = "pending"
	STATUS_RUNNING       string = "running"
	STATUS_STOPPING      string = "stopping"
	STATUS_STOPPED       string = "stopped"
	STATUS_SHUTTING_DOWN string = "shutting_down"
	STATUS_TERMINATED    string = "terminated"
	STATUS_READY         string = "ready"
	STATUS_ERROR         string = "error"
)

type serverConfig struct {
	CCID    string
	Address string
}

// SmartContract provides functions for managing an asset
type SmartContract struct {
	contractapi.Contract
}

type MQTTProfile struct {
	IP   string `json:"ip"`
	Port string `json:"port"`
}

type ChaincodeMessage struct {
	Message string `json:"message"`
}

func (s *SmartContract) CreateThingVisor(ctx contractapi.TransactionContextInterface, id string, JSONstr string) error {
	exists, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	if err != nil {
		return err
	}
	if exists != nil {
		return fmt.Errorf("the asset %s already exists", id)
	}
	return ctx.GetStub().PutPrivateData(CollectionThingVisors, id, json.RawMessage(JSONstr))
}

func (s *SmartContract) UpdateThingVisor(ctx contractapi.TransactionContextInterface, id string, JSONstr string) error {
	return ctx.GetStub().PutPrivateData(CollectionThingVisors, id, json.RawMessage(JSONstr))
}

func (s *SmartContract) UpdateThingVisorPartial(ctx contractapi.TransactionContextInterface, id string, tvDescription string, params string) error {
	byteData, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	var thingVisor ThingVisor
	if err != nil {
		return err
	}
	err = json.Unmarshal(byteData, &thingVisor)
	if err != nil {
		return err
	}
	if tvDescription != "" {
		thingVisor.TvDescription = tvDescription
	}
	if params != "" {
		thingVisor.Params = params
	}
	assetJSON, err := json.Marshal(thingVisor)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutPrivateData(CollectionThingVisors, id, assetJSON)
}

func (s *SmartContract) ThingVisorExists(ctx contractapi.TransactionContextInterface, id string) *ChaincodeMessage {
	exists, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	if err != nil || exists != nil {
		message := &ChaincodeMessage{Message: MessageAssetExist}
		return message
	}
	message := &ChaincodeMessage{Message: MessageAssetNotExist}
	return message
}

func (s *SmartContract) GetThingVisor(ctx contractapi.TransactionContextInterface, id string) *ThingVisor {
	byteData, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	var thingVisor ThingVisor
	if err != nil {
		return nil
	}
	err = json.Unmarshal(byteData, &thingVisor)
	if err != nil {
		return nil
	}
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{id})
	if err != nil {
		return nil
	}
	defer resultsIterator.Close()
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil
		}
		var vThingTV VThingTV
		err = json.Unmarshal(queryResponse.Value, &vThingTV)
		if err != nil {
			return nil
		}
		thingVisor.VThings = append(thingVisor.VThings, vThingTV)
	}
	return &thingVisor
}

func (s *SmartContract) ThingVisorRunning(ctx contractapi.TransactionContextInterface, id string) *ChaincodeMessage {
	tv, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	var thingVisor ThingVisor
	if err != nil {
		message := &ChaincodeMessage{Message: err.Error()}
		return message
	}
	err = json.Unmarshal(tv, &thingVisor)
	if err != nil || thingVisor.Status != STATUS_RUNNING {
		message := &ChaincodeMessage{Message: MessageAssetNotRunning}
		return message
	}
	message := &ChaincodeMessage{Message: MessageOK}
	return message
}

func (s *SmartContract) DeleteThingVisor(ctx contractapi.TransactionContextInterface, id string) error {
	return ctx.GetStub().DelPrivateData(CollectionThingVisors, id)
}

func (s *SmartContract) StopThingVisor(ctx contractapi.TransactionContextInterface, ThingVisorID string) error {
	thingVisorByte, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, ThingVisorID)
	if err != nil {
		return err
	}
	if thingVisorByte == nil {
		return errors.New("WARNING Add fails - ThingVisor " + ThingVisorID + " not exist")
	}
	var thingVisor ThingVisor
	if err := json.Unmarshal(thingVisorByte, &thingVisor); err != nil {
		return err
	}
	if thingVisor.Status != STATUS_RUNNING {
		return errors.New("WARNING Add fails - ThingVisor " + ThingVisorID + " is not ready")
	}
	thingVisor.Status = STATUS_STOPPING
	assetJSON, err := json.Marshal(thingVisor)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutPrivateData(CollectionThingVisors, ThingVisorID, assetJSON)
}

type VThingTV struct {
	Label       string `json:"label"`
	ID          string `json:"id"`
	Description string `json:"description"`
}

type ThingVisor struct {
	ThingVisorID               string       `json:"thingVisorID"`
	CreationTime               string       `json:"creationTime"`
	TvDescription              string       `json:"tvDescription"`
	Status                     string       `json:"status"`
	DebugMode                  bool         `json:"debug_mode"`
	IpAddress                  string       `json:"ipAddress"`
	DeploymentName             string       `json:"deploymentName"`
	ServiceName                string       `json:"serviceName"`
	VThings                    []VThingTV   `json:"vThings"` // 型は一定? (label id description)
	Params                     string       `json:"params"`
	MQTTDataBroker             *MQTTProfile `json:"MQTTDataBroker"`
	MQTTControlBroker          *MQTTProfile `json:"MQTTControlBroker"`
	AdditionalServicesNames    []string     `json:"additionalServicesNames"`
	AdditionalDeploymentsNames []string     `json:"additionalDeploymentsNames"`
}

func (s *SmartContract) GetAllThingVisors(ctx contractapi.TransactionContextInterface) ([]ThingVisor, error) {
	vThingIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingPrefix})
	tvIterator, err := ctx.GetStub().GetPrivateDataByRange(CollectionThingVisors, "", "")
	defer vThingIterator.Close()
	if err != nil {
		return nil, err
	}
	var vThings []VThingTV
	for vThingIterator.HasNext() {
		queryResponse, err := vThingIterator.Next()
		if err != nil {
			return nil, err
		}
		var vThingTV VThingTV
		err = json.Unmarshal(queryResponse.Value, &vThingTV)
		if err != nil {
			return nil, err
		}
		vThings = append(vThings, vThingTV)
	}
	defer tvIterator.Close()
	var results []ThingVisor
	for tvIterator.HasNext() {
		queryResponse, err := tvIterator.Next()
		if err != nil {
			return nil, err
		}
		var thingVisor ThingVisor
		err = json.Unmarshal(queryResponse.Value, &thingVisor)
		if err != nil {
			return nil, err
		}
		for _, v := range vThings {
			keyArr := strings.Split(v.ID, "/")
			if keyArr[0] == thingVisor.ThingVisorID {
				thingVisor.VThings = append(thingVisor.VThings, v)
			}
		}
		results = append(results, thingVisor)
	}
	return results, nil
}

func (s *SmartContract) GetAllVThings(ctx contractapi.TransactionContextInterface) ([]VThingTV, error) {
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingPrefix})
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()
	var results []VThingTV
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vThingTV VThingTV
		err = json.Unmarshal(queryResponse.Value, &vThingTV)
		if err != nil {
			return nil, err
		}
		results = append(results, vThingTV)
	}
	return results, nil
}
func (s *SmartContract) AddVThingToThingVisor(ctx contractapi.TransactionContextInterface, ThingVisorID string, vThingData string) error {
	thingVisorByte, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, ThingVisorID)
	if err != nil {
		return err
	}
	if thingVisorByte == nil {
		return errors.New("WARNING Add fails - ThingVisor " + ThingVisorID + " not exist")
	}
	var thingVisor ThingVisor
	if err := json.Unmarshal(thingVisorByte, &thingVisor); err != nil {
		return err
	}
	if thingVisor.Status != STATUS_RUNNING {
		return errors.New("WARNING Add fails - ThingVisor " + ThingVisorID + " is not ready")
	}
	var newVThing VThingTV
	newVThingByte := json.RawMessage(vThingData)
	if err := json.Unmarshal(newVThingByte, &newVThing); err != nil {
		return err
	}
	newVThingID := newVThing.ID
	keyArr := strings.Split(newVThingID, "/")
	if keyArr[0] != ThingVisorID {
		return errors.New("WARNING Add fails - vThingID '" + newVThingID + "' not valid")
	}
	key, err := ctx.GetStub().CreateCompositeKey(vThingTVObject, []string{vThingPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return err
	}
	return ctx.GetStub().PutPrivateData(CollectionvThingTVs, key, newVThingByte)
}

func (s *SmartContract) DeleteAllVThingsFromThingVisor(ctx contractapi.TransactionContextInterface, ThingVisorID string) error {
	thingVisorByte, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, ThingVisorID)
	if err != nil {
		return err
	}
	if thingVisorByte == nil {
		return errors.New("WARNING Add fails - ThingVisor " + ThingVisorID + " not exist")
	}
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingPrefix, ThingVisorID})
	if err != nil {
		return err
	}
	var keys []string
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return err
		}
		keys = append(keys, queryResponse.Key)
	}
	for _, key := range keys {
		err = ctx.GetStub().DelPrivateData(CollectionvThingTVs, key)
		if err != nil {
			return err
		}
	}
	resultsIterator.Close()

	return nil
}

func main() {
	// See chaincode.env.example
	config := serverConfig{
		CCID:    os.Getenv("CHAINCODE_ID"),
		Address: os.Getenv("CHAINCODE_SERVER_ADDRESS"),
	}

	chaincode, err := contractapi.NewChaincode(&SmartContract{})

	if err != nil {
		log.Panicf("error create asset-transfer-basic chaincode: %s", err)
	}

	server := &shim.ChaincodeServer{
		CCID:     config.CCID,
		Address:  config.Address,
		CC:       chaincode,
		TLSProps: getTLSProperties(),
	}

	if err := server.Start(); err != nil {
		log.Panicf("error starting asset-transfer-basic chaincode: %s", err)
	}
}

func getTLSProperties() shim.TLSProperties {
	// Check if chaincode is TLS enabled
	tlsDisabledStr := getEnvOrDefault("CHAINCODE_TLS_DISABLED", "true")
	key := getEnvOrDefault("CHAINCODE_TLS_KEY", "")
	cert := getEnvOrDefault("CHAINCODE_TLS_CERT", "")
	clientCACert := getEnvOrDefault("CHAINCODE_CLIENT_CA_CERT", "")

	// convert tlsDisabledStr to boolean
	tlsDisabled := getBoolOrDefault(tlsDisabledStr, false)
	var keyBytes, certBytes, clientCACertBytes []byte
	var err error

	if !tlsDisabled {
		keyBytes, err = ioutil.ReadFile(key)
		if err != nil {
			log.Panicf("error while reading the crypto file: %s", err)
		}
		certBytes, err = ioutil.ReadFile(cert)
		if err != nil {
			log.Panicf("error while reading the crypto file: %s", err)
		}
	}
	// Did not request for the peer cert verification
	if clientCACert != "" {
		clientCACertBytes, err = ioutil.ReadFile(clientCACert)
		if err != nil {
			log.Panicf("error while reading the crypto file: %s", err)
		}
	}

	return shim.TLSProperties{
		Disabled:      tlsDisabled,
		Key:           keyBytes,
		Cert:          certBytes,
		ClientCACerts: clientCACertBytes,
	}
}

func getEnvOrDefault(env, defaultVal string) string {
	value, ok := os.LookupEnv(env)
	if !ok {
		value = defaultVal
	}
	return value
}

// Note that the method returns default value if the string
// cannot be parsed!
func getBoolOrDefault(value string, defaultVal bool) bool {
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return defaultVal
	}
	return parsed
}
