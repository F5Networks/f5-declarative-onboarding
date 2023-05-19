/**
 * Copyright 2023 F5 Networks, Inc.
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

const keywords = [
    {
        name: 'f5fetch',
        definition: (that) => ({
            type: 'object',
            errors: true,
            modifying: true,
            metaSchema: {
                type: 'string',
                enum: ['pki-cert', 'pki-key']
            },
            validate(schema, data, parentSchema, dataPath, parentData, pptyName, rootData) {
                that.fetches.push({
                    schema,
                    data,
                    dataPath,
                    parentData,
                    pptyName,
                    rootData
                });
                return true;
            }
        })

    }
];

module.exports = {
    keywords
};
