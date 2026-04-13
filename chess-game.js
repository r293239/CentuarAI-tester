// chess-game.js - Enhanced chess game with Advanced AI Strategies v2.5
// VERSION: 2.5.0 - Added Threat Detection, King Safety, Pawn Structure, Mobility with Attack Tables, Tapered Evaluation, and SEE
// COMPATIBLE WITH: chess-ai-database.js (v2.0) and chess-endgame.js (v1.1)

const GAME_VERSION = "2.5.0";

// ========== PERSISTENT MEMORY TREE SYSTEM ==========
class PersistentMoveTree {
    constructor() {
        this.tree = new Map();
        this.positionCache = new Map();
        this.currentLineHash = null;
        this.activeLineMoves = [];
        this.loadFromStorage();
    }

    getMoveKey(fromRow, fromCol, toRow, toCol) {
        return `${fromRow},${fromCol},${toRow},${toCol}`;
    }

    getPositionHash(board, player, castling, enPassant) {
        if (!board || !Array.isArray(board)) return "empty";
        
        let hash = player + "|";
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                hash += (board[row] && board[row][col]) || ".";
            }
        }
        hash += "|" + JSON.stringify(castling || {}) + "|" + (enPassant ? `${enPassant.row},${enPassant.col}` : "null");
        return hash;
    }

    storeMoveEvaluation(move, evaluation, depth, variations, isBestLine = false) {
        const key = this.getMoveKey(move.fromRow, move.fromCol, move.toRow, move.toCol);
        
        const currentBoard = typeof window !== 'undefined' && window.board ? window.board : null;
        const currentCastling = typeof window !== 'undefined' && window.castlingRights ? window.castlingRights : {};
        const currentEnPassant = typeof window !== 'undefined' && window.enPassantTarget ? window.enPassantTarget : null;
        
        const positionHash = this.getPositionHash(currentBoard, move.player || 'white', currentCastling, currentEnPassant);
        
        const node = {
            move,
            evaluation,
            depth,
            variations: variations || [],
            timestamp: Date.now(),
            positionHash,
            isBestLine,
            frequency: (this.tree.get(key)?.frequency || 0) + 1
        };
        
        this.tree.set(key, node);
        if (positionHash !== "empty") {
            this.positionCache.set(positionHash, node);
        }
        this.saveToStorage();
        
        return node;
    }

    getCachedEvaluation(move, currentBoard, player, castling, enPassant) {
        const key = this.getMoveKey(move.fromRow, move.fromCol, move.toRow, move.toCol);
        const cached = this.tree.get(key);
        
        if (cached && currentBoard) {
            const currentHash = this.getPositionHash(currentBoard, player, castling, enPassant);
            if (cached.positionHash === currentHash) {
                return cached;
            }
        }
        return null;
    }

    pruneInactiveLines(currentMoveSequence) {
        if (!currentMoveSequence || currentMoveSequence.length === 0) return;
        
        const toDelete = [];
        
        for (const [key, node] of this.tree) {
            let shouldKeep = false;
            
            for (let i = 0; i <= currentMoveSequence.length; i++) {
                const linePrefix = currentMoveSequence.slice(0, i).join("|");
                if (key.startsWith(linePrefix) && key.split("|").length <= currentMoveSequence.length + 1) {
                    shouldKeep = true;
                    break;
                }
            }
            
            if (!shouldKeep) {
                toDelete.push(key);
            }
        }
        
        for (const key of toDelete) {
            this.tree.delete(key);
        }
        
        if (toDelete.length > 0) {
            console.log(`✂️ Pruned ${toDelete.length} inactive lines`);
        }
        this.saveToStorage();
    }

    extendLine(currentMoveSequence, newVariations) {
        const extendedMoves = [];
        
        for (const variation of newVariations) {
            const fullSequence = [...currentMoveSequence, variation.moveKey];
            extendedMoves.push({
                moveKey: variation.moveKey,
                fullSequence,
                evaluation: variation.evaluation
            });
        }
        
        if (extendedMoves.length > 0) {
            console.log(`🔍 Extended current line by ${extendedMoves.length} new variations`);
        }
        return extendedMoves;
    }

    saveToStorage() {
        try {
            const data = {
                tree: Array.from(this.tree.entries()),
                positionCache: Array.from(this.positionCache.entries()),
                version: GAME_VERSION,
                lastUpdated: Date.now()
            };
            localStorage.setItem('chess_persistent_tree', JSON.stringify(data));
        } catch (e) {
            console.warn("Could not save to localStorage:", e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('chess_persistent_tree');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.version === GAME_VERSION) {
                    this.tree = new Map(data.tree);
                    this.positionCache = new Map(data.positionCache);
                    console.log(`📀 Loaded ${this.tree.size} moves from persistent memory`);
                }
            }
        } catch (e) {
            console.log("No saved memory found, starting fresh");
        }
    }

    clear() {
        this.tree.clear();
        this.positionCache.clear();
        localStorage.removeItem('chess_persistent_tree');
        console.log("🗑️ Cleared persistent memory");
    }

    getStats() {
        return {
            totalMoves: this.tree.size,
            cachedPositions: this.positionCache.size,
            version: GAME_VERSION
        };
    }
}

let moveTree = null;

// Chess board representation
let board = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
];

let currentPlayer = 'white';
let selectedSquare = null;
let gameHistory = [];
let moveHistory = [];
let gameOver = false;
let gameMode = 'ai';
let humanPlayer = 'white';
let moveCount = 1;
let halfMoveCount = 0;
let lastMove = null;
let isThinking = false;

let castlingRights = {
    whiteKingside: true,
    whiteQueenside: true,
    blackKingside: true,
    blackQueenside: true
};

let enPassantTarget = null;
let enhancedAI = null;
let endgameEngine = null;

// Piece mappings
const pieceMap = {
    '♜': 'r', '♞': 'n', '♝': 'b', '♛': 'q', '♚': 'k', '♟': 'p',
    '♖': 'R', '♘': 'N', '♗': 'B', '♕': 'Q', '♔': 'K', '♙': 'P'
};

const reversePieceMap = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

const PIECE_VALUES = {
    '♙': 100, '♘': 320, '♗': 330, '♖': 500, '♕': 900, '♔': 20000,
    '♟': 100, '♞': 320, '♝': 330, '♜': 500, '♛': 900, '♚': 20000,
    '': 0
};

// King safety piece-square tables (encourages king safety)
const KING_SAFETY_TABLE = {
    '♔': [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20]
    ],
    '♚': [
        [20, 30, 10, 0, 0, 10, 30, 20],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30]
    ]
};

// Pawn structure evaluation tables
const PAWN_STRUCTURE = {
    doubledPenalty: 20,
    isolatedPenalty: 25,
    backwardPenalty: 15,
    passedBonus: 30,
    connectedBonus: 10
};

const PIECE_SQUARE_TABLES = {
    '♙': [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    '♘': [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    '♗': [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    '♖': [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [0, 0, 0, 5, 5, 0, 0, 0]
    ],
    '♕': [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    '♔': [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20]
    ]
};

// ========== NEW: ATTACK TABLE & MOBILITY SYSTEM ==========
class AttackTable {
    constructor() {
        this.attackMap = new Map();
        this.pieceSquareControl = new Array(8).fill().map(() => new Array(8).fill(0));
    }

    calculateAttacks(boardState, player) {
        const attacks = new Array(8).fill().map(() => new Array(8).fill(0));
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row] && boardState[row][col];
                if (piece && isPlayerPieceForPosition(piece, player)) {
                    this.addPieceAttacks(boardState, piece, row, col, attacks);
                }
            }
        }
        
        return attacks;
    }

    addPieceAttacks(boardState, piece, row, col, attacks) {
        const pieceCode = pieceMap[piece];
        const directions = this.getPieceDirections(pieceCode);
        
        for (const dir of directions) {
            let newRow = row + dir.dx;
            let newCol = col + dir.dy;
            
            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                attacks[newRow][newCol]++;
                
                const targetPiece = boardState[newRow][newCol];
                if (targetPiece) break;
                
                if (!dir.sliding) break;
                newRow += dir.dx;
                newCol += dir.dy;
            }
        }
    }

    getPieceDirections(pieceCode) {
        switch (pieceCode.toLowerCase()) {
            case 'p':
                const dir = pieceCode === 'P' ? -1 : 1;
                return [
                    {dx: dir, dy: -1, sliding: false},
                    {dx: dir, dy: 1, sliding: false}
                ];
            case 'n':
                return [
                    {dx: -2, dy: -1}, {dx: -2, dy: 1},
                    {dx: -1, dy: -2}, {dx: -1, dy: 2},
                    {dx: 1, dy: -2}, {dx: 1, dy: 2},
                    {dx: 2, dy: -1}, {dx: 2, dy: 1}
                ].map(d => ({...d, sliding: false}));
            case 'k':
                return [
                    {dx: -1, dy: -1}, {dx: -1, dy: 0}, {dx: -1, dy: 1},
                    {dx: 0, dy: -1}, {dx: 0, dy: 1},
                    {dx: 1, dy: -1}, {dx: 1, dy: 0}, {dx: 1, dy: 1}
                ].map(d => ({...d, sliding: false}));
            case 'b':
                return [
                    {dx: -1, dy: -1, sliding: true},
                    {dx: -1, dy: 1, sliding: true},
                    {dx: 1, dy: -1, sliding: true},
                    {dx: 1, dy: 1, sliding: true}
                ];
            case 'r':
                return [
                    {dx: -1, dy: 0, sliding: true},
                    {dx: 1, dy: 0, sliding: true},
                    {dx: 0, dy: -1, sliding: true},
                    {dx: 0, dy: 1, sliding: true}
                ];
            case 'q':
                return [
                    {dx: -1, dy: -1, sliding: true}, {dx: -1, dy: 0, sliding: true}, {dx: -1, dy: 1, sliding: true},
                    {dx: 0, dy: -1, sliding: true}, {dx: 0, dy: 1, sliding: true},
                    {dx: 1, dy: -1, sliding: true}, {dx: 1, dy: 0, sliding: true}, {dx: 1, dy: 1, sliding: true}
                ];
            default:
                return [];
        }
    }

    getMobilityScore(boardState, player) {
        let mobilityScore = 0;
        const mobilityBonus = 5;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row] && boardState[row][col];
                if (piece && isPlayerPieceForPosition(piece, player)) {
                    const moves = this.getPieceMoves(boardState, piece, row, col);
                    mobilityScore += moves.length * mobilityBonus;
                }
            }
        }
        
        return mobilityScore;
    }

    getPieceMoves(boardState, piece, row, col) {
        const moves = [];
        const pieceCode = pieceMap[piece];
        const directions = this.getPieceDirections(pieceCode);
        
        for (const dir of directions) {
            let newRow = row + dir.dx;
            let newCol = col + dir.dy;
            
            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const targetPiece = boardState[newRow][newCol];
                if (!targetPiece || !isPlayerPieceForPosition(targetPiece, currentPlayer)) {
                    moves.push({row: newRow, col: newCol});
                }
                if (targetPiece || !dir.sliding) break;
                newRow += dir.dx;
                newCol += dir.dy;
            }
        }
        
        return moves;
    }
}

