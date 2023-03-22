.. _troubleshooting:

Troubleshooting
===============
Use this section for common troubleshooting steps.

BIG-IP DO general troubleshooting tips
--------------------------------------

- Examine the restnoded failure log at /var/log/restnoded/restnoded.log (this is where BIG-IP DO records error messages)

- Examine the REST response:

  - A 400-level response will carry an error message with it
  - If this message is missing, incorrect, or misleading, please let us know by filing an issue on Github.
  - Beginning with DO 1.34, the task ID is included in the DO log output.

|

.. _trouble:

Troubleshooting Index
---------------------
Use this section for specific troubleshooting help.


I'm receiving an error when trying to resend a BIG-IP DO declaration with different VLANs, Self IPs and/or Route Domains
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
If you used BIG-IP DO to initially onboard a BIG-IP and did *not* specify unique (non-default) VLANs, Self IPs, or Route domains, you cannot re-POST a BIG-IP DO declaration to the same BIG-IP using different VLANs, Self IPs or Route Domains.  

This is because when updating the configuration BIG-IP DO attempts to delete the initial configuration, and the default VLAN, Self IPs and Route domains cannot be deleted from the BIG-IP system. This will result in BIG-IP DO trying to rollback, which can fail, resulting in objects being left behind on the BIG-IP device.  This can also occur if you did not use BIG-IP DO to onboard the BIG-IP, but later attempt to use BIG-IP DO to configure VLANs, Self IPs, and/or Route Domains.
 
If you want to onboard with BIG-IP DO and have non-default VLANs, Self IPs, or Route Domains, you must include these objects and values as a part of the initial onboarding declaration.  

This is being tracked by |github54|.

| 

.. _hostnameres:

I'm getting an unable to resolve host error
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Domain name resolution is used anywhere the declaration accepts a hostname. BIG-IP DO makes sure that any hostnames are resolvable and fails if they are not.  Check the hostname(s) in your declaration if you are receiving this error.

| 

.. _nodist:

I can no longer find the BIG-IP DO source RPM on GitHub
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Beginning with BIG-IP DO 1.8.0, the BIG-IP DO RPM, Postman collection, and checksum files are no longer located in the **/dist** directory in the BIG-IP Declarative Onboarding repository on GitHub.  These files can be found on the |release|, as **Assets**. 

You can find historical files on GitHub by using the **Branch** drop-down, clicking the **Tags** tab, and then selecting the appropriate release.

|

.. _newget:

How can I see HTTP status in a GET request?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In BIG-IP DO versions 1.8.0 and earlier, if there was a task that had an error, the GET response would return that error as the HTTP status.

In BIG-IP DO 1.9.0 and later, there is a new query parameter (**statusCodes**) that allows a GET request to return a 200 status code unless there is an actual error with the request. The results in the body of the response contain the status of the task. You can use **statusCodes=legacy** if you want the behavior in BIG-IP DO versions 1.8.0 and earlier as described above.

See :ref:`GET on the HTTP Methods page <getquery>` for more information and usage options.

|

.. _restjavad:

Why is my BIG-IP experiencing occasional high CPU usage and slower performance?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
If your BIG-IP system seems to be using a high amount of CPU and degraded performance, you may be experiencing a known issue with the **restjavad** daemon. This is an issue with the underlying BIG-IP framework, and not an issue with BIG-IP DO.

**More information** |br|
Restjavad may become unstable if the amount of memory required by the daemon exceeds the value allocated for its use. The memory required by the restjavad daemon may grow significantly in system configurations with either a high volume of device statistics collection (AVR provisioning), or with a large number of LTM objects managed by the REST framework (SSL Orchestrator provisioning). The overall system performance is degraded during the continuous restart of the restjavad daemon due to high CPU usage. 

**Workaround** |br|
Increase the memory allocated for the restjavad daemon (e.g. 2 GB), you can either use the declaration shown in :ref:`example31`, OR by running the following commands in a BIG-IP terminal.
 
``tmsh modify sys db restjavad.useextramb value true`` |br|
``tmsh modify sys db provision.extramb value 2048`` |br|
``bigstart restart restjavad``


|

.. _selfipchange:

Why am I seeing a behavior change for allowService on a self IP address in DO 1.36?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
BIG-IP DO 1.36.0 introduced a behavior change: The default value for **allowService** on a self IP address changed from **default** to **none**. DO will present a warning in the response whenever DO receives a declaration that creates or modifies a self IP.  See :ref:`Self IP class<selfip-class>` for more information and self IP options.

This change helps DO be more secure and consistent with TMSH.


.. _clustering:

Why isn't my clustering declaration working?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
If you are experiencing difficulties getting clustering configured using Declarative Onboarding, use the following troubleshooting tips.

When configuring a cluster using Declarative Onboarding, we recommend using new BIG-IPs (using new virtual machines if applicable). 

If your declaration does not work as expected, review the declaration and confirm all machines in the cluster can reach the **remoteHost** FQDN or IP address. DNS or other network limitations can cause issues on newer network setups.

If the declaration appears correct and all machines in the cluster can reach the **remoteHost**, but you are still receiving failures, try one of the following methods.

1. Send the declaration to a new BIG-IP device (most easily done in a virtual environment).  If the failures continue on the new device, it may be something else in the declaration causing the problem. In this case, we recommend openning a [GitHub Issues](https://github.com/F5Networks/f5-declarative-onboarding/issues). <br> If you cannot use a new BIG-IP device, use the following guidance to reset the BIG-IP.

2. Reset the BIG-IP device by performing the following on whichever is device is failing.

   - Clear the DO config (to prevent subsequent DO runs from having inaccurate information to work from):

      - Send a GET request to ``https://host/mgmt/shared/declarative-onboarding/config``.
      - Copy the **id** value from the response.
      - Send a DELETE request to ``https://host/mgmt/shared/declarative-onboarding/config/id_value``.  If the DELETE was successful, you receive **[]** as the response. (Sending a GET request to ``https://host/mgmt/shared/declarative-onboarding/config`` should give the same result if the DELETE was successful.)

   - Reset the BIG-IP to its factory default state.  **This deletes any and all configuration on the BIG-IP device.**  With root privileges, from the BIG-IP command line, run ``tmsh load sys config default``

After the machine(s) are available, you should be able to POST the declarations successfully.


.. |br| raw:: html

   <br />

.. |github54| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/issues/56" target="_blank">GitHub issue #56</a>

.. |release| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/releases" target="_blank">GitHub Release</a>