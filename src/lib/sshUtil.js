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

const spawn = require('child_process').spawn;

/**
 * Utility for sending ssh commands.
 *
 * @class
 */
class SshUtil {
    /**
     * Constructor
     *
     * @param {String}  user - User name to ssh as.
     * @param {String}  remoteHost - IP address of remote host.
     * @param {Object}  [options] - Optional parameters.
     * @param {String}  [options.sshKeyPath] - Absolute path of private ssh key to use.
     * @param {Boolean} [options.ignoreHostKeyVerification] - Whether or not to ignore host
     *                                                        key verification (default false).
     */
    constructor(user, remoteHost, options) {
        this.user = user;
        this.remoteHost = remoteHost;

        if (options && options.sshKeyPath) {
            this.sshKeyPath = options.sshKeyPath;
        }

        if (options && options.ignoreHostKeyVerification) {
            this.ignoreHostKeyVerification = true;
        }
    }

    executeCommand(command) {
        return new Promise((resolve, reject) => {
            const args = [];
            let response = '';
            args.push('-l');
            args.push(this.user);
            args.push('-T'); // prevent allocation of pseudo-TTY - it fails and we don't need it
            args.push('-q'); // prevent warning messages messages

            if (this.sshKeyPath) {
                args.push('-i');
                args.push(this.sshKeyPath);
            }

            if (this.ignoreHostKeyVerification) {
                args.push('-o');
                args.push('UserKnownHostsFile=/dev/null');
                args.push('-o');
                args.push('StrictHostKeyChecking=no');
            }

            args.push(this.remoteHost);
            const ssh = spawn('/usr/bin/ssh', args);

            ssh.stdout.on('data', (data) => {
                response += data;
            });

            ssh.stderr.on('data', (data) => {
                reject(new Error(`ssh got error on stderr: ${data}`));
            });

            ssh.on('error', (err) => {
                reject(new Error(`ssh received error: ${err.message}`));
            });

            ssh.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`ssh failed with code ${code}`));
                }

                resolve(response);
            });

            ssh.stdin.write(command);
            ssh.stdin.end();
        });
    }
}

module.exports = SshUtil;