// ========== NEW: THREAT DETECTION SYSTEM ==========
class ThreatDetector {
    constructor() {
        this.threatCache = new Map();
    }

    detectThreats(boardState, player) {
        const threats = [];
        const opponent = player === 'white' ? 'black' : 'white';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row] && boardState[row][col];
                if (piece && isPlayerPieceForPosition(piece, opponent)) {
                    const attacks = this.getPieceThreats(boardState, piece, row, col, player);
                    threats.push(...attacks);
                }
            }
        }
        
        return threats;
    }

    getPieceThreats(boardState, piece, row, col, defendingPlayer) {
        const threats = [];
        const pieceCode = pieceMap[piece];
        const directions = this.getAttackDirections(pieceCode);
        
        for (const dir of directions) {
            let newRow = row + dir.dx;
            let newCol = col + dir.dy;
            
            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const targetPiece = boardState[newRow][newCol];
                if (targetPiece && isPlayerPieceForPosition(targetPiece, defendingPlayer)) {
                    threats.push({
                        attacker: piece,
                        attackerPos: {row, col},
                        target: targetPiece,
                        targetPos: {row: newRow, col: newCol},
                        pieceValue: PIECE_VALUES[targetPiece] || 0
                    });
                    break;
                }
                if (targetPiece || !dir.sliding) break;
                newRow += dir.dx;
                newCol += dir.dy;
            }
        }
        
        return threats;
    }

    getAttackDirections(pieceCode) {
        const baseDirections = {
            'p': [{dx: pieceCode === 'P' ? -1 : 1, dy: -1, sliding: false}, 
                  {dx: pieceCode === 'P' ? -1 : 1, dy: 1, sliding: false}],
            'n': [{dx: -2, dy: -1}, {dx: -2, dy: 1}, {dx: -1, dy: -2}, {dx: -1, dy: 2},
                  {dx: 1, dy: -2}, {dx: 1, dy: 2}, {dx: 2, dy: -1}, {dx: 2, dy: 1}],
            'k': [{dx: -1, dy: -1}, {dx: -1, dy: 0}, {dx: -1, dy: 1}, {dx: 0, dy: -1},
                  {dx: 0, dy: 1}, {dx: 1, dy: -1}, {dx: 1, dy: 0}, {dx: 1, dy: 1}],
            'b': [{dx: -1, dy: -1, sliding: true}, {dx: -1, dy: 1, sliding: true},
                  {dx: 1, dy: -1, sliding: true}, {dx: 1, dy: 1, sliding: true}],
            'r': [{dx: -1, dy: 0, sliding: true}, {dx: 1, dy: 0, sliding: true},
                  {dx: 0, dy: -1, sliding: true}, {dx: 0, dy: 1, sliding: true}],
            'q': [{dx: -1, dy: -1, sliding: true}, {dx: -1, dy: 0, sliding: true}, {dx: -1, dy: 1, sliding: true},
                  {dx: 0, dy: -1, sliding: true}, {dx: 0, dy: 1, sliding: true},
                  {dx: 1, dy: -1, sliding: true}, {dx: 1, dy: 0, sliding: true}, {dx: 1, dy: 1, sliding: true}]
        };
        
        return baseDirections[pieceCode.toLowerCase()] || [];
    }

    calculateThreatScore(threats) {
        let score = 0;
        for (const threat of threats) {
            score += threat.pieceValue * 0.3; // 30% of piece value as threat penalty
        }
        return score;
    }
}

// ========== NEW: KING SAFETY MODULE ==========
class KingSafetyModule {
    constructor() {
        this.pawnShieldBonus = 30;
        this.kingTropismWeight = 10;
    }

    evaluateKingSafety(boardState, player) {
        const kingPos = this.findKing(boardState, player);
        if (!kingPos) return 0;
        
        let safetyScore = 0;
        
        // Pawn shield evaluation
        safetyScore += this.evaluatePawnShield(boardState, kingPos, player);
        
        // Piece proximity to king (enemy pieces near king are bad)
        safetyScore -= this.evaluateEnemyProximity(boardState, kingPos, player);
        
        // King exposure (open files/ranks near king)
        safetyScore -= this.evaluateKingExposure(boardState, kingPos, player);
        
        // King tropism (how centralized enemy pieces are pointing at king)
        safetyScore -= this.evaluateKingTropism(boardState, kingPos, player);
        
        return safetyScore;
    }

    findKing(boardState, player) {
        const kingSymbol = player === 'white' ? '♔' : '♚';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (boardState[row] && boardState[row][col] === kingSymbol) {
                    return {row, col};
                }
            }
        }
        return null;
    }

    evaluatePawnShield(boardState, kingPos, player) {
        let shieldScore = 0;
        const pawnDirection = player === 'white' ? -1 : 1;
        const shieldRows = [kingPos.row + pawnDirection];
        
        for (const row of shieldRows) {
            if (row >= 0 && row < 8) {
                for (let col = kingPos.col - 1; col <= kingPos.col + 1; col++) {
                    if (col >= 0 && col < 8) {
                        const piece = boardState[row][col];
                        const expectedPawn = player === 'white' ? '♙' : '♟';
                        if (piece === expectedPawn) {
                            shieldScore += this.pawnShieldBonus;
                        } else if (!piece) {
                            shieldScore -= 10; // Missing pawn shield
                        }
                    }
                }
            }
        }
        
        return shieldScore;
    }

    evaluateEnemyProximity(boardState, kingPos, player) {
        let proximityScore = 0;
        const opponent = player === 'white' ? 'black' : 'white';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row] && boardState[row][col];
                if (piece && isPlayerPieceForPosition(piece, opponent)) {
                    const distance = Math.abs(row - kingPos.row) + Math.abs(col - kingPos.col);
                    const pieceValue = PIECE_VALUES[piece] || 0;
                    if (distance <= 2) {
                        proximityScore += pieceValue / distance;
                    }
                }
            }
        }
        
        return proximityScore;
    }

    evaluateKingExposure(boardState, kingPos, player) {
        let exposureScore = 0;
        const directions = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]];
        
        for (const [dx, dy] of directions) {
            let newRow = kingPos.row + dx;
            let newCol = kingPos.col + dy;
            let openSquares = 0;
            
            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const piece = boardState[newRow][newCol];
                if (piece) {
                    if (!isPlayerPieceForPosition(piece, player)) {
                        exposureScore += 15; // Enemy piece on open line to king
                    }
                    break;
                }
                openSquares++;
                newRow += dx;
                newCol += dy;
            }
            
            exposureScore += openSquares * 2;
        }
        
        return exposureScore;
    }

    evaluateKingTropism(boardState, kingPos, player) {
        let tropismScore = 0;
        const opponent = player === 'white' ? 'black' : 'white';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row] && boardState[row][col];
                if (piece && isPlayerPieceForPosition(piece, opponent)) {
                    const distance = Math.abs(row - kingPos.row) + Math.abs(col - kingPos.col);
                    const pieceValue = PIECE_VALUES[piece] || 0;
                    tropismScore += pieceValue / (distance + 1);
                }
            }
        }
        
        return tropismScore;
    }
}

// ========== NEW: PAWN STRUCTURE EVALUATION ==========
class PawnStructureEvaluator {
    constructor() {
        this.cache = new Map();
    }

    evaluatePawnStructure(boardState, player) {
        const pawns = this.getPawns(boardState, player);
        let structureScore = 0;
        
        // Doubled pawns penalty
        structureScore -= this.evaluateDoubledPawns(pawns) * PAWN_STRUCTURE.doubledPenalty;
        
        // Isolated pawns penalty
        structureScore -= this.evaluateIsolatedPawns(pawns, boardState, player) * PAWN_STRUCTURE.isolatedPenalty;
        
        // Backward pawns penalty
        structureScore -= this.evaluateBackwardPawns(pawns, boardState, player) * PAWN_STRUCTURE.backwardPenalty;
        
        // Passed pawns bonus
        structureScore += this.evaluatePassedPawns(pawns, boardState, player) * PAWN_STRUCTURE.passedBonus;
        
        // Connected pawns bonus
        structureScore += this.evaluateConnectedPawns(pawns) * PAWN_STRUCTURE.connectedBonus;
        
        return structureScore;
    }

    getPawns(boardState, player) {
        const pawns = [];
        const pawnSymbol = player === 'white' ? '♙' : '♟';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (boardState[row] && boardState[row][col] === pawnSymbol) {
                    pawns.push({row, col});
                }
            }
        }
        
        return pawns;
    }

    evaluateDoubledPawns(pawns) {
        const columnCount = new Array(8).fill(0);
        for (const pawn of pawns) {
            columnCount[pawn.col]++;
        }
        
        let doubledCount = 0;
        for (const count of columnCount) {
            if (count > 1) doubledCount += (count - 1);
        }
        
        return doubledCount;
    }

    evaluateIsolatedPawns(pawns, boardState, player) {
        let isolatedCount = 0;
        const columnsWithPawns = new Set(pawns.map(p => p.col));
        
        for (const pawn of pawns) {
            const hasNeighbor = columnsWithPawns.has(pawn.col - 1) || columnsWithPawns.has(pawn.col + 1);
            if (!hasNeighbor) isolatedCount++;
        }
        
        return isolatedCount;
    }

    evaluateBackwardPawns(pawns, boardState, player) {
        let backwardCount = 0;
        const direction = player === 'white' ? -1 : 1;
        
        for (const pawn of pawns) {
            const forwardRow = pawn.row + direction;
            if (forwardRow >= 0 && forwardRow < 8) {
                const hasSupport = this.hasPawnSupport(pawns, pawn.row, pawn.col, direction);
                const isBlocked = boardState[forwardRow] && boardState[forwardRow][pawn.col];
                if (!hasSupport && isBlocked) backwardCount++;
            }
        }
        
        return backwardCount;
    }

    evaluatePassedPawns(pawns, boardState, player) {
        let passedCount = 0;
        const direction = player === 'white' ? -1 : 1;
        const opponent = player === 'white' ? 'black' : 'white';
        const opponentPawns = this.getPawns(boardState, opponent);
        
        for (const pawn of pawns) {
            let isPassed = true;
            const opponentColumns = opponentPawns.map(p => p.col);
            
            for (let row = pawn.row + direction; row >= 0 && row < 8; row += direction) {
                if (opponentColumns.includes(pawn.col - 1) || 
                    opponentColumns.includes(pawn.col) || 
                    opponentColumns.includes(pawn.col + 1)) {
                    isPassed = false;
                    break;
                }
            }
            
            if (isPassed) passedCount++;
        }
        
        return passedCount;
    }

    evaluateConnectedPawns(pawns) {
        let connectedPairs = 0;
        
        for (let i = 0; i < pawns.length; i++) {
            for (let j = i + 1; j < pawns.length; j++) {
                if (Math.abs(pawns[i].col - pawns[j].col) === 1 && 
                    Math.abs(pawns[i].row - pawns[j].row) <= 1) {
                    connectedPairs++;
                }
            }
        }
        
        return connectedPairs;
    }

    hasPawnSupport(pawns, row, col, direction) {
        const supportingRow = row - direction;
        return pawns.some(p => p.row === supportingRow && Math.abs(p.col - col) === 1);
    }
}

