// chess-endgame.js
// Advanced Endgame System for Chess AI
// VERSION: 1.0 - Complete endgame knowledge base

class ChessEndgameEngine {
    constructor() {
        this.version = "1.0";
        
        // Endgame piece square tables (completely different from opening/middlegame)
        this.endgamePieceTables = this.initializeEndgamePieceTables();
        
        // Endgame book - specific endgame positions and winning techniques
        this.endgameBook = this.initializeEndgameBook();
        
        // Checkmate patterns database
        this.checkmatePatterns = this.initializeCheckmatePatterns();
        
        // Endgame piece logic
        this.pieceLogic = this.initializePieceLogic();
        
        // Endgame principles
        this.endgamePrinciples = this.initializeEndgamePrinciples();
        
        console.log(`📚 Endgame Engine v${this.version} initialized`);
        console.log("   - Specialized endgame piece tables");
        console.log("   - Endgame book with winning techniques");
        console.log("   - Checkmate pattern database");
        console.log("   - Advanced piece logic for endgames");
    }

    initializeEndgamePieceTables() {
        return {
            // King becomes extremely active in endgame
            '♔': [
                [50, 60, 70, 80, 80, 70, 60, 50],
                [60, 70, 80, 90, 90, 80, 70, 60],
                [70, 80, 90, 100, 100, 90, 80, 70],
                [80, 90, 100, 110, 110, 100, 90, 80],
                [90, 100, 110, 120, 120, 110, 100, 90],
                [70, 80, 90, 100, 100, 90, 80, 70],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [30, 40, 50, 60, 60, 50, 40, 30]
            ],
            '♚': [
                [30, 40, 50, 60, 60, 50, 40, 30],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [70, 80, 90, 100, 100, 90, 80, 70],
                [90, 100, 110, 120, 120, 110, 100, 90],
                [80, 90, 100, 110, 110, 100, 90, 80],
                [70, 80, 90, 100, 100, 90, 80, 70],
                [60, 70, 80, 90, 90, 80, 70, 60],
                [50, 60, 70, 80, 80, 70, 60, 50]
            ],
            
            // Queen becomes more aggressive in endgame
            '♕': [
                [10, 20, 30, 40, 40, 30, 20, 10],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [40, 50, 60, 70, 70, 60, 50, 40],
                [40, 50, 60, 70, 70, 60, 50, 40],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [10, 20, 30, 40, 40, 30, 20, 10]
            ],
            '♛': [
                [10, 20, 30, 40, 40, 30, 20, 10],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [40, 50, 60, 70, 70, 60, 50, 40],
                [40, 50, 60, 70, 70, 60, 50, 40],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [10, 20, 30, 40, 40, 30, 20, 10]
            ],
            
            // Rook belongs on open files in endgame
            '♖': [
                [10, 20, 30, 40, 40, 30, 20, 10],
                [15, 25, 35, 45, 45, 35, 25, 15],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [15, 25, 35, 45, 45, 35, 25, 15],
                [10, 20, 30, 40, 40, 30, 20, 10]
            ],
            '♜': [
                [10, 20, 30, 40, 40, 30, 20, 10],
                [15, 25, 35, 45, 45, 35, 25, 15],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [15, 25, 35, 45, 45, 35, 25, 15],
                [10, 20, 30, 40, 40, 30, 20, 10]
            ],
            
            // Bishop becomes powerful with open diagonals
            '♗': [
                [20, 30, 40, 50, 50, 40, 30, 20],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [40, 50, 60, 70, 70, 60, 50, 40],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [40, 50, 60, 70, 70, 60, 50, 40],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [20, 30, 40, 50, 50, 40, 30, 20]
            ],
            '♝': [
                [20, 30, 40, 50, 50, 40, 30, 20],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [40, 50, 60, 70, 70, 60, 50, 40],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [40, 50, 60, 70, 70, 60, 50, 40],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [20, 30, 40, 50, 50, 40, 30, 20]
            ],
            
            // Knight loses some value in endgame but still useful
            '♘': [
                [10, 20, 30, 40, 40, 30, 20, 10],
                [15, 25, 35, 45, 45, 35, 25, 15],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [15, 25, 35, 45, 45, 35, 25, 15],
                [10, 20, 30, 40, 40, 30, 20, 10]
            ],
            '♞': [
                [10, 20, 30, 40, 40, 30, 20, 10],
                [15, 25, 35, 45, 45, 35, 25, 15],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [20, 30, 40, 50, 50, 40, 30, 20],
                [15, 25, 35, 45, 45, 35, 25, 15],
                [10, 20, 30, 40, 40, 30, 20, 10]
            ],
            
            // Pawns become extremely valuable in endgame
            '♙': [
                [0, 0, 0, 0, 0, 0, 0, 0],
                [10, 10, 10, 10, 10, 10, 10, 10],
                [20, 20, 20, 20, 20, 20, 20, 20],
                [30, 30, 30, 30, 30, 30, 30, 30],
                [40, 40, 40, 40, 40, 40, 40, 40],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [60, 60, 60, 60, 60, 60, 60, 60],
                [100, 100, 100, 100, 100, 100, 100, 100]
            ],
            '♟': [
                [100, 100, 100, 100, 100, 100, 100, 100],
                [60, 60, 60, 60, 60, 60, 60, 60],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [40, 40, 40, 40, 40, 40, 40, 40],
                [30, 30, 30, 30, 30, 30, 30, 30],
                [20, 20, 20, 20, 20, 20, 20, 20],
                [10, 10, 10, 10, 10, 10, 10, 10],
                [0, 0, 0, 0, 0, 0, 0, 0]
            ]
        };
    }

