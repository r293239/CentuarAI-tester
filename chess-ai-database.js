// chess-ai-database.js
// Enhanced chess AI with learning capabilities and professional opening book

class ChessAILearner {
    constructor() {
        this.performanceHistory = [];
        this.openingBook = this.initializeOpeningBook();
        this.positionEvaluations = new Map();
        this.learningRate = 0.1;
        this.difficulty = 4; // Default difficulty
        this.adaptiveLearning = true;
        this.endgameDatabase = this.initializeEndgameDatabase();
        
        console.log("🧠 Enhanced Chess AI initialized with professional opening book");
    }

    initializeOpeningBook() {
        return {
            // Opening responses based on algebraic notation (from-to format without dashes)
            'e2e4': {
                'e7e5': {
                    moves: ['g1f3', 'f1c4', 'f1b5', 'd2d3'],
                    weights: [35, 30, 25, 10]
                },
                'c7c5': { // Sicilian Defense
                    moves: ['g1f3', 'd2d4', 'b1c3', 'f2f4'],
                    weights: [50, 30, 15, 5]
                },
                'e7e6': { // French Defense
                    moves: ['d2d4', 'g1f3', 'b1d2', 'f1d3'],
                    weights: [40, 30, 20, 10]
                },
                'c7c6': { // Caro-Kann Defense
                    moves: ['d2d4', 'g1f3', 'b1d2'],
                    weights: [40, 35, 25]
                },
                'd7d6': { // Pirc Defense
                    moves: ['d2d4', 'g1f3', 'b1c3'],
                    weights: [40, 35, 25]
                },
                'g8f6': { // Alekhine's Defense
                    moves: ['e4e5', 'b1c3', 'd2d4'],
                    weights: [45, 30, 25]
                },
                'd7d5': { // Scandinavian Defense
                    moves: ['e4d5', 'g1f3'],
                    weights: [70, 30]
                }
            },

            'd2d4': {
                'd7d5': {
                    moves: ['c2c4', 'g1f3', 'b1c3'],
                    weights: [45, 30, 25]
                },
                'g8f6': {
                    moves: ['c2c4', 'g1f3', 'b1c3'],
                    weights: [40, 35, 25]
                },
                'e7e6': {
                    moves: ['c2c4', 'g1f3', 'b1c3'],
                    weights: [40, 30, 30]
                },
                'c7c5': {
                    moves: ['d4d5', 'g1f3', 'c2c4'],
                    weights: [40, 35, 25]
                }
            },

            'g1f3': {
                'd7d5': {
                    moves: ['c2c4', 'g2g3', 'd2d4'],
                    weights: [40, 35, 25]
                },
                'g8f6': {
                    moves: ['c2c4', 'g2g3', 'd2d4'],
                    weights: [35, 35, 30]
                },
                'e7e6': {
                    moves: ['c2c4', 'd2d4', 'g2g3'],
                    weights: [40, 30, 30]
                }
            },

            'c2c4': {
                'e7e5': {
                    moves: ['b1c3', 'g1f3', 'g2g3'],
                    weights: [40, 35, 25]
                },
                'g8f6': {
                    moves: ['b1c3', 'g1f3', 'g2g3'],
                    weights: [35, 40, 25]
                },
                'c7c5': {
                    moves: ['b1c3', 'g1f3', 'g2g3'],
                    weights: [40, 35, 25]
                }
            }
        };
    }

    initializeEndgameDatabase() {
        return {
            kingPawn: {
                'opposition': 'critical_squares_rule',
                'pawn_promotion': 'king_and_pawn_vs_king',
                'triangulation': 'tempo_gaining'
            },
            rookEndgames: {
                'lucena_position': 'winning_technique',
                'philidor_position': 'drawing_technique',
                'rook_and_pawn': 'cut_off_technique'
            },
            queenEndgames: {
                'queen_vs_pawn': 'stalemate_tricks',
                'queen_vs_rook': 'back_rank_mate'
            }
        };
    }

