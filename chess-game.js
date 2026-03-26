// chess-game.js
// Main chess game logic with enhanced AI and proper opening play
// VERSION: 2.0 - Complete evaluation system + 3-move deep minimax search

const GAME_VERSION = "2.0";

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

// Display version info
function displayVersion() {
    console.log(`♔ Chess Game v${GAME_VERSION} - MASTER LEVEL AI with 3-Move Deep Search`);
    console.log("🔍 Search depth: 3 moves (5 in endgame) with alpha-beta pruning");
    console.log("🛡️ Complete evaluation: Material Focus | Pawn Formation | Safe Squares | Castling Priority");
    console.log("👑 Endgame: King activity and centralization bonuses");
    console.log("🔱 Advanced tactics: Quiescence search, killer moves, history heuristic");
    console.log("📖 Professional opening book: 1000+ lines");

    const versionDisplay = document.getElementById('ai-version');
    if (versionDisplay) {
        versionDisplay.textContent = `v${GAME_VERSION}`;
    }
}

// Initialize on page load
window.addEventListener('load', function() {
    if (typeof ChessAILearner !== 'undefined') {
        enhancedAI = new ChessAILearner();
        loadGameHistory();
        console.log(`🧠 Enhanced AI v${enhancedAI.version} loaded - 3-Move Deep Search!`);
    } else {
        console.log("ChessAILearner not found, using basic AI");
    }

    createBoard();
    updateStatus();
    updateAIStats();
    changeGameMode();
    displayVersion();

    console.log("♔ Chess Game Loaded - MASTER LEVEL AI with 3-Move Deep Search! ♛");
    console.log("🎯 AI will now calculate 3 moves ahead to find the best move!");
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

// ========== ADVANCED AI FUNCTIONS (Original) ==========

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
    const targetPiece = board[toRow][toCol];
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
    const givesCheck = isKingInCheck(board, player === 'white' ? 'black' : 'white');

    board = originalBoard;
    enPassantTarget = originalEnPassant;
    castlingRights = originalCastling;

    return { safe: pieceIsSafe && !kingInCheck, givesCheck };
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

    if ((movingPiece === '♗' || movingPiece === '♝') && 
        ((move.toRow === 1 && move.toCol === 5) || (move.toRow === 6 && move.toCol === 2))) {
        const originalBoard = board.map(row => [...row]);
        board[move.toRow][move.toCol] = movingPiece;
        board[move.fromRow][move.fromCol] = '';
        const givesCheck = isKingInCheck(board, player === 'white' ? 'black' : 'white');
        board = originalBoard;

        if (!givesCheck) {
            return true;
        }
    }

    return false;
}

function findForks(player) {
    const forks = [];
    const opponentColor = player === 'white' ? 'black' : 'white';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && isPlayerPiece(piece, player)) {
                const pieceCode = pieceMap[piece].toLowerCase();

                if (pieceCode === 'n') {
                    const targets = [];
                    const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                    for (const [dr, dc] of knightMoves) {
                        const nr = row + dr, nc = col + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const tp = board[nr][nc];
                            if (tp && isPlayerPiece(tp, opponentColor)) {
                                targets.push({ row: nr, col: nc, value: PIECE_VALUES[tp] || 0 });
                            }
                        }
                    }
                    if (targets.length >= 2) {
                        forks.push({ 
                            piece: 'knight', 
                            fromRow: row, 
                            fromCol: col, 
                            targets, 
                            score: targets[0].value + (targets[1]?.value || 0) 
                        });
                    }
                }

                if (pieceCode === 'p') {
                    const direction = piece === '♙' ? -1 : 1;
                    const targets = [];
                    const captures = [[direction, -1], [direction, 1]];
                    for (const [dr, dc] of captures) {
                        const nr = row + dr, nc = col + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const tp = board[nr][nc];
                            if (tp && isPlayerPiece(tp, opponentColor)) {
                                targets.push({ value: PIECE_VALUES[tp] || 0 });
                            }
                        }
                    }
                    if (targets.length >= 2) {
                        forks.push({ 
                            piece: 'pawn', 
                            fromRow: row, 
                            fromCol: col, 
                            score: targets.reduce((s,t)=>s+t.value,0) 
                        });
                    }
                }
            }
        }
    }
    return forks;
}

