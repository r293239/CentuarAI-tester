// chess-game.js
// Enhanced chess game with Persistent Memory Tree Search (PMTS) and Risk Assessment
// VERSION: 2.3.3 - Fixed Time Control (starts immediately, decrements properly)
// COMPATIBLE WITH: chess-ai-database.js (v2.0)

const GAME_VERSION = "2.3.3";

// ========== TIME CONTROL SYSTEM (FIXED) ==========
class TimeControl {
    constructor() {
        this.initialTime = 600; // 10 minutes in seconds
        this.increment = 5; // 5 seconds per move
        this.whiteTime = this.initialTime;
        this.blackTime = this.initialTime;
        this.activePlayer = 'white';
        this.timerInterval = null;
        this.isActive = false;
        this.lastTick = 0;
    }
    
    start(player) {
        // Stop any existing timer first
        this.stop();
        
        this.activePlayer = player || 'white';
        this.isActive = true;
        this.lastTick = Date.now();
        this.startTimer();
        this.updateDisplay();
        console.log(`⏰ Timer started for ${this.activePlayer}`);
    }
    
    stop() {
        this.isActive = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    pause() {
        this.isActive = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    resume() {
        if (!this.isActive && !gameOver) {
            this.isActive = true;
            this.lastTick = Date.now();
            this.startTimer();
        }
    }
    
    switchPlayer() {
        if (!this.isActive || gameOver) return;
        
        // Add increment to the player who just moved
        if (this.activePlayer === 'white') {
            this.whiteTime += this.increment;
        } else {
            this.blackTime += this.increment;
        }
        
        // Switch active player
        this.activePlayer = this.activePlayer === 'white' ? 'black' : 'white';
        this.lastTick = Date.now();
        this.updateDisplay();
        
        console.log(`⏰ Timer switched to ${this.activePlayer} | White: ${this.formatTime(this.whiteTime)} | Black: ${this.formatTime(this.blackTime)}`);
    }
    
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = setInterval(() => {
            if (!this.isActive || gameOver) return;
            
            const now = Date.now();
            const elapsed = (now - this.lastTick) / 1000; // Convert to seconds
            this.lastTick = now;
            
            if (this.activePlayer === 'white') {
                this.whiteTime = Math.max(0, this.whiteTime - elapsed);
                if (this.whiteTime <= 0.01) {
                    this.whiteTime = 0;
                    this.timeout('white');
                }
            } else {
                this.blackTime = Math.max(0, this.blackTime - elapsed);
                if (this.blackTime <= 0.01) {
                    this.blackTime = 0;
                    this.timeout('black');
                }
            }
            
            this.updateDisplay();
        }, 100); // Update every 100ms for smooth display
    }
    
    timeout(player) {
        this.stop();
        gameOver = true;
        const winner = player === 'white' ? 'Black' : 'White';
        
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `⏰ Time out! ${winner} wins!`;
            statusElement.classList.add('checkmate');
        }
        
        console.log(`⏰ Time out! ${player} ran out of time. ${winner} wins!`);
        createBoard();
    }
    
    updateDisplay() {
        const whiteTimeElement = document.getElementById('white-time');
        const blackTimeElement = document.getElementById('black-time');
        const whiteIndicator = document.getElementById('white-active-indicator');
        const blackIndicator = document.getElementById('black-active-indicator');
        
        if (whiteTimeElement) {
            whiteTimeElement.textContent = this.formatTime(this.whiteTime);
            if (this.whiteTime < 60) {
                whiteTimeElement.style.color = '#ff6b6b';
                whiteTimeElement.style.textShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
            } else {
                whiteTimeElement.style.color = '#4CAF50';
                whiteTimeElement.style.textShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
            }
        }
        
        if (blackTimeElement) {
            blackTimeElement.textContent = this.formatTime(this.blackTime);
            if (this.blackTime < 60) {
                blackTimeElement.style.color = '#ff6b6b';
                blackTimeElement.style.textShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
            } else {
                blackTimeElement.style.color = '#4CAF50';
                blackTimeElement.style.textShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
            }
        }
        
        // Update active indicators
        if (whiteIndicator) {
            whiteIndicator.style.display = (this.activePlayer === 'white' && this.isActive) ? 'inline' : 'none';
        }
        if (blackIndicator) {
            blackIndicator.style.display = (this.activePlayer === 'black' && this.isActive) ? 'inline' : 'none';
        }
        
        // Highlight active row
        const whiteRow = document.querySelector('.white-time-row');
        const blackRow = document.querySelector('.black-time-row');
        
        if (whiteRow) {
            whiteRow.style.boxShadow = (this.activePlayer === 'white' && this.isActive) 
                ? '0 0 15px rgba(76, 175, 80, 0.5)' : 'none';
            whiteRow.style.transition = 'box-shadow 0.3s ease';
        }
        if (blackRow) {
            blackRow.style.boxShadow = (this.activePlayer === 'black' && this.isActive) 
                ? '0 0 15px rgba(76, 175, 80, 0.5)' : 'none';
            blackRow.style.transition = 'box-shadow 0.3s ease';
        }
    }
    
