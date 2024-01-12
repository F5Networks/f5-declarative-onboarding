#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$BIGIPS_ADDRESSES" ]; then
    echo -e "${RED}BIGIPS_ADDRESSES is required.${NC}"
    exit 1
fi

IPS_ARRAY=($(echo $BIGIPS_ADDRESSES))

echo '[' | tr -d '\n'
for i in "${IPS_ARRAY[@]}"
do
    jq -n \
        --arg ip "$i" \
        --arg admin_username "$ADMIN_USERNAME" \
        --arg admin_password "$ADMIN_PASSWORD" \
        --arg root_password "$ADMIN_PASSWORD" \
        '{ admin_ip: $ip,
           f5_rest_user: { username: $admin_username,
                           password: $admin_password },
           ssh_user: { username: "root",
                       password: $root_password }
         }' | tr -d '\n'
    if [ "$i" != "${IPS_ARRAY[${#IPS_ARRAY[@]}-1]}" ]
        then echo ','
    fi
done
echo ']'
