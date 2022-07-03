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
	CollectionvThings     string = "collectionvThings"
	CollectionvSilos      string = "collectionvSilos"
	CollectionFlavours    string = "collectionFlavours"

	MessageOK              string = "OK"
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

// Asset describes basic details of what makes up a simple asset
type Asset struct {
	ID             string `json:"ID"`
	Color          string `json:"color"`
	Size           int    `json:"size"`
	Owner          string `json:"owner"`
	AppraisedValue int    `json:"appraisedValue"`
}

type MQTTProfile struct {
	IP   string `json:"ip"`
	Port string `json:"port"`
}

type ChaincodeMessage struct {
	Message string `json:"message"`
}

// QueryResult structure used for handling result of query
type QueryResult struct {
	Key    string `json:"Key"`
	Record *Asset
}

// InitLedger adds a base set of cars to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{ID: "asset1", Color: "blue", Size: 5, Owner: "Tomoko", AppraisedValue: 300},
		{ID: "asset2", Color: "red", Size: 5, Owner: "Brad", AppraisedValue: 400},
		{ID: "asset3", Color: "green", Size: 10, Owner: "Jin Soo", AppraisedValue: 500},
		{ID: "asset4", Color: "yellow", Size: 10, Owner: "Max", AppraisedValue: 600},
		{ID: "asset114", Color: "black", Size: 15, Owner: "Adriana", AppraisedValue: 700},
		{ID: "asset514", Color: "white", Size: 15, Owner: "Michel", AppraisedValue: 800},
	}

	for _, asset := range assets {
		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return err
		}

		err = ctx.GetStub().PutPrivateData(CollectionThingVisors, asset.ID, assetJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state: %v", err)
		}
	}

	return nil
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

func (s *SmartContract) ThingVisorExists(ctx contractapi.TransactionContextInterface, id string) *ChaincodeMessage {
	exists, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	if err != nil || exists != nil {
		message := &ChaincodeMessage{Message: MessageAssetExist}
		return message
	}
	message := &ChaincodeMessage{Message: MessageOK}
	return message
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
	exists, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	if err != nil {
		return err
	}
	if exists != nil {
		return fmt.Errorf("the asset %s already exists", id)
	}
	return ctx.GetStub().DelPrivateData(CollectionThingVisors, id)
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
	resultsIterator, err := ctx.GetStub().GetPrivateDataByRange(CollectionThingVisors, "", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()
	var results []ThingVisor
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var thingVisor ThingVisor
		err = json.Unmarshal(queryResponse.Value, &thingVisor)
		if err != nil {
			return nil, err
		}
		results = append(results, thingVisor)
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
	if err := json.Unmarshal(json.RawMessage(vThingData), &newVThing); err != nil {
		return err
	}
	newVThingID := newVThing.ID
	for _, v := range thingVisor.VThings {
		if v.ID == newVThingID {
			return errors.New("WARNING Add fails - vThingID '" + newVThingID + "' already in use")
		}
	}
	if strings.Split(newVThingID, "/")[0] != ThingVisorID {
		return errors.New("WARNING Add fails - vThingID '" + newVThingID + "' not valid")
	}
	thingVisor.VThings = append(thingVisor.VThings, newVThing)
	assetJSON, err := json.Marshal(thingVisor)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutPrivateData(CollectionThingVisors, ThingVisorID, assetJSON)
}

// CreateAsset issues a new asset to the world state with given details.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id, color string, size int, owner string, appraisedValue int) error {
	exists, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	if err != nil {
		return err
	}
	if exists != nil {
		return fmt.Errorf("the asset %s already exists", id)
	}
	asset := Asset{
		ID:             id,
		Color:          color,
		Size:           size,
		Owner:          owner,
		AppraisedValue: appraisedValue,
	}

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutPrivateData(CollectionThingVisors, id, assetJSON)
}

// ReadAsset returns the asset stored in the world state with given id.
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, id string) (*Asset, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state. %s", err.Error())
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the asset %s does not exist", id)
	}

	var asset Asset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return nil, err
	}

	return &asset, nil
}

// UpdateAsset updates an existing asset in the world state with provided parameters.
func (s *SmartContract) UpdateAsset(ctx contractapi.TransactionContextInterface, id, color string, size int, owner string, appraisedValue int) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	// overwritting original asset with new asset
	asset := Asset{
		ID:             id,
		Color:          color,
		Size:           size,
		Owner:          owner,
		AppraisedValue: appraisedValue,
	}

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}

// DeleteAsset deletes an given asset from the world state.
func (s *SmartContract) DeleteAsset(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	return ctx.GetStub().DelState(id)
}

// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state. %s", err.Error())
	}

	return assetJSON != nil, nil
}

// TransferAsset updates the owner field of asset with given id in world state, and returns the old owner.
func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string) (string, error) {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return "", err
	}

	oldOwner := asset.Owner
	asset.Owner = newOwner

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return "", err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return "", err
	}

	return oldOwner, nil
}

//vThingに関してはcollectionvThing+thingVisorIDにする

// GetAllAssets returns all assets found in world state
func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface) ([]QueryResult, error) {
	// range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetPrivateDataByRange(CollectionThingVisors, "", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var results []QueryResult

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()

		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}

		queryResult := QueryResult{Key: queryResponse.Key, Record: &asset}
		results = append(results, queryResult)
	}

	return results, nil
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
