import { PerfectValidator } from './src/types';

export const commonTournamentModel: PerfectValidator.ValidationModel = {
    entryFee: {
        type: 'N',
        integer: true,
        min: 0
    },
    startTime: {
        type: 'N',  
        integer: true
    },
    endTime: {
        type: 'N', 
        integer: true
    },
    numRegistrations: {
        type: 'N',
        integer: true,
        optional: true,
        default: 0
    },
    isHidden: {
        type: 'B',
        optional: true,
        default: false
    },
    description: {
        type: 'S',
        optional: true
    },
    timeLimitInSecs: {
        type: 'N',
        integer: true,
        optional: true,
        default: -1
    },
    totalPrizePot: {
        type: 'N',
        integer: true,
        optional: true,
        dependsOn: {
            field: 'tournamentType',
            condition: function(value) { 
                return value === 'MEGA_TOURNAMENT'; 
            },
            validate: function(value) { 
                return Number.isInteger(value) && value > 0; 
            },
            message: "Prize pot must be positive integer when tournament type is MEGA_TOURNAMENT"
        }
    },
    isGold: {
        type: 'B',
        optional: true,
        default: false
    },
    userLevelsSupported: {
        type: 'L',
        items: {
            type: 'N',
            integer: true
        }
    },
    stt: {
        type: 'N',
        integer: true,
        max: 120,
        optional: true,
        default: 0
    },
    tournamentId: {
        type: 'N',
        integer: true,
        optional: true
    },
    instruction: {
        type: 'S',
        optional: true,
        values: [
            'INCLUDE',
            'EXCLUDE',
            ''
        ],
        default: ''
    },
    segmentsList: {
        type: 'S',
        optional: true,
        default: ''
    },
    homePageMegaInstruction: {
        type: 'S',
        optional: true,
        values: [
            'INCLUDE',
            'EXCLUDE'
        ]
    },
    homePageMegaSegmentsList: {
        type: 'S',
        optional: true,
        dependsOn: {
            field: 'homePageMegaInstruction',
            condition: function(instruction) { 
                return instruction !== undefined && instruction !== ''; 
            },
            validate: function(value) { 
                return value !== ''; 
            },
            message: "homePageMegaSegmentsList is required when homePageMegaInstruction is provided"
        }
    },
    widgetId: {
        type: 'S',
        optional: true
    },
    widgetIdV2: {
        type: 'S',
        optional: true
    },
    stateMachineARN: {
        type: 'S',
        optional: true,
        default: null
    },
    maxParticipants: {
        type: 'N',
        integer: true
    },
    boardType: {
        type: 'S',
        optional: true,
        values: ['PLAYERS_3', 'LUDO_38']
    },
    widgetType: {
        type: 'S',
        optional: true,
        values: ['PLAY_WITH_MONEY_VIP', null, ''],
        default: null
    },
    winnerType: {
        type: 'S',
        optional: true,
        values: [
            'ONE_VS_ONE_BATTLE',
            'ONE_WINNER',
            'TWO_WINNERS',
            'THREE_WINNERS',
            'THREE_PLAYERS_ONE_WINNER'
        ]
    },
    rakebackPoints: {
        type: 'N',
        min: 1,
        max: 99999.99,
        optional: true,
        default: null
    },
    templateId: {
        type: 'N',
        integer: true,
        optional: true
    },
    supportedAppVersions: {
        type: 'L',
        optional: true,
        items: {
            type: 'M',
            fields: {
                minAppVersion: {
                    type: 'N',
                    integer: true
                },
                maxAppVersion: {
                    type: 'N',
                    integer: true,
                    dependsOn: {
                        field: 'minAppVersion',
                        condition: function(minVersion) { 
                            return minVersion !== undefined; 
                        },
                        validate: function(maxVersion, minVersion) {
                            return maxVersion >= minVersion;
                        },
                        message: "maxAppVersion must be greater than or equal to minAppVersion"
                    }
                }
            }
        }
    },
    def: {
        type: 'M',
        optional: true,
        fields: {
            discounts: {
                type: 'L',
                items: {
                    type: 'M',
                    fields: {
                        segment: {
                            type: 'S',
                            dependsOn: [{
                                field: 'instruction',
                                condition: function(value) { 
                                    return value === 'INCLUDE'; 
                                },
                                validate: function(segment, depValue, data) {
                                    if (data?.segmentsList) {
                                        const segments = data.segmentsList.split(',').map(function(s:any) { 
                                            return s.trim(); 
                                        });
                                        return segments.includes(segment);
                                    }
                                    return false;
                                },
                                message: "Segment must be in the segmentsList for INCLUDE instruction"
                            }, {
                                field: 'instruction',
                                condition: function(value) { 
                                    return value === 'EXCLUDE'; 
                                },
                                validate: function(segment, depValue, data) {
                                    if (data?.segmentsList) {
                                        const segments = data.segmentsList.split(',').map(function(s:any) { 
                                            return s.trim(); 
                                        });
                                        return !segments.includes(segment);
                                    }
                                    return true;
                                },
                                message: "Segment must not be in the segmentsList for EXCLUDE instruction"
                            }]
                        },
                        discountInPercent: {
                            type: 'N',
                            min: 1,
                            max: 99
                        },
                        maxGamePlay: {
                            type: 'N',
                            integer: true,
                            min: 1
                        }
                    }
                }
            },
            startTime: {
                type: 'S'
            },
            endTime: {
                type: 'S'
            }
        }
    },
    revenge: {
        type: 'B',
        optional: true
    },
    mahaMegaHomePageImages: {
        type: 'M',
        optional: true,
        fields: {
            en: {
                type: 'S'
            },
            hi: {
                type: 'S'
            }
        }
    },
    mahaMegaHomePageExSegments: {
        type: 'S',
        optional: true
    },
    mahaMegaShowOnHomePage: {
        type: 'B',
        optional: true
    },
    isPreProdTournament: {
        type: 'B',
        optional: true
    },
    isPwaTournament: {
        type: 'B',
        optional: true,
        default: false
    }
};

