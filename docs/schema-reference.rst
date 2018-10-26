.. _schema-reference:

Appendix A: Schema Reference
============================
This page is a reference for the objects you can use in your Declarations for Declarative Onboarding. For more information on BIG-IP objects and terminology, see the BIG-IP documentation at https://support.f5.com/csp/home.


ADC
---

A declarative configuration for an ADC such as F5 BIG-IP

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
        - "ADC"
        - Indicates this JSON document is an ADC declaration
      * - **Common** (*object*)
        - -
        - -
        - Special tenant Common holds objects other tenants can share
      * - **constants** (*object*)
        - -
        - -
        - Declaration metadata and/or named values for (re-)use by declaration objects
      * - **controls** (*object*)
        - -
        - -
        - Options to control configuration process
      * - **id** (*string*)
        - -
        - format: f5long-id
        - Unique identifier for this declaration (max 255 printable chars with no spaces, quotation marks, angle brackets, nor backslashes)
      * - **label** (*string*)
        - -
        - format: f5label
        - Optional friendly name for this declaration
      * - **remark** (*string*)
        - -
        - format: f5remark
        - Arbitrary (brief) text pertaining to this declaration (optional)
      * - **schemaVersion** (*string*)
        - -
        - "3.6.0", "3.5.0", "3.4.0", "3.3.0", "3.2.0", "3.1.0", "3.0.0"
        - Version of ADC Declaration schema this declaration uses
      * - **scratch** (*string*)
        - -
        - -
        - Holds some system data during declaration processing
      * - **target** (*object*)
        - -
        - -
        - Trusted BIG-IP or SSG target for config when configuring with BIG-IQ
      * - **updateMode** (*string*)
        - "selective"
        - "complete", "selective"
        - When set to 'selective' (default) AS3 does not modify Tenants not referenced in the declaration.  Otherwise ('complete') AS3 removes unreferenced Tenants.

Application
-----------

Application declaration master schema

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **class** (*string*)