/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');

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

function derefDefinition(refString, content, subContent) {
    const ref = refString.split('#/definitions/').join('');
    const defs = content.definitions;
    const def = defs[ref];
    Object.keys(def.properties).forEach((defKey) => {
        if (safeTraverse(['properties', defKey, '$ref'], def)) {
            const addntlRef = def.properties[defKey].$ref.split('#/definitions/').join('');
            const addntlDef = defs[addntlRef];
            def.properties[defKey] = addntlDef;
        }
    });
    subContent.then = def;
}

function combineSchemas() {
    const definitions = fs.readdirSync(`${SCHEMA_DIR}/`)
        .filter(name => !(name.includes('draft')) && name.endsWith('schema.json'))
        .map(fileName => `${SCHEMA_DIR}/${fileName}`);

    definitions.forEach((definition) => {
        const content = JSON.parse(fs.readFileSync(definition, 'utf8'));
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
                // Authentication and GSLB class specific override
                if (definition.includes('auth')) {
                    derefDefinition(subContent.then.oneOf[0].$ref, content, subContent);
                } else if (definition.includes('gslb')) {
                    derefDefinition(subContent.then.$ref, content, subContent);
                }
                const tmp = {};
                const subClass = safeTraverse(['if', 'properties', 'class', 'const'], subContent);
                tmp[subClass] = subContent.then;
                tmp[subClass].description = content.description;

                base.definitions = Object.assign(base.definitions, tmp);
            });
        }
    });
    return writeSchema(outputFile, base);
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