    getOpeningRecommendation(moveHistory) {
        if (moveHistory.length === 0) {
            // First move recommendations
            const firstMoves = ['e2e4', 'd2d4', 'g1f3', 'c2c4'];
            const weights = [35, 35, 20, 10];
            return this.weightedRandomChoice(firstMoves, weights);
        }

        if (moveHistory.length === 1) {
            const lastMove = moveHistory[0];
            if (this.openingBook[lastMove]) {
                const responses = Object.keys(this.openingBook[lastMove]);
                const weights = responses.map(() => 1);
                return this.weightedRandomChoice(responses, weights);
            }
        }

        if (moveHistory.length >= 2) {
            const whiteMove = moveHistory[moveHistory.length - 2];
            const blackMove = moveHistory[moveHistory.length - 1];
            
            if (this.openingBook[whiteMove] && this.openingBook[whiteMove][blackMove]) {
                const data = this.openingBook[whiteMove][blackMove];
                return this.weightedRandomChoice(data.moves, data.weights);
            }
        }

        return null; // No opening recommendation
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
        if (!this.adaptiveLearning) return;

        this.performanceHistory.push({
            timestamp: Date.now(),
            result: gameData.result,
            difficulty: this.difficulty,
            playerColors: gameData.playerColors,
            moves: gameData.moves,
            gameLength: gameData.moves ? gameData.moves.length : 0
        });

        this.adjustDifficultyBasedOnPerformance();
        this.learnFromOpening(gameData.moves, gameData.result);
        this.updatePositionEvaluations(gameData);

        console.log(`🎓 AI learned from game. New difficulty: ${this.difficulty}`);
    }

    adjustDifficultyBasedOnPerformance() {
        const recentGames = this.performanceHistory.slice(-10);
        if (recentGames.length < 5) return;

        const wins = recentGames.filter(game => game.result === 'win').length;
        const winRate = wins / recentGames.length;

        if (winRate > 0.7) {
            this.difficulty = Math.min(6, this.difficulty + 1);
        } else if (winRate < 0.3) {
            this.difficulty = Math.max(2, this.difficulty - 1);
        }

        // Add randomness to prevent predictability
        if (Math.random() < 0.1) {
            this.difficulty += Math.random() < 0.5 ? -1 : 1;
            this.difficulty = Math.max(2, Math.min(6, this.difficulty));
        }
    }

    learnFromOpening(moves, result) {
        if (!moves || moves.length < 6) return;

        const opening = moves.slice(0, 6).join('_');
        if (!this.positionEvaluations.has(opening)) {
            this.positionEvaluations.set(opening, { games: 0, score: 0 });
        }

        const data = this.positionEvaluations.get(opening);
        data.games++;
        
        if (result === 'win') {
            data.score += 1;
        } else if (result === 'draw') {
            data.score += 0.5;
        }
        
        // If this opening performs poorly, adjust weights
        if (data.games >= 5 && (data.score / data.games) < 0.3) {
            this.adjustOpeningWeights(moves[0], moves[1], -0.1);
        }
    }

    adjustOpeningWeights(firstMove, response, adjustment) {
        if (this.openingBook[firstMove] && this.openingBook[firstMove][response]) {
            const data = this.openingBook[firstMove][response];
            for (let i = 0; i < data.weights.length; i++) {
                data.weights[i] = Math.max(1, data.weights[i] + adjustment);
            }
        }
    }

    updatePositionEvaluations(gameData) {
        if (!gameData.moves) return;
        
        const criticalMoves = this.identifyCriticalMoves(gameData.moves);
        
        criticalMoves.forEach(moveIndex => {
            const position = gameData.moves.slice(0, moveIndex).join('_');
            if (!this.positionEvaluations.has(position)) {
                this.positionEvaluations.set(position, { games: 0, score: 0 });
            }
            
            const data = this.positionEvaluations.get(position);
            data.games++;
            
            if (gameData.result === 'win') {
                data.score += 1;
            } else if (gameData.result === 'draw') {
                data.score += 0.5;
            }
        });
    }

    identifyCriticalMoves(moves) {
        const critical = [];
        for (let i = 10; i < Math.min(30, moves.length); i += 2) {
            critical.push(i);
        }
        return critical;
    }

    adjustDifficulty() {
        const variation = Math.floor(Math.random() * 3) - 1;
        return Math.max(2, Math.min(6, this.difficulty + variation));
    }

    getWinRate() {
        if (this.performanceHistory.length === 0) return 50;
        
        const wins = this.performanceHistory.filter(game => game.result === 'win').length;
        const draws = this.performanceHistory.filter(game => game.result === 'draw').length;
        
        return Math.round(((wins + draws * 0.5) / this.performanceHistory.length) * 100);
    }

    getOpeningStatistics() {
        const stats = {};
        this.performanceHistory.forEach(game => {
            if (game.moves && game.moves.length >= 2) {
                const opening = game.moves.slice(0, 2).join(' ');
                if (!stats[opening]) {
                    stats[opening] = { games: 0, wins: 0, draws: 0 };
                }
                stats[opening].games++;
                if (game.result === 'win') stats[opening].wins++;
                if (game.result === 'draw') stats[opening].draws++;
            }
        });
        
        return stats;
    }

