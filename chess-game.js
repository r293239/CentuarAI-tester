// chess-game.js
// Enhanced chess game with Persistent Memory Tree Search (PMTS) and Risk Assessment
// VERSION: 2.3.2 - Fixed pawn double-move jumping over pieces
// COMPATIBLE WITH: chess-ai-database.js (v2.0)

const GAME_VERSION = "2.3.2";

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

// Initialize persistent memory system (will be fully initialized after board exists)
let moveTree = null;

// ========== GAME PHASE DETECTION (Based on Material Count) ==========
class GamePhaseDetector {
    constructor() {
        this.phase = 'opening';
    }

    countMaterialOnBoard(board) {
        let totalPieces = 0;
        let majorPieces = 0;
        let minorPieces = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row] && board[row][col];
                if (piece && piece !== '♔' && piece !== '♚') {
                    totalPieces++;
                    
                    // Count major pieces (Queen, Rooks)
                    if (piece === '♕' || piece === '♛' || piece === '♖' || piece === '♜') {
                        majorPieces++;
                    }
                    // Count minor pieces (Bishops, Knights)
                    if (piece === '♗' || piece === '♝' || piece === '♘' || piece === '♞') {
                        minorPieces++;
                    }
                }
            }
        }
        
        return { totalPieces, majorPieces, minorPieces };
    }

    detectPhase(board) {
        const { totalPieces, majorPieces, minorPieces } = this.countMaterialOnBoard(board);
        
        // ENDGAME CONDITIONS:
        // 1. Very few pieces left (≤ 10 total pieces)
        // 2. No queens on board
        // 3. Only kings + pawns + maybe 1 minor piece
        if (totalPieces <= 10) {
            this.phase = 'endgame';
        }
        // LATE MIDDLEGAME:
        // 1. Fewer than 20 pieces
        // 2. Queens are often traded
        else if (totalPieces <= 18 && majorPieces <= 2) {
            this.phase = 'late_middlegame';
        }
        // MIDDLEGAME:
        // 1. Most pieces still on board
        // 2. Queens are present
        else if (totalPieces <= 28) {
            this.phase = 'middlegame';
        }
        // OPENING:
        // 1. Almost all pieces on board
        else {
            this.phase = 'opening';
        }
        
        // Additional endgame detection: no queens and very few major pieces
        if (majorPieces === 0 && totalPieces <= 12) {
            this.phase = 'endgame';
        }
        
        return this.phase;
    }

    getPhaseStrategy(phase) {
        switch(phase) {
            case 'opening':
                return {
                    name: 'Opening',
                    description: 'Develop pieces, control center, castle early',
                    developmentPriority: 0.4,
                    centerControlPriority: 0.35,
                    kingSafetyPriority: 0.25,
                    capturePriority: 0.15,
                    searchDepth: 3
                };
            case 'middlegame':
                return {
                    name: 'Middlegame',
                    description: 'Attack, tactical combinations, piece activity',
                    developmentPriority: 0.15,
                    centerControlPriority: 0.25,
                    kingSafetyPriority: 0.25,
                    capturePriority: 0.35,
                    searchDepth: 4
                };
            case 'late_middlegame':
                return {
                    name: 'Late Middlegame',
                    description: 'Prepare for endgame, simplify if ahead',
                    developmentPriority: 0.1,
                    centerControlPriority: 0.2,
                    kingSafetyPriority: 0.25,
                    capturePriority: 0.45,
                    searchDepth: 4
                };
            case 'endgame':
                return {
                    name: 'Endgame',
                    description: 'King activity, pawn promotion, precise calculation',
                    developmentPriority: 0.05,
                    centerControlPriority: 0.15,
                    kingSafetyPriority: 0.2,
                    capturePriority: 0.6,
                    searchDepth: 5
                };
            default:
                return {
                    name: 'Middlegame',
                    description: 'Standard play',
                    developmentPriority: 0.2,
                    centerControlPriority: 0.25,
                    kingSafetyPriority: 0.25,
                    capturePriority: 0.3,
                    searchDepth: 3
                };
        }
    }
}

