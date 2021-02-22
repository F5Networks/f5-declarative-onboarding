#!/bin/bash

exec 1>/tmp/do_onboard.log 2>&1

if [ -z "$1" ]; then
    echo "Password to use for root account must be provided."
    exit 0
fi

if [ -z "$2" ]; then
    echo "Password to use for admin account must be provided."
    exit 0
fi

ROOT_PASSWORD=$1
ADMIN_PASSWORD=$2

echo 'Setting passwords'
/usr/bin/passwd root "$ROOT_PASSWORD" >/dev/null 2>&1
/usr/bin/passwd admin "$ADMIN_PASSWORD" >/dev/null 2>&1

echo 'Waiting for tmsh to be ready'
checks=0
while [ $checks -lt 120 ]; do echo 'checking mcpd'
    if tmsh -a show sys mcp-state field-fmt | grep -q running; then
        echo mcpd ready
        break
    fi
    echo mcpd not ready yet
    let checks=checks+1
    sleep 10
done
echo 'Modifying settings'

# Enable admin login
tmsh modify auth user admin shell bash
tmsh modify sys software update auto-phonehome disabled

# Configure directory size
tmsh modify /sys disk directory /appdata new-size 130985984
tmsh save /sys config

echo
echo Done
