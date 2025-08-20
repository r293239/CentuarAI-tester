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
