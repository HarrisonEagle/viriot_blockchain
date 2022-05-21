package middleware

import (
	"github.com/gin-gonic/gin"
	"log"
	"viriot-blockchain/master_controller/util"
)

func Auth(config *util.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println(config)
		c.Next()
	}
}
