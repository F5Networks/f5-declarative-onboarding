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

const copyright = fs.readFileSync(`${__dirname}/copyright.txt`, 'utf8');
const year = new Date().getFullYear();
const newCopyright = copyright.replace('{}', year); // Change to the latest year

/* This script can be run in two different modes:
    * Update copyrights: node scripts/dev/write-copyright.js
        - All copyrights in js files in src/, scripts/ and test/ will be updated
    * CICD mode: node scripts/dev/write-copyright.js "cicd"
        - Process will abort pipeline if an outdated copyright is found
        - Process will exit gracefully if no outdated copyrights are found
*/

const excludeList = [
    'dist',
    'node_modules',
    'routingModule.js'
];

const dirsToCheck = [
    'src',
    'scripts',
    'test'
];

const isLatest = (cp, data, index) => {
    for (let i = 0; i < cp.length; i += 1) {
        if (cp[i] !== data[i + index]) {
            return false;
        }
    }
    return true;
};

const getCopyrightIndex = (data) => {
    let isComment = false;
    let startOfComment = 0;
    let containCopyright = false;

    const cpArr = newCopyright.split('\n');

    for (let i = 0; i < data.length; i += 1) {
        if (data[i].includes('/*')) {
            startOfComment = i;
            isComment = true;
        }

        if (isComment) {
            if (data[i].includes('Copyright')) {
                containCopyright = true;
            }
            // Check if it is latest copyright
            if (isLatest(cpArr, data, startOfComment)) {
                return -1;
            }
        }

        if (containCopyright) {
            if (data[i].includes('*/')) {
                return i;
            }
        }
    }
    return 0;
};

const getFiles = function (dir, fileList = []) {
    fs.readdirSync(dir)
        .filter(file => !excludeList.find(exclude => exclude === file))
        .forEach((file) => {
            if (fs.statSync(`${dir}/${file}`).isDirectory()) {
                fileList = getFiles(`${dir}/${file}`, fileList);
            } else {
                fileList.push(`${dir}/${file}`);
            }
        });
    return fileList;
};

const writeCopyright = (path, isCicd) => {
    const fileList = getFiles(path);
    let counter = 0;
    if (fileList) {
        for (let i = 0; i < fileList.length; i += 1) {
            const filePath = fileList[i];
            counter += 1;
            // Only js files
            if (filePath.endsWith('.js')) {
                const txt = fs.readFileSync(filePath, 'utf8').split('\n');
                const index = getCopyrightIndex(txt);
                if (isCicd) {
                    if (index >= 0) {
                        console.log(`Copyright notice has changed for at least one file ${filePath}`);
                        process.exit(1);
                    }
                    if (counter === fileList.length - 1) {
                        console.log('All files have latest copyright notice');
                        process.exit(0);
                    }
                } else if (index < 0) {
                    console.log(`${filePath} already has latest copyright notice`);
                } else if (index > 0) {
                    txt.splice(0, index + 1);
                    const final = `${newCopyright}${txt.join('\n')}`;
                    fs.writeFileSync(filePath, final);
                    console.log(`${filePath} : replaced the existing copyright notice`);
                } else if (index === 0) {
                    const final = `${newCopyright}\n${txt.join('\n')}`;
                    fs.writeFileSync(filePath, final);
                    console.log(`${filePath} : Added a new copyright notice`);
                }
            }
        }
    }
};

// any second parameter will activate cicd mode (abort upon outdated copyright)
for (let i = 0; i < dirsToCheck.length; i += 1) {
    writeCopyright(`${__dirname}/../../${dirsToCheck[i]}`, process.argv[2]);
}
