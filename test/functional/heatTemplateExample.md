# Example Heat Template for DO functional testing
This is a basic Heat Template modeled after what we're currently using in the pipeline. By running this in VIO, you will have 3 new machines for testing.

Note: You'll want to update your harness.json to reflect these addresses.

## Heat Template
```yaml
heat_template_version: queens

description: Template to deploy BIG-IP instances in a high-availability cluster for AS3 & DO testing.

resources:
  network:
    type: OS::Neutron::Net
    properties:
      name: do-network

  subnet:
    type: OS::Neutron::Subnet
    properties:
      name: do-subnet
      network_id: { get_resource: network }
      cidr: 192.168.0.0/24

  router:
    type: OS::Neutron::Router
    properties:
      name: do-router

  router-interface:
    type: OS::Neutron::RouterInterface
    properties:
      router_id: { get_resource: router }
      subnet: { get_resource: subnet }

  port_1:
    type: OS::Neutron::Port
    properties:
      network_id: { get_resource: network }
      fixed_ips:
        - subnet: { get_resource: subnet }
          ip_address: 192.168.0.20

  port_1_mgmt:
    type: OS::Neutron::Port
    properties:
      network_id: 2bfdaa3a-b3c7-414a-934d-1d47751bef4d

  port_2:
    type: OS::Neutron::Port
    properties:
      network_id: { get_resource: network }
      fixed_ips:
        - subnet: { get_resource: subnet }
          ip_address: 192.168.0.21

  port_2_mgmt:
    type: OS::Neutron::Port
    properties:
      network_id: 2bfdaa3a-b3c7-414a-934d-1d47751bef4d

  port_3:
    type: OS::Neutron::Port
    properties:
      network_id: { get_resource: network }
      fixed_ips:
        - subnet: { get_resource: subnet }
          ip_address: 192.168.0.22

  port_3_mgmt:
    type: OS::Neutron::Port
    properties:
      network_id: 2bfdaa3a-b3c7-414a-934d-1d47751bef4d

  server_1:
    type: OS::Nova::Server
    properties:
      image: BIGIP-13.1.1.4-0.0.4 
      flavor: F5-BIGIP-small
      name: do-bigip-1
      config_drive: true
      networks:
        - port: { get_resource: port_1_mgmt }
        - port: { get_resource: port_1 }

  server_2:
    type: OS::Nova::Server
    properties:
      image: BIGIP-13.1.1.4-0.0.4 
      flavor: F5-BIGIP-small
      name: do-bigip-2
      config_drive: true
      networks:
        - port: { get_resource: port_2_mgmt }
        - port: { get_resource: port_2 }

  server_3:
    type: OS::Nova::Server
    properties:
      image: BIGIP-13.1.1.4-0.0.4 
      flavor: F5-BIGIP-small
      name: do-bigip-3
      config_drive: true
      networks:
        - port: { get_resource: port_3_mgmt }
        - port: { get_resource: port_3 }
```
