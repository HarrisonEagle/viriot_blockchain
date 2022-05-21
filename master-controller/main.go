package main

import (
	"github.com/gin-gonic/gin"
	"os"
	"viriot-blockchain/master_controller/util"
)

func main() {
	config := util.InitConfig()
	wallet := util.CreateWallet(config)
	gw1, err := util.CreateGateway(config.MspIdOrg1, config.ConnectionProfileOrg1, wallet)
	defer gw1.Close()
	if err != nil {
		os.Exit(1)
	}
	gw2, err := util.CreateGateway(config.MspIdOrg2, config.ConnectionProfileOrg2, wallet)
	defer gw2.Close()
	if err != nil {
		os.Exit(1)
	}
	nw1, err := util.GetNetwork(gw1, config.ChannelName)
	if err != nil {
		os.Exit(1)
	}
	nw2, err := util.GetNetwork(gw2, config.ChannelName)
	if err != nil {
		os.Exit(1)
	}
	util.GetContract(nw1, config.ChaincodeName)
	util.GetContract(nw2, config.ChaincodeName)
	r := gin.Default()
	//r.Use(middleware.Auth(config))
	r.GET("/api/assets", func(c *gin.Context) {
		contract := util.GetContract(nw1, config.ChaincodeName)
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
		contract := util.GetContract(nw1, config.ChaincodeName)
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
		contract := util.GetContract(nw1, config.ChaincodeName)
		result, err := contract.SubmitTransaction("CreateAsset", "Asset1919", "yellow", "5", "TDKR", "1300")
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