    formatTime(seconds) {
        if (seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    setTimeControl(minutes, increment) {
        this.initialTime = minutes * 60;
        this.increment = increment;
        this.whiteTime = this.initialTime;
        this.blackTime = this.initialTime;
        this.updateDisplay();
        console.log(`⏰ Time control set to ${minutes}+${increment}`);
    }
    
    reset() {
        this.stop();
        this.whiteTime = this.initialTime;
        this.blackTime = this.initialTime;
        this.activePlayer = 'white';
        this.updateDisplay();
    }
    
    getTime(player) {
        return player === 'white' ? this.whiteTime : this.blackTime;
    }
    
    syncWithPlayer(currentGamePlayer) {
        // Only sync if timer is active and game not over
        if (!this.isActive || gameOver) return;
        
        // If active player doesn't match game player, fix it
        if (this.activePlayer !== currentGamePlayer) {
            console.log(`⏰ Syncing timer: ${this.activePlayer} -> ${currentGamePlayer}`);
            this.activePlayer = currentGamePlayer;
            this.lastTick = Date.now();
            this.updateDisplay();
        }
    }
}

let timeControl = new TimeControl();

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
let aiPlayer = 'black';
let moveCount = 1;
let halfMoveCount = 0;
let lastMove = null;
let isThinking = false;
let gameStarted = false;

let castlingRights = {
    whiteKingside: true,
    whiteQueenside: true,
    blackKingside: true,
    blackQueenside: true
};

let enPassantTarget = null;
let enhancedAI = null;

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

const ENDGAME_PIECE_SQUARE_TABLES = {
    '♔': [
        [-50, -40, -30, -20, -20, -30, -40, -50],
        [-30, -20, -10, 0, 0, -10, -20, -30],
        [-30, -10, 20, 30, 30, 20, -10, -30],
        [-30, -10, 30, 40, 40, 30, -10, -30],
        [-30, -10, 30, 40, 40, 30, -10, -30],
        [-30, -10, 20, 30, 30, 20, -10, -30],
        [-30, -30, 0, 0, 0, 0, -30, -30],
        [-50, -30, -30, -30, -30, -30, -30, -50]
    ],
    '♚': [
        [-50, -30, -30, -30, -30, -30, -30, -50],
        [-30, -30, 0, 0, 0, 0, -30, -30],
        [-30, -10, 20, 30, 30, 20, -10, -30],
        [-30, -10, 30, 40, 40, 30, -10, -30],
        [-30, -10, 30, 40, 40, 30, -10, -30],
        [-30, -10, 20, 30, 30, 20, -10, -30],
        [-30, -20, -10, 0, 0, -10, -20, -30],
        [-50, -40, -30, -20, -20, -30, -40, -50]
    ]
};

// Console commands
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
    console.log(`Time - White: ${timeControl.formatTime(timeControl.whiteTime)}, Black: ${timeControl.formatTime(timeControl.blackTime)}`);
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
    
    return fen;
};

window.fen = window.getFEN;
window.board = window.displayBoard;

window.setup = function(positionName) {
    const positions = {
        "start": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "test": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    };
    
    if (positions[positionName]) {
        console.log(`Setting up ${positionName} position...`);
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
    console.log(`Legal moves for ${currentPlayer} (${moves.length} total):`);
    algebraicMoves.forEach(move => console.log(`  ${move}`));
    return algebraicMoves;
};

window.eval = function() {
    const score = evaluatePositionForSearch(board, currentPlayer, moveCount);
    const isEndgame = isEndgamePositionForPosition(board);
    console.log(`Position evaluation: ${score}`);
    console.log(`Phase: ${isEndgame ? "Endgame" : "Middlegame/Opening"}`);
    return score;
};

window.ai = function() {
    if (gameMode !== 'ai') {
        console.log("Game mode is not AI. Use 'setMode ai' first.");
        return;
    }
    if (gameOver) {
        console.log("Game is over. Start a new game first.");
        return;
    }
    if (currentPlayer === humanPlayer) {
        console.log("It's your turn! Make a move or switch sides.");
        return;
    }
    console.log("AI is thinking...");
    makeAIMove();
    return "AI move initiated";
};

window.setDepth = function(depth) {
    if (depth >= 1 && depth <= 6) {
        SEARCH_CONFIG.baseDepth = depth;
        SEARCH_CONFIG.endgameDepth = depth + 2;
        console.log(`AI depth set to ${depth} (endgame depth: ${depth+2})`);
        return `AI depth set to ${depth}`;
    } else {
        console.log("Depth must be between 1 and 6");
        return false;
    }
};

window.setMode = function(mode) {
    if (mode === 'ai' || mode === 'player') {
        gameMode = mode;
        const gameModeSelect = document.getElementById('gameMode');
        if (gameModeSelect) gameModeSelect.value = mode;
        changeGameMode();
        console.log(`Game mode set to ${mode === 'ai' ? 'vs AI' : 'vs Player'}`);
        return `Game mode set to ${mode}`;
    } else {
        console.log("Invalid mode. Use 'ai' or 'player'");
        return false;
    }
};

window.setTimeControl = function(minutes, increment) {
    timeControl.setTimeControl(minutes, increment || 0);
    console.log(`Time control set to ${minutes}+${increment || 0}`);
    return `Time control: ${minutes}+${increment || 0}`;
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
    console.log(`Game over: ${gameOver}`);
    console.log(`Human plays: ${humanPlayer}`);
    console.log(`AI plays: ${aiPlayer}`);
    console.log(`Time - White: ${timeControl.formatTime(timeControl.whiteTime)}, Black: ${timeControl.formatTime(timeControl.blackTime)}`);
    
    if (moveTree) {
        const stats = moveTree.getStats();
        console.log(`\n=== AI MEMORY STATS ===`);
        console.log(`Total cached moves: ${stats.totalMoves}`);
        console.log(`Cached positions: ${stats.cachedPositions}`);
    }
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

window.help = function() {
    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║              CHESS GAME CONSOLE COMMANDS v2.3.3                ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝");
    console.log("\n📌 BOARD & POSITION:");
    console.log("  board()            - Show current board");
    console.log("  setFEN('fen')      - Set position from FEN");
    console.log("  getFEN()           - Get current FEN");
    console.log("\n🎮 MOVES:");
    console.log("  move('e2e4')       - Make a move");
    console.log("  legalMoves()       - Show all legal moves");
    console.log("  undo()             - Undo last move");
    console.log("\n🤖 AI & EVALUATION:");
    console.log("  eval()             - Evaluate position");
    console.log("  ai()               - Force AI move");
    console.log("  setDepth(n)        - Set AI depth (1-6)");
    console.log("  setMode('ai/player') - Switch game mode");
    console.log("  switchSide()       - Switch sides");
    console.log("\n⏰ TIME CONTROL:");
    console.log("  setTimeControl(min, inc) - Set time (e.g., setTimeControl(10, 5))");
    console.log("\n📊 GAME INFO:");
    console.log("  stats()            - Show game statistics");
    console.log("  newGame()          - Start new game");
    console.log("  clearMemory()      - Clear AI memory");
    console.log("  help()             - Show this help");
    console.log("\n");
    return "Help displayed above";
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

function toAlgebraicMove(fromRow, fromCol, toRow, toCol) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[fromCol] + ranks[fromRow] + files[toCol] + ranks[toRow];
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
    console.log(`♔ Chess Game v${GAME_VERSION} - PMTS with Risk Assessment + Time Control`);
    console.log(`📦 Memory: ${stats.totalMoves} cached moves`);
    console.log(`⏰ Time Control: ${timeControl.initialTime/60}+${timeControl.increment}`);

    const versionDisplay = document.getElementById('ai-version');
    if (versionDisplay) {
        versionDisplay.textContent = `v${GAME_VERSION}`;
    }
}

// Initialize on page load
window.addEventListener('load', function() {
    moveTree = new PersistentMoveTree();
    
    if (typeof window !== 'undefined') {
        window.board = board;
        window.castlingRights = castlingRights;
        window.enPassantTarget = enPassantTarget;
    }
    
    if (typeof ChessAILearner !== 'undefined') {
        enhancedAI = new ChessAILearner();
        console.log(`🧠 Enhanced AI v${enhancedAI.version} loaded with opening book!`);
    } else {
        console.log("⚠️ ChessAILearner not found - using PMTS only");
    }
    
    createBoard();
    updateStatus();
    updateAIStats();
    changeGameMode();
    displayVersion();
    
    // Start the timer when game loads
    timeControl.reset();
    timeControl.start('white');
    gameStarted = true;
    
    console.log(`♔ Chess Game v${GAME_VERSION} Loaded! ♛`);
    console.log(`⏰ Timer started! White to move.`);
    console.log(`💡 Type 'help()' in console to see available commands!`);
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
    
    // Handle time control - switch timer to other player
    timeControl.switchPlayer();
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
    // Sync timer with current player
    timeControl.syncWithPlayer(currentPlayer);
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
        timeControl.stop();
    } else if (isStalemate()) {
        statusElement.textContent = 'Stalemate! Draw!';
        gameOver = true;
        timeControl.stop();
    } else if (isDraw()) {
        statusElement.textContent = 'Draw!';
        gameOver = true;
        timeControl.stop();
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

// ========== POSITION EVALUATION FUNCTIONS ==========

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
    let queenCount = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece && piece !== '♔' && piece !== '♚') {
                pieceCount++;
                if (piece === '♕' || piece === '♛') queenCount++;
            }
        }
    }
    return pieceCount <= 10 || (pieceCount <= 12 && queenCount === 0);
}

function evaluatePositionForSearch(boardState, player, moveNumber) {
    if (!boardState) return 0;
    
    let evaluation = 0;
    const isEndgame = isEndgamePositionForPosition(boardState);

    // Material evaluation
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece] || 0;
                evaluation += isPlayerPieceForPosition(piece, 'white') ? value : -value;
            }
        }
    }

    // Positional evaluation
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece) {
                let tableValue = 0;
                
                if (isEndgame && (piece === '♔' || piece === '♚') && ENDGAME_PIECE_SQUARE_TABLES[piece]) {
                    tableValue = ENDGAME_PIECE_SQUARE_TABLES[piece][row][col];
                } else if (PIECE_SQUARE_TABLES[piece]) {
                    tableValue = PIECE_SQUARE_TABLES[piece][row][col];
                }
                
                evaluation += isPlayerPieceForPosition(piece, 'white') ? tableValue : -tableValue;
            }
        }
    }

    // Center control bonus
    const centerBonus = 25;
    const centers = [[3,3], [3,4], [4,3], [4,4]];
    for (const [r,c] of centers) {
        const piece = boardState[r] && boardState[r][c];
        if (piece) {
            evaluation += isPlayerPieceForPosition(piece, 'white') ? centerBonus : -centerBonus;
        }
    }

    // Mobility evaluation
    const whiteMoves = getAllPossibleMovesForPosition(boardState, 'white').length;
    const blackMoves = getAllPossibleMovesForPosition(boardState, 'black').length;
    evaluation += (whiteMoves - blackMoves) * 8;

    // King safety in middlegame
    if (!isEndgame) {
        const whiteKingPos = findKing(boardState, 'white');
        const blackKingPos = findKing(boardState, 'black');
        
        if (whiteKingPos) {
            const whitePawnShield = countPawnShield(boardState, whiteKingPos, 'white');
            evaluation += whitePawnShield * 15;
        }
        if (blackKingPos) {
            const blackPawnShield = countPawnShield(boardState, blackKingPos, 'black');
            evaluation -= blackPawnShield * 15;
        }
    }

    // Hanging piece penalty
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece && piece !== '♔' && piece !== '♚') {
                const pieceColor = isPlayerPieceForPosition(piece, 'white') ? 'white' : 'black';
                const isAttacked = isSquareAttackedForPosition(boardState, row, col, pieceColor === 'white' ? 'black' : 'white');
                const isDefended = isSquareDefendedForPosition(boardState, row, col, pieceColor);
                
                if (isAttacked && !isDefended) {
                    const pieceValue = PIECE_VALUES[piece] || 0;
                    if (pieceColor === 'white') {
                        evaluation -= pieceValue * 0.5;
                    } else {
                        evaluation += pieceValue * 0.5;
                    }
                }
            }
        }
    }

    return evaluation;
}

