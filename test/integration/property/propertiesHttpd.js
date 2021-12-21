/**
 * Copyright 2021 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const {
    assertClass
} = require('./propertiesCommon');

describe('HTTPD', function testAuthentication() {
    this.timeout(300000);

    it('All Properties', () => {
        const options = {
            getMcpObject: {
                className: 'HTTPD',
                refItemKind: 'tm:sys:httpd:httpdstate',
                itemName: 'tm:sys:httpd:httpdstate'
            }
        };

        const properties = [
            {
                name: 'allow',
                inputValue: [undefined, ['1.2.3.4'], undefined],
                expectedValue: [['All'], ['1.2.3.4'], ['All']]
            },
            {
                name: 'authPamIdleTimeout',
                inputValue: [undefined, 12000, undefined],
                expectedValue: [1200, 12000, 1200]
            },
            {
                name: 'maxClients',
                inputValue: [undefined, 256, undefined],
                expectedValue: [10, 256, 10]
            },
            {
                name: 'sslCiphersuite',
                inputValue: [
                    undefined,
                    [
                        'ALL',
                        '!ADH',
                        '!EXPORT',
                        '!eNULL',
                        '!MD5',
                        '!RC4',
                        '!DES',
                        '!3DES',
                        '!SSLv2'
                    ],
                    undefined
                ],
                expectedValue: [
                    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA:ECDHE-ECDSA-AES128-SHA256:ECDHE-ECDSA-AES256-SHA384:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA:AES128-SHA256:AES256-SHA256',
                    'ALL:!ADH:!EXPORT:!eNULL:!MD5:!RC4:!DES:!3DES:!SSLv2',
                    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA:ECDHE-ECDSA-AES128-SHA256:ECDHE-ECDSA-AES256-SHA384:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA:AES128-SHA256:AES256-SHA256'
                ]
            },
            {
                name: 'sslProtocol',
                inputValue: [undefined, 'all', undefined],
                expectedValue: ['all -SSLv2 -SSLv3 -TLSv1', 'all', 'all -SSLv2 -SSLv3 -TLSv1']
            }
        ];

        return assertClass('HTTPD', properties, options);
    });
});
