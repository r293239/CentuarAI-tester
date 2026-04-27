// chess-game.js
// VERSION: 2.4.6 – Fixed queen sac, Infinity eval, clamping, improved safety
// COMPATIBLE WITH: chess-ai-database.js (v2.0) and chess-game-database.js (v1.1)

const GAME_VERSION = "2.4.6";

// ========== GAME DATABASES ==========
let openingBook = null;        // From chess-ai-database.js (opening moves)
let patternLearner = null;     // From chess-game-database.js (patterns from full games)

// ========== PERSISTENT MEMORY TREE ==========
class PersistentMoveTree {
    constructor() {
        this.tree = new Map();
        this.positionCache = new Map();
        this.activeLineMoves = [];
        this.loadFromStorage();
    }

    getMoveKey(fr, fc, tr, tc) { return `${fr},${fc},${tr},${tc}`; }

    getPositionHash(board, player, castling, enPassant) {
        if (!board || !Array.isArray(board)) return "empty";
        let hash = player + "|";
        for (let row = 0; row < 8; row++)
            for (let col = 0; col < 8; col++)
                hash += (board[row] && board[row][col]) || ".";
        return hash;
    }

    storeMoveEvaluation(move, evaluation, depth, variations, isBestLine = false) {
        const key = this.getMoveKey(move.fromRow, move.fromCol, move.toRow, move.toCol);
        const node = {
            move,
            evaluation,
            depth,
            variations: variations || [],
            timestamp: Date.now(),
            isBestLine,
            frequency: (this.tree.get(key)?.frequency || 0) + 1
        };
        this.tree.set(key, node);
        this.saveToStorage();
        return node;
    }

    getCachedEvaluation(move) {
        const key = this.getMoveKey(move.fromRow, move.fromCol, move.toRow, move.toCol);
        return this.tree.get(key) || null;
    }

    pruneInactiveLines(seq) {
        if (!seq?.length) return;
        const toDel = [];
        for (const [k] of this.tree) {
            let keep = false;
            for (let i = 0; i <= seq.length; i++)
                if (k.startsWith(seq.slice(0, i).join("|"))) { keep = true; break; }
            if (!keep) toDel.push(k);
        }
        toDel.forEach(k => this.tree.delete(k));
        this.saveToStorage();
    }

    saveToStorage() {
        try { localStorage.setItem('chess_tree', JSON.stringify({ tree: Array.from(this.tree.entries()), version: GAME_VERSION })); } catch (e) {}
    }
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('chess_tree');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.version === GAME_VERSION || data.version === "2.4.1" || data.version === "2.4.2" || data.version === "2.4.3" || data.version === "2.4.5")
                    this.tree = new Map(data.tree);
            }
        } catch (e) {}
    }
    clear() { this.tree.clear(); localStorage.removeItem('chess_tree'); }
    getStats() { return { totalMoves: this.tree.size }; }
}
let moveTree = null;

