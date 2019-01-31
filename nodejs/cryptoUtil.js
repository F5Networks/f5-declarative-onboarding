/**
 * Copyright 2018 F5 Networks, Inc.
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

const childProcess = require('child_process');
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const doUtil = require('./doUtil');
const Logger = require('./logger');

const logger = new Logger(module);

const ENCRYPT_PATH = '/tm/auth/radius-server';

/**
 * @module
 *
 * Utility functions to encrypt and decrypt values.
 *
 * While encryption can be run remotely, decryption only works when running on a BIG-IP.
 */
module.exports = {
    /**
     * Decrypts an encrypted configuration value.
     *
     * Only works wehn running locally on a BIG-IP.
     *
     * @param {String} value - The value to decrypt.
     *
     * @returns {Promise} A promise which is resolved with the decrypted value.
     */
    decryptValue(value) {
        return new Promise((resolve, reject) => {
            const secret = value.replace(/\$/g, '\\$');
            const php = [
                'coapi_login("admin");',
                '$query_result = coapi_query("master_key");',
                '$row = coapi_fetch($query_result);',
                '$master_key = $row["master_key"];',
                `$plain = f5_decrypt_string("${secret}", $master_key);`,
                'echo $plain;'
            ].join('');

            const cmd = `/usr/bin/php -r '${php}'`;

            childProcess.exec(cmd, (error, stdout) => {
                if (error !== null) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    },

    /**
     * Decrypts the encrypted configuration identified by id.
     *
     * This can only be used when running on a BIG-IP. Items are expected to have been
     * encrypted with encryptValue.
     *
     * @param {String} id - The id used when calling encryptValue
     *
     * @returns {Promise} A promise which is resolved with the decrypted value.
     */
    decryptId(id) {
        return cloudUtil.runTmshCommand(`list auth radius-server ${id}`)
            .then((response) => {
                const parsed = cloudUtil.parseTmshResponse(response);
                return this.decryptValue(parsed.secret);
            })
            .catch((err) => {
                logger.warning('Failed to decrypt data with id', id, err);
                return Promise.reject(err);
            });
    },

    /**
     * Deletes the encrypted value identified by an id.
     *
     * @param {String} id - The id to delete.
     *
     * @returns {Promise} A promise which is resolved when complete.
     */
    deleteEncryptedId(id) {
        return doUtil.getBigIp(logger)
            .then((bigIp) => {
                return bigIp.delete(`${ENCRYPT_PATH}/${id}`);
            }).catch((err) => {
                logger.warning('Failed to delete encrypted data with id', id, err);
                return Promise.reject(err);
            });
    },

    /**
     * Encrypts data on a BIG-IP.
     *
     * @param {String} value - The value to encrypt.
     * @param {String} id - Unique id with which to later retrieve this value
     */
    encryptValue(value, id) {
        return doUtil.getBigIp(logger)
            .then((bigIp) => {
                const body = {
                    name: id,
                    server: id,
                    secret: value
                };

                return bigIp.create(ENCRYPT_PATH, body);
            })
            .catch((err) => {
                logger.warning('Failed to encrypt data', err);
                return Promise.reject(err);
            });
    }
};
