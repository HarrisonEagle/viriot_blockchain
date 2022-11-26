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
	CollectionThingVisors  string = "collectionThingVisors"
	CollectionvThingTVs    string = "collectionvThingTVs"
	CollectionvThingVSilos string = "collectionvThingVSilos"
	CollectionvSilos       string = "collectionvSilos"
	CollectionFlavours     string = "collectionFlavours"

	vThingTVObject    string = "vThingTV"
	vThingTVPrefix    string = "{vthingtvprefix}"
	vSiloObject       string = "vSilo"
	vSiloPrefix       string = "{vsiloprefix}"
	vThingVSiloObject string = "vThingVSilo"
	vThingVSiloPrefix string = "{vthingvsiloprefix}"

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

type GraphNode struct {
	StartNode string `json:"start_node"`
	EndNode   string `json:"end_node"`
	Delete    bool   `json:"delete"`
}

type History struct {
	EventName  string      `json:"event_name"`
	Time       string      `json:"time"`
	TxID       string      `json:"tx_id"`
	UserID     string      `json:"user_id"`
	UserMSPID  string      `json:"user_mspid"`
	GraphNodes []GraphNode `json:"graph_nodes"`
}

func SetHistory(ctx contractapi.TransactionContextInterface, EventName string, nodes []GraphNode, userID string, userMSPID string) error {
	time, _ := ctx.GetStub().GetTxTimestamp()
	history := History{
		EventName:  EventName,
		Time:       time.String(),
		TxID:       ctx.GetStub().GetTxID(),
		UserID:     userID,
		UserMSPID:  userMSPID,
		GraphNodes: nodes,
	}
	byte, err := json.Marshal(history)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent(EventName, byte)
}

func (s *SmartContract) CreateThingVisor(ctx contractapi.TransactionContextInterface, id string, JSONstr string) error {
	log.Println("Creating Vthing")
	exists, err := ctx.GetStub().GetPrivateData(CollectionThingVisors, id)
	if err != nil {
		return err
	}
	if exists != nil {
		return errors.New("Add fails - thingVisor " + id + " already exists")
	}
	if err := ctx.GetStub().PutPrivateData(CollectionThingVisors, id, json.RawMessage(JSONstr)); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "CreateThingVisor", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "thingvisor-" + id, Delete: false},
	}, userID, userMSPID)
}

func (s *SmartContract) UpdateThingVisor(ctx contractapi.TransactionContextInterface, id string, JSONstr string) error {
	if err := ctx.GetStub().PutPrivateData(CollectionThingVisors, id, json.RawMessage(JSONstr)); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "UpdateThingVisor", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "thingvisor-" + id, Delete: false},
	}, userID, userMSPID)
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
	if err := ctx.GetStub().PutPrivateData(CollectionThingVisors, id, assetJSON); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "UpdateThingVisorPartial", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "thingvisor-" + id, Delete: false},
	}, userID, userMSPID)
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
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingTVPrefix, id})
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
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	graphNode := []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "thingvisor-" + ThingVisorID, Delete: true},
	}
	args := ctx.GetStub().GetStringArgs()
	for i := 2; i < len(args); i++ {
		vThingID := args[i]
		keyArr := strings.Split(vThingID, "/")
		if keyArr[0] != ThingVisorID {
			return errors.New("WARNING Delete fails - vThingID '" + vThingID + "' not valid")
		}

		key, err := ctx.GetStub().CreateCompositeKey(vThingTVObject, []string{vThingTVPrefix, keyArr[0], keyArr[1]})
		if err != nil {
			return errors.New("Failed to create composite key of '" + key + "'")
		}
		/*
			if err := ctx.GetStub().DelPrivateData(CollectionvThingTVs, key); err != nil {
				return errors.New("Failed to delete VTHING '" + vThingID + "'")
			}*/
		graphNode = append(graphNode, GraphNode{StartNode: "thingvisor-" + ThingVisorID, EndNode: "vthing-" + vThingID, Delete: true})
	}
	if err := ctx.GetStub().DelPrivateData(CollectionThingVisors, ThingVisorID); err != nil {
		return err
	}
	return SetHistory(ctx, "DeleteThingVisor", graphNode, userID, userMSPID)
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
	if err := ctx.GetStub().PutPrivateData(CollectionThingVisors, ThingVisorID, assetJSON); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "StopThingVisor", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "thingvisor-" + ThingVisorID, Delete: false},
	}, userID, userMSPID)
}

