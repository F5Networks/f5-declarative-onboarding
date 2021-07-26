# Deploy using terraform.

## Requirements

- You'll need a terraform binary or use docker container.
- Setup environment variables needed for your project:

        OS_AUTH_URL=https://<your vio domain>:5000/v3
        OS_INSECURE=true
        OS_PASSWORD=<password for user>
        OS_PROJECT_DOMAIN_ID=default
        OS_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        OS_PROJECT_NAME=<your project name>
        OS_REGION_NAME=nova
        OS_USER_DOMAIN_NAME=Default
        OS_USERNAME=<your username>

## Manual deployment

- Change dir to test/integration/env/terraform/openstack.
- Run `terraform init` output should be like:

        Initializing the backend...

        Initializing provider plugins...
        - Reusing previous version of terraform-provider-openstack/openstack from the dependency lock file
        - Reusing previous version of hashicorp/template from the dependency lock file
        - Using previously-installed terraform-provider-openstack/openstack v1.42.0
        - Using previously-installed hashicorp/template v2.2.0

        Terraform has been successfully initialized!

- After initialization successfull, run `apply`:

        terraform apply -var nic_count="$NIC_COUNT"
                        -var bigip_count="$BIGIP_COUNT"
                        -var admin_password="$INTEGRATION_ADMIN_PASSWORD"
                        -var root_password="$INTEGRATION_ROOT_PASSWORD"
                        -var bigip_image="$BIGIP_IMAGE"
                        -auto-approve

- After deployment successfull you'll get output like:

        Outputs:
        admin_ip = [
          "10.145.77.79",
        ]
        f5_rest_user = "admin"
        ssh_user = "root"

- All environment configuration stored in `terraform.tfstate` file, so keep it.
- To get outputs into environment variable run this:

        export BIGIPS_ADDRESSES=$(terraform output --json admin_ip | jq -rc .[])

- To teardown instance(s) run `terraform destroy -auto-approve` cmd:

  * NOTE: you'll need `terraform.tfstate` file to do it.

        Destroy complete! Resources: 1 destroyed.
