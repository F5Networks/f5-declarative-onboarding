HTTP Methods
------------
This section contains the current HTTP methods available with Declarative Onboarding.

POST
~~~~
To send your declaration, use the POST method to the URI
``https://<BIG-IP>/mgmt/shared/appsvcs/declare`` and put your declaration in the
body of the post (after :doc:`authentication <authentication>`).  If successful, you see a success message, and the system
echoes your declaration back to you.  In addition to deploying a declaration,
POST supports more actions, like reporting a previous declaration (useful with
remote targets since GET may only have localhost credentials) or returning the
index of saved declarations.  

GET
~~~
You can use the GET method to retrieve the declarations you previously sent to
Declarative Onboarding. Use the GET method to the URI
``https://<BIG-IP>/mgmt/shared/appsvcs/declare``.  Only declarations you create
in AS3 return, GET does not return anything that was not created by AS3.




.. |br| raw:: html
   
   <br />

