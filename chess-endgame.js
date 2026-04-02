// chess-endgame.js
// Advanced Endgame System for Chess AI
// VERSION: 1.1 - Optimized for speed with smarter decisions

class ChessEndgameEngine {
    constructor() {
        this.version = "1.1";
        
        // Cache for endgame evaluations to speed up calculations
        this.evaluationCache = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        
        // Endgame piece square tables (optimized for faster lookup)
        this.endgamePieceTables = this.initializeEndgamePieceTables();
        
        // Endgame book - specific endgame positions and winning techniques
        this.endgameBook = this.initializeEndgameBook();
        
        // Checkmate patterns database (simplified for speed)
        this.checkmatePatterns = this.initializeCheckmatePatterns();
        
        // Endgame piece logic with thresholds
        this.pieceLogic = this.initializePieceLogic();
        
        // Endgame principles with priority weights
        this.endgamePrinciples = this.initializeEndgamePrinciples();
        
        console.log(`📚 Endgame Engine v${this.version} initialized (Optimized for Speed)`);
        console.log("   - Evaluation caching enabled");
        console.log("   - Fast piece-square tables");
        console.log("   - Simplified endgame patterns");
    }

    initializeEndgamePieceTables() {
        // Compressed tables for faster access - fewer distinct values
        return {
            '♔': [
                [40, 50, 60, 70, 70, 60, 50, 40],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [60, 70, 80, 90, 90, 80, 70, 60],
                [70, 80, 90, 100, 100, 90, 80, 70],
                [70, 80, 90, 100, 100, 90, 80, 70],
                [60, 70, 80, 90, 90, 80, 70, 60],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [40, 50, 60, 70, 70, 60, 50, 40]
            ],
            '♚': [
                [40, 50, 60, 70, 70, 60, 50, 40],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [60, 70, 80, 90, 90, 80, 70, 60],
                [70, 80, 90, 100, 100, 90, 80, 70],
                [70, 80, 90, 100, 100, 90, 80, 70],
                [60, 70, 80, 90, 90, 80, 70, 60],
                [50, 60, 70, 80, 80, 70, 60, 50],
                [40, 50, 60, 70, 70, 60, 50, 40]
            ],
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
            '♖': [
                [20, 30, 40, 50, 50, 40, 30, 20],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [35, 45, 55, 65, 65, 55, 45, 35],
                [35, 45, 55, 65, 65, 55, 45, 35],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [20, 30, 40, 50, 50, 40, 30, 20]
            ],
            '♜': [
                [20, 30, 40, 50, 50, 40, 30, 20],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [35, 45, 55, 65, 65, 55, 45, 35],
                [35, 45, 55, 65, 65, 55, 45, 35],
                [30, 40, 50, 60, 60, 50, 40, 30],
                [25, 35, 45, 55, 55, 45, 35, 25],
                [20, 30, 40, 50, 50, 40, 30, 20]
            ],
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
            '♘': [
                [20, 30, 40, 45, 45, 40, 30, 20],
                [25, 35, 45, 50, 50, 45, 35, 25],
                [30, 40, 50, 55, 55, 50, 40, 30],
                [35, 45, 55, 60, 60, 55, 45, 35],
                [35, 45, 55, 60, 60, 55, 45, 35],
                [30, 40, 50, 55, 55, 50, 40, 30],
                [25, 35, 45, 50, 50, 45, 35, 25],
                [20, 30, 40, 45, 45, 40, 30, 20]
            ],
            '♞': [
                [20, 30, 40, 45, 45, 40, 30, 20],
                [25, 35, 45, 50, 50, 45, 35, 25],
                [30, 40, 50, 55, 55, 50, 40, 30],
                [35, 45, 55, 60, 60, 55, 45, 35],
                [35, 45, 55, 60, 60, 55, 45, 35],
                [30, 40, 50, 55, 55, 50, 40, 30],
                [25, 35, 45, 50, 50, 45, 35, 25],
                [20, 30, 40, 45, 45, 40, 30, 20]
            ],
            '♙': [
                [0, 0, 0, 0, 0, 0, 0, 0],
                [20, 20, 20, 20, 20, 20, 20, 20],
                [30, 30, 30, 30, 30, 30, 30, 30],
                [40, 40, 40, 40, 40, 40, 40, 40],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [60, 60, 60, 60, 60, 60, 60, 60],
                [70, 70, 70, 70, 70, 70, 70, 70],
                [100, 100, 100, 100, 100, 100, 100, 100]
            ],
            '♟': [
                [100, 100, 100, 100, 100, 100, 100, 100],
                [70, 70, 70, 70, 70, 70, 70, 70],
                [60, 60, 60, 60, 60, 60, 60, 60],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [40, 40, 40, 40, 40, 40, 40, 40],
                [30, 30, 30, 30, 30, 30, 30, 30],
                [20, 20, 20, 20, 20, 20, 20, 20],
                [0, 0, 0, 0, 0, 0, 0, 0]
            ]
        };
    }

