/*
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"encoding/json"
	"errors"
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

func (s *SmartContract) CreateThingVisor(ctx contractapi.TransactionContextInterface, id string, JSONstr string) error {
	exists, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	if err != nil {
		return err
	}
	if exists != nil {
		return errors.New("Add fails - thingVisor " + id + " already exists")
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

func (s *SmartContract) GetThingVisor(ctx contractapi.TransactionContextInterface, id string) (*ThingVisor, error) {
	byteData, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	var thingVisor ThingVisor
	if byteData == nil {
		return nil, errors.New("Operation fails - thingVisor " + id + " not exists")
	}
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(byteData, &thingVisor)
	if err != nil {
		return nil, err
	}
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingPrefix, id})
	if err != nil {
		return nil, err
	}
	err = resultsIterator.Close()
	if err != nil {
		return nil, err
	}
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
		thingVisor.VThings = append(thingVisor.VThings, vThingTV)
	}
	return &thingVisor, nil
}

func (s *SmartContract) ThingVisorRunning(ctx contractapi.TransactionContextInterface, id string) error {
	tv, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	var thingVisor ThingVisor
	if err != nil {
		return err
	}
	err = json.Unmarshal(tv, &thingVisor)
	if err != nil || thingVisor.Status != STATUS_RUNNING {
		return errors.New("ThingVisor " + id + "is not running!")
	}
	return nil
}

func (s *SmartContract) DeleteThingVisor(ctx contractapi.TransactionContextInterface, ThingVisorID string) error {
	for _, key := range ctx.GetStub().GetStringArgs()[1:] {
		if err := ctx.GetStub().DelPrivateData(CollectionvThingTVs, key); err != nil {
			return err
		}
	}
	return ctx.GetStub().DelPrivateData(CollectionThingVisors, ThingVisorID)
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

type VThingTVWithKey struct {
	Key    string    `json:"key"`
	VThing *VThingTV `json:"vThing"`
}

type ThingVisorWithVThingKey struct {
	ThingVisor *ThingVisor       `json:"thingVisor"`
	VThings    []VThingTVWithKey `json:"vThings"`
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
	ContainerID                string       `json:"containerID"`
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
	err = vThingIterator.Close()
	if err != nil {
		return nil, err
	}
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
	err = tvIterator.Close()
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SmartContract) GetAllVThings(ctx contractapi.TransactionContextInterface) ([]VThingTV, error) {
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingPrefix})
	if err != nil {
		return nil, err
	}
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
	err = resultsIterator.Close()
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SmartContract) GetAllVThingOfThingVisor(ctx contractapi.TransactionContextInterface, ThingVisorID string) ([]VThingTV, error) {
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingPrefix, ThingVisorID})
	if err != nil {
		return nil, err
	}
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
	err = resultsIterator.Close()
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SmartContract) GetThingVisorWithVThingKeys(ctx contractapi.TransactionContextInterface, ThingVisorID string) (*ThingVisorWithVThingKey, error) {
	byteData, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, ThingVisorID)
	var thingVisor ThingVisor
	if byteData == nil {
		return nil, errors.New("Deletion fails - thingVisor " + ThingVisorID + " not exists")
	}
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(byteData, &thingVisor)
	if err != nil {
		return nil, err
	}
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingPrefix, ThingVisorID})
	if err != nil {
		return nil, err
	}
	var vThings []VThingTVWithKey
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
		vThings = append(vThings, VThingTVWithKey{Key: queryResponse.Key, VThing: &vThingTV})
	}
	err = resultsIterator.Close()
	if err != nil {
		return nil, err
	}
	return &ThingVisorWithVThingKey{ThingVisor: &thingVisor, VThings: vThings}, nil
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

type Flavour struct {
	FlavourID          string   `json:"flavourID"`
	FlavourParams      string   `json:"flavourParams"`
	ImageName          []string `json:"imageName"`
	FlavourDescription string   `json:"flavourDescription"`
	CreationTime       string   `json:"creationTime"`
	Status             string   `json:"status"`
	YamlFiles          []string `json:"yamlFiles"`
}

func (s *SmartContract) AddFlavour(ctx contractapi.TransactionContextInterface, flavourID string) error {
	flavourByte, err := ctx.GetStub().GetPrivateData(CollectionFlavours, flavourID)
	if err != nil {
		return err
	}
	if flavourByte != nil {
		return errors.New("WARNING Add fails - Flavour " + flavourID + " already exists")
	}
	data, err := json.Marshal(Flavour{
		FlavourID:          flavourID,
		FlavourParams:      "",
		ImageName:          []string{},
		FlavourDescription: "",
		CreationTime:       "",
		Status:             STATUS_PENDING,
		YamlFiles:          []string{},
	})
	if err != nil {
		return err
	}
	return ctx.GetStub().PutPrivateData(CollectionFlavours, flavourID, data)
}

func (s *SmartContract) UpdateFlavour(ctx contractapi.TransactionContextInterface, flavourID string, flavourData string) error {
	flavourByte, err := ctx.GetStub().GetPrivateData(CollectionFlavours, flavourID)
	if err != nil {
		return err
	}
	if flavourByte == nil {
		return errors.New("Update Flavour fails - Flavour " + flavourID + " not exist")
	}
	return ctx.GetStub().PutPrivateData(CollectionFlavours, flavourID, json.RawMessage(flavourData))
}

func (s *SmartContract) DeleteFlavour(ctx contractapi.TransactionContextInterface, flavourID string) error {
	flavourByte, err := ctx.GetStub().GetPrivateData(CollectionFlavours, flavourID)
	if err != nil {
		return err
	}
	if flavourByte == nil {
		return errors.New("Delete Flavour fails - Flavour " + flavourID + " not exist")
	}
	return ctx.GetStub().DelPrivateData(CollectionFlavours, flavourID)
}

func (s *SmartContract) GetAllFlavours(ctx contractapi.TransactionContextInterface) ([]Flavour, error) {
	flavourIterator, err := ctx.GetStub().GetPrivateDataByRange(CollectionFlavours, "", "")
	if err != nil {
		return nil, err
	}
	var results []Flavour
	for flavourIterator.HasNext() {
		queryResponse, err := flavourIterator.Next()
		if err != nil {
			return nil, err
		}
		var flavour Flavour
		err = json.Unmarshal(queryResponse.Value, &flavour)
		if err != nil {
			return nil, err
		}
		results = append(results, flavour)
	}
	err = flavourIterator.Close()
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SmartContract) GetFlavour(ctx contractapi.TransactionContextInterface, flavourID string) (*Flavour, error) {
	ctx.GetClientIdentity()
	byteData, err := ctx.GetStub().GetPrivateData(CollectionFlavours, flavourID)
	var flavour Flavour
	if err != nil {
		return nil, err
	}
	if byteData == nil {
		return nil, errors.New("Get Flavour fails - Flavour " + flavourID + " not exist")
	}
	err = json.Unmarshal(byteData, &flavour)
	return &flavour, nil
}

type VirtualSilo struct {
	VSiloID                    string       `json:"vSiloID"`
	VSiloName                  string       `json:"vSiloName"`
	CreationTime               string       `json:"creationTime"`
	ContainerName              string       `json:"containerName"`
	ContainerID                string       `json:"containerID"`
	DeploymentName             string       `json:"deploymentName"`
	ServiceName                string       `json:"serviceName"`
	IPAddress                  string       `json:"ipAddress"`
	FlavourID                  string       `json:"flavourID"`
	FlavourParams              string       `json:"flavourParams"`
	TenantID                   string       `json:"tenantID"`
	Status                     string       `json:"status"`
	Port                       string       `json:"port"`
	MQTTDataBroker             *MQTTProfile `json:"MQTTDataBroker"`
	MQTTControlBroker          *MQTTProfile `json:"MQTTControlBroker"`
	AdditionalServicesNames    []string     `json:"additionalServicesNames"`
	AdditionalDeploymentsNames []string     `json:"additionalDeploymentsNames"`
}

func (s *SmartContract) AddVirtualSilo(ctx contractapi.TransactionContextInterface, VSiloID string) error {
	siloByte, err := ctx.GetStub().GetPrivateData(CollectionvSilos, VSiloID)
	if err != nil {
		return err
	}
	if siloByte != nil {
		return errors.New("WARNING Add fails - VirtualSilo " + VSiloID + " already exists")
	}
	data, err := json.Marshal(VirtualSilo{
		VSiloID:                    VSiloID,
		AdditionalServicesNames:    []string{},
		AdditionalDeploymentsNames: []string{},
		Status:                     STATUS_PENDING,
	})
	if err != nil {
		return err
	}
	return ctx.GetStub().PutPrivateData(CollectionvSilos, VSiloID, data)
}

func (s *SmartContract) UpdateVirtualSilo(ctx contractapi.TransactionContextInterface, VSiloID string, SiloData string) error {
	data, err := ctx.GetStub().GetPrivateData(CollectionvSilos, VSiloID)
	if err != nil {
		return err
	}
	if data == nil {
		return errors.New("Update VirtualSilo fails - VirtualSilo " + VSiloID + " not exist")
	}
	return ctx.GetStub().PutPrivateData(CollectionvSilos, VSiloID, json.RawMessage(SiloData))
}

func (s *SmartContract) DeleteVirtualSilo(ctx contractapi.TransactionContextInterface, VSiloID string) error {
	siloByte, err := ctx.GetStub().GetPrivateData(CollectionvSilos, VSiloID)
	if err != nil {
		return err
	}
	if siloByte == nil {
		return errors.New("Delete Flavour fails - Flavour " + VSiloID + " not exist")
	}
	return ctx.GetStub().DelPrivateData(CollectionvSilos, VSiloID)
}

func (s *SmartContract) GetAllVirtualSilos(ctx contractapi.TransactionContextInterface) ([]VirtualSilo, error) {
	siloIterator, err := ctx.GetStub().GetPrivateDataByRange(CollectionvSilos, "", "")
	if err != nil {
		return nil, err
	}
	var results []VirtualSilo
	for siloIterator.HasNext() {
		queryResponse, err := siloIterator.Next()
		if err != nil {
			return nil, err
		}
		var silo VirtualSilo
		err = json.Unmarshal(queryResponse.Value, &silo)
		if err != nil {
			return nil, err
		}
		results = append(results, silo)
	}
	err = siloIterator.Close()
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SmartContract) GetVirtualSilo(ctx contractapi.TransactionContextInterface, VSiloID string) (*VirtualSilo, error) {
	byteData, err := ctx.GetStub().GetPrivateData(CollectionvSilos, VSiloID)
	var silo VirtualSilo
	if err != nil {
		return nil, err
	}
	if byteData == nil {
		return nil, errors.New("Get VirtualSilo fails - VirtualSilo " + VSiloID + " not exist")
	}
	err = json.Unmarshal(byteData, &silo)
	if err != nil {
		return nil, err
	}
	return &silo, nil
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