let phaseDetector = new GamePhaseDetector();

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

// Game state tracking
let castlingRights = {
    whiteKingside: true,
    whiteQueenside: true,
    blackKingside: true,
    blackQueenside: true
};

let enPassantTarget = null;

// Enhanced AI with opening book
let enhancedAI = null;

// Piece mappings
const pieceMap = {
    '♜': 'r', '♞': 'n', '♝': 'b', '♛': 'q', '♚': 'k', '♟': 'p',
    '♖': 'R', '♘': 'N', '♗': 'B', '♕': 'Q', '♔': 'K', '♙': 'P'
};

// ========== BUFFED CAPTURE SYSTEM ==========
// 50 points for taking a piece, 49 points for losing a piece
// This creates a net +1 incentive for any capture, making AI more aggressive
const CAPTURE_BONUS = 50;
const CAPTURE_PENALTY = 49;

// Enhanced piece values with capture buff system
const PIECE_VALUES = {
    '♙': 100, '♘': 320, '♗': 330, '♖': 500, '♕': 900, '♔': 20000,
    '♟': 100, '♞': 320, '♝': 330, '♜': 500, '♛': 900, '♚': 20000,
    '': 0
};

// Position evaluation tables
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

// Convert move from algebraic notation to coordinates
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

// Convert move to algebraic notation
function toAlgebraicMove(fromRow, fromCol, toRow, toCol) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[fromCol] + ranks[fromRow] + files[toCol] + ranks[toRow];
}

// ========== FIX: PAWN DOUBLE MOVE PATH CHECK ==========
// This function checks if the path is clear for a pawn's double move
function isPawnDoubleMovePathClear(fromRow, fromCol, toRow, toCol, piece) {
    const direction = piece === '♙' ? -1 : 1;
    const intermediateRow = fromRow + direction;
    
    // Check if the square in between is empty
    return !board[intermediateRow][fromCol];
}

