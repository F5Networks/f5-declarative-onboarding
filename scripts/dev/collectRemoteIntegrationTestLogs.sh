#! /bin/bash

if [[ "$#" -ne 1 ]]; then
    echo "usage: [info script] <test_harness_file>"
    exit 1
fi

# Colors
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

TEST_HARNESS_FILE=$1

if [ -z "$TEST_HARNESS_FILE" ]; then
    echo -e "${RED}TEST_HARNESS_FILE is required as a parameter.${NC}"
    exit 1
fi

TEST_IPS=($(cat "$TEST_HARNESS_FILE" | jq -r .[].admin_ip))
TEST_USERS=($(cat "$TEST_HARNESS_FILE" | jq -r .[].ssh_user.username))
TEST_PASSWORDS=($(cat "$TEST_HARNESS_FILE" | jq -r .[].ssh_user.password))

i=0
for IP in "${TEST_IPS[@]}"; do
    USER=${TEST_USERS[$i]}
    PASSWORD=${TEST_PASSWORDS[$i]}
    "$SCRIPT_DIR"/scpRemoteFile.sh $IP $USER $PASSWORD /var/log/restnoded/restnoded.log test/logs/restnoded.bigip_$i.log
    "$SCRIPT_DIR"/scpRemoteFile.sh $IP $USER $PASSWORD /var/log/restnoded/restnoded1.log test/logs/restnoded1.bigip_$i.log
    "$SCRIPT_DIR"/scpRemoteFile.sh $IP $USER $PASSWORD /var/log/restnoded/restnoded2.log test/logs/restnoded2.bigip_$i.log
    "$SCRIPT_DIR"/scpRemoteFile.sh $IP $USER $PASSWORD /var/log/restnoded/restnoded3.log test/logs/restnoded3.bigip_$i.log
    i=$((i+1))
done