// ========== NEW: SEE (Swap Evaluation) ==========
class SwapEvaluator {
    evaluateCapture(boardState, fromRow, fromCol, toRow, toCol, player) {
        const attacker = boardState[fromRow][fromCol];
        const victim = boardState[toRow][toCol];
        
        if (!attacker || !victim) return 0;
        
        const attackerValue = PIECE_VALUES[attacker] || 0;
        const victimValue = PIECE_VALUES[victim] || 0;
        
        // If capturing a less valuable piece, it's probably good
        if (victimValue > attackerValue) return victimValue;
        
        // Simulate the exchange
        const simulatedBoard = this.simulateCapture(boardState, fromRow, fromCol, toRow, toCol);
        const nextAttacker = this.findSmallestAttacker(simulatedBoard, toRow, toCol, player === 'white' ? 'black' : 'white');
        
        if (!nextAttacker) return victimValue;
        
        // Recursively evaluate the exchange
        const nextCaptureValue = this.evaluateCapture(
            simulatedBoard, 
            nextAttacker.fromRow, 
            nextAttacker.fromCol, 
            toRow, toCol, 
            player === 'white' ? 'black' : 'white'
        );
        
        return Math.max(0, victimValue - nextCaptureValue);
    }

    simulateCapture(boardState, fromRow, fromCol, toRow, toCol) {
        const newBoard = boardState.map(row => [...row]);
        newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = '';
        return newBoard;
    }

    findSmallestAttacker(boardState, targetRow, targetCol, player) {
        let smallestAttacker = null;
        let smallestValue = Infinity;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                if (piece && isPlayerPieceForPosition(piece, player)) {
                    if (this.canAttack(boardState, row, col, targetRow, targetCol)) {
                        const pieceValue = PIECE_VALUES[piece] || 0;
                        if (pieceValue < smallestValue) {
                            smallestValue = pieceValue;
                            smallestAttacker = {fromRow: row, fromCol: col};
                        }
                    }
                }
            }
        }
        
        return smallestAttacker;
    }

    canAttack(boardState, fromRow, fromCol, toRow, toCol) {
        const piece = boardState[fromRow][fromCol];
        if (!piece) return false;
        
        const pieceCode = pieceMap[piece];
        const dx = toCol - fromCol;
        const dy = toRow - fromRow;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        switch (pieceCode.toLowerCase()) {
            case 'p':
                const direction = pieceCode === 'P' ? -1 : 1;
                return absDx === 1 && dy === direction;
            case 'n':
                return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
            case 'k':
                return absDx <= 1 && absDy <= 1;
            case 'b':
                return absDx === absDy && this.isPathClear(boardState, fromRow, fromCol, toRow, toCol);
            case 'r':
                return (dx === 0 || dy === 0) && this.isPathClear(boardState, fromRow, fromCol, toRow, toCol);
            case 'q':
                return (dx === 0 || dy === 0 || absDx === absDy) && this.isPathClear(boardState, fromRow, fromCol, toRow, toCol);
            default:
                return false;
        }
    }

    isPathClear(boardState, fromRow, fromCol, toRow, toCol) {
        const dx = Math.sign(toCol - fromCol);
        const dy = Math.sign(toRow - fromRow);
        let currentRow = fromRow + dy;
        let currentCol = fromCol + dx;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (boardState[currentRow] && boardState[currentRow][currentCol]) return false;
            currentRow += dy;
            currentCol += dx;
        }
        
        return true;
    }
}

// ========== NEW: TAPERED EVALUATION ==========
class TaperedEvaluator {
    constructor() {
        this.middlegameWeight = 1.0;
        this.endgameWeight = 0.0;
        this.totalPhase = 24; // Max phase (opening/middlegame)
    }

    calculatePhase(boardState) {
        let phase = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row] && boardState[row][col];
                if (piece) {
                    const pieceCode = pieceMap[piece];
                    switch (pieceCode.toLowerCase()) {
                        case 'q': phase += 4; break;
                        case 'r': phase += 2; break;
                        case 'b': case 'n': phase += 1; break;
                        case 'p': phase += 0; break;
                    }
                }
            }
        }
        
        this.endgameWeight = Math.max(0, Math.min(1, (this.totalPhase - phase) / this.totalPhase));
        this.middlegameWeight = 1 - this.endgameWeight;
        
        return { middlegame: this.middlegameWeight, endgame: this.endgameWeight };
    }

    evaluatePosition(boardState, middlegameScore, endgameScore) {
        const weights = this.calculatePhase(boardState);
        return (middlegameScore * weights.middlegame) + (endgameScore * weights.endgame);
    }
}

// ========== CONSOLE COMMANDS ==========

window.displayBoard = function() {
    console.log("\n  a b c d e f g h");
    for (let row = 0; row < 8; row++) {
        let line = (8 - row) + " ";
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            line += (piece || ".") + " ";
        }
        console.log(line);
    }
    console.log(`\nCurrent player: ${currentPlayer}`);
    console.log(`Game over: ${gameOver}`);
    if (isKingInCheck(board, currentPlayer)) {
        console.log(`⚠️ ${currentPlayer} is in check!`);
    }
    return "Board displayed above";
};

window.setFEN = function(fen) {
    try {
        const parts = fen.split(' ');
        const boardPart = parts[0];
        const rows = boardPart.split('/');
        
        if (rows.length !== 8) {
            console.error("Invalid FEN: Wrong number of rows");
            return false;
        }
        
        const newBoard = [];
        for (let i = 0; i < 8; i++) {
            const row = rows[i];
            const newRow = [];
            let col = 0;
            for (let j = 0; j < row.length; j++) {
                const char = row[j];
                if (isNaN(parseInt(char))) {
                    newRow.push(reversePieceMap[char] || '');
                    col++;
                } else {
                    const emptyCount = parseInt(char);
                    for (let k = 0; k < emptyCount; k++) {
                        newRow.push('');
                        col++;
                    }
                }
            }
            newBoard.push(newRow);
        }
        
        board = newBoard;
        
        if (parts.length > 1) {
            currentPlayer = parts[1] === 'w' ? 'white' : 'black';
        }
        
        if (parts.length > 2 && parts[2] !== '-') {
            castlingRights = {
                whiteKingside: parts[2].includes('K'),
                whiteQueenside: parts[2].includes('Q'),
                blackKingside: parts[2].includes('k'),
                blackQueenside: parts[2].includes('q')
            };
        }
        
        if (parts.length > 3 && parts[3] !== '-') {
            const file = parts[3][0];
            const rank = parts[3][1];
            enPassantTarget = {
                row: 8 - parseInt(rank),
                col: file.charCodeAt(0) - 97
            };
        } else {
            enPassantTarget = null;
        }
        
        gameOver = false;
        selectedSquare = null;
        
        createBoard();
        updateStatus();
        console.log("✅ Position set successfully!");
        window.displayBoard();
        return "Position set successfully";
    } catch (error) {
        console.error("Error parsing FEN:", error);
        return false;
    }
};

window.getFEN = function() {
    let fen = "";
    
    for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!piece) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                fen += pieceMap[piece];
            }
        }
        if (emptyCount > 0) {
            fen += emptyCount;
        }
        if (row < 7) fen += "/";
    }
    
    fen += " " + (currentPlayer === 'white' ? "w" : "b");
    
    let castling = "";
    if (castlingRights.whiteKingside) castling += "K";
    if (castlingRights.whiteQueenside) castling += "Q";
    if (castlingRights.blackKingside) castling += "k";
    if (castlingRights.blackQueenside) castling += "q";
    fen += " " + (castling || "-");
    
    if (enPassantTarget) {
        const file = String.fromCharCode(97 + enPassantTarget.col);
        const rank = 8 - enPassantTarget.row;
        fen += " " + file + rank;
    } else {
        fen += " -";
    }
    
    fen += " " + halfMoveCount + " " + moveCount;
    
    console.log("FEN: " + fen);
    return fen;
};

window.fen = window.getFEN;
window.board = window.displayBoard;

window.setup = function(positionName) {
    const positions = {
        "start": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "pawn_glitch_test": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "endgame_king_pawn": "8/8/8/3k4/3P4/8/8/7K w - - 0 1",
        "endgame_queen_checkmate": "8/8/8/8/8/3k4/3Q4/7K w - - 0 1",
        "checkmate_test": "rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 0 1",
        "stalemate_test": "7k/8/8/8/8/8/5Q2/7K w - - 0 1",
        "en_passant_test": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
        "castling_test": "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1",
        "rook_endgame": "8/8/8/3k4/3R4/8/8/7K w - - 0 1",
        "bishop_knight_endgame": "8/8/8/3k4/3B4/3N4/8/7K w - - 0 1"
    };
    
    if (positions[positionName]) {
        console.log(`📌 Setting up ${positionName} position...`);
        return window.setFEN(positions[positionName]);
    } else {
        console.log(`Available positions: ${Object.keys(positions).join(", ")}`);
        return false;
    }
};

window.move = function(moveStr) {
    const move = parseAlgebraicMove(moveStr);
    if (move && isValidMove(move.fromRow, move.fromCol, move.toRow, move.toCol)) {
        makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
        switchPlayer();
        updateStatus();
        console.log(`✅ Move ${moveStr} made successfully`);
        window.displayBoard();
        return `Move ${moveStr} made successfully`;
    } else {
        console.error(`❌ Invalid move: ${moveStr}`);
        return false;
    }
};

