#!/bin/bash

BIGIP_VERSION=$(echo $BIGIP_IMAGE | cut -d '-' -f 2)
STACK_NAME=integration_test-${BIGIP_VERSION}

OPERATION=CREATE

if [[ -n "$1" ]]; then
    OPERATION=$1
fi

if [[ -z "$TEST_HARNESS_FILE" ]]; then
    TEST_HARNESS_FILE=test_harness.json
fi

if [[ $OPERATION != CREATE && $OPERATION != DELETE ]]; then
    echo "OPERATION must be CREATE or DELETE"
    echo "Usage: $0 CREATE (default) | DELETE"
    exit 1
fi

if [[ $OPERATION == CREATE ]]; then
    if [[ -z $ARTIFACTORY_URL ]]; then
        echo "ARTIFACTORY_URL must be set"
        exit 1
    fi

    if [[ -z $INTEGRATION_ADMIN_PASSWORD ]]; then
        echo "INTEGRATION_ADMIN_PASSWORD must be set"
        exit 1
    fi

    if [[ -z $INTEGRATION_ROOT_PASSWORD ]]; then
        echo "INTEGRATION_ROOT_PASSWORD must be set"
        exit 1
    fi
fi

echo "Operation $OPERATION"
echo

delete_stack () {
    echo "Deleting stack"

    local __resultvar="$1"

    local MAX_TRIES=5
    local current_try=0
    local stack_id=''
    local status=UNKNOWN
    local poll_result=UNKNOWN

    while [[ $status == UNKNOWN && $current_try < $MAX_TRIES ]]; do
        if result=$(openstack stack --insecure delete -y "$STACK_NAME" 2>&1); then
            stack_id="$STACK_NAME"
            status=SUCCESS
        else
            if [[ "$result" != *"Stack not found"* ]]; then
                echo "Failed attempt to delete."
                (( current_try = current_try + 1 ))
            else
                echo "Stack not found"
                stack_id="$STACK_NAME"
                status=DONE
            fi
        fi
    done

    if [[ -z $stack_id ]]; then
        echo "Stack delete failed"
        exit 1
    fi

    if [[ $status == DONE ]]; then
        eval $__resultvar=SUCCESS
    fi

    if [[ $status == SUCCESS ]]; then
        poll_status "$stack_id" DELETE poll_result
        eval $__resultvar="'$poll_result'"
    fi

    if [[ $status == DONE || $poll_result == SUCCESS ]]; then
        echo "Done deleting stack"
    else
        echo "Could not delete stack"
    fi
}

create_stack () {
    echo "Creating stack"

    local MAX_TRIES=5
    local current_try=0
    local stack_id=''
    local poll_result=UNKNOWN

    while [[ -z $stack_id && $current_try < $MAX_TRIES ]]; do
        if stack_info=$(openstack stack --insecure create \
            -f json \
            --template test/integration/env/bigip_stack_pipeline.yaml \
            --timeout 100 \
            --parameter artifactory_url=$ARTIFACTORY_URL \
            --parameter admin_password="$INTEGRATION_ADMIN_PASSWORD" \
            --parameter root_password="$INTEGRATION_ROOT_PASSWORD" \
            --parameter bigip_image="$BIGIP_IMAGE" \
            "$STACK_NAME")
        then
            stack_id=$(echo "$stack_info" | jq -r .id)
            echo "Stack is creating with ID $stack_id"
        else
            echo "Failed attempt to create. Cleaning up..."
            sleep 60 # sometimes the stack does not show up right away in this case
            echo "Starting cleanup..."
            delete_stack delete_response
            if [[ $delete_response == FAIL ]]; then
                echo "Cleanup failed. Giving up."
                exit 1
            fi
            (( current_try = current_try + 1 ))
        fi
    done

    if [[ -z $stack_id ]]; then
        echo "Stack create failed"
        exit 1
    fi

    poll_status "$stack_id" CREATE poll_result
    if [[ $poll_result == SUCCESS ]]; then
        echo "Done creating stack"
    else
        echo "Could not create stack"
        exit 1
    fi
}

