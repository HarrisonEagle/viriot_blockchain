package main

import (
	"github.com/gin-gonic/gin"
	"os"
	"viriot-blockchain/master_controller/util"
)

func main() {
	config := util.InitConfig()
	wallet := util.CreateWallet(config)
	gateway, err := util.CreateGateway(config.MspIdOrg, config.ConnectionProfileOrg, wallet)
	defer gateway.Close()
	if err != nil {
		os.Exit(1)
	}
	network, err := util.GetNetwork(gateway, config.ChannelName)
	if err != nil {
		os.Exit(1)
	}
	util.GetContract(network, config.ChaincodeName)
	r := gin.Default()
	//r.Use(middleware.Auth(config))
	r.GET("/api/assets", func(c *gin.Context) {
		contract := util.GetContract(network, config.ChaincodeName)
		result, err := contract.EvaluateTransaction("GetAllAssets")
		if err != nil {
			c.JSON(400, gin.H{
				"result": "evaluate transaction failed!:" + err.Error(),
			})
		}
		c.JSON(200, gin.H{
			"result": string(result),
		})
	})
	r.GET("/api/assets/asset1", func(c *gin.Context) {
		contract := util.GetContract(network, config.ChaincodeName)
		result, err := contract.EvaluateTransaction("ReadAsset", "asset1")
		if err != nil {
			c.JSON(400, gin.H{
				"result": "evaluate transaction failed!:" + err.Error(),
			})
		}
		c.JSON(200, gin.H{
			"result": string(result),
		})
	})
	r.GET("/api/add", func(c *gin.Context) {
		contract := util.GetContract(network, config.ChaincodeName)
		_, err := contract.SubmitTransaction("CreateAsset", "Asset1919", "yellow", "5", "TDKR", "1300")
		if err != nil {
			c.JSON(400, gin.H{
				"result": "submit transaction failed!:" + err.Error(),
			})
		}
		c.JSON(200, gin.H{
			"resultOK": config.ConnectionProfileOrg,
		})
	})
	r.GET("/api/add2", func(c *gin.Context) {
		contract := util.GetContract(network, config.ChaincodeName)
		result, err := contract.SubmitTransaction("CreateAsset", "Asset11591", "yellow", "5", "TDN", "1300")
		if err != nil {
			c.JSON(400, gin.H{
				"result": "submit transaction failed!:" + err.Error(),
			})
		}
		c.JSON(200, gin.H{
			"result": string(result),
		})
	})
	r.Run(":3000")
}