    exportLearningData() {
        return {
            performanceHistory: this.performanceHistory,
            difficulty: this.difficulty,
            winRate: this.getWinRate(),
            gamesPlayed: this.performanceHistory.length,
            positionEvaluations: Array.from(this.positionEvaluations.entries()),
            openingStats: this.getOpeningStatistics()
        };
    }

    importLearningData(data) {
        if (data.performanceHistory) {
            this.performanceHistory = data.performanceHistory;
        }
        if (data.difficulty) {
            this.difficulty = data.difficulty;
        }
        if (data.positionEvaluations) {
            this.positionEvaluations = new Map(data.positionEvaluations);
        }
        
        console.log(`🔄 Imported learning data: ${this.performanceHistory.length} games, difficulty ${this.difficulty}`);
    }

    analyzeOpening(moves) {
        if (!moves || moves.length < 6) return null;
        
        const openingMoves = moves.slice(0, 6);
        const openingString = openingMoves.join(' ');
        
        // Basic opening classification
        if (openingString.includes('e2e4 e7e5 g1f3')) {
            if (openingString.includes('f1b5')) return 'Ruy Lopez';
            if (openingString.includes('f1c4')) return 'Italian Game';
            if (openingString.includes('d2d4')) return 'Scotch Game';
        }
        
        if (openingString.includes('d2d4 d7d5')) {
            if (openingString.includes('c2c4')) return 'Queen\'s Gambit';
            if (openingString.includes('g1f3')) return 'London System';
        }
        
        if (openingString.includes('e2e4 c7c5')) return 'Sicilian Defense';
        if (openingString.includes('e2e4 e7e6')) return 'French Defense';
        if (openingString.includes('e2e4 c7c6')) return 'Caro-Kann Defense';
        
        return 'Unknown Opening';
    }

    getImprovementSuggestions() {
        if (this.performanceHistory.length < 10) {
            return ['Play more games to get personalized suggestions'];
        }
        
        const suggestions = [];
        const recentGames = this.performanceHistory.slice(-20);
        const avgGameLength = recentGames.reduce((sum, game) => sum + (game.gameLength || 0), 0) / recentGames.length;
        
        if (avgGameLength < 30) {
            suggestions.push('Focus on improving opening preparation - games are ending too quickly');
        }
        
        if (avgGameLength > 80) {
            suggestions.push('Work on endgame technique - games are lasting very long');
        }
        
        const winRate = this.getWinRate();
        if (winRate < 40) {
            suggestions.push('Consider studying basic tactics and positional principles');
        } else if (winRate > 70) {
            suggestions.push('You\'re playing very well! Try increasing the AI difficulty');
        }
        
        return suggestions.length > 0 ? suggestions : ['Keep practicing and analyzing your games!'];
    }

    reset() {
        this.performanceHistory = [];
        this.positionEvaluations.clear();
        this.difficulty = 4;
        console.log('🔄 AI learning data reset');
    }
}

// chess-game.js
// Main chess game logic with enhanced AI and safety checks

// Initialize enhanced AI system
let enhancedAI = null;

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
const aiDepth = 4;
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

// Piece mappings
const pieceMap = {
    '♜': 'r', '♞': 'n', '♝': 'b', '♛': 'q', '♚': 'k', '♟': 'p',
    '♖': 'R', '♘': 'N', '♗': 'B', '♕': 'Q', '♔': 'K', '♙': 'P'
};

// Enhanced piece values for evaluation
const PIECE_VALUES = {
    '♙': 100, '♘': 320, '♗': 330, '♖': 500, '♕': 900, '♔': 20000,
    '♟': 100, '♞': 320, '♝': 330, '♜': 500, '♛': 900, '♚': 20000,
    '': 0
};

