.. _schema-reference:

Appendix A: Schema Reference
============================
This page is a reference for the objects you can use in your Declarations for Declarative Onboarding. For more information on BIG-IP objects and terminology, see the BIG-IP documentation at https://support.f5.com/csp/home.


Base Schema
-----------

Top level schema for onboarding a BIG-IP.

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **class** (*string*)
        - -
        - Device
        - Indicates this JSON document is a Device declaration
      * - **schemaVersion** (*string*)
        - 1.0.0
        - -
        - Version of Declarative Onboarding schema this declaration uses.
      * - **async** (*boolean*)
        - false
        - 
        - Tells the API to return a 202 HTTP status before processing is complete. User must then poll for status.
      * - **label** (*string*)
        - -
        - -
        - Optional friendly name for the declaration
      