#!/bin/bash

if [ -z "$1" ]; then
    echo "Target machine name is required"
    exit 1
fi

IP=$(openstack server --insecure show $1 -c addresses -f value | cut -d ';' -f 1 | cut -d '=' -f 2)
echo "$IP"