/**
 * Copyright 2023 F5, Inc.
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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const EventEmitter = require('events');
const sinon = require('sinon');

const promiseUtil = require('@f5devcentral/atg-shared-utilities').promiseUtils;

const doUtilMock = require('../../../src/lib/doUtil');
const cryptoUtil = require('../../../src/lib/cryptoUtil');
const cloudUtil = require('../../../node_modules/@f5devcentral/f5-cloud-libs').util;

const PATHS = require('../../../src/lib/sharedConstants').PATHS;
const EVENTS = require('../../../src/lib/sharedConstants').EVENTS;

const SystemHandler = require('../../../src/lib/systemHandler');
const Logger = require('../../../src/lib/logger');

/* eslint-disable global-require */

describe('systemHandler', () => {
    const superuserKey = [
        'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEA4bhQNwxdLkt6uJn4JfCZSmaHm7EHwYv1ukJDJ/2tiUL5sM6KvLc+',
        'yQOHKg8L78jO27u0tDhD6BIym2Iik9/+r5ov8fJ7zm/zC9GrWPJsy3UCo+ZeSXxzmDxUiwi12yP2CtBDn1mVwXTP',
        'lvR4W1M+8ZSlNlvQuVbDSpLgFqr+7mjqXRG6cs+4qkwk+4uAWtaHfPJtPj0HaB3bkNnmn4boJxs3d+shrFaEywXv',
        'V7P1HyeMZ0phKUayky8NDNoPUzsgDM3sKT/1lXgyShqlJRRmP5TaCq228PY7ETffPD2cuMDw8LAoe2RUa8khKeU8',
        'blnzvmHlT226d05hjp+aytzX3Q== Host Processor Superuser'
    ].join('');
    const testKey = [
        'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCwHJLJY+z0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtz',
        'tbVpHThsvw92+1hx9wlSogXN6Co5zrtqlN8/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLzu2Gr14xRiVLnG',
        '8KxNp2fO1/U/ioA9/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== test'
    ].join('');

    let pathSent;
    let deletePathSent;
    let dataSent;
    let bigIpMock;
    let doUtilGetCurrentPlatformStub;
    let doUtilExecuteBashCommandStub;
    let activeCalled;
    let state;

    beforeEach(() => {
        pathSent = null;
        deletePathSent = null;
        dataSent = null;
        activeCalled = false;

        state = {
            id: '123-abc',
            currentConfig: {
                Common: {
                    System: {}
                }
            }
        };

        bigIpMock = {
            host: undefined,
            replace(path, data) {
                pathSent = path;
                dataSent = data;
                return Promise.resolve();
            },
            active() {
                activeCalled = true;
                return Promise.resolve();
            },
            create(path, data) {
                if (!dataSent) {
                    dataSent = {};
                }
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            },
            delete(path) {
                deletePathSent = path;
            },
            list() {
                return Promise.resolve();
            },
            createOrModify(path, data) {
                if (!dataSent) {
                    dataSent = {};
                }
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            },
            modify(path, data) {
                if (!dataSent) {
                    dataSent = {};
                }
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            },
            deviceInfo() {
                return Promise.resolve({ version: '15.1.0' });
            },
            setHost() {
                return Promise.resolve();
            }
        };
        doUtilGetCurrentPlatformStub = sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('BIG-IP');
        doUtilExecuteBashCommandStub = sinon.stub(doUtilMock, 'executeBashCommandIControl').resolves('');
        sinon.stub(doUtilMock, 'checkDnsResolution').resolves();

        sinon.stub(cloudUtil, 'MEDIUM_RETRY').value(cloudUtil.NO_RETRY);
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should handle DbVariables', () => {
        const declaration = {
            Common: {
                DbVariables: {
                    foo: 'bar',
                    hello: 123
                }
            }
        };

        let dbVarsSent;
        bigIpMock.onboard = {
            setDbVars(dbVars) {
                dbVarsSent = dbVars;
                return Promise.resolve();
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepEqual(dbVarsSent,
                    {
                        foo: 'bar',
                        hello: 123
                    });
            });
    });

    describe('DeviceCertificate', () => {
        const filesCopied = [];
        let diff = '';
        let certWritten;
        let keyWritten;

        beforeEach(() => {
            filesCopied.length = 0;
            certWritten = '';
            keyWritten = '';

            doUtilExecuteBashCommandStub.restore();
            sinon.stub(doUtilMock, 'executeBashCommandIControl').callsFake((bigIp, command) => {
                if (command.startsWith('cat')) {
                    if (command.endsWith('server.crt')) {
                        return Promise.resolve('old cert');
                    }
                    if (command.endsWith('server.key')) {
                        return Promise.resolve('old key');
                    }
                    if (command.endsWith('client.crt')) {
                        return Promise.resolve('old cert');
                    }
                }
                if (command.startsWith('echo')) {
                    if (command.endsWith('server.crt')) {
                        certWritten = command;
                        return Promise.resolve();
                    }
                    if (command.endsWith('client.crt')) {
                        certWritten = command;
                        return Promise.resolve();
                    }
                }
                if (command.startsWith('cp')) {
                    // command is 'cp from to', so grab the from
                    const tokens = command.split(' ');
                    filesCopied.push(tokens[1]);
                    return Promise.resolve();
                }
                if (command.startsWith('ls')) {
                    return Promise.resolve('No such file or directory');
                }
                if (command.startsWith('diff')) {
                    return Promise.resolve(diff);
                }
                if (command.startsWith('/usr/bin/php')) {
                    keyWritten = command;
                    return Promise.resolve();
                }
                return Promise.reject(new Error('Unhandled bash command in test'));
            });

            sinon.stub(cryptoUtil, 'encryptValue').resolves('encrypted key');
        });

        it('should handle DeviceCertificates with changes', () => {
            const declaration = {
                Common: {
                    DeviceCertificate: {
                        myCertificate: {
                            certificate: 'foo',
                            privateKey: 'bar',
                            updateTrustCerts: true
                        }
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then((status) => {
                    assert.strictEqual(certWritten.startsWith('echo \'foo\''), true);
                    assert.notStrictEqual(keyWritten.indexOf('encrypted key'), -1);
                    assert.strictEqual(filesCopied.length, 8);
                    // We copy each file twice because we need .DO.orig and .DO.bak
                    assert.strictEqual(filesCopied[0], '/config/httpd/conf/ssl.crt/server.crt');
                    assert.strictEqual(filesCopied[1], '/config/httpd/conf/ssl.key/server.key');
                    assert.strictEqual(filesCopied[2], '/config/big3d/client.crt');
                    assert.strictEqual(filesCopied[3], '/config/gtm/server.crt');
                    assert.strictEqual(filesCopied[4], '/config/httpd/conf/ssl.crt/server.crt');
                    assert.strictEqual(filesCopied[5], '/config/httpd/conf/ssl.key/server.key');
                    assert.strictEqual(filesCopied[6], '/config/big3d/client.crt');
                    assert.strictEqual(filesCopied[7], '/config/gtm/server.crt');
                    assert.strictEqual(status.rebootRequired, true);
                    assert.deepEqual(
                        status.rollbackInfo.systemHandler.deviceCertificate.files,
                        [
                            {
                                from: '/config/httpd/conf/ssl.crt/server.crt.DO.bak',
                                to: '/config/httpd/conf/ssl.crt/server.crt'
                            },
                            {
                                from: '/config/httpd/conf/ssl.key/server.key.DO.bak',
                                to: '/config/httpd/conf/ssl.key/server.key'
                            },
                            {
                                from: '/config/big3d/client.crt.DO.bak',
                                to: '/config/big3d/client.crt'
                            },
                            {
                                from: '/config/gtm/server.crt.DO.bak',
                                to: '/config/gtm/server.crt'
                            }
                        ]
                    );
                });
        });

        it('should not set rebootRequired if there are no changes', () => {
            const declaration = {
                Common: {
                    DeviceCertificate: {
                        myCertificate: {
                            certificate: 'old cert',
                            privateKey: 'old key'
                        }
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then((status) => {
                    assert.strictEqual(certWritten, '');
                    assert.strictEqual(keyWritten, '');
                    assert.strictEqual(filesCopied.length, 4);
                    assert.strictEqual(status.rebootRequired, false);
                    assert.strictEqual(
                        status.rollbackInfo.systemHandler.deviceCertificate,
                        undefined
                    );
                });
        });

        it('should restore original cert and key if none are in declaration', () => {
            const declaration = {
                Common: {}
            };

            diff = 'they are different';

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then((status) => {
                    assert.strictEqual(filesCopied.length, 12);
                    assert.strictEqual(filesCopied[4], '/config/httpd/conf/ssl.crt/server.crt');
                    assert.strictEqual(filesCopied[5], '/config/httpd/conf/ssl.crt/server.crt.DO.orig');
                    assert.strictEqual(filesCopied[6], '/config/httpd/conf/ssl.key/server.key');
                    assert.strictEqual(filesCopied[7], '/config/httpd/conf/ssl.key/server.key.DO.orig');
                    assert.strictEqual(filesCopied[8], '/config/big3d/client.crt');
                    assert.strictEqual(filesCopied[9], '/config/big3d/client.crt.DO.orig');
                    assert.strictEqual(filesCopied[10], '/config/gtm/server.crt');
                    assert.strictEqual(filesCopied[11], '/config/gtm/server.crt.DO.orig');
                    assert.strictEqual(status.rebootRequired, true);
                });
        });

        it('should restore certs and key based off rollbackInfo', () => {
            const declaration = {
                Common: {}
            };

            diff = 'they are different';
            state.rollbackInfo = {
                systemHandler: {
                    deviceCertificate: {
                        files: [
                            {
                                from: '/config/httpd/conf/ssl.crt/server.crt.DO.bak',
                                to: '/config/httpd/conf/ssl.crt/server.crt'
                            },
                            {
                                from: '/config/httpd/conf/ssl.key/server.key.DO.bak',
                                to: '/config/httpd/conf/ssl.key/server.key'
                            },
                            {
                                from: '/config/big3d/client.crt.DO.bak',
                                to: '/config/big3d/client.crt'
                            },
                            {
                                from: '/config/gtm/server.crt.DO.bak',
                                to: '/config/gtm/server.crt'
                            }
                        ]
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then((status) => {
                    assert.strictEqual(filesCopied.length, 8);
                    assert.strictEqual(filesCopied[0], '/config/httpd/conf/ssl.crt/server.crt');
                    assert.strictEqual(filesCopied[1], '/config/httpd/conf/ssl.key/server.key');
                    assert.strictEqual(filesCopied[2], '/config/big3d/client.crt');
                    assert.strictEqual(filesCopied[3], '/config/gtm/server.crt');
                    assert.strictEqual(filesCopied[4], '/config/httpd/conf/ssl.crt/server.crt.DO.bak');
                    assert.strictEqual(filesCopied[5], '/config/httpd/conf/ssl.key/server.key.DO.bak');
                    assert.strictEqual(filesCopied[6], '/config/big3d/client.crt.DO.bak');
                    assert.strictEqual(filesCopied[7], '/config/gtm/server.crt.DO.bak');
                    assert.strictEqual(status.rebootRequired, true);
                });
        });

        it('should not update trust certs when device cert is already present', () => {
            const declaration = {
                Common: {
                    DeviceCertificate: {
                        myCertificate: {
                            certificate: 'foo',
                            privateKey: 'bar',
                            updateTrustCerts: true
                        }
                    }
                }
            };

            doUtilExecuteBashCommandStub.restore();
            sinon.stub(doUtilMock, 'executeBashCommandIControl').callsFake((bigIp, command) => {
                if (command.startsWith('cat')) {
                    if (command.endsWith('/ssl.crt/server.crt')) {
                        return Promise.resolve('old cert');
                    }
                    if (command.endsWith('/gtm/server.crt')) {
                        return Promise.resolve('old cert\nfoo');
                    }
                    if (command.endsWith('server.key')) {
                        return Promise.resolve('old key');
                    }
                    if (command.endsWith('client.crt')) {
                        return Promise.resolve('old cert\nfoo');
                    }
                }
                if (command.startsWith('echo')) {
                    if (command.endsWith('server.crt')) {
                        certWritten = command;
                        return Promise.resolve();
                    }
                    if (command.endsWith('client.crt')) {
                        certWritten = command;
                        return Promise.resolve();
                    }
                }
                if (command.startsWith('cp')) {
                    // command is 'cp from to', so grab the from
                    const tokens = command.split(' ');
                    filesCopied.push(tokens[1]);
                    return Promise.resolve();
                }
                if (command.startsWith('ls')) {
                    return Promise.resolve('No such file or directory');
                }
                if (command.startsWith('diff')) {
                    return Promise.resolve(diff);
                }
                if (command.startsWith('/usr/bin/php')) {
                    keyWritten = command;
                    return Promise.resolve();
                }
                return Promise.reject(new Error('Unhandled bash command in test'));
            });

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then((status) => {
                    assert.strictEqual(filesCopied.length, 6);
                    assert.strictEqual(filesCopied[0], '/config/httpd/conf/ssl.crt/server.crt');
                    assert.strictEqual(filesCopied[1], '/config/httpd/conf/ssl.key/server.key');
                    assert.strictEqual(filesCopied[2], '/config/big3d/client.crt');
                    assert.strictEqual(filesCopied[3], '/config/gtm/server.crt');
                    assert.strictEqual(filesCopied[4], '/config/httpd/conf/ssl.crt/server.crt');
                    assert.strictEqual(filesCopied[5], '/config/httpd/conf/ssl.key/server.key');
                    assert.strictEqual(status.rebootRequired, true);
                });
        });
    });

    describe('DNS/NTP/System', () => {
        let bigIpStub;

        function setUpBigIpStubWithRequestOptions(requestOptions, bigIpVersion, isDhcpEnabled, globalHostname) {
            if (bigIpStub) {
                bigIpStub.restore();
            }

            bigIpStub = sinon.stub(bigIpMock, 'list').callsFake((path) => {
                isDhcpEnabled = isDhcpEnabled || 'enabled';
                if (path === '/tm/sys/management-dhcp/sys-mgmt-dhcp-config') {
                    return Promise.resolve({ requestOptions });
                }

                if (path === '/tm/sys/service/dhclient/stats') {
                    const dhcpState = (isDhcpEnabled === 'enabled') ? 'running' : 'stopped';
                    const bigIpDhclientStatus = `dhclient (pid  12049) is ${dhcpState}...`;
                    // eslint-disable-next-line max-len
                    const bigIp14DhclientStatus = `* dhclient.service - SYSV: dhclient automatically configures the management interface when DHCP is available.\n   Loaded: loaded (/etc/rc.d/init.d/dhclient; bad; vendor preset: disabled)\n   Active: active (${dhcpState}) since Sat 2019-06-01 22:16:34 UTC; 8min ago\n     Docs: man:systemd-sysv-generator(8)\n  Process: 18049 ExecStop=/etc/rc.d/init.d/dhclient stop (code=exited, status=0/SUCCESS)\n  Process: 18099 ExecStart=/etc/rc.d/init.d/dhclient start (code=exited, status=0/SUCCESS)\n   CGroup: /system.slice/dhclient.service\n           \`-18131 /sbin/dhclient -nw mgmt -cf /etc/dhclient.conf -lf /var/lib/dhclient/dhclient.leases -pf /var/run/dhclient.pid\n\nJun 01 22:16:34 localhost.localdomain dhclient[18099]: Current management-ip configuration mode for IPV4 is: DHCP.\nJun 01 22:16:34 localhost.localdomain dhclient[18114]: DHCPREQUEST on mgmt to 255.255.255.255 port 67 (xid=0x4646e482)\nJun 01 22:16:34 localhost.localdomain dhclient[18131]: DHCPACK from 10.145.64.1 (xid=0x4646e482)\nJun 01 22:16:34 localhost.localdomain dhclient[18099]: Starting /sbin/dhclient: [  OK  ]\nJun 01 22:16:34 localhost.localdomain systemd[1]: Started SYSV: dhclient automatically configures the management interface when DHCP is available..\nJun 01 22:16:36 localhost.localdomain tmsh[18057]: 01420002:5: AUDIT - pid=18057 user=root folder=/Common module=(tmos)# status=[Command OK] cmd_data=show sys mcp-state field-fmt\nJun 01 22:16:40 localhost.localdomain tmsh[18189]: 01420002:5: AUDIT - pid=18189 user=root folder=/Common module=(tmos)# status=[Command OK] cmd_data=show sys mcp-state field-fmt\nJun 01 22:16:40 localhost.localdomain tmsh[18192]: 01420002:5: AUDIT - pid=18192 user=root folder=/Common module=(tmos)# status=[Command OK] cmd_data=show sys mcp-state field-fmt\nJun 01 22:16:42 localhost.localdomain tmsh[18216]: 01420002:5: AUDIT - pid=18216 user=root folder=/Common module=(tmos)# status=[Command OK] cmd_data=show sys mcp-state field-fmt\nJun 01 22:16:42 localhost.localdomain dhclient[18131]: bound to 10.145.69.240 -- renewal in 1614 seconds.\n"`;
                    return Promise.resolve({
                        apiRawValues: {
                            apiAnonymous:
                            bigIpVersion === '14.1' ? bigIp14DhclientStatus : bigIpDhclientStatus
                        }
                    });
                }

                if (path === '/tm/sys/global-settings') {
                    const globalSettings = {
                        mgmtDhcp: isDhcpEnabled,
                        hostname: globalHostname
                    };
                    return Promise.resolve(globalSettings);
                }

                return Promise.resolve();
            });
        }

        beforeEach(() => {
            setUpBigIpStubWithRequestOptions([]);
        });

        it('should handle NTP', () => {
            const declaration = {
                Common: {
                    NTP: {
                        servers: [
                            '0.pool.ntp.org',
                            '1.pool.ntp.org'
                        ],
                        timezone: 'UTC'
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, '/tm/sys/ntp');
                    assert.deepEqual(dataSent.servers, ['0.pool.ntp.org', '1.pool.ntp.org']);
                    assert.strictEqual(dataSent.timezone, 'UTC');
                });
        });

        it('should handle NTP with no servers declared', () => {
            const declaration = {
                Common: {
                    NTP: {
                        timezone: 'UTC'
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process();
        });

        it('should turn off DHCP of NTP if we configure NTP', () => {
            const declaration = {
                Common: {
                    NTP: {
                        timezone: 'UTC'
                    }
                }
            };

            setUpBigIpStubWithRequestOptions(['one', 'two', 'ntp-servers', 'three']);

            sinon.stub(bigIpMock, 'modify').callsFake((path, body) => {
                assert.strictEqual(path, '/tm/sys/management-dhcp/sys-mgmt-dhcp-config');
                assert.strictEqual(body.requestOptions.length, 3);
                assert.strictEqual(body.requestOptions.indexOf('ntp-servers'), -1);
            });

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process();
        });

        it('should reject NTP if bad hostname is sent', () => {
            const logSevereSpy = sinon.spy(Logger.prototype, 'severe');
            doUtilMock.checkDnsResolution.restore();
            sinon.stub(doUtilMock, 'checkDnsResolution')
                .callsFake((bigIp, address) => {
                    if (address === '10.56.48.3') {
                        return Promise.resolve();
                    }
                    return Promise.reject(new Error(`Unable to resolve host ${address}`));
                });

            const testServers = [
                'example.cant',
                '10.56.48.3'
            ];
            const declaration = {
                Common: {
                    NTP: {
                        servers: testServers,
                        timezone: 'UTC'
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return assert.isRejected(
                systemHandler.process(),
                'Unable to resolve host example.cant',
                `All of these ${JSON.stringify(testServers)} exist, and one should NOT`
            ).then(() => {
                assert.strictEqual(logSevereSpy.thisValues[0].metadata, 'systemHandler.js | 123-abc');
                assert.strictEqual(
                    logSevereSpy.args[0][0],
                    'Error processing system declaration: Unable to resolve host example.cant'
                );
            });
        });

        it('should reject if DNS configured after NTP is configured', () => {
            let isDnsConfigured = false;
            sinon.stub(bigIpMock, 'replace').callsFake((path) => {
                if (path === PATHS.DNS) {
                    isDnsConfigured = true;
                }
                return Promise.resolve();
            });
            doUtilMock.checkDnsResolution.restore();
            sinon.stub(doUtilMock, 'checkDnsResolution').callsFake(() => {
                const message = 'DNS must be configured before NTP, so server hostnames can be checked';
                assert.strictEqual(isDnsConfigured, true, message);
            });

            const testServers = [
                'www.google.com',
                '10.56.48.3'
            ];
            const declaration = {
                Common: {
                    DNS: {
                        nameServers: [
                            '192.0.2.20',
                            '2001:4860:4860::8844'
                        ],
                        search: ['one.com', 'two.com']
                    },
                    NTP: {
                        servers: testServers,
                        timezone: 'UTC'
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process();
        });

        it('should handle DNS', () => {
            const declaration = {
                Common: {
                    DNS: {
                        nameServers: [
                            '192.0.2.20',
                            '2001:4860:4860::8844'
                        ],
                        search: ['one.com', 'two.com']
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, PATHS.DNS);
                    assert.deepEqual(dataSent['name-servers'], ['192.0.2.20', '2001:4860:4860::8844']);
                    assert.deepEqual(dataSent.search, ['one.com', 'two.com']);
                });
        });

        it('should turn off DHCP of DNS if we configure DNS', () => {
            const declaration = {
                Common: {
                    DNS: {
                        nameServers: ['192.0.2.10'],
                        search: ['f5.com']
                    }
                }
            };

            setUpBigIpStubWithRequestOptions(['one', 'two', 'domain-name-servers', 'domain-name', 'three']);

            sinon.stub(bigIpMock, 'modify').callsFake((path, body) => {
                assert.strictEqual(path, '/tm/sys/management-dhcp/sys-mgmt-dhcp-config');
                assert.strictEqual(body.requestOptions.length, 3);
                assert.strictEqual(body.requestOptions.indexOf('domain-name-servers'), -1);
                assert.strictEqual(body.requestOptions.indexOf('domain-name'), -1);
            });

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process();
        });

        it('should turn off DHCP of DNS if we configure DNS on BIG-IP 14.1', () => {
            const declaration = {
                Common: {
                    DNS: {
                        nameServers: ['192.0.2.10'],
                        search: ['f5.com']
                    }
                }
            };

            setUpBigIpStubWithRequestOptions(
                ['one', 'two', 'domain-name-servers', 'domain-name', 'three'], '14.1'
            );

            sinon.stub(bigIpMock, 'modify').callsFake((path, body) => {
                assert.strictEqual(path, '/tm/sys/management-dhcp/sys-mgmt-dhcp-config');
                assert.strictEqual(body.requestOptions.length, 3);
                assert.strictEqual(body.requestOptions.indexOf('domain-name-servers'), -1);
                assert.strictEqual(body.requestOptions.indexOf('domain-name'), -1);
            });

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process();
        });

        it('should not restart DHCP if DHCP has been disabled on the BIG-IP', () => {
            const declaration = {
                Common: {
                    DNS: {
                        nameServers: ['192.0.2.10'],
                        search: ['f5.com']
                    }
                }
            };

            setUpBigIpStubWithRequestOptions(['domain-name-servers', 'domain-name'], '14.1', 'disabled');

            sinon.stub(bigIpMock, 'create').restore();
            sinon.stub(bigIpMock, 'create').callsFake((path, body) => {
                // Fail if the dhclient attempts to restart
                if (path === '/tm/sys/service'
                    && body.command === 'restart'
                    && body.name === 'dhclient') {
                    return Promise.reject(new Error(
                        'dhclient should not be restarted if DHCP is disabled'
                    ));
                }
                return Promise.resolve();
            });

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process();
        });

        it('should handle hostname', () => {
            const declaration = {
                Common: {
                    InternalUse: {
                        deviceNames: {
                            foo: 'bar'
                        }
                    },
                    System: {
                        hostname: 'myhost.example.com'
                    }
                }
            };

            let hostnameSent;
            bigIpMock.onboard = {
                hostname(hostname) {
                    hostnameSent = hostname;
                    return Promise.resolve();
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(hostnameSent, 'myhost.example.com');
                });
        });

        it('should handle hostname via System class', () => {
            const declaration = {
                Common: {
                    InternalUse: {
                        deviceNames: {
                            foo: 'bar'
                        }
                    },
                    System: {
                        hostname: 'myhost.example.com'
                    }
                }
            };
            let hostnameSent;
            bigIpMock.onboard = {
                hostname(hostname) {
                    hostnameSent = hostname;
                    return Promise.resolve();
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(hostnameSent, 'myhost.example.com');
                });
        });

        it('should handle no hostname in declaration', () => {
            const declaration = {
                Common: {
                    InternalUse: {
                        deviceNames: {
                            foo: 'bar'
                        }
                    }
                }
            };
            setUpBigIpStubWithRequestOptions([], '', '', 'global.hostname');
            let hostnameSent;
            bigIpMock.onboard = {
                hostname(hostname) {
                    hostnameSent = hostname;
                    return Promise.resolve();
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(hostnameSent, 'global.hostname');
                });
        });

        it('should disable hostname from DHCP if we configure the hostname (aws)', () => {
            const declaration = {
                Common: {
                    InternalUse: {
                        deviceNames: {
                            foo: 'bar'
                        }
                    },
                    System: {
                        hostname: 'myhost.example.com'
                    }
                }
            };
            let hostnameSent;
            bigIpMock.onboard = {
                hostname(hostname) {
                    hostnameSent = hostname;
                    return Promise.resolve();
                }
            };

            setUpBigIpStubWithRequestOptions(
                ['one', 'two', 'host-name', 'domain-name'], '14.1'
            );

            sinon.stub(bigIpMock, 'modify').callsFake((path, body) => {
                assert.strictEqual(path, '/tm/sys/management-dhcp/sys-mgmt-dhcp-config');
                assert.strictEqual(body.requestOptions.length, 3);
                assert.strictEqual(body.requestOptions.indexOf('host-name'), -1);
            });

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(hostnameSent, 'myhost.example.com');
                });
        });

        it('should handle consoleInactivityTimeout and idleTimeout', () => {
            // these props are posted to separate paths
            const declaration = {
                Common: {
                    System: {
                        consoleInactivityTimeout: 50,
                        idleTimeout: 1200
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent[PATHS.SysGlobalSettings][0], { consoleInactivityTimeout: 50 });
                    assert.deepStrictEqual(dataSent[PATHS.CLI][0], { idleTimeout: 20 }); // seconds converted to minutes
                });
        });

        it('should handle idleTimeout equal to 0', () => {
            // these props are posted to separate paths
            const declaration = {
                Common: {
                    System: {
                        consoleInactivityTimeout: 50,
                        idleTimeout: 0
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent[PATHS.SysGlobalSettings][0], { consoleInactivityTimeout: 50 });
                    assert.deepStrictEqual(dataSent[PATHS.CLI][0], { idleTimeout: 0 });
                });
        });

        it('should handle the gui security banner', () => {
            const declaration = {
                Common: {
                    System: {
                        guiSecurityBanner: 'enabled',
                        guiSecurityBannerText: 'Y\'all need to log in.\n\nLogin to the text boxes yonder.'
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent[PATHS.SysGlobalSettings][0], {
                        guiSecurityBanner: 'enabled',
                        guiSecurityBannerText: 'Y\'all need to log in.\n\nLogin to the text boxes yonder.'
                    });
                });
        });
    });

    it('should handle autoPhonehome', () => {
        const declaration = {
            Common: {
                System: {
                    autoPhonehome: 'disabled'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepStrictEqual(dataSent[PATHS.SoftwareUpdate][0], { autoPhonehome: 'disabled' });
            });
    });

    it('should handle autoCheck', () => {
        const declaration = {
            Common: {
                System: {
                    autoCheck: 'disabled'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepStrictEqual(dataSent[PATHS.SoftwareUpdate][0], { autoCheck: 'disabled' });
            });
    });

    it('should handle audit', () => {
        const declaration = {
            Common: {
                System: {
                    audit: 'enabled'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepStrictEqual(dataSent[PATHS.CLI][0], { audit: 'enabled' });
            });
    });

    it('should handle guiAudit', () => {
        const declaration = {
            Common: {
                System: {
                    guiAudit: 'enabled'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepStrictEqual(dataSent[PATHS.SysGlobalSettings][0], { guiAudit: 'enabled' });
            });
    });

    it('should ignore guiAudit if version < 14.0', () => {
        sinon.stub(bigIpMock, 'deviceInfo').resolves({ version: '13.1.1' });
        const declaration = {
            Common: {
                System: {
                    audit: 'enabled',
                    guiAudit: 'enabled'
                }
            }
        };
        const expected = { '/tm/cli/global-settings': [{ audit: 'enabled' }] };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                // note guiAudit info is absent, only audit info is present
                assert.deepStrictEqual(dataSent, expected);
            });
    });

    it('should handle mcpAuditLog', () => {
        const declaration = {
            Common: {
                System: {
                    mcpAuditLog: 'verbose'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepStrictEqual(dataSent['/tm/sys/db/config.auditing'][0], { value: 'verbose' });
            });
    });

    it('should handle usernamePrompt and passwordPrompt', () => {
        const declaration = {
            Common: {
                System: {
                    usernamePrompt: 'Your username:',
                    passwordPrompt: 'Your password:'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepStrictEqual(
                    dataSent[PATHS.SysGlobalSettings][0],
                    { usernamePrompt: 'Your username:', passwordPrompt: 'Your password:' }
                );
            });
    });

    it('should handle root users without keys', () => {
        // Stubs out the remote call to confirm the key is not added to the user
        doUtilExecuteBashCommandStub.restore();
        sinon.stub(doUtilMock, 'executeBashCommandIControl').resolves(superuserKey);

        const declaration = {
            Common: {
                User: {
                    root: {
                        userType: 'root',
                        oldPassword: 'foo',
                        newPassword: 'bar',
                        keys: [],
                        forceInitialPasswordChange: true
                    }
                }
            }
        };

        let userSent;
        let newPasswordSent;
        let oldPasswordSent;
        bigIpMock.onboard = {
            password(user, newPassword, oldPassword) {
                userSent = user;
                newPasswordSent = newPassword;
                oldPasswordSent = oldPassword;
                return Promise.resolve();
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(userSent, 'root');
                assert.strictEqual(newPasswordSent, 'bar');
                assert.strictEqual(oldPasswordSent, 'foo');
                assert.strictEqual(declaration.Common.User.root.keys.join('\n'), superuserKey);
            });
    });

    it('should handle root users with keys', () => {
        doUtilExecuteBashCommandStub.restore();
        sinon.stub(doUtilMock, 'executeBashCommandIControl').resolves(superuserKey);

        const declaration = {
            Common: {
                User: {
                    root: {
                        userType: 'root',
                        oldPassword: 'foo',
                        newPassword: 'bar',
                        keys: [testKey],
                        forceInitialPasswordChange: true
                    }
                }
            }
        };

        let userSent;
        let newPasswordSent;
        let oldPasswordSent;
        bigIpMock.onboard = {
            password(user, newPassword, oldPassword) {
                userSent = user;
                newPasswordSent = newPassword;
                oldPasswordSent = oldPassword;
                return Promise.resolve();
            }
        };

        const expectedKeys = `${superuserKey}\n${testKey}`;

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(userSent, 'root');
                assert.strictEqual(newPasswordSent, 'bar');
                assert.strictEqual(oldPasswordSent, 'foo');
                assert.strictEqual(declaration.Common.User.root.keys.join('\n'), expectedKeys);
            });
    });

    it('should handle root users with no keys', () => {
        const bashCmds = [];
        doUtilExecuteBashCommandStub.restore();
        sinon.stub(doUtilMock, 'executeBashCommandIControl').callsFake((bigIp, bashCmd) => {
            bashCmds.push(bashCmd);
            return Promise.resolve(superuserKey);
        });

        const declaration = {
            Common: {
                User: {
                    root: {
                        userType: 'root',
                        oldPassword: 'foo',
                        newPassword: 'bar',
                        forceInitialPasswordChange: true
                    }
                }
            }
        };

        let userSent;
        let newPasswordSent;
        let oldPasswordSent;
        bigIpMock.onboard = {
            password(user, newPassword, oldPassword) {
                userSent = user;
                newPasswordSent = newPassword;
                oldPasswordSent = oldPassword;
                return Promise.resolve();
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(userSent, 'root');
                assert.strictEqual(newPasswordSent, 'bar');
                assert.strictEqual(oldPasswordSent, 'foo');
                assert.strictEqual(bashCmds.length, 16); // Should only be the 16 default commands
            });
    });

    it('should handle non-root users with & without keys', () => {
        const bashCmds = [];
        doUtilExecuteBashCommandStub.restore();
        sinon.stub(doUtilMock, 'executeBashCommandIControl').callsFake((bigIp, bashCmd) => {
            bashCmds.push(bashCmd);
            return Promise.resolve(superuserKey);
        });

        const sshPaths = [
            '/home/user1/.ssh',
            '/home/user2/.ssh'
        ];

        const declaration = {
            Common: {
                User: {
                    user0: {
                        userType: 'regular',
                        partitionAccess: {
                            Common: {
                                role: 'guest'
                            }
                        },
                        shell: 'bash',
                        forceInitialPasswordChange: true
                    },
                    user1: {
                        userType: 'regular',
                        password: 'foofoo',
                        partitionAccess: {
                            Common: {
                                role: 'guest'
                            }
                        },
                        shell: 'bash',
                        keys: [testKey],
                        forceInitialPasswordChange: true
                    },
                    user2: {
                        userType: 'regular',
                        password: 'barbar',
                        partitionAccess: {
                            'all-partitions': {
                                role: 'guest'
                            },
                            Common: {
                                role: 'admin'
                            }
                        },
                        shell: 'tmsh',
                        keys: [],
                        forceInitialPasswordChange: true
                    }
                }
            }
        };

        const bodiesSent = [];
        bigIpMock.isBigIq = () => false;
        bigIpMock.createOrModify = (path, body) => {
            pathSent = path;
            bodiesSent.push(body);
            return Promise.resolve();
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(pathSent, '/tm/auth/user');
                assert.strictEqual(bodiesSent.length, 3);
                assert.deepEqual(
                    bodiesSent[0]['partition-access'],
                    [
                        { name: 'Common', role: 'guest' }
                    ]
                );
                assert.deepEqual(bodiesSent[0].shell, 'bash');
                assert.deepEqual(
                    bodiesSent[1]['partition-access'],
                    [
                        { name: 'Common', role: 'guest' }
                    ]
                );
                assert.deepEqual(bodiesSent[1].shell, 'bash');
                assert.deepEqual(
                    bodiesSent[2]['partition-access'],
                    [
                        { name: 'all-partitions', role: 'guest' },
                        { name: 'Common', role: 'admin' }
                    ]
                );
                assert.deepEqual(bodiesSent[2].shell, 'tmsh');
                assert.strictEqual(bashCmds[16],
                    [
                        ` mkdir -p ${sshPaths[0]}; `,
                        `echo '${testKey}' > `,
                        `${sshPaths[0]}/authorized_keys; `,
                        `chown -R "user1":webusers ${sshPaths[0]}; `,
                        `chmod -R 700 ${sshPaths[0]}; `,
                        `chmod 600 ${sshPaths[0]}/authorized_keys`
                    ].join(''));
                assert.strictEqual(bashCmds[17],
                    [
                        ` mkdir -p ${sshPaths[1]}; `,
                        'echo \'\' > ',
                        `${sshPaths[1]}/authorized_keys; `,
                        `chown -R "user2":webusers ${sshPaths[1]}; `,
                        `chmod -R 700 ${sshPaths[1]}; `,
                        `chmod 600 ${sshPaths[1]}/authorized_keys`
                    ].join(''));
            });
    });

    it('should modify user when forceInitialPasswordChange is set to false', () => {
        const bodiesSent = [];
        bigIpMock.isBigIq = () => false;
        bigIpMock.createOrModify = (path, body) => {
            pathSent = path;
            bodiesSent.push(body);
            return Promise.resolve();
        };

        const declaration = {
            Common: {
                User: {
                    newUser: {
                        userType: 'regular',
                        partitionAccess: {
                            Common: {
                                role: 'guest'
                            }
                        },
                        shell: 'bash',
                        forceInitialPasswordChange: false
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(bodiesSent.length, 2);
                assert.deepStrictEqual(
                    bodiesSent[0],
                    {
                        name: 'newUser',
                        shell: 'bash',
                        'partition-access': [
                            {
                                name: 'Common',
                                role: 'guest'
                            }
                        ]
                    }
                );
                assert.deepStrictEqual(
                    bodiesSent[1],
                    {
                        name: 'newUser',
                        shell: 'bash',
                        'partition-access': [
                            {
                                name: 'Common',
                                role: 'guest'
                            }
                        ]
                    }
                );
            });
    });

    it('should handle reg key licenses', () => {
        const declaration = {
            Common: {
                License: {
                    licenseType: 'regKey',
                    regKey: 'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ',
                    addOnKeys: ['ABCDEFG-HIJKLMN', 'OPQRSTU-VWXYZAB'],
                    overwrite: true
                }
            }
        };

        let licenseArgs;
        let revokeLicenseCalled = false;
        bigIpMock.onboard = {
            license(args) {
                licenseArgs = args;
                return Promise.resolve();
            },
            revokeLicense() {
                revokeLicenseCalled = true;
                return Promise.resolve();
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(licenseArgs.registrationKey, 'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ');
                assert.deepEqual(licenseArgs.addOnKeys, ['ABCDEFG-HIJKLMN', 'OPQRSTU-VWXYZAB']);
                assert.strictEqual(licenseArgs.overwrite, true);
                assert.ok(!revokeLicenseCalled, 'revokeLicense should not have been called');
            });
    });

    it('should provide descriptive licensing error if licensing fails', () => {
        const declaration = {
            Common: {
                License: {
                    licenseType: 'regKey',
                    regKey: 'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ',
                    addOnKeys: ['ABCDEFG-HIJKLMN', 'OPQRSTU-VWXYZAB'],
                    overwrite: true
                }
            }
        };

        bigIpMock.onboard = {
            license() {
                return Promise.reject(new Error('failed to license device'));
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return assert.isRejected(
            systemHandler.process(),
            'Error licensing: failed to license device',
            'should have rejected'
        );
    });

    it('should handle license pool licenses with unreachable BIG-IP', () => {
        const declaration = {
            Common: {
                License: {
                    licenseType: 'licensePool',
                    bigIqHost: '10.145.112.44',
                    bigIqUsername: 'admin',
                    bigIqPassword: 'foofoo',
                    bigIqAuthProvider: 'myAuthProvider',
                    licensePool: 'clpv2',
                    unitOfMeasure: 'daily',
                    skuKeyword1: 'my skukeyword1',
                    skuKeyword2: 'my skukeyword2',
                    reachable: false,
                    hypervisor: 'vmware',
                    overwrite: true,
                    tenant: 'Test tenant value'
                }
            }
        };
        const host = '192.0.2.50';

        let bigIqHostSent;
        let bigIqUsernameSent;
        let bigIqPasswordSent;
        let licensePoolSent;
        let hypervisorSent;
        let optionsSent;

        bigIpMock.host = host;
        bigIpMock.onboard = {
            licenseViaBigIq(bigIqHost, bigIqUsername, bigIqPassword, licensePool, hypervisor, options) {
                bigIqHostSent = bigIqHost;
                bigIqUsernameSent = bigIqUsername;
                bigIqPasswordSent = bigIqPassword;
                licensePoolSent = licensePool;
                hypervisorSent = hypervisor;
                optionsSent = options;
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(bigIqHostSent, '10.145.112.44');
                assert.strictEqual(bigIqUsernameSent, 'admin');
                assert.strictEqual(bigIqPasswordSent, 'foofoo');
                assert.strictEqual(licensePoolSent, 'clpv2');
                assert.strictEqual(hypervisorSent, 'vmware');
                assert.strictEqual(optionsSent.authProvider, 'myAuthProvider');
                assert.strictEqual(optionsSent.bigIpMgmtAddress, undefined);
                assert.strictEqual(optionsSent.skuKeyword1, 'my skukeyword1');
                assert.strictEqual(optionsSent.skuKeyword2, 'my skukeyword2');
                assert.strictEqual(optionsSent.unitOfMeasure, 'daily');
                assert.strictEqual(optionsSent.noUnreachable, false);
                assert.strictEqual(optionsSent.overwrite, true);
                assert.strictEqual(optionsSent.autoApiType, true);
                assert.strictEqual(activeCalled, true);
                assert.strictEqual(optionsSent.tenant, 'Test tenant value');
            });
    });

    it('should handle license pool licenses with reachable BIG-IP', () => {
        const declaration = {
            Common: {
                License: {
                    licenseType: 'licensePool',
                    bigIqHost: '10.145.112.44',
                    bigIqUsername: 'admin',
                    bigIqPassword: 'foofoo',
                    licensePool: 'clpv2',
                    unitOfMeasure: 'daily',
                    skuKeyword1: 'my skukeyword1',
                    skuKeyword2: 'my skukeyword2',
                    reachable: true,
                    bigIpUsername: 'mybigipuser',
                    bigIpPassword: 'barbar'
                }
            }
        };
        const host = '192.0.2.50';
        const managementAddress = '192.0.2.10';
        const managementPort = 5678;

        let optionsSent;
        bigIpMock.onboard = {
            licenseViaBigIq(bigIqHost, bigIqUsername, bigIqPassword, licensePool, hypervisor, options) {
                optionsSent = options;
            }
        };
        bigIpMock.deviceInfo = () => Promise.resolve({ managementAddress });
        bigIpMock.host = host;
        bigIpMock.port = managementPort;

        let bigIpUsernameSent;
        let bigIpPasswordSent;
        let bigIpHostSent;
        let bigIpPortSent;

        sinon.stub(doUtilMock, 'getBigIp').callsFake((logger, options) => {
            bigIpUsernameSent = options.user;
            bigIpPasswordSent = options.password;
            bigIpHostSent = options.host;
            bigIpPortSent = options.port;
            return Promise.resolve(bigIpMock);
        });

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(optionsSent.bigIpMgmtAddress, undefined);
                assert.strictEqual(optionsSent.noUnreachable, true);
                assert.strictEqual(bigIpUsernameSent, 'mybigipuser');
                assert.strictEqual(bigIpPasswordSent, 'barbar');
                assert.strictEqual(bigIpHostSent, '192.0.2.10');
                assert.strictEqual(bigIpPortSent, 5678);
                assert.strictEqual(activeCalled, true);
            });
    });

    it('should handle license pool when running on BIG-IQ', () => {
        const declaration = {
            Common: {
                License: {
                    licenseType: 'licensePool',
                    licensePool: 'clpv2',
                    tenant: 'Test tenant description'
                }
            }
        };
        const host = '192.0.2.50';

        let bigIqHostSent;
        let optionsSent;

        doUtilGetCurrentPlatformStub.restore();
        doUtilExecuteBashCommandStub.restore();
        sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('BIG-IQ');
        sinon.stub(doUtilMock, 'executeBashCommandIControl').resolves('');

        bigIpMock.host = host;
        bigIpMock.onboard = {
            licenseViaBigIq(bigIqHost, bigIqUsername, bigIqPassword, licensePool, hypervisor, options) {
                bigIqHostSent = bigIqHost;
                optionsSent = options;
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(bigIqHostSent, 'localhost');
                assert.strictEqual(optionsSent.bigIpMgmtAddress, '192.0.2.50');
                assert.strictEqual(optionsSent.bigIqMgmtPort, 8100);
                assert.strictEqual(optionsSent.tenant, 'Test tenant description');
            });
    });

    it('should reject if the bigIqHost is given a bad hostname', () => {
        doUtilMock.checkDnsResolution.restore();
        sinon.stub(doUtilMock, 'checkDnsResolution')
            .callsFake((bigIp, address) => Promise.reject(new Error(`Unable to resolve host ${address}`)));

        const testCase = 'example.cant';
        const declaration = {
            Common: {
                License: {
                    bigIqHost: testCase
                }
            }
        };
        const managementAddress = '192.0.2.10';

        bigIpMock.onboard = {
            licenseViaBigIq() {}
        };
        bigIpMock.deviceInfo = () => Promise.resolve({ managementAddress });

        sinon.stub(doUtilMock, 'getBigIp').resolves(bigIpMock);

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return assert.isRejected(systemHandler.process(),
            'Unable to resolve host example.cant',
            'example.cant is reported to exist and it should not');
    });

    describe('revoke', () => {
        let eventEmitter;
        let willBeRevokedCalled;
        let clock;

        beforeEach(() => {
            willBeRevokedCalled = false;
            eventEmitter = new EventEmitter();
            eventEmitter.on(EVENTS.LICENSE_WILL_BE_REVOKED, () => {
                willBeRevokedCalled = true;
                eventEmitter.emit(
                    EVENTS.READY_FOR_REVOKE
                );
            });
            sinon.stub(doUtilMock, 'getBigIp').resolves(bigIpMock);
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            sinon.restore();
            clock.restore();
        });

        it('should handle revoke from license pool', () => {
            const declaration = {
                Common: {
                    License: {
                        licenseType: 'licensePool',
                        bigIqHost: '10.145.112.44',
                        bigIqUsername: 'admin',
                        bigIqPassword: 'foofoo',
                        bigIqAuthProvider: 'myAuthProvider',
                        reachable: false,
                        revokeFrom: 'clpv2'
                    }
                }
            };

            let bigIqHostSent;
            let bigIqUsernameSent;
            let bigIqPasswordSent;
            let licensePoolSent;
            let optionsSent;
            bigIpMock.onboard = {
                revokeLicenseViaBigIq(bigIqHost, bigIqUsername, bigIqPassword, licensePool, options) {
                    bigIqHostSent = bigIqHost;
                    bigIqUsernameSent = bigIqUsername;
                    bigIqPasswordSent = bigIqPassword;
                    licensePoolSent = licensePool;
                    optionsSent = options;
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, eventEmitter, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(bigIqHostSent, '10.145.112.44');
                    assert.strictEqual(bigIqUsernameSent, 'admin');
                    assert.strictEqual(bigIqPasswordSent, 'foofoo');
                    assert.strictEqual(licensePoolSent, 'clpv2');
                    assert.strictEqual(optionsSent.authProvider, 'myAuthProvider');
                    assert.strictEqual(optionsSent.noUnreachable, false);
                    assert.strictEqual(activeCalled, false);
                    assert.strictEqual(willBeRevokedCalled, false);
                });
        });

        it('should wait for revokeReady if BIG-IP is reachable', () => {
            const declaration = {
                Common: {
                    License: {
                        licenseType: 'licensePool',
                        bigIqHost: '10.145.112.44',
                        bigIqUsername: 'admin',
                        bigIqPassword: 'foofoo',
                        reachable: true,
                        revokeFrom: 'clpv2'
                    }
                }
            };

            bigIpMock.onboard = {
                revokeLicenseViaBigIq() {}
            };
            bigIpMock.deviceInfo = () => Promise.resolve({});

            sinon.stub(promiseUtil, 'delay').resolves();

            const systemHandler = new SystemHandler(declaration, bigIpMock, eventEmitter, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(willBeRevokedCalled, true);
                });
        });

        it('should handle timeout of revokeReady', () => {
            const declaration = {
                Common: {
                    License: {
                        licenseType: 'licensePool',
                        bigIqHost: '10.145.112.44',
                        bigIqUsername: 'admin',
                        bigIqPassword: 'foofoo',
                        reachable: true,
                        revokeFrom: 'clpv2'
                    }
                }
            };

            eventEmitter.removeAllListeners(EVENTS.LICENSE_WILL_BE_REVOKED);
            eventEmitter.on(EVENTS.LICENSE_WILL_BE_REVOKED, () => {
                clock.tick(30001);
                willBeRevokedCalled = true;
            });

            bigIpMock.onboard = {
                revokeLicenseViaBigIq() {}
            };
            bigIpMock.deviceInfo = () => Promise.resolve({});

            const systemHandler = new SystemHandler(declaration, bigIpMock, eventEmitter, state);
            return assert.isRejected(systemHandler.process(), 'Timed out waiting for revoke ready event');
        });

        it('should handle revoke from license pool from a different BIG-IQ', () => {
            const declaration = {
                Common: {
                    License: {
                        licenseType: 'licensePool',
                        bigIqHost: '10.145.112.44',
                        bigIqUsername: 'admin',
                        bigIqPassword: 'foofoo',
                        reachable: false,
                        revokeFrom: {
                            bigIqHost: '10.145.112.45',
                            bigIqUsername: 'otherAdmin',
                            bigIqPassword: 'barbar',
                            licensePool: 'clpv2',
                            reachable: false
                        }
                    }
                }
            };

            let bigIqHostSent;
            let bigIqUsernameSent;
            let bigIqPasswordSent;
            let licensePoolSent;
            let optionsSent;
            bigIpMock.onboard = {
                revokeLicenseViaBigIq(bigIqHost, bigIqUsername, bigIqPassword, licensePool, options) {
                    bigIqHostSent = bigIqHost;
                    bigIqUsernameSent = bigIqUsername;
                    bigIqPasswordSent = bigIqPassword;
                    licensePoolSent = licensePool;
                    optionsSent = options;
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, eventEmitter, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(bigIqHostSent, '10.145.112.45');
                    assert.strictEqual(bigIqUsernameSent, 'otherAdmin');
                    assert.strictEqual(bigIqPasswordSent, 'barbar');
                    assert.strictEqual(licensePoolSent, 'clpv2');
                    assert.strictEqual(optionsSent.noUnreachable, false);
                    assert.strictEqual(activeCalled, false);
                });
        });

        it('should handle revoke from BIG-IP with reg key license', () => {
            const declaration = {
                Common: {
                    License: {
                        licenseType: 'regKey',
                        regKey: 'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ',
                        addOnKeys: ['ABCDEFG-HIJKLMN', 'OPQRSTU-VWXYZAB'],
                        overwrite: true,
                        revokeCurrent: true
                    }
                }
            };

            let licenseArgs;
            let revokeLicenseCalled = false;
            bigIpMock.onboard = {
                license(args) {
                    licenseArgs = args;
                    return Promise.resolve();
                },
                revokeLicense() {
                    revokeLicenseCalled = true;
                    return Promise.resolve();
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, eventEmitter, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(licenseArgs.registrationKey, 'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ');
                    assert.deepEqual(licenseArgs.addOnKeys, ['ABCDEFG-HIJKLMN', 'OPQRSTU-VWXYZAB']);
                    assert.strictEqual(licenseArgs.overwrite, true);
                    assert.ok(revokeLicenseCalled, 'revokeLicense should have been called');
                });
        });

        it('should skip if revoking from BIG-IP and re-licensing with same reg key', () => {
            const declaration = {
                Common: {
                    License: {
                        licenseType: 'regKey',
                        regKey: 'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ',
                        addOnKeys: ['ABCDEFG-HIJKLMN', 'OPQRSTU-VWXYZAB'],
                        overwrite: true,
                        revokeCurrent: true
                    }
                }
            };

            let licenseArgs;
            let revokeLicenseCalled = false;
            bigIpMock.onboard = {
                license(args) {
                    licenseArgs = args;
                    return Promise.resolve();
                },
                revokeLicense() {
                    revokeLicenseCalled = true;
                    return Promise.resolve();
                }
            };

            sinon.stub(bigIpMock, 'list').callsFake((path) => {
                if (path === PATHS.LicenseRegistration) {
                    return Promise.resolve({
                        registrationKey: 'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ'
                    });
                }
                return Promise.resolve();
            });

            const systemHandler = new SystemHandler(declaration, bigIpMock, eventEmitter, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(licenseArgs.registrationKey, 'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ');
                    assert.deepEqual(licenseArgs.addOnKeys, ['ABCDEFG-HIJKLMN', 'OPQRSTU-VWXYZAB']);
                    assert.strictEqual(licenseArgs.overwrite, true);
                    assert.ok(!revokeLicenseCalled, 'revokeLicense should not have been called');
                });
        });
    });

    describe('ManagementIp', () => {
        let hostSet;
        beforeEach(() => {
            hostSet = undefined;

            state.currentConfig.Common.ManagementIp = {
                '192.0.2.40/8': {
                    name: '192.0.2.40/8',
                    description: 'configured-by-dhcp'
                }
            };
            state.currentConfig.Common.System.preserveOrigDhcpRoutes = true;

            sinon.stub(bigIpMock, 'setHost').callsFake((host) => {
                hostSet = host;
                return Promise.resolve();
            });
        });

        it('should handle the ManagementIp', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.10/5': {
                            name: '192.0.2.10/5',
                            description: 'this is my description'
                        }
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const managementIpData = dataSent[PATHS.ManagementIp][0];
                    const mgmtDhcpData = dataSent[PATHS.SysGlobalSettings][0];
                    assert.deepStrictEqual(
                        managementIpData,
                        {
                            name: '192.0.2.10/5',
                            description: 'this is my description'
                        }
                    );
                    assert.deepStrictEqual(
                        mgmtDhcpData,
                        {
                            mgmtDhcp: 'disabled'
                        }
                    );
                    assert.strictEqual(hostSet, '192.0.2.10');
                });
        });

        it('should update ManagementIp when just the address changes', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.10/5': {
                            name: '192.0.2.10/5',
                            description: 'this is my description'
                        }
                    }
                }
            };

            state.currentConfig.Common.ManagementIp = {
                '192.0.2.40/8': {
                    name: '192.0.2.40/8',
                    description: 'this is my description'
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const managementIpData = dataSent[PATHS.ManagementIp][0];
                    const mgmtDhcpData = dataSent[PATHS.SysGlobalSettings][0];
                    assert.deepStrictEqual(
                        managementIpData,
                        {
                            name: '192.0.2.10/5',
                            description: 'this is my description'
                        }
                    );
                    assert.deepStrictEqual(
                        mgmtDhcpData,
                        {
                            mgmtDhcp: 'disabled'
                        }
                    );
                    assert.strictEqual(hostSet, '192.0.2.10');
                });
        });

        it('should update ManagementIp when just the description changes', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.10/5': {
                            name: '192.0.2.10/5',
                            description: 'this is new'
                        }
                    }
                }
            };

            state.currentConfig.Common.ManagementIp = {
                '192.0.2.10/5': {
                    name: '192.0.2.10/5',
                    description: 'this is my description'
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const expectedPath = `${PATHS.ManagementIp}/192.0.2.10~5`;
                    const managementIpData = dataSent[expectedPath][0];
                    const mgmtDhcpData = dataSent[PATHS.SysGlobalSettings][0];
                    assert.deepStrictEqual(
                        managementIpData,
                        {
                            description: 'this is new'
                        }
                    );
                    assert.deepStrictEqual(
                        mgmtDhcpData,
                        {
                            mgmtDhcp: 'disabled'
                        }
                    );
                    assert.strictEqual(hostSet, '192.0.2.10');
                });
        });

        it('should not set host if using localhost', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.10/5': {
                            name: '192.0.2.10/5',
                            description: 'this is my description'
                        }
                    }
                }
            };

            bigIpMock.host = 'localhost';

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(hostSet, undefined);
                });
        });

        it('should delete the current management ip if using localhost and only changing mask', () => {
            // Note: the beforeAll hook sets the IP to '192.0.2.40/8'. So this test
            // is changing just the mask and looking for a delete call.
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.40/9': {
                            name: '192.0.2.40/9',
                            description: 'this is my description'
                        }
                    }
                }
            };

            bigIpMock.host = 'localhost';

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(deletePathSent, `${PATHS.ManagementIp}/192.0.2.40~8`);
                });
        });

        it('should not delete the current management ip if using localhost and changing ip', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.10/5': {
                            name: '192.0.2.10/5',
                            description: 'this is my description'
                        }
                    }
                }
            };

            bigIpMock.host = 'localhost';

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(deletePathSent, null);
                });
        });

        it('should error if using not using localhost and only changing mask', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.40/9': {
                            name: '192.0.2.40/9',
                            description: 'this is my description'
                        }
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return assert.isRejected(systemHandler.process(), /not supported/);
        });

        it('should not delete the current management ip if not using local host', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.10/5': {
                            name: '192.0.2.10/5',
                            description: 'this is my description'
                        }
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(deletePathSent, null);
                });
        });

        it('should not update mgmt-dhcp when it is currently set to dhcpv6', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.10/5': {
                            name: '192.0.2.10/5',
                            description: 'configured-by-dhcp'
                        }
                    }
                }
            };
            state.currentConfig.Common.System.mgmtDhcp = 'dhcpv6';

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent, null);
                    assert.strictEqual(hostSet, '192.0.2.10');
                });
        });

        it('should not update mgmt-dhcp when the current and desired values match', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.40/8': {
                            name: '192.0.2.40/8',
                            description: 'configured-by-dhcp'
                        }
                    }
                }
            };
            state.currentConfig.Common.System.preserveOrigDhcpRoutes = false;

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(
                        dataSent,
                        null
                    );
                    assert.strictEqual(hostSet, '192.0.2.40');
                });
        });

        it('should default mgmt-dhcp to enabled when there is no description', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.40/8': {
                            name: '192.0.2.40/8'
                        }
                    }
                }
            };
            state.currentConfig.Common.System.preserveOrigDhcpRoutes = false;

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent, null);
                    assert.strictEqual(hostSet, '192.0.2.40');
                });
        });

        it('should disable mgmt-dhcp if ManagementIp and ManagementRoute disagree', () => {
            const declaration = {
                Common: {
                    InternalUse: {
                        System: {
                            preserveOrigDhcpRoutes: false
                        }
                    },
                    ManagementIp: {
                        '192.0.2.10/5': {
                            name: '192.0.2.10/5',
                            description: 'configured-by-dhcp'
                        }
                    },
                    ManagementRoute: {
                        managementRoute1: {
                            name: 'managementRoute1',
                            gateway: '192.0.2.10',
                            network: '192.0.2.30',
                            mtu: 1
                        }
                    }
                }
            };
            state.currentConfig.Common.System.preserveOrigDhcpRoutes = true;

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const mgmtDhcpData = dataSent[PATHS.SysGlobalSettings][0];
                    assert.deepStrictEqual(
                        mgmtDhcpData,
                        {
                            mgmtDhcp: 'disabled'
                        }
                    );
                });
        });

        it('Proceed if desired management IP equals to current', () => {
            const declaration = {
                Common: {
                    ManagementIp: {
                        '192.0.2.40/8': {
                            name: '192.0.2.40/8',
                            description: 'this is my description'
                        }
                    }
                }
            };

            const bigIpMockSpy = sinon.spy(bigIpMock, 'create');
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.callCount, 0);
                });
        });
    });

    describe('ManagementRoute', () => {
        let declaration;
        const deletedPaths = [];
        beforeEach(() => {
            declaration = {
                Common: {
                    InternalUse: {
                        System: {}
                    },
                    ManagementRoute: {
                        theManagementRoute: {
                            name: 'theManagementRoute',
                            gateway: '192.0.2.30',
                            network: '192.0.2.10',
                            mtu: 123
                        }
                    }
                }
            };
            state.currentConfig.Common.System.preserveOrigDhcpRoutes = true;
            state.currentConfig.Common.ManagementRoute = {
                theManagementRoute: {
                    name: 'theManagementRoute',
                    gateway: '192.0.2.30',
                    network: '10.20.30.40',
                    mtu: 123
                }
            };
            deletedPaths.length = 0;
            bigIpMock.delete = (path) => {
                deletedPaths.push(path);
                return Promise.resolve();
            };
        });

        it('should handle the ManagementRoutes', () => {
            declaration.Common.ManagementRoute = {
                managementRoute1: {
                    name: 'managementRoute1',
                    description: 'Example description',
                    gateway: '192.0.2.10',
                    network: 'default-inet6',
                    mtu: 1234,
                    type: 'interface'
                },
                managementRoute2: {
                    name: 'managementRoute1',
                    gateway: '192.0.2.10',
                    network: '192.0.2.30',
                    mtu: 1
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const managementRouteData = dataSent[PATHS.ManagementRoute];
                    assert.deepEqual(deletedPaths, []);
                    assert.strictEqual(managementRouteData[0].name, 'managementRoute1');
                    assert.strictEqual(managementRouteData[0].description, 'Example description');
                    assert.strictEqual(managementRouteData[0].partition, 'Common');
                    assert.strictEqual(managementRouteData[0].gateway, '192.0.2.10');
                    assert.strictEqual(managementRouteData[0].network, 'default-inet6');
                    assert.strictEqual(managementRouteData[0].mtu, 1234);
                    assert.strictEqual(managementRouteData[0].type, 'interface');
                    assert.strictEqual(managementRouteData[1].name, 'managementRoute1');
                    assert.strictEqual(managementRouteData[1].partition, 'Common');
                    assert.strictEqual(managementRouteData[1].gateway, '192.0.2.10');
                    assert.strictEqual(managementRouteData[1].network, '192.0.2.30/32');
                    assert.strictEqual(managementRouteData[1].mtu, 1);
                });
        });

        it('should delete and recreate ManagementRoute if network updated', () => {
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const managementRouteData = dataSent[PATHS.ManagementRoute];
                    assert.deepEqual(deletedPaths, ['/tm/sys/management-route/~Common~theManagementRoute']);
                    assert.strictEqual(managementRouteData[0].name, 'theManagementRoute');
                    assert.strictEqual(managementRouteData[0].partition, 'Common');
                    assert.strictEqual(managementRouteData[0].gateway, '192.0.2.30');
                    assert.strictEqual(managementRouteData[0].network, '192.0.2.10/32');
                    assert.strictEqual(managementRouteData[0].mtu, 123);
                });
        });

        it('should reject if platform is not BIG-IP', () => {
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            doUtilGetCurrentPlatformStub.restore();
            sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('notBigIp');

            doUtilExecuteBashCommandStub.restore();
            sinon.stub(doUtilMock, 'executeBashCommandIControl').resolves('');
            return assert.isRejected(systemHandler.process(), 'Cannot update network property when running remotely');
        });

        it('should not delete the existing ManagementRoute if network not updated', () => {
            state.currentConfig.Common.ManagementRoute.theManagementRoute.network = '192.0.2.10/32';
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const managementRouteData = dataSent[PATHS.ManagementRoute];
                    assert.deepEqual(deletedPaths, []);
                    assert.strictEqual(managementRouteData[0].name, 'theManagementRoute');
                    assert.strictEqual(managementRouteData[0].partition, 'Common');
                    assert.strictEqual(managementRouteData[0].gateway, '192.0.2.30');
                    assert.strictEqual(managementRouteData[0].network, '192.0.2.10/32');
                    assert.strictEqual(managementRouteData[0].mtu, 123);
                });
        });

        it('should not do anything with an empty ManagementRoute', () => {
            declaration.Common.ManagementRoute = {
                theManagementRoute: {}
            };
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepEqual(deletedPaths, []);
                    assert.deepEqual(dataSent, null);
                });
        });

        it('should set mgmtDhcp to false when not preserving original ManagementRoutes', () => {
            declaration.Common.InternalUse.System.preserveOrigDhcpRoutes = false;
            state.currentConfig.Common.System.mgmtDhcp = 'enabled';
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const mgmtDhcp = dataSent['/tm/sys/global-settings'];
                    assert.deepStrictEqual(
                        mgmtDhcp,
                        [
                            {
                                mgmtDhcp: 'disabled'
                            }
                        ]
                    );
                });
        });

        it('should not modify mgmtDhcp when mgmtDhcp matches the desired value', () => {
            declaration.Common.InternalUse.System.preserveOrigDhcpRoutes = true;
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(
                        dataSent,
                        {
                            '/tm/sys/management-route': [
                                {
                                    description: undefined,
                                    gateway: '192.0.2.30',
                                    mtu: 123,
                                    name: 'theManagementRoute',
                                    network: '192.0.2.10/32',
                                    partition: 'Common',
                                    type: undefined
                                }
                            ]
                        }
                    );
                });
        });

        it('should not set mgmtDhcp to disabled when preserving DHCP ManagementRoutes', () => {
            declaration.Common.InternalUse.System.preserveOrigDhcpRoutes = true;
            declaration.Common.ManagementRoute = {
                managementRoute: {
                    name: 'managementRoute1',
                    gateway: '192.0.2.10',
                    network: '192.0.2.30',
                    mtu: 1
                }
            };
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const mgmtDhcp = dataSent['/tm/sys/global-settings'];
                    assert.deepStrictEqual(
                        mgmtDhcp,
                        undefined
                    );
                });
        });

        it('should set mgmtDhcp to disabled when no System is in declaration but there is a route', () => {
            delete declaration.Common.System;
            state.currentConfig.Common.System.preserveOrigDhcpRoutes = true;
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const mgmtDhcp = dataSent['/tm/sys/global-settings'];
                    assert.deepStrictEqual(
                        mgmtDhcp,
                        [
                            {
                                mgmtDhcp: 'disabled'
                            }
                        ]
                    );
                });
        });

        it('should not change mgmtDhcp when no System is in declaration and there is no route', () => {
            delete declaration.Common.System;
            delete declaration.Common.ManagementRoute;
            state.currentConfig.Common.System.mgmtDhcp = 'enabled';
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent, null);
                });
        });

        it('should not change mgmtDhcp when it is set to dhcpv4', () => {
            state.currentConfig.Common.System.mgmtDhcp = 'dhcpv4';
            state.currentConfig.Common.System.preserveOrigDhcpRoutes = false;
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const mgmtDhcp = dataSent['/tm/sys/global-settings'];
                    assert.deepStrictEqual(mgmtDhcp, undefined);
                });
        });

        it('should change mgmtDhcp to enabled when mgmtDhcp is true', () => {
            state.currentConfig.Common.System.mgmtDhcp = 'disabled';
            declaration.Common.System = {};
            declaration.Common.System.mgmtDhcp = 'enabled';
            declaration.Common.System.preserveOrigDhcpRoutes = true;
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const mgmtDhcp = dataSent['/tm/sys/global-settings'];
                    assert.deepStrictEqual(
                        mgmtDhcp,
                        [
                            {
                                mgmtDhcp: 'enabled'
                            }
                        ]
                    );
                });
        });

        it('should change mgmtDhcp to disabled when mgmtDhcp is false', () => {
            state.currentConfig.Common.System.mgmtDhcp = 'enabled';
            declaration.Common.System = {};
            declaration.Common.System.mgmtDhcp = false;
            declaration.Common.System.preserveOrigDhcpRoutes = false;
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const mgmtDhcp = dataSent['/tm/sys/global-settings'];
                    assert.deepStrictEqual(
                        mgmtDhcp,
                        [
                            {
                                mgmtDhcp: 'disabled'
                            }
                        ]
                    );
                });
        });

        it('should handle rename case where network is the same between two objects', () => {
            declaration.Common.ManagementRoute = {
                managementRoute: {},
                managementRoute1: {
                    name: 'managementRoute1',
                    gateway: '192.0.2.10',
                    network: '192.0.2.30'
                }
            };
            state.currentConfig.Common.ManagementRoute = {
                managementRoute: {
                    name: 'managementRoute',
                    gateway: '192.0.2.10',
                    network: '192.0.2.30'
                }
            };
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const managementRoute = dataSent['/tm/sys/management-route'];
                    assert.deepStrictEqual(
                        managementRoute,
                        [
                            {
                                name: 'managementRoute1',
                                description: undefined,
                                partition: 'Common',
                                gateway: '192.0.2.10',
                                network: '192.0.2.30/32',
                                mtu: undefined,
                                type: undefined
                            }
                        ]
                    );
                    assert.deepStrictEqual(deletedPaths, ['/tm/sys/management-route/~Common~managementRoute']);
                });
        });
    });

    it('should handle SnmpAgent', () => {
        const declaration = {
            Common: {
                SnmpAgent: {
                    sysContact: 'Op Center <ops@example.com>',
                    sysLocation: 'Seattle, WA',
                    allowedAddresses: [
                        '10.30.100.0/23',
                        '10.40.100.0/23',
                        '10.8.100.0/32',
                        '10.30.10.100',
                        '10.30.10.200'
                    ],
                    snmpv1: 'disabled',
                    snmpv2c: 'disabled'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepEqual(dataSent[PATHS.SnmpAgent][0].sysContact,
                    'Op Center <ops@example.com>');
                assert.deepEqual(dataSent[PATHS.SnmpAgent][0].sysLocation, 'Seattle, WA');
                assert.deepEqual(dataSent[PATHS.SnmpAgent][0].allowedAddresses,
                    [
                        '10.30.100.0/23',
                        '10.40.100.0/23',
                        '10.8.100.0/32',
                        '10.30.10.100',
                        '10.30.10.200'
                    ]);
                assert.strictEqual(dataSent[PATHS.SnmpAgent][0].snmpv1, 'disabled');
                assert.strictEqual(dataSent[PATHS.SnmpAgent][0].snmpv2c, 'disabled');
            });
    });

    it('should handle SnmpAgent defaults', () => {
        const declaration = {
            Common: {
                SnmpAgent: {
                    snmpv1: 'enable',
                    snmpv2c: 'enable'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepEqual(dataSent[PATHS.SnmpAgent][0].sysContact, undefined);
                assert.deepEqual(dataSent[PATHS.SnmpAgent][0].sysLocation, undefined);
                assert.deepEqual(dataSent[PATHS.SnmpAgent][0].allowedAddresses, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpAgent][0].snmpv1, 'enable');
                assert.strictEqual(dataSent[PATHS.SnmpAgent][0].snmpv2c, 'enable');
            });
    });

    it('should handle SnmpUser', () => {
        const declaration = {
            Common: {
                SnmpUser: {
                    myFirstSnmpUser: {
                        name: 'myFirstSnmpUser',
                        username: 'bigipUser!name!withspecials',
                        authProtocol: 'sha',
                        authPassword: 'pass1W0rd!',
                        privacyProtocol: 'aes',
                        privacyPassword: 'P@ssW0rd',
                        oidSubset: '.1',
                        access: 'rw'
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].name, 'myFirstSnmpUser');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].username, 'bigipUser!name!withspecials');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].authPassword, 'pass1W0rd!');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].authProtocol, 'sha');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].privacyPassword, 'P@ssW0rd');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].privacyProtocol, 'aes');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].oidSubset, '.1');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].securityLevel, 'auth-privacy');
            });
    });

    it('should handle SnmpUser defaults', () => {
        const declaration = {
            Common: {
                SnmpUser: {
                    myFirstSnmpUser: {
                        name: 'myFirstSnmpUser'
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].name, 'myFirstSnmpUser');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].username, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].authPassword, 'none');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].authProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].privacyPassword, 'none');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].privacyProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].securityLevel, 'no-auth-no-privacy');
            });
    });

    it('should handle SnmpUser defaults on BIG-IP versions < 14.0', () => {
        const declaration = {
            Common: {
                SnmpUser: {
                    myFirstSnmpUser: {
                        name: 'myFirstSnmpUser'
                    }
                }
            }
        };
        sinon.stub(bigIpMock, 'deviceInfo').resolves({ version: '13.1.1' });

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].name, 'myFirstSnmpUser');
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].username, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].authPassword, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].authProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].privacyPassword, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].privacyProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpUser][0].securityLevel, 'no-auth-no-privacy');
            });
    });

    it('should skip empty SnmpUser', () => {
        const declaration = {
            Common: {
                SnmpUser: {
                    myFirstSnmpUser: {}
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent, null);
            });
    });

    it('should handle SnmpCommunity', () => {
        const declaration = {
            Common: {
                SnmpCommunity: {
                    myFirstSnmpCommunity: {
                        name: 'myFirstSnmpCommunity',
                        communityName: 'special!community',
                        ipv6: 'disabled',
                        source: 'all',
                        oidSubset: '.1',
                        access: 'ro'
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].name, 'myFirstSnmpCommunity');
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].communityName, 'special!community');
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].oidSubset, '.1');
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].source, 'all');
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].ipv6, 'disabled');
            });
    });

    it('should handle SnmpCommunity defaults', () => {
        const declaration = {
            Common: {
                SnmpCommunity: {
                    myFirstSnmpCommunity: {
                        name: 'myFirstSnmpCommunity',
                        communityName: 'myFirstSnmpCommunity',
                        ipv6: 'disabled'
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].name, 'myFirstSnmpCommunity');
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].communityName, 'myFirstSnmpCommunity');
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].oidSubset, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].source, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpCommunity][0].ipv6, 'disabled');
            });
    });

    it('should skip empty SnmpCommunity', () => {
        const declaration = {
            Common: {
                SnmpCommunity: {
                    myFirstSnmpCommunity: {}
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent, null);
            });
    });

    it('should handle SnmpTrapEvents', () => {
        const declaration = {
            Common: {
                SnmpTrapEvents: {
                    agentTrap: 'enabled',
                    authTrap: 'disabled',
                    bigipTraps: 'enabled'
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpTrapEvents][0].agentTrap, 'enabled');
                assert.strictEqual(dataSent[PATHS.SnmpTrapEvents][0].authTrap, 'disabled');
                assert.strictEqual(dataSent[PATHS.SnmpTrapEvents][0].bigipTraps, 'enabled');
            });
    });

    it('should handle SnmpTrapDestination', () => {
        const declaration = {
            Common: {
                SnmpTrapDestination: {
                    myDestination: {
                        name: 'myDestination',
                        version: '3',
                        host: '10.0.10.100',
                        port: 80,
                        network: 'other',
                        authProtocol: 'sha',
                        authPassword: 'P@ssW0rd1',
                        privacyProtocol: 'aes',
                        privacyPassword: 'P@ssW0rd2',
                        engineId: '0x80001f8880c6b6067fdacfb558',
                        securityName: 'someSnmpUser'
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].name, 'myDestination');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].authPassword, 'P@ssW0rd1');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].authProtocol, 'sha');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].privacyPassword, 'P@ssW0rd2');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].privacyProtocol, 'aes');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].securityLevel, 'auth-privacy');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].engineId, '0x80001f8880c6b6067fdacfb558');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].host, '10.0.10.100');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].securityName, 'someSnmpUser');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].network, 'other');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].community, undefined);
            });
    });

    it('should handle SnmpTrapDestination with only auth', () => {
        const declaration = {
            Common: {
                SnmpTrapDestination: {
                    myDestination: {
                        name: 'myDestination',
                        version: '3',
                        authProtocol: 'sha',
                        authPassword: 'P@ssW0rd',
                        securityName: 'someSnmpUser'
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].name, 'myDestination');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].authPassword, 'P@ssW0rd');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].authProtocol, 'sha');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].securityLevel, 'auth-no-privacy');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].securityName, 'someSnmpUser');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].network, 'other');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].community, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].privacyPassword, 'none');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].privacyProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].engineId, undefined);
            });
    });

    it('should handle SnmpTrapDestination defaults', () => {
        const declaration = {
            Common: {
                SnmpTrapDestination: {
                    myDestination: {
                        name: 'myDestination',
                        community: 'public'
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].name, 'myDestination');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].community, 'public');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].securityLevel, 'no-auth-no-privacy');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].securityName, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].network, 'other');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].authPassword, 'none');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].authProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].privacyPassword, 'none');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].privacyProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].engineId, undefined);
            });
    });

    it('should handle SnmpTrapDestination defaults on BIG-IP versions < 14.0', () => {
        const declaration = {
            Common: {
                SnmpTrapDestination: {
                    myDestination: {
                        name: 'myDestination',
                        community: 'public'
                    }
                }
            }
        };
        sinon.stub(bigIpMock, 'deviceInfo').resolves({ version: '13.1.1' });

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].name, 'myDestination');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].community, 'public');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].securityLevel, 'no-auth-no-privacy');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].securityName, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].network, 'other');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].authProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].privacyProtocol, undefined);
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].engineId, undefined);
            });
    });

    it('should skip empty SnmpTrapDestination', () => {
        const declaration = {
            Common: {
                SnmpTrapDestination: {}
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent, null);
            });
    });

    it('should change management to mgmt', () => {
        const declaration = {
            Common: {
                SnmpTrapDestination: {
                    dest: {
                        name: 'dest',
                        network: 'management'
                    }
                }
            }
        };
        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].name, 'dest');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].network, 'mgmt');
            });
    });

    it('should not change mgmt', () => {
        const declaration = {
            Common: {
                SnmpTrapDestination: {
                    dest: {
                        name: 'dest',
                        network: 'mgmt'
                    }
                }
            }
        };
        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].name, 'dest');
                assert.strictEqual(dataSent[PATHS.SnmpTrapDestination][0].network, 'mgmt');
            });
    });

    it('should handle syslog', () => {
        const declaration = {
            Common: {
                SyslogRemoteServer: {
                    LocalDCSyslog: {
                        host: 'local-ip',
                        localIp: '172.28.68.42',
                        remotePort: 514,
                        name: 'LocalDCSyslog'
                    },
                    DRDCSyslog: {
                        host: 'dr-ip',
                        localIp: '172.28.68.42',
                        remotePort: 514,
                        name: 'DRDCSyslog'
                    }
                }
            }
        };

        const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
        return systemHandler.process()
            .then(() => {
                assert.deepEqual(dataSent[PATHS.Syslog][0].remoteServers[0].name, 'LocalDCSyslog');
                assert.deepEqual(dataSent[PATHS.Syslog][0].remoteServers[1].name, 'DRDCSyslog');
            });
    });

    describe('TrafficControl', () => {
        it('should handle traffic control', () => {
            const declaration = {
                Common: {
                    TrafficControl: {
                        acceptIpOptions: 'enabled',
                        acceptIpSourceRoute: 'enabled',
                        allowIpSourceRoute: 'enabled',
                        continueMatching: 'enabled',
                        maxIcmpRate: 867,
                        portFindLinear: 867,
                        portFindRandom: 867,
                        maxRejectRate: 867,
                        maxRejectRateTimeout: 200,
                        minPathMtu: 867,
                        pathMtuDiscovery: 'disabled',
                        portFindThresholdWarning: 'disabled',
                        portFindThresholdTrigger: 10,
                        portFindThresholdTimeout: 200,
                        rejectUnmatched: 'disabled'
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const trafficControlData = dataSent[PATHS.TrafficControl][0];
                    assert.deepStrictEqual(trafficControlData,
                        {
                            acceptIpOptions: 'enabled',
                            acceptIpSourceRoute: 'enabled',
                            allowIpSourceRoute: 'enabled',
                            continueMatching: 'enabled',
                            maxIcmpRate: 867,
                            maxRejectRate: 867,
                            maxRejectRateTimeout: 200,
                            minPathMtu: 867,
                            pathMtuDiscovery: 'disabled',
                            portFindLinear: 867,
                            portFindRandom: 867,
                            portFindThresholdWarning: 'disabled',
                            portFindThresholdTrigger: 10,
                            portFindThresholdTimeout: 200,
                            rejectUnmatched: 'disabled'
                        });
                });
        });
    });

    describe('HTTPD', () => {
        it('should Handle HTTPD', () => {
            const declaration = {
                Common: {
                    HTTPD: {
                        allow: [
                            '10.10.10.10'
                        ],
                        authPamIdleTimeout: 43200,
                        maxClients: 11,
                        sslCiphersuite: [
                            'ECDHE-RSA-AES128-GCM-SHA256',
                            'ECDHE-RSA-AES256-GCM-SHA384',
                            'ECDHE-RSA-AES128'
                        ],
                        sslProtocol: 'all -TLSv1'
                    }
                }
            };
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepEqual(dataSent[PATHS.HTTPD][0].allow, ['10.10.10.10']);
                    assert.deepEqual(dataSent[PATHS.HTTPD][0].authPamIdleTimeout, 43200);
                    assert.deepEqual(dataSent[PATHS.HTTPD][0].maxClients, 11);
                    assert.deepEqual(dataSent[PATHS.HTTPD][0].sslCiphersuite,
                        'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128');
                    assert.deepEqual(dataSent[PATHS.HTTPD][0].sslProtocol, 'all -TLSv1');
                });
        });

        it('should set allow value to an array', () => {
            const declaration = {
                Common: {
                    HTTPD: {
                        allow: 'all'
                    }
                }
            };
            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent[PATHS.HTTPD][0].allow, ['All']);
                });
        });
    });

    describe('SSHD', () => {
        it('should handle sshd', () => {
            const declaration = {
                Common: {
                    SSHD: {
                        allow: [
                            '192.168.*.*',
                            '192.0.2.10/32'
                        ],
                        bannerText: 'Text for banner',
                        inactivityTimeout: 12345,
                        ciphers: [
                            'aes128-ctr',
                            'aes192-ctr',
                            'aes256-ctr',
                            'aes128-cbc',
                            'aes192-cbc',
                            'aes256-cbc'
                        ],
                        MACS: [
                            'hmac-sha1',
                            'hmac-ripemd160',
                            'hmac-md5'
                        ],
                        kexAlgorithms: [
                            'ecdh-sha2-nistp256',
                            'ecdh-sha2-nistp384'
                        ],
                        loginGraceTime: 100,
                        maxAuthTries: 10,
                        maxStartups: '3',
                        protocol: 2
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const sshdData = dataSent[PATHS.SSHD][0];
                    assert.deepStrictEqual(sshdData,
                        {
                            allow: [
                                '192.168.*.*',
                                '192.0.2.10/32'
                            ],
                            banner: 'enabled',
                            bannerText: 'Text for banner',
                            inactivityTimeout: 12345,
                            include: 'Ciphers aes128-ctr,aes192-ctr,aes256-ctr,aes128-cbc,aes192-cbc,aes256-cbc\nKexAlgorithms ecdh-sha2-nistp256,ecdh-sha2-nistp384\nLoginGraceTime 100\nMACs hmac-sha1,hmac-ripemd160,hmac-md5\nMaxAuthTries 10\nMaxStartups 3\nProtocol 2\n'
                        });
                });
        });

        it('should handle allowing all source addresses', () => {
            const declaration = {
                Common: {
                    SSHD: {
                        allow: 'all',
                        bannerText: 'Text for banner',
                        inactivityTimeout: 12345
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const sshdData = dataSent[PATHS.SSHD][0];
                    assert.deepStrictEqual(sshdData,
                        {
                            allow: ['All'],
                            banner: 'enabled',
                            bannerText: 'Text for banner',
                            inactivityTimeout: 12345,
                            include: ''
                        });
                });
        });

        it('should handle disallowing all source addresses', () => {
            const declaration = {
                Common: {
                    SSHD: {
                        allow: 'none',
                        bannerText: 'Text for banner',
                        inactivityTimeout: 12345
                    }
                }
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, null, state);
            return systemHandler.process()
                .then(() => {
                    const sshdData = dataSent[PATHS.SSHD][0];
                    assert.deepStrictEqual(sshdData,
                        {
                            allow: 'none',
                            banner: 'enabled',
                            bannerText: 'Text for banner',
                            inactivityTimeout: 12345,
                            include: ''
                        });
                });
        });
    });

    describe('Disk', () => {
        let eventEmitter;
        let eventCalled;

        beforeEach(() => {
            eventCalled = false;
            eventEmitter = new EventEmitter();
            eventEmitter.on(EVENTS.REBOOT_NOW, () => {
                eventCalled = true;
            });
            sinon.stub(doUtilMock, 'waitForReboot').resolves();
            bigIpMock.save = () => Promise.resolve();
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should handle Disk', () => {
            const declaration = {
                Common: {
                    Disk: {
                        applicationData: 130985984
                    }
                }
            };
            state.id = 'stateId';
            state.currentConfig.Common.Disk = {
                applicationData: 26128384
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, eventEmitter, state);
            return systemHandler.process()
                .then(() => {
                    assert.equal(eventCalled, true);
                });
        });

        it('should reject if new size is not greater than current size', () => {
            const declaration = {
                Common: {
                    Disk: {
                        applicationData: 130985984
                    }
                }
            };
            state.id = 'stateId';
            state.currentConfig.Common.Disk = {
                applicationData: 130985984
            };

            const systemHandler = new SystemHandler(declaration, bigIpMock, eventEmitter, state);
            return assert.isRejected(systemHandler.process());
        });
    });
});