window.legalMoves = function() {
    const moves = getAllPossibleMoves(currentPlayer);
    const algebraicMoves = moves.map(move => toAlgebraicMove(move.fromRow, move.fromCol, move.toRow, move.toCol));
    console.log(`📋 Legal moves for ${currentPlayer} (${moves.length} total):`);
    algebraicMoves.forEach(move => console.log(`  ${move}`));
    return algebraicMoves;
};

window.eval = function() {
    const score = evaluatePositionForSearch(board, currentPlayer, moveCount);
    const isEndgame = isEndgamePositionForPosition(board);
    console.log(`📊 Position evaluation: ${score}`);
    console.log(`📈 Phase: ${isEndgame ? "Endgame" : "Middlegame/Opening"}`);
    console.log(`👑 King in check: ${isKingInCheck(board, currentPlayer)}`);
    
    const whiteMaterial = getMaterialCount('white');
    const blackMaterial = getMaterialCount('black');
    console.log(`♙ Material - White: ${whiteMaterial.total}, Black: ${blackMaterial.total}`);
    console.log(`   White pieces: ♕${whiteMaterial.queen} ♖${whiteMaterial.rooks} ♗${whiteMaterial.bishops} ♘${whiteMaterial.knights} ♙${whiteMaterial.pawns}`);
    console.log(`   Black pieces: ♛${blackMaterial.queen} ♜${blackMaterial.rooks} ♝${blackMaterial.bishops} ♞${blackMaterial.knights} ♟${blackMaterial.pawns}`);
    
    return score;
};

window.ai = function() {
    if (gameMode !== 'ai') {
        console.log("⚠️ Game mode is not AI. Use 'setMode ai' first.");
        return;
    }
    if (gameOver) {
        console.log("⚠️ Game is over. Start a new game first.");
        return;
    }
    if (currentPlayer === humanPlayer) {
        console.log("⚠️ It's your turn! Make a move or switch sides.");
        return;
    }
    console.log("🤖 AI is thinking with v2.5 enhanced evaluation...");
    makeAIMove();
    return "AI move initiated";
};

window.setDepth = function(depth) {
    if (depth >= 1 && depth <= 6) {
        SEARCH_CONFIG.baseDepth = depth;
        SEARCH_CONFIG.endgameDepth = depth + 2;
        console.log(`✅ AI depth set to ${depth} (endgame depth: ${depth+2})`);
        return `AI depth set to ${depth}`;
    } else {
        console.log("❌ Depth must be between 1 and 6");
        return false;
    }
};

window.setMode = function(mode) {
    if (mode === 'ai' || mode === 'player') {
        gameMode = mode;
        const gameModeSelect = document.getElementById('gameMode');
        if (gameModeSelect) gameModeSelect.value = mode;
        changeGameMode();
        console.log(`✅ Game mode set to ${mode === 'ai' ? 'vs AI' : 'vs Player'}`);
        return `Game mode set to ${mode}`;
    } else {
        console.log("❌ Invalid mode. Use 'ai' or 'player'");
        return false;
    }
};

window.switchSide = function() {
    switchSides();
    return `Switched sides. Human now plays ${humanPlayer}`;
};

window.stats = function() {
    console.log("\n=== GAME STATISTICS ===");
    console.log(`Version: ${GAME_VERSION}`);
    console.log(`Mode: ${gameMode === 'ai' ? 'vs AI' : 'vs Player'}`);
    console.log(`Current player: ${currentPlayer}`);
    console.log(`Move number: ${moveCount}`);
    console.log(`Half-move clock (50-move rule): ${halfMoveCount}`);
    console.log(`Game over: ${gameOver}`);
    console.log(`Human plays: ${humanPlayer}`);
    
    if (moveTree) {
        const stats = moveTree.getStats();
        console.log(`\n=== AI MEMORY STATS ===`);
        console.log(`Total cached moves: ${stats.totalMoves}`);
        console.log(`Cached positions: ${stats.cachedPositions}`);
        console.log(`Memory version: ${stats.version}`);
    }
    
    if (endgameEngine) {
        console.log(`\n=== ENDGAME ENGINE ===`);
        console.log(`Version: ${endgameEngine.version}`);
        const phase = endgameEngine.detectEndgamePhase(board);
        console.log(`Game phase: ${phase}`);
        if (endgameEngine.getCacheStats) {
            const cacheStats = endgameEngine.getCacheStats();
            console.log(`Cache hit rate: ${cacheStats.hitRate}`);
        }
    }
    
    console.log(`\n=== POSITION INFO ===`);
    window.eval();
    return "Stats displayed above";
};

window.undo = function() {
    if (gameHistory.length === 0) {
        console.log("No moves to undo");
        return;
    }
    undoMove();
    console.log("Move undone");
    window.displayBoard();
    return "Move undone";
};

window.newGame = function() {
    newGame();
    console.log("New game started");
    window.displayBoard();
    return "New game started";
};

window.clearMemory = function() {
    clearMemory();
    return "Memory cleared";
};

window.analyzePosition = function() {
    console.log("\n=== ADVANCED POSITION ANALYSIS ===");
    
    const threatDetector = new ThreatDetector();
    const threats = threatDetector.detectThreats(board, currentPlayer);
    console.log(`🎯 Threats detected: ${threats.length}`);
    threats.forEach(t => {
        console.log(`   ${t.attacker} at (${t.attackerPos.row},${t.attackerPos.col}) threatens ${t.target} at (${t.targetPos.row},${t.targetPos.col}) (value: ${t.pieceValue})`);
    });
    
    const kingSafety = new KingSafetyModule();
    const whiteKingSafety = kingSafety.evaluateKingSafety(board, 'white');
    const blackKingSafety = kingSafety.evaluateKingSafety(board, 'black');
    console.log(`👑 King safety - White: ${whiteKingSafety}, Black: ${blackKingSafety}`);
    
    const pawnStructure = new PawnStructureEvaluator();
    const whitePawnScore = pawnStructure.evaluatePawnStructure(board, 'white');
    const blackPawnScore = pawnStructure.evaluatePawnStructure(board, 'black');
    console.log(`♙ Pawn structure - White: ${whitePawnScore}, Black: ${blackPawnScore}`);
    
    const attackTable = new AttackTable();
    const whiteMobility = attackTable.getMobilityScore(board, 'white');
    const blackMobility = attackTable.getMobilityScore(board, 'black');
    console.log(`🏃 Mobility - White: ${whiteMobility}, Black: ${blackMobility}`);
    
    const taperedEval = new TaperedEvaluator();
    const weights = taperedEval.calculatePhase(board);
    console.log(`⚖️ Game phase - Middlegame: ${(weights.middlegame * 100).toFixed(1)}%, Endgame: ${(weights.endgame * 100).toFixed(1)}%`);
    
    return "Analysis complete";
};

window.help = function() {
    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║              CHESS GAME CONSOLE COMMANDS v2.5                  ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝");
    console.log("\n📌 BOARD & POSITION:");
    console.log("  board()            - Show current board in console");
    console.log("  setFEN('fen')      - Set position from FEN string");
    console.log("  getFEN()           - Get current position as FEN");
    console.log("  setup('name')      - Setup test position");
    console.log("\n🎮 MOVES:");
    console.log("  move('e2e4')       - Make a move using algebraic notation");
    console.log("  legalMoves()       - Show all legal moves for current player");
    console.log("  undo()             - Undo last move");
    console.log("\n🤖 AI & EVALUATION:");
    console.log("  eval()             - Evaluate current position");
    console.log("  analyzePosition()  - Advanced position analysis (NEW!)");
    console.log("  ai()               - Force AI to make a move");
    console.log("  setDepth(n)        - Set AI search depth (1-6)");
    console.log("  setMode('ai/player') - Switch game mode");
    console.log("  switchSide()       - Switch which side human plays");
    console.log("\n📊 GAME INFO:");
    console.log("  stats()            - Show game statistics");
    console.log("  fen()              - Get current FEN (alias for getFEN)");
    console.log("\n🛠️ UTILITIES:");
    console.log("  newGame()          - Start a new game");
    console.log("  clearMemory()      - Clear AI memory cache");
    console.log("  help()             - Show this help message");
    console.log("\n📝 NEW FEATURES IN v2.5:");
    console.log("  • Threat Detection - Identifies opponent threats");
    console.log("  • King Safety - Evaluates king protection");
    console.log("  • Pawn Structure - Detects doubled/isolated/passed pawns");
    console.log("  • Mobility with Attack Tables - Piece activity evaluation");
    console.log("  • Tapered Evaluation - Gradual phase transition");
    console.log("  • SEE - Swap evaluation for captures");
    console.log("\n");
    return "Help displayed above";
};

// ========== CONVERSION FUNCTIONS ==========

function parseAlgebraicMove(moveStr) {
    if (!moveStr || moveStr.length < 4) return null;
    const fromCol = moveStr.charCodeAt(0) - 97;
    const fromRow = 8 - parseInt(moveStr[1]);
    const toCol = moveStr.charCodeAt(2) - 97;
    const toRow = 8 - parseInt(moveStr[3]);
    if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
        toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return null;
    return { fromRow, fromCol, toRow, toCol };
}

function toAlgebraicMove(fromRow, fromCol, toRow, toCol) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[fromCol] + ranks[fromRow] + files[toCol] + ranks[toRow];
}

function getMaterialCount(player) {
    let queen = 0, rooks = 0, bishops = 0, knights = 0, pawns = 0;
    const pieceSymbols = player === 'white' 
        ? { queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' }
        : { queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' };
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece === pieceSymbols.queen) queen++;
            else if (piece === pieceSymbols.rook) rooks++;
            else if (piece === pieceSymbols.bishop) bishops++;
            else if (piece === pieceSymbols.knight) knights++;
            else if (piece === pieceSymbols.pawn) pawns++;
        }
    }
    
    const total = queen*9 + rooks*5 + bishops*3 + knights*3 + pawns;
    return { queen, rooks, bishops, knights, pawns, total };
}

// ========== RISK ASSESSMENT CLASS ==========
class RiskAssessment {
    constructor() {
        this.riskThreshold = 300;
        this.minimumScoreGain = 50;
    }

    assessLineRisk(lineEvaluations) {
        const risks = [];
        for (const line of lineEvaluations) {
            const riskScore = this.calculateRiskScore(line);
            risks.push({
                ...line,
                riskScore,
                isSafe: riskScore < this.riskThreshold,
                maxLoss: line.worstCase - line.bestCase
            });
        }
        return risks;
    }
    
