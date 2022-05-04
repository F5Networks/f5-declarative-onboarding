/**
 * Copyright 2022 F5 Networks, Inc.
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

const Ajv = require('ajv');

const doSchema = require('../schema/latest/do.schema.json');
const remoteSchema = require('../schema/latest/remote.schema.json');
const baseSchema = require('../schema/latest/base.schema.json');
const systemSchema = require('../schema/latest/system.schema.json');
const networkSchema = require('../schema/latest/network.schema.json');
const dscSchema = require('../schema/latest/dsc.schema.json');
const analyticsSchema = require('../schema/latest/analytics.schema.json');
const authSchema = require('../schema/latest/auth.schema.json');
const definitionsSchema = require('../schema/latest/definitions.schema.json');
const gslbSchema = require('../schema/latest/gslb.schema.json');

const customFormats = require('../schema/latest/formats');

class AjvValidator {
    constructor() {
        const ajv = new Ajv(
            {
                allErrors: false,
                useDefaults: true,
                coerceTypes: true,
                extendRefs: 'fail'
            }
        );

        Object.keys(customFormats).forEach((customFormat) => {
            ajv.addFormat(customFormat, customFormats[customFormat]);
        });

        this.validator = ajv
            .addSchema(definitionsSchema)
            .addSchema(systemSchema)
            .addSchema(networkSchema)
            .addSchema(dscSchema)
            .addSchema(analyticsSchema)
            .addSchema(authSchema)
            .addSchema(gslbSchema)
            .addSchema(baseSchema)
            .addSchema(remoteSchema)
            .compile(doSchema);
    }

    validate(data) {
        const isValid = this.validator(data);
        return Promise.resolve({
            isValid,
            errors: this.validator.errors
        });
    }
}

module.exports = AjvValidator;
