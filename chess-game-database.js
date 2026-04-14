// chess-game-database.js
// Full game database for pattern learning and evaluation training
// VERSION: 1.0.0

class GamePatternLearner {
    constructor() {
        this.games = [];
        this.positionOutcomes = new Map(); // FEN-like position -> { whiteWins, blackWins, draws, total }
        this.tacticalMotifs = new Map(); // Pattern -> frequency
        this.commonPlans = new Map(); // Pawn structure -> typical plans
        this.loaded = false;
        this.stats = {
            totalGames: 0,
            whiteWins: 0,
            blackWins: 0,
            draws: 0,
            avgMoves: 0
        };
    }

    // Parse CSV line (handles quoted fields with commas)
    parseCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);
        return parts;
    }

    // Convert move string (e.g., "e4") to coordinates
    parseMove(moveStr, board) {
        if (!moveStr || moveStr.length < 2) return null;
        
        // Handle castling
        if (moveStr === 'O-O' || moveStr === 'O-O-O') {
            const row = board.currentPlayer === 'white' ? 7 : 0;
            if (moveStr === 'O-O') {
                return { fromRow: row, fromCol: 4, toRow: row, toCol: 6 };
            } else {
                return { fromRow: row, fromCol: 4, toRow: row, toCol: 2 };
            }
        }
        
        // Remove check/checkmate symbols
        moveStr = moveStr.replace(/[+#!?]/g, '');
        
        // Get destination square (last 2 chars)
        const destFile = moveStr.charCodeAt(moveStr.length - 2) - 97;
        const destRank = 8 - parseInt(moveStr[moveStr.length - 1]);
        
        // Find which piece moved
        const pieceType = moveStr.length > 2 ? moveStr[0] : 'P';
        
        // Look for the piece that can move to destination
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board.board[row][col];
                if (piece && this.isCorrectPiece(piece, pieceType, board.currentPlayer)) {
                    if (this.canPieceMoveTo(board, row, col, destRank, destFile)) {
                        return { fromRow: row, fromCol: col, toRow: destRank, toCol: destFile };
                    }
                }
            }
        }
        return null;
    }

    isCorrectPiece(piece, type, player) {
        const pieceMap = {
            'K': player === 'white' ? '♔' : '♚',
            'Q': player === 'white' ? '♕' : '♛',
            'R': player === 'white' ? '♖' : '♜',
            'B': player === 'white' ? '♗' : '♝',
            'N': player === 'white' ? '♘' : '♞',
            'P': player === 'white' ? '♙' : '♟'
        };
        return piece === pieceMap[type];
    }

    canPieceMoveTo(board, fromRow, fromCol, toRow, toCol) {
        // Simplified check - just verify it's a legal move
        const piece = board.board[fromRow][fromCol];
        if (!piece) return false;
        
        // Check if square is empty or has opponent piece
        const target = board.board[toRow][toCol];
        const isWhitePiece = '♔♕♖♗♘♙'.includes(piece);
        const isTargetWhite = target && '♔♕♖♗♘♙'.includes(target);
        
        if (target && isWhitePiece === isTargetWhite) return false;
        
        // Basic movement patterns
        const dx = Math.abs(toCol - fromCol);
        const dy = Math.abs(toRow - fromRow);
        
        if (piece.includes('♙') || piece.includes('♟')) {
            const direction = isWhitePiece ? -1 : 1;
            if (fromCol === toCol) {
                return (toRow - fromRow) === direction || 
                       (fromRow === (isWhitePiece ? 6 : 1) && (toRow - fromRow) === 2 * direction);
            }
            return dx === 1 && (toRow - fromRow) === direction && target;
        }
        
        if (piece.includes('♘') || piece.includes('♞')) {
            return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
        }
        
        if (piece.includes('♗') || piece.includes('♝')) {
            return dx === dy && dx > 0;
        }
        
        if (piece.includes('♖') || piece.includes('♜')) {
            return (dx === 0 && dy > 0) || (dy === 0 && dx > 0);
        }
        
        if (piece.includes('♕') || piece.includes('♛')) {
            return (dx === dy) || (dx === 0) || (dy === 0);
        }
        
        if (piece.includes('♔') || piece.includes('♚')) {
            return dx <= 1 && dy <= 1;
        }
        
        return false;
    }

    // Load and analyze games from CSV text
    async loadFromCSV(csvText) {
        const lines = csvText.split('\n');
        let loaded = 0;
        let totalMoves = 0;
        
        // Track game state for parsing
        let board = {
            board: this.createStartingBoard(),
            currentPlayer: 'white'
        };
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                const parts = this.parseCSVLine(line);
                if (parts.length < 16) continue;
                
                const game = {
                    id: parts[0],
                    rated: parts[1] === 'TRUE',
                    createdAt: parts[2],
                    lastMoveAt: parts[3],
                    turns: parseInt(parts[4]) || 0,
                    victoryStatus: parts[5],
                    winner: parts[6],
                    incrementCode: parts[7],
                    whiteId: parts[8],
                    whiteRating: parseInt(parts[9]) || 1500,
                    blackId: parts[10],
                    blackRating: parseInt(parts[11]) || 1500,
                    movesStr: parts[12],
                    openingECO: parts[13],
                    openingName: parts[14],
                    openingPly: parseInt(parts[15]) || 0
                };
                
                if (game.movesStr && game.turns >= 10) {
                    // Parse moves and learn patterns
                    const moves = game.movesStr.split(' ');
                    game.moves = moves;
                    
                    this.learnFromGame(game);
                    
                    this.games.push(game);
                    loaded++;
                    totalMoves += moves.length;
                    
                    // Update stats
                    this.stats.totalGames++;
                    if (game.winner === 'white') this.stats.whiteWins++;
                    else if (game.winner === 'black') this.stats.blackWins++;
                    else this.stats.draws++;
                }
            } catch (e) {
                // Skip malformed lines
            }
        }
        
        this.stats.avgMoves = Math.round(totalMoves / loaded);
        this.loaded = true;
        
        console.log(`📚 Pattern Database: Loaded ${loaded} games for learning`);
        console.log(`   White wins: ${this.stats.whiteWins}, Black wins: ${this.stats.blackWins}, Draws: ${this.stats.draws}`);
        console.log(`   Average game length: ${this.stats.avgMoves} moves`);
        console.log(`   Learned ${this.positionOutcomes.size} position patterns`);
        
        return loaded;
    }

    createStartingBoard() {
        return [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ];
    }

    learnFromGame(game) {
        // Learn from high-rated games (both players 1800+)
        if (game.whiteRating < 1800 || game.blackRating < 1800) return;
        
        // Learn from decisive games (not draws) for tactical patterns
        if (game.victoryStatus === 'mate' || game.victoryStatus === 'resign') {
            this.learnTacticalPatterns(game);
        }
        
        // Learn positional evaluation from all high-rated games
        this.learnPositionalPatterns(game);
    }

    learnTacticalPatterns(game) {
        // Analyze move sequences for tactical motifs
        const moves = game.moves;
        const winner = game.winner;
        
        // Look for captures, checks, and mating patterns
        for (let i = 0; i < moves.length - 1; i++) {
            const move = moves[i];
            const nextMove = moves[i + 1];
            
            // Check if move contains capture (x)
            if (move.includes('x')) {
                const pattern = `capture_${move[0]}`;
                const current = this.tacticalMotifs.get(pattern) || { success: 0, total: 0 };
                current.total++;
                if ((i % 2 === 0 && winner === 'white') || (i % 2 === 1 && winner === 'black')) {
                    current.success++;
                }
                this.tacticalMotifs.set(pattern, current);
            }
            
            // Check for checks (+)
            if (move.includes('+')) {
                const pattern = `check_${move[0]}`;
                const current = this.tacticalMotifs.get(pattern) || { success: 0, total: 0 };
                current.total++;
                if ((i % 2 === 0 && winner === 'white') || (i % 2 === 1 && winner === 'black')) {
                    current.success++;
                }
                this.tacticalMotifs.set(pattern, current);
            }
        }
    }

    learnPositionalPatterns(game) {
        // Simplified: learn from game outcome
        const outcome = game.winner === 'white' ? 1 : (game.winner === 'black' ? -1 : 0);
        
        // Could expand to learn specific pawn structures, piece configurations, etc.
    }

    // Get tactical advice for current position
    getTacticalAdvice(board, player) {
        if (!this.loaded) return null;
        
        const advice = [];
        
        // Check capture success rate
        const capturePattern = `capture_`;
        let captureSuccess = 0, captureTotal = 0;
        
        for (const [pattern, stats] of this.tacticalMotifs) {
            if (pattern.startsWith(capturePattern)) {
                captureSuccess += stats.success;
                captureTotal += stats.total;
            }
        }
        
        if (captureTotal > 100) {
            const successRate = (captureSuccess / captureTotal * 100).toFixed(1);
            advice.push(`Captures succeed ${successRate}% of the time in master games`);
        }
        
        return advice;
    }

    // Evaluate position based on learned patterns
    evaluatePosition(boardState, player) {
        if (!this.loaded) return 0;
        
        let evaluation = 0;
        
        // Material count is fundamental
        evaluation += this.evaluateMaterial(boardState);
        
        // Add small bonus based on game statistics
        if (this.stats.whiteWins > this.stats.blackWins) {
            evaluation += 10; // Slight white advantage in database
        }
        
        return evaluation;
    }

    evaluateMaterial(boardState) {
        const values = { '♙': 1, '♘': 3, '♗': 3, '♖': 5, '♕': 9, '♔': 0,
                         '♟': 1, '♞': 3, '♝': 3, '♜': 5, '♛': 9, '♚': 0 };
        
        let white = 0, black = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row]?.[col];
                if (piece) {
                    const val = values[piece] || 0;
                    if ('♔♕♖♗♘♙'.includes(piece)) white += val;
                    else black += val;
                }
            }
        }
        return (white - black) * 100;
    }

    getStats() {
        return {
            ...this.stats,
            patterns: this.tacticalMotifs.size,
            positions: this.positionOutcomes.size,
            loaded: this.loaded
        };
    }
}

// Create global instance
let gamePatternLearner = null;

// Initialize when CSV is loaded
async function initPatternLearner(csvText) {
    gamePatternLearner = new GamePatternLearner();
    await gamePatternLearner.loadFromCSV(csvText);
    return gamePatternLearner;
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GamePatternLearner, initPatternLearner };
}