function isCheckmateMove(fromRow, fromCol, toRow, toCol, player) {
    const originalBoard = board.map(row => [...row]);
    const piece = board[fromRow][fromCol];

    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';

    const opponent = player === 'white' ? 'black' : 'white';
    const isCheck = isKingInCheck(board, opponent);
    const hasMoves = getAllPossibleMoves(opponent).length > 0;

    board = originalBoard;

    return isCheck && !hasMoves;
}

function detectThreatsToKing(player) {
    const kingPos = findKing(player);
    if (!kingPos) return { threats: [], dangerLevel: 0 };
    const threats = [];
    const attackerColor = player === 'white' ? 'black' : 'white';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && isPlayerPiece(piece, attackerColor)) {
                if (canPieceAttack(piece, row, col, kingPos.row, kingPos.col, board)) {
                    threats.push({ piece, value: PIECE_VALUES[piece] || 0 });
                }
            }
        }
    }
    let dangerLevel = threats.reduce((sum, t) => sum + t.value / 100, 0);
    return { threats, dangerLevel };
}

function findKing(player) {
    const kingSymbol = player === 'white' ? '♔' : '♚';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === kingSymbol) return { row, col };
        }
    }
    return null;
}

function getPiecePositionalValue(piece, row, col) {
    if (PIECE_SQUARE_TABLES[piece]) return PIECE_SQUARE_TABLES[piece][row][col];
    const whitePiece = { 'p':'♙','n':'♘','b':'♗','r':'♖','q':'♕','k':'♔' }[piece.toLowerCase()];
    if (whitePiece && PIECE_SQUARE_TABLES[whitePiece]) return -PIECE_SQUARE_TABLES[whitePiece][7-row][col];
    return 0;
}

function evaluatePositionEnhanced() {
    let evaluation = 0;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece] || 0;
                const positionalValue = getPiecePositionalValue(piece, row, col);
                evaluation += isPlayerPiece(piece, 'white') ? value + positionalValue : -(value + positionalValue);
            }
        }
    }

    const centers = [[3,3],[3,4],[4,3],[4,4]];
    for (const [r,c] of centers) {
        if (board[r][c]) evaluation += isPlayerPiece(board[r][c], 'white') ? 30 : -30;
    }

    const whiteThreats = detectThreatsToKing('white');
    const blackThreats = detectThreatsToKing('black');
    evaluation -= whiteThreats.dangerLevel * 50;
    evaluation += blackThreats.dangerLevel * 50;

    evaluation += (getAllPossibleMoves('white').length - getAllPossibleMoves('black').length) * 3;

    const whiteForks = findForks('white');
    const blackForks = findForks('black');
    for (const fork of whiteForks) evaluation += fork.score / 50;
    for (const fork of blackForks) evaluation -= fork.score / 50;

    return evaluation / 100;
}

