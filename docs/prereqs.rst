Prerequisites and Requirements
------------------------------

The following are prerequisites for using AS3:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for BIG-IP version 12.1.x is available in AS3 v3.1.0 and later

- You must be using BIG-IP version 12.1.x (if using AS3 v3.1.0 or later) or v13.0 or later to use AS3.
- To use AS3, your BIG-IP user account must have the **Administrator**
  role.
- You should be familiar with the F5 BIG-IP and F5 terminology.  For
  general information and documentation on the BIG-IP system, see the
  `F5 Knowledge Center <https://support.f5.com/csp/knowledge-center/software/BIG-IP?module=BIG-IP%20LTM&version=13.1.0>`_.
- You must manually :ref:`install AS3 <installation>` before the AS3 RESTful API is available.

- Disable the **Expect: 100 Continue** feature commonly used with SOAP + XML APIs.  When using cURL, add the option  **-H 'Expect:'**  to your cURL command line (no space after the colon at the end of ‘Expect:’).  For specific information, refer to the instructions from your client libraries.