Components
----------

AS3 Declaration
~~~~~~~~~~~~~~~

An AS3 declaration describes the desired configuration of an Application
Delivery Controller (ADC) such as F5 BIG-IP in tenant- and application-oriented
terms. An AS3 tenant comprises a collection of AS3 applications and related
resources responsive to a particular authority (the AS3 tenant becomes a
partition on the BIG-IP system). An AS3 application comprises a collection of
ADC resources relating to a particular network-based business application or
system. AS3 declarations may also include resources shared by Applications in
one Tenant or all Tenants as well as auxiliary resources of different kinds. AS3
processes declarations on a tenant-by-tenant basis, so a declaration containing
configuration for Tenant1 does not affect Tenant2.
For detailed information on AS3 declarations, see :ref:`declaration-purpose-function`.

For example declarations, see :doc:`examples` and :ref:`additional-examples`.

AS3 JSON Schema
~~~~~~~~~~~~~~~

The |json| schema validates the declaration, and then produces a BIG-IP
configuration.  The JSON Schema document prescribes the syntax of an AS3
declaration. The AS3 declaration schema controls which
objects may appear in a declaration, what name they may or must use, what
properties they may have, which of those you must supply in the declaration, and
which AS3 may fill with default values. The schema also specifies the ranges of
values certain properties may take.  For detailed information on the AS3 schema,
see :ref:`understanding-the-json-schema`.

AS3 contains two modules: a |rest| worker and an audit engine.  The REST worker
provides a |crud| interface for creating and modifying the declaration document.
The audit engine is responsible for aligning BIG-IP configuration with the
declaration document.

Declaration > Schema > Validation > Configuration 

.. image:: /images/AS3-data-flow.png

.. |json| raw:: html

   <a href="https://www.json.org/" target="_blank">JSON</a>

.. |rest| raw:: html

   <a href="https://en.wikipedia.org/wiki/Representational_state_transfer" target="_blank">REST</a>

.. |crud| raw:: html

   <a href="https://en.wikipedia.org/wiki/Create,_read,_update_and_delete" target="_blank">CRUD</a>