    initializeEndgameBook() {
        return {
            // King and pawn endgames
            kingPawn: {
                "K+P vs K": {
                    condition: "White has king and pawn, black only king",
                    technique: "Opposition and square of the pawn",
                    moves: [
                        "Occupy the square in front of the pawn",
                        "Use opposition to force the king away",
                        "Push pawn when king is in opposition"
                    ],
                    evaluation: 50
                },
                "K+2P vs K": {
                    condition: "White has king and two connected pawns",
                    technique: "Connected passed pawns are winning",
                    moves: [
                        "Advance pawns together",
                        "Use one pawn to defend the other",
                        "King escorts the pawns"
                    ],
                    evaluation: 80
                },
                "K+P vs K+P": {
                    condition: "Both sides have king and pawn",
                    technique: "Pawn race and king activity",
                    moves: [
                        "Count the number of moves to promotion",
                        "Use king to block opponent's pawn",
                        "Create a passed pawn"
                    ],
                    evaluation: 30
                },
                "Opposition": {
                    condition: "Kings facing each other with one square between",
                    technique: "Critical for king and pawn endgames",
                    moves: [
                        "Move to take opposition",
                        "Force opponent's king to move sideways",
                        "Penetrate with your king"
                    ],
                    evaluation: 40
                }
            },
            
            // Rook endgames
            rookEndgames: {
                "Lucena Position": {
                    condition: "Rook and pawn vs rook, pawn on 7th rank",
                    technique: "Building a bridge to shield king",
                    moves: [
                        "Bring king to support pawn",
                        "Use rook to shield from checks",
                        "Build a bridge on the 4th rank"
                    ],
                    evaluation: 100,
                    isWinning: true
                },
                "Philidor Position": {
                    condition: "Rook and pawn vs rook, defending side",
                    technique: "Keep rook on 3rd rank to prevent king advance",
                    moves: [
                        "Keep rook on 3rd rank",
                        "Give checks when king advances",
                        "Stay in front of the pawn"
                    ],
                    evaluation: 0,
                    isDraw: true
                },
                "R+2P vs R": {
                    condition: "Rook and two pawns vs rook",
                    technique: "Create passed pawn, trade rooks",
                    moves: [
                        "Connect the pawns",
                        "Trade rooks if possible",
                        "Create a passed pawn"
                    ],
                    evaluation: 70
                },
                "R+4P vs R+3P": {
                    condition: "Rook endgames with pawn advantage",
                    technique: "Exchange rooks to convert to king and pawn",
                    moves: [
                        "Simplify by trading rooks",
                        "Create a passed pawn",
                        "Use active rook"
                    ],
                    evaluation: 60
                }
            },
            
            // Queen endgames
            queenEndgames: {
                "Q+P vs Q": {
                    condition: "Queen and pawn vs queen",
                    technique: "Stalemate tricks and perpetual check",
                    moves: [
                        "Bring king closer to pawn",
                        "Use queen to give checks",
                        "Watch for stalemate"
                    ],
                    evaluation: 40
                },
                "Q+2P vs Q": {
                    condition: "Queen and two pawns vs queen",
                    technique: "Create two threats",
                    moves: [
                        "Advance pawns together",
                        "Use queen to support pawns",
                        "Force queen trade"
                    ],
                    evaluation: 70
                },
                "Q+K vs K": {
                    condition: "Queen and king vs lone king",
                    technique: "Basic checkmate",
                    moves: [
                        "Bring king closer",
                        "Use queen to cut off squares",
                        "Deliver checkmate on edge"
                    ],
                    evaluation: 100,
                    isWinning: true
                }
            },
            
            // Bishop and knight endgames
            bishopEndgames: {
                "B+K vs K": {
                    condition: "Bishop and king vs lone king",
                    technique: "Cannot checkmate with lone bishop",
                    evaluation: 0,
                    isDraw: true
                },
                "B+P vs B": {
                    condition: "Bishop and pawn vs bishop",
                    technique: "Wrong colored bishop can draw",
                    moves: [
                        "Check bishop color vs promotion square",
                        "If wrong color, blockade pawn",
                        "If right color, win"
                    ],
                    evaluation: 20
                },
                "OppositeColoredBishops": {
                    condition: "Bishops on opposite colors",
                    technique: "Drawish even with pawn disadvantage",
                    moves: [
                        "Blockade pawns on your color",
                        "Trade pieces to simplify",
                        "Aim for fortress"
                    ],
                    evaluation: 10
                }
            },
            
            knightEndgames: {
                "N+K vs K": {
                    condition: "Knight and king vs lone king",
                    technique: "Cannot checkmate with lone knight",
                    evaluation: 0,
                    isDraw: true
                },
                "N+P vs N": {
                    condition: "Knight and pawn vs knight",
                    technique: "Knights are good defenders",
                    moves: [
                        "Use knight to block pawn",
                        "Keep knight centralized",
                        "Aim to trade knights"
                    ],
                    evaluation: 30
                }
            }
        };
    }

