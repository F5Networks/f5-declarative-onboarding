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

const childProcess = require('child_process');
const crypto = require('crypto');
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const Logger = require('./logger');

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
     * Only works when running locally on a BIG-IP.
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
     * encrypted with encryptAndStoreValue.
     *
     * @param {String} id - The id used when calling encryptAndStoreValue
     * @param {String} [taskId] - The id of the current task
     *
     * @returns {Promise} A promise which is resolved with the decrypted value.
     */
    decryptStoredValueById(id, taskId) {
        const logger = new Logger(module, taskId);
        return cloudUtil.runTmshCommand(`list auth radius-server ${id}`)
            .then((response) => {
                const parsed = cloudUtil.parseTmshResponse(response);
                return this.decryptValue(parsed.secret);
            })
            .catch((err) => {
                if (err.message.includes('was not found')) {
                    logger.warning('There was no value to decrypt. This can happen if there is an unexpected restart.', id, err);
                } else {
                    logger.warning('Failed to decrypt data with id', id, err);
                }
                return Promise.reject(err);
            });
    },

    /**
     * Deletes the encrypted value identified by an id.
     *
     * @param {String} id - The id to delete.
     * @param {Object} bigIp - The target BIG-IP.
     * @param {String} [taskId] - The id of the current task
     *
     * @returns {Promise} A promise which is resolved when complete.
     */
    deleteEncryptedId(id, bigIp, taskId) {
        const logger = new Logger(module, taskId);
        return bigIp.delete(`${ENCRYPT_PATH}/${id}`)
            .catch((err) => {
                logger.warning('Failed to delete encrypted data with id', id, err);
                return Promise.reject(err);
            });
    },

    /**
     * Encrypts data on a BIG-IP and stores it with an ID.
     *
     * @param {String} value - The value to encrypt.
     * @param {String} id - Unique id with which to later retrieve this value.
     * @param {Object} bigIp - The target BIG-IP.
     * @param {String} [taskId] - The id of the current task
     *
     * @returns {Promise} A promise which is resolved when complete.
     */
    encryptAndStoreValue(value, id, bigIp, taskId) {
        const logger = new Logger(module, taskId);
        return encryptValueOnBigIp(value, id, bigIp)
            .catch((err) => {
                logger.warning('Failed to encrypt data', err);
                return Promise.reject(err);
            });
    },

    /**
     * Encrypts data on a BIG-IP. Value is returned, not stored.
     *
     * @param {String} value - The value to encrypt.
     * @param {Object} bigIp - The target BIG-IP.
     * @param {String} [taskId] - The id of the current task
     *
     * @returns {Promise} A promise which is resolved with the encrypted value.
     *                    The returned data is in an array. If
     *                    the plaintext value is more than 500 bytes, it will be
     *                    split into chunks and there will be more than one element
     *                    in the array.
     */
    encryptValue(value, bigIp, taskId) {
        const splitData = value.match(/[^]{1,500}/g);
        const logger = new Logger(module, taskId);
        return encryptValuesInArray(splitData, [], undefined, bigIp, logger);
    }
};

function encryptValueOnBigIp(value, id, bigIp) {
    const body = {
        name: id,
        server: id,
        secret: value
    };

    let encryptedData;

    return bigIp.create(ENCRYPT_PATH, body)
        .then((encryptInfo) => {
            encryptedData = encryptInfo.secret;
        })
        .then(() => encryptedData);
}

function encryptValuesInArray(valueArray, encryptedData, index, bigIp, logger) {
    index = index || 0;
    const id = `declarative_onboarding_delete_me_${index}_${crypto.randomBytes(6).toString('hex')}`;

    return Promise.resolve()
        .then(() => encryptValueOnBigIp(valueArray[index], id, bigIp))
        .then((secret) => {
            encryptedData.push(secret);
        })
        .then(() => {
            index += 1;
            if (index < valueArray.length) {
                return encryptValuesInArray(valueArray, encryptedData, index, bigIp, logger);
            }
            return encryptedData;
        });
}