    calculateRiskScore(line) {
        const potentialLoss = Math.abs(line.worstCase - line.bestCase);
        const depthWeight = Math.min(line.depth / 10, 1);
        return potentialLoss * depthWeight;
    }
    
    findBestSafeMove(riskAssessedLines) {
        const safeLines = riskAssessedLines.filter(line => line.isSafe);
        if (safeLines.length === 0) {
            console.log("⚠️ All lines have risk! Choosing least risky option...");
            riskAssessedLines.sort((a, b) => a.riskScore - b.riskScore);
            return riskAssessedLines[0];
        }
        safeLines.sort((a, b) => b.bestCase - a.bestCase);
        return safeLines[0];
    }
}

let riskAssessor = new RiskAssessment();

// Initialize new AI modules
let attackTable = new AttackTable();
let threatDetector = new ThreatDetector();
let kingSafetyModule = new KingSafetyModule();
let pawnStructureEval = new PawnStructureEvaluator();
let swapEvaluator = new SwapEvaluator();
let taperedEvaluator = new TaperedEvaluator();

// ========== CORE GAME FUNCTIONS ==========

function displayVersion() {
    const stats = moveTree ? moveTree.getStats() : { totalMoves: 0, cachedPositions: 0 };
    console.log(`♔ Chess Game v${GAME_VERSION} - Advanced AI with Threat Detection, King Safety, Pawn Structure, Mobility, Tapered Eval & SEE`);
    console.log(`📦 Memory: ${stats.totalMoves} cached moves`);
    console.log(`🎯 New Features: Threat Detection | King Safety | Pawn Structure | Mobility | Tapered Evaluation | SEE`);
    console.log(`🔄 Dynamic Extension: Extends calculations for active line only`);
    if (endgameEngine) {
        console.log(`📚 Endgame Engine v${endgameEngine.version} loaded!`);
    } else {
        console.log(`📚 Endgame Engine: Not loaded (chess-endgame.js missing)`);
    }
    console.log(`\n💡 Type 'help()' in console to see available commands!`);
    console.log(`💡 Type 'analyzePosition()' for advanced position analysis!`);

    const versionDisplay = document.getElementById('ai-version');
    if (versionDisplay) {
        versionDisplay.textContent = `v${GAME_VERSION}`;
    }
}

window.addEventListener('load', function() {
    moveTree = new PersistentMoveTree();
    
    if (typeof window !== 'undefined') {
        window.boardData = board;
        window.castlingRightsData = castlingRights;
        window.enPassantTargetData = enPassantTarget;
    }
    
    if (typeof ChessAILearner !== 'undefined') {
        enhancedAI = new ChessAILearner();
        console.log(`🧠 Enhanced AI v${enhancedAI.version} loaded with opening book!`);
    } else {
        console.log("⚠️ ChessAILearner not found - using PMTS only");
    }
    
    // Try to load endgame engine from the correct file name
    if (typeof ChessEndgameEngine !== 'undefined') {
        endgameEngine = new ChessEndgameEngine();
        console.log(`♟️ Endgame Engine v${endgameEngine.version} loaded!`);
    } else {
        console.log("⚠️ ChessEndgameEngine not found - make sure chess-endgame.js is loaded before this file");
        console.log("   Using standard evaluation without endgame specialization");
    }
    
    createBoard();
    updateStatus();
    updateAIStats();
    changeGameMode();
    displayVersion();
    
    console.log(`♔ Chess Game v${GAME_VERSION} Loaded with Advanced AI! ♛`);
    console.log(`💡 Console commands available: help(), board(), setFEN(), move(), eval(), analyzePosition(), ai(), stats(), etc.`);
});

function createBoard() {
    const boardElement = document.getElementById('chessboard');
    if (!boardElement) return;

    boardElement.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.id = `square-${row}-${col}`;

            if ((row + col) % 2 === 0) {
                square.classList.add('light');
            } else {
                square.classList.add('dark');
            }

            if (lastMove && 
                ((lastMove.fromRow === row && lastMove.fromCol === col) ||
                 (lastMove.toRow === row && lastMove.toCol === col))) {
                square.classList.add('last-move');
            }

            const piece = board[row][col];
            if ((piece === '♔' && isKingInCheck(board, 'white')) ||
                (piece === '♚' && isKingInCheck(board, 'black'))) {
                square.classList.add('in-check');
            }

            square.textContent = board[row][col];
            square.onclick = () => handleSquareClick(row, col);

            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(row, col) {
    if (gameOver || isThinking) return;
    if (gameMode === 'ai' && currentPlayer !== humanPlayer) return;

    const piece = board[row][col];

    if (selectedSquare) {
        const fromRow = selectedSquare.row;
        const fromCol = selectedSquare.col;

        if (fromRow === row && fromCol === col) {
            clearSelection();
            return;
        }

        if (isValidMove(fromRow, fromCol, row, col)) {
            makeMove(fromRow, fromCol, row, col);
            clearSelection();
            switchPlayer();
            updateStatus();

            if (gameMode === 'ai' && !gameOver && currentPlayer !== humanPlayer) {
                setTimeout(makeAIMove, 300);
            }
        } else {
            if (piece && isPlayerPiece(piece, currentPlayer)) {
                selectSquare(row, col);
            } else {
                clearSelection();
            }
        }
    } else {
        if (piece && isPlayerPiece(piece, currentPlayer)) {
            selectSquare(row, col);
        }
    }
}

function selectSquare(row, col) {
    clearSelection();
    selectedSquare = { row, col };
    const squareElement = document.getElementById(`square-${row}-${col}`);
    if (squareElement) {
        squareElement.classList.add('selected');
    }
    showPossibleMoves(row, col);
}

function clearSelection() {
    selectedSquare = null;
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'possible-move', 'capture-move');
    });
    createBoard();
}

function showPossibleMoves(row, col) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(row, col, r, c)) {
                const square = document.getElementById(`square-${r}-${c}`);
                if (square) {
                    if (board[r][c] && isPlayerPiece(board[r][c], currentPlayer === 'white' ? 'black' : 'white')) {
                        square.classList.add('capture-move');
                    } else {
                        square.classList.add('possible-move');
                    }
                }
            }
        }
    }
}

function isPlayerPiece(piece, player) {
    if (!piece) return false;
    const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
    const blackPieces = ['♚', '♛', '♜', '♝', '♞', '♟'];
    return player === 'white' ? whitePieces.includes(piece) : blackPieces.includes(piece);
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;

    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];

    if (!piece) return false;
    if (targetPiece && isPlayerPiece(targetPiece, currentPlayer)) return false;

    if ((piece === '♔' || piece === '♚') && Math.abs(toCol - fromCol) === 2 && fromRow === toRow) {
        return canCastle(fromRow, fromCol, toRow, toCol);
    }

    const pieceCode = pieceMap[piece];
    if (!isValidPieceMove(pieceCode, fromRow, fromCol, toRow, toCol)) return false;

    return !wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol);
}

function isValidPieceMove(piece, fromRow, fromCol, toRow, toCol) {
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    switch (piece.toLowerCase()) {
        case 'p':
            return isValidPawnMove(piece, fromRow, fromCol, toRow, toCol, dx, dy);
        case 'r':
            return (dx === 0 || dy === 0) && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'n':
            return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
        case 'b':
            return absDx === absDy && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'q':
            return (dx === 0 || dy === 0 || absDx === absDy) && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'k':
            return absDx <= 1 && absDy <= 1;
        default:
            return false;
    }
}

function isValidPawnMove(piece, fromRow, fromCol, toRow, toCol, dx, dy) {
    const direction = piece === 'P' ? -1 : 1;
    const startRow = piece === 'P' ? 6 : 1;
    const absDx = Math.abs(dx);

    if (dx === 0) {
        if (dy === direction && !board[toRow][toCol]) return true;
        if (fromRow === startRow && dy === 2 * direction && !board[toRow][toCol]) {
            const intermediateRow = fromRow + direction;
            if (!board[intermediateRow][fromCol]) return true;
        }
    } else if (absDx === 1 && dy === direction) {
        if (board[toRow][toCol]) return true;
        if (enPassantTarget && toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
            return true;
        }
    }

    return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const dx = Math.sign(toCol - fromCol);
    const dy = Math.sign(toRow - fromRow);
    let currentRow = fromRow + dy;
    let currentCol = fromCol + dx;

    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol]) return false;
        currentRow += dy;
        currentCol += dx;
    }
    return true;
}

function wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const originalTarget = board[toRow][toCol];

    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';

    const inCheck = isKingInCheck(board, currentPlayer);

    board[fromRow][fromCol] = piece;
    board[toRow][toCol] = originalTarget;

    return inCheck;
}

function canCastle(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const isWhite = piece === '♔';
    const isKingside = toCol > fromCol;

    if ((isWhite && fromRow !== 7) || (!isWhite && fromRow !== 0)) return false;

    if (isWhite) {
        if (isKingside && !castlingRights.whiteKingside) return false;
        if (!isKingside && !castlingRights.whiteQueenside) return false;
    } else {
        if (isKingside && !castlingRights.blackKingside) return false;
        if (!isKingside && !castlingRights.blackQueenside) return false;
    }

    if (isKingInCheck(board, currentPlayer)) return false;

    const rookCol = isKingside ? 7 : 0;
    const expectedRook = isWhite ? '♖' : '♜';
    if (board[fromRow][rookCol] !== expectedRook) return false;

    const start = Math.min(fromCol, rookCol) + 1;
    const end = Math.max(fromCol, rookCol);

    for (let col = start; col < end; col++) {
        if (board[fromRow][col] !== '') return false;
    }

    const direction = isKingside ? 1 : -1;
    for (let i = 0; i <= 2; i++) {
        const testCol = fromCol + (direction * i);
        if (testCol >= 0 && testCol <= 7) {
            const originalPiece = board[fromRow][testCol];
            board[fromRow][testCol] = piece;
            if (testCol !== fromCol) board[fromRow][fromCol] = '';

            const inCheck = isKingInCheck(board, currentPlayer);

            board[fromRow][fromCol] = piece;
            board[fromRow][testCol] = originalPiece;

            if (inCheck) return false;
        }
    }

    return true;
}

