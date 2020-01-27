Declarative Onboarding FAQ
--------------------------
The following are frequently asked questions for Declarative Onboarding.


**What is Declarative Onboarding?**

F5 Declarative Onboarding (DO) is an F5 offering that provides a simple and consistent way to automate BIG-IP onboarding via Declarative REST APIs. A brother to |AS3|, DO provides a sustainable foundation to enable F5’s Infrastructure as Code (IaC) strategy. DO automates L1-L3 on-boarding for BIG-IP, making BIG-IP available on the network and ready to accept L4-L7 Application Services configurations. 

For more information, return to :doc:`index`

|

**Where can I download DO?** 

The DO Extension is available |dl|.  See :doc:`installation` for instructions.

The DO Container is available on |docker|. 

|

**Is DO supported by F5?**

Yes.  See the |support| to see the versions of DO that are currently supported. 

|

**What is the "DO Container"? Is it Supported?** 

- This is a Docker container form-factor for DO 1.2+ for off-box deployments. 
- Provides flexibility to deploy DO via any container management platform 
- Ongoing container optimization for DO; separate from F5 API Services Gateway:

  - The DO Container is specifically for DO use cases, 
  - F5 API Services Gateway is specifically for custom iControl LX extension use cases (and is community-supported) 

- Initial DO Container releases are community-supported, and will be fully F5 supported in a future release 

|

**How is DO different from onboarding with Ansible?**

- Ansible is part of a large vendor ecosystem to manage and automate configuration of multiple platform types within the data center 
- Ansible automates via imperative YAML playbooks which require knowledge of which BIG-IP modules need to be run and in which order 
- Ansible is great for templatizing BIG-IP configuration tasks via Playbooks and Roles
- F5 is dependent on Ansible release schedules, whereas F5 controls the DO release schedule, allowing for a more aggressive release cadence 
- Note Ansible can be used as a front-end to DO's declarative API 

See the |ansible| for more information.

|

**When is DO a good fit and when it is not?**

DO is a good fit where: 

  - Declarative interface is required to abstract away the complexity of BIG-IP onboarding 
  - You need to onboard BIG-IP as Infrastructure as Code (IaC) via integration with DevOps pipelines 

DO may not be a good fit where: 

  - You do not want to use a Declarative interface
  - You are unwilling or unable to deploy iControl Extension RPM on BIG-IP 
  - You require the BIG-IP to be the configuration source-of-truth 
  - You want to continue using imperative interfaces to configure (not just monitor or troubleshoot) BIG-IP: 

    - GUI
    - TMSH
    - iControl REST APIs

|

 **Which TMOS versions does DO require?** 

DO requires TMOS 13.1+ 

|

**What is a "DO Declaration"?**

- DO uses a declarative model, meaning you provide a JSON declaration rather than a set of imperative commands 
- The declaration represents the configuration which DO uses to onboard BIG-IP 
- The declaration does not need to be sequenced in a specific order; DO will figure out the steps and order of operations for you, making it declarative. 
- DO is well-defined according to the rules of the JSON Schema, and declarations are validated according to the JSON Schema 

|

**What is the VSCode DO Declaration Validator?** 

This capability enables you to validate an DO declaration against the DO schema using Microsoft Visual Studio Code (VSCode) editor, and is useful when composing a declaration manually or to check the accuracy of a declaration prior to deployment 

See :doc:`validate` for information.

|

**Where can I find DO declaration examples? for licensing BIG-IP via BIG-IQ?**

- BIG-IP and general example declarations can be found :doc:`here<bigip-examples>`.
- BIG-IQ example declarations for licensing BIG-IP devices can be found :doc:`here<bigiq-examples>`.

|

**Does DO collect any usage data?** 

The Declarative Onboarding (DO) Extension gathers non-identifiable usage data for the purposes of improving the product as outlined in the end user license agreement for BIG-IP. To opt out of data collection, disable BIG-IP system’s phone home feature as described in |phone|. 

.. _contract:

**What is F5's Automation Toolchain API Contract?**
 
The API Contract for the F5 Automation Toolchain (Declarative Onboarding, AS3 and Telemetry Streaming) is our assurance that we will not make arbitrary breaking changes to our API.  We take this commitment seriously.  We semantically version our declarative API schemas ("xx.yy.zz") and do not make breaking changes within a minor ("yy") or patch ("zz") releases.  For example, early declarations using AS3 schema "3.0.0" are accepted by all subsequent minor releases including "3.16.0."  
 
As of January 2020, no breaking changes have been made to AS3, Declarative Onboarding, or Telemetry Streaming since inception.  None are anticipated at this time.  A breaking change, if any, will be noted by a change to the major release number ("xx").  For example, the AS3 schema version would become "4.0.0."



.. |AS3| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/" target="_blank">AS3</a>


.. |phone| raw:: html

   <a href="https://support.f5.com/csp/article/K15000#phone" target="_blank">K15000</a>

.. |dl| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/releases" target="_blank">Release Asset on GitHub</a>

.. |docker| raw:: html

   <a href="https://hub.docker.com/r/f5devcentral/f5-do-container" target="_blank">Docker Hub</a>

.. |support| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/blob/master/SUPPORT.md" target="_blank">Support Information page on GitHub</a>

.. |ansible| raw:: html

   <a href="https://clouddocs.f5.com/products/orchestration/ansible/devel/" target="_blank">F5 Modules for Ansible documentation</a>


