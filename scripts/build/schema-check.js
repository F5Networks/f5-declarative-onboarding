/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');

const schemaPath = `${__dirname}/../../dist/do.schema.json`;

const errors = [];
const warnings = [];

function checkDefinitions(schema) {
    Object.keys(schema.definitions).forEach((definitionKey) => {
        const definition = schema.definitions[definitionKey];
        checkSchema(definition, definitionKey);
    });
}

function checkProperties(schema, prefix) {
    Object.keys(schema.properties || {})
        .filter(key => key !== 'class')
        .forEach((propertyKey) => {
            const propSchema = schema.properties[propertyKey];
            checkSchema(propSchema, `${prefix}.${propertyKey}`, true);
        });
}

function checkXOf(schema, prefix) {
    ['oneOf', 'anyOf', 'allOf'].forEach((keyword) => {
        (schema[keyword] || []).forEach((nestedSchema, i) => {
            nestedSchema.description = nestedSchema.description || schema.description;
            checkSchema(nestedSchema, `${prefix}.${keyword}[${i}]`);
        });
    });
}

function checkItems(schema, prefix) {
    if (schema.items) {
        checkSchema(schema.items, prefix);
    }
}

function collapseAllOf(schema) {
    (schema.allOf || []).forEach(subSchema => Object.assign(schema, subSchema));
    delete schema.allOf;
}

function isClass(schema) {
    return schema.properties && schema.properties.class;
}
function checkSchema(schema, prefix, isProperty) {
    const pref = prefix || '';
    if (schema.$comment && schema.$comment.includes('TODO')) {
        warnings.push(`${pref} ${schema.$comment}`);
    }
    if (schema.$TODO) {
        warnings.push(`${pref} TODO: ${schema.$TODO}`);
    }

    const hasAllOf = typeof schema.allOf !== 'undefined';
    collapseAllOf(schema);

    if (schema.$ref) {
        if (!hasAllOf) {
            const keywords = Object.keys(schema)
                .filter(key => ['$ref', 'description', 'title', '$comment'].indexOf(key) < 0);
            if (keywords.length) {
                warnings.push(`${pref} mixes keywords with $ref: ${JSON.stringify(keywords)}`);
            }
        }
        return;
    }

    if (schema.type === 'array' && schema.items
        && (schema.items.type === 'object' || schema.items.$ref)
        && schema.uniqueItems
    ) {
        errors.push(`${pref} is an array of objects with uniqueItems set to true, this causes AJV to lock up`);
    }

    if ((isClass(schema) || isProperty) && !schema.description) {
        errors.push(`${pref} is missing a description`);
    }

    if (schema.type === 'array' && !schema.items) {
        errors.push(`${pref} is an array, but has no items keyword`);
    }

    checkProperties(schema, pref);
    checkXOf(schema, pref);
    checkItems(schema, pref);
}

function runChecks(fileName, callback) {
    console.log(`Checking ${fileName}`);
    checkDefinitions(JSON.parse(fs.readFileSync(fileName)));
    if (errors.length) {
        console.log(`Found ${errors.length} errors:`);
        errors.forEach(error => console.log(error));
    }
    if (warnings.length) {
        console.log(`Found ${warnings.length} warnings:`);
        warnings.forEach(error => console.log(error));
    }

    const error = (errors.length) ? new Error('Schema checking failed') : null;
    callback(error);
}

module.exports = {
    runChecks
};

if (require.main === module) {
    const fileName = process.argv[2] || schemaPath;
    runChecks(fileName, (error) => {
        if (error) {
            process.exit(1);
        }
    });
}