function isKingInCheck(testBoard, player) {
    if (!testBoard) return false;
    
    const kingSymbol = player === 'white' ? '♔' : '♚';
    let kingRow = -1, kingCol = -1;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (testBoard[row] && testBoard[row][col] === kingSymbol) {
                kingRow = row;
                kingCol = col;
                break;
            }
        }
        if (kingRow !== -1) break;
    }

    if (kingRow === -1) return false;

    return isSquareAttacked(testBoard, kingRow, kingCol, player === 'white' ? 'black' : 'white');
}

function isSquareAttacked(testBoard, targetRow, targetCol, attackerColor) {
    if (!testBoard) return false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = testBoard[row] && testBoard[row][col];
            if (piece && isPlayerPiece(piece, attackerColor)) {
                if (canPieceAttack(piece, row, col, targetRow, targetCol, testBoard)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function canPieceAttack(piece, fromRow, fromCol, toRow, toCol, testBoard) {
    const pieceCode = pieceMap[piece];
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    switch (pieceCode.toLowerCase()) {
        case 'p':
            const direction = pieceCode === 'P' ? -1 : 1;
            return absDx === 1 && dy === direction;
        case 'r':
            return (dx === 0 || dy === 0) && isPathClearOnBoard(testBoard, fromRow, fromCol, toRow, toCol);
        case 'n':
            return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
        case 'b':
            return absDx === absDy && isPathClearOnBoard(testBoard, fromRow, fromCol, toRow, toCol);
        case 'q':
            return (dx === 0 || dy === 0 || absDx === absDy) && isPathClearOnBoard(testBoard, fromRow, fromCol, toRow, toCol);
        case 'k':
            return absDx <= 1 && absDy <= 1;
        default:
            return false;
    }
}

function isPathClearOnBoard(testBoard, fromRow, fromCol, toRow, toCol) {
    const dx = Math.sign(toCol - fromCol);
    const dy = Math.sign(toRow - fromRow);
    let currentRow = fromRow + dy;
    let currentCol = fromCol + dx;

    while (currentRow !== toRow || currentCol !== toCol) {
        if (testBoard[currentRow] && testBoard[currentRow][currentCol]) return false;
        currentRow += dy;
        currentCol += dx;
    }
    return true;
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    gameHistory.push({
        board: board.map(row => [...row]),
        currentPlayer: currentPlayer,
        moveHistory: [...moveHistory],
        moveCount: moveCount,
        halfMoveCount: halfMoveCount,
        castlingRights: { ...castlingRights },
        lastMove: lastMove,
        enPassantTarget: enPassantTarget
    });
    
    lastMove = { fromRow, fromCol, toRow, toCol };
    
    const algebraicMove = toAlgebraicMove(fromRow, fromCol, toRow, toCol);
    if (moveTree) {
        moveTree.activeLineMoves.push(algebraicMove);
    }
    
    if ((piece === '♙' || piece === '♟') && enPassantTarget && 
        toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
        const capturedPawnRow = piece === '♙' ? toRow + 1 : toRow - 1;
        board[capturedPawnRow][toCol] = '';
    }
    
    if ((piece === '♔' || piece === '♚') && Math.abs(toCol - fromCol) === 2) {
        const isKingside = toCol > fromCol;
        const rookFromCol = isKingside ? 7 : 0;
        const rookToCol = isKingside ? 5 : 3;
        const rook = board[fromRow][rookFromCol];
        
        board[fromRow][rookToCol] = rook;
        board[fromRow][rookFromCol] = '';
    }
    
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';
    
    if ((piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7)) {
        board[toRow][toCol] = piece === '♙' ? '♕' : '♛';
    }
    
    enPassantTarget = null;
    if ((piece === '♙' || piece === '♟') && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = {
            row: fromRow + (toRow - fromRow) / 2,
            col: fromCol
        };
    }
    
    updateCastlingRights(piece, fromRow, fromCol, toRow, toCol);
    updateHalfMoveClock(piece, capturedPiece);
    
    if (currentPlayer === 'black') {
        moveCount++;
    }
    
    moveHistory.push(algebraicMove);
    updateMoveHistory();
    
    createBoard();
    
    if (moveTree) {
        moveTree.pruneInactiveLines(moveTree.activeLineMoves);
    }
}

function updateCastlingRights(piece, fromRow, fromCol, toRow, toCol) {
    if (piece === '♔') {
        castlingRights.whiteKingside = false;
        castlingRights.whiteQueenside = false;
    } else if (piece === '♚') {
        castlingRights.blackKingside = false;
        castlingRights.blackQueenside = false;
    }

    if (piece === '♖' && fromRow === 7) {
        if (fromCol === 0) castlingRights.whiteQueenside = false;
        if (fromCol === 7) castlingRights.whiteKingside = false;
    } else if (piece === '♜' && fromRow === 0) {
        if (fromCol === 0) castlingRights.blackQueenside = false;
        if (fromCol === 7) castlingRights.blackKingside = false;
    }
}

function updateHalfMoveClock(piece, capturedPiece) {
    if (piece === '♙' || piece === '♟' || capturedPiece) {
        halfMoveCount = 0;
    } else {
        halfMoveCount++;
    }
}

function switchPlayer() {
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
}

function updateStatus() {
    const statusElement = document.getElementById('status');
    const currentPlayerElement = document.getElementById('current-player');
    const moveCounterElement = document.getElementById('move-counter');

    if (!statusElement || !currentPlayerElement || !moveCounterElement) return;

    if (isCheckmate()) {
        const winner = currentPlayer === 'white' ? 'Black' : 'White';
        statusElement.textContent = `Checkmate! ${winner} wins!`;
        statusElement.classList.add('checkmate');
        gameOver = true;
    } else if (isStalemate()) {
        statusElement.textContent = 'Stalemate! Draw!';
        gameOver = true;
    } else if (isDraw()) {
        statusElement.textContent = 'Draw!';
        gameOver = true;
    } else if (isKingInCheck(board, currentPlayer)) {
        statusElement.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in check!`;
        statusElement.classList.add('check');
    } else {
        statusElement.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} to move`;
        statusElement.classList.remove('checkmate', 'check');
    }

    currentPlayerElement.textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
    moveCounterElement.textContent = moveCount;
}

function isCheckmate() {
    if (!isKingInCheck(board, currentPlayer)) return false;
    return getAllPossibleMoves(currentPlayer).length === 0;
}

function isStalemate() {
    if (isKingInCheck(board, currentPlayer)) return false;
    return getAllPossibleMoves(currentPlayer).length === 0;
}

function isDraw() {
    return halfMoveCount >= 100 || isInsufficientMaterial();
}

function isInsufficientMaterial() {
    const pieces = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece !== '♔' && piece !== '♚') {
                pieces.push(piece);
            }
        }
    }

    if (pieces.length === 0) return true;
    if (pieces.length === 1 && (pieces[0] === '♗' || pieces[0] === '♝' || pieces[0] === '♘' || pieces[0] === '♞')) return true;

    return false;
}

function getAllPossibleMoves(player) {
    const moves = [];
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = board[fromRow][fromCol];
            if (piece && isPlayerPiece(piece, player)) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                            moves.push({ fromRow, fromCol, toRow, toCol });
                        }
                    }
                }
            }
        }
    }
    return moves;
}

function updateMoveHistory() {
    const moveListElement = document.getElementById('move-list');
    if (!moveListElement) return;

    const formattedMoves = [];

    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moveHistory[i] || '';
        const blackMove = moveHistory[i + 1] || '';
        formattedMoves.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
    }

    moveListElement.textContent = formattedMoves.join(' ');
}

// ========== ENHANCED POSITION EVALUATION FUNCTIONS (v2.5) ==========

function isPlayerPieceForPosition(piece, player) {
    if (!piece) return false;
    const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
    const blackPieces = ['♚', '♛', '♜', '♝', '♞', '♟'];
    return player === 'white' ? whitePieces.includes(piece) : blackPieces.includes(piece);
}

function isPathClearForPosition(boardState, fromRow, fromCol, toRow, toCol) {
    if (!boardState) return false;
    
    const dx = Math.sign(toCol - fromCol);
    const dy = Math.sign(toRow - fromRow);
    let currentRow = fromRow + dy;
    let currentCol = fromCol + dx;

    while (currentRow !== toRow || currentCol !== toCol) {
        if (boardState[currentRow] && boardState[currentRow][currentCol]) return false;
        currentRow += dy;
        currentCol += dx;
    }
    return true;
}

function canPieceAttackForPosition(piece, fromRow, fromCol, toRow, toCol, boardState) {
    const pieceCode = pieceMap[piece];
    if (!pieceCode) return false;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    switch (pieceCode.toLowerCase()) {
        case 'p':
            const direction = pieceCode === 'P' ? -1 : 1;
            return absDx === 1 && dy === direction;
        case 'r':
            return (dx === 0 || dy === 0) && isPathClearForPosition(boardState, fromRow, fromCol, toRow, toCol);
        case 'n':
            return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
        case 'b':
            return absDx === absDy && isPathClearForPosition(boardState, fromRow, fromCol, toRow, toCol);
        case 'q':
            return (dx === 0 || dy === 0 || absDx === absDy) && isPathClearForPosition(boardState, fromRow, fromCol, toRow, toCol);
        case 'k':
            return absDx <= 1 && absDy <= 1;
        default:
            return false;
    }
}

function isSquareAttackedForPosition(boardState, targetRow, targetCol, attackerColor) {
    if (!boardState) return false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const attacker = boardState[row] && boardState[row][col];
            if (attacker && isPlayerPieceForPosition(attacker, attackerColor)) {
                if (canPieceAttackForPosition(attacker, row, col, targetRow, targetCol, boardState)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isKingInCheckForPosition(boardState, player) {
    if (!boardState) return false;
    
    const kingSymbol = player === 'white' ? '♔' : '♚';
    let kingRow = -1, kingCol = -1;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row] && boardState[row][col] === kingSymbol) {
                kingRow = row;
                kingCol = col;
                break;
            }
        }
        if (kingRow !== -1) break;
    }

    if (kingRow === -1) return false;

    const attackerColor = player === 'white' ? 'black' : 'white';
    return isSquareAttackedForPosition(boardState, kingRow, kingCol, attackerColor);
}

