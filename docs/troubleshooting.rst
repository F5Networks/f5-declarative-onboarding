.. _troubleshooting:

Troubleshooting
===============
Use this section for common troubleshooting steps.

DO general troubleshooting tips
-------------------------------

- Examine the restnoded failure log at /var/log/restnoded/restnoded.log (this is where DO records error messages)

- Examine the REST response:

  - A 400-level response will carry an error message with it
  - If this message is missing, incorrect, or misleading, please let us know by filing an issue on Github.

|

.. _trouble:

Troubleshooting Index
---------------------
Use this section for specific troubleshooting help.


I'm receiving an error when trying to resend a DO declaration with different VLANs, Self IPs and/or Route Domains
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
If you used DO to initially onboard a BIG-IP and did *not* specify unique (non-default) VLANs, Self IPs, or Route domains, you cannot re-POST a DO declaration to the same BIG-IP using different VLANs, Self IPs or Route Domains.  

This is because when updating the configuration DO attempts to delete the initial configuration, and the default VLAN, Self IPs and Route domains cannot be deleted from the BIG-IP system. This will result in DO trying to rollback, which can fail, resulting in objects being left behind on the BIG-IP device.  This can also occur if you did not use DO to onboard the BIG-IP, but later attempt to use DO to configure VLANs, Self IPs, and/or Route Domains.
 
If you want to onboard with DO and have non-default VLANs, Self IPs, or Route Domains, you must include these objects and values as a part of the initial onboarding declaration.  

This is being tracked by |github54|.

| 

.. _hostnameres:

I'm getting an unable to resolve host error
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Domain name resolution is used anywhere the declaration accepts a hostname. DO makes sure that any hostnames are resolvable and fails if they are not.  Check the hostname(s) in your declaration if you are receiving this error.

| 

.. _nodist:

I can no longer find the DO source RPM on GitHub
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Beginning with DO 1.8.0, the DO RPM, Postman collection, and checksum files are no longer located in the **/dist** directory in the Declarative Onboarding repository on GitHub.  These files can be found on the |release|, as **Assets**. 

You can find historical files on GitHub by using the **Branch** drop-down, clicking the **Tags** tab, and then selecting the appropriate release.

|

.. _newget:

How can I see HTTP status in a GET request?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In DO versions 1.8.0 and earlier, if there was a task that had an error, the GET response would return that error as the HTTP status.

In DO 1.9.0 and later, there is a new query parameter (**statusCodes**) that allows a GET request to return a 200 status code unless there is an actual error with the request. The results in the body of the response contain the status of the task. You can use **statusCodes=legacy** if you want the behavior in DO versions 1.8.0 and earlier as described above.

See :ref:`GET on the HTTP Methods page <getquery>` for more information and usage options.

|

.. _restjavad:

Why is my BIG-IP experiencing occasional high CPU usage and slower performance?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
If your BIG-IP system seems to be using a relatively high amount of CPU and degraded performance, you may be experiencing a known issue with the **restjavad** daemon. This is an issue with the underlying BIG-IP framework, and not an issue with DO.

**More information** |br|
Restjavad may become unstable if the amount of memory required by the daemon exceeds the value allocated for its use. The memory required by the restjavad daemon may grow significantly in system configurations with either a high volume of device statistics collection (AVR provisioning), or a with relatively large number of LTM objects managed by the REST framework (SSL Orchestrator provisioning). The overall system performance is degraded during the continuous restart of the restjavad daemon due to high CPU usage. 

**Workaround** |br|
Increase the memory allocated for the restjavad daemon (e.g. 2 GB), you can either use the declaration shown in :ref:`example31`, OR by running the following commands in a BIG-IP terminal.
 
``tmsh modify sys db restjavad.useextramb value true`` |br|
``tmsh modify sys db provision.extramb value 2048`` |br|
``bigstart restart restjavad``


.. |br| raw:: html

   <br />

.. |github54| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/issues/56" target="_blank">GitHub issue #56</a>

.. |release| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/releases" target="_blank">GitHub Release</a>