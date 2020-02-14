#! /bin/bash

if [[ "$#" -ne 1 ]]; then
    echo "usage: [info script] <test_harness_file>"
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

TEST_HARNESS_FILE=$1
TEST_IPS=($(cat "$TEST_HARNESS_FILE" | jq -r .[].admin_ip))
TEST_USERS=($(cat "$TEST_HARNESS_FILE" | jq -r .[].admin_username))
TEST_PASSWORDS=($(cat "$TEST_HARNESS_FILE" | jq -r .[].admin_password))

i=0
for IP in "${TEST_IPS[@]}"; do
    USER=${TEST_USERS[$i]}
    PASSWORD=${TEST_PASSWORDS[$i]}
    "$SCRIPT_DIR"/scpRemoteFile.sh $IP $USER $PASSWORD /var/log/restnoded/restnoded.log test/logs/restnoded.bigip_$i.log
    "$SCRIPT_DIR"/scpRemoteFile.sh $IP $USER $PASSWORD /var/log/restnoded/restnoded1.log test/logs/restnoded1.bigip_$i.log
    i=$((i+1))
done