function isValidMoveForPosition(boardState, fromRow, fromCol, toRow, toCol, player) {
    if (!boardState) return false;
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;

    const piece = boardState[fromRow] && boardState[fromRow][fromCol];
    const targetPiece = boardState[toRow] && boardState[toRow][toCol];

    if (!piece) return false;
    if (targetPiece && isPlayerPieceForPosition(targetPiece, player)) return false;

    const pieceCode = pieceMap[piece];
    if (!pieceCode) return false;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let valid = false;
    switch (pieceCode.toLowerCase()) {
        case 'p':
            const direction = pieceCode === 'P' ? -1 : 1;
            const startRow = pieceCode === 'P' ? 6 : 1;
            if (dx === 0) {
                if (dy === direction && !boardState[toRow][toCol]) valid = true;
                if (fromRow === startRow && dy === 2 * direction && !boardState[toRow][toCol]) {
                    const intermediateRow = fromRow + direction;
                    if (!boardState[intermediateRow][fromCol]) valid = true;
                }
            } else if (absDx === 1 && dy === direction && boardState[toRow][toCol]) {
                valid = true;
            }
            break;
        case 'r':
            valid = (dx === 0 || dy === 0) && isPathClearForPosition(boardState, fromRow, fromCol, toRow, toCol);
            break;
        case 'n':
            valid = (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
            break;
        case 'b':
            valid = absDx === absDy && isPathClearForPosition(boardState, fromRow, fromCol, toRow, toCol);
            break;
        case 'q':
            valid = (dx === 0 || dy === 0 || absDx === absDy) && isPathClearForPosition(boardState, fromRow, fromCol, toRow, toCol);
            break;
        case 'k':
            valid = absDx <= 1 && absDy <= 1;
            break;
    }

    if (!valid) return false;

    const newBoard = makeTestMoveForPosition(boardState, fromRow, fromCol, toRow, toCol);
    return !isKingInCheckForPosition(newBoard, player);
}

function makeTestMoveForPosition(boardState, fromRow, fromCol, toRow, toCol) {
    if (!boardState) return null;
    
    const newBoard = boardState.map(row => row ? [...row] : []);
    const piece = newBoard[fromRow] && newBoard[fromRow][fromCol];
    if (newBoard[toRow] && piece) {
        newBoard[toRow][toCol] = piece;
        newBoard[fromRow][fromCol] = '';
    }
    return newBoard;
}

function getAllPossibleMovesForPosition(boardState, player) {
    if (!boardState) return [];
    
    const moves = [];
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = boardState[fromRow] && boardState[fromRow][fromCol];
            if (piece && isPlayerPieceForPosition(piece, player)) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMoveForPosition(boardState, fromRow, fromCol, toRow, toCol, player)) {
                            moves.push({ fromRow, fromCol, toRow, toCol });
                        }
                    }
                }
            }
        }
    }
    return moves;
}

function isEndgamePositionForPosition(boardState) {
    if (!boardState) return false;
    
    let pieceCount = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece && piece !== '♔' && piece !== '♚') {
                pieceCount++;
            }
        }
    }
    return pieceCount <= 12;
}

function evaluatePositionForSearch(boardState, player, moveNumber) {
    if (!boardState) return 0;
    
    // Calculate middlegame and endgame scores separately for tapered evaluation
    let middlegameScore = 0;
    let endgameScore = 0;
    
    // Material evaluation
    let whiteMaterial = 0;
    let blackMaterial = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece] || 0;
                if (isPlayerPieceForPosition(piece, 'white')) {
                    whiteMaterial += value;
                } else {
                    blackMaterial += value;
                }
            }
        }
    }
    
    const materialScore = whiteMaterial - blackMaterial;
    middlegameScore += materialScore;
    endgameScore += materialScore;

    // Positional evaluation with piece-square tables
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece) {
                let tableValue = 0;
                
                if (isEndgamePositionForPosition(boardState) && endgameEngine && endgameEngine.endgamePieceTables && endgameEngine.endgamePieceTables[piece]) {
                    tableValue = endgameEngine.getEndgamePieceSquareValue(piece, row, col);
                } else if (PIECE_SQUARE_TABLES[piece]) {
                    tableValue = PIECE_SQUARE_TABLES[piece][row][col];
                }
                
                if (isPlayerPieceForPosition(piece, 'white')) {
                    middlegameScore += tableValue;
                    endgameScore += tableValue;
                } else {
                    middlegameScore -= tableValue;
                    endgameScore -= tableValue;
                }
            }
        }
    }

    // NEW: Threat Detection Score
    const threats = threatDetector.detectThreats(boardState, player);
    const threatScore = threatDetector.calculateThreatScore(threats);
    if (player === 'white') {
        middlegameScore -= threatScore;
        endgameScore -= threatScore;
    } else {
        middlegameScore += threatScore;
        endgameScore += threatScore;
    }

    // NEW: King Safety Score
    const whiteKingSafety = kingSafetyModule.evaluateKingSafety(boardState, 'white');
    const blackKingSafety = kingSafetyModule.evaluateKingSafety(boardState, 'black');
    middlegameScore += (whiteKingSafety - blackKingSafety);
    endgameScore += (whiteKingSafety - blackKingSafety);

    // NEW: Pawn Structure Score
    const whitePawnScore = pawnStructureEval.evaluatePawnStructure(boardState, 'white');
    const blackPawnScore = pawnStructureEval.evaluatePawnStructure(boardState, 'black');
    middlegameScore += (whitePawnScore - blackPawnScore);
    endgameScore += (whitePawnScore - blackPawnScore);

    // NEW: Mobility Score (more important in middlegame)
    const whiteMobility = attackTable.getMobilityScore(boardState, 'white');
    const blackMobility = attackTable.getMobilityScore(boardState, 'black');
    const mobilityWeight = 5;
    middlegameScore += (whiteMobility - blackMobility) * mobilityWeight;
    endgameScore += (whiteMobility - blackMobility) * (mobilityWeight * 0.7);

    // Center control (more important in middlegame)
    const centerBonus = 30;
    const centers = [[3,3], [3,4], [4,3], [4,4]];
    for (const [r,c] of centers) {
        const piece = boardState[r] && boardState[r][c];
        if (piece) {
            if (isPlayerPieceForPosition(piece, 'white')) {
                middlegameScore += centerBonus;
                endgameScore += centerBonus * 0.5;
            } else {
                middlegameScore -= centerBonus;
                endgameScore -= centerBonus * 0.5;
            }
        }
    }

    // Apply tapered evaluation
    const finalScore = taperedEvaluator.evaluatePosition(boardState, middlegameScore, endgameScore);
    
    return finalScore;
}

// ========== MINIMAX WITH ENHANCED EVALUATION ==========

const SEARCH_CONFIG = {
    baseDepth: 3,
    endgameDepth: 5,
    useMemory: true,
    riskAssessment: true
};

let transpositionTable = new Map();

function minimaxWithRisk(boardState, depth, alpha, beta, isMaximizingPlayer, player, moveNumber, trackWorstCase = false) {
    if (!boardState) return 0;
    if (depth === 0) {
        return evaluatePositionForSearch(boardState, player, moveNumber);
    }

    const moves = getAllPossibleMovesForPosition(boardState, player);
    if (moves.length === 0) {
        const inCheck = isKingInCheckForPosition(boardState, player);
        if (inCheck) {
            return isMaximizingPlayer ? -20000 : 20000;
        }
        return 0;
    }

    // Sort moves using SEE for better pruning
    moves.sort((a, b) => {
        const pieceA = boardState[a.fromRow][a.fromCol];
        const pieceB = boardState[b.fromRow][b.fromCol];
        const targetA = boardState[a.toRow][a.toCol];
        const targetB = boardState[b.toRow][b.toCol];
        
        const seeA = targetA ? swapEvaluator.evaluateCapture(boardState, a.fromRow, a.fromCol, a.toRow, a.toCol, player) : 0;
        const seeB = targetB ? swapEvaluator.evaluateCapture(boardState, b.fromRow, b.fromCol, b.toRow, b.toCol, player) : 0;
        
        return seeB - seeA;
    });

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        let worstCaseEval = Infinity;
        const nextPlayer = player === 'white' ? 'black' : 'white';

        for (const move of moves) {
            // Skip bad captures based on SEE
            const targetPiece = boardState[move.toRow][move.toCol];
            if (targetPiece) {
                const seeValue = swapEvaluator.evaluateCapture(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol, player);
                if (seeValue < 0 && depth > 1) {
                    continue; // Prune bad captures
                }
            }
            
            const newBoard = makeTestMoveForPosition(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol);
            const evaluation = minimaxWithRisk(newBoard, depth - 1, alpha, beta, false, nextPlayer, moveNumber + 1, trackWorstCase);
            
            const evalValue = typeof evaluation === 'object' ? evaluation.best : evaluation;
            maxEval = Math.max(maxEval, evalValue);
            if (trackWorstCase) {
                const worstVal = typeof evaluation === 'object' ? evaluation.worst : evaluation;
                worstCaseEval = Math.min(worstCaseEval, worstVal);
            }
            alpha = Math.max(alpha, evalValue);
            
            if (beta <= alpha) break;
        }
        
        return trackWorstCase ? { best: maxEval, worst: worstCaseEval } : maxEval;
    } else {
        let minEval = Infinity;
        let worstCaseEval = -Infinity;
        const nextPlayer = player === 'white' ? 'black' : 'white';

        for (const move of moves) {
            // Skip bad captures based on SEE
            const targetPiece = boardState[move.toRow][move.toCol];
            if (targetPiece) {
                const seeValue = swapEvaluator.evaluateCapture(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol, player);
                if (seeValue < 0 && depth > 1) {
                    continue; // Prune bad captures
                }
            }
            
            const newBoard = makeTestMoveForPosition(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol);
            const evaluation = minimaxWithRisk(newBoard, depth - 1, alpha, beta, true, nextPlayer, moveNumber + 1, trackWorstCase);
            
            const evalValue = typeof evaluation === 'object' ? evaluation.best : evaluation;
            minEval = Math.min(minEval, evalValue);
            if (trackWorstCase) {
                const worstVal = typeof evaluation === 'object' ? evaluation.worst : evaluation;
                worstCaseEval = Math.max(worstCaseEval, worstVal);
            }
            beta = Math.min(beta, evalValue);
            
            if (beta <= alpha) break;
        }
        
        return trackWorstCase ? { best: minEval, worst: worstCaseEval } : minEval;
    }
}

