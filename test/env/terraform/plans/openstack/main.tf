terraform {
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.42.0"
    }
  }
}

data "template_file" "user_data" {
  template = file("../../onboard.yaml")
  vars = {
    root_password = var.root_password
    admin_password = var.admin_password
  }
}

resource "openstack_compute_instance_v2" "openstack-instance" {
  count = var.bigip_count
  name = "integration-${var.bigip_image}-${count.index}"
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
    create = "2h"
    delete = "2h"
  }
}
