#!/bin/bash

BIGIP_VERSION=$(echo $BIGIP_IMAGE | cut -d '-' -f 2)
STACK_NAME=integration_test-${BIGIP_VERSION}

echo "Deleting stack"
    openstack stack --insecure delete -y "$STACK_NAME"
