class Database {
    static async saveScore(score) {
        const date = new Date().toISOString().split('T')[0];
        let scores = JSON.parse(localStorage.getItem('tetris_scores') || '{}');
        
        if (!scores[date]) {
            scores[date] = [];
        }
        
        scores[date].push({
            score: score,
            timestamp: new Date().getTime()
        });
        
        localStorage.setItem('tetris_scores', JSON.stringify(scores));
        await this.updateRankings();
    }

    static async updateRankings() {
        const scores = JSON.parse(localStorage.getItem('tetris_scores') || '{}');
        const today = new Date().toISOString().split('T')[0];
        
        // 获取今日排名
        const todayScores = scores[today] || [];
        const todayRankings = todayScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        // 获取15天历史排名
        const historyRankings = [];
        const dates = Object.keys(scores)
            .sort()
            .reverse()
            .slice(0, 15);
        
        for (const date of dates) {
            const dateScores = scores[date]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
            
            historyRankings.push({
                date,
                scores: dateScores
            });
        }
        
        localStorage.setItem('tetris_rankings', JSON.stringify({
            today: todayRankings,
            history: historyRankings
        }));
    }

    static async getRankings(type = 'today') {
        const rankings = JSON.parse(localStorage.getItem('tetris_rankings') || '{"today":[],"history":[]}');
        return type === 'today' ? rankings.today : rankings.history;
    }

    static async clearOldData() {
        const scores = JSON.parse(localStorage.getItem('tetris_scores') || '{}');
        const dates = Object.keys(scores).sort();
        
        // 保留最近15天的数据
        if (dates.length > 15) {
            const keepDates = dates.slice(-15);
            const newScores = {};
            keepDates.forEach(date => {
                newScores[date] = scores[date];
            });
            localStorage.setItem('tetris_scores', JSON.stringify(newScores));
        }
    }
}

// 每天自动清理旧数据
const checkDate = () => {
    const lastCheck = localStorage.getItem('last_check_date');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastCheck !== today) {
        Database.clearOldData();
        localStorage.setItem('last_check_date', today);
    }
};

// 页面加载时检查日期
checkDate();

// 排行榜UI处理
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('rankingModal');
    const rankingList = document.getElementById('rankingList');
    
    document.getElementById('showRanking').addEventListener('click', async () => {
        modal.style.display = 'block';
        await showRankings('today');
    });

    document.querySelector('.close-button').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    const showRankings = async (type) => {
        const rankings = await Database.getRankings(type);
        let html = '';
        
        if (type === 'today') {
            rankings.forEach((item, index) => {
                html += `<div class="ranking-item">
                    <span class="rank">#${index + 1}</span>
                    <span class="score">${item.score}分</span>
                </div>`;
            });
        } else {
            rankings.forEach(dayRanking => {
                html += `<div class="day-ranking">
                    <h3>${dayRanking.date}</h3>
                    ${dayRanking.scores.map((item, index) => `
                        <div class="ranking-item">
                            <span class="rank">#${index + 1}</span>
                            <span class="score">${item.score}分</span>
                        </div>
                    `).join('')}
                </div>`;
            });
        }
        
        rankingList.innerHTML = html || '<div class="no-data">暂无数据</div>';
    };

    // 标签切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            showRankings(e.target.dataset.days === '0' ? 'today' : 'history');
        });
    });
});