// Enhanced position evaluation tables
const PIECE_SQUARE_TABLES = {
    '♙': [ // White pawns
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [ 50, 50, 50, 50, 50, 50, 50, 50],
        [ 10, 10, 20, 30, 30, 20, 10, 10],
        [  5,  5, 10, 25, 25, 10,  5,  5],
        [  0,  0,  0, 20, 20,  0,  0,  0],
        [  5, -5,-10,  0,  0,-10, -5,  5],
        [  5, 10, 10,-20,-20, 10, 10,  5],
        [  0,  0,  0,  0,  0,  0,  0,  0]
    ],
    '♘': [ // White knights
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    '♗': [ // White bishops
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    '♖': [ // White rooks
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [  5, 10, 10, 10, 10, 10, 10,  5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [  0,  0,  0,  5,  5,  0,  0,  0]
    ],
    '♕': [ // White queen
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    '♔': [ // White king midgame
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

// Initialize on page load
window.addEventListener('load', function() {
    if (typeof ChessAILearner !== 'undefined') {
        enhancedAI = new ChessAILearner();
        loadGameHistory();
        console.log("🧠 Enhanced AI learning system loaded with professional openings!");
    } else {
        console.log("ChessAILearner not found, using basic AI");
    }
    
    createBoard();
    updateStatus();
    updateAIStats();
    changeGameMode();
    
    console.log("♔ Chess Game Loaded! ♛");
});

// Load game history from session storage
function loadGameHistory() {
    try {
        const history = JSON.parse(sessionStorage.getItem('chess_ai_history') || '{"games": []}');
        if (history.learningData && enhancedAI) {
            enhancedAI.importLearningData(history.learningData);
            updateAIStatsDisplay(history);
        }
    } catch (e) {
        console.log("No previous game history found, starting fresh");
    }
}

// Save game to history
function saveGameToHistory(gameData) {
    try {
        const history = JSON.parse(sessionStorage.getItem('chess_ai_history') || '{"games": []}');
        history.games = history.games || [];
        history.games.push(gameData);
        history.metadata = {
            ...history.metadata,
            lastUpdated: new Date().toISOString(),
            totalGames: history.games.length
        };
        if (enhancedAI) {
            history.learningData = enhancedAI.exportLearningData();
        }
        sessionStorage.setItem('chess_ai_history', JSON.stringify(history));
    } catch (e) {
        console.warn("Could not save game history:", e);
    }
}

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
            
            // Highlight last move
            if (lastMove && 
                ((lastMove.fromRow === row && lastMove.fromCol === col) ||
                 (lastMove.toRow === row && lastMove.toCol === col))) {
                square.classList.add('last-move');
            }
            
            // Highlight king in check
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
                setTimeout(makeAIMove, 500);
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
    
    // Castling
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
        if (fromRow === startRow && dy === 2 * direction && !board[toRow][toCol]) return true;
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
    const kingSymbol = player === 'white' ? '♔' : '♚';
    let kingRow = -1, kingCol = -1;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (testBoard[row][col] === kingSymbol) {
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
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = testBoard[row][col];
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
        if (testBoard[currentRow][currentCol]) return false;
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
        const promotedPiece = getPromotionPiece(piece);
        board[toRow][toCol] = promotedPiece;
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
    
    const moveNotation = getMoveNotation(fromRow, fromCol, toRow, toCol);
    moveHistory.push(moveNotation);
    updateMoveHistory();
    
    createBoard();
}

function getMoveNotation(fromRow, fromCol, toRow, toCol) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    return files[fromCol] + ranks[fromRow] + files[toCol] + ranks[toRow];
}

function getPromotionPiece(pawn) {
    if (gameMode === 'ai' && currentPlayer !== humanPlayer) {
        return pawn === '♙' ? '♕' : '♛';
    }
    
    const isWhite = pawn === '♙';
    const pieces = isWhite ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞'];
    
    let choice = 0;
    const userChoice = prompt(`Promote pawn to:\n0 - Queen\n1 - Rook\n2 - Bishop\n3 - Knight`, '0');
    if (userChoice !== null) {
        const num = parseInt(userChoice);
        if (num >= 0 && num <= 3) {
            choice = num;
        }
    }
    
    return pieces[choice];
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
    
    if (toRow === 7 && toCol === 0) castlingRights.whiteQueenside = false;
    if (toRow === 7 && toCol === 7) castlingRights.whiteKingside = false;
    if (toRow === 0 && toCol === 0) castlingRights.blackQueenside = false;
    if (toRow === 0 && toCol === 7) castlingRights.blackKingside = false;
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
        if (gameMode === 'ai') {
            const aiResult = (winner === 'Black' && humanPlayer === 'white') || (winner === 'White' && humanPlayer === 'black') ? 'win' : 'loss';
            updateAIGameResult(aiResult);
        }
    } else if (isStalemate()) {
        statusElement.textContent = 'Stalemate! Draw!';
        gameOver = true;
        if (gameMode === 'ai') {
            updateAIGameResult('draw');
        }
    } else if (isDraw()) {
        statusElement.textContent = 'Draw!';
        gameOver = true;
        if (gameMode === 'ai') {
            updateAIGameResult('draw');
        }
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

// Enhanced position evaluation
function evaluatePosition() {
    let evaluation = 0;
    
    // Material and positional evaluation
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece] || 0;
                const positionalValue = getPiecePositionalValue(piece, row, col);
                const totalValue = value + positionalValue;
                evaluation += isPlayerPiece(piece, 'white') ? totalValue : -totalValue;
            }
        }
    }
    
    // Advanced positional evaluation
    evaluation += evaluateAdvancedPosition();
    
    return evaluation / 100;
}

function getPiecePositionalValue(piece, row, col) {
    if (PIECE_SQUARE_TABLES[piece]) {
        return PIECE_SQUARE_TABLES[piece][row][col];
    }
    
    // For black pieces, flip the table
    const whitePiece = piece.toLowerCase();
    const whiteSymbol = {
        'p': '♙', 'n': '♘', 'b': '♗', 'r': '♖', 'q': '♕', 'k': '♔'
    }[whitePiece];
    
    if (whiteSymbol && PIECE_SQUARE_TABLES[whiteSymbol]) {
        return -PIECE_SQUARE_TABLES[whiteSymbol][7-row][col];
    }
    
    return 0;
}

function evaluateAdvancedPosition() {
    let score = 0;
    
    // Center control bonus
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    const extendedCenter = [[2,2], [2,3], [2,4], [2,5], [3,2], [3,5], [4,2], [4,5], [5,2], [5,3], [5,4], [5,5]];
    
    for (const [row, col] of centerSquares) {
        const piece = board[row][col];
        if (piece) {
            score += isPlayerPiece(piece, 'white') ? 30 : -30;
        }
    }
    
    for (const [row, col] of extendedCenter) {
        const piece = board[row][col];
        if (piece) {
            score += isPlayerPiece(piece, 'white') ? 10 : -10;
        }
    }
    
    // King safety evaluation
    score += evaluateKingSafety('white') - evaluateKingSafety('black');
    
    // Piece mobility
    const whiteMobility = getAllPossibleMoves('white').length;
    const blackMobility = getAllPossibleMoves('black').length;
    score += (whiteMobility - blackMobility) * 2;
    
    // Development in opening
    if (moveHistory.length < 20) {
        score += evaluateDevelopment();
    }
    
    // Endgame evaluation
    if (moveHistory.length > 40) {
        score += evaluateEndgame();
    }
    
    return score;
}

function evaluateKingSafety(player) {
    const kingPos = findKing(player);
    if (!kingPos) return 0;
    
    let safety = 0;
    
    // Penalize exposed king
    const attackers = countAttackers(kingPos.row, kingPos.col, player === 'white' ? 'black' : 'white');
    safety -= attackers * 20;
    
    // Reward castling
    if (player === 'white') {
        if (!castlingRights.whiteKingside && !castlingRights.whiteQueenside && kingPos.col > 5) {
            safety += 50;
        }
    } else {
        if (!castlingRights.blackKingside && !castlingRights.blackQueenside && kingPos.col > 5) {
            safety += 50;
        }
    }
    
    return safety;
}

function countAttackers(targetRow, targetCol, attackerColor) {
    let count = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && isPlayerPiece(piece, attackerColor)) {
                if (canPieceAttack(piece, row, col, targetRow, targetCol, board)) {
                    count++;
                }
            }
        }
    }
    return count;
}

