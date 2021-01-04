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

const fs = require('fs');
const packageVersion = require('../../package.json').version;

const examplesDir = 'examples';
const outputFile = `dist/do.examples-${packageVersion}.collection.json`;

const makeDirP = path => {
    try {
        fs.mkdirSync(path);
    }
    catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
};

const readdir = path => fs.readdirSync(path)
    .map(example => ({
        json: JSON.parse(fs.readFileSync(`${path}/${example}`)),
        name: example.split('.')[0]
    }));


const buildCollection = () => {
    const examples = readdir(examplesDir);

    const collection = {
        auth: {
            basic: [{
                key: 'password',
                type: 'string',
                value: '{{password}}'
            }, {
                key: 'username',
                type: 'string',
                value: '{{username}}'
            }],
            type: 'basic'
        },
        info: {
            _postman_id: '1',
            name: 'DOExampleDeclarations',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
    };

    makeDirP(`${__dirname}/../../dist`);

    examples.forEach((example) => {
        collection.item.push({
            name: example.name,
            request: {
                body: {
                    mode: 'raw',
                    raw: JSON.stringify(example.json, null, 4)
                },
                description: example.json.declaration ? example.json.declaration.label : example.json.label,
                header: [{
                    key: 'Content-Type',
                    name: 'Content-Type',
                    type: 'text',
                    value: 'application/json'
                }],

                method: 'POST',
                url: {
                    host: ['{{host}}'],
                    path: ['mgmt', 'shared', 'declarative-onboarding'],
                    protocol: 'https',
                    raw: 'https://{{host}}/mgmt/shared/declarative-onboarding'
                }
            },
            response: []
        });
    });

    fs.writeFileSync(outputFile, JSON.stringify(collection, null, 4));
};

buildCollection();
