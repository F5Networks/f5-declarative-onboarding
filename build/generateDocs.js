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

const baseSchema = require('../schema/base.schema.json');
const systemSchema = require('../schema/system.schema.json');
const networkSchema = require('../schema/network.schema.json');
const example = require('../examples/basic.json');

const INDEX = ('public/index.html');
const APPEND = { flag: 'a' };
const H1 = '<H1>';
const H1_CLOSE = '</H1>';
const PRE = '<pre>';
const PRE_CLOSE = '</pre>';

const HEADER = `
<html>
<body>
`;

const FOOTER = `
</body>
</html>
`

fs.writeFileSync(INDEX, HEADER);
append(PRE);
append(H1);
append('base schema');
append(H1_CLOSE);
append(JSON.stringify(baseSchema, null, 4));
append(PRE_CLOSE);

append(PRE);
append(H1);
append('system schema');
append(H1_CLOSE);
append(JSON.stringify(systemSchema, null, 4));
append(PRE_CLOSE);

append(PRE);
append(H1);
append('example');
append(H1_CLOSE);
append(JSON.stringify(example, null, 4));
append(PRE_CLOSE);

append(FOOTER);

function append(data) {
    fs.writeFileSync(INDEX, data, APPEND);
}