    initializeEndgameBook() {
        // Simplified endgame book with faster pattern matching
        return {
            kingPawn: {
                "K+P vs K": {
                    condition: (material) => this.hasKingAndPawnVsKing(material),
                    evaluation: 50,
                    winningChance: 0.7
                },
                "K+2P vs K": {
                    condition: (material) => this.hasKingAndTwoPawnsVsKing(material),
                    evaluation: 80,
                    winningChance: 0.9
                },
                "Opposition": {
                    condition: (material, board) => this.hasOpposition(board),
                    evaluation: 40,
                    winningChance: 0.6
                }
            },
            rookEndgames: {
                "R+P vs R": {
                    condition: (material) => this.hasRookAndPawnVsRook(material),
                    evaluation: 70,
                    winningChance: 0.65
                },
                "Lucena Position": {
                    condition: (material, board) => this.isLucenaPosition(board),
                    evaluation: 100,
                    winningChance: 0.95
                }
            },
            queenEndgames: {
                "Q+K vs K": {
                    condition: (material) => this.hasQueenAndKingVsKing(material),
                    evaluation: 100,
                    winningChance: 1.0,
                    isWinning: true
                },
                "Q+P vs Q": {
                    condition: (material) => this.hasQueenAndPawnVsQueen(material),
                    evaluation: 40,
                    winningChance: 0.5
                }
            }
        };
    }

    initializeCheckmatePatterns() {
        // Simplified checkmate patterns for faster detection
        return {
            "QueenMate": {
                pattern: (board, kingPos) => this.detectQueenMate(board, kingPos),
                value: 100
            },
            "RookMate": {
                pattern: (board, kingPos) => this.detectRookMate(board, kingPos),
                value: 90
            },
            "BackRankMate": {
                pattern: (board, kingPos) => this.detectBackRankMate(board, kingPos),
                value: 85
            }
        };
    }

    initializePieceLogic() {
        return {
            king: {
                endgameValue: 400,
                activityBonus: 40,
                oppositionPriority: 0.8
            },
            queen: {
                endgameValue: 950,
                activityBonus: 30,
                shouldSupportPawns: true
            },
            rook: {
                endgameValue: 550,
                openFileBonus: 60,
                seventhRankBonus: 80,
                behindPassedPawnBonus: 60
            },
            bishop: {
                endgameValue: 350,
                activityBonus: 25,
                colorAdvantageBonus: 20
            },
            knight: {
                endgameValue: 320,
                activityBonus: 20,
                outpostBonus: 30
            },
            pawn: {
                endgameValue: 120,
                passedPawnBonus: 120,
                connectedPawnBonus: 40,
                isolatedPawnPenalty: -20,
                promotionBonus: 500
            }
        };
    }

    initializeEndgamePrinciples() {
        return {
            "KingActivity": { priority: 0.95, value: 50 },
            "PassedPawns": { priority: 0.9, value: 40 },
            "RookSeventh": { priority: 0.85, value: 35 },
            "Opposition": { priority: 0.9, value: 45 },
            "Simplification": { priority: 0.8, value: 30 }
        };
    }

    // Fast condition checks
    hasKingAndPawnVsKing(material) {
        const whitePawns = material.white.pawns;
        const blackPawns = material.black.pawns;
        return (whitePawns === 1 && blackPawns === 0) || (blackPawns === 1 && whitePawns === 0);
    }

    hasKingAndTwoPawnsVsKing(material) {
        const whitePawns = material.white.pawns;
        const blackPawns = material.black.pawns;
        return (whitePawns === 2 && blackPawns === 0) || (blackPawns === 2 && whitePawns === 0);
    }

    hasRookAndPawnVsRook(material) {
        return (material.white.rooks === 1 && material.black.rooks === 1 && 
                Math.abs(material.white.pawns - material.black.pawns) === 1);
    }

    hasQueenAndKingVsKing(material) {
        return (material.white.queen === 1 && material.black.queen === 0 && 
                material.white.pawns === 0 && material.black.pawns === 0) ||
               (material.black.queen === 1 && material.white.queen === 0 && 
                material.white.pawns === 0 && material.black.pawns === 0);
    }

    hasQueenAndPawnVsQueen(material) {
        return (material.white.queen === 1 && material.black.queen === 1 && 
                Math.abs(material.white.pawns - material.black.pawns) === 1);
    }

    hasOpposition(board) {
        const whiteKing = this.findKing(board, 'white');
        const blackKing = this.findKing(board, 'black');
        if (!whiteKing || !blackKing) return false;
        
        const fileDiff = Math.abs(whiteKing.col - blackKing.col);
        const rankDiff = Math.abs(whiteKing.row - blackKing.row);
        return (fileDiff === 2 && rankDiff === 0) || (fileDiff === 0 && rankDiff === 2);
    }

