const textDiffTool = {
    options: {
        ignoreWhitespace: false,
        showDiffOnly: false
    },

    init: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        document.getElementById('compareBtn').addEventListener('click', () => {
            this.performDiff();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearAll();
        });

        document.getElementById('ignoreWhitespace').addEventListener('change', (e) => {
            this.options.ignoreWhitespace = e.target.checked;
            const leftText = document.getElementById('textLeft').value;
            const rightText = document.getElementById('textRight').value;
            if (leftText || rightText) {
                this.performDiff();
            }
        });

        document.getElementById('showDiffOnly').addEventListener('change', (e) => {
            this.options.showDiffOnly = e.target.checked;
            const leftText = document.getElementById('textLeft').value;
            const rightText = document.getElementById('textRight').value;
            if (leftText || rightText) {
                this.performDiff();
            }
        });

        document.getElementById('textLeft').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.performDiff();
            }
        });

        document.getElementById('textRight').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.performDiff();
            }
        });
    },

    processText: function(text) {
        let lines = text.split('\n');
        if (this.options.ignoreWhitespace) {
            lines = lines.map(line => line.trim()).filter(line => line !== '');
        }
        return lines;
    },

    computeLCSMatrix: function(seq1, seq2) {
        const m = seq1.length;
        const n = seq2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (seq1[i - 1] === seq2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        return dp;
    },

    buildDiff: function(originalLines, modifiedLines) {
        const processedOriginal = this.options.ignoreWhitespace 
            ? originalLines.map(l => l.trim()) 
            : originalLines;
        const processedModified = this.options.ignoreWhitespace 
            ? modifiedLines.map(l => l.trim()) 
            : modifiedLines;

        const lcs = this.computeLCS(processedOriginal, processedModified);

        const result = [];
        
        let leftIdx = 0;
        let rightIdx = 0;

        for (let lcsIdx = 0; lcsIdx <= lcs.length; lcsIdx++) {
            const lcsItem = lcsIdx < lcs.length ? lcs[lcsIdx] : null;
            const targetLeftIdx = lcsItem ? lcsItem.leftIndex : originalLines.length;
            const targetRightIdx = lcsItem ? lcsItem.rightIndex : modifiedLines.length;

            const removedInGap = [];
            const addedInGap = [];

            while (leftIdx < targetLeftIdx) {
                const isEmpty = this.options.ignoreWhitespace && originalLines[leftIdx].trim() === '';
                if (!this.options.ignoreWhitespace || !isEmpty) {
                    removedInGap.push({
                        content: originalLines[leftIdx],
                        lineNumber: leftIdx + 1
                    });
                }
                leftIdx++;
            }

            while (rightIdx < targetRightIdx) {
                const isEmpty = this.options.ignoreWhitespace && modifiedLines[rightIdx].trim() === '';
                if (!this.options.ignoreWhitespace || !isEmpty) {
                    addedInGap.push({
                        content: modifiedLines[rightIdx],
                        lineNumber: rightIdx + 1
                    });
                }
                rightIdx++;
            }

            const minCount = Math.min(removedInGap.length, addedInGap.length);
            for (let k = 0; k < minCount; k++) {
                result.push({
                    type: 'modified',
                    left: removedInGap[k],
                    right: addedInGap[k]
                });
            }

            for (let k = minCount; k < removedInGap.length; k++) {
                result.push({
                    type: 'removed',
                    left: removedInGap[k],
                    right: null
                });
            }

            for (let k = minCount; k < addedInGap.length; k++) {
                result.push({
                    type: 'added',
                    left: null,
                    right: addedInGap[k]
                });
            }

            if (lcsItem) {
                const isLeftEmpty = this.options.ignoreWhitespace && originalLines[leftIdx].trim() === '';
                const isRightEmpty = this.options.ignoreWhitespace && modifiedLines[rightIdx].trim() === '';
                
                if (!this.options.ignoreWhitespace || (!isLeftEmpty && !isRightEmpty)) {
                    result.push({
                        type: 'unchanged',
                        left: { content: originalLines[leftIdx], lineNumber: leftIdx + 1 },
                        right: { content: modifiedLines[rightIdx], lineNumber: rightIdx + 1 }
                    });
                }
                leftIdx++;
                rightIdx++;
            }
        }

        return result;
    },

    computeLCS: function(seq1, seq2) {
        const m = seq1.length;
        const n = seq2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (seq1[i - 1] === seq2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (seq1[i - 1] === seq2[j - 1]) {
                lcs.unshift({ value: seq1[i - 1], leftIndex: i - 1, rightIndex: j - 1 });
                i--;
                j--;
            } else if (dp[i - 1][j] >= dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        return lcs;
    },

    mergeConsecutiveTokens: function(tokens) {
        if (!tokens || tokens.length === 0) return '';
        
        const result = [];
        let currentType = null;
        let currentContent = '';
        
        for (const token of tokens) {
            if (token.type === 'normal') {
                if (currentType === 'normal') {
                    currentContent += token.content;
                } else {
                    if (currentType !== null) {
                        result.push(this.wrapToken(currentType, currentContent));
                    }
                    currentType = 'normal';
                    currentContent = token.content;
                }
            } else {
                if (currentType === token.type) {
                    currentContent += token.content;
                } else {
                    if (currentType !== null) {
                        result.push(this.wrapToken(currentType, currentContent));
                    }
                    currentType = token.type;
                    currentContent = token.content;
                }
            }
        }
        
        if (currentType !== null) {
            result.push(this.wrapToken(currentType, currentContent));
        }
        
        return result.join('');
    },

    wrapToken: function(type, content) {
        switch (type) {
            case 'normal':
                return this.escapeHtml(content);
            case 'removed':
                return `<span class="char-removed">${this.escapeHtml(content)}</span>`;
            case 'added':
                return `<span class="char-added">${this.escapeHtml(content)}</span>`;
            case 'modified-old':
                return `<span class="char-modified-old">${this.escapeHtml(content)}</span>`;
            case 'modified-new':
                return `<span class="char-modified-new">${this.escapeHtml(content)}</span>`;
            default:
                return this.escapeHtml(content);
        }
    },

    charDiff: function(oldStr, newStr) {
        if (oldStr === newStr) {
            return { oldHtml: this.escapeHtml(oldStr), newHtml: this.escapeHtml(newStr) };
        }

        const oldChars = oldStr.split('');
        const newChars = newStr.split('');
        
        const m = oldChars.length;
        const n = newChars.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (oldChars[i - 1] === newChars[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        const oldTokens = [];
        const newTokens = [];
        let i = m, j = n;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && oldChars[i - 1] === newChars[j - 1]) {
                oldTokens.unshift({ type: 'normal', content: oldChars[i - 1] });
                newTokens.unshift({ type: 'normal', content: newChars[j - 1] });
                i--;
                j--;
            } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
                oldTokens.unshift({ type: 'modified-old', content: oldChars[i - 1] });
                i--;
            } else if (j > 0) {
                newTokens.unshift({ type: 'modified-new', content: newChars[j - 1] });
                j--;
            }
        }

        return { 
            oldHtml: this.mergeConsecutiveTokens(oldTokens), 
            newHtml: this.mergeConsecutiveTokens(newTokens) 
        };
    },

    escapeHtml: function(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    calculateStats: function(diff) {
        let added = 0;
        let removed = 0;
        let modified = 0;
        let unchanged = 0;

        diff.forEach(item => {
            switch (item.type) {
                case 'added': added++; break;
                case 'removed': removed++; break;
                case 'modified': modified++; break;
                case 'unchanged': unchanged++; break;
            }
        });

        const total = added + removed + modified + unchanged;
        const similarity = total > 0 
            ? ((unchanged + modified * 0.5) / total * 100).toFixed(1) 
            : '0.0';

        return { added, removed, modified, unchanged, similarity };
    },

    groupConsecutiveUnchanged: function(diff) {
        if (!this.options.showDiffOnly) {
            return diff.map(item => ({ ...item, isCollapsed: false }));
        }

        const result = [];
        let unchangedGroup = [];

        diff.forEach((item, index) => {
            if (item.type === 'unchanged') {
                unchangedGroup.push(item);
            } else {
                if (unchangedGroup.length > 0) {
                    if (unchangedGroup.length > 2) {
                        result.push({
                            type: 'collapsed',
                            lines: unchangedGroup,
                            lineCount: unchangedGroup.length,
                            isCollapsed: true,
                            startLine: unchangedGroup[0].left?.lineNumber,
                            endLine: unchangedGroup[unchangedGroup.length - 1].left?.lineNumber
                        });
                    } else {
                        result.push(...unchangedGroup.map(u => ({ ...u, isCollapsed: false })));
                    }
                    unchangedGroup = [];
                }
                result.push({ ...item, isCollapsed: false });
            }
        });

        if (unchangedGroup.length > 0) {
            if (unchangedGroup.length > 2) {
                result.push({
                    type: 'collapsed',
                    lines: unchangedGroup,
                    lineCount: unchangedGroup.length,
                    isCollapsed: true,
                    startLine: unchangedGroup[0].left?.lineNumber,
                    endLine: unchangedGroup[unchangedGroup.length - 1].left?.lineNumber
                });
            } else {
                result.push(...unchangedGroup.map(u => ({ ...u, isCollapsed: false })));
            }
        }

        return result;
    },

    renderDiff: function(diff) {
        const container = document.getElementById('diffResult');
        const groupedDiff = this.groupConsecutiveUnchanged(diff);
        
        let html = '';
        let collapseId = 0;

        groupedDiff.forEach((item) => {
            if (item.type === 'collapsed') {
                const id = collapseId++;
                html += `
                    <div class="diff-row collapsed-row" data-collapse-id="${id}">
                        <div class="collapsed-content">
                            ${item.lineCount} 行相同内容
                            <span class="collapsed-toggle">▼</span>
                        </div>
                    </div>
                `;
            } else {
                const leftContent = item.left ? item.left.content : '';
                const rightContent = item.right ? item.right.content : '';
                const leftLineNum = item.left ? item.left.lineNumber : '';
                const rightLineNum = item.right ? item.right.lineNumber : '';

                let leftHtml, rightHtml;

                if (item.type === 'modified') {
                    const charDiffResult = this.charDiff(leftContent, rightContent);
                    leftHtml = charDiffResult.oldHtml;
                    rightHtml = charDiffResult.newHtml;
                } else if (item.type === 'removed') {
                    leftHtml = `<span class="char-removed">${this.escapeHtml(leftContent)}</span>`;
                    rightHtml = '';
                } else if (item.type === 'added') {
                    leftHtml = '';
                    rightHtml = `<span class="char-added">${this.escapeHtml(rightContent)}</span>`;
                } else {
                    leftHtml = this.escapeHtml(leftContent);
                    rightHtml = this.escapeHtml(rightContent);
                }

                html += `
                    <div class="diff-row ${item.type}">
                        <div class="diff-line diff-line-left">
                            <span class="line-number">${leftLineNum}</span>${leftHtml || '&nbsp;'}
                        </div>
                        <div class="diff-line diff-line-right">
                            <span class="line-number">${rightLineNum}</span>${rightHtml || '&nbsp;'}
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;

        document.querySelectorAll('.collapsed-row').forEach(row => {
            row.addEventListener('click', () => {
                this.toggleCollapsedRow(row, groupedDiff);
            });
        });
    },

    toggleCollapsedRow: function(row, groupedDiff) {
        const collapseId = parseInt(row.dataset.collapseId);
        const collapsedItem = groupedDiff.find(item => item.type === 'collapsed');
        
        if (!collapsedItem) return;

        const isExpanded = row.classList.contains('expanded');
        
        if (isExpanded) {
            row.classList.remove('expanded');
            row.nextElementSibling?.remove();
        } else {
            row.classList.add('expanded');
            
            let expandedHtml = '';
            collapsedItem.lines.forEach(item => {
                const leftContent = item.left ? item.left.content : '';
                const rightContent = item.right ? item.right.content : '';
                const leftLineNum = item.left ? item.left.lineNumber : '';
                const rightLineNum = item.right ? item.right.lineNumber : '';

                const leftHtml = this.escapeHtml(leftContent);
                const rightHtml = this.escapeHtml(rightContent);

                expandedHtml += `
                    <div class="diff-row ${item.type}">
                        <div class="diff-line diff-line-left">
                            <span class="line-number">${leftLineNum}</span>${leftHtml || '&nbsp;'}
                        </div>
                        <div class="diff-line diff-line-right">
                            <span class="line-number">${rightLineNum}</span>${rightHtml || '&nbsp;'}
                        </div>
                    </div>
                `;
            });

            const expandedDiv = document.createElement('div');
            expandedDiv.className = 'expanded-content';
            expandedDiv.innerHTML = expandedHtml;
            row.after(expandedDiv);
        }
    },

    updateStats: function(stats) {
        document.getElementById('statsSection').classList.remove('hidden');
        document.getElementById('addedCount').textContent = stats.added;
        document.getElementById('removedCount').textContent = stats.removed;
        document.getElementById('modifiedCount').textContent = stats.modified;
        document.getElementById('similarityPercent').textContent = stats.similarity + '%';
    },

    performDiff: function() {
        const leftText = document.getElementById('textLeft').value;
        const rightText = document.getElementById('textRight').value;

        if (!leftText && !rightText) {
            alert('请输入或粘贴需要对比的文本！');
            return;
        }

        const originalLines = leftText.split('\n');
        const modifiedLines = rightText.split('\n');

        const diff = this.buildDiff(originalLines, modifiedLines);
        const stats = this.calculateStats(diff);

        this.updateStats(stats);
        this.renderDiff(diff);

        document.getElementById('resultSection').classList.remove('hidden');
        
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    clearAll: function() {
        document.getElementById('textLeft').value = '';
        document.getElementById('textRight').value = '';
        document.getElementById('statsSection').classList.add('hidden');
        document.getElementById('resultSection').classList.add('hidden');
        document.getElementById('ignoreWhitespace').checked = false;
        document.getElementById('showDiffOnly').checked = false;
        this.options.ignoreWhitespace = false;
        this.options.showDiffOnly = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    textDiffTool.init();
});
