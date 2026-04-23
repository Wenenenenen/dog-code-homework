class KanbanApp {
    constructor() {
        this.currentStatus = {
            todo: [],
            'in-progress': [],
            done: []
        };
        
        this.currentTheme = localStorage.getItem('kanban-theme') || 'light';
        this.nextId = 1;
        
        this.draggedCard = null;
        this.draggedCardClone = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.placeholder = null;
        this.editingCardId = null;
        this.newCardFormStatus = null;
        
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.animationFrameId = null;
        this.lastPlaceholderParent = null;
        this.lastPlaceholderIndex = -1;
        
        this.scrollInterval = null;
        this.scrollContainer = null;
        this.scrollDirection = 0;
        this.scrollSpeed = 5;
        
        this.init();
    }
    
    init() {
        this.applyTheme();
        this.bindEvents();
        this.loadFromStorage();
        
        if (this.isEmpty()) {
            this.resetToSampleData();
        } else {
            this.render();
        }
    }
    
    bindEvents() {
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetToSampleData();
        });
        
        document.querySelectorAll('.add-card-inline-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.currentTarget.dataset.status;
                this.showNewCardForm(status);
            });
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                
                this.checkAutoScroll(e);
                
                if (!this.animationFrameId) {
                    this.animationFrameId = requestAnimationFrame(() => {
                        this.onDragMoveOptimized();
                        this.animationFrameId = null;
                    });
                }
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            this.onDragEnd(e);
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelAllEditing();
            }
        });
        
        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });
    }
    
    checkAutoScroll(e) {
        const columns = document.querySelectorAll('.column');
        let hoveredColumn = null;
        
        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const rect = column.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                hoveredColumn = column;
                break;
            }
        }
        
        if (hoveredColumn) {
            const cardsContainer = hoveredColumn.querySelector('.cards-container');
            const containerRect = cardsContainer.getBoundingClientRect();
            
            const scrollThreshold = 40;
            const mouseY = e.clientY;
            
            let newDirection = 0;
            
            if (mouseY < containerRect.top + scrollThreshold && cardsContainer.scrollTop > 0) {
                newDirection = -1;
            } else if (mouseY > containerRect.bottom - scrollThreshold && 
                       cardsContainer.scrollTop < cardsContainer.scrollHeight - cardsContainer.clientHeight) {
                newDirection = 1;
            }
            
            if (newDirection !== 0) {
                if (!this.scrollInterval || this.scrollDirection !== newDirection) {
                    this.stopAutoScroll();
                    this.scrollDirection = newDirection;
                    this.scrollContainer = cardsContainer;
                    this.startAutoScroll();
                }
            } else {
                this.stopAutoScroll();
            }
        } else {
            this.stopAutoScroll();
        }
    }
    
    startAutoScroll() {
        if (this.scrollInterval) return;
        
        const scrollStep = () => {
            if (!this.isDragging || !this.scrollContainer) {
                this.stopAutoScroll();
                return;
            }
            
            this.scrollContainer.scrollTop += this.scrollDirection * this.scrollSpeed;
            
            this.scrollInterval = requestAnimationFrame(scrollStep);
        };
        
        this.scrollInterval = requestAnimationFrame(scrollStep);
    }
    
    stopAutoScroll() {
        if (this.scrollInterval) {
            cancelAnimationFrame(this.scrollInterval);
            this.scrollInterval = null;
        }
        this.scrollContainer = null;
        this.scrollDirection = 0;
    }
    
    handleOutsideClick(e) {
        if (this.newCardFormStatus) {
            const form = document.querySelector('.new-card-form');
            if (form && !form.contains(e.target)) {
                const addBtn = document.querySelector(`.add-card-inline-btn[data-status="${this.newCardFormStatus}"]`);
                if (addBtn && addBtn.contains(e.target)) {
                    return;
                }
                
                const textarea = form.querySelector('.new-card-textarea');
                const text = textarea ? textarea.value.trim() : '';
                
                if (text) {
                    this.confirmAddCard(form, this.newCardFormStatus);
                }
            }
        }
    }
    
    applyTheme() {
        if (this.currentTheme === 'dark') {
            document.body.classList.add('dark-theme');
            document.querySelector('.theme-icon').textContent = '☀️';
        } else {
            document.body.classList.remove('dark-theme');
            document.querySelector('.theme-icon').textContent = '🌙';
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('kanban-theme', this.currentTheme);
        this.applyTheme();
    }
    
    getAllTaskTexts(excludeCardId = null) {
        const texts = [];
        Object.values(this.currentStatus).forEach(cards => {
            cards.forEach(card => {
                if (excludeCardId === null || card.id !== excludeCardId) {
                    texts.push(card.text.trim().toLowerCase());
                }
            });
        });
        return texts;
    }
    
    isTaskDuplicate(text, excludeCardId = null) {
        const normalizedText = text.trim().toLowerCase();
        const existingTexts = this.getAllTaskTexts(excludeCardId);
        return existingTexts.includes(normalizedText);
    }
    
    showNewCardForm(status) {
        this.cancelAllEditing();
        this.newCardFormStatus = status;
        
        const column = document.querySelector(`.column[data-status="${status}"]`);
        const cardsContainer = column.querySelector('.cards-container');
        const addBtn = column.querySelector('.add-card-inline-btn');
        
        const form = document.createElement('div');
        form.className = 'new-card-form';
        form.innerHTML = `
            <textarea class="new-card-textarea" placeholder="输入任务内容..." rows="2"></textarea>
            <div class="new-card-actions">
                <button class="btn btn-primary confirm-add-btn">添加</button>
                <button class="btn btn-secondary cancel-add-btn">取消</button>
            </div>
            <div class="error-message" style="display: none;"></div>
        `;
        
        cardsContainer.insertBefore(form, cardsContainer.firstChild);
        addBtn.style.display = 'none';
        
        requestAnimationFrame(() => {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            const textarea = form.querySelector('.new-card-textarea');
            if (textarea) {
                textarea.focus();
            }
        });
        
        const textarea = form.querySelector('.new-card-textarea');
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.confirmAddCard(form, status);
            }
        });
        
        form.querySelector('.confirm-add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmAddCard(form, status);
        });
        
        form.querySelector('.cancel-add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideNewCardForm(status);
        });
    }
    
    confirmAddCard(form, status) {
        const textarea = form.querySelector('.new-card-textarea');
        const errorDiv = form.querySelector('.error-message');
        const text = textarea.value.trim();
        
        if (!text) {
            errorDiv.textContent = '任务内容不能为空';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (this.isTaskDuplicate(text)) {
            errorDiv.textContent = '已存在完全相同的任务';
            errorDiv.style.display = 'block';
            return;
        }
        
        const card = {
            id: this.nextId++,
            text: text
        };
        
        this.currentStatus[status].unshift(card);
        this.saveToStorage();
        this.hideNewCardForm(status);
        this.render();
    }
    
    hideNewCardForm(status) {
        this.newCardFormStatus = null;
        const column = document.querySelector(`.column[data-status="${status}"]`);
        const form = column.querySelector('.new-card-form');
        const addBtn = column.querySelector('.add-card-inline-btn');
        
        if (form) {
            form.remove();
        }
        if (addBtn) {
            addBtn.style.display = 'flex';
        }
    }
    
    startEditCard(cardId, status) {
        this.cancelAllEditing();
        this.editingCardId = cardId;
        
        const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
        if (!cardEl) return;
        
        const cardData = this.currentStatus[status].find(c => c.id === cardId);
        if (!cardData) return;
        
        const contentEl = cardEl.querySelector('.card-content');
        const actionsEl = cardEl.querySelector('.card-actions');
        
        contentEl.classList.add('editing');
        
        const textarea = document.createElement('textarea');
        textarea.className = 'card-textarea';
        textarea.value = cardData.text;
        textarea.dataset.id = cardId;
        textarea.dataset.status = status;
        
        cardEl.insertBefore(textarea, actionsEl);
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'card-btn save-btn';
        saveBtn.innerHTML = '✓';
        saveBtn.title = '保存';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'card-btn cancel-btn';
        cancelBtn.innerHTML = '✕';
        cancelBtn.title = '取消';
        
        const editBtn = actionsEl.querySelector('.edit-btn');
        const deleteBtn = actionsEl.querySelector('.delete-btn');
        
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        
        actionsEl.insertBefore(saveBtn, editBtn);
        actionsEl.insertBefore(cancelBtn, editBtn);
        
        textarea.focus();
        textarea.select();
        
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveEditCard(cardId, status, textarea.value);
        });
        
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelEditCard(cardId, status);
        });
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveEditCard(cardId, status, textarea.value);
            }
            if (e.key === 'Escape') {
                this.cancelEditCard(cardId, status);
            }
        });
    }
    
    saveEditCard(cardId, status, newText) {
        const trimmedText = newText.trim();
        
        if (!trimmedText) {
            alert('任务内容不能为空');
            return;
        }
        
        if (this.isTaskDuplicate(trimmedText, cardId)) {
            alert('已存在完全相同的任务');
            return;
        }
        
        const cardData = this.currentStatus[status].find(c => c.id === cardId);
        if (cardData) {
            cardData.text = trimmedText;
            this.saveToStorage();
        }
        
        this.cancelEditCard(cardId, status, true);
    }
    
    cancelEditCard(cardId, status, saved = false) {
        this.editingCardId = null;
        
        const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
        if (!cardEl) return;
        
        const textarea = cardEl.querySelector('.card-textarea');
        const contentEl = cardEl.querySelector('.card-content');
        const actionsEl = cardEl.querySelector('.card-actions');
        
        if (textarea) {
            textarea.remove();
        }
        
        contentEl.classList.remove('editing');
        
        if (saved) {
            const cardData = this.currentStatus[status].find(c => c.id === cardId);
            if (cardData) {
                contentEl.textContent = cardData.text;
            }
        }
        
        const saveBtn = actionsEl.querySelector('.save-btn');
        const cancelBtn = actionsEl.querySelector('.cancel-btn');
        const editBtn = actionsEl.querySelector('.edit-btn');
        const deleteBtn = actionsEl.querySelector('.delete-btn');
        
        if (saveBtn) saveBtn.remove();
        if (cancelBtn) cancelBtn.remove();
        if (editBtn) editBtn.style.display = 'flex';
        if (deleteBtn) deleteBtn.style.display = 'flex';
    }
    
    cancelAllEditing() {
        if (this.newCardFormStatus) {
            this.hideNewCardForm(this.newCardFormStatus);
        }
        if (this.editingCardId) {
            Object.keys(this.currentStatus).forEach(status => {
                const card = this.currentStatus[status].find(c => c.id === this.editingCardId);
                if (card) {
                    this.cancelEditCard(this.editingCardId, status);
                }
            });
        }
    }
    
    deleteCard(status, id) {
        if (confirm('确定要删除这个任务吗？')) {
            const index = this.currentStatus[status].findIndex(card => card.id === id);
            if (index > -1) {
                this.currentStatus[status].splice(index, 1);
                this.saveToStorage();
                this.render();
            }
        }
    }
    
    getCardPositions(container) {
        const positions = new Map();
        const cards = container.querySelectorAll('.card:not(.dragging)');
        cards.forEach(card => {
            const id = card.dataset.id;
            const rect = card.getBoundingClientRect();
            positions.set(id, { top: rect.top, left: rect.left });
        });
        return positions;
    }
    
    animateCards(container, oldPositions) {
        const cards = container.querySelectorAll('.card:not(.dragging)');
        
        cards.forEach(card => {
            const id = card.dataset.id;
            const oldPos = oldPositions.get(id);
            const newRect = card.getBoundingClientRect();
            
            if (oldPos && (oldPos.top !== newRect.top || oldPos.left !== newRect.left)) {
                const deltaX = oldPos.left - newRect.left;
                const deltaY = oldPos.top - newRect.top;
                
                card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                
                requestAnimationFrame(() => {
                    card.classList.add('animating');
                    card.style.transform = 'translate(0, 0)';
                });
                
                const cleanup = () => {
                    card.classList.remove('animating');
                    card.style.transform = '';
                    card.removeEventListener('transitionend', cleanup);
                };
                
                card.addEventListener('transitionend', cleanup);
            }
        });
    }
    
    onDragStart(e, cardEl) {
        if (this.editingCardId || this.newCardFormStatus) {
            return;
        }
        
        this.isDragging = true;
        this.draggedCard = cardEl;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        const rect = cardEl.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        
        this.draggedCardClone = cardEl.cloneNode(true);
        this.draggedCardClone.classList.add('dragging-visible');
        this.draggedCardClone.style.width = rect.width + 'px';
        this.draggedCardClone.style.left = (e.clientX - this.dragOffsetX) + 'px';
        this.draggedCardClone.style.top = (e.clientY - this.dragOffsetY) + 'px';
        document.body.appendChild(this.draggedCardClone);
        
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'drop-placeholder active';
        this.placeholder.style.height = rect.height + 'px';
        
        const parent = cardEl.parentNode;
        
        cardEl.classList.add('dragging');
        parent.insertBefore(this.placeholder, cardEl);
        
        this.lastPlaceholderParent = parent;
        const siblings = [...parent.querySelectorAll('.card:not(.dragging), .drop-placeholder')];
        this.lastPlaceholderIndex = siblings.indexOf(this.placeholder);
    }
    
    onDragMoveOptimized() {
        if (!this.isDragging || !this.draggedCard || !this.draggedCardClone) return;
        
        this.draggedCardClone.style.left = (this.lastMouseX - this.dragOffsetX) + 'px';
        this.draggedCardClone.style.top = (this.lastMouseY - this.dragOffsetY) + 'px';
        
        const columns = document.querySelectorAll('.column');
        let targetColumn = null;
        let minDistance = Infinity;
        
        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const rect = column.getBoundingClientRect();
            if (this.lastMouseX >= rect.left && this.lastMouseX <= rect.right &&
                this.lastMouseY >= rect.top && this.lastMouseY <= rect.bottom) {
                const distance = Math.abs(this.lastMouseX - (rect.left + rect.width / 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    targetColumn = column;
                }
            }
        }
        
        columns.forEach(col => col.classList.remove('drag-over'));
        
        if (targetColumn) {
            targetColumn.classList.add('drag-over');
            
            const cardsContainer = targetColumn.querySelector('.cards-container');
            const cards = [...cardsContainer.querySelectorAll('.card:not(.dragging)')];
            
            let targetIndex = cards.length;
            
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const rect = card.getBoundingClientRect();
                const cardCenterY = rect.top + rect.height / 2;
                
                if (this.lastMouseY < cardCenterY) {
                    targetIndex = i;
                    break;
                }
            }
            
            const currentSiblings = [...cardsContainer.querySelectorAll('.card:not(.dragging), .drop-placeholder')];
            const currentIndex = currentSiblings.indexOf(this.placeholder);
            
            if (currentIndex !== targetIndex || this.lastPlaceholderParent !== cardsContainer) {
                const oldPositions = this.getCardPositions(cardsContainer);
                
                if (targetIndex >= cards.length) {
                    cardsContainer.appendChild(this.placeholder);
                } else {
                    cardsContainer.insertBefore(this.placeholder, cards[targetIndex]);
                }
                
                this.animateCards(cardsContainer, oldPositions);
                
                this.lastPlaceholderParent = cardsContainer;
                this.lastPlaceholderIndex = targetIndex;
            }
        }
    }
    
    onDragEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        this.stopAutoScroll();
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (!this.draggedCard || !this.draggedCardClone) return;
        
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.insertBefore(this.draggedCard, this.placeholder);
        }
        
        if (this.placeholder) {
            this.placeholder.remove();
            this.placeholder = null;
        }
        
        if (this.draggedCardClone) {
            this.draggedCardClone.remove();
            this.draggedCardClone = null;
        }
        
        if (this.draggedCard) {
            this.draggedCard.classList.remove('dragging');
        }
        
        document.querySelectorAll('.column').forEach(col => {
            col.classList.remove('drag-over');
        });
        
        this.syncDOMToData();
        this.saveToStorage();
        
        this.draggedCard = null;
        this.lastPlaceholderParent = null;
        this.lastPlaceholderIndex = -1;
        this.render();
    }
    
    syncDOMToData() {
        const newStatus = {
            todo: [],
            'in-progress': [],
            done: []
        };
        
        document.querySelectorAll('.column').forEach(column => {
            const status = column.dataset.status;
            const cards = column.querySelectorAll('.card');
            
            cards.forEach(card => {
                const cardId = parseInt(card.dataset.id);
                const cardText = card.querySelector('.card-content').textContent;
                
                newStatus[status].push({
                    id: cardId,
                    text: cardText
                });
                
                card.dataset.status = status;
            });
        });
        
        this.currentStatus = newStatus;
    }
    
    createCardElement(card, status) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.id = card.id;
        cardEl.dataset.status = status;
        
        const content = document.createElement('div');
        content.className = 'card-content';
        content.textContent = card.text;
        
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'card-btn edit-btn';
        editBtn.innerHTML = '✎';
        editBtn.title = '编辑';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startEditCard(card.id, status);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-btn delete-btn';
        deleteBtn.innerHTML = '🗑';
        deleteBtn.title = '删除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteCard(status, card.id);
        });
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        cardEl.appendChild(content);
        cardEl.appendChild(actions);
        
        cardEl.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || 
                this.editingCardId || this.newCardFormStatus) {
                return;
            }
            e.preventDefault();
            this.onDragStart(e, cardEl);
        });
        
        return cardEl;
    }
    
    render() {
        Object.keys(this.currentStatus).forEach(status => {
            const container = document.querySelector(`.cards-container[data-status="${status}"]`);
            const form = container.querySelector('.new-card-form');
            
            container.innerHTML = '';
            
            if (form && this.newCardFormStatus === status) {
                container.appendChild(form);
            }
            
            this.currentStatus[status].forEach(card => {
                const cardEl = this.createCardElement(card, status);
                container.appendChild(cardEl);
            });
            
            const addBtn = document.querySelector(`.add-card-inline-btn[data-status="${status}"]`);
            if (addBtn) {
                addBtn.style.display = 'flex';
            }
        });
    }
    
    isEmpty() {
        return Object.values(this.currentStatus).every(arr => arr.length === 0);
    }
    
    resetToSampleData() {
        const sampleData = {
            todo: [
                { id: 1, text: '设计用户界面原型' },
                { id: 2, text: '编写API接口文档' },
                { id: 3, text: '准备测试数据' }
            ],
            'in-progress': [
                { id: 4, text: '实现用户登录功能' },
                { id: 5, text: '优化数据库查询性能' }
            ],
            done: [
                { id: 6, text: '搭建项目框架' },
                { id: 7, text: '配置开发环境' },
                { id: 8, text: '编写项目初始化文档' }
            ]
        };
        
        this.currentStatus = JSON.parse(JSON.stringify(sampleData));
        this.nextId = 9;
        this.saveToStorage();
        this.render();
    }
    
    saveToStorage() {
        localStorage.setItem('kanban-data', JSON.stringify({
            status: this.currentStatus,
            nextId: this.nextId
        }));
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem('kanban-data');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.currentStatus = data.status || this.currentStatus;
                this.nextId = data.nextId || 1;
            } catch (e) {
                console.error('Failed to load kanban data:', e);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new KanbanApp();
});