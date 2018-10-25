Using Declarative Onboarding
============================

As mentioned in the prerequisites, to transmit AS3 declarations you can use a
RESTful API client like Postman or a universal client such as cURL.  This
section tells you how to use AS3, see the following section for how to compose
declaration. Initially, you could use three HTTP request methods with AS3: POST,
GET, and DELETE.  AS3 v3.1.0 added PATCH.

The AS3 API supports Create, Remove, Update, and Delete (CRUD) actions.
You select specific actions by combinations of HTTP method (such as POST or
GET), HTTP URL-path, and properties in request bodies (always JSON).

All AS3 API requests relate to AS3 declarations and to target ADC (BIG-IP) hosts.

A client may supply a declaration with a POST request (although not every POST
request has to include one).

All other request methods (GET, DELETE, and PATCH) work with declarations previously
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