function findKing(boardState, player) {
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

function countPawnShield(boardState, kingPos, player) {
    let shieldCount = 0;
    const pawnSymbol = player === 'white' ? '♙' : '♟';
    const direction = player === 'white' ? -1 : 1;
    
    for (let col = kingPos.col - 1; col <= kingPos.col + 1; col++) {
        if (col >= 0 && col < 8) {
            const shieldRow = kingPos.row + direction;
            if (shieldRow >= 0 && shieldRow < 8) {
                if (boardState[shieldRow][col] === pawnSymbol) {
                    shieldCount++;
                }
            }
        }
    }
    return shieldCount;
}

function isSquareDefendedForPosition(boardState, targetRow, targetCol, defenderColor) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row] && boardState[row][col];
            if (piece && isPlayerPieceForPosition(piece, defenderColor)) {
                if (canPieceAttackForPosition(piece, row, col, targetRow, targetCol, boardState)) {
                    return true;
                }
            }
        }
    }
    return false;
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

    moves.sort((a, b) => {
        const targetA = boardState[a.toRow][a.toCol];
        const targetB = boardState[b.toRow][b.toCol];
        const valueA = targetA ? PIECE_VALUES[targetA] : 0;
        const valueB = targetB ? PIECE_VALUES[targetB] : 0;
        return valueB - valueA;
    });

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
    
    const timeRemaining = timeControl.getTime(currentPlayer);
    let searchDepth = isEndgame ? SEARCH_CONFIG.endgameDepth : SEARCH_CONFIG.baseDepth;
    
    if (timeRemaining < 30) {
        searchDepth = Math.max(2, searchDepth - 1);
    } else if (timeRemaining < 60) {
        searchDepth = Math.max(2, searchDepth);
    }
    
    console.log(`🔍 ${currentPlayer.toUpperCase()} AI searching at depth ${searchDepth} (time: ${timeControl.formatTime(timeRemaining)})`);
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
    
    if (currentPlayer === 'black') {
        evaluatedMoves.sort((a, b) => a.bestCase - b.bestCase);
    } else {
        evaluatedMoves.sort((a, b) => b.bestCase - a.bestCase);
    }
    
    const riskAssessed = riskAssessor.assessLineRisk(evaluatedMoves);
    
    let bestSafeMove;
    if (currentPlayer === 'black') {
        bestSafeMove = riskAssessed.reduce((best, current) => 
            current.bestCase < best.bestCase ? current : best
        , riskAssessed[0]);
    } else {
        bestSafeMove = riskAssessor.findBestSafeMove(riskAssessed);
    }
    
    const searchTime = (performance.now() - searchStartTime).toFixed(0);
    console.log(`⏱️ Search time: ${searchTime}ms | Selected move eval: ${bestSafeMove.bestCase} | Risk: ${bestSafeMove.riskScore}`);
    
    return bestSafeMove.move;
}

