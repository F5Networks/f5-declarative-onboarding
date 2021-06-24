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

const assert = require('assert');

const parserUtil = require('../../../src/lib/parserUtil');

describe('parserUtil', () => {
    describe('updateIds', () => {
        it('should map newId to id', () => {
            const configItems = [
                {
                    schemaClass: 'MySchemaClass',
                    properties: [
                        { id: 'mcpdId', newId: 'replaceMe' },
                        { id: 'theOtherMcpdId', newId: 'theOtherNewId' }
                    ]
                }
            ];
            const declarationItem = {
                class: 'MySchemaClass',
                replaceMe: 'theValue',
                theOtherNewId: 'theOtherValue',
                dontTouchThis: 'theValueNotToTouch',
                dontTouchThisEither: 'theOtherValueNotToTouch'
            };

            const updated = parserUtil.updateIds(configItems, 'MySchemaClass', declarationItem);

            assert.deepStrictEqual(
                updated,
                {
                    class: 'MySchemaClass',
                    mcpdId: 'theValue',
                    theOtherMcpdId: 'theOtherValue',
                    dontTouchThis: 'theValueNotToTouch',
                    dontTouchThisEither: 'theOtherValueNotToTouch'
                }
            );
        });

        it('should handle newId of "name"', () => {
            const configItems = [
                {
                    schemaClass: 'MySchemaClass',
                    properties: [
                        { id: 'nameProperty', newId: 'name' }
                    ]
                }
            ];

            const declarationItem = {
                class: 'MySchemaClass',
                name: 'special!char'
            };

            const updated = parserUtil.updateIds(configItems, 'MySchemaClass', declarationItem, 'theNewName');
            assert.deepStrictEqual(
                updated,
                {
                    class: 'MySchemaClass',
                    name: 'theNewName',
                    nameProperty: 'special!char'
                }
            );
        });

        it('should handle dotted newIds', () => {
            const configItems = [
                {
                    schemaClass: 'MySchemaClass',
                    properties: [
                        { id: 'nested1Id', newId: 'topProp.nested1' },
                        { id: 'nested2Id', newId: 'topProp.nested2' }
                    ]
                }
            ];

            const declarationItem = {
                class: 'MySchemaClass',
                topProp: {
                    nested1: 'nested1Val',
                    nested2: 'nested2Val'
                }
            };

            const updated = parserUtil.updateIds(configItems, 'MySchemaClass', declarationItem, 'theNewName');
            assert.deepStrictEqual(
                updated,
                {
                    class: 'MySchemaClass',
                    nested1Id: 'nested1Val',
                    nested2Id: 'nested2Val'
                }
            );
        });

        it('should handle configItems that have newId in a transform', () => {
            const configItems = [
                {
                    schemaClass: 'MySchemaClass',
                    properties: [
                        {
                            id: 'myPropWithAttributes',
                            transform: [
                                { id: 'mcpdId', newId: 'replaceMe' }
                            ]
                        }
                    ]
                }
            ];

            const declarationItem = {
                class: 'MySchemaClass',
                myPropWithAttributes: {
                    replaceMe: 'myValue'
                }
            };

            const updated = parserUtil.updateIds(configItems, 'MySchemaClass', declarationItem, 'theNewName');
            assert.deepStrictEqual(
                updated,
                {
                    class: 'MySchemaClass',
                    myPropWithAttributes: {
                        mcpdId: 'myValue'
                    }
                }
            );
        });

        it('should handle configItems that have a newId on the property and newId in a transform', () => {
            const configItems = [
                {
                    schemaClass: 'MySchemaClass',
                    properties: [
                        {
                            id: 'myPropWithAttributes',
                            newId: 'myPropWithAttributesNewId',
                            transform: [
                                { id: 'mcpdId', newId: 'replaceMe' }
                            ]
                        }
                    ]
                }
            ];

            const declarationItem = {
                class: 'MySchemaClass',
                myPropWithAttributesNewId: {
                    replaceMe: 'myValue'
                }
            };

            const updated = parserUtil.updateIds(configItems, 'MySchemaClass', declarationItem, 'theNewName');
            assert.deepStrictEqual(
                updated,
                {
                    class: 'MySchemaClass',
                    myPropWithAttributes: {
                        mcpdId: 'myValue'
                    }
                }
            );
        });

        it('should handle arrays values in transforms', () => {
            const configItems = [
                {
                    path: '/tm/net/routing/bgp',
                    schemaClass: 'RoutingBGP',
                    properties: [
                        {
                            id: 'addressFamily',
                            newId: 'addressFamilies',
                            transform: [
                                { id: 'name', newId: 'internetProtocol' },
                                { id: 'redistribute', newId: 'redistributionList' }
                            ]
                        }
                    ]
                }
            ];

            const declarationItem = {
                class: 'RoutingBGP',
                addressFamilies: [
                    {
                        internetProtocol: 'ipv4',
                        redistributionList: [
                            {
                                routingProtocol: 'kernel',
                                routeMap: 'testRouteMap'
                            }
                        ]
                    }
                ]
            };

            const updated = parserUtil.updateIds(configItems, 'RoutingBGP', declarationItem);
            assert.deepStrictEqual(
                updated,
                {
                    class: 'RoutingBGP',
                    addressFamily: [
                        {
                            name: 'ipv4',
                            redistribute: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'testRouteMap'
                                }
                            ]
                        }
                    ]
                }
            );
        });

        it('should handle references', () => {
            const configItems = [
                {
                    path: '/tm/net/routing/bgp',
                    schemaClass: 'RoutingBGP',
                    properties: [
                        { id: 'peerGroupReference', dereferenceId: 'peerGroups' }
                    ],
                    references: {
                        peerGroupReference: [
                            { id: 'name' },
                            { id: 'remoteAs', newId: 'remoteAS' },
                            {
                                id: 'addressFamily',
                                newId: 'addressFamilies',
                                transform: [
                                    { id: 'name', newId: 'internetProtocol' },
                                    { id: 'routeMap' },
                                    {
                                        id: 'softReconfigurationInbound', newId: 'softReconfigurationInboundEnabled', truth: 'enabled', falsehood: 'disabled'
                                    }
                                ]
                            }
                        ],
                        neighborReference: [
                            { id: 'name', newId: 'address' },
                            { id: 'peerGroup' }
                        ]
                    }
                }
            ];

            const declarationItem = {
                class: 'RoutingBGP',
                peerGroups: [
                    {
                        name: 'Neighbor',
                        addressFamilies: [
                            {
                                internetProtocol: 'ipv4',
                                routeMap: {
                                    out: 'testRouteMap'
                                },
                                softReconfigurationInboundEnabled: true
                            }
                        ],
                        remoteAS: 65020
                    }
                ]
            };

            const updated = parserUtil.updateIds(configItems, 'RoutingBGP', declarationItem);
            assert.deepStrictEqual(
                updated,
                {
                    class: 'RoutingBGP',
                    peerGroups: [
                        {
                            name: 'Neighbor',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    routeMap: {
                                        out: 'testRouteMap'
                                    },
                                    softReconfigurationInbound: true
                                }
                            ],
                            remoteAs: 65020
                        }
                    ]
                }
            );
        });

        it('should return declartionItem if there is no matching dereferenceId', () => {
            const configItems = [
                {
                    path: '/tm/net/routing/bgp',
                    schemaClass: 'RoutingBGP',
                    properties: [
                        { id: 'peerGroupReference', dereferenceId: 'peerGroupsFoo' }
                    ],
                    references: {
                        peerGroupReference: [
                            { id: 'name' },
                            { id: 'remoteAs', newId: 'remoteAS' },
                            {
                                id: 'addressFamily',
                                newId: 'addressFamilies',
                                transform: [
                                    { id: 'name', newId: 'internetProtocol' },
                                    { id: 'routeMap' },
                                    {
                                        id: 'softReconfigurationInbound', newId: 'softReconfigurationInboundEnabled', truth: 'enabled', falsehood: 'disabled'
                                    }
                                ]
                            }
                        ]
                    }
                }
            ];

            const declarationItem = {
                class: 'RoutingBGP',
                peerGroups: [
                    {
                        name: 'Neighbor',
                        addressFamilies: [
                            {
                                internetProtocol: 'ipv4',
                                routeMap: {
                                    out: 'testRouteMap'
                                },
                                softReconfigurationInboundEnabled: true
                            }
                        ],
                        remoteAS: 65020
                    }
                ]
            };

            const updated = parserUtil.updateIds(configItems, 'RoutingBGP', declarationItem);
            assert.deepStrictEqual(
                updated,
                {
                    class: 'RoutingBGP',
                    peerGroups: [
                        {
                            name: 'Neighbor',
                            addressFamilies: [
                                {
                                    internetProtocol: 'ipv4',
                                    routeMap: {
                                        out: 'testRouteMap'
                                    },
                                    softReconfigurationInboundEnabled: true
                                }
                            ],
                            remoteAS: 65020
                        }
                    ]
                }
            );
        });

        it('should handle references with upLevel property', () => {
            const configItems = [
                {
                    path: '/tm/gtm/server',
                    schemaClass: 'GSLBServer',
                    requiredModule: 'gtm',
                    enforceArray: true,
                    properties: [
                        { id: 'devicesReference', dereferenceId: 'devices' }
                    ],
                    references: {
                        devicesReference: [
                            {
                                id: 'addresses',
                                transform: [
                                    { id: 'name', newId: 'address' },
                                    { id: 'translation', newId: 'addressTranslation' }
                                ],
                                upLevel: 1
                            },
                            { id: 'description', newId: 'remark' }
                        ]
                    }
                }
            ];

            const declarationItem = {
                class: 'GSLBServer',
                devices: [
                    {
                        address: '10.10.10.10',
                        addressTranslation: '192.0.2.12',
                        remark: 'GSLB server device description'
                    }
                ]
            };

            const updated = parserUtil.updateIds(configItems, 'GSLBServer', declarationItem);
            assert.deepStrictEqual(
                updated,
                {
                    class: 'GSLBServer',
                    devices: [
                        {
                            name: '10.10.10.10',
                            translation: '192.0.2.12',
                            description: 'GSLB server device description'
                        }
                    ]
                }
            );
        });

        it('should handle nested properties with the same property name as higher level properties', () => {
            const configItems = [
                {
                    path: '/tm/net/routing/bgp',
                    schemaClass: 'RoutingBGP',
                    properties: [
                        {
                            id: 'addressFamily',
                            newId: 'addressFamilies',
                            transform: [
                                { id: 'name', newId: 'internetProtocol' },
                                { id: 'redistribute', newId: 'redistributionList' }
                            ]
                        },
                        { id: 'peerGroupReference', dereferenceId: 'peerGroups' }
                    ],
                    references: {
                        peerGroupReference: [
                            { id: 'name' },
                            { id: 'remoteAs', newId: 'remoteAS' },
                            {
                                id: 'addressFamily',
                                newId: 'addressFamilies',
                                transform: [
                                    { id: 'name', newId: 'internetProtocol' },
                                    { id: 'routeMap' },
                                    {
                                        id: 'softReconfigurationInbound', newId: 'softReconfigurationInboundEnabled', truth: 'enabled', falsehood: 'disabled'
                                    }
                                ]
                            }
                        ],
                        neighborReference: [
                            { id: 'name', newId: 'address' },
                            { id: 'peerGroup' }
                        ]
                    }
                }
            ];

            const declarationItem = {
                class: 'RoutingBGP',
                addressFamilies: [
                    {
                        internetProtocol: 'ipv4',
                        redistributionList: [
                            {
                                routingProtocol: 'kernel',
                                routeMap: 'testRouteMap'
                            }
                        ]
                    }
                ],
                peerGroups: [
                    {
                        name: 'Neighbor',
                        addressFamilies: [
                            {
                                internetProtocol: 'ipv4',
                                routeMap: {
                                    out: 'testRouteMap'
                                },
                                softReconfigurationInboundEnabled: true
                            }
                        ],
                        remoteAS: 65020
                    }
                ]
            };

            const updated = parserUtil.updateIds(configItems, 'RoutingBGP', declarationItem);
            assert.deepStrictEqual(
                updated,
                {
                    class: 'RoutingBGP',
                    addressFamily: [
                        {
                            name: 'ipv4',
                            redistribute: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'testRouteMap'
                                }
                            ]
                        }
                    ],
                    peerGroups: [
                        {
                            name: 'Neighbor',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    routeMap: {
                                        out: 'testRouteMap'
                                    },
                                    softReconfigurationInbound: true
                                }
                            ],
                            remoteAs: 65020
                        }
                    ]
                }
            );
        });

        it('should handle schema classes with more than one entry in configItems', () => {
            const configItems = [
                {
                    schemaClass: 'MySchemaClass',
                    properties: [
                        { id: 'myFirstId', newId: 'myNewFirstId' },
                        { id: 'mySecondId', newId: 'myNewSecondId' }
                    ]
                },
                {
                    schemaClass: 'MySchemaClass',
                    properties: [
                        { id: 'myThirdId', newId: 'myNewThirdId' },
                        { id: 'myFourthId', newId: 'myNewFourthId' }
                    ]
                }
            ];

            const declarationItem = {
                class: 'MySchemaClass',
                myNewFirstId: 'myFirstVal',
                myNewSecondId: 'mySecondVal',
                myNewThirdId: 'myThirdVal',
                myNewFourthId: 'myFourthVal'
            };

            const updated = parserUtil.updateIds(configItems, 'MySchemaClass', declarationItem);
            assert.deepStrictEqual(
                updated,
                {
                    class: 'MySchemaClass',
                    myFirstId: 'myFirstVal',
                    mySecondId: 'mySecondVal',
                    myThirdId: 'myThirdVal',
                    myFourthId: 'myFourthVal'
                }
            );
        });

        it('should handle schema classes with schemaMerge', () => {
            const configItems = [
                {
                    schemaClass: 'MySchemaClass',
                    properties: [
                        { id: 'mcpdId', newId: 'myNewId' }
                    ],
                    schemaMerge: {
                        path: ['myPath']
                    }
                }
            ];

            const declarationItem = {
                class: 'MySchemaClass',
                myPath: {
                    myNewId: 'myValue'
                }
            };

            const updated = parserUtil.updateIds(configItems, 'MySchemaClass', declarationItem);
            assert.deepStrictEqual(
                updated,
                {
                    class: 'MySchemaClass',
                    myPath: {
                        mcpdId: 'myValue'
                    }
                }
            );
        });
    });
});