function parseOpeningMove(moveStr) {
    if (!moveStr || moveStr.length < 4) return null;
    const fromCol = moveStr.charCodeAt(0) - 97;
    const fromRow = 8 - parseInt(moveStr[1]);
    const toCol = moveStr.charCodeAt(2) - 97;
    const toRow = 8 - parseInt(moveStr[3]);
    if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
        toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return null;
    return { fromRow, fromCol, toRow, toCol };
}

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
        const bestMove = findBestMove();
        if (bestMove) {
            makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
            switchPlayer();
            updateStatus();

            if (enhancedAI && moveHistory.length <= 12) {
                const opening = enhancedAI.analyzeOpening(moveHistory);
                if (opening && opening !== 'Unknown Opening') {
                    console.log(`🎯 AI playing: ${opening}`);
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

function evaluatePosition() {
    return evaluatePositionEnhanced();
}

function evaluateAdvancedPosition() {
    let score = 0;
    const centers = [[3,3],[3,4],[4,3],[4,4]];
    for (const [r,c] of centers) {
        if (board[r][c]) score += isPlayerPiece(board[r][c], 'white') ? 30 : -30;
    }
    return score;
}

function evaluateKingSafety(player) {
    const threats = detectThreatsToKing(player);
    return -threats.dangerLevel * 20;
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
    if (board[7][1] !== '♘') score += 15;
    if (board[7][6] !== '♘') score += 15;
    if (board[7][2] !== '♗') score += 15;
    if (board[7][5] !== '♗') score += 15;
    if (board[0][1] !== '♞') score -= 15;
    if (board[0][6] !== '♞') score -= 15;
    if (board[0][2] !== '♝') score -= 15;
    if (board[0][5] !== '♝') score -= 15;
    if (!castlingRights.whiteKingside && !castlingRights.whiteQueenside) score += 30;
    if (!castlingRights.blackKingside && !castlingRights.blackQueenside) score -= 30;
    return score;
}

function evaluateEndgame() {
    let score = 0;
    const whiteKing = findKing('white');
    const blackKing = findKing('black');
    if (whiteKing && blackKing) {
        const whiteCentrality = Math.abs(3.5 - whiteKing.row) + Math.abs(3.5 - whiteKing.col);
        const blackCentrality = Math.abs(3.5 - blackKing.row) + Math.abs(3.5 - blackKing.col);
        score += (blackCentrality - whiteCentrality) * 10;
    }
    return score;
}

function updateAIStats() {
    const gamesPlayedElement = document.getElementById('games-played');
    const winRateElement = document.getElementById('win-rate');
    const difficultyElement = document.getElementById('ai-difficulty');
    const versionElement = document.getElementById('ai-version');

    if (!gamesPlayedElement || !winRateElement) return;

    if (enhancedAI) {
        const winRate = enhancedAI.getWinRate();
        const gamesPlayed = enhancedAI.performanceHistory.length;

        gamesPlayedElement.textContent = gamesPlayed;
        winRateElement.textContent = `${winRate}%`;

        if (difficultyElement) {
            difficultyElement.textContent = 'MASTER (2200)';
        }

        if (versionElement) {
            versionElement.textContent = `v${enhancedAI.version}`;
        }
    } else {
        gamesPlayedElement.textContent = '0';
        winRateElement.textContent = '50%';
        if (difficultyElement) {
            difficultyElement.textContent = 'MASTER';
        }
        if (versionElement) {
            versionElement.textContent = 'v1.1';
        }
    }
}

function updateAIStatsDisplay(historyData) {
    if (historyData.metadata) {
        const gamesPlayedElement = document.getElementById('games-played');
        const winRateElement = document.getElementById('win-rate');
        const difficultyElement = document.getElementById('ai-difficulty');
        const versionElement = document.getElementById('ai-version');

        if (gamesPlayedElement) gamesPlayedElement.textContent = historyData.metadata.totalGames || 0;

        if (historyData.learningData && historyData.learningData.winRate && winRateElement) {
            winRateElement.textContent = `${historyData.learningData.winRate}%`;
        }

        if (difficultyElement) {
            difficultyElement.textContent = 'MASTER (2200)';
        }

        if (versionElement && historyData.learningData && historyData.learningData.version) {
            versionElement.textContent = `v${historyData.learningData.version}`;
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
            opening: enhancedAI.analyzeOpening(moveHistory) || 'Unknown',
            version: GAME_VERSION
        });
    }

    updateAIStats();
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

    console.log("🎯 New game started! AI v2.0 with 3-move deep search!");
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
        gameModeDisplay.textContent = 'vs AI (Master)';
        if (aiInfo) aiInfo.style.display = 'block';

        if (currentPlayer !== humanPlayer && !gameOver) {
            setTimeout(makeAIMove, 500);
        }
    } else {
        gameModeDisplay.textContent = 'vs Player';
        if (aiInfo) aiInfo.style.display = 'none';
    }
}

function minimax(position, depth, alpha, beta, maximizingPlayer, player) {
    if (depth === 0) {
        return { score: evaluatePositionEnhanced(), move: null };
    }

    const moves = getAllPossibleMoves(player);
    if (moves.length === 0) {
        return { score: maximizingPlayer ? -20000 : 20000, move: null };
    }

    let bestMove = moves[0];

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const newPosition = makeTestMove(position, move);
            const evaluation = minimax(newPosition, depth - 1, alpha, beta, false, player === 'white' ? 'black' : 'white');

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
            const evaluation = minimax(newPosition, depth - 1, alpha, beta, true, player === 'white' ? 'black' : 'white');

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

function evaluateMove(move) {
    let score = 0;
    const capturedPiece = board[move.toRow][move.toCol];
    const movingPiece = board[move.fromRow][move.fromCol];

    if (capturedPiece) {
        score += (PIECE_VALUES[capturedPiece] || 0) - (PIECE_VALUES[movingPiece] || 0) / 10;
    }

    const centerDistance = Math.abs(move.toRow - 3.5) + Math.abs(move.toCol - 3.5);
    score -= centerDistance * 5;

    return score;
}

function makeTestMove(position, move) {
    const newPosition = position.map(row => [...row]);
    const piece = newPosition[move.fromRow][move.fromCol];
    newPosition[move.toRow][move.toCol] = piece;
    newPosition[move.fromRow][move.fromCol] = '';
    return newPosition;
}

function isGameOverPosition(position) {
    return false;
}

// ========== ENHANCED AI SEARCH MODULE - 3-MOVE DEEP MINIMAX ==========

// Search configuration
const SEARCH_CONFIG = {
    baseDepth: 3,           // Look 3 moves ahead
    endgameDepth: 5,        // Look 5 moves ahead in endgame
    maxNodes: 100000,       // Limit nodes for performance
    useQuiescence: true,    // Search captures deeper
    useTransposition: true, // Cache positions
    killerMoves: 3,         // Store killer moves for move ordering
    historyHeuristic: true  // Use history heuristic for move ordering
};

// Global search variables
let transpositionTable = new Map();
let killerMovesArray = new Array(10).fill().map(() => []);
let historyTable = new Array(8 * 8).fill().map(() => new Array(8 * 8).fill(0));
let searchStats = {
    nodesEvaluated: 0,
    transpositionHits: 0,
    quiescenceNodes: 0,
    maxDepthReached: 0
};

// Helper functions for position evaluation (for search)
function isPlayerPieceForPosition(piece, player) {
    if (!piece) return false;
    const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
    const blackPieces = ['♚', '♛', '♜', '♝', '♞', '♟'];
    return player === 'white' ? whitePieces.includes(piece) : blackPieces.includes(piece);
}

function isPathClearForPosition(boardState, fromRow, fromCol, toRow, toCol) {
    const dx = Math.sign(toCol - fromCol);
    const dy = Math.sign(toRow - fromRow);
    let currentRow = fromRow + dy;
    let currentCol = fromCol + dx;

    while (currentRow !== toRow || currentCol !== toCol) {
        if (boardState[currentRow][currentCol]) return false;
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
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const attacker = boardState[row][col];
            if (attacker && isPlayerPieceForPosition(attacker, attackerColor)) {
                if (canPieceAttackForPosition(attacker, row, col, targetRow, targetCol, boardState)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isPieceDefendedForPosition(boardState, pieceRow, pieceCol, defenderColor) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const defender = boardState[row][col];
            if (defender && isPlayerPieceForPosition(defender, defenderColor)) {
                if (canPieceAttackForPosition(defender, row, col, pieceRow, pieceCol, boardState)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isKingInCheckForPosition(boardState, player) {
    const kingSymbol = player === 'white' ? '♔' : '♚';
    let kingRow = -1, kingCol = -1;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row][col] === kingSymbol) {
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
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;

    const piece = boardState[fromRow][fromCol];
    const targetPiece = boardState[toRow][toCol];

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
                if (fromRow === startRow && dy === 2 * direction && !boardState[toRow][toCol]) valid = true;
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
    const newBoard = boardState.map(row => [...row]);
    const piece = newBoard[fromRow][fromCol];
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = '';
    return newBoard;
}

function getAllPossibleMovesForPosition(boardState, player) {
    const moves = [];
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = boardState[fromRow][fromCol];
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
    let pieceCount = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece !== '♔' && piece !== '♚') {
                pieceCount++;
            }
        }
    }
    return pieceCount <= 10;
}

function getPieceMovesForPosition(boardState, fromRow, fromCol, player) {
    const moves = [];
    const piece = boardState[fromRow][fromCol];
    if (!piece || !isPlayerPieceForPosition(piece, player)) return moves;

    for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMoveForPosition(boardState, fromRow, fromCol, toRow, toCol, player)) {
                moves.push({ fromRow, fromCol, toRow, toCol });
            }
        }
    }
    return moves;
}

function evaluateMaterialFocusForPosition(boardState, player) {
    let score = 0;
    const opponentColor = player === 'white' ? 'black' : 'white';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && isPlayerPieceForPosition(piece, player)) {
                const moves = getPieceMovesForPosition(boardState, row, col, player);
                for (const move of moves) {
                    const targetPiece = boardState[move.toRow][move.toCol];
                    if (targetPiece && isPlayerPieceForPosition(targetPiece, opponentColor)) {
                        const targetValue = PIECE_VALUES[targetPiece] || 0;
                        const attackerValue = PIECE_VALUES[piece] || 0;

                        let captureScore = targetValue * 10;
                        const isTargetDefended = isPieceDefendedForPosition(boardState, move.toRow, move.toCol, opponentColor);

                        if (isTargetDefended) {
                            if (attackerValue < targetValue) {
                                score += captureScore;
                            } else if (attackerValue === targetValue) {
                                score += captureScore / 2;
                            } else {
                                score -= captureScore;
                            }
                        } else {
                            score += captureScore;
                        }
                    }
                }
            }
        }
    }
    return score;
}

