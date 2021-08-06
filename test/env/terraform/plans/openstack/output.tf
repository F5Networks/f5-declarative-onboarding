output "admin_ip" {
  value = "${openstack_compute_instance_v2.openstack-instance.*.access_ip_v4}"
}

output "f5_rest_user" {
  value = var.f5_rest_user
}

output "ssh_user" {
  value = var.ssh_user
}
