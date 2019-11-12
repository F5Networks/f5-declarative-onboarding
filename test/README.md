# DO testing
DO testing makes use of [Mocha](https://mochajs.org/) as a test runner.
The Mocha [usage](https://mochajs.org/#usage) documentation is worth taking a look at to learn how to do things like stopping on the first failure with the `--bail` option and filtering the tests that are run with the `--grep` option.
If `npx` is available on your system, you can run the locally installed version of Mocha (from `npm install`) by using `npx mocha`.

## Code Coverage
* Code coverage is done with the [Istanbul nyc](https://github.com/istanbuljs/nyc) framework and generated using `npm run coverage`.
  * We aim for >90% coverage overall.
  * All new code should have at least 90% coverage.

## Unit Testing
* From within the root of the DO repo run:
  * `npm run test`

## Functional Testing
1. You will need to get the following setup before running the DO functional tests.
  * To reflect DO's pipeline you will need 3 new BIG-IPs. You can use this [Heat Template](test/integration/heatTemplateExample.md) to create these in VIO.
    * Note: For future runs of the test, you'll need to delete and relaunch not only the BIG-IPs but the Stack object as well.
  * You will also need a BIG-IQ.
    * This BIG-IQ needs to be setup and running, make note of the login credentials for step 4.
    * Get two "clpv2 license F5-BIG-MSP-LOADV2-LIC" eval (not dev) licenses from go/license.
      * Then add them to the BIG-IQ via Devices -> 'License Management' -> Licenses -> click 'Add License'
      * Name one 'myLicense' and the other 'myOtherLicensePool'
2. A Harness file is required to run the functional testing. This file will need the following (example below):
  * Due to the sensitivity of this data do not save this file in a publicly accessible location.
  * An array of 3 objects.
    * This file requires exactly 3 machines, any additional will be ignored.
  * Each object needs:
    * admin_ip: The IP for the BIG-IP.
    * admin_username: The username for logging into the UI.
    * admin_password: That username's password.
    * root_username: The root user's username.
    * root_password: That root user's password.
  * The BIG-IPs being referenced must allow for default ssh ciphers.
    * You can check this by sshing into the BIG-IP, without the -c option. If the ssh fails because of a 'no matching cipher found' error, the setup will also fail.
    * To fix this, ssh into the BIG-IP via a terminal and run the following command:
      * `tmsh modify sys sshd include "Ciphers aes128-ctr,aes192-ctr,aes256-ctr,arcfour256,arcfour128,aes128-cbc,3des-cbc,blowfish-cbc,cast128-cbc,aes192-cbc,aes256-cbc,arcfour,rijndael-cbc@lysator.liu.se"`
      * Note: This command occassionally has issues on 14.1.
3. To setup the BIG-IPs for testing, run the following command from the root of the DO repo:
  * npm run build
  * npm ci
  * `RPM_PACKAGE=$(ls -1t dist/*.rpm | head -1) TEST_HARNESS_FILE=test_harness.json node test/integration/setup.js`
    * RPM_PACKAGE: This is the RPM to be used in the testing.
    * TEST_HARNESS_FILE: This is the PATH to the file created in step 2.
  * Note: This will only install the RPM if there's a name change from what is installed.
4. Now you are able to run the tests you want.
  * `TEST_HARNESS_FILE=test_harness.json BIG_IQ_HOST=10.145.68.175 BIG_IQ_USERNAME=admin BIG_IQ_PASSWORD=admin ARTIFACTORY_BASE_URL=https://<our_artifactory_url>/artifactory npm run integration`
    * TEST_HARNESS_FILE: This is the PATH to the file created in step 2.
    * BIG_IQ_HOST: IP address to the BIG-IQ setup in step 1.
    * BIG_IQ_USERNAME: The username for the BIG-IQ setup in step 1.
    * BIG_IQ_PASSWORD: The password for that BIG-IQ setup in step 1.
    * ARTIFACTORY_BASE_URL: This is the base link to the development artifactory.
  * Note: That due to the setup file in the test directory you are not able to use the '\*' wildcard character. It will fail to run.
  * Note: The tests in test.js are not independent and do require a functional BIG-IQ to run successfully.
  * Note: Debug logs from the test run are written to test/logs and are available as an artifact from the CI/CD job.


### Example Harness file
```json
[{
        "admin_ip": "10.1.1.10",
        "admin_username": "admin",
        "admin_password": "admin",
        "root_username": "root",
        "root_password": "default"
    }, {
        "admin_ip": "10.1.2.3",
        "admin_username": "admin",
        "admin_password": "admin",
        "root_username": "root",
        "root_password": "default"
    }, {
        "admin_ip": "10.123.45.67",
        "admin_username": "admin",
        "admin_password": "admin",
        "root_username": "root",
        "root_password": "default"
    }
]
```