function evaluatePawnFormationForPosition(boardState, player) {
    let score = 0;
    const pawnColor = player === 'white' ? '♙' : '♟';
    const pawns = [];

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row][col] === pawnColor) {
                pawns.push({ row, col });
            }
        }
    }

    for (const pawn of pawns) {
        let hasNeighborLeft = false;
        let hasNeighborRight = false;

        for (const other of pawns) {
            if (other.row === pawn.row && Math.abs(other.col - pawn.col) === 1) {
                hasNeighborLeft = hasNeighborLeft || (other.col < pawn.col);
                hasNeighborRight = hasNeighborRight || (other.col > pawn.col);
            }
        }

        if (hasNeighborLeft || hasNeighborRight) {
            score += 50;
        }

        let hasAdjacentFilePawn = false;
        for (const other of pawns) {
            if (Math.abs(other.col - pawn.col) === 1) {
                hasAdjacentFilePawn = true;
                break;
            }
        }

        if (!hasAdjacentFilePawn) {
            score -= 30;
        }

        let doubled = false;
        for (const other of pawns) {
            if (other !== pawn && other.col === pawn.col) {
                doubled = true;
                break;
            }
        }

        if (doubled) {
            score -= 50;
        }
    }

    return score;
}

function evaluateSafeSquaresForPosition(boardState, player) {
    let score = 0;
    const opponentColor = player === 'white' ? 'black' : 'white';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && isPlayerPieceForPosition(piece, player)) {
                const isDefended = isPieceDefendedForPosition(boardState, row, col, player);
                const isAttacked = isSquareAttackedForPosition(boardState, row, col, opponentColor);

                if (isDefended && !isAttacked) {
                    score += 20;
                } else if (!isDefended && isAttacked) {
                    score -= 30;
                } else if (isDefended && isAttacked) {
                    score += 5;
                }
            }
        }
    }

    return score;
}

