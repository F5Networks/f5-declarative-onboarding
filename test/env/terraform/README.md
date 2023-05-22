# Deploy using terraform.

## Requirements

- You'll need a terraform binary or use docker container.
- Setup environment variables needed for your project:

        export OS_AUTH_URL=https://<your vio domain>:5000/v3
        export OS_INSECURE=true
        export OS_PASSWORD=<password for user>
        export OS_PROJECT_DOMAIN_ID=default
        export OS_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        export OS_PROJECT_NAME=<your project name>
        export OS_REGION_NAME=nova
        export OS_USER_DOMAIN_NAME=Default
        export OS_USERNAME=<your username>
        export TF_HTTP_ADDRESS=<your gitlab domain>/api/v4/projects/<project id>/terraform/state/openstack-<BIGIP major version>

## Manual deployment

**NOTE:** You'll need to generate access tokey to have access to Gitlab's terraform state files:
        Go to `Settings` -> `Access Tokens` and generate api token:

        export TF_HTTP_USERNAME=<your olymus username>
        export TF_HTTP_PASSWORD=<token>

To deploy instance(s) without reporting to Gitlab's state, go and edit `main.tf` file and comment this two lines:
        ```
        backend "http" {
        }
        ```

- Change dir to test/env/terraform/plans/openstack.
- Run `terraform init` output should be like:

        Initializing the backend...

        Initializing provider plugins...
        - Reusing previous version of terraform-provider-openstack/openstack from the dependency lock file
        - Reusing previous version of hashicorp/template from the dependency lock file
        - Using previously-installed terraform-provider-openstack/openstack v1.42.0
        - Using previously-installed hashicorp/template v2.2.0

        Terraform has been successfully initialized!

- After successfull initialization, run `apply`:

        terraform apply -var nic_count="$NIC_COUNT"
                        -var bigip_count="$BIGIP_COUNT"
                        -var bigip_image="$BIGIP_IMAGE"
                        -auto-approve

- After successfull deployment you'll get output like:

        Outputs:
        admin_ip = [
          "10.145.77.79",
        ]
        admin_password = <password>
        admin_username = "admin"

- All environment configuration stored in `terraform.tfstate` file, so keep it.
- To get outputs into environment variable run this:

        export BIGIPS_ADDRESSES=$(terraform output --json admin_ip | jq -rc .[])
        export ADMIN_USERNAME=$(terraform output --json admin_username | jq -rc .)
        export ADMIN_PASSWORD=$(terraform output --json admin_password | jq -rc .)

- To teardown instance(s) run `terraform destroy -auto-approve` cmd:

        Destroy complete! Resources: 3 destroyed.
