const parkPatrol = {
    patrolPoints: [],
    selectedPoints: {
        start: null,
        end: null,
        mustPass: []
    },
    currentRoute: [],
    mapScale: 1,
    hasManuallyAdjusted: false,

    init: function() {
        this.initializePatrolPoints();
        this.renderMap();
        this.renderPatrolPointsList();
        this.bindEvents();
    },

    initializePatrolPoints: function() {
        this.patrolPoints = [
            { id: 'gate', name: '大门', x: 80, y: 60, type: 'entrance', riskLevel: 'normal', description: '园区主入口' },
            { id: 'warehouse1', name: '仓库A', x: 200, y: 80, type: 'warehouse', riskLevel: 'high', description: '存放贵重物品' },
            { id: 'warehouse2', name: '仓库B', x: 350, y: 100, type: 'warehouse', riskLevel: 'high', description: '存放易燃物品' },
            { id: 'office', name: '办公楼', x: 500, y: 120, type: 'office', riskLevel: 'normal', description: '行政办公楼' },
            { id: 'parking', name: '停车场', x: 150, y: 200, type: 'parking', riskLevel: 'high', description: '地下停车场入口' },
            { id: 'blind1', name: '监控盲区1', x: 400, y: 200, type: 'blind', riskLevel: 'high', description: '围墙转角监控盲区' },
            { id: 'blind2', name: '监控盲区2', x: 300, y: 320, type: 'blind', riskLevel: 'high', description: '绿化带后监控盲区' },
            { id: 'wall1', name: '北围墙', x: 520, y: 50, type: 'wall', riskLevel: 'normal', description: '北侧围墙区域' },
            { id: 'wall2', name: '东围墙', x: 550, y: 250, type: 'wall', riskLevel: 'normal', description: '东侧围墙区域' },
            { id: 'wall3', name: '南围墙', x: 100, y: 350, type: 'wall', riskLevel: 'normal', description: '南侧围墙区域' },
            { id: 'wall4', name: '西围墙', x: 50, y: 200, type: 'wall', riskLevel: 'normal', description: '西侧围墙区域' }
        ];
    },

    renderMap: function() {
        const svg = document.getElementById('parkMap');
        
        const elementsToRemove = svg.querySelectorAll('.patrol-point-group, .building, .route-line, .route-arrow');
        elementsToRemove.forEach(el => el.remove());

        this.renderBuildings(svg);
        this.renderPatrolPoints(svg);
        
        if (this.currentRoute.length > 0) {
            this.renderRoute(svg);
        }
    },

    renderBuildings: function(svg) {
        const buildings = [
            { x: 150, y: 50, width: 100, height: 80, label: '仓库区', fill: '#E8F4FD' },
            { x: 320, y: 70, width: 120, height: 90, label: '办公楼', fill: '#FFF3E0' },
            { x: 100, y: 160, width: 130, height: 90, label: '停车场', fill: '#F3E5F5' },
            { x: 350, y: 250, width: 100, height: 80, label: '绿化带', fill: '#E8F5E9' }
        ];

        buildings.forEach(building => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.classList.add('building');

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', building.x);
            rect.setAttribute('y', building.y);
            rect.setAttribute('width', building.width);
            rect.setAttribute('height', building.height);
            rect.setAttribute('fill', building.fill);
            rect.setAttribute('stroke', '#90CAF9');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('rx', '4');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', building.x + building.width / 2);
            text.setAttribute('y', building.y + building.height / 2 + 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#666');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', '600');
            text.textContent = building.label;

            g.appendChild(rect);
            g.appendChild(text);
            svg.appendChild(g);
        });
    },

    renderPatrolPoints: function(svg) {
        const mapLeft = 20;
        const mapRight = 580;
        const mapTop = 20;
        const mapBottom = 380;
        const margin = 25;

        this.patrolPoints.forEach(point => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.classList.add('patrol-point-group');
            g.setAttribute('data-id', point.id);

            const color = this.getPointColor(point);
            const radius = this.getPointRadius(point);
            const isStart = this.selectedPoints.start === point.id;
            const isEnd = this.selectedPoints.end === point.id;
            const isSameStartEnd = isStart && isEnd;
            const isMustPass = this.selectedPoints.mustPass.includes(point.id);

            const circleTop = point.y - radius;
            const circleBottom = point.y + radius;
            const circleLeft = point.x - radius;
            const circleRight = point.x + radius;

            const hasSpaceAbove = circleTop - margin > mapTop;
            const hasSpaceBelow = circleBottom + margin < mapBottom;
            const hasSpaceLeft = circleLeft - margin > mapLeft;
            const hasSpaceRight = circleRight + margin < mapRight;

            const placeMarkersBelow = !hasSpaceAbove && hasSpaceBelow;
            const placeMarkersAbove = !hasSpaceBelow && hasSpaceAbove;
            const placeMarkersDefault = hasSpaceAbove && hasSpaceBelow;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', '#333');
            circle.setAttribute('stroke-width', '2');
            circle.classList.add('patrol-point');

            let nameLabelY;
            let nameLabelAnchor = 'middle';
            let nameLabelX = point.x;

            let statusMarkerY;
            let mustPassMarkerY;

            if (placeMarkersBelow) {
                statusMarkerY = circleBottom + 12;
                mustPassMarkerY = circleBottom + 27;
                nameLabelY = circleBottom + 42;
            } else if (placeMarkersAbove) {
                statusMarkerY = circleTop - 12;
                mustPassMarkerY = circleTop - 27;
                nameLabelY = circleTop - 42;
            } else {
                statusMarkerY = circleTop - 12;
                mustPassMarkerY = circleTop - 27;
                nameLabelY = circleBottom + 15;
            }

            if (isSameStartEnd) {
                const marker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                marker.setAttribute('y', statusMarkerY);
                marker.setAttribute('x', point.x);
                marker.setAttribute('text-anchor', 'middle');
                marker.setAttribute('fill', '#FF9800');
                marker.setAttribute('font-size', '12');
                marker.setAttribute('font-weight', '700');
                marker.textContent = '起终点';
                g.appendChild(marker);
            } else {
                if (isStart) {
                    const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    startMarker.setAttribute('y', statusMarkerY);
                    startMarker.setAttribute('x', point.x);
                    startMarker.setAttribute('text-anchor', 'middle');
                    startMarker.setAttribute('fill', '#4CAF50');
                    startMarker.setAttribute('font-size', '14');
                    startMarker.setAttribute('font-weight', '700');
                    startMarker.textContent = '起点';
                    g.appendChild(startMarker);
                }

                if (isEnd) {
                    const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    if (isStart) {
                        endMarker.setAttribute('y', statusMarkerY + 15);
                    } else {
                        endMarker.setAttribute('y', statusMarkerY);
                    }
                    endMarker.setAttribute('x', point.x);
                    endMarker.setAttribute('text-anchor', 'middle');
                    endMarker.setAttribute('fill', '#FF5722');
                    endMarker.setAttribute('font-size', '14');
                    endMarker.setAttribute('font-weight', '700');
                    endMarker.textContent = '终点';
                    g.appendChild(endMarker);
                }
            }

            if (isMustPass) {
                const mustPassMarker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                mustPassMarker.setAttribute('x', point.x);
                mustPassMarker.setAttribute('y', mustPassMarkerY);
                mustPassMarker.setAttribute('text-anchor', 'middle');
                mustPassMarker.setAttribute('fill', '#9C27B0');
                mustPassMarker.setAttribute('font-size', '11');
                mustPassMarker.setAttribute('font-weight', '700');
                mustPassMarker.textContent = '必过';
                g.appendChild(mustPassMarker);
            }

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', nameLabelX);
            text.setAttribute('y', nameLabelY);
            text.setAttribute('text-anchor', nameLabelAnchor);
            text.setAttribute('fill', '#333');
            text.setAttribute('font-size', '11');
            text.setAttribute('font-weight', '600');
            text.classList.add('patrol-point-label');
            text.textContent = point.name;

            g.appendChild(circle);
            g.appendChild(text);

            g.addEventListener('click', () => this.handlePointClick(point.id));

            svg.appendChild(g);
        });
    },

    getPointColor: function(point) {
        const isStart = this.selectedPoints.start === point.id;
        const isEnd = this.selectedPoints.end === point.id;
        
        if (isStart && isEnd) {
            return '#FF9800';
        }
        if (isStart) {
            return '#4CAF50';
        }
        if (isEnd) {
            return '#FF5722';
        }
        if (this.selectedPoints.mustPass.includes(point.id)) {
            return '#9C27B0';
        }
        if (point.riskLevel === 'high') {
            return '#F44336';
        }
        return '#2196F3';
    },

    getPointRadius: function(point) {
        const baseRadius = 18;
        if (this.selectedPoints.start === point.id || 
            this.selectedPoints.end === point.id || 
            this.selectedPoints.mustPass.includes(point.id)) {
            return baseRadius + 4;
        }
        return baseRadius;
    },

    handlePointClick: function(pointId) {
        this.showPointMenu(pointId);
    },

    showPointMenu: function(pointId) {
        const point = this.patrolPoints.find(p => p.id === pointId);
        if (!point) return;

        const isStart = this.selectedPoints.start === pointId;
        const isEnd = this.selectedPoints.end === pointId;
        const isMustPass = this.selectedPoints.mustPass.includes(pointId);

        const options = [
            { label: isStart ? '取消起点' : '设为起点', action: 'start' },
            { label: isEnd ? '取消终点' : '设为终点', action: 'end' },
            { label: isMustPass ? '取消必过' : '设为必过点', action: 'mustPass' }
        ];

        const menuText = `当前选择：${point.name} (${point.riskLevel === 'high' ? '高风险' : '普通风险'})\n\n请选择操作：\n` +
            options.map((opt, idx) => `${idx + 1}. ${opt.label}`).join('\n') +
            `\n\n请输入数字选择操作，或点击取消关闭。`;

        const result = prompt(menuText);
        if (result === null) return;

        const choice = parseInt(result) - 1;
        if (choice >= 0 && choice < options.length) {
            this.togglePointSelection(pointId, options[choice].action);
        }
    },

    togglePointSelection: function(pointId, type) {
        const point = this.patrolPoints.find(p => p.id === pointId);
        
        switch (type) {
            case 'start':
                if (this.selectedPoints.start === pointId) {
                    this.selectedPoints.start = null;
                } else {
                    if (this.selectedPoints.mustPass.includes(pointId)) {
                        this.selectedPoints.mustPass = this.selectedPoints.mustPass.filter(id => id !== pointId);
                    }
                    this.selectedPoints.start = pointId;
                }
                break;
            case 'end':
                if (this.selectedPoints.end === pointId) {
                    this.selectedPoints.end = null;
                } else {
                    if (this.selectedPoints.mustPass.includes(pointId)) {
                        this.selectedPoints.mustPass = this.selectedPoints.mustPass.filter(id => id !== pointId);
                    }
                    this.selectedPoints.end = pointId;
                }
                break;
            case 'mustPass':
                if (this.selectedPoints.mustPass.includes(pointId)) {
                    this.selectedPoints.mustPass = this.selectedPoints.mustPass.filter(id => id !== pointId);
                } else {
                    if (this.selectedPoints.start === pointId) {
                        alert(`"${point.name}" 已被设置为起点，不能同时设置为必过点！`);
                        return;
                    }
                    if (this.selectedPoints.end === pointId) {
                        alert(`"${point.name}" 已被设置为终点，不能同时设置为必过点！`);
                        return;
                    }
                    this.selectedPoints.mustPass.push(pointId);
                }
                break;
        }
        this.renderMap();
        this.renderPatrolPointsList();
        this.clearRouteDisplay();
    },

    renderPatrolPointsList: function() {
        const container = document.getElementById('patrolPointsList');
        container.innerHTML = '';

        this.patrolPoints.forEach(point => {
            const isStart = this.selectedPoints.start === point.id;
            const isEnd = this.selectedPoints.end === point.id;
            const isMustPass = this.selectedPoints.mustPass.includes(point.id);

            const item = document.createElement('div');
            item.className = `patrol-point-item ${point.riskLevel === 'high' ? 'high-risk' : ''}`;
            item.innerHTML = `
                <div class="patrol-point-info">
                    <div class="patrol-point-name">${point.name}</div>
                    <div class="patrol-point-type">
                        ${this.getPointTypeLabel(point.type)}
                        <span class="risk-badge ${point.riskLevel}">${point.riskLevel === 'high' ? '高风险' : '普通'}</span>
                    </div>
                </div>
                <div class="patrol-point-selectors">
                    <button class="selector-btn start ${isStart ? 'active' : ''}" data-id="${point.id}" data-type="start" title="设为起点">起</button>
                    <button class="selector-btn end ${isEnd ? 'active' : ''}" data-id="${point.id}" data-type="end" title="设为终点">终</button>
                    <button class="selector-btn must-pass ${isMustPass ? 'active' : ''}" data-id="${point.id}" data-type="mustPass" title="设为必过点">必</button>
                </div>
            `;

            container.appendChild(item);
        });

        this.bindListButtonEvents();
    },

    getPointTypeLabel: function(type) {
        const labels = {
            'entrance': '出入口',
            'warehouse': '仓库',
            'office': '办公楼',
            'parking': '停车场',
            'blind': '监控盲区',
            'wall': '围墙区域'
        };
        return labels[type] || type;
    },

    bindListButtonEvents: function() {
        const buttons = document.querySelectorAll('.selector-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pointId = btn.getAttribute('data-id');
                const type = btn.getAttribute('data-type');
                this.togglePointSelection(pointId, type);
            });
        });
    },

    bindEvents: function() {
        document.getElementById('generateRoute').addEventListener('click', () => this.generateRoute());
        document.getElementById('clearRoute').addEventListener('click', () => this.clearRoute());
        document.getElementById('resetAll').addEventListener('click', () => this.resetAll());
    },

    generateRoute: function() {
        if (!this.selectedPoints.start) {
            alert('请先设置起点！');
            return;
        }

        if (this.hasManuallyAdjusted && this.currentRoute.length > 0) {
            if (!confirm('您已手动调整过路线顺序。点击"确定"将重新生成算法路线，覆盖当前的手动调整。是否继续？')) {
                return;
            }
        }

        const startPointId = this.selectedPoints.start;
        const endPointId = this.selectedPoints.end;
        const isSameStartEnd = startPointId === endPointId;

        const startPoint = this.patrolPoints.find(p => p.id === startPointId);

        const middlePointsToVisit = [
            ...this.selectedPoints.mustPass,
            ...this.patrolPoints.filter(p => {
                const isHighRisk = p.riskLevel === 'high';
                const isNotStart = p.id !== startPointId;
                const isNotEnd = !endPointId || p.id !== endPointId;
                const isNotMustPass = !this.selectedPoints.mustPass.includes(p.id);
                return isHighRisk && isNotStart && isNotEnd && isNotMustPass;
            }).map(p => p.id)
        ];

        const uniqueMiddlePoints = [...new Set(middlePointsToVisit)];

        if (uniqueMiddlePoints.length === 0) {
            const route = [startPointId];
            if (endPointId && !isSameStartEnd) {
                route.push(endPointId);
            } else if (isSameStartEnd && route.length > 1) {
                route.push(endPointId);
            }
            this.currentRoute = route.map(id => this.patrolPoints.find(p => p.id === id)).filter(Boolean);
            this.hasManuallyAdjusted = false;
            this.renderMap();
            this.displayRouteInfo();
            this.renderRouteOrderList();
            return;
        }

        const middlePoints = uniqueMiddlePoints.map(id => {
            const point = this.patrolPoints.find(p => p.id === id);
            return {
                point: point,
                isHighPriority: point.riskLevel === 'high' || this.selectedPoints.mustPass.includes(point.id)
            };
        });

        const route = [startPointId];
        const remainingPoints = [...middlePoints];
        let currentPoint = startPoint;
        let prevPoint = startPoint;

        while (remainingPoints.length > 0) {
            let bestPoint = null;
            let bestScore = Infinity;

            remainingPoints.forEach((item, index) => {
                const point = item.point;
                const isHighPriority = item.isHighPriority;

                const distance = this.calculateDistance(currentPoint.id, point.id);

                let directionPenalty = 1.0;
                if (route.length > 1) {
                    const dx1 = currentPoint.x - prevPoint.x;
                    const dy1 = currentPoint.y - prevPoint.y;
                    const dx2 = point.x - currentPoint.x;
                    const dy2 = point.y - currentPoint.y;
                    
                    const cross = dx1 * dy2 - dy1 * dx2;
                    const dot = dx1 * dx2 + dy1 * dy2;
                    const angle = Math.atan2(cross, dot);
                    
                    if (angle < 0) {
                        directionPenalty = 1.5;
                    } else if (angle > Math.PI / 2) {
                        directionPenalty = 1.2;
                    }
                }

                let priorityBonus = 1.0;
                if (isHighPriority) {
                    priorityBonus = 0.8;
                }

                const score = distance * directionPenalty * priorityBonus;

                if (score < bestScore) {
                    bestScore = score;
                    bestPoint = { item, index };
                }
            });

            if (bestPoint) {
                const nextPoint = bestPoint.item.point;
                route.push(nextPoint.id);
                remainingPoints.splice(bestPoint.index, 1);
                prevPoint = currentPoint;
                currentPoint = nextPoint;
            } else {
                break;
            }
        }

        if (endPointId && !isSameStartEnd) {
            route.push(endPointId);
        } else if (isSameStartEnd && route.length > 1) {
            route.push(endPointId);
        }

        this.currentRoute = route.map(id => this.patrolPoints.find(p => p.id === id)).filter(Boolean);
        this.hasManuallyAdjusted = false;
        this.renderMap();
        this.displayRouteInfo();
        this.renderRouteOrderList();
    },

    calculateDistance: function(pointId1, pointId2) {
        const point1 = this.patrolPoints.find(p => p.id === pointId1);
        const point2 = this.patrolPoints.find(p => p.id === pointId2);
        
        if (!point1 || !point2) return Infinity;

        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);

        const realDistance = pixelDistance * 5;
        return realDistance;
    },

    renderRoute: function(svg) {
        if (this.currentRoute.length < 2) return;

        let pathD = '';
        for (let i = 0; i < this.currentRoute.length; i++) {
            const point = this.currentRoute[i];
            if (i === 0) {
                pathD += `M ${point.x} ${point.y}`;
            } else {
                pathD += ` L ${point.x} ${point.y}`;
            }
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.classList.add('route-line');

        svg.appendChild(path);

        for (let i = 1; i < this.currentRoute.length; i++) {
            const prevPoint = this.currentRoute[i - 1];
            const currPoint = this.currentRoute[i];
            
            const midX = (prevPoint.x + currPoint.x) / 2;
            const midY = (prevPoint.y + currPoint.y) / 2;
            
            const angle = Math.atan2(currPoint.y - prevPoint.y, currPoint.x - prevPoint.x);
            
            const arrowSize = 8;
            const arrow1X = midX - arrowSize * Math.cos(angle - Math.PI / 6);
            const arrow1Y = midY - arrowSize * Math.sin(angle - Math.PI / 6);
            const arrow2X = midX - arrowSize * Math.cos(angle + Math.PI / 6);
            const arrow2Y = midY - arrowSize * Math.sin(angle + Math.PI / 6);
            
            const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            arrowLine.setAttribute('x1', midX);
            arrowLine.setAttribute('y1', midY);
            arrowLine.setAttribute('x2', arrow1X);
            arrowLine.setAttribute('y2', arrow1Y);
            arrowLine.setAttribute('stroke', '#ff6b6b');
            arrowLine.setAttribute('stroke-width', '2');
            arrowLine.classList.add('route-arrow');
            
            const arrowLine2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            arrowLine2.setAttribute('x1', midX);
            arrowLine2.setAttribute('y1', midY);
            arrowLine2.setAttribute('x2', arrow2X);
            arrowLine2.setAttribute('y2', arrow2Y);
            arrowLine2.setAttribute('stroke', '#ff6b6b');
            arrowLine2.setAttribute('stroke-width', '2');
            arrowLine2.classList.add('route-arrow');

            svg.appendChild(arrowLine);
            svg.appendChild(arrowLine2);
        }
    },

    displayRouteInfo: function() {
        if (this.currentRoute.length < 2) {
            return;
        }

        let totalDistance = 0;
        let highRiskCount = 0;

        for (let i = 1; i < this.currentRoute.length; i++) {
            const distance = this.calculateDistance(this.currentRoute[i - 1].id, this.currentRoute[i].id);
            totalDistance += distance;
        }

        this.currentRoute.forEach(point => {
            if (point.riskLevel === 'high') {
                highRiskCount++;
            }
        });

        const walkingSpeed = 80;
        const estimatedTime = Math.ceil(totalDistance / walkingSpeed);

        document.getElementById('totalDistance').textContent = Math.round(totalDistance);
        document.getElementById('estimatedTime').textContent = estimatedTime;
        document.getElementById('riskPointCount').textContent = highRiskCount;
    },

    renderRouteOrderList: function() {
        const container = document.getElementById('routeOrderList');
        
        if (this.currentRoute.length === 0) {
            container.innerHTML = '<p class="empty-hint">请先生成路线</p>';
            return;
        }

        container.innerHTML = '';

        this.currentRoute.forEach((point, index) => {
            const item = document.createElement('div');
            item.className = 'route-order-item';
            item.setAttribute('data-index', index);
            item.setAttribute('draggable', 'true');
            
            item.innerHTML = `
                <div class="route-order-info">
                    <span class="route-order-number">${index + 1}</span>
                    <span class="route-order-name">${point.name}</span>
                    <span class="risk-badge ${point.riskLevel}">${point.riskLevel === 'high' ? '高风险' : '普通'}</span>
                </div>
                <div class="route-order-actions">
                    ${index > 0 && index < this.currentRoute.length - 1 ? 
                        `<button class="remove-btn" data-index="${index}">移除</button>` : ''}
                </div>
            `;

            item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e, index));
            item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            item.addEventListener('dragleave', (e) => this.handleDragLeave(e));

            container.appendChild(item);
        });

        this.bindRemoveButtons();
    },

    bindRemoveButtons: function() {
        const removeButtons = document.querySelectorAll('.remove-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                if (confirm(`确定要移除"${this.currentRoute[index].name}"吗？`)) {
                    this.currentRoute.splice(index, 1);
                    this.hasManuallyAdjusted = true;
                    this.renderMap();
                    this.displayRouteInfo();
                    this.renderRouteOrderList();
                }
            });
        });
    },

    draggedIndex: null,

    handleDragStart: function(e, index) {
        this.draggedIndex = index;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    },

    handleDragEnd: function(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.route-order-item').forEach(item => {
            item.classList.remove('drag-over');
        });
        this.draggedIndex = null;
    },

    handleDragOver: function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    handleDragEnter: function(e) {
        e.target.closest('.route-order-item')?.classList.add('drag-over');
    },

    handleDragLeave: function(e) {
        e.target.closest('.route-order-item')?.classList.remove('drag-over');
    },

    handleDrop: function(e, targetIndex) {
        e.preventDefault();
        e.target.closest('.route-order-item')?.classList.remove('drag-over');

        if (this.draggedIndex === null || this.draggedIndex === targetIndex) {
            return;
        }

        if (targetIndex === 0 || targetIndex === this.currentRoute.length - 1) {
            alert('起点和终点不能移动位置！');
            return;
        }

        if (this.draggedIndex === 0 || this.draggedIndex === this.currentRoute.length - 1) {
            alert('起点和终点不能移动位置！');
            return;
        }

        const [movedItem] = this.currentRoute.splice(this.draggedIndex, 1);
        this.currentRoute.splice(targetIndex, 0, movedItem);
        this.hasManuallyAdjusted = true;

        this.renderMap();
        this.displayRouteInfo();
        this.renderRouteOrderList();
    },

    clearRoute: function() {
        this.currentRoute = [];
        this.renderMap();
        this.clearRouteDisplay();
    },

    clearRouteDisplay: function() {
        document.getElementById('totalDistance').textContent = '-';
        document.getElementById('estimatedTime').textContent = '-';
        document.getElementById('riskPointCount').textContent = '-';
        document.getElementById('routeOrderList').innerHTML = '<p class="empty-hint">请先生成路线</p>';
    },

    resetAll: function() {
        if (confirm('确定要重置所有选择吗？这将清除起点、终点和所有必过点的设置。')) {
            this.selectedPoints = {
                start: null,
                end: null,
                mustPass: []
            };
            this.currentRoute = [];
            this.renderMap();
            this.renderPatrolPointsList();
            this.clearRouteDisplay();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    parkPatrol.init();
});
