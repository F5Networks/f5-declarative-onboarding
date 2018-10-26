Using Declarative Onboarding
============================

As mentioned in the prerequisites, to transmit Declarative Onboarding declarations you can use a
RESTful API client like Postman or a universal client such as cURL.  You can use the HTTP request methods POST and GET with Declarative Onboarding.

A client may supply a declaration with a POST request, and other request methods (currently only GET) work with declarations previously
supplied via POST and retained by AS3.

The default target ADC for every AS3 request (that is, the target selected when
a request does not specify any other) is "localhost".  In the basic case that
means the BIG-IP on which AS3 is running.  (When AS3 is not running on a
BIG-IP, "localhost" is not a valid target.)

.. toctree::
   :maxdepth: 2
   :includehidden:
   :glob:

   http-methods
   authentication
   installation
   composing-a-declaration
