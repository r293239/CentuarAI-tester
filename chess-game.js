// chess-game.js
// Main chess game logic

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

// AI Learning System
let aiMemory = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    openingBook: {},
    endgamePatterns: {},
    positionEvaluations: new Map()
};

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

// Piece values
const PIECE_VALUES = {
    '♙': 100, '♘': 320, '♗': 330, '♖': 500, '♕': 900, '♔': 20000,
    '♟': 100, '♞': 320, '♝': 330, '♜': 500, '♛': 900, '♚': 20000,
    '': 0
};

// Initialize on page load
window.addEventListener('load', function() {
    if (typeof ChessAILearner !== 'undefined') {
        enhancedAI = new ChessAILearner();
        loadGameHistory();
        console.log("Enhanced AI learning system loaded!");
    } else {
        console.log("ChessAILearner not found, using basic AI");
    }
    
    createBoard();
    updateStatus();
    updateEvaluation();
    updateAIStats();
    changeGameMode();
    
    console.log("♔ Chess Game Loaded! ♛");
});

// Load game history
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
        sessionStorage.setItem('chess_ai_history', JSON.stringify(history));
    } catch (e) {
        console.warn("Could not save game history:", e);
    }
}

function createBoard() {
    const boardElement = document.getElementById('chessboard');
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
            updateEvaluation();
            
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
    document.getElementById(`square-${row}-${col}`).classList.add('selected');
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
                if (board[r][c] && isPlayerPiece(board[r][c], currentPlayer === 'white' ? 'black' : 'white')) {
                    square.classList.add('capture-move');
                } else {
                    square.classList.add('possible-move');
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
    
    recordMoveForAI(piece, fromRow, fromCol, toRow, toCol, capturedPiece);
    
    const moveNotation = getMoveNotation(piece, fromRow, fromCol, toRow, toCol, capturedPiece);
    moveHistory.push(moveNotation);
    updateMoveHistory();
    
    createBoard();
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

function recordMoveForAI(piece, fromRow, fromCol, toRow, toCol, capturedPiece) {
    // This would record moves for AI learning
    // Implementation depends on how the AI system works
}

function getMoveNotation(piece, fromRow, fromCol, toRow, toCol, capturedPiece) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    const fromSquare = files[fromCol] + ranks[fromRow];
    const toSquare = files[toCol] + ranks[toRow];
    const capture = capturedPiece ? 'x' : '-';
    
    return fromSquare + capture + toSquare;
}

function switchPlayer() {
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
}

function updateStatus() {
    const statusElement = document.getElementById('status');
    const currentPlayerElement = document.getElementById('current-player');
    const moveCounterElement = document.getElementById('move-counter');
    
    if (isCheckmate()) {
        const winner = currentPlayer === 'white' ? 'Black' : 'White';
        statusElement.textContent = `Checkmate! ${winner} wins!`;
        gameOver = true;
        if (gameMode === 'ai') {
            updateAIGameResult(winner === 'AI' ? 'win' : 'loss');
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
    } else {
        statusElement.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} to move`;
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
    return halfMoveCount >= 100 || isInsufficientMaterial() || isThreefoldRepetition();
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

function isThreefoldRepetition() {
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
    const formattedMoves = [];
    
    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moveHistory[i] || '';
        const blackMove = moveHistory[i + 1] || '';
        formattedMoves.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
    }
    
    moveListElement.textContent = formattedMoves.join(' ');
}

function updateEvaluation() {
    const evaluation = evaluatePosition();
    const evaluationElement = document.getElementById('evaluation');
    const formattedEval = evaluation > 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2);
    evaluationElement.textContent = `Position evaluation: ${formattedEval}`;
}

function evaluatePosition() {
    let evaluation = 0;
    
    // Material evaluation
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece];
                evaluation += isPlayerPiece(piece, 'white') ? value : -value;
            }
        }
    }
    
    // Simple positional evaluation
    evaluation += evaluatePosition_positional();
    
    return evaluation / 100; // Convert to pawns
}

function evaluatePosition_positional() {
    let score = 0;
    
    // Center control
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    for (const [row, col] of centerSquares) {
        const piece = board[row][col];
        if (piece) {
            score += isPlayerPiece(piece, 'white') ? 10 : -10;
        }
    }
    
    // King safety (simplified)
    const whiteKingPos = findKing('white');
    const blackKingPos = findKing('black');
    
    if (whiteKingPos && whiteKingPos.row > 5) score += 20;
    if (blackKingPos && blackKingPos.row < 2) score -= 20;
    
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
    
    if (enhancedAI) {
        const winRate = enhancedAI.getWinRate();
        const gamesPlayed = enhancedAI.performanceHistory.length;
        
        gamesPlayedElement.textContent = gamesPlayed;
        winRateElement.textContent = `${winRate}%`;
    } else {
        gamesPlayedElement.textContent = aiMemory.gamesPlayed;
        const totalGames = aiMemory.gamesPlayed;
        const winRate = totalGames > 0 ? Math.round((aiMemory.wins / totalGames) * 100) : 50;
        winRateElement.textContent = `${winRate}%`;
    }
}

function updateAIStatsDisplay(historyData) {
    if (historyData.metadata) {
        const gamesPlayedElement = document.getElementById('games-played');
        const winRateElement = document.getElementById('win-rate');
        
        gamesPlayedElement.textContent = historyData.metadata.totalGames || 0;
        
        if (historyData.learningData && historyData.learningData.winRate) {
            winRateElement.textContent = `${historyData.learningData.winRate}%`;
        }
    }
}

function updateAIGameResult(result) {
    aiMemory.gamesPlayed++;
    if (result === 'win') aiMemory.wins++;
    else if (result === 'loss') aiMemory.losses++;
    else aiMemory.draws++;
    
    if (enhancedAI) {
        const gameData = {
            result: result,
            playerColors: { ai: humanPlayer === 'white' ? 'black' : 'white' },
            moves: moveHistory,
            difficulty: aiDepth
        };
        enhancedAI.learnFromGame(gameData);
        
        // Save game to history
        saveGameToHistory({
            timestamp: new Date().toISOString(),
            result: result,
            moves: moveHistory,
            aiColor: humanPlayer === 'white' ? 'black' : 'white',
            humanColor: humanPlayer,
            gameLength: moveHistory.length,
            learningData: enhancedAI.exportLearningData()
        });
    }
    
    updateAIStats();
}

// AI Move Making
function makeAIMove() {
    if (isThinking || gameOver) return;
    
    isThinking = true;
    document.getElementById('thinking').style.display = 'block';
    document.getElementById('sync-status').textContent = 'AI thinking...';
    
    setTimeout(() => {
        const bestMove = findBestMove();
        if (bestMove) {
            makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
            switchPlayer();
            updateStatus();
            updateEvaluation();
        }
        
        isThinking = false;
        document.getElementById('thinking').style.display = 'none';
        document.getElementById('sync-status').textContent = 'Ready';
    }, 100);
}

function findBestMove() {
    // Check opening book first
    if (enhancedAI && moveHistory.length < 20) {
        const openingMove = enhancedAI.getOpeningRecommendation(moveHistory);
        if (openingMove) {
            const move = parseOpeningMove(openingMove);
            if (move && isValidMove(move.fromRow, move.fromCol, move.toRow, move.toCol)) {
                return move;
            }
        }
    }
    
    // Use minimax algorithm
    const depth = enhancedAI ? enhancedAI.adjustDifficulty() : aiDepth;
    const result = minimax(board, depth, -Infinity, Infinity, currentPlayer === 'white', currentPlayer);
    return result.move;
}

function parseOpeningMove(moveStr) {
    // Parse moves like "e2-e4" to coordinates
    if (!moveStr || moveStr.length < 5) return null;
    
    const parts = moveStr.split('-');
    if (parts.length !== 2) return null;
    
    const from = parts[0];
    const to = parts[1];
    
    const fromCol = from.charCodeAt(0) - 97; // a=0, b=1, etc.
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 97;
    const toRow = 8 - parseInt(to[1]);
    
    if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
        toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
        return null;
    }
    
    return { fromRow, fromCol, toRow, toCol };
}

function minimax(position, depth, alpha, beta, maximizingPlayer, player) {
    if (depth === 0 || isGameOver(position)) {
        return { score: evaluatePosition(), move: null };
    }
    
    const moves = getAllPossibleMoves(player);
    let bestMove = null;
    
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

function makeTestMove(position, move) {
    const newPosition = position.map(row => [...row]);
    const piece = newPosition[move.fromRow][move.fromCol];
    newPosition[move.toRow][move.toCol] = piece;
    newPosition[move.fromRow][move.fromCol] = '';
    return newPosition;
}

function isGameOver(position) {
    return false; // Simplified for now
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
    updateEvaluation();
    document.getElementById('move-list').textContent = '';
    document.getElementById('thinking').style.display = 'none';
    document.getElementById('sync-status').textContent = 'Ready';
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
    updateEvaluation();
    updateMoveHistory();
}

function switchSides() {
    humanPlayer = humanPlayer === 'white' ? 'black' : 'white';
    
    if (gameMode === 'ai' && currentPlayer !== humanPlayer && !gameOver) {
        setTimeout(makeAIMove, 500);
    }
}

function changeGameMode() {
    const gameModeSelect = document.getElementById('gameMode');
    const gameModeDisplay = document.getElementById('game-mode-display');
    const aiInfo = document.getElementById('ai-info');
    
    gameMode = gameModeSelect.value;
    
    if (gameMode === 'ai') {
        gameModeDisplay.textContent = 'vs AI';
        aiInfo.style.display = 'block';
        
        if (currentPlayer !== humanPlayer && !gameOver) {
            setTimeout(makeAIMove, 500);
        }
    } else {
        gameModeDisplay.textContent = 'vs Player';
        aiInfo.style.display = 'none';
    }
}