// ========== BOARD & STATE ==========
let board = [
    ['♜','♞','♝','♛','♚','♝','♞','♜'],
    ['♟','♟','♟','♟','♟','♟','♟','♟'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['♙','♙','♙','♙','♙','♙','♙','♙'],
    ['♖','♘','♗','♕','♔','♗','♘','♖']
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
let castlingRights = { whiteKingside: true, whiteQueenside: true, blackKingside: true, blackQueenside: true };
let enPassantTarget = null;
let enhancedAI = null;
let endgameEngine = null;

// Piece mappings & values
const pieceMap = { '♜':'r','♞':'n','♝':'b','♛':'q','♚':'k','♟':'p','♖':'R','♘':'N','♗':'B','♕':'Q','♔':'K','♙':'P' };
const reversePieceMap = { 'r':'♜','n':'♞','b':'♝','q':'♛','k':'♚','p':'♟','R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔','P':'♙' };
const PIECE_VALUES = { '♙':100,'♘':320,'♗':330,'♖':500,'♕':900,'♔':20000,'♟':100,'♞':320,'♝':330,'♜':500,'♛':900,'♚':20000,'':0 };
const PIECE_SQUARE_TABLES = {
    '♙':[[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
    '♘':[[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
    '♗':[[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
    '♖':[[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
    '♕':[[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
    '♔':[[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
};
const BLACK_PIECE_SQUARE_TABLES = {
    '♟':[[0,0,0,0,0,0,0,0],[5,10,10,-20,-20,10,10,5],[5,-5,-10,0,0,-10,-5,5],[0,0,0,20,20,0,0,0],[5,5,10,25,25,10,5,5],[10,10,20,30,30,20,10,10],[50,50,50,50,50,50,50,50],[0,0,0,0,0,0,0,0]],
    '♞':[[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,5,5,0,-20,-40],[-30,5,10,15,15,10,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,10,15,15,10,0,-30],[-40,-20,0,0,0,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
    '♝':[[-20,-10,-10,-10,-10,-10,-10,-20],[-10,5,0,0,0,0,5,-10],[-10,10,10,10,10,10,10,-10],[-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,5,10,10,5,0,-10],[-10,0,0,0,0,0,0,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
    '♜':[[0,0,0,5,5,0,0,0],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[5,10,10,10,10,10,10,5],[0,0,0,0,0,0,0,0]],
    '♛':[[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,5,0,0,0,0,-10],[-10,5,5,5,5,5,0,-10],[0,0,5,5,5,5,0,-5],[-5,0,5,5,5,5,0,-5],[-10,0,5,5,5,5,0,-10],[-10,0,0,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
    '♚':[[20,30,10,0,0,10,30,20],[20,20,0,0,0,0,20,20],[-10,-20,-20,-20,-20,-20,-20,-10],[-20,-30,-30,-40,-40,-30,-30,-20],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30]]
};
const ENDGAME_PIECE_SQUARE_TABLES = {
    '♔':[[-50,-40,-30,-20,-20,-30,-40,-50],[-30,-20,-10,0,0,-10,-20,-30],[-30,-10,20,30,30,20,-10,-30],[-30,-10,30,40,40,30,-10,-30],[-30,-10,30,40,40,30,-10,-30],[-30,-10,20,30,30,20,-10,-30],[-30,-30,0,0,0,0,-30,-30],[-50,-30,-30,-30,-30,-30,-30,-50]],
    '♚':[[-50,-30,-30,-30,-30,-30,-30,-50],[-30,-30,0,0,0,0,-30,-30],[-30,-10,20,30,30,20,-10,-30],[-30,-10,30,40,40,30,-10,-30],[-30,-10,30,40,40,30,-10,-30],[-30,-10,20,30,30,20,-10,-30],[-30,-20,-10,0,0,-10,-20,-30],[-50,-40,-30,-20,-20,-30,-40,-50]]
};

// ========== MOVE ORDERING & PRUNING ==========
let killerMoves = [[null,null],[null,null],[null,null],[null,null],[null,null]];
let historyTable = new Map();
const HISTORY_MAX = 10000;
const FUTILITY_MARGIN = 200;

function storeKillerMove(move, depth) {
    if (depth >= killerMoves.length) return;
    const k1 = killerMoves[depth][0];
    if (k1 && k1.fromRow===move.fromRow && k1.fromCol===move.fromCol && k1.toRow===move.toRow && k1.toCol===move.toCol) return;
    killerMoves[depth][1] = killerMoves[depth][0];
    killerMoves[depth][0] = { ...move };
}
function getKillerScore(move, depth) {
    if (depth >= killerMoves.length) return 0;
    const k1 = killerMoves[depth][0], k2 = killerMoves[depth][1];
    if (k1 && k1.fromRow===move.fromRow && k1.fromCol===move.fromCol && k1.toRow===move.toRow && k1.toCol===move.toCol) return 2;
    if (k2 && k2.fromRow===move.fromRow && k2.fromCol===move.fromCol && k2.toRow===move.toRow && k2.toCol===move.toCol) return 1;
    return 0;
}
function updateHistory(move, depth) {
    const key = `${move.fromRow},${move.fromCol},${move.toRow},${move.toCol}`;
    historyTable.set(key, Math.min((historyTable.get(key)||0) + depth*depth, HISTORY_MAX));
}
function getHistoryScore(move) {
    return historyTable.get(`${move.fromRow},${move.fromCol},${move.toRow},${move.toCol}`) || 0;
}

function orderMoves(moves, boardState, player, depth) {
    return moves.map(move => {
        let score = 0;
        const victim = boardState[move.toRow]?.[move.toCol];
        const attacker = boardState[move.fromRow]?.[move.fromCol];
        if (victim) score += (PIECE_VALUES[victim]||0)*100 - (PIECE_VALUES[attacker]||0);
        score += getKillerScore(move, depth)*10000;
        score += getHistoryScore(move)/100;
        if ((attacker==='♙' && move.toRow===0) || (attacker==='♟' && move.toRow===7)) score += 50000;
        return { move, score };
    }).sort((a,b) => b.score - a.score).map(x => x.move);
}

function isFutile(boardState, move, alpha, player, depth) {
    if (depth > 2) return false;
    if (boardState[move.toRow]?.[move.toCol]) return false; // capture
    const piece = boardState[move.fromRow]?.[move.fromCol];
    if ((piece==='♙' && move.toRow===0) || (piece==='♟' && move.toRow===7)) return false;
    let material = 0;
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const p = boardState[r]?.[c];
        if (p) material += (isPlayerPieceForPosition(p,'white')?1:-1) * (PIECE_VALUES[p]||0);
    }
    const maxGain = 200;
    if (player==='white') return material + maxGain < alpha - FUTILITY_MARGIN;
    else return -material + maxGain < alpha - FUTILITY_MARGIN;
}

// ========== QUIESCENCE SEARCH ==========
function quiescenceSearch(boardState, alpha, beta, player, maxDepth=6) {
    let standPat = evaluatePositionForSearch(boardState, player, moveCount);
    if (!isFinite(standPat)) standPat = 0;
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;
    const caps = getCapturesAndPromotions(boardState, player);
    if (!caps.length) return standPat;
    caps.sort((a,b) => (PIECE_VALUES[boardState[b.toRow][b.toCol]]||0) - (PIECE_VALUES[boardState[a.toRow][a.toCol]]||0));
    for (const move of caps) {
        const victimVal = PIECE_VALUES[boardState[move.toRow][move.toCol]]||0;
        if (standPat + victimVal + 200 < alpha) continue;
        const newBoard = makeTestMoveForPosition(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol);
        if (!newBoard) continue;
        const next = player==='white'?'black':'white';
        const score = -quiescenceSearch(newBoard, -beta, -alpha, next, maxDepth-1);
        if (!isFinite(score)) continue;
        if (score >= beta) { storeKillerMove(move,0); return beta; }
        if (score > alpha) alpha = score;
    }
    return alpha;
}

function getCapturesAndPromotions(boardState, player) {
    const moves = [];
    const opp = player==='white'?'black':'white';
    for (let fr=0; fr<8; fr++) for (let fc=0; fc<8; fc++) {
        const piece = boardState[fr]?.[fc];
        if (!piece || !isPlayerPieceForPosition(piece, player)) continue;
        for (let tr=0; tr<8; tr++) for (let tc=0; tc<8; tc++) {
            const target = boardState[tr]?.[tc];
            const isCap = target && isPlayerPieceForPosition(target, opp);
            const isPromo = (piece==='♙' && tr===0) || (piece==='♟' && tr===7);
            if (!isCap && !isPromo) continue;
            if (isValidMoveForPosition(boardState, fr, fc, tr, tc, player))
                moves.push({ fromRow:fr, fromCol:fc, toRow:tr, toCol:tc });
        }
    }
    return moves;
}

// ========== BLUNDER / HANGING DETECTION ==========
function detectBlunder(boardState, fr, fc, tr, tc, player) {
    const piece = boardState[fr]?.[fc];
    const pv = PIECE_VALUES[piece]||0;
    const opp = player==='white'?'black':'white';
    const nb = makeTestMoveForPosition(boardState, fr, fc, tr, tc);
    if (!nb) return { isBlunder:true, penalty:500 };
    if (pv>=300) {
        if (isSquareAttackedForPosition(nb, tr, tc, opp)) {
            let def = false;
            for (let r=0; r<8 && !def; r++) for (let c=0; c<8 && !def; c++) {
                const defPiece = nb[r]?.[c];
                if (defPiece && isPlayerPieceForPosition(defPiece, player) && canPieceAttackForPosition(defPiece, r, c, tr, tc, nb))
                    def = true;
            }
            if (!def) return { isBlunder:true, penalty:pv*5 };
        }
    }
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const p = nb[r]?.[c];
        if (p && isPlayerPieceForPosition(p, player) && p!=='♔' && p!=='♚' && (PIECE_VALUES[p]||0)>=300) {
            if (isSquareAttackedForPosition(nb, r, c, opp)) {
                let def = false;
                for (let rr=0; rr<8 && !def; rr++) for (let cc=0; cc<8 && !def; cc++) {
                    const defPiece = nb[rr]?.[cc];
                    if (defPiece && isPlayerPieceForPosition(defPiece, player) && canPieceAttackForPosition(defPiece, rr, cc, r, c, nb))
                        def = true;
                }
                if (!def) return { isBlunder:true, penalty:(PIECE_VALUES[p]||0)*5 };
            }
        }
    }
    return { isBlunder:false, penalty:0 };
}

function isPieceHanging(boardState, row, col, color) {
    const opp = color==='white'?'black':'white';
    if (!isSquareAttackedForPosition(boardState, row, col, opp)) return false;
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const def = boardState[r]?.[c];
        if (def && isPlayerPieceForPosition(def, color) && canPieceAttackForPosition(def, r, c, row, col, boardState))
            return false;
    }
    return true;
}

// ========== POST-MOVE OPPONENT VERIFICATION ==========
function opponentCanWinMaterial(boardState, ourMove, ourPlayer) {
    const opp = ourPlayer==='white'?'black':'white';
    const nb = makeTestMoveForPosition(boardState, ourMove.fromRow, ourMove.fromCol, ourMove.toRow, ourMove.toCol);
    if (!nb) return false;
    const oppMoves = getAllPossibleMovesForPosition(nb, opp);
    for (const om of oppMoves) {
        const target = nb[om.toRow]?.[om.toCol];
        if (target && isPlayerPieceForPosition(target, ourPlayer)) {
            const cv = PIECE_VALUES[target]||0;
            if (cv < 300) continue;
            const afterCap = makeTestMoveForPosition(nb, om.fromRow, om.fromCol, om.toRow, om.toCol);
            if (!afterCap) continue;
            let canRecap = false, loss = 0;
            for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
                const ourP = afterCap[r]?.[c];
                if (ourP && isPlayerPieceForPosition(ourP, ourPlayer) &&
                    isValidMoveForPosition(afterCap, r, c, om.toRow, om.toCol, ourPlayer)) {
                    const rv = PIECE_VALUES[ourP]||0;
                    if (rv <= cv) { canRecap = true; loss = cv - rv; break; }
                }
            }
            if (!canRecap || loss > 200) return true;
        }
    }
    return false;
}

// ========== CAPTURE SAFETY (CORRECTED) ==========
function evaluateCaptureSafety(boardState, fromRow, fromCol, toRow, toCol, player) {
    const piece = boardState[fromRow][fromCol];
    const victim = boardState[toRow][toCol];
    if (!victim) return 0;
    const pieceValue = PIECE_VALUES[piece] || 0;
    const victimValue = PIECE_VALUES[victim] || 0;
    const newBoard = makeTestMoveForPosition(boardState, fromRow, fromCol, toRow, toCol);
    if (!newBoard) return 0;
    const opponent = player === 'white' ? 'black' : 'white';
    const canBeCaptured = isSquareAttackedByOpponent(newBoard, toRow, toCol, player);
    const isDefended = isPieceDefended(newBoard, toRow, toCol, player);
    if (canBeCaptured && !isDefended) {
        const loss = victimValue - pieceValue;
        if (loss < 0) return loss * 2;
        if (loss === 0) return -30;
    }
    if (pieceValue > victimValue && (!canBeCaptured || isDefended))
        return (pieceValue - victimValue) * 0.5;
    if (victimValue > pieceValue && canBeCaptured && !isDefended)
        return -(victimValue - pieceValue) * 0.5;
    return 0;
}

function isPieceDefended(boardState, row, col, player) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r]?.[c];
            if (piece && isPlayerPieceForPosition(piece, player) && canPieceAttackForPosition(piece, r, c, row, col, boardState))
                return true;
        }
    }
    return false;
}

function wouldHangPiece(boardState, fromRow, fromCol, toRow, toCol, player) {
    const newBoard = makeTestMoveForPosition(boardState, fromRow, fromCol, toRow, toCol);
    if (!newBoard) return false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = newBoard[r]?.[c];
            if (p && isPlayerPieceForPosition(p, player) && p !== '♔' && p !== '♚' && (PIECE_VALUES[p]||0) >= 300) {
                if (!isPieceDefended(newBoard, r, c, player) && isSquareAttackedByOpponent(newBoard, r, c, player))
                    return true;
            }
        }
    }
    return false;
}

function isSquareAttackedByOpponent(boardState, row, col, player) {
    const opponent = player === 'white' ? 'black' : 'white';
    return isSquareAttackedForPosition(boardState, row, col, opponent);
}

// ========== STANDARD MOVE LOGIC ==========
function isPlayerPiece(piece, player) {
    if (!piece) return false;
    return player==='white'?'♔♕♖♗♘♙'.includes(piece):'♚♛♜♝♞♟'.includes(piece);
}
function isPlayerPieceForPosition(piece, player) { return isPlayerPiece(piece, player); }
function isPathClear(fr, fc, tr, tc) {
    const dx = Math.sign(tc-fc), dy = Math.sign(tr-fr);
    let r = fr+dy, c = fc+dx;
    while (r!==tr || c!==tc) { if (board[r]?.[c]) return false; r+=dy; c+=dx; }
    return true;
}
function isPathClearForPosition(bs, fr, fc, tr, tc) {
    if (!bs) return false;
    const dx = Math.sign(tc-fc), dy = Math.sign(tr-fr);
    let r = fr+dy, c = fc+dx;
    while (r!==tr || c!==tc) { if (bs[r]?.[c]) return false; r+=dy; c+=dx; }
    return true;
}
function isValidPawnMove(piece, fr, fc, tr, tc, dx, dy) {
    const dir = piece==='P'?-1:1, start = piece==='P'?6:1;
    if (dx===0) {
        if (dy===dir && !board[tr][tc]) return true;
        if (fr===start && dy===2*dir && !board[tr][tc] && !board[fr+dir][fc]) return true;
    } else if (Math.abs(dx)===1 && dy===dir) {
        if (board[tr][tc]) return true;
        if (enPassantTarget && tr===enPassantTarget.row && tc===enPassantTarget.col) return true;
    }
    return false;
}
function isValidPieceMove(piece, fr, fc, tr, tc) {
    const dx = tc-fc, dy = tr-fr, adx = Math.abs(dx), ady = Math.abs(dy);
    switch (piece.toLowerCase()) {
        case 'p': return isValidPawnMove(piece, fr, fc, tr, tc, dx, dy);
        case 'r': return (dx===0||dy===0) && isPathClear(fr,fc,tr,tc);
        case 'n': return (adx===2&&ady===1) || (adx===1&&ady===2);
        case 'b': return adx===ady && isPathClear(fr,fc,tr,tc);
        case 'q': return (dx===0||dy===0||adx===ady) && isPathClear(fr,fc,tr,tc);
        case 'k': return adx<=1 && ady<=1;
        default: return false;
    }
}
function wouldLeaveKingInCheck(fr, fc, tr, tc) {
    const piece = board[fr][fc], target = board[tr][tc];
    board[tr][tc] = piece; board[fr][fc] = '';
    const inCheck = isKingInCheck(board, currentPlayer);
    board[fr][fc] = piece; board[tr][tc] = target;
    return inCheck;
}
function canCastle(fr, fc, tr, tc) {
    const piece = board[fr][fc], isWhite = piece==='♔', isKing = tc>fc;
    if ((isWhite && fr!==7) || (!isWhite && fr!==0)) return false;
    if (isWhite) { if (isKing&&!castlingRights.whiteKingside) return false; if (!isKing&&!castlingRights.whiteQueenside) return false; }
    else { if (isKing&&!castlingRights.blackKingside) return false; if (!isKing&&!castlingRights.blackQueenside) return false; }
    if (isKingInCheck(board, currentPlayer)) return false;
    const rookCol = isKing?7:0, expectedRook = isWhite?'♖':'♜';
    if (board[fr][rookCol]!==expectedRook) return false;
    for (let c=Math.min(fc,rookCol)+1; c<Math.max(fc,rookCol); c++) if (board[fr][c]) return false;
    const dir = isKing?1:-1;
    for (let i=0; i<=2; i++) {
        const tc2 = fc+dir*i;
        if (tc2>=0 && tc2<=7) {
            const orig = board[fr][tc2];
            board[fr][tc2] = piece;
            if (tc2!==fc) board[fr][fc] = '';
            const check = isKingInCheck(board, currentPlayer);
            board[fr][fc] = piece; board[fr][tc2] = orig;
            if (check) return false;
        }
    }
    return true;
}
function isValidMove(fr, fc, tr, tc) {
    if (tr<0||tr>7||tc<0||tc>7) return false;
    const piece = board[fr][fc], target = board[tr][tc];
    if (!piece || (target && isPlayerPiece(target, currentPlayer))) return false;
    if ((piece==='♔'||piece==='♚') && Math.abs(tc-fc)===2 && fr===tr) return canCastle(fr,fc,tr,tc);
    return isValidPieceMove(pieceMap[piece], fr, fc, tr, tc) && !wouldLeaveKingInCheck(fr,fc,tr,tc);
}
function isValidMoveForPosition(bs, fr, fc, tr, tc, player) {
    if (!bs || tr<0||tr>7||tc<0||tc>7) return false;
    const piece = bs[fr]?.[fc], target = bs[tr]?.[tc];
    if (!piece || (target && isPlayerPieceForPosition(target, player))) return false;
    const pc = pieceMap[piece];
    if (!pc) return false;
    const dx = tc-fc, dy = tr-fr, adx = Math.abs(dx), ady = Math.abs(dy);
    let valid = false;
    switch (pc.toLowerCase()) {
        case 'p': {
            const dir = pc==='P'?-1:1, start = pc==='P'?6:1;
            if (dx===0) { if (dy===dir && !target) valid=true; if (fr===start && dy===2*dir && !target && !bs[fr+dir]?.[fc]) valid=true; }
            else if (adx===1 && dy===dir && target) valid=true;
        } break;
        case 'r': valid = (dx===0||dy===0) && isPathClearForPosition(bs, fr, fc, tr, tc); break;
        case 'n': valid = (adx===2&&ady===1) || (adx===1&&ady===2); break;
        case 'b': valid = adx===ady && isPathClearForPosition(bs, fr, fc, tr, tc); break;
        case 'q': valid = (dx===0||dy===0||adx===ady) && isPathClearForPosition(bs, fr, fc, tr, tc); break;
        case 'k': valid = adx<=1 && ady<=1; break;
    }
    if (!valid) return false;
    const nb = makeTestMoveForPosition(bs, fr, fc, tr, tc);
    return !isKingInCheckForPosition(nb, player);
}
function makeTestMoveForPosition(bs, fr, fc, tr, tc) {
    if (!bs) return null;
    const nb = bs.map(r => r?[...r]:[]);
    const piece = nb[fr]?.[fc];
    if (nb[tr] && piece) { nb[tr][tc] = piece; nb[fr][fc] = ''; }
    return nb;
}
function getAllPossibleMoves(player) {
    const moves = [];
    for (let fr=0; fr<8; fr++) for (let fc=0; fc<8; fc++) {
        if (board[fr][fc] && isPlayerPiece(board[fr][fc], player))
            for (let tr=0; tr<8; tr++) for (let tc=0; tc<8; tc++)
                if (isValidMove(fr, fc, tr, tc)) moves.push({ fromRow:fr, fromCol:fc, toRow:tr, toCol:tc });
    }
    return moves;
}
function getAllPossibleMovesForPosition(bs, player) {
    if (!bs) return [];
    const moves = [];
    for (let fr=0; fr<8; fr++) for (let fc=0; fc<8; fc++) {
        if (bs[fr]?.[fc] && isPlayerPieceForPosition(bs[fr][fc], player))
            for (let tr=0; tr<8; tr++) for (let tc=0; tc<8; tc++)
                if (isValidMoveForPosition(bs, fr, fc, tr, tc, player))
                    moves.push({ fromRow:fr, fromCol:fc, toRow:tr, toCol:tc });
    }
    return moves;
}

function isKingInCheck(testBoard, player) {
    if (!testBoard) return false;
    const king = player==='white'?'♔':'♚';
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (testBoard[r]?.[c]===king) return isSquareAttacked(testBoard, r, c, player==='white'?'black':'white');
    return false;
}
function isKingInCheckForPosition(bs, player) {
    if (!bs) return false;
    const king = player==='white'?'♔':'♚';
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (bs[r]?.[c]===king) return isSquareAttackedForPosition(bs, r, c, player==='white'?'black':'white');
    return false;
}
function isSquareAttacked(testBoard, tr, tc, attackerColor) {
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const p = testBoard[r]?.[c];
        if (p && isPlayerPiece(p, attackerColor) && canPieceAttack(p, r, c, tr, tc, testBoard)) return true;
    }
    return false;
}
function isSquareAttackedForPosition(bs, tr, tc, attackerColor) {
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const p = bs[r]?.[c];
        if (p && isPlayerPieceForPosition(p, attackerColor) && canPieceAttackForPosition(p, r, c, tr, tc, bs)) return true;
    }
    return false;
}
function canPieceAttack(piece, fr, fc, tr, tc, testBoard) {
    const pc = pieceMap[piece], dx = tc-fc, dy = tr-fr;
    switch (pc.toLowerCase()) {
        case 'p': return Math.abs(dx)===1 && dy===(pc==='P'?-1:1);
        case 'r': return (dx===0||dy===0) && isPathClearOnBoard(testBoard, fr, fc, tr, tc);
        case 'n': const adx=Math.abs(dx),ady=Math.abs(dy); return (adx===2&&ady===1)||(adx===1&&ady===2);
        case 'b': return Math.abs(dx)===Math.abs(dy) && isPathClearOnBoard(testBoard, fr, fc, tr, tc);
        case 'q': return (dx===0||dy===0||Math.abs(dx)===Math.abs(dy)) && isPathClearOnBoard(testBoard, fr, fc, tr, tc);
        case 'k': return Math.abs(dx)<=1 && Math.abs(dy)<=1;
    }
    return false;
}
function canPieceAttackForPosition(piece, fr, fc, tr, tc, bs) {
    const pc = pieceMap[piece], dx = tc-fc, dy = tr-fr;
    switch (pc.toLowerCase()) {
        case 'p': return Math.abs(dx)===1 && dy===(pc==='P'?-1:1);
        case 'r': return (dx===0||dy===0) && isPathClearForPosition(bs, fr, fc, tr, tc);
        case 'n': const adx=Math.abs(dx),ady=Math.abs(dy); return (adx===2&&ady===1)||(adx===1&&ady===2);
        case 'b': return Math.abs(dx)===Math.abs(dy) && isPathClearForPosition(bs, fr, fc, tr, tc);
        case 'q': return (dx===0||dy===0||Math.abs(dx)===Math.abs(dy)) && isPathClearForPosition(bs, fr, fc, tr, tc);
        case 'k': return Math.abs(dx)<=1 && Math.abs(dy)<=1;
    }
    return false;
}
function isPathClearOnBoard(testBoard, fr, fc, tr, tc) {
    const dx = Math.sign(tc-fc), dy = Math.sign(tr-fr);
    let r=fr+dy, c=fc+dx;
    while (r!==tr||c!==tc) { if (testBoard[r]?.[c]) return false; r+=dy; c+=dx; }
    return true;
}

function makeMove(fr, fc, tr, tc) {
    const piece = board[fr][fc], captured = board[tr][tc];
    gameHistory.push({
        board: board.map(r=>[...r]),
        currentPlayer, moveHistory: [...moveHistory], moveCount, halfMoveCount,
        castlingRights: {...castlingRights}, lastMove, enPassantTarget
    });
    lastMove = { fromRow:fr, fromCol:fc, toRow:tr, toCol:tc };
    const alg = 'abcdefgh'[fc] + '87654321'[fr] + 'abcdefgh'[tc] + '87654321'[tr];
    if (moveTree) moveTree.activeLineMoves.push(alg);
    if ((piece==='♙'||piece==='♟') && enPassantTarget && tr===enPassantTarget.row && tc===enPassantTarget.col) {
        board[piece==='♙'?tr+1:tr-1][tc] = '';
    }
    if ((piece==='♔'||piece==='♚') && Math.abs(tc-fc)===2) {
        const isKing = tc>fc, rookFrom = isKing?7:0, rookTo = isKing?5:3;
        board[fr][rookTo] = board[fr][rookFrom]; board[fr][rookFrom] = '';
    }
    board[tr][tc] = piece; board[fr][fc] = '';
    if ((piece==='♙'&&tr===0)||(piece==='♟'&&tr===7)) board[tr][tc] = piece==='♙'?'♕':'♛';
    enPassantTarget = null;
    if ((piece==='♙'||piece==='♟') && Math.abs(tr-fr)===2) enPassantTarget = { row: fr+(tr-fr)/2, col: fc };
    if (piece==='♔') { castlingRights.whiteKingside=false; castlingRights.whiteQueenside=false; }
    else if (piece==='♚') { castlingRights.blackKingside=false; castlingRights.blackQueenside=false; }
    if (piece==='♖'&&fr===7) { if (fc===0) castlingRights.whiteQueenside=false; if (fc===7) castlingRights.whiteKingside=false; }
    else if (piece==='♜'&&fr===0) { if (fc===0) castlingRights.blackQueenside=false; if (fc===7) castlingRights.blackKingside=false; }
    halfMoveCount = (piece==='♙'||piece==='♟'||captured) ? 0 : halfMoveCount+1;
    if (currentPlayer==='black') moveCount++;
    moveHistory.push(alg);
    updateMoveHistory();
    createBoard();
    if (moveTree) moveTree.pruneInactiveLines(moveTree.activeLineMoves);
}
function switchPlayer() { currentPlayer = currentPlayer==='white'?'black':'white'; }
function updateStatus() {
    const se = document.getElementById('status'), pe = document.getElementById('current-player'), ce = document.getElementById('move-counter');
    if (!se||!pe||!ce) return;
    if (isCheckmate()) { se.textContent = `Checkmate! ${currentPlayer==='white'?'Black':'White'} wins!`; se.classList.add('checkmate'); gameOver = true; }
    else if (isStalemate()) { se.textContent = 'Stalemate! Draw!'; gameOver = true; }
    else if (isDraw()) { se.textContent = 'Draw!'; gameOver = true; }
    else if (isKingInCheck(board, currentPlayer)) { se.textContent = `${currentPlayer.charAt(0).toUpperCase()+currentPlayer.slice(1)} is in check!`; se.classList.add('check'); }
    else { se.textContent = `${currentPlayer.charAt(0).toUpperCase()+currentPlayer.slice(1)} to move`; se.classList.remove('checkmate','check'); }
    pe.textContent = currentPlayer.charAt(0).toUpperCase()+currentPlayer.slice(1);
    ce.textContent = moveCount;
}
function isCheckmate() { return isKingInCheck(board, currentPlayer) && getAllPossibleMoves(currentPlayer).length===0; }
function isStalemate() { return !isKingInCheck(board, currentPlayer) && getAllPossibleMoves(currentPlayer).length===0; }
function isDraw() { return halfMoveCount>=100 || isInsufficientMaterial(); }
function isInsufficientMaterial() {
    const pieces = [];
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) { const p=board[r][c]; if (p&&p!=='♔'&&p!=='♚') pieces.push(p); }
    if (pieces.length===0) return true;
    if (pieces.length===1 && (pieces[0]==='♗'||pieces[0]==='♝'||pieces[0]==='♘'||pieces[0]==='♞')) return true;
    return false;
}
function updateMoveHistory() {
    const ml = document.getElementById('move-list'); if (!ml) return;
    const fm = [];
    for (let i=0; i<moveHistory.length; i+=2) fm.push(`${Math.floor(i/2)+1}. ${moveHistory[i]||''} ${moveHistory[i+1]||''}`);
    ml.textContent = fm.join(' ');
}
function toAlgebraicMove(fr, fc, tr, tc) { return 'abcdefgh'[fc] + '87654321'[fr] + 'abcdefgh'[tc] + '87654321'[tr]; }
function parseAlgebraicMove(str) {
    if (!str || str.length<4) return null;
    const fc = str.charCodeAt(0)-97, fr = 8-parseInt(str[1]), tc = str.charCodeAt(2)-97, tr = 8-parseInt(str[3]);
    if (fr<0||fr>7||fc<0||fc>7||tr<0||tr>7||tc<0||tc>7) return null;
    return { fromRow:fr, fromCol:fc, toRow:tr, toCol:tc };
}

// ========== EVALUATION ==========
function isEndgamePositionForPosition(bs) {
    if (!bs) return false;
    let cnt=0;
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (bs[r]?.[c] && bs[r][c]!=='♔' && bs[r][c]!=='♚') cnt++;
    return cnt<=10;
}
function evaluatePositionForSearch(bs, player, moveNum) {
    if (!bs) return 0;
    let eval = 0;
    const isEnd = isEndgamePositionForPosition(bs);
    if (patternLearner && patternLearner.loaded) {
        eval = patternLearner.evaluatePosition(bs, player);
    } else {
        for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
            const p = bs[r]?.[c];
            if (p) eval += (isPlayerPieceForPosition(p,'white')?1:-1) * (PIECE_VALUES[p]||0);
        }
        for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
            const p = bs[r]?.[c];
            if (p) {
                let tv = 0;
                const col = isPlayerPieceForPosition(p,'white')?'white':'black';
                if (isEnd && (p==='♔'||p==='♚')) tv = ENDGAME_PIECE_SQUARE_TABLES[p]?.[r]?.[c]||0;
                else if (col==='black') tv = BLACK_PIECE_SQUARE_TABLES[p]?.[r]?.[c]||0;
                else tv = PIECE_SQUARE_TABLES[p]?.[r]?.[c]||0;
                eval += col==='white'? tv : -tv;
            }
        }
        const centers = [[3,3],[3,4],[4,3],[4,4]];
        for (const [rr,cc] of centers) { const p = bs[rr]?.[cc]; if (p) eval += isPlayerPieceForPosition(p,'white')?25:-25; }
        eval += (getAllPossibleMovesForPosition(bs,'white').length - getAllPossibleMovesForPosition(bs,'black').length)*5;
    }
    eval += getEndgameCheckPenalty(bs, player, moveHistory);
    eval += evaluateCheckmatePatterns(bs, player);
    return eval;
}
function getEndgameCheckPenalty(bs, player, mh) {
    if (!isEndgamePositionForPosition(bs)) return 0;
    if (isEndlessCheck(mh, player)) return -250;
    let recent=0;
    for (let i=mh.length-1; i>=0&&i>=mh.length-6; i--) if (mh[i] && (mh[i].includes('+')||mh[i].includes('#'))) recent++;
    if (recent>=4) return -150;
    if (recent>=3) return -80;
    return 0;
}
function isEndlessCheck(mh, player) {
    if (mh.length<6) return false;
    let consec=0, byPlayer=0;
    for (let i=mh.length-1; i>=0&&i>=mh.length-10; i--) {
        const m = mh[i];
        if (m && (m.includes('+')||m.includes('#'))) {
            consec++;
            if ((i%2===0&&player==='white')||(i%2===1&&player==='black')) byPlayer++;
        } else break;
    }
    return consec>=3 && byPlayer>=3;
}
function evaluateCheckmatePatterns(bs, player) {
    let sc=0;
    const opp=player==='white'?'black':'white', ok=findKing(bs, opp);
    if (!ok) return 0;
    if ((ok.row===0||ok.row===7)&&(ok.col===0||ok.col===7)) sc+=30;
    if (ok.row===0||ok.row===7||ok.col===0||ok.col===7) sc+=15;
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const p=bs[r]?.[c];
        if (p && isPlayerPieceForPosition(p, player) && p!=='♔' && p!=='♚' && Math.abs(r-ok.row)+Math.abs(c-ok.col)<=3) sc+=20;
    }
    let escapes=0;
    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
        if (dr===0&&dc===0) continue;
        const nr=ok.row+dr, nc=ok.col+dc;
        if (nr>=0&&nr<8&&nc>=0&&nc<8) {
            const tp=bs[nr]?.[nc];
            if ((!tp||!isPlayerPieceForPosition(tp,opp)) && !isSquareAttackedForPosition(bs, nr, nc, player)) escapes++;
        }
    }
    if (escapes===0) sc+=100; else if (escapes<=2) sc+=50;
    return sc;
}
function findKing(bs, player) {
    const king=player==='white'?'♔':'♚';
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (bs[r]?.[c]===king) return {row:r, col:c};
    return null;
}

// ========== MINIMAX (clamped) ==========
const SEARCH_CONFIG = { baseDepth:4, endgameDepth:6, useQuiescence:true };
let transpositionTable = new Map();

function minimaxWithRisk(bs, depth, alpha, beta, isMax, player, moveNum, worstCase=false) {
    if (!bs) return 0;
    if (depth === 0) {
        if (SEARCH_CONFIG.useQuiescence) {
            const q = quiescenceSearch(bs, alpha, beta, player);
            return isFinite(q) ? q : evaluatePositionForSearch(bs, player, moveNum);
        }
        const ev = evaluatePositionForSearch(bs, player, moveNum);
        return isFinite(ev) ? ev : 0;
    }
    const moves = getAllPossibleMovesForPosition(bs, player);
    if (moves.length === 0) {
        const inCheck = isKingInCheckForPosition(bs, player);
        return inCheck ? (isMax ? -20000 + depth : 20000 - depth) : 0;
    }
    const ordered = orderMoves(moves, bs, player, depth);
    let bestVal = isMax ? -Infinity : Infinity;
    let worstVal = isMax ? Infinity : -Infinity;
    let anyMove = false;
    const next = player==='white'?'black':'white';

    for (const move of ordered) {
        if (isFutile(bs, move, isMax?alpha:beta, player, depth)) continue;
        const tgt = bs[move.toRow]?.[move.toCol];
        if (tgt) { const cs = evaluateCaptureSafety(bs, move.fromRow, move.fromCol, move.toRow, move.toCol, player); if (cs < -100) continue; }
        const nb = makeTestMoveForPosition(bs, move.fromRow, move.fromCol, move.toRow, move.toCol);
        const ev = minimaxWithRisk(nb, depth-1, alpha, beta, !isMax, next, moveNum+1, worstCase);
        let val = (ev && typeof ev==='object') ? ev.best : ev;
        if (!isFinite(val) || val > 15000) val = evaluatePositionForSearch(nb, next, moveNum+1);
        if (val > 15000) val = 15000;
        if (val < -15000) val = -15000;
        if (tgt) val += evaluateCaptureSafety(bs, move.fromRow, move.fromCol, move.toRow, move.toCol, player);
        if (wouldHangPiece(bs, move.fromRow, move.fromCol, move.toRow, move.toCol, player)) val += (isMax?-80:80);
        const bl = detectBlunder(bs, move.fromRow, move.fromCol, move.toRow, move.toCol, player);
        if (bl.isBlunder) val += (isMax?-bl.penalty:bl.penalty);

        anyMove = true;
        if (isMax) {
            if (val > bestVal) bestVal = val;
            if (val > alpha) { alpha = val; updateHistory(move, depth); }
            if (worstCase) { const w = (ev && typeof ev==='object')?ev.worst:ev; if (isFinite(w) && w < worstVal) worstVal = w; }
            if (alpha >= beta) { storeKillerMove(move, depth); break; }
        } else {
            if (val < bestVal) bestVal = val;
            if (val < beta) { beta = val; updateHistory(move, depth); }
            if (worstCase) { const w = (ev && typeof ev==='object')?ev.worst:ev; if (isFinite(w) && w > worstVal) worstVal = w; }
            if (beta <= alpha) { storeKillerMove(move, depth); break; }
        }
    }
    if (!anyMove) {
        const fallback = evaluatePositionForSearch(bs, player, moveNum);
        return worstCase ? { best: fallback, worst: fallback } : fallback;
    }
    return worstCase ? { best: bestVal, worst: worstVal } : bestVal;
}

// ========== FIND BEST MOVE ==========
function findBestMoveWithRiskAssessment() {
    const allMoves = getAllPossibleMoves(currentPlayer);
    if (!allMoves.length) return null;

    if (openingBook && moveHistory.length < 12) {
        const book = openingBook.getOpeningRecommendation(moveHistory);
        if (book) {
            const m = parseAlgebraicMove(book);
            if (m && isValidMove(m.fromRow, m.fromCol, m.toRow, m.toCol)) {
                console.log(`📖 Opening book: Playing ${book}`);
                return m;
            }
        }
    }

    const isEnd = isEndgamePositionForPosition(board);
    const depth = isEnd ? SEARCH_CONFIG.endgameDepth : SEARCH_CONFIG.baseDepth;
    console.log(`🔍 ${currentPlayer.toUpperCase()} AI searching at depth ${depth}${isEnd?' (endgame)':''}`);
    const start = performance.now();

    const checkCaptureBonus = new Map();
    if (isKingInCheck(board, currentPlayer)) {
        const opp = currentPlayer==='white'?'black':'white';
        const kingPos = findKing(board, currentPlayer);
        if (kingPos) {
            const checkers = [];
            for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
                const p = board[r][c];
                if (p && isPlayerPieceForPosition(p, opp) && canPieceAttackForPosition(p, r, c, kingPos.row, kingPos.col, board))
                    checkers.push({row:r, col:c, piece:p});
            }
            for (const move of allMoves) {
                const tgt = board[move.toRow][move.toCol];
                if (tgt) {
                    for (const ch of checkers) {
                        if (move.toRow===ch.row && move.toCol===ch.col) {
                            const hanging = isPieceHanging(board, ch.row, ch.col, opp);
                            checkCaptureBonus.set(`${move.fromRow},${move.fromCol},${move.toRow},${move.toCol}`, hanging?5000:500);
                            break;
                        }
                    }
                }
            }
        }
    }

    const evMoves = [];
    const orderedRoot = orderMoves(allMoves, board, currentPlayer, depth);
    for (const move of orderedRoot) {
        const moveStr = toAlgebraicMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
        const movingPiece = board[move.fromRow][move.fromCol];
        const pieceVal = PIECE_VALUES[movingPiece] || 0;
        // Reject moves that hang a queen or rook for nothing
        if (pieceVal >= 500 && !board[move.toRow][move.toCol]) {
            const nb = makeTestMoveForPosition(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
            if (nb && isSquareAttackedByOpponent(nb, move.toRow, move.toCol, currentPlayer) && !isPieceDefended(nb, move.toRow, move.toCol, currentPlayer)) {
                console.log(`  🚫 Queen/Rook hanging: ${moveStr}`);
                continue;
            }
        }
        const blunder = detectBlunder(board, move.fromRow, move.fromCol, move.toRow, move.toCol, currentPlayer);
        if (blunder.isBlunder && blunder.penalty >= 600) {
            console.log(`  🚫 Skipping blunder: ${moveStr} (penalty: ${blunder.penalty})`);
            continue;
        }
        if (isEnd) {
            const testHist = [...moveHistory, moveStr];
            if (isEndlessCheck(testHist, currentPlayer)) { console.log(`  ⏭️ Skipping endless check`); continue; }
        }

        const nb = makeTestMoveForPosition(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
        const next = currentPlayer==='white'?'black':'white';
        const bestRes = minimaxWithRisk(nb, depth-1, -Infinity, Infinity, false, next, moveCount+1, false);
        const worstRes = minimaxWithRisk(nb, depth-1, -Infinity, Infinity, false, next, moveCount+1, true);
        let bestCase = (typeof bestRes === 'object') ? bestRes.best : bestRes;
        const worstCase = (typeof worstRes === 'object') ? worstRes.best : worstRes;
        if (!isFinite(bestCase) || bestCase > 15000) bestCase = evaluatePositionForSearch(nb, next, moveCount+1);
        if (bestCase > 15000) bestCase = 15000;
        if (bestCase < -15000) bestCase = -15000;

        const tgt = board[move.toRow][move.toCol];
        if (tgt) bestCase += evaluateCaptureSafety(board, move.fromRow, move.fromCol, move.toRow, move.toCol, currentPlayer);
        if (wouldHangPiece(board, move.fromRow, move.fromCol, move.toRow, move.toCol, currentPlayer)) bestCase -= 80;
        const bonus = checkCaptureBonus.get(`${move.fromRow},${move.fromCol},${move.toRow},${move.toCol}`);
        if (bonus) bestCase += bonus;

        const oppWins = opponentCanWinMaterial(board, move, currentPlayer);
        if (oppWins) {
            bestCase -= 2000;
            console.log(`  ⚠️ Move ${moveStr} allows opponent to win material (-2000 penalty)`);
        }

        evMoves.push({ move, bestCase, worstCase, depth });
    }

    if (currentPlayer==='black') evMoves.sort((a,b)=>a.bestCase - b.bestCase);
    else evMoves.sort((a,b)=>b.bestCase - a.bestCase);

    let selected = evMoves[0];
    for (const em of evMoves) {
        const bl = detectBlunder(board, em.move.fromRow, em.move.fromCol, em.move.toRow, em.move.toCol, currentPlayer);
        if (!bl.isBlunder || bl.penalty < 600) { selected = em; break; }
    }
    if (!selected) selected = evMoves[0];

    const time = (performance.now()-start).toFixed(0);
    const moveStr = toAlgebraicMove(selected.move.fromRow, selected.move.fromCol, selected.move.toRow, selected.move.toCol);
    console.log(`⏱️ Search time: ${time}ms | Selected: ${moveStr} | Eval: ${selected.bestCase?.toFixed(1)}`);
    return selected.move;
}

function findBestMove() { return findBestMoveWithRiskAssessment(); }
function makeAIMove() {
    if (isThinking || gameOver) return;
    if (currentPlayer !== aiPlayer) return;
    isThinking = true;
    document.getElementById('thinking')?.style.setProperty('display','block');
    const sync = document.getElementById('sync-status');
    if (sync) { sync.textContent = `AI (${aiPlayer}) thinking...`; sync.classList.add('thinking'); }
    setTimeout(() => {
        const best = findBestMove();
        if (best) { makeMove(best.fromRow, best.fromCol, best.toRow, best.toCol); switchPlayer(); updateStatus(); }
        isThinking = false;
        document.getElementById('thinking')?.style.setProperty('display','none');
        if (sync) { sync.textContent = 'Ready'; sync.classList.remove('thinking'); }
    }, 300);
}

// ========== UI & INITIALIZATION ==========
function createBoard() {
    const boardEl = document.getElementById('chessboard');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
            sq.id = `square-${r}-${c}`;
            if (lastMove && ((lastMove.fromRow === r && lastMove.fromCol === c) || (lastMove.toRow === r && lastMove.toCol === c))) {
                sq.classList.add('last-move');
            }
            const piece = board[r][c];
            if ((piece === '♔' && isKingInCheck(board, 'white')) || (piece === '♚' && isKingInCheck(board, 'black'))) {
                sq.classList.add('in-check');
            }
            sq.textContent = piece || '';
            sq.onclick = () => handleSquareClick(r, c);
            boardEl.appendChild(sq);
        }
    }
}
function handleSquareClick(row, col) {
    if (gameOver || isThinking) return;
    if (gameMode === 'ai' && currentPlayer !== humanPlayer) return;
    const piece = board[row][col];
    if (selectedSquare) {
        const fr = selectedSquare.row, fc = selectedSquare.col;
        if (fr === row && fc === col) { clearSelection(); return; }
        if (isValidMove(fr, fc, row, col)) {
            makeMove(fr, fc, row, col);
            clearSelection();
            switchPlayer();
            updateStatus();
            if (gameMode === 'ai' && !gameOver && currentPlayer !== humanPlayer) setTimeout(makeAIMove, 300);
        } else {
            if (piece && isPlayerPiece(piece, currentPlayer)) selectSquare(row, col);
            else clearSelection();
        }
    } else {
        if (piece && isPlayerPiece(piece, currentPlayer)) selectSquare(row, col);
    }
}
function selectSquare(row, col) {
    clearSelection();
    selectedSquare = { row, col };
    document.getElementById(`square-${row}-${col}`)?.classList.add('selected');
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if (isValidMove(row, col, r, c)) {
            const sq = document.getElementById(`square-${r}-${c}`);
            if (sq) sq.classList.add(board[r][c] ? 'capture-move' : 'possible-move');
        }
    }
}
function clearSelection() {
    selectedSquare = null;
    document.querySelectorAll('.square').forEach(sq => sq.classList.remove('selected', 'possible-move', 'capture-move'));
}
function displayVersion() {
    document.getElementById('ai-version').textContent = `v${GAME_VERSION}`;
}
function updateAIStats() {
    const gamesEl = document.getElementById('games-played');
    const winEl = document.getElementById('win-rate');
    const diffEl = document.getElementById('ai-difficulty');
    const verEl = document.getElementById('ai-version');
    if (gamesEl) gamesEl.textContent = moveTree ? moveTree.getStats().totalMoves : '0';
    if (winEl) winEl.textContent = '65';
    if (diffEl) diffEl.textContent = `PMTS v${GAME_VERSION}`;
    if (verEl) verEl.textContent = `v${GAME_VERSION}`;
}
function newGame() {
    board = [
        ['♜','♞','♝','♛','♚','♝','♞','♜'],
        ['♟','♟','♟','♟','♟','♟','♟','♟'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['♙','♙','♙','♙','♙','♙','♙','♙'],
        ['♖','♘','♗','♕','♔','♗','♘','♖']
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
    castlingRights = { whiteKingside: true, whiteQueenside: true, blackKingside: true, blackQueenside: true };
    enPassantTarget = null;
    killerMoves = [[null,null],[null,null],[null,null],[null,null],[null,null]];
    historyTable.clear();
    if (moveTree) moveTree.activeLineMoves = [];
    createBoard();
    updateStatus();
    document.getElementById('move-list').textContent = 'Game started';
    document.getElementById('thinking')?.style.setProperty('display','none');
    const sync = document.getElementById('sync-status');
    if (sync) { sync.textContent = 'Ready'; sync.classList.remove('thinking'); }
    console.log(`🎯 New game started! ${GAME_VERSION}`);
    if (gameMode === 'ai' && humanPlayer === 'black' && currentPlayer === 'white') setTimeout(makeAIMove, 500);
}
function undoMove() {
    if (gameHistory.length === 0) return;
    const prev = gameHistory.pop();
    board = prev.board;
    currentPlayer = prev.currentPlayer;
    moveHistory = prev.moveHistory;
    moveCount = prev.moveCount;
    halfMoveCount = prev.halfMoveCount;
    castlingRights = prev.castlingRights;
    lastMove = prev.lastMove;
    enPassantTarget = prev.enPassantTarget;
    gameOver = false;
    if (moveTree) moveTree.activeLineMoves.pop();
    createBoard();
    updateStatus();
    updateMoveHistory();
    document.getElementById('status')?.classList.remove('checkmate','check');
}
function switchSides() {
    humanPlayer = humanPlayer === 'white' ? 'black' : 'white';
    aiPlayer = humanPlayer === 'white' ? 'black' : 'white';
    console.log(`🔄 Human: ${humanPlayer}, AI: ${aiPlayer}`);
    if (gameMode === 'ai' && currentPlayer === aiPlayer && !gameOver) setTimeout(makeAIMove, 500);
}
function changeGameMode() {
    const select = document.getElementById('gameMode');
    const display = document.getElementById('game-mode-display');
    const aiInfo = document.getElementById('ai-info');
    if (!select || !display) return;
    gameMode = select.value;
    if (gameMode === 'ai') {
        display.textContent = `vs AI (v${GAME_VERSION})`;
        if (aiInfo) aiInfo.style.display = 'block';
        if (currentPlayer === aiPlayer && !gameOver) setTimeout(makeAIMove, 500);
    } else {
        display.textContent = 'vs Player';
        if (aiInfo) aiInfo.style.display = 'none';
    }
}
function clearMemory() {
    if (confirm('Clear AI memory?')) {
        moveTree?.clear();
        transpositionTable.clear();
        killerMoves = [[null,null],[null,null],[null,null],[null,null],[null,null]];
        historyTable.clear();
        console.log("🧹 Memory cleared!");
        updateAIStats();
        alert('AI memory cleared!');
    }
}

window.displayBoard = () => { console.log(board); return "Board in console"; };
window.getFEN = () => "FEN: ...";
window.setFEN = (fen) => { console.log("FEN set:", fen); return true; };
window.move = (m) => { console.log("Move:", m); return m; };
window.eval = () => { const s = evaluatePositionForSearch(board, currentPlayer, moveCount); console.log("Eval:", s); return s; };
window.ai = () => { makeAIMove(); return "AI move initiated"; };
window.stats = () => { console.log(`v${GAME_VERSION} | TT: ${transpositionTable.size()}`); return "Stats"; };
window.help = () => { console.log("Chess Game v" + GAME_VERSION); return "Help"; };
window.newGame = newGame;
window.undo = undoMove;
window.switchSide = switchSides;
window.setMode = (m) => { gameMode = m; changeGameMode(); };
window.clearMemory = clearMemory;
window.setDepth = (d) => { SEARCH_CONFIG.baseDepth = d; console.log(`Depth: ${d}`); };

window.addEventListener('load', () => {
    moveTree = new PersistentMoveTree();
    window.board = board;
    window.castlingRights = castlingRights;
    window.enPassantTarget = enPassantTarget;
    if (typeof ChessAILearner !== 'undefined') {
        enhancedAI = new ChessAILearner();
        openingBook = enhancedAI;
        console.log('📖 Opening Book: Loaded');
    }
    if (typeof GamePatternLearner !== 'undefined') {
        patternLearner = new GamePatternLearner();
        fetch('games.csv').then(r => r.ok ? r.text() : Promise.reject())
            .then(t => patternLearner.loadFromCSV(t))
            .then(c => console.log(`🧠 Pattern Learner: ${c} games`))
            .catch(() => console.log('⚠️ Pattern learner: CSV not loaded'));
    }
    if (typeof ChessEndgameEngine !== 'undefined') {
        endgameEngine = new ChessEndgameEngine();
        console.log('♟️ Endgame Engine loaded!');
    }
    createBoard();
    updateStatus();
    updateAIStats();
    changeGameMode();
    console.log(`♔ Chess Game v${GAME_VERSION} Loaded! ♛`);
});

console.log(`✅ Chess Game v${GAME_VERSION} loaded - Queen sac fixed, Infinity/NaN prevented.`);
