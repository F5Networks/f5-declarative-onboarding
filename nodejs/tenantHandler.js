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

const Logger = require('./logger');

const logger = new Logger(module);

const PARTITION_PATH = '/tm/auth/partition';

class TenantHandler {
    constructor(declarationInfo, bigIp) {
        this.tenants = declarationInfo.tenants || [];
        this.bigIp = bigIp;
    }

    process() {
        logger.info('Processing tenants');

        return this.bigIp.list(PARTITION_PATH)
            .then((partitions) => {
                function getNonExistingPartitions(tenants) {
                    const partitionNames = partitions.map((partition) => {
                        return partition.name;
                    });
                    return tenants.filter((tenant) => {
                        return partitionNames.indexOf(tenant) === -1;
                    });
                }

                const promises = [];
                const partitionsToCreate = getNonExistingPartitions(this.tenants);
                partitionsToCreate.forEach((partition) => {
                    promises.push(this.bigIp.create(
                        PARTITION_PATH,
                        {
                            name: partition
                        }
                    ));
                });

                return Promise.all(promises);
            })
            .then(() => {
                logger.fine('Done creating tenants');
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error creating tenants: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

module.exports = TenantHandler;