export const gameSupportedTournamentModel: PerfectValidator.ValidationModel = {
    name: {
        type: 'S'  
    },
    distribution: {
        type: 'M',
        fields: {
            '2': {
                type: 'M',
                optional: true,
                fields: {
                    '1': {
                        type: 'N',
                        min: 0
                    },
                    '2': {
                        type: 'N',
                        min: 0,
                        optional: true,
                        default: 0,
                        dependsOn: {
                            field: '1',
                            condition: function(firstValue) { 
                                return firstValue !== undefined; 
                            },
                            validate: function(secondValue, firstValue) {
                                return secondValue < firstValue;
                            },
                            message: "Second place prize must be less than first place prize"
                        }
                    }
                }
            },
            '3': {
                type: 'M',
                optional: true,
                fields: {
                    '1': {
                        type: 'N',
                        min: 0
                    },
                    '2': {
                        type: 'N',
                        min: 0,
                        dependsOn: {
                            field: '1',
                            condition: function(firstValue) { 
                                return firstValue !== undefined; 
                            },
                            validate: function(secondValue, firstValue) {
                                return secondValue < firstValue;
                            },
                            message: "Second place prize must be less than first place prize"
                        }
                    },
                    '3': {
                        type: 'N',
                        min: 0,
                        dependsOn: [{
                            field: '1',
                            condition: function(firstValue) { 
                                return firstValue !== undefined; 
                            },
                            validate: function(thirdValue, firstValue) {
                                return thirdValue < firstValue;
                            },
                            message: "Third place prize must be less than first place prize"
                        }, {
                            field: '2',
                            condition: function(secondValue) { 
                                return secondValue !== undefined; 
                            },
                            validate: function(thirdValue, secondValue) {
                                return thirdValue < secondValue;
                            },
                            message: "Third place prize must be less than second place prize"
                        }]
                    }
                }
            },
            '4': {
                type: 'M',
                optional: true,
                fields: {
                    '1': {
                        type: 'N',
                        min: 0
                    },
                    '2': {
                        type: 'N',
                        min: 0,
                        dependsOn: {
                            field: '1',
                            condition: function(firstValue) { 
                                return firstValue !== undefined; 
                            },
                            validate: function(secondValue, firstValue) {
                                return secondValue < firstValue;
                            },
                            message: "Second place prize must be less than first place prize"
                        }
                    },
                    '3': {
                        type: 'N',
                        min: 0,
                        dependsOn: [{
                            field: '1',
                            condition: function(firstValue) { 
                                return firstValue !== undefined; 
                            },
                            validate: function(thirdValue, firstValue) {
                                return thirdValue < firstValue;
                            },
                            message: "Third place prize must be less than first place prize"
                        }, {
                            field: '2',
                            condition: function(secondValue) { 
                                return secondValue !== undefined; 
                            },
                            validate: function(thirdValue, secondValue) {
                                return thirdValue < secondValue;
                            },
                            message: "Third place prize must be less than second place prize"
                        }]
                    },
                    '4': {
                        type: 'N',
                        min: 0,
                        dependsOn: [{
                            field: '1',
                            condition: function(firstValue) { 
                                return firstValue !== undefined; 
                            },
                            validate: function(fourthValue, firstValue) {
                                return fourthValue < firstValue;
                            },
                            message: "Fourth place prize must be less than first place prize"
                        }, {
                            field: '2',
                            condition: function(secondValue) { 
                                return secondValue !== undefined; 
                            },
                            validate: function(fourthValue, secondValue) {
                                return fourthValue < secondValue;
                            },
                            message: "Fourth place prize must be less than second place prize"
                        }, {
                            field: '3',
                            condition: function(thirdValue) { 
                                return thirdValue !== undefined; 
                            },
                            validate: function(fourthValue, thirdValue) {
                                return fourthValue < thirdValue;
                            },
                            message: "Fourth place prize must be less than third place prize"
                        }]
                    }
                }
            }
        }
    },
    prizePot: {
        optional: true,
        fields: {
            '2': {
                type: 'N',
                integer: true,
                min: 0,
                optional: true
            },
            '3': {
                type: 'N',
                integer: true,
                min: 0,
                optional: true
            },
            '4': {
                type: 'N',
                integer: true,
                min: 0,
                optional: true
            }
        },
        dependsOn: {
            field: 'prizePot',
            condition: function(obj) { 
                return obj !== undefined; 
            },
            validate: function(obj) { 
                return !obj || obj['2'] || obj['3'] || obj['4']; 
            },
            message: "If prizePot is provided, at least one of 2, 3, or 4 player prize pools must be defined"
        }
    },
    maxNumberOfWinners: {
        fields: {
            '2': {
                type: 'N',
                integer: true,
                min: 1,
                max: 2,
                optional: true
            },
            '3': {
                type: 'N',
                integer: true,
                min: 1,
                max: 3,
                optional: true
            },
            '4': {
                type: 'N',
                integer: true,
                min: 1,
                max: 4,
                optional: true
            }
        },
        dependsOn: {
            field: 'maxNumberOfWinners',
            condition: function(obj) { 
                return obj !== undefined; 
            },
            validate: function(obj) { 
                return obj['2'] || obj['3'] || obj['4']; 
            },
            message: "At least one of 2, 3, or 4 player winner configurations must be defined"
        }
    },
    minNumberOfPlayers: {
        type: 'N',
        integer: true,
        min: 2,
        max: 4
    },
    maxNumberOfPlayers: {
        type: 'N',
        integer: true,
        min: 2,
        max: 4,
        dependsOn: {
            field: 'minNumberOfPlayers',
            condition: function(minPlayers) { 
                return minPlayers >= 2 && minPlayers <= 4; 
            },
            validate: function(max, min) { 
                return max >= min; 
            },
            message: "Maximum number of players must be greater than or equal to minimum number of players"
        }
    }
};

export const ninjaAddTournamentModel: PerfectValidator.ValidationModel = {
    ...commonTournamentModel,
    
    ...gameSupportedTournamentModel,

    zupeeGameType: {
        type: 'S',
        values: [
            'N_1_WIN_DIFFERENT',
            'N_1_WIN_EQUAL',
            'TIME_LIMIT_5',
            'NO_DICE_EQUAL_MOVES'
        ]
    },
    tournamentType: {
        type: 'S',
        values: [
            'PLAY_FOR_FREE',
            'MEGA_TOURNAMENT',
            'PLAY_WITH_MONEY'
        ]
    },
    merchant: {
        type: 'S',
        optional: true,
        default: 'ALL'
    },
    bonusPercentageUsageOnStandaloneApp: {
        type: 'N',
        optional: true,
        default: 1
    },
    bonusPercentageUsageOnSuperApp: {
        type: 'N',
        optional: true,
        default: 1
    },
    extraInfo: {
        type: 'N',
        integer: true,
        optional: true,
        values: [
            30, 
        ],
        default: 0
    },
    enableMLMatchMaking: {
        type: 'B',
        optional: true
    }
};