    initializeCheckmatePatterns() {
        return {
            // Basic checkmates
            "Queen and King": {
                pieces: ["♕", "♔"],
                pattern: "Drive king to edge, deliver checkmate",
                steps: [
                    "Bring king to support queen",
                    "Use queen to cut off squares",
                    "Force king to edge",
                    "Deliver checkmate"
                ],
                sequence: [
                    { from: [7, 4], to: [7, 5] }, // King move
                    { from: [7, 3], to: [7, 4] }, // Queen move
                    { from: [7, 4], to: [6, 4] }  // Deliver mate
                ]
            },
            "Two Rooks": {
                pieces: ["♖", "♖", "♔"],
                pattern: "Alternating checks to drive king to edge",
                steps: [
                    "Use rooks on adjacent files",
                    "Alternate checks",
                    "Force king to edge",
                    "Deliver mate on back rank"
                ]
            },
            "Rook and King": {
                pieces: ["♖", "♔"],
                pattern: "Use king to support rook, drive opponent to edge",
                steps: [
                    "Place rook on file next to king",
                    "Use king to cut off squares",
                    "Force king to edge",
                    "Deliver checkmate"
                ]
            },
            "Two Bishops": {
                pieces: ["♗", "♗", "♔"],
                pattern: "Use bishops on adjacent diagonals",
                steps: [
                    "Control center with bishops",
                    "Drive king to corner",
                    "Use king to support",
                    "Deliver mate"
                ]
            },
            "Bishop and Knight": {
                pieces: ["♗", "♘", "♔"],
                pattern: "Complex, requires precise coordination",
                steps: [
                    "Drive king to same color as bishop",
                    "Corner king",
                    "Use knight to cover escape squares",
                    "Deliver checkmate"
                ],
                difficulty: "hard"
            },
            
            // Common checkmate patterns
            "Back Rank Mate": {
                pattern: "King trapped behind pawns, rook or queen delivers mate",
                conditions: ["King on back rank", "Pawns in front", "No escape squares"]
            },
            "Smothered Mate": {
                pattern: "Knight delivers checkmate, king surrounded by own pieces",
                conditions: ["Knight gives check", "King cannot move", "All squares blocked"]
            },
            "Anastasia's Mate": {
                pattern: "Rook and knight coordinate to deliver checkmate",
                conditions: ["Knight covers escape squares", "Rook delivers check"]
            },
            "Epaulette Mate": {
                pattern: "Queen delivers checkmate with rooks on either side of king",
                conditions: ["Queen gives check", "Rooks block escape squares"]
            },
            "Boden's Mate": {
                pattern: "Two bishops deliver checkmate in cross pattern",
                conditions: ["Bishops on opposite colors", "King in center"]
            }
        };
    }

