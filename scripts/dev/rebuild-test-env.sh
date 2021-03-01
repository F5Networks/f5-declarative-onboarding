#!/bin/bash

BIGIP_VERSION=$(echo $BIGIP_IMAGE | cut -d '-' -f 2)
STACK_NAME=integration_test-${BIGIP_VERSION}

OPERATION=CREATE

if [[ -n "$1" ]]; then
    OPERATION=$1
fi

if [[ $OPERATION != CREATE && $OPERATION != DELETE ]]; then
    echo "OPERATION must be CREATE or DELETE"
    echo "Usage: $0 CREATE (default) | DELETE"
    exit 1
fi

echo "Operation $OPERATION"
echo

delete_stack () {
    echo "Deleting stack"

    MAX_TRIES=5
    currentTry=0

    stack_id=''
    while [[ -z $stack_id && $currentTry < $MAX_TRIES ]]; do
        if RESULT=$(openstack stack --insecure delete -y "$STACK_NAME" 2>/dev/null); then
            stack_id="$STACK_NAME"
        else
            if [[ "$RESULT" != *"Stack not found"* ]]; then
                echo "Failed attempt to delete."
                (( currentTry = currentTry + 1 ))
            else
                stack_id="$STACK_NAME"
            fi
        fi
    done

    if [[ -z $stack_id ]]; then
        echo "Stack delete failed"
        exit 1
    fi

    poll_status DELETE

    stack_id=''
    echo "Done deleting stack"
}

create_stack () {
    echo "Creating stack"

    MAX_TRIES=5
    currentTry=0

    stack_id=''

    while [[ -z $stack_id && $currentTry < $MAX_TRIES ]]; do
        if STACK_INFO=$(openstack stack --insecure create \
            -f json \
            --template test/integration/env/bigip_stack_pipeline.yaml \
            --timeout 100 \
            --parameter artifactory_url=$ARTIFACTORY_URL \
            --parameter admin_password="$INTEGRATION_ADMIN_PASSWORD" \
            --parameter root_password="$INTEGRATION_ROOT_PASSWORD" \
            --parameter bigip_image="$BIGIP_IMAGE" \
            "$STACK_NAME")
        then
            stack_id=$(echo "$STACK_INFO" | jq -r .id)
            echo "Stack is creating with ID $stack_id"
        else
            echo "Failed attempt to create. Cleaning up..."
            delete_stack
            (( currentTry = currentTry + 1 ))
        fi
    done

    if [[ -z $stack_id ]]; then
        echo "Stack create failed"
        exit 1
    fi

    poll_status CREATE
    echo "Done creating stack"
}

poll_status () {
    current_operation="$1"
    num_tries=0

    # Limit to 1 hour
    MAX_TRIES=360

    if [[ $current_operation == CREATE ]]; then
        SUCCESS_VALUES=("CREATE_COMPLETE")
        FAIL_VALUES=("CREATE_FAILED")
    else
        SUCCESS_VALUES=("DELETE_COMPLETE" "Stack not found")
        FAIL_VALUES=("DELETE_FAILED")
    fi

    status="UNKNOWN"
    while [[ $status != SUCCESS ]]; do
        # Grab the raw output, which may be an error rather than json.
        # If the output is not json, just use the output - we might be deleting
        # a stack which does not exist which causes the command to error but is normal
        openstack_output=$((openstack stack show $stack_id -f json) 2>&1)
        stack_status=$(echo $openstack_output | jq -r .stack_status 2>/dev/null)
        if [[ -z $stack_status ]]; then
            stack_status="$openstack_output"
        fi

        if [[ $(( $num_tries % 10 )) == 0 ]]; then
            echo "$stack_status"
        fi

        # Check for errors on which we should exit
        is_failure=$(contains_element "$stack_status" "${FAIL_VALUES[@]}")
        if [[ $is_failure == true ]]; then
            status=FAIL
            fail_reason=$(openstack stack show $stack_id -f json | jq -r .stack_status_reason)
            echo "Failed to $current_operation stack: $fail_reason"
            exit 1
        fi

        if [[ $num_tries == $MAX_TRIES ]]; then
            status=FAIL
            echo "Max tries reached. Current status: $stack_status"
            exit 1
        fi

        # Check for success - if not, wait and check again later
        is_success=$(contains_element "$stack_status" "${SUCCESS_VALUES[@]}")
        if [[ $is_success == true ]]; then
            status=SUCCESS
        else
            (( num_tries = num_tries + 1 ))
            sleep 10
        fi
    done

    echo "$status"
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

contains_element () {
    needle=$1
    shift
    haystack=("$@")

    found=false

    for i in "${haystack[@]}"
    do
        if [[ "$needle" == *"$i"* ]]; then
            found=true
        fi
    done

    echo $found
}

delete_stack

if [[ $OPERATION == CREATE ]]; then
    create_stack
    write_output
fi