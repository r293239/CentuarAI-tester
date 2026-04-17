// chess-ai-database.js
// Enhanced chess AI with extended professional opening book (3 moves deep)
// VERSION: 2.0 - Enhanced compatibility with 3-move deep search AI

class ChessAILearner {
    constructor() {
        this.version = "2.0";
        this.performanceHistory = [];
        this.openingBook = this.initializeOpeningBook();
        this.positionEvaluations = new Map();
        this.difficulty = 8; // Maximum difficulty for master level
        this.endgameDatabase = this.initializeEndgameDatabase();
        this.openingStatistics = {
            white: {},
            black: {},
            totalGames: 0
        };
        
        console.log(`🧠 Chess AI v${this.version} loaded`);
    }

    initializeOpeningBook() {
        return {
            // ========== WHITE'S FIRST MOVES ==========
            'e2e4': {
                name: "King's Pawn Opening",
                // Against e5 (Open Games)
                'e7e5': {
                    name: "Open Game",
                    moves: ['g1f3', 'f1c4', 'f1b5', 'd2d4', 'b1c3', 'f2f4'],
                    weights: [40, 20, 15, 10, 8, 7],
                    'after_g1f3': {
                        name: "King's Knight Opening",
                        'b8c6': {
                            name: "Two Knights Defense",
                            moves: ['f1c4', 'f1b5', 'd2d4', 'b1c3'],
                            weights: [45, 30, 15, 10],
                            'after_f1c4': {
                                name: "Italian Game",
                                'g8f6': {
                                    name: "Two Knights Defense Main",
                                    moves: ['f3g5', 'd2d4', 'e4e5', 'b1c3'],
                                    weights: [40, 30, 20, 10],
                                    'after_f3g5': {
                                        name: "Knight Attack",
                                        'd7d5': {
                                            name: "Two Knights Main Line",
                                            moves: ['e4d5', 'c4b5', 'd1f3'],
                                            weights: [50, 35, 15]
                                        },
                                        'f8c5': {
                                            name: "Traxler Counterattack",
                                            moves: ['c4f7', 'g5f7', 'e4e5'],
                                            weights: [45, 35, 20]
                                        },
                                        'h7h6': {
                                            name: "Anti-Fried Liver",
                                            moves: ['g5f3', 'd2d4', 'b1c3'],
                                            weights: [50, 35, 15]
                                        }
                                    },
                                    'after_d2d4': {
                                        name: "Italian Four Knights",
                                        'e5d4': {
                                            name: "Max Lange Attack",
                                            moves: ['e4e5', 'f1b5', 'b1c3'],
                                            weights: [45, 35, 20]
                                        },
                                        'f6e4': {
                                            name: "Center Attack",
                                            moves: ['d4e5', 'c4d5', 'f1b5'],
                                            weights: [40, 35, 25]
                                        }
                                    }
                                },
                                'f8c5': {
                                    name: "Giuoco Piano",
                                    moves: ['c2c3', 'd2d3', 'b2b4', 'b1c3'],
                                    weights: [45, 30, 15, 10],
                                    'after_c2c3': {
                                        name: "Giuoco Piano Main",
                                        'g8f6': {
                                            name: "Greco Attack",
                                            moves: ['d2d4', 'e4e5', 'b2b4'],
                                            weights: [50, 30, 20],
                                            'after_d2d4': {
                                                'e5d4': {
                                                    name: "Greco Gambit",
                                                    moves: ['c3d4', 'e4e5', 'b1c3'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        },
                                        'd7d6': {
                                            name: "Closed Giuoco Piano",
                                            moves: ['d2d3', 'b1d2', 'h2h3'],
                                            weights: [50, 30, 20]
                                        },
                                        'c5b6': {
                                            name: "Bird's Attack",
                                            moves: ['d2d4', 'a2a4', 'b2b4'],
                                            weights: [45, 35, 20]
                                        }
                                    },
                                    'after_d2d3': {
                                        name: "Quiet Italian",
                                        'g8f6': {
                                            name: "Canal Variation",
                                            moves: ['b1c3', 'c1g5', 'h2h3'],
                                            weights: [50, 35, 15]
                                        },
                                        'd7d6': {
                                            name: "Closed Italian",
                                            moves: ['b1c3', 'c1e3', 'h2h3'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                },
                                'f8e7': {
                                    name: "Hungarian Defense",
                                    moves: ['d2d4', 'b1c3', 'c2c3'],
                                    weights: [45, 35, 20]
                                },
                                'd7d6': {
                                    name: "Semi-Italian",
                                    moves: ['d2d4', 'c2c3', 'b1c3'],
                                    weights: [45, 35, 20]
                                }
                            },
                            'after_f1b5': {
                                name: "Ruy Lopez",
                                'a7a6': {
                                    name: "Morphy Defense",
                                    moves: ['b5a4', 'b5c6', 'b5f1'],
                                    weights: [55, 25, 20],
                                    'after_b5a4': {
                                        name: "Ruy Lopez Main",
                                        'g8f6': {
                                            name: "Open Ruy Lopez",
                                            moves: ['e4e5', 'd2d4', 'b1c3', 'e1g1'],
                                            weights: [40, 30, 20, 10],
                                            'after_e4e5': {
                                                name: "Open Variation",
                                                'f6e4': {
                                                    name: "Open Ruy Lopez Main",
                                                    moves: ['d2d4', 'f1e1', 'b1d2'],
                                                    weights: [45, 35, 20]
                                                },
                                                'f6g4': {
                                                    name: "Knight Retreat",
                                                    moves: ['d2d4', 'h2h3', 'b1c3'],
                                                    weights: [50, 30, 20]
                                                }
                                            }
                                        },
                                        'b8c6': {
                                            name: "Closed Ruy Lopez",
                                            moves: ['g1f3', 'b1c3', 'd2d4', 'c2c3'],
                                            weights: [45, 30, 15, 10],
                                            'after_g1f3': {
                                                name: "Closed Main",
                                                'f8e7': {
                                                    name: "Closed Spanish",
                                                    moves: ['e1g1', 'f1e1', 'c2c3'],
                                                    weights: [50, 30, 20]
                                                },
                                                'f8c5': {
                                                    name: "Classical Defense",
                                                    moves: ['c2c3', 'e1g1', 'd2d4'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        },
                                        'f7f5': {
                                            name: "Schliemann Defense",
                                            moves: ['e4f5', 'd2d4', 'b1c3'],
                                            weights: [45, 35, 20]
                                        },
                                        'd7d6': {
                                            name: "Steinitz Defense Deferred",
                                            moves: ['c2c3', 'd2d4', 'b1d2'],
                                            weights: [50, 30, 20]
                                        }
                                    },
                                    'after_b5c6': {
                                        name: "Exchange Ruy Lopez",
                                        'd7c6': {
                                            name: "Exchange Variation",
                                            moves: ['d2d4', 'b1c3', 'f2f4'],
                                            weights: [50, 30, 20],
                                            'after_d2d4': {
                                                name: "Exchange Main",
                                                'e5d4': {
                                                    name: "Exchange Accepted",
                                                    moves: ['d1d4', 'b1c3', 'c1g5'],
                                                    weights: [50, 35, 15]
                                                },
                                                'f8d6': {
                                                    name: "Alapin Variation",
                                                    moves: ['d4e5', 'd6e5', 'd1d8'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        }
                                    }
                                },
                                'b8c6': {
                                    name: "Berlin Defense",
                                    moves: ['b1c3', 'e1g1', 'd2d4'],
                                    weights: [40, 35, 25],
                                    'after_b1c3': {
                                        name: "Four Knights Spanish",
                                        'g8f6': {
                                            name: "Four Knights",
                                            moves: ['e1g1', 'd2d4', 'b5c6'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                },
                                'g8f6': {
                                    name: "Berlin Defense Main",
                                    moves: ['e1g1', 'd2d4', 'b1c3'],
                                    weights: [45, 30, 25],
                                    'after_e1g1': {
                                        name: "Berlin Wall",
                                        'f6e4': {
                                            name: "Berlin Endgame",
                                            moves: ['d2d4', 'f1e1', 'b5c6'],
                                            weights: [50, 35, 15]
                                        },
                                        'f8e7': {
                                            name: "Rio de Janeiro Variation",
                                            moves: ['f1e1', 'b5c6', 'd2d4'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                },
                                'f8c5': {
                                    name: "Classical Defense",
                                    moves: ['c2c3', 'e1g1', 'd2d4'],
                                    weights: [45, 35, 20]
                                },
                                'd7d6': {
                                    name: "Steinitz Defense",
                                    moves: ['d2d4', 'c2c3', 'b1c3'],
                                    weights: [50, 30, 20]
                                },
                                'f7f5': {
                                    name: "Schliemann Gambit",
                                    moves: ['b1c3', 'e4f5', 'd2d4'],
                                    weights: [40, 35, 25]
                                }
                            },
                            'after_d2d4': {
                                name: "Scotch Game",
                                'e5d4': {
                                    name: "Scotch Main",
                                    moves: ['f3d4', 'f1c4', 'c1f4'],
                                    weights: [50, 30, 20],
                                    'after_f3d4': {
                                        name: "Scotch Four Knights",
                                        'b8c6': {
                                            name: "Scotch Four Knights",
                                            moves: ['d4c6', 'f1c4', 'c1f4'],
                                            weights: [45, 35, 20]
                                        },
                                        'f8c5': {
                                            name: "Classical Scotch",
                                            moves: ['c1e3', 'd4b5', 'f2f4'],
                                            weights: [45, 35, 20]
                                        },
                                        'g8f6': {
                                            name: "Modern Scotch",
                                            moves: ['d4c6', 'e4e5', 'f1d3'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                },
                                'b8c6': {
                                    name: "Scotch Gambit",
                                    moves: ['d4d5', 'f1c4', 'c2c3'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'g8f6': {
                            name: "Petroff Defense",
                            moves: ['f3e5', 'd2d4', 'b1c3', 'f1c4'],
                            weights: [45, 30, 15, 10],
                            'after_f3e5': {
                                name: "Petroff Main",
                                'd7d6': {
                                    name: "Classical Petroff",
                                    moves: ['e5f3', 'e5c4', 'e5d3'],
                                    weights: [50, 30, 20],
                                    'after_e5f3': {
                                        name: "Main Line",
                                        'f6e4': {
                                            name: "Petroff Accepted",
                                            moves: ['d2d4', 'f1d3', 'e1g1'],
                                            weights: [50, 35, 15]
                                        }
                                    }
                                },
                                'f6e4': {
                                    name: "Damiano Variation",
                                    moves: ['d1e2', 'f2f3', 'b1c3'],
                                    weights: [45, 35, 20]
                                }
                            },
                            'after_d2d4': {
                                name: "Modern Petroff",
                                'e5d4': {
                                    name: "Steinitz Variation",
                                    moves: ['e4e5', 'f1c4', 'e1g1'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'd7d6': {
                            name: "Philidor Defense",
                            moves: ['d2d4', 'b1c3', 'f1c4', 'c2c3'],
                            weights: [45, 30, 15, 10],
                            'after_d2d4': {
                                name: "Philidor Main",
                                'e5d4': {
                                    name: "Exchange Philidor",
                                    moves: ['f3d4', 'f1c4', 'b1c3'],
                                    weights: [50, 30, 20]
                                },
                                'g8f6': {
                                    name: "Improved Philidor",
                                    moves: ['b1c3', 'f1c4', 'c1g5'],
                                    weights: [50, 30, 20]
                                },
                                'f7f5': {
                                    name: "Philidor Countergambit",
                                    moves: ['f1c4', 'e4f5', 'b1c3'],
                                    weights: [40, 35, 25]
                                }
                            }
                        },
                        'f7f5': {
                            name: "Latvian Gambit",
                            moves: ['f3e5', 'e4f5', 'f1c4', 'd2d4'],
                            weights: [40, 30, 20, 10],
                            'after_f3e5': {
                                name: "Latvian Main",
                                'd8f6': {
                                    name: "Latvian Accepted",
                                    moves: ['e5c4', 'd2d4', 'f1d3'],
                                    weights: [50, 30, 20]
                                }
                            }
                        }
                    },
                    'after_f1c4': {
                        name: "Bishop's Opening",
                        'g8f6': {
                            name: "Berlin Defense",
                            moves: ['d2d3', 'g1f3', 'b1c3', 'd2d4'],
                            weights: [40, 35, 15, 10],
                            'after_d2d3': {
                                name: "Berlin Classical",
                                'f8c5': {
                                    name: "Berlin Main",
                                    moves: ['g1f3', 'b1c3', 'c1e3'],
                                    weights: [50, 30, 20]
                                },
                                'b8c6': {
                                    name: "Two Knights Berlin",
                                    moves: ['g1f3', 'c1g5', 'b1c3'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'f8c5': {
                            name: "Giuoco Piano",
                            moves: ['g1f3', 'd2d3', 'c2c3', 'b2b4'],
                            weights: [45, 30, 15, 10],
                            'after_g1f3': {
                                name: "Giuoco Piano Main",
                                'b8c6': {
                                    name: "Italian Game",
                                    moves: ['c2c3', 'd2d3', 'b2b4'],
                                    weights: [50, 30, 20]
                                },
                                'd7d6': {
                                    name: "Quiet Italian",
                                    moves: ['c2c3', 'd2d3', 'b1c3'],
                                    weights: [50, 30, 20]
                                }
                            }
                        },
                        'b8c6': {
                            name: "Italian Game",
                            moves: ['g1f3', 'd2d3', 'b1c3', 'c2c3'],
                            weights: [45, 30, 15, 10]
                        }
                    },
                    'after_f1b5': {
                        name: "Ruy Lopez",
                        'a7a6': {
                            name: "Morphy Defense",
                            moves: ['b5a4', 'b5c6', 'b5f1'],
                            weights: [55, 25, 20]
                        },
                        'b8c6': {
                            name: "Cozio Defense",
                            moves: ['b1c3', 'g1f3', 'd2d4'],
                            weights: [45, 35, 20]
                        },
                        'g8f6': {
                            name: "Berlin Defense",
                            moves: ['e4e5', 'd2d4', 'b1c3', 'e1g1'],
                            weights: [40, 30, 20, 10]
                        }
                    },
                    'after_d2d4': {
                        name: "Center Game",
                        'e5d4': {
                            name: "Danish Gambit",
                            moves: ['c2c3', 'f1c4', 'g1f3', 'c1f4'],
                            weights: [40, 30, 20, 10],
                            'after_c2c3': {
                                name: "Danish Gambit Accepted",
                                'd4c3': {
                                    name: "Danish Main",
                                    moves: ['f1c4', 'g1f3', 'b1c3'],
                                    weights: [50, 30, 20]
                                },
                                'd7d5': {
                                    name: "Danish Declined",
                                    moves: ['e4d5', 'f1b5', 'c3d4'],
                                    weights: [45, 35, 20]
                                }
                            }
                        }
                    },
                    'after_b1c3': {
                        name: "Vienna Game",
                        'g8f6': {
                            name: "Vienna Gambit",
                            moves: ['f2f4', 'f1c4', 'g1f3'],
                            weights: [45, 35, 20],
                            'after_f2f4': {
                                name: "Vienna Gambit Accepted",
                                'e5f4': {
                                    name: "Vienna Main",
                                    moves: ['e4e5', 'g1f3', 'd2d4'],
                                    weights: [50, 30, 20]
                                },
                                'd7d5': {
                                    name: "Vienna Gambit Declined",
                                    moves: ['f4e5', 'e4d5', 'd2d4'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'b8c6': {
                            name: "Vienna Four Knights",
                            moves: ['f1c4', 'g1f3', 'f2f4'],
                            weights: [45, 35, 20]
                        },
                        'f8c5': {
                            name: "Vienna Classical",
                            moves: ['g1f3', 'f1c4', 'f2f4'],
                            weights: [50, 30, 20]
                        }
                    },
                    'after_f2f4': {
                        name: "King's Gambit",
                        'e5f4': {
                            name: "King's Gambit Accepted",
                            moves: ['g1f3', 'f1c4', 'd2d4', 'b1c3'],
                            weights: [35, 30, 20, 15],
                            'after_g1f3': {
                                name: "King's Knight Gambit",
                                'g7g5': {
                                    name: "Classical Defense",
                                    moves: ['h2h4', 'f1c4', 'd2d4'],
                                    weights: [45, 35, 20],
                                    'after_h2h4': {
                                        name: "Kieseritzky Gambit",
                                        'g5g4': {
                                            name: "Kieseritzky Main",
                                            moves: ['f3e5', 'f1c4', 'd2d4'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                },
                                'd7d5': {
                                    name: "Modern Defense",
                                    moves: ['e4d5', 'f1b5', 'd2d4'],
                                    weights: [50, 30, 20]
                                },
                                'f8e7': {
                                    name: "Cunningham Defense",
                                    moves: ['f1c4', 'e1g1', 'd2d4'],
                                    weights: [45, 35, 20]
                                }
                            },
                            'after_f1c4': {
                                name: "Bishop's Gambit",
                                'd7d5': {
                                    name: "Bishop's Gambit Main",
                                    moves: ['c4d5', 'g1f3', 'e4e5'],
                                    weights: [50, 30, 20]
                                }
                            }
                        },
                        'e5f4': {
                            name: "King's Gambit Declined",
                            moves: ['g1f3', 'f1c4', 'd2d4'],
                            weights: [50, 30, 20]
                        },
                        'f8c5': {
                            name: "King's Gambit Declined Classical",
                            moves: ['g1f3', 'f1c4', 'd2d3'],
                            weights: [50, 30, 20]
                        }
                    }
                },
                // Against c5 (Sicilian Defense)
                'c7c5': {
                    name: "Sicilian Defense",
                    moves: ['g1f3', 'd2d4', 'b1c3', 'c2c3', 'f2f4', 'f1c4'],
                    weights: [40, 30, 10, 8, 7, 5],
                    'after_g1f3': {
                        name: "Sicilian Main Line",
                        'd7d6': {
                            name: "Najdorf Variation",
                            moves: ['d2d4', 'b1c3', 'f1b5', 'f1c4', 'g2g3'],
                            weights: [40, 25, 15, 10, 10],
                            'after_d2d4': {
                                name: "Open Sicilian",
                                'c5d4': {
                                    name: "Najdorf Main Line",
                                    moves: ['f3d4', 'b1c3', 'f1e2', 'f1c4', 'c1e3'],
                                    weights: [35, 25, 15, 15, 10],
                                    'after_f3d4': {
                                        name: "Najdorf",
                                        'g8f6': {
                                            name: "Najdorf Main",
                                            moves: ['b1c3', 'f2f3', 'f1e2', 'c1g5', 'c1e3'],
                                            weights: [30, 15, 15, 25, 15],
                                            'after_b1c3': {
                                                name: "Najdorf Main Line",
                                                'a7a6': {
                                                    name: "Najdorf with a6",
                                                    moves: ['c1e3', 'c1g5', 'f1e2', 'f2f4', 'g2g3'],
                                                    weights: [30, 25, 20, 15, 10],
                                                    'after_c1e3': {
                                                        name: "English Attack",
                                                        'e7e6': {
                                                            name: "English Attack Main",
                                                            moves: ['f2f3', 'd1d2', 'g2g4'],
                                                            weights: [50, 30, 20]
                                                        },
                                                        'e7e5': {
                                                            name: "Najdorf e5",
                                                            moves: ['d4b3', 'f1e2', 'd1d2'],
                                                            weights: [45, 35, 20]
                                                        }
                                                    },
                                                    'after_c1g5': {
                                                        name: "Main Line Najdorf",
                                                        'e7e6': {
                                                            name: "Najdorf Poisoned Pawn",
                                                            moves: ['f2f4', 'd1f3', 'e1c1'],
                                                            weights: [50, 30, 20]
                                                        }
                                                    }
                                                },
                                                'e7e6': {
                                                    name: "Scheveningen Setup",
                                                    moves: ['c1e3', 'f1e2', 'g2g4'],
                                                    weights: [45, 35, 20]
                                                },
                                                'g7g6': {
                                                    name: "Dragon Setup",
                                                    moves: ['c1e3', 'f1e2', 'f2f3'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            'after_b1c3': {
                                name: "Closed Sicilian",
                                'g8f6': {
                                    name: "Closed Sicilian Main",
                                    moves: ['g2g3', 'f1g2', 'f2f4'],
                                    weights: [50, 30, 20]
                                },
                                'b8c6': {
                                    name: "Closed Sicilian",
                                    moves: ['g2g3', 'f1g2', 'd2d3'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'e7e6': {
                            name: "Scheveningen/Variations",
                            moves: ['d2d4', 'b1c3', 'c2c4', 'g2g3'],
                            weights: [45, 30, 15, 10],
                            'after_d2d4': {
                                name: "Open Sicilian",
                                'c5d4': {
                                    name: "Scheveningen Main",
                                    moves: ['f3d4', 'b1c3', 'f1e2'],
                                    weights: [45, 35, 20],
                                    'after_f3d4': {
                                        name: "Scheveningen",
                                        'd7d6': {
                                            name: "Scheveningen Classical",
                                            moves: ['b1c3', 'f1e2', 'c1e3'],
                                            weights: [45, 35, 20],
                                            'after_b1c3': {
                                                name: "Scheveningen Main",
                                                'g8f6': {
                                                    name: "Keres Attack",
                                                    moves: ['g2g4', 'h2h3', 'c1e3'],
                                                    weights: [45, 35, 20]
                                                },
                                                'a7a6': {
                                                    name: "Scheveningen with a6",
                                                    moves: ['f1e2', 'c1e3', 'f2f4'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        },
                                        'b8c6': {
                                            name: "Four Knights Sicilian",
                                            moves: ['b1c3', 'f1e2', 'c1e3'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                }
                            }
                        },
                        'b8c6': {
                            name: "Classical Sicilian",
                            moves: ['d2d4', 'b1c3', 'f1b5', 'c2c3'],
                            weights: [45, 30, 15, 10],
                            'after_d2d4': {
                                name: "Open Sicilian",
                                'c5d4': {
                                    name: "Classical Sicilian Main",
                                    moves: ['f3d4', 'b1c3', 'f1e2', 'c1e3'],
                                    weights: [40, 30, 20, 10],
                                    'after_f3d4': {
                                        name: "Classical Main",
                                        'd7d6': {
                                            name: "Richter-Rauzer",
                                            moves: ['c1g5', 'f1e2', 'b1c3'],
                                            weights: [50, 30, 20],
                                            'after_c1g5': {
                                                name: "Richter-Rauzer Attack",
                                                'e7e6': {
                                                    name: "Main Line",
                                                    moves: ['d1d2', 'e1c1', 'f2f4'],
                                                    weights: [50, 30, 20]
                                                },
                                                'g8f6': {
                                                    name: "Richter-Rauzer Main",
                                                    moves: ['d1d2', 'e1c1', 'f2f3'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        },
                                        'e7e6': {
                                            name: "Paulsen Variation",
                                            moves: ['d4b5', 'b1c3', 'c1f4'],
                                            weights: [45, 35, 20]
                                        },
                                        'g7g6': {
                                            name: "Classical with g6",
                                            moves: ['c1e3', 'f1e2', 'd1d2'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                }
                            },
                            'after_f1b5': {
                                name: "Rossolimo Variation",
                                'd7d6': {
                                    name: "Rossolimo Main",
                                    moves: ['e1g1', 'f1e1', 'c2c3'],
                                    weights: [50, 30, 20]
                                },
                                'g7g6': {
                                    name: "Rossolimo vs g6",
                                    moves: ['e1g1', 'd2d4', 'b5c6'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'g8f6': {
                            name: "Dragon/Accelerated",
                            moves: ['b1c3', 'e4e5', 'd2d4', 'f1c4'],
                            weights: [40, 25, 20, 15],
                            'after_b1c3': {
                                name: "Dragon Main",
                                'd7d6': {
                                    name: "Dragon Variation",
                                    moves: ['d2d4', 'f1c4', 'c1e3'],
                                    weights: [50, 30, 20],
                                    'after_d2d4': {
                                        name: "Dragon Open",
                                        'c5d4': {
                                            name: "Yugoslav Attack",
                                            moves: ['f3d4', 'c1e3', 'f1e2', 'f2f3'],
                                            weights: [40, 30, 20, 10],
                                            'after_f3d4': {
                                                name: "Dragon Main",
                                                'g7g6': {
                                                    name: "Dragon with g6",
                                                    moves: ['c1e3', 'f1e2', 'f2f3', 'd1d2'],
                                                    weights: [35, 25, 25, 15],
                                                    'after_c1e3': {
                                                        name: "Yugoslav Attack",
                                                        'f8g7': {
                                                            name: "Yugoslav Main",
                                                            moves: ['f2f3', 'd1d2', 'e1c1'],
                                                            weights: [45, 35, 20]
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            'after_e4e5': {
                                name: "Accelerated Dragon",
                                'f6d5': {
                                    name: "Accelerated Dragon Main",
                                    moves: ['b1c3', 'd2d4', 'f1c4'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'a7a6': {
                            name: "O'Kelly Variation",
                            moves: ['c2c3', 'c2c4', 'b1c3', 'd2d4'],
                            weights: [35, 30, 20, 15],
                            'after_c2c3': {
                                name: "O'Kelly Main",
                                'd7d5': {
                                    name: "O'Kelly Center",
                                    moves: ['e4d5', 'd2d4', 'f1d3'],
                                    weights: [50, 30, 20]
                                }
                            }
                        },
                        'e7e5': {
                            name: "Kalashnikov/Sveshnikov",
                            moves: ['f3e5', 'b1c3', 'd2d4'],
                            weights: [40, 35, 25],
                            'after_f3e5': {
                                name: "Kalashnikov",
                                'd7d6': {
                                    name: "Kalashnikov Main",
                                    moves: ['e5f3', 'e5c4', 'd2d4'],
                                    weights: [50, 30, 20]
                                }
                            }
                        }
                    },
                    'after_d2d4': {
                        name: "Smith-Morra Gambit",
                        'c5d4': {
                            name: "Smith-Morra Accepted",
                            moves: ['c2c3', 'g1f3', 'f1c4'],
                            weights: [50, 30, 20],
                            'after_c2c3': {
                                name: "Smith-Morra Main",
                                'd4c3': {
                                    name: "Morra Gambit Accepted",
                                    moves: ['b1c3', 'g1f3', 'f1c4'],
                                    weights: [50, 30, 20]
                                }
                            }
                        }
                    },
                    'after_b1c3': {
                        name: "Closed Sicilian",
                        'b8c6': {
                            name: "Closed Sicilian Main",
                            moves: ['g2g3', 'f1g2', 'd2d3', 'f2f4'],
                            weights: [35, 30, 20, 15],
                            'after_g2g3': {
                                name: "Closed Main",
                                'g7g6': {
                                    name: "Closed with g6",
                                    moves: ['f1g2', 'd2d3', 'g1e2'],
                                    weights: [50, 30, 20]
                                }
                            }
                        }
                    },
                    'after_c2c3': {
                        name: "Alapin Variation",
                        'd7d5': {
                            name: "Alapin Main",
                            moves: ['e4d5', 'd2d4', 'g1f3'],
                            weights: [50, 30, 20],
                            'after_e4d5': {
                                name: "Alapin Exchange",
                                'd8d5': {
                                    name: "Alapin Main Line",
                                    moves: ['d2d4', 'g1f3', 'f1e2'],
                                    weights: [50, 30, 20]
                                },
                                'g8f6': {
                                    name: "Alapin Gambit",
                                    moves: ['d2d4', 'f1b5', 'g1f3'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'g8f6': {
                            name: "Alapin Anti-Sicilian",
                            moves: ['e4e5', 'd2d4', 'f1d3'],
                            weights: [50, 30, 20]
                        }
                    }
                },
                // Against e6 (French Defense)
                'e7e6': {
                    name: "French Defense",
                    moves: ['d2d4', 'b1c3', 'b1d2', 'e4e5', 'g1f3', 'f2f4'],
                    weights: [35, 25, 15, 10, 8, 7],
                    'after_d2d4': {
                        name: "French Main Line",
                        'd7d5': {
                            name: "French Main",
                            moves: ['b1c3', 'e4e5', 'b1d2', 'e4d5'],
                            weights: [40, 25, 20, 15],
                            'after_b1c3': {
                                name: "French Classical",
                                'g8f6': {
                                    name: "Classical French",
                                    moves: ['c1g5', 'e4e5', 'f1d3'],
                                    weights: [45, 35, 20],
                                    'after_c1g5': {
                                        name: "Classical Main",
                                        'f8e7': {
                                            name: "McCutcheon Variation",
                                            moves: ['e4e5', 'g5f6', 'g2g4'],
                                            weights: [45, 35, 20]
                                        },
                                        'f8b4': {
                                            name: "MacCutcheon Main",
                                            moves: ['e4e5', 'g5d2', 'a2a3'],
                                            weights: [50, 30, 20]
                                        },
                                        'd5e4': {
                                            name: "Burn Variation",
                                            moves: ['c3e4', 'f1d3', 'g1f3'],
                                            weights: [45, 35, 20]
                                        }
                                    },
                                    'after_e4e5': {
                                        name: "Steinitz Variation",
                                        'f6d7': {
                                            name: "Steinitz Main",
                                            moves: ['f2f4', 'g1f3', 'f1d3'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                },
                                'f8b4': {
                                    name: "Winawer Variation",
                                    moves: ['e4e5', 'c1d2', 'a2a3', 'd1g4'],
                                    weights: [40, 30, 20, 10],
                                    'after_e4e5': {
                                        name: "Winawer Main",
                                        'c7c5': {
                                            name: "Winawer Poisoned Pawn",
                                            moves: ['a2a3', 'c1d2', 'd1g4'],
                                            weights: [45, 35, 20],
                                            'after_a2a3': {
                                                name: "Winawer Exchange",
                                                'b4c3': {
                                                    name: "Poisoned Pawn Variation",
                                                    moves: ['b2c3', 'd1g4', 'g1f3'],
                                                    weights: [50, 30, 20],
                                                    'after_b2c3': {
                                                        name: "Poisoned Pawn Main",
                                                        'd8c7': {
                                                            name: "Portisch-Hook Variation",
                                                            moves: ['d1g4', 'g1f3', 'f1d3'],
                                                            weights: [50, 30, 20]
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        'b8c6': {
                                            name: "Winawer with Nc6",
                                            moves: ['g1f3', 'c1f4', 'f1d3'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                },
                                'd5e4': {
                                    name: "Rubinstein Variation",
                                    moves: ['c3e4', 'g1f3', 'f1d3'],
                                    weights: [45, 35, 20],
                                    'after_c3e4': {
                                        name: "Rubinstein Main",
                                        'b8d7': {
                                            name: "Rubinstein with Nd7",
                                            moves: ['g1f3', 'f1d3', 'd1e2'],
                                            weights: [50, 30, 20]
                                        },
                                        'f8e7': {
                                            name: "Rubinstein Classical",
                                            moves: ['g1f3', 'f1d3', 'c1e3'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                }
                            },
                            'after_e4e5': {
                                name: "Advance Variation",
                                'c7c5': {
                                    name: "Advance French",
                                    moves: ['c2c3', 'g1f3', 'a2a3'],
                                    weights: [45, 35, 20],
                                    'after_c2c3': {
                                        name: "Advance Main",
                                        'b8c6': {
                                            name: "Advance with Nc6",
                                            moves: ['g1f3', 'f1d3', 'e1g1'],
                                            weights: [50, 30, 20]
                                        },
                                        'd8b6': {
                                            name: "Advance with Qb6",
                                            moves: ['g1f3', 'f1d3', 'e1g1'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                }
                            },
                            'after_b1d2': {
                                name: "Tarrasch Variation",
                                'c7c5': {
                                    name: "Tarrasch Main",
                                    moves: ['e4d5', 'g1f3', 'c2c3'],
                                    weights: [45, 35, 20],
                                    'after_e4d5': {
                                        name: "Tarrasch Exchange",
                                        'e6d5': {
                                            name: "Tarrasch Open",
                                            moves: ['g1f3', 'f1b5', 'd1e2'],
                                            weights: [45, 35, 20]
                                        },
                                        'd8d5': {
                                            name: "Tarrasch with Qxd5",
                                            moves: ['g1f3', 'f1c4', 'e1g1'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                },
                                'g8f6': {
                                    name: "Tarrasch Closed",
                                    moves: ['e4e5', 'f1d3', 'c2c3'],
                                    weights: [50, 30, 20]
                                }
                            },
                            'after_e4d5': {
                                name: "Exchange Variation",
                                'e6d5': {
                                    name: "Exchange French",
                                    moves: ['f1d3', 'g1f3', 'c1g5'],
                                    weights: [45, 35, 20],
                                    'after_f1d3': {
                                        name: "Exchange Main",
                                        'f8d6': {
                                            name: "Symmetrical Exchange",
                                            moves: ['g1f3', 'e1g1', 'c1g5'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                }
                            }
                        }
                    },
                    'after_b1c3': {
                        name: "French with Nc3",
                        'd7d5': {
                            name: "French Classical Main",
                            moves: ['d2d4', 'f2f4', 'g1f3'],
                            weights: [50, 30, 20]
                        }
                    },
                    'after_e4e5': {
                        name: "French Advance",
                        'd7d5': {
                            name: "Advance French",
                            moves: ['d2d4', 'c2c3', 'g1f3'],
                            weights: [50, 30, 20]
                        }
                    }
                },
                // Against c6 (Caro-Kann Defense)
                'c7c6': {
                    name: "Caro-Kann Defense",
                    moves: ['d2d4', 'b1c3', 'g1f3', 'e4e5', 'f1d3', 'c2c4'],
                    weights: [35, 25, 15, 10, 8, 7],
                    'after_d2d4': {
                        name: "Caro-Kann Main Line",
                        'd7d5': {
                            name: "Caro-Kann Main",
                            moves: ['b1c3', 'e4e5', 'e4d5', 'f2f3'],
                            weights: [40, 25, 20, 15],
                            'after_b1c3': {
                                name: "Classical Caro-Kann",
                                'd5e4': {
                                    name: "Classical Main",
                                    moves: ['c3e4', 'g1f3', 'f1c4'],
                                    weights: [45, 35, 20],
                                    'after_c3e4': {
                                        name: "Caro-Kann Classical",
                                        'c8f5': {
                                            name: "Classical with Bf5",
                                            moves: ['e4g3', 'e4c5', 'h2h4'],
                                            weights: [45, 35, 20],
                                            'after_e4g3': {
                                                name: "Classical Main",
                                                'f5g6': {
                                                    name: "Caro-Kann Main Line",
                                                    moves: ['h2h4', 'g1f3', 'f1d3'],
                                                    weights: [45, 35, 20],
                                                    'after_h2h4': {
                                                        name: "Classical Attack",
                                                        'h7h6': {
                                                            name: "Caro-Kann Classical",
                                                            moves: ['g3f5', 'f1d3', 'd1e2'],
                                                            weights: [50, 30, 20]
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        'b8d7': {
                                            name: "Smyslov Variation",
                                            moves: ['g1f3', 'f1d3', 'd1e2'],
                                            weights: [50, 30, 20]
                                        },
                                        'g8f6': {
                                            name: "Bronstein-Larsen",
                                            moves: ['e4f6', 'g1f3', 'f1d3'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                },
                                'g8f6': {
                                    name: "Two Knights Caro-Kann",
                                    moves: ['e4e5', 'c1g5', 'f1d3'],
                                    weights: [40, 35, 25]
                                },
                                'e7e6': {
                                    name: "Closed Caro-Kann",
                                    moves: ['g1f3', 'f1d3', 'e1g1'],
                                    weights: [50, 30, 20]
                                }
                            },
                            'after_e4e5': {
                                name: "Advance Variation",
                                'c8f5': {
                                    name: "Advance Main",
                                    moves: ['g1f3', 'f1d3', 'c2c3'],
                                    weights: [45, 35, 20],
                                    'after_g1f3': {
                                        name: "Advance with Nf3",
                                        'e7e6': {
                                            name: "Short Variation",
                                            moves: ['f1e2', 'e1g1', 'c2c3'],
                                            weights: [50, 30, 20]
                                        },
                                        'c7c5': {
                                            name: "Botvinnik-Carls",
                                            moves: ['c2c3', 'f1e2', 'e1g1'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                }
                            },
                            'after_e4d5': {
                                name: "Exchange Variation",
                                'c6d5': {
                                    name: "Exchange Main",
                                    moves: ['f1d3', 'g1f3', 'b1c3'],
                                    weights: [45, 35, 20]
                                }
                            },
                            'after_f2f3': {
                                name: "Fantasy Variation",
                                'd5e4': {
                                    name: "Fantasy Accepted",
                                    moves: ['f3e4', 'g1f3', 'f1d3'],
                                    weights: [50, 30, 20]
                                },
                                'e7e6': {
                                    name: "Fantasy Declined",
                                    moves: ['c1e3', 'b1c3', 'd1d2'],
                                    weights: [45, 35, 20]
                                }
                            }
                        }
                    },
                    'after_b1c3': {
                        name: "Caro-Kann with Nc3",
                        'd7d5': {
                            name: "Caro-Kann Main",
                            moves: ['d2d4', 'g1f3', 'f2f3'],
                            weights: [50, 30, 20]
                        }
                    },
                    'after_e4e5': {
                        name: "Caro-Kann Advance",
                        'c8f5': {
                            name: "Advance Caro-Kann",
                            moves: ['d2d4', 'g1f3', 'f1d3'],
                            weights: [50, 30, 20]
                        }
                    }
                },
                // Against d5 (Scandinavian Defense)
                'd7d5': {
                    name: "Scandinavian Defense",
                    moves: ['e4d5', 'g1f3', 'd2d4', 'b1c3', 'f1b5'],
                    weights: [50, 20, 15, 10, 5],
                    'after_e4d5': {
                        name: "Scandinavian Main",
                        'd8d5': {
                            name: "Main Line Scandinavian",
                            moves: ['b1c3', 'g1f3', 'd2d4'],
                            weights: [45, 35, 20],
                            'after_b1c3': {
                                name: "Scandinavian with Nc3",
                                'd5a5': {
                                    name: "Scandinavian Modern",
                                    moves: ['d2d4', 'g1f3', 'f1c4'],
                                    weights: [45, 35, 20],
                                    'after_d2d4': {
                                        name: "Modern Main",
                                        'g8f6': {
                                            name: "Scandinavian Modern",
                                            moves: ['g1f3', 'f1d3', 'c1g5'],
                                            weights: [50, 30, 20]
                                        },
                                        'c7c6': {
                                            name: "Pytel Variation",
                                            moves: ['g1f3', 'f1d3', 'c1f4'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                },
                                'd5d8': {
                                    name: "Scandinavian Retreat",
                                    moves: ['d2d4', 'g1f3', 'f1c4'],
                                    weights: [45, 35, 20]
                                },
                                'd5d6': {
                                    name: "Gubnitsky-Pytel",
                                    moves: ['d2d4', 'g1f3', 'f1e2'],
                                    weights: [50, 30, 20]
                                }
                            }
                        },
                        'g8f6': {
                            name: "Modern Scandinavian",
                            moves: ['d2d4', 'c2c4', 'f1b5', 'b1c3'],
                            weights: [35, 30, 20, 15],
                            'after_d2d4': {
                                name: "Modern Main",
                                'f6d5': {
                                    name: "Modern Accepted",
                                    moves: ['c2c4', 'g1f3', 'b1c3'],
                                    weights: [45, 35, 20]
                                },
                                'd8d5': {
                                    name: "Icelandic Gambit",
                                    moves: ['b1c3', 'f1b5', 'g1e2'],
                                    weights: [50, 30, 20]
                                }
                            }
                        }
                    }
                },
                // Against d6 (Pirc Defense)
                'd7d6': {
                    name: "Pirc Defense",
                    moves: ['d2d4', 'b1c3', 'g1f3', 'f2f4', 'f1c4'],
                    weights: [40, 25, 15, 10, 10],
                    'after_d2d4': {
                        name: "Pirc Main",
                        'g8f6': {
                            name: "Pirc Defense Main",
                            moves: ['b1c3', 'f2f3', 'f1d3', 'c1g5'],
                            weights: [40, 25, 20, 15],
                            'after_b1c3': {
                                name: "Pirc Classical",
                                'g7g6': {
                                    name: "Pirc with g6",
                                    moves: ['f2f4', 'g1f3', 'c1e3', 'f1e2'],
                                    weights: [35, 30, 20, 15],
                                    'after_f2f4': {
                                        name: "Austrian Attack",
                                        'f8g7': {
                                            name: "Austrian Attack Main",
                                            moves: ['g1f3', 'e4e5', 'f1d3'],
                                            weights: [50, 30, 20],
                                            'after_g1f3': {
                                                name: "Austrian Main",
                                                'e8g8': {
                                                    name: "Austrian Castled",
                                                    moves: ['f1d3', 'e1g1', 'd1e1'],
                                                    weights: [50, 30, 20]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // Against g6 (Modern Defense)
                'g7g6': {
                    name: "Modern Defense",
                    moves: ['d2d4', 'b1c3', 'g1f3', 'f2f4', 'c1e3'],
                    weights: [40, 25, 15, 10, 10],
                    'after_d2d4': {
                        name: "Modern Main",
                        'f8g7': {
                            name: "Modern Defense Main",
                            moves: ['b1c3', 'g1f3', 'c2c4', 'f2f4'],
                            weights: [40, 25, 20, 15],
                            'after_b1c3': {
                                name: "Modern Classical",
                                'd7d6': {
                                    name: "Modern with d6",
                                    moves: ['f2f4', 'g1f3', 'c1e3'],
                                    weights: [45, 35, 20]
                                }
                            }
                        }
                    }
                },
                // Against Nf6 (Alekhine Defense)
                'g8f6': {
                    name: "Alekhine Defense",
                    moves: ['e4e5', 'b1c3', 'd2d4', 'f1c4'],
                    weights: [55, 20, 15, 10],
                    'after_e4e5': {
                        name: "Alekhine Main",
                        'f6d5': {
                            name: "Alekhine Main Line",
                            moves: ['d2d4', 'c2c4', 'g1f3', 'f1c4'],
                            weights: [40, 30, 20, 10],
                            'after_d2d4': {
                                name: "Alekhine Four Pawns",
                                'd7d6': {
                                    name: "Alekhine Four Pawns Attack",
                                    moves: ['c2c4', 'f2f4', 'g1f3'],
                                    weights: [45, 35, 20],
                                    'after_c2c4': {
                                        name: "Four Pawns Main",
                                        'd5b6': {
                                            name: "Four Pawns Attack",
                                            moves: ['f2f4', 'b1c3', 'c1e3'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // Against Nc6 (Nimzowitsch Defense)
                'b8c6': {
                    name: "Nimzowitsch Defense",
                    moves: ['d2d4', 'b1c3', 'g1f3', 'f1b5'],
                    weights: [45, 25, 20, 10],
                    'after_d2d4': {
                        name: "Nimzowitsch Main",
                        'd7d5': {
                            name: "Nimzowitsch Main Line",
                            moves: ['e4d5', 'e4e5', 'b1c3'],
                            weights: [45, 35, 20]
                        },
                        'e7e5': {
                            name: "Nimzowitsch Gambit",
                            moves: ['d4e5', 'g1f3', 'b1c3'],
                            weights: [50, 30, 20]
                        }
                    }
                }
            },

            // ========== d4 OPENINGS ==========
            'd2d4': {
                name: "Queen's Pawn Opening",
                // Against d5 (Queen's Pawn Games)
                'd7d5': {
                    name: "Closed Game",
                    moves: ['c2c4', 'g1f3', 'b1c3', 'c1f4', 'e2e3', 'c1g5'],
                    weights: [45, 20, 15, 10, 5, 5],
                    'after_c2c4': {
                        name: "Queen's Gambit",
                        'e7e6': {
                            name: "Queen's Gambit Declined",
                            moves: ['b1c3', 'g1f3', 'c1g5', 'e2e3'],
                            weights: [40, 30, 20, 10],
                            'after_b1c3': {
                                name: "QGD Main",
                                'g8f6': {
                                    name: "Orthodox Defense",
                                    moves: ['c1g5', 'g1f3', 'e2e3'],
                                    weights: [45, 35, 20],
                                    'after_c1g5': {
                                        name: "QGD Orthodox",
                                        'f8e7': {
                                            name: "Orthodox Main",
                                            moves: ['e2e3', 'g1f3', 'f1d3'],
                                            weights: [50, 30, 20],
                                            'after_e2e3': {
                                                name: "Orthodox Classical",
                                                'e8g8': {
                                                    name: "Orthodox Castled",
                                                    moves: ['g1f3', 'f1d3', 'e1g1'],
                                                    weights: [50, 30, 20]
                                                },
                                                'b8d7': {
                                                    name: "Cambridge Springs",
                                                    moves: ['g1f3', 'f1d3', 'd1c2'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        },
                                        'b8d7': {
                                            name: "QGD with Nbd7",
                                            moves: ['e2e3', 'g1f3', 'f1d3'],
                                            weights: [50, 30, 20]
                                        },
                                        'c7c5': {
                                            name: "Tarrasch Defense",
                                            moves: ['e2e3', 'c4d5', 'g1f3'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                },
                                'f8b4': {
                                    name: "Ragozin Defense",
                                    moves: ['c1g5', 'g1f3', 'e2e3', 'd1a4'],
                                    weights: [35, 30, 20, 15]
                                },
                                'c7c5': {
                                    name: "Semi-Tarrasch",
                                    moves: ['c4d5', 'g1f3', 'e2e3'],
                                    weights: [45, 35, 20],
                                    'after_c4d5': {
                                        name: "Semi-Tarrasch Main",
                                        'f6d5': {
                                            name: "Semi-Tarrasch Accepted",
                                            moves: ['e2e4', 'g1f3', 'f1c4'],
                                            weights: [50, 30, 20]
                                        },
                                        'e6d5': {
                                            name: "Symmetrical",
                                            moves: ['g1f3', 'c1g5', 'e2e3'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                }
                            },
                            'after_g1f3': {
                                name: "QGD with Nf3",
                                'g8f6': {
                                    name: "QGD Main",
                                    moves: ['b1c3', 'e2e3', 'c1g5'],
                                    weights: [50, 30, 20]
                                }
                            }
                        },
                        'c7c6': {
                            name: "Slav Defense",
                            moves: ['g1f3', 'b1c3', 'e2e3', 'c4d5'],
                            weights: [40, 30, 20, 10],
                            'after_g1f3': {
                                name: "Slav Main",
                                'g8f6': {
                                    name: "Slav Main Line",
                                    moves: ['b1c3', 'e2e3', 'c1f4'],
                                    weights: [45, 35, 20],
                                    'after_b1c3': {
                                        name: "Slav Main",
                                        'd5c4': {
                                            name: "Slav Accepted",
                                            moves: ['a2a4', 'e2e3', 'e2e4'],
                                            weights: [40, 35, 25],
                                            'after_a2a4': {
                                                name: "Slav Accepted Main",
                                                'c8f5': {
                                                    name: "Slav with Bf5",
                                                    moves: ['e2e3', 'f1c4', 'f3e5'],
                                                    weights: [50, 30, 20]
                                                },
                                                'c8g4': {
                                                    name: "Slav with Bg4",
                                                    moves: ['f3e5', 'e2e3', 'h2h3'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        },
                                        'e7e6': {
                                            name: "Semi-Slav",
                                            moves: ['e2e3', 'c1g5', 'd1c2'],
                                            weights: [40, 35, 25],
                                            'after_e2e3': {
                                                name: "Semi-Slav Main",
                                                'b8d7': {
                                                    name: "Meran Variation",
                                                    moves: ['f1d3', 'e1g1', 'e3e4'],
                                                    weights: [45, 35, 20],
                                                    'after_f1d3': {
                                                        name: "Meran Main",
                                                        'd5c4': {
                                                            name: "Meran Accepted",
                                                            moves: ['d3c4', 'e1g1', 'e3e4'],
                                                            weights: [50, 30, 20]
                                                        }
                                                    }
                                                },
                                                'f8b4': {
                                                    name: "Anti-Meran",
                                                    moves: ['c1d2', 'f1d3', 'e1g1'],
                                                    weights: [50, 30, 20]
                                                }
                                            },
                                            'after_c1g5': {
                                                name: "Botvinnik System",
                                                'd5c4': {
                                                    name: "Botvinnik Variation",
                                                    moves: ['e2e4', 'e2e3', 'a2a4'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        },
                                        'a7a6': {
                                            name: "Chebanenko Slav",
                                            moves: ['c4d5', 'e2e3', 'c1f4'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                }
                            },
                            'after_e2e3': {
                                name: "Slav Quiet",
                                'g8f6': {
                                    name: "Slav Quiet Line",
                                    moves: ['b1c3', 'g1f3', 'f1d3'],
                                    weights: [50, 30, 20]
                                }
                            }
                        },
                        'd5c4': {
                            name: "Queen's Gambit Accepted",
                            moves: ['e2e3', 'e2e4', 'g1f3', 'b1c3'],
                            weights: [40, 30, 20, 10],
                            'after_e2e3': {
                                name: "QGA Main",
                                'b8c6': {
                                    name: "QGA Main Line",
                                    moves: ['f1c4', 'g1f3', 'e1g1'],
                                    weights: [45, 35, 20]
                                },
                                'a7a6': {
                                    name: "QGA Modern",
                                    moves: ['f1c4', 'g1f3', 'e1g1'],
                                    weights: [50, 30, 20]
                                },
                                'g8f6': {
                                    name: "QGA Classical",
                                    moves: ['f1c4', 'g1f3', 'e1g1'],
                                    weights: [45, 35, 20]
                                },
                                'e7e5': {
                                    name: "QGA Central",
                                    moves: ['f1c4', 'g1f3', 'd4e5'],
                                    weights: [45, 35, 20]
                                }
                            },
                            'after_e2e4': {
                                name: "QGA Sharp",
                                'e7e5': {
                                    name: "QGA Countergambit",
                                    moves: ['g1f3', 'f1c4', 'd4e5'],
                                    weights: [50, 30, 20]
                                },
                                'b8c6': {
                                    name: "QGA with Nc6",
                                    moves: ['g1f3', 'f1c4', 'd4d5'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'b8c6': {
                            name: "Chigorin Defense",
                            moves: ['g1f3', 'b1c3', 'c4d5'],
                            weights: [45, 35, 20],
                            'after_g1f3': {
                                name: "Chigorin Main",
                                'c1g4': {
                                    name: "Chigorin with Bg4",
                                    moves: ['c4d5', 'e2e3', 'd1a4'],
                                    weights: [50, 30, 20]
                                }
                            }
                        },
                        'e7e5': {
                            name: "Albin Countergambit",
                            moves: ['d4e5', 'e2e3', 'g1f3'],
                            weights: [45, 35, 20],
                            'after_d4e5': {
                                name: "Albin Main",
                                'd5d4': {
                                    name: "Albin Gambit",
                                    moves: ['g1f3', 'e2e3', 'b1d2'],
                                    weights: [50, 30, 20]
                                }
                            }
                        }
                    }
                },
                // Against Nf6 (Indian Defenses)
                'g8f6': {
                    name: "Indian Defense",
                    moves: ['c2c4', 'g1f3', 'b1c3', 'c1g5', 'e2e3'],
                    weights: [45, 25, 15, 10, 5],
                    'after_c2c4': {
                        name: "Indian Main",
                        'e7e6': {
                            name: "Nimzo/Queen's Indian",
                            moves: ['b1c3', 'g1f3', 'a2a3', 'e2e3'],
                            weights: [40, 30, 20, 10],
                            'after_b1c3': {
                                name: "Nimzo-Indian",
                                'f8b4': {
                                    name: "Nimzo-Indian Defense",
                                    moves: ['e2e3', 'd1c2', 'g1f3', 'c1g5'],
                                    weights: [40, 25, 20, 15],
                                    'after_e2e3': {
                                        name: "Nimzo-Indian Classical",
                                        'e8g8': {
                                            name: "Nimzo-Indian Main",
                                            moves: ['f1d3', 'g1f3', 'e1g1'],
                                            weights: [45, 35, 20],
                                            'after_f1d3': {
                                                name: "Classical Nimzo",
                                                'd7d5': {
                                                    name: "Rubinstein System",
                                                    moves: ['g1f3', 'e1g1', 'a2a3'],
                                                    weights: [50, 30, 20]
                                                },
                                                'c7c5': {
                                                    name: "Hubner Variation",
                                                    moves: ['g1f3', 'e1g1', 'd4c5'],
                                                    weights: [45, 35, 20]
                                                }
                                            }
                                        },
                                        'c7c5': {
                                            name: "Nimzo-Indian c5",
                                            moves: ['f1d3', 'g1f3', 'e1g1'],
                                            weights: [45, 35, 20]
                                        },
                                        'b7b6': {
                                            name: "Nimzo-Indian b6",
                                            moves: ['g1e2', 'f1d3', 'e1g1'],
                                            weights: [45, 35, 20]
                                        }
                                    },
                                    'after_d1c2': {
                                        name: "Capablanca Variation",
                                        'e8g8': {
                                            name: "Capablanca Main",
                                            moves: ['a2a3', 'e2e3', 'g1f3'],
                                            weights: [50, 30, 20]
                                        },
                                        'c7c5': {
                                            name: "Capablanca with c5",
                                            moves: ['d4c5', 'a2a3', 'g1f3'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                }
                            },
                            'after_g1f3': {
                                name: "Queen's Indian",
                                'b7b6': {
                                    name: "Queen's Indian Defense",
                                    moves: ['e2e3', 'g2g3', 'a2a3'],
                                    weights: [40, 35, 25],
                                    'after_e2e3': {
                                        name: "Queen's Indian Classical",
                                        'c8b7': {
                                            name: "QID Main",
                                            moves: ['f1d3', 'e1g1', 'b1c3'],
                                            weights: [50, 30, 20]
                                        },
                                        'f8e7': {
                                            name: "QID with Be7",
                                            moves: ['f1d3', 'e1g1', 'b1c3'],
                                            weights: [45, 35, 20]
                                        }
                                    },
                                    'after_g2g3': {
                                        name: "Queen's Indian Fianchetto",
                                        'c8b7': {
                                            name: "QID Fianchetto Main",
                                            moves: ['f1g2', 'e1g1', 'b1c3'],
                                            weights: [50, 30, 20]
                                        },
                                        'c8a6': {
                                            name: "Queen's Indian with Ba6",
                                            moves: ['b1d2', 'd1c2', 'f1g2'],
                                            weights: [45, 35, 20]
                                        }
                                    }
                                },
                                'f8b4': {
                                    name: "Bogo-Indian Defense",
                                    moves: ['c1d2', 'b1c3', 'a2a3'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'g7g6': {
                            name: "King's Indian/Grunfeld",
                            moves: ['b1c3', 'g1f3', 'e2e4', 'g2g3'],
                            weights: [40, 30, 20, 10],
                            'after_b1c3': {
                                name: "King's Indian Defense",
                                'f8g7': {
                                    name: "King's Indian Main",
                                    moves: ['e2e4', 'g1f3', 'f2f3', 'c1e3'],
                                    weights: [40, 30, 20, 10],
                                    'after_e2e4': {
                                        name: "KID Classical",
                                        'd7d6': {
                                            name: "KID Main Line",
                                            moves: ['g1f3', 'f1e2', 'c1e3', 'h2h3'],
                                            weights: [35, 30, 20, 15],
                                            'after_g1f3': {
                                                name: "Classical KID",
                                                'e8g8': {
                                                    name: "KID Castled",
                                                    moves: ['f1e2', 'e1g1', 'c1e3'],
                                                    weights: [45, 35, 20],
                                                    'after_f1e2': {
                                                        name: "Mar del Plata",
                                                        'e7e5': {
                                                            name: "Mar del Plata Variation",
                                                            moves: ['d4d5', 'e1g1', 'c1e3'],
                                                            weights: [50, 30, 20]
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        'e8g8': {
                                            name: "KID Early Castling",
                                            moves: ['g1f3', 'f1e2', 'c1e3'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                },
                                'd7d5': {
                                    name: "Grunfeld Defense",
                                    moves: ['c4d5', 'e2e4', 'g1f3', 'c1f4'],
                                    weights: [40, 30, 20, 10],
                                    'after_c4d5': {
                                        name: "Grunfeld Exchange",
                                        'f6d5': {
                                            name: "Grunfeld Main",
                                            moves: ['e2e4', 'c1d2', 'g1f3'],
                                            weights: [45, 35, 20],
                                            'after_e2e4': {
                                                name: "Exchange Grunfeld",
                                                'd5c3': {
                                                    name: "Exchange Main",
                                                    moves: ['b2c3', 'f1c4', 'g1f3'],
                                                    weights: [50, 30, 20],
                                                    'after_b2c3': {
                                                        name: "Modern Exchange",
                                                        'f8g7': {
                                                            name: "Grunfeld Exchange Main",
                                                            moves: ['f1c4', 'g1f3', 'e1g1'],
                                                            weights: [50, 30, 20]
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    'after_e2e4': {
                                        name: "Grunfeld Russian",
                                        'f6e4': {
                                            name: "Russian System",
                                            moves: ['b1c3', 'f1c4', 'g1f3'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                }
                            }
                        },
                        'c7c5': {
                            name: "Benoni/Benko",
                            moves: ['d4d5', 'b1c3', 'e2e3', 'g1f3'],
                            weights: [40, 30, 20, 10],
                            'after_d4d5': {
                                name: "Modern Benoni",
                                'e7e6': {
                                    name: "Modern Benoni Main",
                                    moves: ['b1c3', 'e2e4', 'g1f3'],
                                    weights: [45, 35, 20],
                                    'after_b1c3': {
                                        name: "Modern Benoni Main Line",
                                        'e6d5': {
                                            name: "Benoni Exchange",
                                            moves: ['c4d5', 'e2e4', 'g1f3'],
                                            weights: [45, 35, 20]
                                        },
                                        'd7d6': {
                                            name: "Benoni Main",
                                            moves: ['e2e4', 'g1f3', 'f1e2'],
                                            weights: [50, 30, 20]
                                        }
                                    }
                                }
                            },
                            'after_b1c3': {
                                name: "Benko Gambit",
                                'b7b5': {
                                    name: "Benko Gambit Accepted",
                                    moves: ['c4b5', 'e2e4', 'g1f3'],
                                    weights: [50, 30, 20]
                                }
                            }
                        },
                        'b7b6': {
                            name: "English Defense",
                            moves: ['b1c3', 'e2e4', 'g1f3'],
                            weights: [45, 35, 20]
                        },
                        'b8c6': {
                            name: "Mexican Defense",
                            moves: ['b1c3', 'g1f3', 'e2e4'],
                            weights: [45, 35, 20]
                        }
                    }
                },
                // Against f5 (Dutch Defense)
                'f7f5': {
                    name: "Dutch Defense",
                    moves: ['c2c4', 'g1f3', 'g2g3', 'c1g5', 'e2e3'],
                    weights: [35, 25, 20, 10, 10],
                    'after_c2c4': {
                        name: "Dutch Main",
                        'g8f6': {
                            name: "Dutch Main Line",
                            moves: ['g1f3', 'b1c3', 'g2g3'],
                            weights: [45, 30, 25],
                            'after_g1f3': {
                                name: "Classical Dutch",
                                'e7e6': {
                                    name: "Stonewall Dutch",
                                    moves: ['g2g3', 'f1g2', 'e1g1'],
                                    weights: [45, 35, 20]
                                },
                                'g7g6': {
                                    name: "Leningrad Dutch",
                                    moves: ['g2g3', 'f1g2', 'e1g1'],
                                    weights: [45, 35, 20]
                                }
                            }
                        }
                    },
                    'after_g1f3': {
                        name: "Dutch with Nf3",
                        'g8f6': {
                            name: "Dutch Main",
                            moves: ['c2c4', 'g2g3', 'e2e3'],
                            weights: [50, 30, 20]
                        }
                    },
                    'after_g2g3': {
                        name: "Dutch Leningrad Setup",
                        'g8f6': {
                            name: "Leningrad Dutch",
                            moves: ['f1g2', 'c2c4', 'g1f3'],
                            weights: [50, 30, 20]
                        }
                    }
                },
                // Against e6 (Horwitz Defense)
                'e7e6': {
                    name: "Horwitz Defense",
                    moves: ['c2c4', 'g1f3', 'b1c3', 'e2e4'],
                    weights: [45, 25, 20, 10]
                },
                // Against d6 (Old Indian)
                'd7d6': {
                    name: "Old Indian Defense",
                    moves: ['c2c4', 'g1f3', 'b1c3', 'e2e4'],
                    weights: [40, 30, 20, 10]
                }
            },

            // ========== c4 OPENINGS (English) ==========
            'c2c4': {
                name: "English Opening",
                'e7e5': {
                    name: "English Symmetrical",
                    moves: ['b1c3', 'g1f3', 'g2g3', 'e2e3'],
                    weights: [40, 30, 20, 10],
                    'after_b1c3': {
                        name: "English Main",
                        'g8f6': {
                            name: "Four Knights English",
                            moves: ['g1f3', 'g2g3', 'e2e3', 'd2d4'],
                            weights: [35, 30, 20, 15],
                            'after_g1f3': {
                                name: "English Four Knights",
                                'b8c6': {
                                    name: "Four Knights Main",
                                    moves: ['g2g3', 'e2e3', 'd2d4'],
                                    weights: [45, 35, 20]
                                }
                            }
                        },
                        'f8c5': {
                            name: "English Classical",
                            moves: ['g1f3', 'e2e3', 'g2g3'],
                            weights: [45, 35, 20]
                        },
                        'f8b4': {
                            name: "English with Bb4",
                            moves: ['g1f3', 'e2e3', 'd2d4'],
                            weights: [45, 35, 20]
                        }
                    }
                },
                'c7c5': {
                    name: "English Symmetrical",
                    moves: ['b1c3', 'g1f3', 'g2g3', 'e2e3'],
                    weights: [40, 30, 20, 10],
                    'after_b1c3': {
                        name: "Symmetrical English",
                        'g8f6': {
                            name: "Symmetrical Main",
                            moves: ['g1f3', 'g2g3', 'e2e3'],
                            weights: [45, 35, 20]
                        }
                    }
                },
                'g8f6': {
                    name: "English Indian",
                    moves: ['b1c3', 'g1f3', 'g2g3', 'e2e3'],
                    weights: [40, 30, 20, 10]
                },
                'e7e6': {
                    name: "English with e6",
                    moves: ['b1c3', 'g1f3', 'g2g3', 'e2e4'],
                    weights: [40, 30, 20, 10]
                }
            },

            // ========== Nf3 OPENINGS ==========
            'g1f3': {
                name: "Reti Opening",
                'd7d5': {
                    name: "Reti Main Line",
                    moves: ['c2c4', 'g2g3', 'd2d4', 'e2e3'],
                    weights: [40, 30, 20, 10],
                    'after_c2c4': {
                        name: "Reti Accepted",
                        'g8f6': {
                            name: "Reti Main",
                            moves: ['g2g3', 'd2d4', 'b1c3'],
                            weights: [45, 35, 20]
                        },
                        'd5c4': {
                            name: "Reti Gambit",
                            moves: ['e2e3', 'f1c4', 'd2d4'],
                            weights: [50, 30, 20]
                        }
                    }
                },
                'g8f6': {
                    name: "Reti Indian",
                    moves: ['c2c4', 'g2g3', 'd2d4'],
                    weights: [45, 35, 20]
                }
            }
        };
    }

    initializeEndgameDatabase() {
        return {
            kingPawn: {
                'opposition': 'critical_squares_rule',
                'pawn_promotion': 'king_and_pawn_vs_king',
                'triangulation': 'tempo_gaining',
                'square_of_pawn': 'race_to_promotion'
            },
            rookEndgames: {
                'lucena_position': 'winning_technique',
                'philidor_position': 'drawing_technique',
                'rook_and_pawn': 'cut_off_technique',
                'rook_vs_pawn': 'drawish_positions'
            },
            queenEndgames: {
                'queen_vs_pawn': 'stalemate_tricks',
                'queen_vs_rook': 'back_rank_mate',
                'queen_endgames': 'centralization_key'
            },
            bishopEndgames: {
                'wrong_colored_bishop': 'drawish',
                'opposite_colored_bishops': 'theoretical_draw',
                'same_colored_bishops': 'winning_potential'
            },
            knightEndgames: {
                'knight_vs_pawn': 'forking_squares',
                'knight_outposts': 'domination_technique'
            }
        };
    }

    getOpeningRecommendation(moveHistory) {
        if (moveHistory.length === 0) {
            const firstMoves = ['e2e4', 'd2d4', 'c2c4', 'g1f3'];
            const weights = [50, 35, 10, 5];
            const selected = this.weightedRandomChoice(firstMoves, weights);
            console.log(`📖 Opening book: Playing ${selected} (${this.getOpeningName(selected)})`);
            return selected;
        }

        if (moveHistory.length === 1) {
            const lastMove = moveHistory[0];
            if (this.openingBook[lastMove]) {
                const responses = Object.keys(this.openingBook[lastMove]).filter(key => key !== 'name');
                const weights = responses.map(() => 1);
                const selected = this.weightedRandomChoice(responses, weights);
                const openingName = this.openingBook[lastMove][selected]?.name || this.getOpeningName(selected);
                console.log(`📖 Opening book: Responding to ${lastMove} with ${selected} (${openingName})`);
                return selected;
            }
        }

        if (moveHistory.length >= 2) {
            const move1 = moveHistory[moveHistory.length - 2];
            const move2 = moveHistory[moveHistory.length - 1];
            
            if (this.openingBook[move1] && 
                this.openingBook[move1][move2] && 
                this.openingBook[move1][move2]['after_' + move1]) {
                const afterKey = 'after_' + move1;
                const subBook = this.openingBook[move1][move2][afterKey];
                if (subBook && moveHistory.length >= 3) {
                    const move3 = moveHistory[moveHistory.length - 3];
                    if (subBook[move3]) {
                        const selected = this.weightedRandomChoice(
                            subBook[move3].moves, 
                            subBook[move3].weights
                        );
                        console.log(`📖 Opening book: Deep line - ${move1} ${move2} ${move3} → ${selected} (${subBook[move3].name})`);
                        return selected;
                    }
                }
                if (subBook) {
                    const responses = Object.keys(subBook).filter(key => key !== 'name');
                    if (responses.length > 0) {
                        const weights = responses.map(() => 1);
                        const response = this.weightedRandomChoice(responses, weights);
                        if (subBook[response]) {
                            const selected = this.weightedRandomChoice(
                                subBook[response].moves,
                                subBook[response].weights
                            );
                            console.log(`📖 Opening book: ${move1} ${move2} → ${response} → ${selected} (${subBook[response].name})`);
                            return selected;
                        }
                    }
                }
            }
            
            if (this.openingBook[move1] && this.openingBook[move1][move2]) {
                const data = this.openingBook[move1][move2];
                if (data.moves) {
                    const selected = this.weightedRandomChoice(data.moves, data.weights);
                    const openingName = data.name || this.getOpeningName(selected);
                    console.log(`📖 Opening book: ${move1} ${move2} → ${selected} (${openingName})`);
                    return selected;
                }
            }
        }

        console.log("📖 Opening book: No book move found, using AI calculation");
        return null;
    }

    getOpeningName(move) {
        const openingNames = {
            'e2e4': "King's Pawn Opening",
            'd2d4': "Queen's Pawn Opening",
            'c2c4': "English Opening",
            'g1f3': "Reti Opening",
            'e7e5': "Open Game",
            'c7c5': "Sicilian Defense",
            'e7e6': "French Defense",
            'c7c6': "Caro-Kann Defense",
            'd7d5': "Scandinavian Defense",
            'g8f6': "Indian Defense",
            'f7f5': "Dutch Defense"
        };
        return openingNames[move] || "Book Opening";
    }

    weightedRandomChoice(choices, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < choices.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return choices[i];
            }
        }
        return choices[0];
    }

    learnFromGame(gameData) {
        this.performanceHistory.push(gameData);
        
        if (gameData.moves && gameData.moves.length > 0) {
            const firstMove = gameData.moves[0];
            const playerColor = gameData.aiColor || (gameData.playerColors?.ai);
            
            if (playerColor === 'white') {
                this.openingStatistics.white[firstMove] = (this.openingStatistics.white[firstMove] || 0) + 1;
            } else {
                this.openingStatistics.black[firstMove] = (this.openingStatistics.black[firstMove] || 0) + 1;
            }
            this.openingStatistics.totalGames++;
        }
        
        console.log(`📚 AI learned from game: ${gameData.result}`);
        
        if (this.performanceHistory.length > 1000) {
            this.performanceHistory = this.performanceHistory.slice(-500);
        }
    }

    adjustDifficulty() {
        const winRate = this.getWinRate();
        if (winRate > 65) {
            this.difficulty = Math.min(10, this.difficulty + 1);
        } else if (winRate < 40) {
            this.difficulty = Math.max(1, this.difficulty - 1);
        }
        return this.difficulty;
    }

    getWinRate() {
        if (this.performanceHistory.length === 0) return 50;
        const wins = this.performanceHistory.filter(game => game.result === 'win').length;
        const draws = this.performanceHistory.filter(game => game.result === 'draw').length;
        return Math.round(((wins + draws * 0.5) / this.performanceHistory.length) * 100);
    }

    getOpeningStatistics() {
        return {
            white: this.openingStatistics.white,
            black: this.openingStatistics.black,
            totalGames: this.openingStatistics.totalGames,
            mostPlayedWhite: this.getMostPlayedOpening('white'),
            mostPlayedBlack: this.getMostPlayedOpening('black')
        };
    }

    getMostPlayedOpening(color) {
        const stats = color === 'white' ? this.openingStatistics.white : this.openingStatistics.black;
        let maxCount = 0;
        let mostPlayed = null;
        
        for (const [opening, count] of Object.entries(stats)) {
            if (count > maxCount) {
                maxCount = count;
                mostPlayed = opening;
            }
        }
        
        return mostPlayed ? { opening: mostPlayed, count: maxCount } : null;
    }

    exportLearningData() {
        return {
            version: this.version,
            performanceHistory: this.performanceHistory,
            openingStatistics: this.openingStatistics,
            difficulty: this.difficulty,
            winRate: this.getWinRate(),
            gamesPlayed: this.performanceHistory.length,
            timestamp: new Date().toISOString()
        };
    }

    importLearningData(data) {
        if (data.performanceHistory) {
            this.performanceHistory = data.performanceHistory;
        }
        if (data.openingStatistics) {
            this.openingStatistics = data.openingStatistics;
        }
        if (data.difficulty) {
            this.difficulty = data.difficulty;
        }
        console.log(`🔄 Imported AI data: ${this.performanceHistory.length} games, Win Rate: ${this.getWinRate()}%`);
    }

    analyzeOpening(moves) {
        if (!moves || moves.length < 2) return null;
        
        const openingMoves = moves.slice(0, Math.min(8, moves.length));
        const openingString = openingMoves.join(' ');
        
        // Italian Game
        if (openingString.includes('e2e4 e7e5 g1f3 b8c6 f1c4')) return 'Italian Game';
        if (openingString.includes('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5')) return 'Giuoco Piano';
        if (openingString.includes('e2e4 e7e5 g1f3 b8c6 f1c4 g8f6')) return 'Two Knights Defense';
        
        // Ruy Lopez
        if (openingString.includes('e2e4 e7e5 g1f3 b8c6 f1b5')) return 'Ruy Lopez';
        if (openingString.includes('e2e4 e7e5 g1f3 b8c6 f1b5 a7a6')) return 'Ruy Lopez (Morphy Defense)';
        
        // Sicilian Defense
        if (openingString.includes('e2e4 c7c5')) return 'Sicilian Defense';
        if (openingString.includes('e2e4 c7c5 g1f3 d7d6 d2d4')) return 'Sicilian Najdorf';
        if (openingString.includes('e2e4 c7c5 g1f3 e7e6 d2d4')) return 'Sicilian Scheveningen';
        if (openingString.includes('e2e4 c7c5 g1f3 b8c6 d2d4')) return 'Sicilian Classical';
        if (openingString.includes('e2e4 c7c5 g1f3 g8f6')) return 'Sicilian Dragon';
        
        // French Defense
        if (openingString.includes('e2e4 e7e6 d2d4 d7d5')) return 'French Defense';
        if (openingString.includes('e2e4 e7e6 d2d4 d7d5 b1c3')) return 'French Classical';
        if (openingString.includes('e2e4 e7e6 d2d4 d7d5 b1d2')) return 'French Tarrasch';
        
        // Caro-Kann
        if (openingString.includes('e2e4 c7c6 d2d4 d7d5')) return 'Caro-Kann Defense';
        
        // Queen's Gambit
        if (openingString.includes('d2d4 d7d5 c2c4')) return "Queen's Gambit";
        if (openingString.includes('d2d4 d7d5 c2c4 e7e6')) return "Queen's Gambit Declined";
        if (openingString.includes('d2d4 d7d5 c2c4 c7c6')) return 'Slav Defense';
        if (openingString.includes('d2d4 d7d5 c2c4 d5c4')) return "Queen's Gambit Accepted";
        
        // Indian Defenses
        if (openingString.includes('d2d4 g8f6 c2c4 e7e6')) return "Queen's Indian Defense";
        if (openingString.includes('d2d4 g8f6 c2c4 g7g6')) return "King's Indian Defense";
        if (openingString.includes('d2d4 g8f6 c2c4 e7e6 b1c3 f8b4')) return 'Nimzo-Indian Defense';
        if (openingString.includes('d2d4 g8f6 c2c4 c7c5')) return 'Benoni Defense';
        
        // English Opening
        if (openingString.includes('c2c4 e7e5')) return 'English Opening (Symmetrical)';
        if (openingString.includes('c2c4 c7c5')) return 'English Opening (Symmetrical)';
        
        return 'Book Opening';
    }

    getImprovementSuggestions() {
        const winRate = this.getWinRate();
        const suggestions = [];
        
        if (winRate < 40) {
            suggestions.push('Consider studying opening principles and tactical patterns');
            suggestions.push('Focus on piece development and king safety');
        } else if (winRate < 55) {
            suggestions.push('Study common tactical motifs (forks, pins, skewers)');
            suggestions.push('Work on positional understanding');
        } else if (winRate < 70) {
            suggestions.push('Deepen opening repertoire with specific variations');
            suggestions.push('Study endgame techniques');
        } else {
            suggestions.push('Excellent performance! Focus on master-level positional play');
        }
        
        suggestions.push('AI v2.0 - Enhanced compatibility with 3-move deep search engine!');
        suggestions.push('Master-level evaluation: Material Focus, Pawn Formation, Safe Squares, Castling Priority');
        
        return suggestions;
    }

    reset() {
        this.performanceHistory = [];
        this.positionEvaluations.clear();
        this.openingStatistics = {
            white: {},
            black: {},
            totalGames: 0
        };
        this.difficulty = 8;
        console.log('🔄 AI data reset - Starting fresh with master-level configuration');
    }
}
