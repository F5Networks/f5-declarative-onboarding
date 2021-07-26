# BIGIP image
variable "bigip_image" {
  description = "BIGIP image to deploy"
  default = "BIGIP-14.1.4-0.0.11"
}

# Run parameters
variable "admin_password" {
  description = "BIGIP admin user password"
}

variable "f5_rest_user" {
  description = "BIGIP fusername"
  default = "admin"
}

variable "ssh_user" {
  description = "BIGIP fusername"
  default = "root"
}

variable "root_password" {
  description = "BIGIP root user password"
}

variable "nic_count" {
  description = "Number of NICs for BIGIP"
  default = 3
}

variable "bigip_count" {
  description = "Number of BIGIPs to deploy"
  default = 3
}

# VIO
variable "image_flavor" {
    description = "The image flavor in VIO."
    default = "F5-BIGIP-medium"
}

variable "networks" {
  description = "Networks for BIGIP"
  default = {
      1: "AdminNetwork2",
      2: "vlan1010",
      3: "vlan1011"
    }
}