    isLucenaPosition(board) {
        // Simplified Lucena detection - pawn on 7th rank with rook
        for (let col = 0; col < 8; col++) {
            if (board[1] && board[1][col] === '♙') {
                for (let row = 0; row < 8; row++) {
                    if (board[row] && board[row][col] === '♖') return true;
                }
            }
            if (board[6] && board[6][col] === '♟') {
                for (let row = 0; row < 8; row++) {
                    if (board[row] && board[row][col] === '♜') return true;
                }
            }
        }
        return false;
    }

    detectQueenMate(board, kingPos) {
        // Simplified queen mate detection
        const attackerColor = board[kingPos.row][kingPos.col] === '♚' ? 'white' : 'black';
        const queenSymbol = attackerColor === 'white' ? '♕' : '♛';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === queenSymbol) {
                    const dx = Math.abs(row - kingPos.row);
                    const dy = Math.abs(col - kingPos.col);
                    if ((dx === 0 && dy === 1) || (dx === 1 && dy === 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    detectRookMate(board, kingPos) {
        // Simplified rook mate detection
        const attackerColor = board[kingPos.row][kingPos.col] === '♚' ? 'white' : 'black';
        const rookSymbol = attackerColor === 'white' ? '♖' : '♜';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === rookSymbol) {
                    if ((row === kingPos.row && Math.abs(col - kingPos.col) === 1) ||
                        (col === kingPos.col && Math.abs(row - kingPos.row) === 1)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    detectBackRankMate(board, kingPos) {
        // Check if king is on back rank with no escape
        const isWhiteKing = board[kingPos.row][kingPos.col] === '♔';
        const backRank = isWhiteKing ? 7 : 0;
        
        if (kingPos.row !== backRank) return false;
        
        // Check if all escape squares are occupied or attacked
        for (let col = kingPos.col - 1; col <= kingPos.col + 1; col++) {
            if (col >= 0 && col < 8 && col !== kingPos.col) {
                if (!board[backRank][col]) return false;
            }
        }
        return true;
    }

    // Fast endgame evaluation with caching
    evaluateEndgamePosition(board, player, phase) {
        // Create cache key
        const cacheKey = this.getPositionHash(board, player);
        
        // Check cache
        if (this.evaluationCache.has(cacheKey)) {
            this.cacheHits++;
            return this.evaluationCache.get(cacheKey);
        }
        
        this.cacheMisses++;
        
        let score = 0;
        
        // King activity (fast calculation)
        const kingPos = this.findKing(board, player);
        if (kingPos) {
            const centerDistance = Math.abs(3.5 - kingPos.row) + Math.abs(3.5 - kingPos.col);
            const kingActivity = (14 - centerDistance) * this.pieceLogic.king.activityBonus;
            score += kingActivity;
        }
        
        // Pawn structure (optimized)
        const pawns = this.findPawnsFast(board, player);
        let passedPawnCount = 0;
        
        for (const pawn of pawns) {
            // Passed pawn bonus (fast check)
            if (this.isPassedPawnFast(board, pawn.row, pawn.col, player)) {
                score += this.pieceLogic.pawn.passedPawnBonus;
                passedPawnCount++;
                
                // Distance to promotion bonus
                const distanceToPromotion = player === 'white' ? pawn.row : 7 - pawn.row;
                score += (7 - distanceToPromotion) * 15;
            }
            
            // Connected pawns (quick adjacency check)
            if (this.hasAdjacentPawnFast(board, pawn.row, pawn.col, player)) {
                score += this.pieceLogic.pawn.connectedPawnBonus;
            }
        }
        
        // Bonus for multiple passed pawns
        if (passedPawnCount >= 2) {
            score += 50;
        }
        
        // Rook bonuses (fast)
        const rooks = this.findRooksFast(board, player);
        for (const rook of rooks) {
            if (this.isOpenFileFast(board, rook.col)) {
                score += this.pieceLogic.rook.openFileBonus;
            }
            if (this.isSeventhRank(rook.row, player)) {
                score += this.pieceLogic.rook.seventhRankBonus;
            }
        }
        
        // Check for winning endgame patterns
        const material = this.analyzeMaterialFast(board);
        const winningPattern = this.checkWinningPattern(material, board, player);
        if (winningPattern) {
            score += winningPattern;
        }
        
        // Apply phase multiplier
        if (phase === "pure_endgame") {
            score = Math.floor(score * 1.3);
        }
        
        // Cache the result (with expiration)
        this.evaluationCache.set(cacheKey, score);
        
        // Limit cache size
        if (this.evaluationCache.size > 1000) {
            const toDelete = Array.from(this.evaluationCache.keys()).slice(0, 200);
            for (const key of toDelete) {
                this.evaluationCache.delete(key);
            }
        }
        
        return score;
    }

    getPositionHash(board, player) {
        let hash = player + "|";
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                hash += (board[row] && board[row][col]) || ".";
            }
        }
        return hash;
    }

    checkWinningPattern(material, board, player) {
        // Fast winning pattern detection
        for (const category in this.endgameBook) {
            for (const pattern in this.endgameBook[category]) {
                const entry = this.endgameBook[category][pattern];
                if (entry.condition(material, board)) {
                    return entry.evaluation;
                }
            }
        }
        return 0;
    }

    // Fast helper functions
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

    findPawnsFast(board, player) {
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

    findRooksFast(board, player) {
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

    isPassedPawnFast(board, row, col, player) {
        const direction = player === 'white' ? -1 : 1;
        const endRow = player === 'white' ? 0 : 7;
        const opponentPawn = player === 'white' ? '♟' : '♙';
        
        for (let r = row + direction; player === 'white' ? r >= endRow : r <= endRow; r += direction) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (c >= 0 && c < 8 && board[r] && board[r][c] === opponentPawn) {
                    return false;
                }
            }
        }
        return true;
    }

    hasAdjacentPawnFast(board, row, col, player) {
        const pawnSymbol = player === 'white' ? '♙' : '♟';
        for (let c = col - 1; c <= col + 1; c += 2) {
            if (c >= 0 && c < 8 && board[row] && board[row][c] === pawnSymbol) {
                return true;
            }
        }
        return false;
    }

    isOpenFileFast(board, col) {
        for (let row = 0; row < 8; row++) {
            const piece = board[row] && board[row][col];
            if (piece === '♙' || piece === '♟') return false;
        }
        return true;
    }

    isSeventhRank(row, player) {
        if (player === 'white') return row === 1;
        return row === 6;
    }

    analyzeMaterialFast(board) {
        let whitePawns = 0, blackPawns = 0;
        let whiteRooks = 0, blackRooks = 0;
        let whiteQueens = 0, blackQueens = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row] && board[row][col];
                switch(piece) {
                    case '♙': whitePawns++; break;
                    case '♟': blackPawns++; break;
                    case '♖': whiteRooks++; break;
                    case '♜': blackRooks++; break;
                    case '♕': whiteQueens++; break;
                    case '♛': blackQueens++; break;
                }
            }
        }
        
        return {
            white: { pawns: whitePawns, rooks: whiteRooks, queen: whiteQueens },
            black: { pawns: blackPawns, rooks: blackRooks, queen: blackQueens }
        };
    }