function findBestMove() {
    return findBestMoveWithRiskAssessment();
}

// ========== AI MOVE EXECUTION ==========

function makeAIMove() {
    if (isThinking || gameOver) return;
    if (currentPlayer !== aiPlayer) return;

    isThinking = true;
    const thinkingElement = document.getElementById('thinking');
    const syncStatusElement = document.getElementById('sync-status');

    if (thinkingElement) thinkingElement.style.display = 'block';
    if (syncStatusElement) {
        syncStatusElement.textContent = `AI (${aiPlayer}) thinking...`;
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
        difficultyElement.textContent = `PMTS v2.3.3 (${timeControl.initialTime/60}+${timeControl.increment})`;
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
    
    // Reset and start time control
    timeControl.reset();
    timeControl.start('white');

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

    console.log(`🎯 New game started! ${GAME_VERSION} with Time Control`);
    console.log(`⏰ Timer started! White: ${timeControl.formatTime(timeControl.whiteTime)} | Black: ${timeControl.formatTime(timeControl.blackTime)}`);
    
    if (gameMode === 'ai' && humanPlayer === 'black' && currentPlayer === 'white') {
        setTimeout(makeAIMove, 500);
    }
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
    
    // Sync timer with current player after undo
    timeControl.syncWithPlayer(currentPlayer);
    if (!timeControl.isActive && !gameOver) {
        timeControl.resume();
    }
}

function switchSides() {
    humanPlayer = humanPlayer === 'white' ? 'black' : 'white';
    aiPlayer = humanPlayer === 'white' ? 'black' : 'white';
    
    console.log(`🔄 Switched sides. Human now plays ${humanPlayer}, AI plays ${aiPlayer}`);

    if (gameMode === 'ai' && currentPlayer === aiPlayer && !gameOver) {
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
        gameModeDisplay.textContent = `vs AI (${timeControl.initialTime/60}+${timeControl.increment})`;
        if (aiInfo) aiInfo.style.display = 'block';
        
        if (!timeControl.isActive && !gameOver) {
            timeControl.start(currentPlayer);
        }

        if (currentPlayer === aiPlayer && !gameOver) {
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
    window.setTimeControl = (min, inc) => {
        timeControl.setTimeControl(min, inc || 0);
        updateAIStats();
        console.log(`Time control set to ${min}+${inc || 0}`);
    };
}

console.log(`✅ Chess Game v${GAME_VERSION} loaded - Time Controls Fixed!`);
console.log(`⏰ Timer starts immediately and decrements properly!`);
console.log(`💡 Commands: setTimeControl(minutes, increment) - e.g., setTimeControl(10, 5)`);