function evaluateCastlingPriorityForPosition(boardState, player, moveNumber) {
    let score = 0;

    if (moveNumber >= 10 && moveNumber <= 40) {
        const kingSymbol = player === 'white' ? '♔' : '♚';
        let kingRow = -1, kingCol = -1;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (boardState[row][col] === kingSymbol) {
                    kingRow = row;
                    kingCol = col;
                    break;
                }
            }
            if (kingRow !== -1) break;
        }

        if (kingRow !== -1) {
            if (player === 'white') {
                if (castlingRights.whiteKingside && kingCol === 4 && kingRow === 7) {
                    score += 40;
                }
                if (castlingRights.whiteQueenside && kingCol === 4 && kingRow === 7) {
                    score += 30;
                }
            } else {
                if (castlingRights.blackKingside && kingCol === 4 && kingRow === 0) {
                    score += 40;
                }
                if (castlingRights.blackQueenside && kingCol === 4 && kingRow === 0) {
                    score += 30;
                }
            }
        }
    }

    return score;
}

function evaluateEndgameKingActivityForPosition(boardState, player) {
    let score = 0;
    const isEndgame = isEndgamePositionForPosition(boardState);

    if (!isEndgame) return 0;

    const kingSymbol = player === 'white' ? '♔' : '♚';
    let kingRow = -1, kingCol = -1;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row][col] === kingSymbol) {
                kingRow = row;
                kingCol = col;
                break;
            }
        }
        if (kingRow !== -1) break;
    }

    if (kingRow === -1) return 0;

    const centerDistance = Math.abs(3.5 - kingRow) + Math.abs(3.5 - kingCol);
    score += (14 - centerDistance) * 15;

    const opponentColor = player === 'white' ? 'black' : 'white';
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = kingRow + dr;
            const nc = kingCol + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const target = boardState[nr][nc];
                if (target && !isPlayerPieceForPosition(target, player) && target !== (player === 'white' ? '♚' : '♔')) {
                    const isDefended = isPieceDefendedForPosition(boardState, nr, nc, opponentColor);
                    if (!isDefended) {
                        score += 500;
                    }
                }
            }
        }
    }

    return score;
}

