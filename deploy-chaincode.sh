#!/bin/bash

# Exit on first error
set -e

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

pushd ./network
./network.sh deployCC -ccn viriot -ccv 1 -cci initLedger -ccl "go" -ccp "../chaincode"
popd