function evaluateDevelopment() {
    let score = 0;
    
    // White development
    if (board[7][1] !== '♘') score += 15; // Queen's knight developed
    if (board[7][6] !== '♘') score += 15; // King's knight developed
    if (board[7][2] !== '♗') score += 15; // Queen's bishop developed
    if (board[7][5] !== '♗') score += 15; // King's bishop developed
    
    // Black development
    if (board[0][1] !== '♞') score -= 15;
    if (board[0][6] !== '♞') score -= 15;
    if (board[0][2] !== '♝') score -= 15;
    if (board[0][5] !== '♝') score -= 15;
    
    // Castling bonus
    if (!castlingRights.whiteKingside && !castlingRights.whiteQueenside) score += 30;
    if (!castlingRights.blackKingside && !castlingRights.blackQueenside) score -= 30;
    
    return score;
}

function evaluateEndgame() {
    let score = 0;
    
    // King activity in endgame
    const whiteKing = findKing('white');
    const blackKing = findKing('black');
    
    if (whiteKing && blackKing) {
        // Centralized king is better in endgame
        const whiteCentrality = Math.abs(3.5 - whiteKing.row) + Math.abs(3.5 - whiteKing.col);
        const blackCentrality = Math.abs(3.5 - blackKing.row) + Math.abs(3.5 - blackKing.col);
        score += (blackCentrality - whiteCentrality) * 10;
    }
    
    return score;
}