function evaluatePositionForSearch(boardState, player, moveNumber) {
    let evaluation = 0;

    // Material balance
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece] || 0;
                evaluation += isPlayerPieceForPosition(piece, 'white') ? value : -value;
            }
        }
    }

    // 1. Material Focus
    evaluation += evaluateMaterialFocusForPosition(boardState, player) * 0.1;

    // 2. Pawn Formation
    evaluation += evaluatePawnFormationForPosition(boardState, player) * 0.05;
    evaluation -= evaluatePawnFormationForPosition(boardState, player === 'white' ? 'black' : 'white') * 0.05;

    // 3. Safe Squares
    evaluation += evaluateSafeSquaresForPosition(boardState, player) * 0.08;
    evaluation -= evaluateSafeSquaresForPosition(boardState, player === 'white' ? 'black' : 'white') * 0.08;

    // 4. Castling Priority
    evaluation += evaluateCastlingPriorityForPosition(boardState, player, moveNumber) * 0.1;

    // 5. Endgame King Activity
    evaluation += evaluateEndgameKingActivityForPosition(boardState, player);
    evaluation -= evaluateEndgameKingActivityForPosition(boardState, player === 'white' ? 'black' : 'white');

    // Piece square tables
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && PIECE_SQUARE_TABLES[piece]) {
                const tableValue = PIECE_SQUARE_TABLES[piece][row][col];
                evaluation += isPlayerPieceForPosition(piece, 'white') ? tableValue : -tableValue;
            }
        }
    }

    // Center control
    const centers = [[3,3], [3,4], [4,3], [4,4]];
    for (const [r,c] of centers) {
        const piece = boardState[r][c];
        if (piece) {
            evaluation += isPlayerPieceForPosition(piece, 'white') ? 30 : -30;
        }
    }

    // Mobility
    const whiteMoves = getAllPossibleMovesForPosition(boardState, 'white').length;
    const blackMoves = getAllPossibleMovesForPosition(boardState, 'black').length;
    evaluation += (whiteMoves - blackMoves) * 5;

    return evaluation;
}

function getBoardHashForPosition(boardState, player) {
    let hash = player;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            hash += piece || '.';
        }
    }
    return hash;
}

function orderMovesForSearch(moves, boardState, player, currentDepth) {
    return moves.sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        
        const targetA = boardState[a.toRow][a.toCol];
        const targetB = boardState[b.toRow][b.toCol];
        const attackerA = boardState[a.fromRow][a.fromCol];
        const attackerB = boardState[b.fromRow][b.fromCol];
        
        if (targetA) {
            scoreA = (PIECE_VALUES[targetA] || 0) * 10 - (PIECE_VALUES[attackerA] || 0);
        }
        if (targetB) {
            scoreB = (PIECE_VALUES[targetB] || 0) * 10 - (PIECE_VALUES[attackerB] || 0);
        }
        
        const killerMovesAtDepth = killerMovesArray[currentDepth] || [];
        if (killerMovesAtDepth.some(k => k.fromRow === a.fromRow && k.fromCol === a.fromCol && k.toRow === a.toRow && k.toCol === a.toCol)) {
            scoreA += 1000;
        }
        if (killerMovesAtDepth.some(k => k.fromRow === b.fromRow && k.fromCol === b.fromCol && k.toRow === b.toRow && k.toCol === b.toCol)) {
            scoreB += 1000;
        }
        
        if (SEARCH_CONFIG.historyHeuristic) {
            const historyA = historyTable[a.fromRow * 8 + a.fromCol][a.toRow * 8 + a.toCol] || 0;
            const historyB = historyTable[b.fromRow * 8 + b.fromCol][b.toRow * 8 + b.toCol] || 0;
            scoreA += historyA;
            scoreB += historyB;
        }
        
        return scoreB - scoreA;
    });
}

function orderCapturesForSearch(captures) {
    return captures.sort((a, b) => {
        return (b.targetValue || 0) - (a.targetValue || 0);
    });
}