    initializePieceLogic() {
        return {
            king: {
                endgameValue: 400, // King is worth 4 pawns in endgame
                activityBonus: 50,
                oppositionPriority: 0.8,
                shouldMoveForward: true,
                shouldCapture: true,
                distanceToCenter: {
                    formula: "14 - (|row-3.5| + |col-3.5|)",
                    maxBonus: 120
                }
            },
            queen: {
                endgameValue: 950,
                activityBonus: 40,
                shouldSupportPawns: true,
                shouldGiveChecks: true,
                shouldAvoidTrade: false, // Queen trades are often good in endgame
                mobilityPriority: 0.9
            },
            rook: {
                endgameValue: 550,
                activityBonus: 60,
                openFileBonus: 80,
                seventhRankBonus: 100,
                shouldSupportPawns: true,
                shouldTrade: false, // Rooks are powerful in endgame
                behindPassedPawnBonus: 70
            },
            bishop: {
                endgameValue: 350,
                activityBonus: 30,
                colorComplexion: {
                    importance: 0.7,
                    sameColorAsPawnsBonus: 30
                },
                shouldControlCenter: true,
                shouldSupportPawns: true
            },
            knight: {
                endgameValue: 320,
                activityBonus: 25,
                outpostBonus: 40,
                shouldBeCentralized: true,
                forkPotential: 0.6
            },
            pawn: {
                endgameValue: 120, // Pawns are worth more in endgame
                promotionBonus: 500,
                passedPawnBonus: 150,
                connectedPawnBonus: 50,
                isolatedPawnPenalty: -30,
                shouldAdvance: true,
                kingEscortBonus: 40
            }
        };
    }

    initializeEndgamePrinciples() {
        return {
            "King Activity": {
                principle: "The king becomes a powerful attacking piece",
                priority: 0.95,
                implementation: "Move king toward center, use to support pawns"
            },
            "Passed Pawns": {
                principle: "Passed pawns are winning chances",
                priority: 0.9,
                implementation: "Create and advance passed pawns"
            },
            "Rook on Seventh": {
                principle: "Rook on seventh rank attacks pawns",
                priority: 0.85,
                implementation: "Place rook on opponent's second rank"
            },
            "Bishop vs Knight": {
                principle: "Bishop better in open positions",
                priority: 0.7,
                implementation: "Trade knight for bishop in open endgames"
            },
            "Opposition": {
                principle: "Critical for king and pawn endgames",
                priority: 0.9,
                implementation: "Take and maintain opposition"
            },
            "Simplification": {
                principle: "Trade pieces when ahead in material",
                priority: 0.8,
                implementation: "Exchange pieces to convert advantage"
            },
            "Zugzwang": {
                principle: "Force opponent into zugzwang",
                priority: 0.7,
                implementation: "Create positions where any move worsens position"
            },
            "Stalemate Avoidance": {
                principle: "Avoid stalemate when winning",
                priority: 0.9,
                implementation: "Leave escape squares, don't over-constrict"
            }
        };
    }

