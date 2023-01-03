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

const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const refParser = require('json-schema-ref-parser');

const base = require('../../src/schema/latest/base.schema.json');

const SCHEMA_DIR = `${__dirname}/../../src/schema/latest`;
const outputFile = '../../../docs/do.schema.json';

const safeTraverse = (p, o) => p.reduce((xs, x) => (xs && xs[x] ? xs[x] : null), o);

function writeSchema(name, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(`${SCHEMA_DIR}/${name}`, JSON.stringify(data, null, 2), (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

function derefPromise(schemaPath) {
    return new Promise((resolve, reject) => {
        refParser.dereference(schemaPath, (error, schema) => {
            if (error) reject(error);
            else resolve(schema);
        });
    });
}

function combineSchemas() {
    const definitions = fs.readdirSync(`${SCHEMA_DIR}/`)
        .filter((name) => !(name.includes('draft')) && name.endsWith('schema.json'))
        .map((fileName) => `${SCHEMA_DIR}/${fileName}`);

    return Promise.all(definitions.map((definition) => derefPromise(definition)))
        .then((schemas) => {
            schemas.forEach((content) => {
                if (!base.definitions) base.definitions = {};

                const classType = safeTraverse(['if', 'properties', 'class', 'const'], content);
                if (classType) {
                    const tmp = {};
                    tmp[classType] = content.then;
                    tmp[classType].description = content.description;

                    if (content.definitions) {
                        tmp[classType].properties = Object.assign(tmp[classType].properties || {}, content.definitions);
                    }

                    base.definitions = Object.assign(base.definitions, tmp);
                } else if (content.allOf) {
                    content.allOf.forEach((subContent) => {
                        const tmp = {};
                        const subClass = safeTraverse(['if', 'properties', 'class', 'const'], subContent);
                        tmp[subClass] = subContent.then;
                        tmp[subClass].description = content.description;

                        base.definitions = Object.assign(base.definitions, tmp);
                    });
                }
            });
        })
        .then(() => writeSchema(outputFile, base));
}

module.exports = {
    combineSchemas
};

if (require.main === module) {
    combineSchemas().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
