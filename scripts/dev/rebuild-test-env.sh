#!/bin/bash

STACK_NAME=integration_test

delete_stack () {
    echo "Deleting stack"
    openstack stack --insecure delete -y --wait "$STACK_NAME"
}

create_stack () {
    echo "Creating stack"
    if STACK_INFO=$(openstack stack --insecure create \
        -f json \
        --template test/integration/env/bigip_stack_pipeline.yaml \
        --timeout 100 \
        --parameter admin_password="$INTEGRATION_ADMIN_PASSWORD" \
        --parameter root_password="$INTEGRATION_ROOT_PASSWORD" \
        --parameter bigip_image="$BIGIP_IMAGE" \
        "$STACK_NAME")
    then
        STACK_ID=$(echo "$STACK_INFO" | jq -r .id)
        echo "Stack is creating with ID $STACK_ID"
    else
        echo "Stack create failed"
        exit 1
    fi
}

poll_status () {
    i=0
    STATUS="UNKNOWN"

    # Limit to 1 hour
    MAX_TRIES=360

    while [[ $STATUS != "CREATE_COMPLETE" ]]; do
        STATUS=$(openstack stack show $STACK_ID -f json | jq -r .stack_status)

        if [[ $(( $i % 10 )) == 0 ]]; then
            echo $STATUS
        fi

        if [[ $i == $MAX_TRIES ]]; then
            echo "Max tries reached. Current status: $STATUS"
            exit 1
        fi

        if [[ $STATUS == "CREATE_FAILED" ]]; then
            echo "Failed to create stack"
            exit 1
        fi

        (( i = i + 1 ))
        sleep 10
    done
    echo $STATUS
}

write_output () {
    echo "Getting device IPs"
    DEVICE_1_IP=$(./scripts/dev/get-host.sh integration_${BIGIP_IMAGE}_1)
    DEVICE_2_IP=$(./scripts/dev/get-host.sh integration_${BIGIP_IMAGE}_2)
    DEVICE_3_IP=$(./scripts/dev/get-host.sh integration_${BIGIP_IMAGE}_3)

    echo "Writing test harness file"
    cat <<EOF > "$TEST_HARNESS_FILE"
    [
        {
            "admin_ip": "$DEVICE_1_IP",
            "f5_rest_user": {
                "username": "admin",
                "password": "$INTEGRATION_ADMIN_PASSWORD"
            },
            "ssh_user": {
                "username": "root",
                "password": "$INTEGRATION_ROOT_PASSWORD"
            }
        },
        {
            "admin_ip": "$DEVICE_2_IP",
            "f5_rest_user": {
                "username": "admin",
                "password": "$INTEGRATION_ADMIN_PASSWORD"
            },
            "ssh_user": {
                "username": "root",
                "password": "$INTEGRATION_ROOT_PASSWORD"
            }
        },
        {
            "admin_ip": "$DEVICE_3_IP",
            "f5_rest_user": {
                "username": "admin",
                "password": "$INTEGRATION_ADMIN_PASSWORD"
            },
            "ssh_user": {
                "username": "root",
                "password": "$INTEGRATION_ROOT_PASSWORD"
            }
        }
    ]
EOF
}

delete_stack
create_stack
poll_status
write_output
echo "Done creating stack"