function findBestMoveWithRiskAssessment() {
    const allMoves = getAllPossibleMoves(currentPlayer);
    if (allMoves.length === 0) return null;
    
    if (enhancedAI && moveHistory.length < 12) {
        const openingMoveAlgebraic = enhancedAI.getOpeningRecommendation(moveHistory);
        if (openingMoveAlgebraic) {
            const openingMove = parseAlgebraicMove(openingMoveAlgebraic);
            if (openingMove && isValidMove(openingMove.fromRow, openingMove.fromCol, openingMove.toRow, openingMove.toCol)) {
                console.log(`📖 Opening book: Playing ${openingMoveAlgebraic}`);
                return openingMove;
            }
        }
    }
    
    const isEndgame = isEndgamePositionForPosition(board);
    if (isEndgame && endgameEngine && endgameEngine.getEndgameAdvice) {
        console.log("♟️ Endgame phase detected - using specialized endgame evaluation");
        const advice = endgameEngine.getEndgameAdvice(board, currentPlayer);
        if (advice && advice.length > 0) {
            console.log("📚 Endgame advice:", advice[0]);
        }
    }
    
    const searchDepth = isEndgame ? SEARCH_CONFIG.endgameDepth : SEARCH_CONFIG.baseDepth;
    
    console.log(`🔍 AI searching at depth ${searchDepth} with ENHANCED v2.5 evaluation (Threats, King Safety, Pawn Structure, Mobility, Tapered Eval, SEE)`);
    const searchStartTime = performance.now();
    
    const evaluatedMoves = [];
    
    for (const move of allMoves) {
        let cachedResult = null;
        if (moveTree && SEARCH_CONFIG.useMemory) {
            cachedResult = moveTree.getCachedEvaluation(move, board, currentPlayer, castlingRights, enPassantTarget);
        }
        
        if (cachedResult) {
            evaluatedMoves.push({
                move,
                bestCase: cachedResult.evaluation,
                worstCase: cachedResult.evaluation - 100,
                depth: cachedResult.depth
            });
        } else {
            const newBoard = makeTestMoveForPosition(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
            
            const bestResult = minimaxWithRisk(newBoard, searchDepth - 1, -Infinity, Infinity, false, 
                currentPlayer === 'white' ? 'black' : 'white', moveCount + 1, false);
            
            const worstResult = minimaxWithRisk(newBoard, searchDepth - 1, -Infinity, Infinity, false, 
                currentPlayer === 'white' ? 'black' : 'white', moveCount + 1, true);
            
            const worstCase = typeof worstResult === 'object' ? worstResult.best : worstResult;
            const bestCase = typeof bestResult === 'object' ? bestResult.best : bestResult;
            
            evaluatedMoves.push({
                move,
                bestCase: bestCase,
                worstCase: worstCase,
                depth: searchDepth
            });
            
            if (moveTree && SEARCH_CONFIG.useMemory) {
                moveTree.storeMoveEvaluation(move, bestCase, searchDepth, [{ worst: worstCase }]);
            }
        }
    }
    
    const riskAssessed = riskAssessor.assessLineRisk(evaluatedMoves);
    const bestSafeMove = riskAssessor.findBestSafeMove(riskAssessed);
    
    const searchTime = (performance.now() - searchStartTime).toFixed(0);
    console.log(`⏱️ Search time: ${searchTime}ms | Selected move eval: ${bestSafeMove.bestCase} | Risk: ${bestSafeMove.riskScore}`);
    
    // Log detailed analysis for the chosen move
    console.log(`📊 Move analysis:`, {
        threatScore: threatDetector.calculateThreatScore(threatDetector.detectThreats(board, currentPlayer)),
        kingSafety: kingSafetyModule.evaluateKingSafety(board, currentPlayer),
        pawnStructure: pawnStructureEval.evaluatePawnStructure(board, currentPlayer),
        mobility: attackTable.getMobilityScore(board, currentPlayer)
    });
    
    if (moveTree && SEARCH_CONFIG.useMemory) {
        const extendedVariations = [];
        const newBoardAfterMove = makeTestMoveForPosition(board, 
            bestSafeMove.move.fromRow, bestSafeMove.move.fromCol,
            bestSafeMove.move.toRow, bestSafeMove.move.toCol);
        
        if (newBoardAfterMove) {
            const nextMoves = getAllPossibleMovesForPosition(newBoardAfterMove, currentPlayer === 'white' ? 'black' : 'white');
            for (const nextMove of nextMoves.slice(0, 3)) {
                const algebraicKey = toAlgebraicMove(nextMove.fromRow, nextMove.fromCol, nextMove.toRow, nextMove.toCol);
                const deeperBoard = makeTestMoveForPosition(newBoardAfterMove, 
                    nextMove.fromRow, nextMove.fromCol, nextMove.toRow, nextMove.toCol);
                if (deeperBoard) {
                    const deeperEval = minimaxWithRisk(deeperBoard, 2, -Infinity, Infinity, true,
                        currentPlayer, moveCount + 2, false);
                    
                    extendedVariations.push({
                        moveKey: algebraicKey,
                        evaluation: deeperEval
                    });
                }
            }
        }
        
        moveTree.extendLine(moveTree.activeLineMoves, extendedVariations);
    }
    
    return bestSafeMove.move;
}

function findBestMove() {
    return findBestMoveWithRiskAssessment();
}

function makeAIMove() {
    if (isThinking || gameOver) return;

    isThinking = true;
    const thinkingElement = document.getElementById('thinking');
    const syncStatusElement = document.getElementById('sync-status');

    if (thinkingElement) thinkingElement.style.display = 'block';
    if (syncStatusElement) {
        syncStatusElement.textContent = 'AI thinking with v2.5 enhanced evaluation...';
        syncStatusElement.classList.add('thinking');
    }

    setTimeout(() => {
        const bestMove = findBestMove();
        if (bestMove) {
            makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
            switchPlayer();
            updateStatus();
        }

        isThinking = false;
        if (thinkingElement) thinkingElement.style.display = 'none';
        if (syncStatusElement) {
            syncStatusElement.textContent = 'Ready';
            syncStatusElement.classList.remove('thinking');
        }
        
        if (moveTree) {
            const stats = moveTree.getStats();
            console.log(`📊 Memory stats: ${stats.totalMoves} moves cached`);
        }
    }, 300);
}

function updateAIStats() {
    const gamesPlayedElement = document.getElementById('games-played');
    const winRateElement = document.getElementById('win-rate');
    const difficultyElement = document.getElementById('ai-difficulty');
    const versionElement = document.getElementById('ai-version');

    if (!gamesPlayedElement || !winRateElement) return;

    gamesPlayedElement.textContent = moveTree ? moveTree.getStats().totalMoves.toString() : '0';
    winRateElement.textContent = enhancedAI ? enhancedAI.getWinRate() : '65';
    
    if (difficultyElement) {
        difficultyElement.textContent = 'PMTS v2.5 (Threats + King Safety + Pawns + Mobility + Tapered + SEE)';
    }
    if (versionElement) {
        versionElement.textContent = `v${GAME_VERSION}`;
    }
}

function newGame() {
    board = [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];

    currentPlayer = 'white';
    selectedSquare = null;
    gameHistory = [];
    moveHistory = [];
    gameOver = false;
    moveCount = 1;
    halfMoveCount = 0;
    lastMove = null;
    isThinking = false;

    castlingRights = {
        whiteKingside: true,
        whiteQueenside: true,
        blackKingside: true,
        blackQueenside: true
    };

    enPassantTarget = null;
    
    if (moveTree) {
        moveTree.activeLineMoves = [];
    }

    createBoard();
    updateStatus();

    const moveListElement = document.getElementById('move-list');
    if (moveListElement) moveListElement.textContent = 'Game started';

    const thinkingElement = document.getElementById('thinking');
    const syncStatusElement = document.getElementById('sync-status');

    if (thinkingElement) thinkingElement.style.display = 'none';
    if (syncStatusElement) {
        syncStatusElement.textContent = 'Ready';
        syncStatusElement.classList.remove('thinking');
    }

    console.log(`🎯 New game started! ${GAME_VERSION} with Threat Detection, King Safety, Pawn Structure, Mobility, Tapered Evaluation & SEE!`);
}

function undoMove() {
    if (gameHistory.length === 0) return;

    const previousState = gameHistory.pop();
    board = previousState.board;
    currentPlayer = previousState.currentPlayer;
    moveHistory = previousState.moveHistory;
    moveCount = previousState.moveCount;
    halfMoveCount = previousState.halfMoveCount;
    castlingRights = previousState.castlingRights;
    lastMove = previousState.lastMove;
    enPassantTarget = previousState.enPassantTarget;
    gameOver = false;
    
    if (moveTree) {
        moveTree.activeLineMoves.pop();
    }

    createBoard();
    updateStatus();
    updateMoveHistory();

    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.classList.remove('checkmate', 'check');
    }
}

function switchSides() {
    humanPlayer = humanPlayer === 'white' ? 'black' : 'white';
    console.log(`🔄 Switched sides. You are now playing as ${humanPlayer}`);

    if (gameMode === 'ai' && currentPlayer !== humanPlayer && !gameOver) {
        setTimeout(makeAIMove, 500);
    }
}

function changeGameMode() {
    const gameModeSelect = document.getElementById('gameMode');
    const gameModeDisplay = document.getElementById('game-mode-display');
    const aiInfo = document.getElementById('ai-info');

    if (!gameModeSelect || !gameModeDisplay) return;

    gameMode = gameModeSelect.value;

    if (gameMode === 'ai') {
        gameModeDisplay.textContent = 'vs AI (PMTS v2.5 + Threats + King Safety + Pawns + Mobility)';
        if (aiInfo) aiInfo.style.display = 'block';

        if (currentPlayer !== humanPlayer && !gameOver) {
            setTimeout(makeAIMove, 500);
        }
    } else {
        gameModeDisplay.textContent = 'vs Player';
        if (aiInfo) aiInfo.style.display = 'none';
    }
}

function clearMemory() {
    if (confirm('Clear AI memory? This will delete all cached calculations.')) {
        if (moveTree) {
            moveTree.clear();
        }
        transpositionTable.clear();
        if (endgameEngine && endgameEngine.clearCache) {
            endgameEngine.clearCache();
        }
        console.log("🧹 Memory cleared!");
        updateAIStats();
        alert('AI memory cleared!');
    }
}

if (typeof window !== 'undefined') {
    window.clearAIMemory = clearMemory;
    window.getAIMemoryStats = () => moveTree ? moveTree.getStats() : { totalMoves: 0 };
    window.getEndgameAdvice = () => {
        if (endgameEngine && endgameEngine.getEndgameAdvice) {
            return endgameEngine.getEndgameAdvice(board, currentPlayer);
        }
        return ["Endgame engine not loaded"];
    };
    window.analyzePosition = window.analyzePosition;
}

console.log(`✅ Chess Game v${GAME_VERSION} loaded - Advanced AI with Threat Detection, King Safety, Pawn Structure, Mobility, Tapered Evaluation & SEE!`);
console.log(`🎯 New features: analyzePosition() for detailed position analysis!`);