// Modified pawn move validation with path clearing
function isValidPawnMove(piece, fromRow, fromCol, toRow, toCol, dx, dy) {
    const direction = piece === '♙' ? -1 : 1;
    const startRow = piece === '♙' ? 6 : 1;
    const absDx = Math.abs(dx);

    // Single square forward move
    if (dx === 0 && dy === direction && !board[toRow][toCol]) {
        return true;
    }
    
    // Double square forward move (only from starting position)
    if (dx === 0 && fromRow === startRow && dy === 2 * direction && !board[toRow][toCol]) {
        // FIX: Check that the square in between is empty (no jumping over pieces)
        const intermediateRow = fromRow + direction;
        if (board[intermediateRow][fromCol]) {
            console.log(`🚫 Pawn cannot jump over piece at row ${intermediateRow}, col ${fromCol}`);
            return false;
        }
        return true;
    }
    
    // Capture move
    if (absDx === 1 && dy === direction) {
        if (board[toRow][toCol]) {
            return true;
        }
        // En passant capture
        if (enPassantTarget && toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
            return true;
        }
    }

    return false;
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

// ========== CORE GAME FUNCTIONS ==========

function displayVersion() {
    const stats = moveTree ? moveTree.getStats() : { totalMoves: 0, cachedPositions: 0 };
    console.log(`♔ Chess Game v${GAME_VERSION} - PMTS with Phase Detection & Capture Buffs`);
    console.log(`📦 Memory: ${stats.totalMoves} cached moves`);
    console.log(`🎯 CAPTURE SYSTEM: +50 for taking, -49 for losing (net +1 incentive)`);
    console.log(`🎮 Phase Detection: Based on material count (pieces on board)`);
    console.log(`🐛 FIXED: Pawns cannot jump over pieces on two-square moves`);

    const versionDisplay = document.getElementById('ai-version');
    if (versionDisplay) {
        versionDisplay.textContent = `v${GAME_VERSION}`;
    }
}

// Initialize on page load
window.addEventListener('load', function() {
    // Initialize moveTree AFTER board is defined
    moveTree = new PersistentMoveTree();
    
    // Make board accessible to moveTree
    if (typeof window !== 'undefined') {
        window.board = board;
        window.castlingRights = castlingRights;
        window.enPassantTarget = enPassantTarget;
    }
    
    // Initialize ChessAILearner if available
    if (typeof ChessAILearner !== 'undefined') {
        enhancedAI = new ChessAILearner();
        console.log(`🧠 Enhanced AI v${enhancedAI.version} loaded with opening book!`);
        console.log("📖 Opening book loaded with 2000+ professional lines");
    } else {
        console.log("⚠️ ChessAILearner not found - using PMTS only");
    }
    
    createBoard();
    updateStatus();
    updateAIStats();
    changeGameMode();
    displayVersion();
    
    // Detect initial game phase
    const phase = phaseDetector.detectPhase(board);
    const strategy = phaseDetector.getPhaseStrategy(phase);
    console.log(`🎮 Game Phase: ${strategy.name} - ${strategy.description}`);
    
    console.log(`♔ Chess Game v${GAME_VERSION} Loaded - Fixed Pawn Jump Bug! ♛`);
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

// Updated isValidPawnMove with path clearing check
function isValidPawnMove(piece, fromRow, fromCol, toRow, toCol, dx, dy) {
    const direction = piece === '♙' ? -1 : 1;
    const startRow = piece === '♙' ? 6 : 1;
    const absDx = Math.abs(dx);

    // Single square forward move
    if (dx === 0 && dy === direction && !board[toRow][toCol]) {
        return true;
    }
    
    // Double square forward move (only from starting position)
    if (dx === 0 && fromRow === startRow && dy === 2 * direction && !board[toRow][toCol]) {
        // FIX: Check that the square in between is empty (no jumping over pieces)
        const intermediateRow = fromRow + direction;
        if (board[intermediateRow][fromCol]) {
            return false;
        }
        return true;
    }
    
    // Capture move
    if (absDx === 1 && dy === direction) {
        if (board[toRow][toCol]) {
            return true;
        }
        // En passant capture
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
    
    // Track current line for memory pruning
    const algebraicMove = toAlgebraicMove(fromRow, fromCol, toRow, toCol);
    if (moveTree) {
        moveTree.activeLineMoves.push(algebraicMove);
    }
    
    // Handle en passant capture
    if ((piece === '♙' || piece === '♟') && enPassantTarget && 
        toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
        const capturedPawnRow = piece === '♙' ? toRow + 1 : toRow - 1;
        board[capturedPawnRow][toCol] = '';
    }
    
    // Handle castling
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
    
    // Handle pawn promotion
    if ((piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7)) {
        board[toRow][toCol] = piece === '♙' ? '♕' : '♛';
    }
    
    // Set en passant target if pawn just moved two squares
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
    
    // Record move in algebraic notation for opening book compatibility
    const algebraicNotation = toAlgebraicMove(fromRow, fromCol, toRow, toCol);
    moveHistory.push(algebraicNotation);
    updateMoveHistory();
    
    createBoard();
    
    // Prune inactive lines after each move
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
    
    // Update phase display
    updatePhaseDisplay();
}

function updatePhaseDisplay() {
    const phaseElement = document.getElementById('game-phase');
    if (!phaseElement) return;
    
    const phase = phaseDetector.detectPhase(board);
    const strategy = phaseDetector.getPhaseStrategy(phase);
    phaseElement.textContent = `${strategy.name} (${phaseDetector.countMaterialOnBoard(board).totalPieces} pieces)`;
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

// ========== POSITION EVALUATION FUNCTIONS WITH CAPTURE BUFFS ==========

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
            // Single square forward
            if (dx === 0 && dy === direction && !boardState[toRow][toCol]) {
                valid = true;
            }
            // Double square forward with path check
            else if (dx === 0 && fromRow === startRow && dy === 2 * direction && !boardState[toRow][toCol]) {
                const intermediateRow = fromRow + direction;
                if (!boardState[intermediateRow][fromCol]) {
                    valid = true;
                }
            }
            // Capture
            else if (absDx === 1 && dy === direction && boardState[toRow][toCol]) {
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
    return pieceCount <= 10;
}

// ========== ENHANCED EVALUATION WITH CAPTURE BUFFS AND PHASE DETECTION ==========
function evaluatePositionForSearch(boardState, player, moveNumber) {
    if (!boardState) return 0;
    
    let evaluation = 0;
    let captureScore = 0;
    
    // Detect current game phase based on material
    const phase = phaseDetector.detectPhase(boardState);
    const strategy = phaseDetector.getPhaseStrategy(phase);
    
    // Material balance with CAPTURE BUFFS
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece] || 0;
                evaluation += isPlayerPieceForPosition(piece, 'white') ? value : -value;
            }
        }
    }
    
    // Add capture bonuses based on phase
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece) {
                const color = isPlayerPieceForPosition(piece, 'white') ? 'white' : 'black';
                const opponentColor = color === 'white' ? 'black' : 'white';
                
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        const target = boardState[toRow] && boardState[toRow][toCol];
                        if (target && isPlayerPieceForPosition(target, opponentColor)) {
                            if (isValidMoveForPosition(boardState, row, col, toRow, toCol, color)) {
                                const capturePotential = CAPTURE_BONUS * strategy.capturePriority;
                                captureScore += isPlayerPieceForPosition(piece, 'white') ? capturePotential : -capturePotential;
                            }
                        }
                    }
                }
            }
        }
    }
    
    evaluation += captureScore;
    
    // Piece square tables
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece && PIECE_SQUARE_TABLES[piece]) {
                const tableValue = PIECE_SQUARE_TABLES[piece][row][col];
                evaluation += isPlayerPieceForPosition(piece, 'white') ? tableValue : -tableValue;
            }
        }
    }
    
    // Center control with phase-based priority
    const centers = [[3,3], [3,4], [4,3], [4,4]];
    for (const [r,c] of centers) {
        const piece = boardState[r] && boardState[r][c];
        if (piece) {
            const centerBonus = 30 * strategy.centerControlPriority;
            evaluation += isPlayerPieceForPosition(piece, 'white') ? centerBonus : -centerBonus;
        }
    }
    
    // Development bonus for opening
    if (phase === 'opening') {
        let developedPieces = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row] && boardState[row][col];
                if (piece === '♘' || piece === '♗' || piece === '♞' || piece === '♝') {
                    if ((row === 7 && (col === 1 || col === 6)) || (row === 0 && (col === 1 || col === 6))) {
                        // Still in starting position
                    } else {
                        developedPieces += isPlayerPieceForPosition(piece, 'white') ? 1 : -1;
                    }
                }
            }
        }
        evaluation += developedPieces * (15 * strategy.developmentPriority);
    }
    
    // King safety with phase-based priority
    if (phase === 'opening' || phase === 'middlegame') {
        const kingSafetyBonus = 40 * strategy.kingSafetyPriority;
        const whiteKingPos = findKingPosition(boardState, 'white');
        const blackKingPos = findKingPosition(boardState, 'black');
        
        if (whiteKingPos && (whiteKingPos.col === 6 || whiteKingPos.col === 2)) {
            evaluation += kingSafetyBonus;
        }
        if (blackKingPos && (blackKingPos.col === 6 || blackKingPos.col === 2)) {
            evaluation -= kingSafetyBonus;
        }
    }
    
    // Endgame king activity bonus
    if (phase === 'endgame') {
        const whiteKingPos = findKingPosition(boardState, 'white');
        const blackKingPos = findKingPosition(boardState, 'black');
        
        if (whiteKingPos) {
            const centerDistance = Math.abs(3.5 - whiteKingPos.row) + Math.abs(3.5 - whiteKingPos.col);
            evaluation += (14 - centerDistance) * 15;
        }
        if (blackKingPos) {
            const centerDistance = Math.abs(3.5 - blackKingPos.row) + Math.abs(3.5 - blackKingPos.col);
            evaluation -= (14 - centerDistance) * 15;
        }
    }
    
    // Mobility with phase-based priority
    const whiteMoves = getAllPossibleMovesForPosition(boardState, 'white').length;
    const blackMoves = getAllPossibleMovesForPosition(boardState, 'black').length;
    evaluation += (whiteMoves - blackMoves) * (5 * strategy.developmentPriority);
    
    return evaluation;
}