    // Check if position is a known winning endgame
    isWinningEndgame(board, currentPlayer) {
        const material = this.analyzeMaterial(board);
        const phase = this.detectEndgamePhase(board);
        
        // Check against endgame book
        for (const category in this.endgameBook) {
            for (const position in this.endgameBook[category]) {
                const entry = this.endgameBook[category][position];
                if (entry.condition && this.matchesCondition(entry.condition, material, phase)) {
                    if (entry.isWinning) return true;
                    if (entry.isDraw) return false;
                }
            }
        }
        
        return null;
    }

    analyzeMaterial(board) {
        let whitePieces = { king: false, queen: 0, rooks: 0, bishops: 0, knights: 0, pawns: 0 };
        let blackPieces = { king: false, queen: 0, rooks: 0, bishops: 0, knights: 0, pawns: 0 };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row] && board[row][col];
                if (piece) {
                    switch(piece) {
                        case '♔': whitePieces.king = true; break;
                        case '♕': whitePieces.queen++; break;
                        case '♖': whitePieces.rooks++; break;
                        case '♗': whitePieces.bishops++; break;
                        case '♘': whitePieces.knights++; break;
                        case '♙': whitePieces.pawns++; break;
                        case '♚': blackPieces.king = true; break;
                        case '♛': blackPieces.queen++; break;
                        case '♜': blackPieces.rooks++; break;
                        case '♝': blackPieces.bishops++; break;
                        case '♞': blackPieces.knights++; break;
                        case '♟': blackPieces.pawns++; break;
                    }
                }
            }
        }
        
        return { white: whitePieces, black: blackPieces };
    }

    detectEndgamePhase(board) {
        const material = this.analyzeMaterial(board);
        const totalWhitePieces = Object.values(material.white).reduce((a,b) => a + (typeof b === 'number' ? b : 0), 0);
        const totalBlackPieces = Object.values(material.black).reduce((a,b) => a + (typeof b === 'number' ? b : 0), 0);
        const totalPieces = totalWhitePieces + totalBlackPieces;
        
        if (totalPieces <= 6) return "pure_endgame";
        if (totalPieces <= 10) return "early_endgame";
        if (totalPieces <= 14) return "late_middlegame";
        return "middlegame";
    }

    matchesCondition(condition, material, phase) {
        // Simple condition matching - can be expanded
        if (condition.includes("king and pawn") && material.white.pawns + material.black.pawns === 1) {
            return true;
        }
        if (condition.includes("rook and pawn") && (material.white.rooks + material.black.rooks === 1)) {
            return true;
        }
        if (condition.includes("queen and pawn") && (material.white.queen + material.black.queen === 1)) {
            return true;
        }
        return false;
    }

    // Evaluate endgame-specific position
    evaluateEndgamePosition(board, player, phase) {
        let score = 0;
        
        // King activity
        const kingPos = this.findKing(board, player);
        if (kingPos) {
            const centerDistance = Math.abs(3.5 - kingPos.row) + Math.abs(3.5 - kingPos.col);
            const kingActivity = (14 - centerDistance) * this.pieceLogic.king.activityBonus;
            score += kingActivity;
        }
        
        // Pawn structure
        const pawns = this.findPawns(board, player);
        for (const pawn of pawns) {
            // Passed pawn bonus
            if (this.isPassedPawn(board, pawn.row, pawn.col, player)) {
                score += this.pieceLogic.pawn.passedPawnBonus;
                
                // Distance to promotion
                const distanceToPromotion = player === 'white' ? pawn.row : 7 - pawn.row;
                score += (7 - distanceToPromotion) * 10;
            }
            
            // Connected pawns bonus
            if (this.hasAdjacentPawn(board, pawn.row, pawn.col, player)) {
                score += this.pieceLogic.pawn.connectedPawnBonus;
            }
            
            // Isolated pawn penalty
            if (this.isIsolatedPawn(board, pawn.col, player)) {
                score += this.pieceLogic.pawn.isolatedPawnPenalty;
            }
        }
        
        // Rook on open file
        const rooks = this.findRooks(board, player);
        for (const rook of rooks) {
            if (this.isOpenFile(board, rook.col)) {
                score += this.pieceLogic.rook.openFileBonus;
            }
            if (this.isSeventhRank(rook.row, player)) {
                score += this.pieceLogic.rook.seventhRankBonus;
            }
        }
        
        // Bishop color advantage
        const bishops = this.findBishops(board, player);
        for (const bishop of bishops) {
            const pawnsOnSameColor = this.countPawnsOnColor(board, player, bishop.row, bishop.col);
            score += pawnsOnSameColor * this.pieceLogic.bishop.colorComplexion.sameColorAsPawnsBonus;
        }
        
        // Apply phase modifiers
        if (phase === "pure_endgame") {
            score *= 1.5; // Double importance in pure endgame
        } else if (phase === "early_endgame") {
            score *= 1.2;
        }
        
        return score;
    }

    findKing(board, player) {
        const kingSymbol = player === 'white' ? '♔' : '♚';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row] && board[row][col] === kingSymbol) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    findPawns(board, player) {
        const pawnSymbol = player === 'white' ? '♙' : '♟';
        const pawns = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row] && board[row][col] === pawnSymbol) {
                    pawns.push({ row, col });
                }
            }
        }
        return pawns;
    }

    findRooks(board, player) {
        const rookSymbol = player === 'white' ? '♖' : '♜';
        const rooks = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row] && board[row][col] === rookSymbol) {
                    rooks.push({ row, col });
                }
            }
        }
        return rooks;
    }

    findBishops(board, player) {
        const bishopSymbol = player === 'white' ? '♗' : '♝';
        const bishops = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row] && board[row][col] === bishopSymbol) {
                    bishops.push({ row, col });
                }
            }
        }
        return bishops;
    }

    isPassedPawn(board, row, col, player) {
        const direction = player === 'white' ? -1 : 1;
        const startRow = player === 'white' ? row - 1 : row + 1;
        const endRow = player === 'white' ? 0 : 7;
        
        for (let r = startRow; player === 'white' ? r >= endRow : r <= endRow; r += direction) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (c >= 0 && c < 8) {
                    const piece = board[r] && board[r][c];
                    if (piece && (piece === '♟' || piece === '♙')) {
                        const pieceColor = piece === '♟' ? 'black' : 'white';
                        if (pieceColor !== player) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    hasAdjacentPawn(board, row, col, player) {
        const pawnSymbol = player === 'white' ? '♙' : '♟';
        for (let c = col - 1; c <= col + 1; c += 2) {
            if (c >= 0 && c < 8 && board[row] && board[row][c] === pawnSymbol) {
                return true;
            }
        }
        return false;
    }

    isIsolatedPawn(board, col, player) {
        const pawnSymbol = player === 'white' ? '♙' : '♟';
        for (let row = 0; row < 8; row++) {
            if (col > 0 && board[row] && board[row][col - 1] === pawnSymbol) return false;
            if (col < 7 && board[row] && board[row][col + 1] === pawnSymbol) return false;
        }
        return true;
    }

    isOpenFile(board, col) {
        for (let row = 0; row < 8; row++) {
            const piece = board[row] && board[row][col];
            if (piece && piece !== '♙' && piece !== '♟') return false;
        }
        return true;
    }

    isSeventhRank(row, player) {
        if (player === 'white') return row === 1;
        return row === 6;
    }

    countPawnsOnColor(board, player, bishopRow, bishopCol) {
        const pawnSymbol = player === 'white' ? '♙' : '♟';
        const isDarkSquare = (bishopRow + bishopCol) % 2 === 1;
        let count = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row] && board[row][col] === pawnSymbol) {
                    const squareIsDark = (row + col) % 2 === 1;
                    if (squareIsDark === isDarkSquare) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    // Get endgame-specific piece square value
    getEndgamePieceSquareValue(piece, row, col) {
        if (this.endgamePieceTables[piece]) {
            return this.endgamePieceTables[piece][row][col];
        }
        return 0;
    }

    // Check if current position is a known checkmate pattern
    isCheckmatePattern(board, player) {
        const kingPos = this.findKing(board, player);
        if (!kingPos) return null;
        
        // Back rank mate detection
        const backRank = player === 'white' ? 0 : 7;
        if (kingPos.row === backRank) {
            let hasEscape = false;
            for (let c = kingPos.col - 1; c <= kingPos.col + 1; c++) {
                if (c >= 0 && c < 8 && c !== kingPos.col) {
                    if (!board[backRank][c] && !this.isSquareAttacked(board, backRank, c, player)) {
                        hasEscape = true;
                        break;
                    }
                }
            }
            if (!hasEscape) {
                return "Back Rank Mate";
            }
        }
        
        return null;
    }

    isSquareAttacked(board, row, col, player) {
        // Simplified attack detection
        const opponent = player === 'white' ? 'black' : 'white';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r] && board[r][c];
                if (piece && this.isPlayerPiece(piece, opponent)) {
                    if (this.canPieceAttackSimple(piece, r, c, row, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isPlayerPiece(piece, player) {
        const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
        const blackPieces = ['♚', '♛', '♜', '♝', '♞', '♟'];
        return player === 'white' ? whitePieces.includes(piece) : blackPieces.includes(piece);
    }

    canPieceAttackSimple(piece, fromRow, fromCol, toRow, toCol) {
        const dx = Math.abs(toCol - fromCol);
        const dy = Math.abs(toRow - fromRow);
        
        switch(piece) {
            case '♙': return dx === 1 && toRow - fromRow === -1;
            case '♟': return dx === 1 && toRow - fromRow === 1;
            case '♘': case '♞': return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
            case '♗': case '♝': return dx === dy;
            case '♖': case '♜': return dx === 0 || dy === 0;
            case '♕': case '♛': return dx === dy || dx === 0 || dy === 0;
            case '♔': case '♚': return dx <= 1 && dy <= 1;
            default: return false;
        }
    }

    // Get endgame advice
    getEndgameAdvice(board, player) {
        const material = this.analyzeMaterial(board);
        const phase = this.detectEndgamePhase(board);
        const advice = [];
        
        // King activity advice
        advice.push("👑 Activate your king - it's a powerful piece in endgame!");
        
        // Passed pawn advice
        const passedPawns = this.findPawns(board, player).filter(p => this.isPassedPawn(board, p.row, p.col, player));
        if (passedPawns.length > 0) {
            advice.push(`🚀 You have ${passedPawns.length} passed pawn(s)! Push them forward!`);
        } else {
            advice.push("🎯 Try to create a passed pawn by advancing your pawn majority");
        }
        
        // Rook placement advice
        const rooks = this.findRooks(board, player);
        for (const rook of rooks) {
            if (this.isSeventhRank(rook.row, player)) {
                advice.push("⚡ Your rook is on the 7th rank! Attack enemy pawns!");
            } else if (this.isOpenFile(board, rook.col)) {
                advice.push("📡 Your rook is on an open file - great for activity!");
            } else {
                advice.push("🎯 Place your rook on open files or behind passed pawns");
            }
        }
        
        // Bishop advice
        const bishops = this.findBishops(board, player);
        if (bishops.length > 0) {
            advice.push("♗ In endgames, bishops are powerful on open diagonals");
        }
        
        // General principles
        advice.push("📖 Remember: Trade pieces when ahead, avoid trading when behind");
        advice.push("🏃 The king should move toward the center in endgames");
        
        return advice;
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessEndgameEngine;
}