type VThingTV struct {
	Label       string `json:"label"`
	ID          string `json:"id"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Endpoint    string `json:"endpoint"`
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
	vThingIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingTVPrefix})
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
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingTVPrefix})
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

func (s *SmartContract) GetVThingByID(ctx contractapi.TransactionContextInterface, VThingID string) (*VThingTV, error) {
	var vThing VThingTV
	keyArr := strings.Split(VThingID, "/")
	key, err := ctx.GetStub().CreateCompositeKey(vThingTVObject, []string{vThingTVPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return nil, errors.New("Get VThing " + VThingID + "failed")
	}
	byteData, err := ctx.GetStub().GetPrivateData(CollectionvThingTVs, key)
	if byteData == nil {
		return nil, errors.New("Get VThing Failed - VThing " + VThingID + " not exists")
	}
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(byteData, &vThing)
	if err != nil {
		return nil, err
	}
	return &vThing, err
}

func (s *SmartContract) GetAllVThingOfThingVisor(ctx contractapi.TransactionContextInterface, ThingVisorID string) ([]VThingTV, error) {
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingTVs, vThingTVObject, []string{vThingTVPrefix, ThingVisorID})
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
	key, err := ctx.GetStub().CreateCompositeKey(vThingTVObject, []string{vThingTVPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutPrivateData(CollectionvThingTVs, key, newVThingByte); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "AddVThingToThingVisor", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "thingvisor-" + ThingVisorID, Delete: false},
		{StartNode: "thingvisor-" + ThingVisorID, EndNode: "vthing-" + newVThingID, Delete: false},
	}, userID, userMSPID)
}

func (s *SmartContract) UpdateVThingOfThingVisor(ctx contractapi.TransactionContextInterface, VThingID string, vThingData string) error {
	var VThing VThingTV
	VThingByte := json.RawMessage(vThingData)
	if err := json.Unmarshal(VThingByte, &VThing); err != nil {
		return err
	}
	keyArr := strings.Split(VThingID, "/")
	key, err := ctx.GetStub().CreateCompositeKey(vThingTVObject, []string{vThingTVPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutPrivateData(CollectionvThingTVs, key, VThingByte); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "UpdateVThingOfThingVisor", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "thingvisor-" + keyArr[0], Delete: false},
		{StartNode: "thingvisor-" + keyArr[0], EndNode: "vthing-" + VThingID, Delete: false},
	}, userID, userMSPID)
}

func (s *SmartContract) GetVThingOfThingVisor(ctx contractapi.TransactionContextInterface, VThingID string) (*VThingTV, error) {
	keyArr := strings.Split(VThingID, "/")
	key, err := ctx.GetStub().CreateCompositeKey(vThingTVObject, []string{vThingTVPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return nil, errors.New("Error to create composite key of" + VThingID)
	}
	byteData, err := ctx.GetStub().GetPrivateData(CollectionvThingTVs, key)
	var vThing VThingTV
	if byteData == nil {
		return nil, errors.New("VThing " + VThingID + " not exists")
	}
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(byteData, &vThing)
	if err != nil {
		return nil, err
	}
	return &vThing, nil
}

func (s *SmartContract) DeleteVThingFromThingVisor(ctx contractapi.TransactionContextInterface, ThingVisorID string, vThingData string) error {
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
	var VThing VThingTV
	VThingByte := json.RawMessage(vThingData)
	if err := json.Unmarshal(VThingByte, &VThing); err != nil {
		return err
	}
	VThingID := VThing.ID
	keyArr := strings.Split(VThingID, "/")
	if keyArr[0] != ThingVisorID {
		return errors.New("WARNING Add fails - vThingID '" + VThingID + "' not valid")
	}
	key, err := ctx.GetStub().CreateCompositeKey(vThingTVObject, []string{vThingTVPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return err
	}
	if err := ctx.GetStub().DelPrivateData(CollectionvThingTVs, key); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "DeleteVThingFromThingVisor", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "thingvisor-" + ThingVisorID, EndNode: "vthing-" + VThingID, Delete: true},
	}, userID, userMSPID)

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
	if err := ctx.GetStub().PutPrivateData(CollectionFlavours, flavourID, data); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "AddFlavour", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "flavour-" + flavourID, Delete: false},
	}, userID, userMSPID)
}

func (s *SmartContract) UpdateFlavour(ctx contractapi.TransactionContextInterface, flavourID string, flavourData string) error {
	flavourByte, err := ctx.GetStub().GetPrivateData(CollectionFlavours, flavourID)
	if err != nil {
		return err
	}
	if flavourByte == nil {
		return errors.New("Update Flavour fails - Flavour " + flavourID + " not exist")
	}
	if err := ctx.GetStub().PutPrivateData(CollectionFlavours, flavourID, json.RawMessage(flavourData)); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "UpdateFlavour", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "flavour-" + flavourID, Delete: false},
	}, userID, userMSPID)
}

func (s *SmartContract) DeleteFlavour(ctx contractapi.TransactionContextInterface, flavourID string) error {
	flavourByte, err := ctx.GetStub().GetPrivateData(CollectionFlavours, flavourID)
	if err != nil {
		return err
	}
	if flavourByte == nil {
		return errors.New("Delete Flavour fails - Flavour " + flavourID + " not exist")
	}
	if err := ctx.GetStub().DelPrivateData(CollectionFlavours, flavourID); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "DeleteFlavour", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "flavour-" + flavourID, Delete: true},
	}, userID, userMSPID)
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

func (s *SmartContract) AddVirtualSilo(ctx contractapi.TransactionContextInterface, VSiloID string, flavourID string) error {
	keyArr := strings.Split(VSiloID, "_")
	key, err := ctx.GetStub().CreateCompositeKey(vSiloObject, []string{vSiloPrefix, keyArr[0], keyArr[1]}) //keyArr[1] is flavourID
	if err != nil {
		return errors.New("Generate key of " + VSiloID + " failed.")
	}
	siloByte, err := ctx.GetStub().GetPrivateData(CollectionvSilos, key)
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
	if err := ctx.GetStub().PutPrivateData(CollectionvSilos, key, data); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "AddVirtualSilo", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "silo-" + VSiloID, Delete: false},
		{StartNode: "flavour-" + flavourID, EndNode: "silo-" + VSiloID, Delete: false},
	}, userID, userMSPID)
}

func (s *SmartContract) UpdateVirtualSilo(ctx contractapi.TransactionContextInterface, VSiloID string, SiloData string) error {
	keyArr := strings.Split(VSiloID, "_")
	key, err := ctx.GetStub().CreateCompositeKey(vSiloObject, []string{vSiloPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return errors.New("Generate key of " + VSiloID + " failed.")
	}
	data, err := ctx.GetStub().GetPrivateData(CollectionvSilos, key)
	if err != nil {
		return err
	}
	if data == nil {
		return errors.New("Update VirtualSilo fails - VirtualSilo " + VSiloID + " not exist")
	}
	if err := ctx.GetStub().PutPrivateData(CollectionvSilos, key, json.RawMessage(SiloData)); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "UpdateVirtualSilo", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "silo-" + VSiloID, Delete: false},
	}, userID, userMSPID)
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
	keyArr := strings.Split(VSiloID, "_")
	key, err := ctx.GetStub().CreateCompositeKey(vSiloObject, []string{vSiloPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return nil, errors.New("Generate key of " + VSiloID + " failed.")
	}
	byteData, err := ctx.GetStub().GetPrivateData(CollectionvSilos, key)
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

func (s *SmartContract) GetVirtualSilosByTenantID(ctx contractapi.TransactionContextInterface, TenantID string) ([]VirtualSilo, error) {
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvSilos, vSiloObject, []string{vSiloPrefix, TenantID})
	if err != nil {
		return nil, err
	}
	var results []VirtualSilo
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vSilo VirtualSilo
		err = json.Unmarshal(queryResponse.Value, &vSilo)
		if err != nil {
			return nil, err
		}
		results = append(results, vSilo)
	}
	err = resultsIterator.Close()
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SmartContract) DeleteVirtualSilo(ctx contractapi.TransactionContextInterface, VSiloID string) error {
	keyArr := strings.Split(VSiloID, "_")
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	graphNode := []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "silo-" + VSiloID, Delete: true},
		{StartNode: "flavour-" + keyArr[1], EndNode: "silo-" + VSiloID, Delete: true},
	}
	args := ctx.GetStub().GetStringArgs()
	for i := 2; i < len(args); i++ {
		vThingID := args[i]
		key, err := ctx.GetStub().CreateCompositeKey(vThingVSiloObject, []string{vThingVSiloPrefix, keyArr[0], keyArr[1], vThingID})
		if err != nil {
			return errors.New("Generate key of " + VSiloID + vThingID + " failed.")
		}
		if err := ctx.GetStub().DelPrivateData(CollectionvThingVSilos, key); err != nil {
			return errors.New("Warning - Delete VThing" + vThingID + " Failed.")
		}
		graphNode = append(graphNode, GraphNode{StartNode: "silo-" + VSiloID, EndNode: "vthing-" + vThingID, Delete: true})
	}
	key, err := ctx.GetStub().CreateCompositeKey(vSiloObject, []string{vSiloPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return errors.New("Generate key of " + VSiloID + " failed.")
	}
	if err := ctx.GetStub().DelPrivateData(CollectionvSilos, key); err != nil {
		return errors.New("Warning - Delete VirtualSilo " + VSiloID + " Failed.")
	}
	return SetHistory(ctx, "DeleteVirtualSilo", graphNode, userID, userMSPID)
}

type VThingVSilo struct {
	TenantID     string `json:"tenantID"`
	VSiloID      string `json:"vSiloID"`
	CreationTime string `json:"creationTime"`
	VThingID     string `json:"vThingID"`
}

func (s *SmartContract) AddVThingVSilo(ctx contractapi.TransactionContextInterface, VSiloID string, VThingID string, Data string) error {
	keyArr := strings.Split(VSiloID, "_")
	key, err := ctx.GetStub().CreateCompositeKey(vThingVSiloObject, []string{vThingVSiloPrefix, keyArr[0], keyArr[1], VThingID})
	if err != nil {
		return errors.New("Generate key of " + VSiloID + VThingID + " failed.")
	}
	if err := ctx.GetStub().PutPrivateData(CollectionvThingVSilos, key, json.RawMessage(Data)); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "AddVThingVSilo", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "silo-" + VSiloID, Delete: false},
		{StartNode: "silo-" + VSiloID, EndNode: "vthing-" + VThingID, Delete: false},
	}, userID, userMSPID)
}

func (s *SmartContract) DeleteVThingVSilo(ctx contractapi.TransactionContextInterface, VSiloID string, VThingID string) error {
	keyArr := strings.Split(VSiloID, "_")
	key, err := ctx.GetStub().CreateCompositeKey(vThingVSiloObject, []string{vThingVSiloPrefix, keyArr[0], keyArr[1], VThingID})
	if err != nil {
		return errors.New("Generate key of " + VSiloID + VThingID + " failed.")
	}
	if err := ctx.GetStub().DelPrivateData(CollectionvThingVSilos, key); err != nil {
		return err
	}
	userID, _ := ctx.GetClientIdentity().GetID()
	userMSPID, _ := ctx.GetClientIdentity().GetMSPID()
	return SetHistory(ctx, "DeleteVThingVSilo", []GraphNode{
		{StartNode: userMSPID, EndNode: "user-" + userID, Delete: false},
		{StartNode: "user-" + userID, EndNode: userMSPID, Delete: false},
		{StartNode: "user-" + userID, EndNode: "silo-" + VSiloID, Delete: false},
		{StartNode: "silo-" + VSiloID, EndNode: "vthing-" + VThingID, Delete: true},
	}, userID, userMSPID)
}

func (s *SmartContract) GetVThingVSilosByVSiloID(ctx contractapi.TransactionContextInterface, VSiloID string) ([]VThingVSilo, error) {
	keyArr := strings.Split(VSiloID, "_")
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingVSilos, vThingVSiloObject, []string{vThingVSiloPrefix, keyArr[0], keyArr[1]})
	if err != nil {
		return nil, err
	}
	var results []VThingVSilo
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vThingVSilo VThingVSilo
		err = json.Unmarshal(queryResponse.Value, &vThingVSilo)
		if err != nil {
			return nil, err
		}
		results = append(results, vThingVSilo)
	}
	err = resultsIterator.Close()
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SmartContract) GetVThingVSilosByTenantID(ctx contractapi.TransactionContextInterface, TenantID string) ([]VThingVSilo, error) {
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingVSilos, vThingVSiloObject, []string{vThingVSiloPrefix, TenantID})
	if err != nil {
		return nil, err
	}
	var results []VThingVSilo
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vThingVSilo VThingVSilo
		err = json.Unmarshal(queryResponse.Value, &vThingVSilo)
		if err != nil {
			return nil, err
		}
		results = append(results, vThingVSilo)
	}
	err = resultsIterator.Close()
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SmartContract) GetVThingVSilo(ctx contractapi.TransactionContextInterface, VSiloID string, VThingID string) ([]VThingVSilo, error) {
	keyArr := strings.Split(VSiloID, "_")
	resultsIterator, err := ctx.GetStub().GetPrivateDataByPartialCompositeKey(CollectionvThingVSilos, vThingVSiloObject, []string{vThingVSiloPrefix, keyArr[0], keyArr[1], VThingID})
	if err != nil {
		return nil, err
	}
	var results []VThingVSilo
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vThingVSilo VThingVSilo
		err = json.Unmarshal(queryResponse.Value, &vThingVSilo)
		if err != nil {
			return nil, err
		}
		results = append(results, vThingVSilo)
	}
	err = resultsIterator.Close()
	if err != nil {
		return nil, err
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
