terraform {
  backend "http" {
  }

  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.42.0"
    }
  }
}

module "utils" {
  source = "../../modules/utils"
}

data "template_file" "user_data" {
  template = file("../../onboard.yaml")
  vars = {
    admin_password = module.utils.admin_password
  }
}

resource "openstack_compute_instance_v2" "openstack-instance" {
  count = var.bigip_count
  name = "do-bigip-${var.bigip_image}-${count.index}"
  image_name        = var.bigip_image
  flavor_name     = var.image_flavor
  security_groups = []
  config_drive    = "true"
  user_data       = data.template_file.user_data.rendered

  dynamic "network" {
    for_each = [ for i in range(1, var.nic_count + 1): {
      name = var.networks[i]
    }]
    content {
      name = network.value.name
    }
  }

  timeouts {
    create = "1h"
    delete = "1h"
  }
}
