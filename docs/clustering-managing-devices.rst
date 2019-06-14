Adding or removing members of a Device Group
============================================

This page describes how to handle the scenario in which one BIG-IP in Device Group goes down (goes offline, is deleted, gets corrupted, etc.), and how to use DO on a BIG-IP in the group that is still available to add a new BIG-IP instance to the group.  It also applies if you want to simply add and/or remove a device from a cluster using Declarative Onboarding.

In order to replace a device in a cluster, you must perform the following:
 
1. Ensure an active device in the cluster is the *owner* of the Device Group, and if there is no owner update the declaration specifying the new active device is the owner.
2. Update the Device Group in the declaration with the new member list.
3. Send the updated declaration with the updated Device Group list to the **new device** you want to add.
4. Send the declaration with the updated owner and Device Group list to the **other devices** in the cluster.

In the example on this page, we have an existing Device Group **failoverGroup** includes two devices: bigip1.example.com and bigip2.example.com. The owner of the Device Group, bigip1.example.com, goes offline, so we add a new device, bigip3.example.com to the device group.

For reference, the following is a snippet of the original declaration we sent to the members (bigip1.example.com and bigip2.example.com):

.. code-block:: javascript
   :emphasize-lines: 12-13, 24

        "configsync": {
            "class": "ConfigSync",
            "configsyncIp": "/Common/external-self/address"
        },
        "failoverAddress": {
            "class": "FailoverUnicast",
            "address": "/Common/external-self/address"
        },
        "failoverGroup": {
            "class": "DeviceGroup",
            "type": "sync-failover",
            "members": ["bigip1.example.com", "bigip2.example.com"],
            "owner": "/Common/failoverGroup/members/0",
            "autoSync": true,
            "saveOnAutoSync": false,
            "networkFailover": true,
            "fullLoadOnSync": false,
            "asmSync": false
        },
        "trust": {
            "class": "DeviceTrust",
            "localUsername": "admin",
            "localPassword": "pass1word",
            "remoteHost": "/Common/failoverGroup/members/0",
            "remoteUsername": "admin",
            "remotePassword": "pass2word"
        }



Sending a declaration with the updated clustering information
`````````````````````````````````````````````````````````````

The first task in adding a new member to a Device Group is to send a declaration to the new device that contains a list of all of the members that should be a part of the group. This applies whether you are adding or removing devices from the group; simply ensure the group members list reflects the members that should be in the group.

In our example, this task includes adding new member to the DeviceGroup class (failoverGroup in this example) and omitting the member that went down (bigip1.example.com), as well as setting the new owner of the group (DeviceTrust class, **owner** property: member 0 which is bigip2.example.com in our example). If you are only adding a new device to the group, changing the owner of the group may not be necessary.  

We are sending the declaration with this snippet to the new device (bigip3.example.com in our example).  Note that bigip3.example.com is being told that bigip2.example.com is now the owner and we are removing bigip1.example.com from the device group members list. 

.. IMPORTANT:: Although the owner has changed from *bigip1* to *bigip2* in our example, because bigip2 is in the same location in the members array (the first member in the array), we don't have to update the owner or the remoteHost in our declaration.  If the new owner is in a different location in the array, you must update both the **failoverGroup** *owner* and the **DeviceTrust** *remoteHost* with the appropriate value.  The **remoteHost** property of the *DeviceTrust* class should be the same device as the owner of the Device Group.

The updated declaration snippet would look like the following for all members of the Device Group (this only shows the relevant parts of the declaration and does not include required items such as the Device class).

.. code-block:: javascript
   :emphasize-lines: 12-13, 24


        "configsync": {
            "class": "ConfigSync",
            "configsyncIp": "/Common/external-self/address"
        },
        "failoverAddress": {
            "class": "FailoverUnicast",
            "address": "/Common/external-self/address"
        },
        "failoverGroup": {
            "class": "DeviceGroup",
            "type": "sync-failover",
            "members": ["bigip2.example.com", "bigip3.example.com"],
            "owner": "/Common/failoverGroup/members/0",
            "autoSync": true,
            "saveOnAutoSync": false,
            "networkFailover": true,
            "fullLoadOnSync": false,
            "asmSync": false
        },
        "trust": {
            "class": "DeviceTrust",
            "localUsername": "admin",
            "localPassword": "pass1word",
            "remoteHost": "/Common/failoverGroup/members/0",
            "remoteUsername": "admin",
            "remotePassword": "pass2word"
        }



The final task is to send the same updated declaration to all members of the Device Group.
