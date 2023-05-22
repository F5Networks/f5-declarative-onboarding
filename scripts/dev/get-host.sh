#!/bin/bash

# Colors
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}Target machine name is required${NC}"
    exit 1
fi

target_machine="$1"
MAX_TRIES=5
current_try=0

while [[ -z $ip && $current_try < $MAX_TRIES ]]; do
    if SERVER_INFO=$(openstack server --insecure show $target_machine -c addresses -f value 2>/dev/null); then
        ip=$(echo $SERVER_INFO | cut -d ';' -f 1 | cut -d '=' -f 2)
    else
        (( current_try = current_try + 1 ))
        sleep 5
    fi
done

if [[ $staus == UNKNOWN ]]; then
    openstack_output=null
fi

echo "$ip"