package util

import (
	"log"
	"os"
)

type Config struct {
	Port                 string
	Org                  string
	MspIdOrg             string
	ChannelName          string
	ChaincodeName        string
	ConnectionProfileOrg string
	CertificateOrg       string
	PrivateKeyOrg        string
	OrgApiKey            string
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}

func InitConfig() *Config {
	if getEnv("AS_LOCAL_HOST", "false") == "true" {
		err := os.Setenv("DISCOVERY_AS_LOCALHOST", "true")
		if err != nil {
			log.Fatalf("Error setting DISCOVERY_AS_LOCALHOST environemnt variable: %v", err)
		}
	}
	return &Config{
		Port:                 ":" + getEnv("PORT", "3000"),
		MspIdOrg:             getEnv("HLF_MSP_ID_ORG", "Org1MSP"),
		ChannelName:          getEnv("HLF_CHANNEL_NAME", "mychannel"),
		ChaincodeName:        getEnv("HLF_CHAINCODE_NAME", "basic"),
		ConnectionProfileOrg: getEnv("HLF_CONNECTION_PROFILE_ORG", ""), // to JSON Object
		CertificateOrg:       getEnv("HLF_CERTIFICATE_ORG", ""),
		PrivateKeyOrg:        getEnv("HLF_PRIVATE_KEY_ORG", ""),
		OrgApiKey:            getEnv("ORG_APIKEY", "123"),
	}
}
