package util

import "os"

type Config struct {
	LogLevel                string
	Port                    string
	Org                     string
	SubmitJobBackoffType    string
	SubmitJobBackoffDelay   string
	SubmitJobConcurrency    string
	SubmitJobAttempts       string
	MaxCompletedSubmitJobs  string
	MaxFailedSubmitJobs     string
	SubmitJobQueueScheduler string
	AsLocalhost             string
	MspIdOrg1               string
	MspIdOrg2               string
	ChannelName             string
	ChaincodeName           string
	CommitTimeout           string
	EndorseTimeout          string
	QueryTimeout            string
	ConnectionProfileOrg1   string
	CertificateOrg1         string
	PrivateKeyOrg1          string
	ConnectionProfileOrg2   string
	CertificateOrg2         string
	PrivateKeyOrg2          string
	RedisHost               string
	RedisPort               string
	RedisUsername           string
	RedisPassword           string
	Org1ApiKey              string
	Org2ApiKey              string
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}

func InitConfig() *Config {
	return &Config{
		LogLevel:                getEnv("LOG_LEVEL", "info"),
		Port:                    ":" + getEnv("PORT", "3000"),
		SubmitJobBackoffType:    getEnv("SUBMIT_JOB_BACKOFF_TYPE", "fixed"),
		SubmitJobBackoffDelay:   getEnv("SUBMIT_JOB_BACKOFF_DELAY", "3000"),
		SubmitJobAttempts:       getEnv("SUBMIT_JOB_ATTEMPTS", "5"),
		SubmitJobConcurrency:    getEnv("SUBMIT_JOB_CONCURRENCY", "5"),
		MaxCompletedSubmitJobs:  getEnv("MAX_COMPLETED_SUBMIT_JOBS", "1000"),
		MaxFailedSubmitJobs:     getEnv("MAX_FAILED_SUBMIT_JOBS", "1000"),
		SubmitJobQueueScheduler: getEnv("SUBMIT_JOB_QUEUE_SCHEDULER", "true"),
		AsLocalhost:             getEnv("AS_LOCAL_HOST", "true"),
		MspIdOrg1:               getEnv("HLF_MSP_ID_ORG1", "Org1MSP"),
		MspIdOrg2:               getEnv("HLF_MSP_ID_ORG2", "Org2MSP"),
		ChannelName:             getEnv("HLF_CHANNEL_NAME", "mychannel"),
		ChaincodeName:           getEnv("HLF_CHAINCODE_NAME", "basic"),
		CommitTimeout:           getEnv("HLF_COMMIT_TIMEOUT", "300"),
		EndorseTimeout:          getEnv("HLF_ENDORSE_TIMEOUT", "30"),
		QueryTimeout:            getEnv("HLF_QUERY_TIMEOUT", "3"),
		ConnectionProfileOrg1:   getEnv("HLF_CONNECTION_PROFILE_ORG1", ""), // to JSON Object
		CertificateOrg1:         getEnv("HLF_CERTIFICATE_ORG1", ""),
		PrivateKeyOrg1:          getEnv("HLF_PRIVATE_KEY_ORG1", ""),
		ConnectionProfileOrg2:   getEnv("HLF_CONNECTION_PROFILE_ORG2", ""), // to JSON Object
		CertificateOrg2:         getEnv("HLF_CERTIFICATE_ORG2", ""),
		PrivateKeyOrg2:          getEnv("HLF_PRIVATE_KEY_ORG2", ""),
		RedisHost:               getEnv("REDIS_HOST", "localhost"),
		RedisPort:               getEnv("REDIS_PORT", "6379"),
		RedisUsername:           getEnv("REDIS_USERNAME", "fabric"),
		RedisPassword:           getEnv("REDIS_PASSWORD", ""),
		Org1ApiKey:              getEnv("ORG1_APIKEY", "123"),
		Org2ApiKey:              getEnv("ORG2_APIKEY", "456"),
	}
}
