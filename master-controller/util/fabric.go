package util

import (
	"github.com/hyperledger/fabric-sdk-go/pkg/core/config"
	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
)

func CreateWallet(config *Config) *gateway.Wallet {
	wallet := gateway.NewInMemoryWallet()
	org1Identity := gateway.NewX509Identity(config.MspIdOrg1, config.CertificateOrg1, config.PrivateKeyOrg1)
	wallet.Put(config.MspIdOrg1, org1Identity)
	org2Identity := gateway.NewX509Identity(config.MspIdOrg2, config.CertificateOrg2, config.PrivateKeyOrg2)
	wallet.Put(config.MspIdOrg2, org2Identity)
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
