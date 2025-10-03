export class GlobalStatsManager {
    constructor() {
        this.globalStats = {
            totalPlayers: 0,
            averageScore: 0,
            topScore: 0,
            totalSessions: 0
        };
        this.playerLocations = [];
        this.leaderboard = [];
        this.initialized = false;
    }

    generateDemoData() {
        // Generate demo global statistics
        this.globalStats = {
            totalPlayers: Math.floor(Math.random() * 10000) + 5000,
            averageScore: Math.floor(Math.random() * 100) + 50,
            topScore: Math.floor(Math.random() * 500) + 200,
            totalSessions: Math.floor(Math.random() * 50000) + 25000
        };

        // Generate demo player locations
        this.playerLocations = [
            { city: 'New York', country: 'USA', players: Math.floor(Math.random() * 1000) + 100 },
            { city: 'London', country: 'UK', players: Math.floor(Math.random() * 800) + 80 },
            { city: 'Tokyo', country: 'Japan', players: Math.floor(Math.random() * 600) + 60 },
            { city: 'Sydney', country: 'Australia', players: Math.floor(Math.random() * 400) + 40 },
            { city: 'Berlin', country: 'Germany', players: Math.floor(Math.random() * 500) + 50 },
            { city: 'Toronto', country: 'Canada', players: Math.floor(Math.random() * 300) + 30 }
        ];

        // Generate demo leaderboard
        const names = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Sage'];
        this.leaderboard = names.map((name, index) => ({
            name: name,
            score: Math.floor(Math.random() * 400) + 100 - (index * 10),
            rank: index + 1
        }));

        this.initialized = true;
    }

    getGlobalStats() {
        if (!this.initialized) {
            this.generateDemoData();
        }
        return this.globalStats;
    }

    getPlayerLocations() {
        if (!this.initialized) {
            this.generateDemoData();
        }
        return this.playerLocations;
    }

    getLeaderboard(type = 'qScore', limit = 10) {
        if (!this.initialized) {
            this.generateDemoData();
        }
        return this.leaderboard.slice(0, limit);
    }

    updatePlayerStats(playerData) {
        // In a real implementation, this would update server-side statistics
        console.log('Updating player stats:', playerData);
    }

    submitScore(score, playerName = 'Anonymous') {
        // In a real implementation, this would submit to a server
        console.log(`Score submitted: ${score} by ${playerName}`);
        
        // Update local leaderboard for demo purposes
        const newEntry = {
            name: playerName,
            score: score,
            rank: 0
        };
        
        this.leaderboard.push(newEntry);
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 10);
        
        // Update ranks
        this.leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });
    }
}