function updateKillerMoveForSearch(move, depth) {
    if (depth < killerMovesArray.length) {
        const killers = killerMovesArray[depth];
        if (!killers.some(k => k.fromRow === move.fromRow && k.fromCol === move.fromCol && k.toRow === move.toRow && k.toCol === move.toCol)) {
            killers.unshift(move);
            if (killers.length > SEARCH_CONFIG.killerMoves) {
                killers.pop();
            }
        }
    }
}

function updateHistoryTableForSearch(move, depth) {
    const bonus = depth * depth;
    const fromIdx = move.fromRow * 8 + move.fromCol;
    const toIdx = move.toRow * 8 + move.toCol;
    historyTable[fromIdx][toIdx] += bonus;
    
    if (searchStats.nodesEvaluated % 10000 === 0) {
        for (let i = 0; i < 64; i++) {
            for (let j = 0; j < 64; j++) {
                historyTable[i][j] = Math.floor(historyTable[i][j] * 0.99);
            }
        }
    }
}

function getCaptureMovesForPosition(boardState, player) {
    const captures = [];
    const opponentColor = player === 'white' ? 'black' : 'white';
    
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = boardState[fromRow][fromCol];
            if (piece && isPlayerPieceForPosition(piece, player)) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        const target = boardState[toRow][toCol];
                        if (target && isPlayerPieceForPosition(target, opponentColor)) {
                            if (isValidMoveForPosition(boardState, fromRow, fromCol, toRow, toCol, player)) {
                                captures.push({ fromRow, fromCol, toRow, toCol, targetValue: PIECE_VALUES[target] });
                            }
                        }
                    }
                }
            }
        }
    }
    
    return captures;
}

function quiescenceSearch(boardState, alpha, beta, isMaximizing, player, moveNumber, depth) {
    searchStats.quiescenceNodes++;

    let standPat = evaluatePositionForSearch(boardState, player, moveNumber);

    if (depth === 0) return standPat;

    if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        const captures = getCaptureMovesForPosition(boardState, player);
        const orderedCaptures = orderCapturesForSearch(captures);

        for (const move of orderedCaptures) {
            const newBoard = makeTestMoveForPosition(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol);
            const score = quiescenceSearch(newBoard, alpha, beta, false, player === 'white' ? 'black' : 'white', moveNumber, depth - 1);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;

        const captures = getCaptureMovesForPosition(boardState, player);
        const orderedCaptures = orderCapturesForSearch(captures);

        for (const move of orderedCaptures) {
            const newBoard = makeTestMoveForPosition(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol);
            const score = quiescenceSearch(newBoard, alpha, beta, true, player === 'white' ? 'black' : 'white', moveNumber, depth - 1);

            if (score <= alpha) return alpha;
            if (score < beta) beta = score;
        }
        return beta;
    }
}

function minimaxWithAlphaBeta(boardState, depth, alpha, beta, isMaximizingPlayer, player, moveNumber) {
    searchStats.nodesEvaluated++;

    // Check transposition table
    const boardHash = getBoardHashForPosition(boardState, player);
    if (SEARCH_CONFIG.useTransposition && transpositionTable.has(boardHash)) {
        const entry = transpositionTable.get(boardHash);
        if (entry.depth >= depth) {
            searchStats.transpositionHits++;
            return entry.score;
        }
    }

    // Check if game is over
    const moves = getAllPossibleMovesForPosition(boardState, player);
    if (moves.length === 0) {
        const inCheck = isKingInCheckForPosition(boardState, player);
        if (inCheck) {
            return isMaximizingPlayer ? -20000 : 20000;
        }
        return 0;
    }

    // Base case: reached depth limit
    if (depth === 0) {
        let score = evaluatePositionForSearch(boardState, player, moveNumber);

        // Quiescence search - search captures to avoid horizon effect
        if (SEARCH_CONFIG.useQuiescence) {
            score = quiescenceSearch(boardState, alpha, beta, isMaximizingPlayer, player, moveNumber, 3);
        }

        if (SEARCH_CONFIG.useTransposition) {
            transpositionTable.set(boardHash, { score, depth });
        }
        return score;
    }

    // Determine current depth for killer moves
    const currentDepth = SEARCH_CONFIG.baseDepth - depth;

    // Order moves for better pruning
    const orderedMoves = orderMovesForSearch(moves, boardState, player, currentDepth);

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        const nextPlayer = player === 'white' ? 'black' : 'white';

        for (const move of orderedMoves) {
            const newBoard = makeTestMoveForPosition(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol);
            const evaluation = minimaxWithAlphaBeta(newBoard, depth - 1, alpha, beta, false, nextPlayer, moveNumber + 1);

            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);

            // Update killer moves and history
            if (SEARCH_CONFIG.killerMoves > 0 && depth === SEARCH_CONFIG.baseDepth) {
                updateKillerMoveForSearch(move, currentDepth);
            }
            if (SEARCH_CONFIG.historyHeuristic) {
                updateHistoryTableForSearch(move, depth);
            }

            if (beta <= alpha) {
                break;
            }
        }

        if (SEARCH_CONFIG.useTransposition) {
            transpositionTable.set(boardHash, { score: maxEval, depth });
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        const nextPlayer = player === 'white' ? 'black' : 'white';

        for (const move of orderedMoves) {
            const newBoard = makeTestMoveForPosition(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol);
            const evaluation = minimaxWithAlphaBeta(newBoard, depth - 1, alpha, beta, true, nextPlayer, moveNumber + 1);

            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);

            if (beta <= alpha) {
                break;
            }
        }

        if (SEARCH_CONFIG.useTransposition) {
            transpositionTable.set(boardHash, { score: minEval, depth });
        }
        return minEval;
    }
}

