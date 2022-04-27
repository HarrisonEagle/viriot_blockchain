#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error
set -e

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

# launch network; create channel and join peer to channel

pushd ./network
./network.sh down
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn viriot -ccv 1 -cci initLedger -ccl "go" -ccp "../chaincode"
popd