    // Fast phase detection
    detectEndgamePhase(board) {
        let pieceCount = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row] && board[row][col];
                if (piece && piece !== '♔' && piece !== '♚') {
                    pieceCount++;
                }
            }
        }
        
        if (pieceCount <= 6) return "pure_endgame";
        if (pieceCount <= 10) return "early_endgame";
        return "middlegame";
    }

    // Fast endgame piece square value
    getEndgamePieceSquareValue(piece, row, col) {
        if (this.endgamePieceTables[piece]) {
            return this.endgamePieceTables[piece][row][col];
        }
        return 0;
    }

    // Get endgame advice (simplified for speed)
    getEndgameAdvice(board, player) {
        const material = this.analyzeMaterialFast(board);
        const advice = [];
        
        // Simple rule-based advice
        const whiteKing = this.findKing(board, 'white');
        const blackKing = this.findKing(board, 'black');
        
        if (whiteKing && blackKing) {
            const distance = Math.abs(whiteKing.row - blackKing.row) + Math.abs(whiteKing.col - blackKing.col);
            if (distance < 3) {
                advice.push("👑 Kings are close - watch for checks and forks!");
            }
        }
        
        const whitePawns = this.findPawnsFast(board, 'white').length;
        const blackPawns = this.findPawnsFast(board, 'black').length;
        
        if (whitePawns > blackPawns) {
            advice.push("♙ You have more pawns! Try to create passed pawns.");
        } else if (blackPawns > whitePawns) {
            advice.push("♙ Defend against opponent's pawn majority.");
        }
        
        // Quick rook advice
        const whiteRooks = this.findRooksFast(board, 'white');
        if (whiteRooks.length > 0 && player === 'white') {
            advice.push("♖ Activate your rooks on open files!");
        }
        
        return advice.slice(0, 3); // Limit to top 3 advice
    }

    // Get cache stats for debugging
    getCacheStats() {
        return {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate: this.cacheHits + this.cacheMisses > 0 ? 
                (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(1) + '%' : '0%',
            cacheSize: this.evaluationCache.size
        };
    }

    // Clear evaluation cache
    clearCache() {
        this.evaluationCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        console.log("🧹 Endgame evaluation cache cleared");
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessEndgameEngine;
}
