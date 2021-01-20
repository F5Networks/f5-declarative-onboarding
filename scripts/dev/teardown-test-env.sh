#!/bin/bash

STACK_NAME=integration_test

echo "Deleting stack"
    openstack stack --insecure delete -y --wait "$STACK_NAME"