function findKing(player) {
    const kingSymbol = player === 'white' ? '♔' : '♚';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === kingSymbol) {
                return { row, col };
            }
        }
    }
    return null;
}

function updateAIStats() {
    const gamesPlayedElement = document.getElementById('games-played');
    const winRateElement = document.getElementById('win-rate');
    
    if (!gamesPlayedElement || !winRateElement) return;
    
    if (enhancedAI) {
        const winRate = enhancedAI.getWinRate();
        const gamesPlayed = enhancedAI.performanceHistory.length;
        
        gamesPlayedElement.textContent = gamesPlayed;
        winRateElement.textContent = `${winRate}%`;
    } else {
        gamesPlayedElement.textContent = '0';
        winRateElement.textContent = '50%';
    }
}

function updateAIStatsDisplay(historyData) {
    if (historyData.metadata) {
        const gamesPlayedElement = document.getElementById('games-played');
        const winRateElement = document.getElementById('win-rate');
        
        if (gamesPlayedElement) gamesPlayedElement.textContent = historyData.metadata.totalGames || 0;
        
        if (historyData.learningData && historyData.learningData.winRate && winRateElement) {
            winRateElement.textContent = `${historyData.learningData.winRate}%`;
        }
    }
}

function updateAIGameResult(result) {
    if (enhancedAI) {
        const gameData = {
            result: result,
            playerColors: { ai: humanPlayer === 'white' ? 'black' : 'white' },
            moves: moveHistory,
            difficulty: enhancedAI.difficulty
        };
        enhancedAI.learnFromGame(gameData);
        
        saveGameToHistory({
            timestamp: new Date().toISOString(),
            result: result,
            moves: moveHistory,
            aiColor: humanPlayer === 'white' ? 'black' : 'white',
            humanColor: humanPlayer,
            gameLength: moveHistory.length,
            opening: enhancedAI.analyzeOpening(moveHistory) || 'Unknown'
        });
    }
    
    updateAIStats();
}

// ========== ENHANCED AI MOVE MAKING WITH SAFETY CHECKS ==========

