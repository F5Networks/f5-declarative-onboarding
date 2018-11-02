Prerequisites and Requirements
------------------------------

The following are prerequisites for using F5 Declarative Onboarding:


- You must be using BIG-IP version 13.1.0 or later.
- Your BIG-IP user account must have the **Administrator**
  role.
- You must have a valid F5 Networks License Registration Key.  If you do not have one, contact your F5 sales representative. If you do not use a valid F5 license key, your declaration will fail.
- You should be familiar with the F5 BIG-IP and F5 terminology.  For
  general information and documentation on the BIG-IP system, see the `F5 Knowledge Center <https://support.f5.com/csp/knowledge-center/software/BIG-IP?module=BIG-IP%20LTM&version=13.1.0>`_.

- Disable the **Expect: 100 Continue** feature commonly used with SOAP + XML APIs.  When using cURL, add the option  **-H 'Expect:'**  to your cURL command line (no space after the colon at the end of 'Expect:').  For specific information, refer to the instructions from your client libraries.