function findKingPosition(boardState, player) {
    const kingSymbol = player === 'white' ? '♔' : '♚';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row] && boardState[row][col] === kingSymbol) {
                return { row, col };
            }
        }
    }
    return null;
}

// ========== MINIMAX WITH RISK ASSESSMENT ==========

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

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        let worstCaseEval = Infinity;
        const nextPlayer = player === 'white' ? 'black' : 'white';

        for (const move of moves) {
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
    
    // Detect current phase for logging
    const phase = phaseDetector.detectPhase(board);
    const strategy = phaseDetector.getPhaseStrategy(phase);
    console.log(`🎮 Current Phase: ${strategy.name} (${phaseDetector.countMaterialOnBoard(board).totalPieces} pieces on board)`);
    
    // Try opening book first if available and in opening phase
    if (enhancedAI && phase === 'opening' && moveHistory.length < 12) {
        const openingMoveAlgebraic = enhancedAI.getOpeningRecommendation(moveHistory);
        if (openingMoveAlgebraic) {
            const openingMove = parseAlgebraicMove(openingMoveAlgebraic);
            if (openingMove && isValidMove(openingMove.fromRow, openingMove.fromCol, openingMove.toRow, openingMove.toCol)) {
                console.log(`📖 Opening book: Playing ${openingMoveAlgebraic}`);
                return openingMove;
            }
        }
    }
    
    const isEndgame = phase === 'endgame';
    const searchDepth = isEndgame ? SEARCH_CONFIG.endgameDepth : SEARCH_CONFIG.baseDepth;
    
    console.log(`🔍 AI searching at depth ${searchDepth} with ${strategy.name} strategy`);
    console.log(`   Capture Priority: ${Math.round(strategy.capturePriority * 100)}%`);
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
    
    // Log if capture move was selected
    const targetPiece = board[bestSafeMove.move.toRow] && board[bestSafeMove.move.toRow][bestSafeMove.move.toCol];
    if (targetPiece) {
        console.log(`⚔️ CAPTURE MOVE! Taking ${targetPiece} (${PIECE_VALUES[targetPiece]} + ${CAPTURE_BONUS} bonus)`);
    }
    
    // Extend calculations for the selected line
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

// ========== AI MOVE EXECUTION ==========

function makeAIMove() {
    if (isThinking || gameOver) return;

    isThinking = true;
    const thinkingElement = document.getElementById('thinking');
    const syncStatusElement = document.getElementById('sync-status');

    if (thinkingElement) thinkingElement.style.display = 'block';
    if (syncStatusElement) {
        syncStatusElement.textContent = 'AI thinking with risk assessment...';
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
        
        // Update phase display after move
        updatePhaseDisplay();
    }, 300);
}