get_stack_info() {
    local stack_id="$1"
    local current_operation="$2"
    local __resultvar="$3"

    local MAX_TRIES=5
    local current_try=0
    local status=UNKNOWN

    while [[ $status != SUCCESS && $current_try < $MAX_TRIES ]]; do
        if openstack_output=$(openstack stack show $stack_id -f json 2>&1); then
            status=SUCCESS
        else
            if [[ "$current_operation" == DELETE && "$openstack_output" == *"Stack not found"* ]]; then
                # sometimes the stack disappears quickly, so we have to fake the DELETE_COMPLETE here
                openstack_output='{"stack_status": "DELETE_COMPLETE"}'
                status=SUCCESS
            else
                echo "Failed to get stack status. Retrying..."
                (( current_try = current_try + 1 ))
                sleep 5
            fi
        fi
    done

    if [[ $staus == UNKNOWN ]]; then
        openstack_output=null
    fi

    eval $__resultvar="'$openstack_output'"
}

poll_status () {
    local stack_id="$1"
    local current_operation="$2"
    local __resultvar="$3"
    local num_tries=0
    local status=UNKNOWN

    # Limit to 1 hour
    local MAX_TRIES=360

    if [[ $current_operation == CREATE ]]; then
        SUCCESS_VALUE="CREATE_COMPLETE"
        FAIL_VALUE="CREATE_FAILED"
    else
        SUCCESS_VALUE="DELETE_COMPLETE"
        FAIL_VALUE="DELETE_FAILED"
    fi

    while [[ $status == UNKNOWN && $current_try < $MAX_TRIES ]]; do
        get_stack_info "$stack_id" "$current_operation" stack_info

        if [[ $stack_info == null ]]; then
            echo "Could not get stack info"
            exit 1
        fi

        stack_status=$(echo $stack_info | jq -r .stack_status)

        if [[ $(( $num_tries % 6 )) == 0 ]]; then
            echo "$stack_status"
        fi

        if [[ $stack_status == $FAIL_VALUE ]]; then
            status=FAIL
            fail_reason=$(echo $stack_info | jq -r .stack_status_reason)
            echo "Failed to $current_operation stack: $fail_reason"
        elif [[ $num_tries == $MAX_TRIES ]]; then
            status=FAIL
            echo "Max tries reached. Current status: $stack_status"
        fi

        if [[ $stack_status == $SUCCESS_VALUE ]]; then
            status=SUCCESS
        else
            (( num_tries = num_tries + 1 ))
            sleep 10
        fi
    done

    eval $__resultvar="'$status'"
    echo "$status"
}

write_output () {
    echo "Getting device IPs"
    local DEVICE_1_IP=$(./scripts/dev/get-host.sh integration_${BIGIP_IMAGE}_1)
    local DEVICE_2_IP=$(./scripts/dev/get-host.sh integration_${BIGIP_IMAGE}_2)
    local DEVICE_3_IP=$(./scripts/dev/get-host.sh integration_${BIGIP_IMAGE}_3)

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

# if a server goes into the error state, delete will fail but works on the second try
delete_stack delete_response
if [[ $delete_response == FAIL ]]; then
    echo "Frist attempt to delete failed, retrying..."
    delete_stack delete_response
    if [[ $delete_response == FAIL ]]; then
        echo "Second attempt to delete failed. Giving up."
        exit 1
    fi
fi

if [[ $OPERATION == CREATE ]]; then
    should_write=true
    create_stack create_response
    if [[ $create_response == FAIL ]]; then
        echo "Frist attempt to create failed, cleaning and retrying..."
        delete_stack delete_response
        create_stack create_response
        if [[ $create_response == FAIL ]]; then
            echo "Second attempt to create failed. Cleaning and giving up."
            delete_stack delete_response
            exit 1
        fi
    fi
    write_output
fi