// Check if a piece is defended
function isPieceDefended(pieceRow, pieceCol, defenderColor) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const defender = board[row][col];
            if (defender && isPlayerPiece(defender, defenderColor)) {
                // Check if this defender can capture the piece if it were an enemy
                const originalTarget = board[pieceRow][pieceCol];
                board[pieceRow][pieceCol] = defenderColor === 'white' ? '♟' : '♙'; // Temporary enemy piece
                const canAttack = canPieceAttack(defender, row, col, pieceRow, pieceCol, board);
                board[pieceRow][pieceCol] = originalTarget;
                
                if (canAttack) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Check if a piece can be captured by the opponent
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

// Enhanced move safety check - returns true if moving piece would be safe
function isMoveSafe(fromRow, fromCol, toRow, toCol, playerColor) {
    const movingPiece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    
    // Simulate the move
    const originalBoard = board.map(row => [...row]);
    const originalEnPassant = enPassantTarget;
    const originalCastling = { ...castlingRights };
    
    // Make temporary move
    board[toRow][toCol] = movingPiece;
    board[fromRow][fromCol] = '';
    
    // Handle captures
    const isCapture = !!targetPiece;
    
    // Check if the moved piece can be captured after the move
    let pieceIsSafe = true;
    
    // Check if the moved piece is now under attack
    if (canBeCapturedImmediately(toRow, toCol, playerColor)) {
        // Check if the piece is defended
        if (!isPieceDefended(toRow, toCol, playerColor)) {
            pieceIsSafe = false;
        }
    }
    
    // Also check if moving the piece exposes the king to check
    const kingInCheck = isKingInCheck(board, playerColor);
    
    // Restore board
    board[fromRow][fromCol] = movingPiece;
    board[toRow][toCol] = targetPiece;
    enPassantTarget = originalEnPassant;
    castlingRights = originalCastling;
    
    return pieceIsSafe && !kingInCheck;
}

// Filter moves to only safe ones (prioritize safe moves)
function getSafeMoves(player, includeAllMoves = false) {
    const allMoves = getAllPossibleMoves(player);
    
    if (includeAllMoves) {
        return allMoves;
    }
    
    // Separate moves into safe and unsafe
    const safeMoves = [];
    const unsafeMoves = [];
    
    for (const move of allMoves) {
        const isSafe = isMoveSafe(move.fromRow, move.fromCol, move.toRow, move.toCol, player);
        if (isSafe) {
            safeMoves.push(move);
        } else {
            unsafeMoves.push(move);
        }
    }
    
    // If there are safe moves, only return those
    // If no safe moves, return all moves (sometimes you have to sacrifice)
    return safeMoves.length > 0 ? safeMoves : allMoves;
}

// AI Move Making with Enhanced Safety Checks
function makeAIMove() {
    if (isThinking || gameOver) return;
    
    isThinking = true;
    const thinkingElement = document.getElementById('thinking');
    const syncStatusElement = document.getElementById('sync-status');
    
    if (thinkingElement) thinkingElement.style.display = 'block';
    if (syncStatusElement) {
        syncStatusElement.textContent = 'AI thinking...';
        syncStatusElement.classList.add('thinking');
    }
    
    setTimeout(() => {
        const bestMove = findBestMoveWithSafety();
        if (bestMove) {
            makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
            switchPlayer();
            updateStatus();
            
            if (enhancedAI && moveHistory.length <= 12) {
                const opening = enhancedAI.analyzeOpening(moveHistory);
                if (opening && opening !== 'Unknown Opening') {
                    console.log(`🎯 AI is playing: ${opening}`);
                }
            }
        }
        
        isThinking = false;
        if (thinkingElement) thinkingElement.style.display = 'none';
        if (syncStatusElement) {
            syncStatusElement.textContent = 'Ready';
            syncStatusElement.classList.remove('thinking');
        }
    }, 300);
}

function findBestMoveWithSafety() {
    // Check opening book first
    if (enhancedAI && moveHistory.length < 12) {
        const openingMove = enhancedAI.getOpeningRecommendation(moveHistory);
        if (openingMove) {
            const move = parseOpeningMove(openingMove);
            if (move && isValidMove(move.fromRow, move.fromCol, move.toRow, move.toCol)) {
                // Verify the opening move is safe
                if (isMoveSafe(move.fromRow, move.fromCol, move.toRow, move.toCol, currentPlayer)) {
                    console.log(`📖 AI plays safe opening move: ${openingMove}`);
                    return move;
                }
            }
        }
    }
    
    // Get safe moves first
    const safeMoves = getSafeMoves(currentPlayer, false);
    
    if (safeMoves.length === 0) {
        console.log("⚠️ No safe moves available, using any legal move");
        const allMoves = getAllPossibleMoves(currentPlayer);
        if (allMoves.length === 0) return null;
        return evaluateMovesWithSafety(allMoves);
    }
    
    console.log(`🛡️ AI considering ${safeMoves.length} safe moves out of ${getAllPossibleMoves(currentPlayer).length} total`);
    
    // Use enhanced minimax with safety bias
    const depth = enhancedAI ? Math.min(enhancedAI.adjustDifficulty(), 5) : 4;
    const result = minimaxWithSafety(board, depth, -Infinity, Infinity, currentPlayer === 'white', currentPlayer);
    
    return result.move;
}

// Enhanced minimax with safety bias
function minimaxWithSafety(position, depth, alpha, beta, maximizingPlayer, player) {
    if (depth === 0 || isGameOverPosition(position)) {
        return { score: evaluatePositionWithSafety(player), move: null };
    }
    
    const moves = getSafeMovesForPosition(position, player, maximizingPlayer);
    
    if (moves.length === 0) {
        return { score: maximizingPlayer ? -20000 : 20000, move: null };
    }
    
    // Enhanced move ordering with safety bonus
    moves.sort((a, b) => {
        const scoreA = evaluateMoveWithSafety(a, player);
        const scoreB = evaluateMoveWithSafety(b, player);
        return maximizingPlayer ? scoreB - scoreA : scoreA - scoreB;
    });
    
    let bestMove = moves[0];
    
    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const newPosition = makeTestMove(position, move);
            const evaluation = minimaxWithSafety(newPosition, depth - 1, alpha, beta, false, player === 'white' ? 'black' : 'white');
            
            if (evaluation.score > maxEval) {
                maxEval = evaluation.score;
                bestMove = move;
            }
            
            alpha = Math.max(alpha, evaluation.score);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const newPosition = makeTestMove(position, move);
            const evaluation = minimaxWithSafety(newPosition, depth - 1, alpha, beta, true, player === 'white' ? 'black' : 'white');
            
            if (evaluation.score < minEval) {
                minEval = evaluation.score;
                bestMove = move;
            }
            
            beta = Math.min(beta, evaluation.score);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function getSafeMovesForPosition(position, player, isMaximizing) {
    // Temporarily set board to position for move generation
    const originalBoard = board;
    board = position;
    
    const moves = getSafeMoves(player, false);
    
    board = originalBoard;
    return moves;
}

function evaluatePositionWithSafety(player) {
    let score = evaluatePosition();
    
    // Add safety bonus/penalty
    const safeMovesCount = getSafeMoves(player, false).length;
    const totalMovesCount = getAllPossibleMoves(player).length;
    
    if (totalMovesCount > 0) {
        const safetyRatio = safeMovesCount / totalMovesCount;
        // Bonus for having many safe moves
        score += (safetyRatio - 0.5) * 50;
    }
    
    return score;
}

function evaluateMoveWithSafety(move, player) {
    let score = 0;
    
    const capturedPiece = board[move.toRow][move.toCol];
    const movingPiece = board[move.fromRow][move.fromCol];
    
    // Prioritize captures (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
    if (capturedPiece) {
        score += (PIECE_VALUES[capturedPiece] || 0) - (PIECE_VALUES[movingPiece] || 0) / 10;
    }
    
    // Prefer central moves
    const centerDistance = Math.abs(move.toRow - 3.5) + Math.abs(move.toCol - 3.5);
    score -= centerDistance * 5;
    
    // BIG BONUS for safe moves
    if (isMoveSafe(move.fromRow, move.fromCol, move.toRow, move.toCol, player)) {
        score += 100;
    } else {
        score -= 200; // Heavy penalty for unsafe moves
    }
    
    // Bonus for piece development in opening
    if (moveHistory.length < 20) {
        if (movingPiece === '♘' || movingPiece === '♗' || movingPiece === '♞' || movingPiece === '♝') {
            if ((movingPiece === '♘' || movingPiece === '♗') && move.fromRow === 7) score += 20;
            if ((movingPiece === '♞' || movingPiece === '♝') && move.fromRow === 0) score += 20;
        }
    }
    
    // Bonus for checks
    const testBoard = makeTestMove(board, move);
    const opponent = player === 'white' ? 'black' : 'white';
    if (isKingInCheck(testBoard, opponent)) {
        score += 50;
    }
    
    // Bonus for moving pieces away from attack
    if (canBeCapturedImmediately(move.fromRow, move.fromCol, player)) {
        const isDefended = isPieceDefended(move.fromRow, move.fromCol, player);
        if (!isDefended) {
            score += 80; // Bonus for moving an undefended piece to safety
        }
    }
    
    return score;
}

function evaluateMovesWithSafety(moves) {
    let bestScore = -Infinity;
    let bestMove = moves[0];
    
    for (const move of moves) {
        const score = evaluateMoveWithSafety(move, currentPlayer);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

function parseOpeningMove(moveStr) {
    if (!moveStr || moveStr.length < 4) return null;
    
    const fromCol = moveStr.charCodeAt(0) - 97;
    const fromRow = 8 - parseInt(moveStr[1]);
    const toCol = moveStr.charCodeAt(2) - 97;
    const toRow = 8 - parseInt(moveStr[3]);
    
    if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
        toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
        return null;
    }
    
    return { fromRow, fromCol, toRow, toCol };
}

function makeTestMove(position, move) {
    const newPosition = position.map(row => [...row]);
    const piece = newPosition[move.fromRow][move.fromCol];
    newPosition[move.toRow][move.toCol] = piece;
    newPosition[move.fromRow][move.fromCol] = '';
    return newPosition;
}

function isGameOverPosition(position) {
    return gameOver;
}

// Game Control Functions
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
    
    console.log("🎯 New game started!");
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
        gameModeDisplay.textContent = 'vs AI';
        if (aiInfo) aiInfo.style.display = 'block';
        
        if (currentPlayer !== humanPlayer && !gameOver) {
            setTimeout(makeAIMove, 500);
        }
    } else {
        gameModeDisplay.textContent = 'vs Player';
        if (aiInfo) aiInfo.style.display = 'none';
    }
}