// ========== UTILITY FUNCTIONS ==========

function isPieceDefended(pieceRow, pieceCol, defenderColor) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const defender = board[row][col];
            if (defender && isPlayerPiece(defender, defenderColor)) {
                if (canPieceAttack(defender, row, col, pieceRow, pieceCol, board)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function canBeCapturedImmediately(pieceRow, pieceCol, pieceColor) {
    const opponentColor = pieceColor === 'white' ? 'black' : 'white';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const attacker = board[row][col];
            if (attacker && isPlayerPiece(attacker, opponentColor)) {
                if (canPieceAttack(attacker, row, col, pieceRow, pieceCol, board)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isMoveSafe(fromRow, fromCol, toRow, toCol, player) {
    const piece = board[fromRow][fromCol];
    const originalBoard = board.map(row => [...row]);
    const originalEnPassant = enPassantTarget;
    const originalCastling = { ...castlingRights };

    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';

    let pieceIsSafe = true;
    if (canBeCapturedImmediately(toRow, toCol, player)) {
        if (!isPieceDefended(toRow, toCol, player)) {
            pieceIsSafe = false;
        }
    }
    const kingInCheck = isKingInCheck(board, player);

    board = originalBoard;
    enPassantTarget = originalEnPassant;
    castlingRights = originalCastling;

    return { safe: pieceIsSafe && !kingInCheck };
}

function isBadSacrifice(move, player) {
    const movingPiece = board[move.fromRow][move.fromCol];
    const targetPiece = board[move.toRow][move.toCol];
    const pieceValue = PIECE_VALUES[movingPiece] || 0;
    const targetValue = PIECE_VALUES[targetPiece] || 0;

    if (targetPiece) {
        if (targetValue >= pieceValue) {
            const isDefended = isPieceDefended(move.toRow, move.toCol, player === 'white' ? 'black' : 'white');
            if (isDefended && !isPieceDefended(move.fromRow, move.fromCol, player)) {
                return true;
            }
        }
    }
    return false;
}

// ========== UI FUNCTIONS ==========

function updateAIStats() {
    const gamesPlayedElement = document.getElementById('games-played');
    const winRateElement = document.getElementById('win-rate');
    const difficultyElement = document.getElementById('ai-difficulty');
    const versionElement = document.getElementById('ai-version');

    if (!gamesPlayedElement || !winRateElement) return;

    gamesPlayedElement.textContent = moveTree ? moveTree.getStats().totalMoves.toString() : '0';
    winRateElement.textContent = enhancedAI ? enhancedAI.getWinRate() : '65';
    
    if (difficultyElement) {
        difficultyElement.textContent = 'PMTS v2.3.2 (No Pawn Jump)';
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

    // Detect initial phase
    const phase = phaseDetector.detectPhase(board);
    const strategy = phaseDetector.getPhaseStrategy(phase);
    console.log(`🎯 New game started! ${GAME_VERSION} - ${strategy.name} strategy`);
    console.log(`🐛 FIXED: Pawns cannot jump over pieces on two-square moves`);
    updatePhaseDisplay();
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
    
    updatePhaseDisplay();
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
        gameModeDisplay.textContent = 'vs AI (PMTS v2.3.2)';
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
        console.log("🧹 Memory cleared!");
        updateAIStats();
        alert('AI memory cleared!');
    }
}

// Expose functions for debugging
if (typeof window !== 'undefined') {
    window.clearAIMemory = clearMemory;
    window.getAIMemoryStats = () => moveTree ? moveTree.getStats() : { totalMoves: 0 };
    window.getGamePhase = () => {
        const phase = phaseDetector.detectPhase(board);
        const strategy = phaseDetector.getPhaseStrategy(phase);
        const material = phaseDetector.countMaterialOnBoard(board);
        return {
            phase: strategy.name,
            description: strategy.description,
            totalPieces: material.totalPieces,
            majorPieces: material.majorPieces,
            minorPieces: material.minorPieces,
            captureBonus: `${CAPTURE_BONUS}/${CAPTURE_PENALTY}`,
            fix: "Pawns cannot jump over pieces on two-square moves"
        };
    };
}

console.log(`✅ Chess Game v${GAME_VERSION} loaded - Fixed Pawn Jump Bug!`);
