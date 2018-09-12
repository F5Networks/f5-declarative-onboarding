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

const fs = require('fs');
const Ajv = require('ajv');

const baseSchemaFile = `${__dirname}/../schema/base.schema.json`;
const systemSchemaFile = `${__dirname}/../schema/system.schema.json`;
const networkSchemaFile = `${__dirname}/../schema/network.schema.json`;

class Validator {
    constructor() {
        const ajv = new Ajv({ allErrors: true });
        const baseSchema = JSON.parse(fs.readFileSync(baseSchemaFile).toString());
        const systemSchema = JSON.parse(fs.readFileSync(systemSchemaFile).toString());
        const networkSchema = JSON.parse(fs.readFileSync(networkSchemaFile).toString());

        this.validate = ajv
            .addSchema(systemSchema)
            .addSchema(networkSchema)
            .compile(baseSchema);
    }

    isValid(data) {
        const valid = this.validate(data);
        return {
            valid,
            errors: this.validate.errors
        };
    }
}

module.exports = Validator;
