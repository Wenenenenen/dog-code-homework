const scoreTracker = {
    // 数据存储
    data: {
        participants: [],
        rounds: [],
        scores: [],
        previousRanking: []
    },
    
    // 编辑状态
    editState: {
        participantId: null,
        roundId: null
    },

    // 初始化
    init: function() {
        this.loadData();
        this.bindEvents();
        this.renderAll();
    },

    // 从 localStorage 加载数据
    loadData: function() {
        try {
            const savedData = localStorage.getItem('scoreTrackerData');
            if (savedData) {
                this.data = JSON.parse(savedData);
            }
        } catch (e) {
            console.error('加载数据失败:', e);
        }
    },

    // 保存数据到 localStorage
    saveData: function() {
        try {
            localStorage.setItem('scoreTrackerData', JSON.stringify(this.data));
        } catch (e) {
            console.error('保存数据失败:', e);
        }
    },

    // 生成唯一ID
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // ==================== 参赛者管理 ====================
    
    // 添加参赛者
    addParticipant: function(name) {
        if (!name || name.trim() === '') {
            alert('请输入参赛者姓名！');
            return false;
        }
        
        name = name.trim();
        
        // 检查是否已存在
        const exists = this.data.participants.some(p => 
            p.name.toLowerCase() === name.toLowerCase()
        );
        
        if (exists) {
            alert('该参赛者已存在！');
            return false;
        }
        
        const participant = {
            id: this.generateId(),
            name: name,
            createdAt: new Date().toISOString()
        };
        
        this.data.participants.push(participant);
        this.saveData();
        this.renderAll();
        return true;
    },

    // 删除参赛者
    removeParticipant: function(id) {
        const participant = this.data.participants.find(p => p.id === id);
        if (!participant) return;
        
        // 检查是否有相关成绩
        const hasScores = this.data.scores.some(s => s.participantId === id);
        
        let confirmMessage = `确定要删除参赛者"${participant.name}"吗？`;
        if (hasScores) {
            confirmMessage += `\n\n警告：该参赛者已有 ${this.data.scores.filter(s => s.participantId === id).length} 条成绩记录，删除后将同时删除所有相关成绩！`;
        }
        
        if (!confirm(confirmMessage)) return;
        
        // 删除参赛者
        this.data.participants = this.data.participants.filter(p => p.id !== id);
        
        // 删除相关成绩
        this.data.scores = this.data.scores.filter(s => s.participantId !== id);
        
        this.saveData();
        this.renderAll();
    },

    // ==================== 比赛轮次管理 ====================
    
    // 添加比赛轮次
    addRound: function(name, weight) {
        if (!name || name.trim() === '') {
            alert('请输入轮次名称！');
            return false;
        }
        
        name = name.trim();
        weight = parseFloat(weight) || 1.0;
        
        if (weight <= 0) {
            alert('权重必须大于0！');
            return false;
        }
        
        // 检查是否已存在
        const exists = this.data.rounds.some(r => 
            r.name.toLowerCase() === name.toLowerCase()
        );
        
        if (exists) {
            alert('该轮次名称已存在！');
            return false;
        }
        
        const round = {
            id: this.generateId(),
            name: name,
            weight: weight,
            order: this.data.rounds.length,
            createdAt: new Date().toISOString()
        };
        
        this.data.rounds.push(round);
        this.saveData();
        this.renderAll();
        return true;
    },

    // 删除比赛轮次
    removeRound: function(id) {
        const round = this.data.rounds.find(r => r.id === id);
        if (!round) return;
        
        // 检查是否有相关成绩
        const hasScores = this.data.scores.some(s => s.roundId === id);
        
        let confirmMessage = `确定要删除轮次"${round.name}"吗？`;
        if (hasScores) {
            confirmMessage += `\n\n警告：该轮次已有 ${this.data.scores.filter(s => s.roundId === id).length} 条成绩记录，删除后将同时删除所有相关成绩！`;
        }
        
        if (!confirm(confirmMessage)) return;
        
        // 删除轮次
        this.data.rounds = this.data.rounds.filter(r => r.id !== id);
        
        // 删除相关成绩
        this.data.scores = this.data.scores.filter(s => s.roundId !== id);
        
        // 重新排序
        this.data.rounds.forEach((r, index) => {
            r.order = index;
        });
        
        this.saveData();
        this.renderAll();
    },

    // 修改轮次权重
    updateRoundWeight: function(id, newWeight) {
        const round = this.data.rounds.find(r => r.id === id);
        if (!round) return false;
        
        newWeight = parseFloat(newWeight);
        if (isNaN(newWeight) || newWeight <= 0) {
            alert('权重必须大于0！');
            return false;
        }
        
        round.weight = newWeight;
        this.saveData();
        this.renderAll();
        return true;
    },

    // ==================== 成绩管理 ====================
    
    // 录入成绩
    addScore: function(participantId, roundId, score, isForfeit) {
        if (!participantId || !roundId) {
            alert('请选择参赛者和轮次！');
            return false;
        }
        
        const existingScore = this.data.scores.find(
            s => s.participantId === participantId && s.roundId === roundId
        );
        
        if (existingScore) {
            alert('该参赛者在本轮次已有成绩！如需修改，请在排名表格中点击编辑按钮。');
            return false;
        }
        
        let finalScore = null;
        if (!isForfeit) {
            finalScore = parseFloat(score);
            if (isNaN(finalScore) || finalScore < 0) {
                alert('请输入有效的成绩（非负数）！');
                return false;
            }
        }
        
        this.saveCurrentRanking();
        
        const scoreEntry = {
            id: this.generateId(),
            participantId: participantId,
            roundId: roundId,
            score: finalScore,
            isForfeit: isForfeit,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.data.scores.push(scoreEntry);
        this.saveData();
        this.renderAll();
        return true;
    },

    // 更新成绩
    updateScore: function(participantId, roundId, newScore, isForfeit) {
        const scoreEntry = this.data.scores.find(
            s => s.participantId === participantId && s.roundId === roundId
        );
        
        if (!scoreEntry) {
            alert('未找到该成绩记录！');
            return false;
        }
        
        let finalScore = null;
        if (!isForfeit) {
            finalScore = parseFloat(newScore);
            if (isNaN(finalScore) || finalScore < 0) {
                alert('请输入有效的成绩（非负数）！');
                return false;
            }
        }
        
        this.saveCurrentRanking();
        
        scoreEntry.score = finalScore;
        scoreEntry.isForfeit = isForfeit;
        scoreEntry.updatedAt = new Date().toISOString();
        
        this.saveData();
        this.renderAll();
        return true;
    },

    // 获取参赛者的成绩
    getParticipantScores: function(participantId) {
        return this.data.scores.filter(s => s.participantId === participantId);
    },

    // 获取指定轮次的成绩
    getRoundScores: function(roundId) {
        return this.data.scores.filter(s => s.roundId === roundId);
    },

    // 获取参赛者在指定轮次的成绩
    getScore: function(participantId, roundId) {
        return this.data.scores.find(
            s => s.participantId === participantId && s.roundId === roundId
        );
    },

    // ==================== 排名计算 ====================
    
    // 计算总积分
    calculateTotalScore: function(participantId) {
        const participantScores = this.getParticipantScores(participantId);
        let totalWeightedScore = 0;
        
        participantScores.forEach(scoreEntry => {
            if (!scoreEntry.isForfeit && scoreEntry.score !== null) {
                const round = this.data.rounds.find(r => r.id === scoreEntry.roundId);
                if (round) {
                    totalWeightedScore += scoreEntry.score * round.weight;
                }
            }
        });
        
        return totalWeightedScore;
    },

    // 获取参赛者最近一轮的成绩（用于平局时比较）
    getLatestRoundScore: function(participantId) {
        const participantScores = this.getParticipantScores(participantId);
        if (participantScores.length === 0) return -Infinity;
        
        // 按轮次顺序排序
        const sortedRounds = [...this.data.rounds].sort((a, b) => a.order - b.order);
        
        // 从最后一轮开始查找
        for (let i = sortedRounds.length - 1; i >= 0; i--) {
            const round = sortedRounds[i];
            const scoreEntry = participantScores.find(s => s.roundId === round.id);
            if (scoreEntry && !scoreEntry.isForfeit && scoreEntry.score !== null) {
                return scoreEntry.score;
            }
        }
        
        return -Infinity;
    },

    // 计算排名（内部版本，不保存 previousRanking）
    _calculateRankingInternal: function() {
        if (this.data.participants.length === 0) return [];
        
        const ranking = this.data.participants.map(participant => {
            const totalWeightedScore = this.calculateTotalScore(participant.id);
            const latestScore = this.getLatestRoundScore(participant.id);
            
            const roundDetails = this.data.rounds.map(round => {
                const scoreEntry = this.getScore(participant.id, round.id);
                return {
                    roundId: round.id,
                    roundName: round.name,
                    roundWeight: round.weight,
                    originalScore: scoreEntry ? scoreEntry.score : null,
                    weightedScore: scoreEntry && !scoreEntry.isForfeit && scoreEntry.score !== null 
                        ? scoreEntry.score * round.weight 
                        : null,
                    isForfeit: scoreEntry ? scoreEntry.isForfeit : false,
                    hasScore: !!scoreEntry
                };
            });
            
            return {
                participantId: participant.id,
                participantName: participant.name,
                totalWeightedScore: totalWeightedScore,
                latestScore: latestScore,
                roundDetails: roundDetails,
                rank: 0
            };
        });
        
        ranking.sort((a, b) => {
            if (b.totalWeightedScore !== a.totalWeightedScore) {
                return b.totalWeightedScore - a.totalWeightedScore;
            }
            return b.latestScore - a.latestScore;
        });
        
        let currentRank = 1;
        for (let i = 0; i < ranking.length; i++) {
            if (i > 0) {
                const prev = ranking[i - 1];
                const current = ranking[i];
                
                if (current.totalWeightedScore !== prev.totalWeightedScore || 
                    current.latestScore !== prev.latestScore) {
                    currentRank = i + 1;
                }
            }
            ranking[i].rank = currentRank;
        }
        
        return ranking;
    },

    // 计算排名（公开版本，保存 previousRanking）
    calculateRanking: function() {
        const currentRanking = this._calculateRankingInternal();
        return currentRanking;
    },

    // 获取当前排名的参赛者ID列表
    getCurrentRankingIds: function() {
        const ranking = this._calculateRankingInternal();
        return ranking.map(r => r.participantId);
    },

    // 在添加/更新成绩前保存当前排名
    saveCurrentRanking: function() {
        this.data.previousRanking = this.getCurrentRankingIds();
    },

    // 计算名次变化
    calculateRankChange: function(participantId, currentRank) {
        const previousRanking = this.data.previousRanking;
        
        if (previousRanking.length === 0) {
            return { type: 'new', symbol: '新', value: 0 };
        }
        
        const previousIndex = previousRanking.indexOf(participantId);
        
        if (previousIndex === -1) {
            return { type: 'new', symbol: '新', value: 0 };
        }
        
        const previousRank = previousIndex + 1;
        
        if (currentRank < previousRank) {
            return { type: 'up', symbol: '↑', value: previousRank - currentRank };
        } else if (currentRank > previousRank) {
            return { type: 'down', symbol: '↓', value: currentRank - previousRank };
        } else {
            return { type: 'same', symbol: '=', value: 0 };
        }
    },

    // ==================== 渲染函数 ====================
    
    renderAll: function() {
        this.renderParticipantsList();
        this.renderRoundsList();
        this.renderScoreSelects();
        this.renderRankingTable();
        this.updateRankingInfo();
    },

    // 渲染参赛者列表
    renderParticipantsList: function() {
        const container = document.getElementById('participantsList');
        
        if (this.data.participants.length === 0) {
            container.innerHTML = '<p class="empty-hint">暂未添加参赛者</p>';
            return;
        }
        
        let html = '';
        this.data.participants.forEach(participant => {
            const scoreCount = this.data.scores.filter(s => s.participantId === participant.id).length;
            html += `
                <div class="list-item" data-id="${participant.id}">
                    <span class="list-item-name">${this.escapeHtml(participant.name)}</span>
                    <span class="list-item-info">${scoreCount} 条成绩</span>
                    <div class="list-item-actions">
                        <button class="btn-sm btn-danger" onclick="scoreTracker.removeParticipant('${participant.id}')">删除</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },

    // 渲染轮次列表
    renderRoundsList: function() {
        const container = document.getElementById('roundsList');
        
        if (this.data.rounds.length === 0) {
            container.innerHTML = '<p class="empty-hint">暂未添加比赛轮次</p>';
            return;
        }
        
        // 按顺序排序
        const sortedRounds = [...this.data.rounds].sort((a, b) => a.order - b.order);
        
        let html = '';
        sortedRounds.forEach(round => {
            const scoreCount = this.data.scores.filter(s => s.roundId === round.id).length;
            html += `
                <div class="list-item" data-id="${round.id}">
                    <span class="list-item-name">${this.escapeHtml(round.name)}</span>
                    <span class="list-item-info">
                        权重: <input type="number" value="${round.weight}" min="0.1" step="0.1" 
                            class="weight-input" style="width: 60px; padding: 4px 8px; margin: 0 5px;"
                            onchange="scoreTracker.updateRoundWeight('${round.id}', this.value)">
                    </span>
                    <span class="list-item-info">${scoreCount} 条成绩</span>
                    <div class="list-item-actions">
                        <button class="btn-sm btn-danger" onclick="scoreTracker.removeRound('${round.id}')">删除</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },

    // 渲染成绩录入下拉框
    renderScoreSelects: function() {
        const participantSelect = document.getElementById('selectedParticipant');
        const roundSelect = document.getElementById('selectedRound');
        
        // 渲染参赛者选项
        let participantHtml = '<option value="">选择参赛者</option>';
        this.data.participants.forEach(p => {
            participantHtml += `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`;
        });
        participantSelect.innerHTML = participantHtml;
        
        // 渲染轮次选项
        let roundHtml = '<option value="">选择轮次</option>';
        const sortedRounds = [...this.data.rounds].sort((a, b) => a.order - b.order);
        sortedRounds.forEach(r => {
            roundHtml += `<option value="${r.id}">${this.escapeHtml(r.name)} (权重: ${r.weight})</option>`;
        });
        roundSelect.innerHTML = roundHtml;
    },

    // 渲染排名表格
    renderRankingTable: function() {
        const container = document.getElementById('rankingTableContainer');
        
        if (this.data.participants.length === 0 || this.data.rounds.length === 0) {
            container.innerHTML = '<p class="empty-hint">请添加参赛者和比赛轮次</p>';
            return;
        }
        
        const ranking = this.calculateRanking();
        const sortedRounds = [...this.data.rounds].sort((a, b) => a.order - b.order);
        
        let headerHtml = `
            <tr>
                <th>排名</th>
                <th>选手名称</th>
                <th>名次变化</th>
        `;
        
        sortedRounds.forEach(round => {
            headerHtml += `
                <th>${this.escapeHtml(round.name)}<br><small>(权重×${round.weight})</small></th>
            `;
        });
        
        headerHtml += `
                <th>总积分</th>
                <th>操作</th>
            </tr>
        `;
        
        let bodyHtml = '';
        ranking.forEach((item, index) => {
            const rankClass = item.rank === 1 ? 'rank-1' : 
                             item.rank === 2 ? 'rank-2' : 
                             item.rank === 3 ? 'rank-3' : '';
            
            const rankChange = this.calculateRankChange(item.participantId, item.rank);
            const changeClass = rankChange.type === 'up' ? 'rank-change-up' :
                               rankChange.type === 'down' ? 'rank-change-down' :
                               rankChange.type === 'same' ? 'rank-change-same' :
                               'rank-change-new';
            
            const changeSymbol = rankChange.value > 0 
                ? `${rankChange.symbol}${rankChange.value}` 
                : rankChange.symbol;
            
            bodyHtml += `<tr class="${rankClass}">`;
            bodyHtml += `<td><span class="rank-number">${item.rank}</span></td>`;
            bodyHtml += `<td class="text-left font-bold">${this.escapeHtml(item.participantName)}</td>`;
            bodyHtml += `<td><span class="${changeClass}">${changeSymbol}</span></td>`;
            
            sortedRounds.forEach(round => {
                const detail = item.roundDetails.find(d => d.roundId === round.id);
                if (detail) {
                    if (detail.isForfeit) {
                        bodyHtml += `<td><span class="forfeit-badge">弃权</span></td>`;
                    } else if (detail.originalScore !== null) {
                        bodyHtml += `<td>
                            <div>${detail.originalScore.toFixed(2)}</div>
                            <div style="font-size: 0.8rem; color: #666;">
                                加权: ${detail.weightedScore.toFixed(2)}
                            </div>
                        </td>`;
                    } else {
                        bodyHtml += `<td style="color: #999;">-</td>`;
                    }
                } else {
                    bodyHtml += `<td style="color: #999;">-</td>`;
                }
            });
            
            bodyHtml += `<td class="font-bold" style="color: #1e3c72; font-size: 1.1rem;">
                ${item.totalWeightedScore.toFixed(2)}
            </td>`;
            
            bodyHtml += `<td>
                <button class="btn-sm btn-primary edit-btn" onclick="scoreTracker.openEditModal('${item.participantId}')">
                    编辑成绩
                </button>
            </td>`;
            
            bodyHtml += `</tr>`;
        });
        
        container.innerHTML = `
            <table class="ranking-table">
                <thead>${headerHtml}</thead>
                <tbody>${bodyHtml}</tbody>
            </table>
        `;
    },

    // 更新排名信息
    updateRankingInfo: function() {
        document.getElementById('totalParticipants').textContent = this.data.participants.length;
        document.getElementById('totalRounds').textContent = this.data.rounds.length;
        document.getElementById('lastUpdate').textContent = 
            this.data.scores.length > 0 
                ? new Date().toLocaleString('zh-CN') 
                : '-';
    },

    // ==================== 编辑模态框 ====================
    
    openEditModal: function(participantId) {
        const participant = this.data.participants.find(p => p.id === participantId);
        if (!participant) return;
        
        this.editState.participantId = participantId;
        
        document.getElementById('editParticipantName').textContent = participant.name;
        
        // 填充轮次选择
        const roundSelect = document.getElementById('selectedRound');
        let roundHtml = '<option value="">选择轮次</option>';
        const sortedRounds = [...this.data.rounds].sort((a, b) => a.order - b.order);
        sortedRounds.forEach(r => {
            const hasScore = this.getScore(participantId, r.id);
            roundHtml += `<option value="${r.id}" ${hasScore ? 'selected' : ''}>
                ${this.escapeHtml(r.name)} ${hasScore ? '(已有成绩)' : ''}
            </option>`;
        });
        
        // 重新设置下拉框
        const editRoundSelect = document.createElement('select');
        editRoundSelect.id = 'editRoundSelect';
        editRoundSelect.innerHTML = roundHtml;
        
        // 替换现有的轮次显示
        const roundNameElement = document.getElementById('editRoundName');
        roundNameElement.innerHTML = '';
        roundNameElement.appendChild(editRoundSelect);
        
        // 绑定轮次选择事件
        editRoundSelect.addEventListener('change', (e) => {
            this.editState.roundId = e.target.value;
            this.loadScoreForEdit();
        });
        
        // 默认选择第一个有成绩的轮次或第一个轮次
        const firstOption = sortedRounds.find(r => this.getScore(participantId, r.id)) || sortedRounds[0];
        if (firstOption) {
            editRoundSelect.value = firstOption.id;
            this.editState.roundId = firstOption.id;
            this.loadScoreForEdit();
        }
        
        this.showModal('editModal');
    },

    loadScoreForEdit: function() {
        if (!this.editState.participantId || !this.editState.roundId) {
            document.getElementById('editScoreValue').value = '';
            document.getElementById('editIsForfeit').checked = false;
            return;
        }
        
        const scoreEntry = this.getScore(this.editState.participantId, this.editState.roundId);
        
        if (scoreEntry) {
            document.getElementById('editScoreValue').value = 
                scoreEntry.score !== null ? scoreEntry.score : '';
            document.getElementById('editIsForfeit').checked = scoreEntry.isForfeit;
        } else {
            document.getElementById('editScoreValue').value = '';
            document.getElementById('editIsForfeit').checked = false;
        }
    },

    saveEdit: function() {
        if (!this.editState.participantId || !this.editState.roundId) {
            alert('请选择参赛者和轮次！');
            return;
        }
        
        const scoreValue = document.getElementById('editScoreValue').value;
        const isForfeit = document.getElementById('editIsForfeit').checked;
        
        const existingScore = this.getScore(this.editState.participantId, this.editState.roundId);
        
        if (existingScore) {
            // 更新已有成绩
            if (this.updateScore(this.editState.participantId, this.editState.roundId, scoreValue, isForfeit)) {
                this.hideModal('editModal');
            }
        } else {
            // 添加新成绩
            if (this.addScore(this.editState.participantId, this.editState.roundId, scoreValue, isForfeit)) {
                this.hideModal('editModal');
            }
        }
    },

    // ==================== 导出功能 ====================
    
    generateExportTable: function() {
        const ranking = this.calculateRanking();
        const sortedRounds = [...this.data.rounds].sort((a, b) => a.order - b.order);
        
        if (ranking.length === 0) {
            return { headers: [], rows: [], csv: '' };
        }
        
        // 构建表头
        const headers = ['排名', '选手名称', '名次变化'];
        sortedRounds.forEach(round => {
            headers.push(`${round.name}(原始分)`);
            headers.push(`${round.name}(加权分)`);
        });
        headers.push('总积分');
        
        // 构建数据行
        const rows = ranking.map(item => {
            const rankChange = this.calculateRankChange(item.participantId, item.rank);
            const changeSymbol = rankChange.value > 0 
                ? `${rankChange.symbol}${rankChange.value}` 
                : rankChange.symbol;
            
            const row = [item.rank, item.participantName, changeSymbol];
            
            sortedRounds.forEach(round => {
                const detail = item.roundDetails.find(d => d.roundId === round.id);
                if (detail && detail.isForfeit) {
                    row.push('弃权');
                    row.push('弃权');
                } else if (detail && detail.originalScore !== null) {
                    row.push(detail.originalScore.toFixed(2));
                    row.push(detail.weightedScore.toFixed(2));
                } else {
                    row.push('-');
                    row.push('-');
                }
            });
            
            row.push(item.totalWeightedScore.toFixed(2));
            return row;
        });
        
        // 生成CSV
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        return { headers, rows, csv };
    },

    renderExportTable: function() {
        const container = document.getElementById('exportTableContainer');
        const { headers, rows } = this.generateExportTable();
        
        if (rows.length === 0) {
            container.innerHTML = '<p class="empty-hint">暂无数据可导出</p>';
            return;
        }
        
        let headerHtml = '<tr>';
        headers.forEach(h => {
            headerHtml += `<th>${this.escapeHtml(h)}</th>`;
        });
        headerHtml += '</tr>';
        
        let bodyHtml = '';
        rows.forEach((row, index) => {
            const rankClass = row[0] === 1 ? 'rank-1' : 
                             row[0] === 2 ? 'rank-2' : 
                             row[0] === 3 ? 'rank-3' : '';
            bodyHtml += `<tr class="${rankClass}">`;
            row.forEach((cell, cellIndex) => {
                let cellContent = this.escapeHtml(String(cell));
                
                // 名次变化图标
                if (cellIndex === 2) {
                    if (cell.startsWith('↑')) {
                        cellContent = `<span class="rank-change-up">${cellContent}</span>`;
                    } else if (cell.startsWith('↓')) {
                        cellContent = `<span class="rank-change-down">${cellContent}</span>`;
                    } else if (cell === '=') {
                        cellContent = `<span class="rank-change-same">${cellContent}</span>`;
                    } else {
                        cellContent = `<span class="rank-change-new">${cellContent}</span>`;
                    }
                }
                
                // 弃权标记
                if (cell === '弃权') {
                    cellContent = `<span class="forfeit-badge">${cellContent}</span>`;
                }
                
                bodyHtml += `<td>${cellContent}</td>`;
            });
            bodyHtml += '</tr>';
        });
        
        container.innerHTML = `
            <table class="ranking-table">
                <thead>${headerHtml}</thead>
                <tbody>${bodyHtml}</tbody>
            </table>
        `;
    },

    copyTableToClipboard: function() {
        const { csv } = this.generateExportTable();
        
        if (!csv) {
            alert('暂无数据可复制！');
            return;
        }
        
        navigator.clipboard.writeText(csv).then(() => {
            alert('表格已复制到剪贴板！');
        }).catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = csv;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('表格已复制到剪贴板！');
        });
    },

    downloadCsv: function() {
        const { csv } = this.generateExportTable();
        
        if (!csv) {
            alert('暂无数据可下载！');
            return;
        }
        
        const BOM = '\uFEFF';
        const csvContent = BOM + csv;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `赛事排名汇总_${dateStr}.csv`;
        
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, fileName);
        } else {
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                const url = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
                window.open(url);
            }
        }
    },

    // ==================== 模态框控制 ====================
    
    showModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    hideModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // ==================== 重置功能 ====================
    
    resetAll: function() {
        if (!confirm('确定要重置所有数据吗？这将删除所有参赛者、轮次和成绩记录，且无法恢复！')) {
            return;
        }
        
        this.data = {
            participants: [],
            rounds: [],
            scores: [],
            previousRanking: []
        };
        
        this.saveData();
        this.renderAll();
    },

    // ==================== 工具函数 ====================
    
    escapeHtml: function(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ==================== 事件绑定 ====================
    
    bindEvents: function() {
        // 添加参赛者
        document.getElementById('addParticipantBtn').addEventListener('click', () => {
            const name = document.getElementById('newParticipantName').value;
            if (this.addParticipant(name)) {
                document.getElementById('newParticipantName').value = '';
            }
        });
        
        // 回车键添加参赛者
        document.getElementById('newParticipantName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = document.getElementById('newParticipantName').value;
                if (this.addParticipant(name)) {
                    document.getElementById('newParticipantName').value = '';
                }
            }
        });
        
        // 添加轮次
        document.getElementById('addRoundBtn').addEventListener('click', () => {
            const name = document.getElementById('newRoundName').value;
            const weight = document.getElementById('newRoundWeight').value;
            if (this.addRound(name, weight)) {
                document.getElementById('newRoundName').value = '';
                document.getElementById('newRoundWeight').value = '1.0';
            }
        });
        
        // 回车键添加轮次
        document.getElementById('newRoundName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = document.getElementById('newRoundName').value;
                const weight = document.getElementById('newRoundWeight').value;
                if (this.addRound(name, weight)) {
                    document.getElementById('newRoundName').value = '';
                    document.getElementById('newRoundWeight').value = '1.0';
                }
            }
        });
        
        // 录入成绩
        document.getElementById('submitScoreBtn').addEventListener('click', () => {
            const participantId = document.getElementById('selectedParticipant').value;
            const roundId = document.getElementById('selectedRound').value;
            const score = document.getElementById('scoreValue').value;
            const isForfeit = document.getElementById('isForfeit').checked;
            
            if (this.addScore(participantId, roundId, score, isForfeit)) {
                document.getElementById('scoreValue').value = '';
                document.getElementById('isForfeit').checked = false;
            }
        });
        
        // 导出排名
        document.getElementById('exportRankingBtn').addEventListener('click', () => {
            this.renderExportTable();
            this.showModal('exportModal');
        });
        
        // 关闭导出模态框
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideModal('exportModal');
        });
        
        // 复制表格
        document.getElementById('copyTableBtn').addEventListener('click', () => {
            this.copyTableToClipboard();
        });
        
        // 下载CSV
        document.getElementById('downloadCsvBtn').addEventListener('click', () => {
            this.downloadCsv();
        });
        
        // 关闭编辑模态框
        document.getElementById('closeEditModalBtn').addEventListener('click', () => {
            this.hideModal('editModal');
        });
        
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.hideModal('editModal');
        });
        
        document.getElementById('saveEditBtn').addEventListener('click', () => {
            this.saveEdit();
        });
        
        // 重置所有数据
        document.getElementById('resetAllBtn').addEventListener('click', () => {
            this.resetAll();
        });
        
        // 点击模态框外部关闭
        document.getElementById('exportModal').addEventListener('click', (e) => {
            if (e.target.id === 'exportModal') {
                this.hideModal('exportModal');
            }
        });
        
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.hideModal('editModal');
            }
        });
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    scoreTracker.init();
});
