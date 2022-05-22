package util

import (
	"github.com/hyperledger/fabric-sdk-go/pkg/core/config"
	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
)

func CreateWallet(config *Config) *gateway.Wallet {
	wallet := gateway.NewInMemoryWallet()
	orgIdentity := gateway.NewX509Identity(config.MspIdOrg, config.CertificateOrg, config.PrivateKeyOrg)
	wallet.Put(config.MspIdOrg, orgIdentity)
	return wallet
}

func CreateGateway(org string, connctionProfile string, wallet *gateway.Wallet) (*gateway.Gateway, error) {
	gw, err := gateway.Connect(
		gateway.WithConfig(config.FromRaw([]byte(connctionProfile), "json")), //GatewayOptions(ConnectionProfile)
		//gateway.WithIdentity(wallet, vconfig.MspIdOrg1),
		gateway.WithIdentity(wallet, org),
	)
	if err != nil {
		return nil, err
	}
	return gw, nil
}

func GetNetwork(gateway *gateway.Gateway, channelName string) (*gateway.Network, error) {
	network, err := gateway.GetNetwork(channelName)
	if err != nil {
		return nil, err
	}
	return network, err
}

func GetContract(network *gateway.Network, chaincodeName string) *gateway.Contract {
	return network.GetContract(chaincodeName)
}