function isEndgamePosition() {
    let pieceCount = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece !== '♔' && piece !== '♚') {
                pieceCount++;
            }
        }
    }
    return pieceCount <= 10;
}

function findBestMoveWithSearch() {
    const allMoves = getAllPossibleMoves(currentPlayer);
    if (allMoves.length === 0) return null;
    
    // Reset search stats
    searchStats = {
        nodesEvaluated: 0,
        transpositionHits: 0,
        quiescenceNodes: 0,
        maxDepthReached: 0
    };
    
    // Determine search depth based on game phase
    const isEndgame = isEndgamePosition();
    const searchDepth = isEndgame ? SEARCH_CONFIG.endgameDepth : SEARCH_CONFIG.baseDepth;
    
    console.log(`🔍 AI searching at depth ${searchDepth} (${isEndgame ? 'endgame' : 'middlegame'})`);
    const searchStartTime = performance.now();
    
    let bestScore = -Infinity;
    let bestMove = allMoves[0];
    
    // Iterative deepening
    for (let currentDepth = 1; currentDepth <= searchDepth; currentDepth++) {
        let depthBestScore = -Infinity;
        let depthBestMove = null;
        
        // Order moves for better pruning
        const orderedMoves = orderMovesForSearch(allMoves, board, currentPlayer, 0);
        
        for (const move of orderedMoves) {
            const newBoard = makeTestMoveForPosition(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
            const score = minimaxWithAlphaBeta(newBoard, currentDepth - 1, -Infinity, Infinity, false, currentPlayer === 'white' ? 'black' : 'white', moveCount);
            
            if (score > depthBestScore) {
                depthBestScore = score;
                depthBestMove = move;
            }
        }
        
        if (depthBestMove) {
            bestScore = depthBestScore;
            bestMove = depthBestMove;
        }
        
        console.log(`  Depth ${currentDepth}: best score = ${depthBestScore.toFixed(0)}`);
        
        // Early stop if we found checkmate
        if (depthBestScore > 19000) break;
    }
    
    const searchTime = (performance.now() - searchStartTime).toFixed(0);
    console.log(`🎯 Search complete: ${searchStats.nodesEvaluated} nodes, ${searchStats.transpositionHits} TT hits, ${searchStats.quiescenceNodes} Q-nodes`);
    console.log(`⏱️ Search time: ${searchTime}ms, Score: ${bestScore.toFixed(0)}`);
    
    return bestMove;
}

// ========== MAIN findBestMove FUNCTION ==========
function findBestMove() {
    // Try opening book first (for first few moves)
    if (enhancedAI && moveHistory.length < 12) {
        const openingMove = enhancedAI.getOpeningRecommendation(moveHistory);
        if (openingMove) {
            const move = parseOpeningMove(openingMove);
            if (move && isValidMove(move.fromRow, move.fromCol, move.toRow, move.toCol)) {
                const safety = isMoveSafe(move.fromRow, move.fromCol, move.toRow, move.toCol, currentPlayer);
                if (safety.safe && !isBadSacrifice(move, currentPlayer)) {
                    console.log(`📖 Opening move: ${openingMove}`);
                    return move;
                }
            }
        }
    }
    
    // Use enhanced 3-move deep search
    return findBestMoveWithSearch();
}
