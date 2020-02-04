#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "Target machine is required for installation."
    exit 0
fi

if [ -z "$2" ]; then
    echo "Credentials [username:password] for target machine are required for installation."
    exit 0
fi

TARGET="$1"
CREDS="$2"
TARGET_RPM="$3"

if [ -z "$TARGET_RPM" ]; then
    TARGET_RPM=$(ls -t dist/f5-declarative-onboarding-*.rpm 2>/dev/null | head -1)
fi

if [ -z "$TARGET_RPM" ]; then
    echo "Could not find RPM in ./dist folder. Verify that ./dist folder contains" \
        "f5-declarative-onboarding-*.rpm or provide specific file path to RPM."
    exit 0
fi

RPM_NAME=$(basename $TARGET_RPM)
CURL_FLAGS="--silent --write-out \n --insecure -u $CREDS"

poll_task () {
    STATUS="STARTED"
    while [ $STATUS != "FINISHED" ]; do
        sleep 1
        RESULT=$(curl ${CURL_FLAGS} "https://$TARGET/mgmt/shared/iapp/package-management-tasks/$1")
        STATUS=$(echo $RESULT | jq -r .status)

        if [[ $RESULT = *"Authentication failed: Password expired."* ]]; then
            echo "Password expired! You will need to update the supplied user's password!"
            echo "Response: $RESULT"
            exit 1
        elif [ $STATUS = "FAILED" ]; then
            echo "Failed to" $(echo $RESULT | jq -r .operation) "package:" \
                $(echo $RESULT | jq -r .errorMessage)
            exit 1
        fi
    done
}

#Get list of existing f5-declarative-onboarding packages on target
TASK=$(curl $CURL_FLAGS -H "Content-Type: application/json" \
    -X POST https://$TARGET/mgmt/shared/iapp/package-management-tasks -d "{operation: 'QUERY'}")
poll_task $(echo $TASK | jq -r .id)
RPMS=$(echo $RESULT | jq -r '.queryResponse[].packageName | select(. | startswith("f5-declarative-onboarding"))')

#Uninstall existing f5-declarative-onboarding packages on target
for PKG in $RPMS; do
    echo "Uninstalling $PKG on $TARGET"
    DATA="{\"operation\":\"UNINSTALL\",\"packageName\":\"$PKG\"}"
    TASK=$(curl ${CURL_FLAGS} "https://$TARGET/mgmt/shared/iapp/package-management-tasks" \
        --data $DATA -H "Origin: https://$TARGET" -H "Content-Type: application/json;charset=UTF-8")
    poll_task $(echo $TASK | jq -r .id)
done

#Upload new f5-declarative-onboarding RPM to target
echo "Uploading RPM to https://$TARGET/mgmt/shared/file-transfer/uploads/$RPM_NAME"
LEN=$(wc -c $TARGET_RPM | cut -f 1 -d " ")
RANGE_SIZE=5000000
CHUNKS=$(( $LEN / $RANGE_SIZE))
for i in $(seq 0 $CHUNKS); do
    START=$(( $i * $RANGE_SIZE))
    END=$(( $START + $RANGE_SIZE))
    END=$(( $LEN < $END ? $LEN : $END))
    OFFSET=$(( $START + 1))
    curl ${CURL_FLAGS} -o /dev/null --write-out "" \
        https://$TARGET/mgmt/shared/file-transfer/uploads/$RPM_NAME \
        --data-binary @<(tail -c +$OFFSET $TARGET_RPM) \
        -H "Content-Type: application/octet-stream" \
        -H "Content-Range: $START-$(( $END - 1))/$LEN" \
        -H "Content-Length: $(( $END - $START ))" \
        -H "Connection: keep-alive"
done

#Install f5-declarative-onboarding on target
echo "Installing $RPM_NAME on $TARGET"
DATA="{\"operation\":\"INSTALL\",\"packageFilePath\":\"/var/config/rest/downloads/$RPM_NAME\"}"
TASK=$(curl ${CURL_FLAGS} "https://$TARGET/mgmt/shared/iapp/package-management-tasks" \
    --data $DATA -H "Origin: https://$TARGET" -H "Content-Type: application/json;charset=UTF-8")
poll_task $(echo $TASK | jq -r .id)

echo "Waiting for /declarative-onboarding/info endpoint to be available"
until curl ${CURL_FLAGS} -o /dev/null --write-out "" --fail --silent \
    "https://$TARGET/mgmt/shared/declarative-onboarding/info"; do
    sleep 1
done

echo "Installed $RPM_NAME on $TARGET"

exit 0
