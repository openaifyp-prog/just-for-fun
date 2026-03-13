/* ============================================
   2048 ELITE — Core Engine (FIXED)
   Logic, Animations, and Layout Alignment
   ============================================ */

'use strict';

class Game2048 {
    constructor() {
        this.board = Array(16).fill(null);
        this.score = 0;
        this.best = parseInt(localStorage.getItem('2048elite-best')) || 0;
        this.prevStates = [];
        
        this.boardEl = document.getElementById('board');
        this.tileContainer = document.getElementById('tile-container');
        this.scoreValEl = document.getElementById('score-val');
        this.bestValEl = document.getElementById('best-val');
        this.scoreAdditionEl = document.getElementById('score-addition');
        
        this.init();
    }

    init() {
        this.bestValEl.textContent = this.best;
        this.bindEvents();
        this.newGame();
    }

    newGame() {
        this.board = Array(16).fill(null);
        this.score = 0;
        this.updateScore(0);
        this.tileContainer.innerHTML = '';
        this.prevStates = [];
        
        this.addRandomTile();
        this.addRandomTile();
        
        document.getElementById('game-over').classList.remove('visible');
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
                e.preventDefault();
                switch(e.key) {
                    case 'ArrowUp': case 'w': this.move('up'); break;
                    case 'ArrowDown': case 's': this.move('down'); break;
                    case 'ArrowLeft': case 'a': this.move('left'); break;
                    case 'ArrowRight': case 'd': this.move('right'); break;
                }
            }
        });

        document.getElementById('btn-new').onclick = () => this.newGame();
        document.getElementById('btn-restart').onclick = () => this.newGame();
        document.getElementById('btn-undo').onclick = () => this.undo();

        // Touch handling
        let touchStart = null;
        this.boardEl.addEventListener('touchstart', (e) => {
            touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: false });

        this.boardEl.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        this.boardEl.addEventListener('touchend', (e) => {
            if (!touchStart) return;
            const deltaX = e.changedTouches[0].clientX - touchStart.x;
            const deltaY = e.changedTouches[0].clientY - touchStart.y;
            
            if (Math.abs(deltaX) > 40 || Math.abs(deltaY) > 40) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    this.move(deltaX > 0 ? 'right' : 'left');
                } else {
                    this.move(deltaY > 0 ? 'down' : 'up');
                }
            }
            touchStart = null;
        });
    }

    addRandomTile() {
        const empties = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        if (empties.length === 0) return;
        
        const idx = empties[Math.floor(Math.random() * empties.length)];
        const val = Math.random() < 0.9 ? 2 : 4;
        this.board[idx] = { val, id: Date.now() + Math.random(), isNew: true };
        
        this.renderAll();
        
        const tile = this.board[idx];
        setTimeout(() => { if (tile) { delete tile.isNew; this.renderAll(); } }, 300);
    }

    renderTile(idx, tile) {
        const x = idx % 4;
        const y = Math.floor(idx / 4);
        const gap = 12;
        
        let el = document.getElementById(`tile-${tile.id}`);
        if (!el) {
            el = document.createElement('div');
            el.id = `tile-${tile.id}`;
            el.innerHTML = '<div class="tile-inner"></div>';
            // Set position BEFORE adding to DOM to prevent sliding from 0,0
            el.style.transform = `translate(calc(${x * 100}% + ${x * gap}px), calc(${y * 100}% + ${y * gap}px))`;
            this.tileContainer.appendChild(el);
        }
        
        // Update styling
        el.className = `tile tile-${tile.val}`;
        if (tile.isNew) el.classList.add('tile-new');
        if (tile.merged) el.classList.add('tile-merged');
        
        el.querySelector('.tile-inner').textContent = tile.val;
        
        // Final position (allows sliding for existing tiles)
        el.style.transform = `translate(calc(${x * 100}% + ${x * gap}px), calc(${y * 100}% + ${y * gap}px))`;
    }

    move(direction) {
        this.saveState();
        let moved = false;
        let earned = 0;

        let grid = this.getGrid();
        
        const rotations = { 'left': 0, 'down': 1, 'right': 2, 'up': 3 };
        const rotCount = rotations[direction];
        
        for (let i = 0; i < rotCount; i++) grid = this.rotate(grid);

        for (let r = 0; r < 4; r++) {
            const row = grid[r].filter(v => v !== null);
            const newRow = [];
            
            for (let c = 0; c < row.length; c++) {
                if (c < row.length - 1 && row[c].val === row[c + 1].val) {
                    const combined = { val: row[c].val * 2, id: row[c+1].id, merged: true };
                    newRow.push(combined);
                    earned += combined.val;
                    c++;
                    moved = true;
                } else {
                    newRow.push(row[c]);
                }
            }
            while (newRow.length < 4) newRow.push(null);
            
            if (JSON.stringify(newRow.map(v => v?.val)) !== JSON.stringify(grid[r].map(v => v?.val))) {
                moved = true;
            }
            grid[r] = newRow;
        }

        for (let i = 0; i < (4 - rotCount) % 4; i++) grid = this.rotate(grid);
        this.board = grid.flat();

        if (moved) {
            this.updateScore(earned);
            this.renderAll();
            this.tiltBoard(direction);
            
            // Allow merge animation (250ms) to complete partially before spawning new tile
            // This prevents the 'glitchy' overlapping pop
            setTimeout(() => this.addRandomTile(), 200);
            
            // Clean up merged flags after they've had time to pulse
            this.board.forEach(t => {
                if (t && t.merged) setTimeout(() => delete t.merged, 300);
            });

            if (this.isGameOver()) setTimeout(() => this.showGameOver(), 1000);
        }
    }

    rotate(grid) {
        const newGrid = Array(4).fill(0).map(() => Array(4).fill(null));
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                newGrid[c][3 - r] = grid[r][c];
            }
        }
        return newGrid;
    }

    renderAll() {
        // Build map of current board IDs
        const currentIds = this.board.filter(v => v !== null).map(v => `tile-${v.id}`);
        
        // Remove old tiles
        Array.from(this.tileContainer.children).forEach(el => {
            if (!currentIds.includes(el.id)) el.remove();
        });

        // Render existing/new tiles
        this.board.forEach((tile, i) => {
            if (tile) this.renderTile(i, tile);
        });
    }

    tiltBoard(dir) {
        let x = 0, y = 0;
        if (dir === 'up') x = 6;
        if (dir === 'down') x = -6;
        if (dir === 'left') y = -6;
        if (dir === 'right') y = 6;
        this.boardEl.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
        setTimeout(() => this.boardEl.style.transform = 'rotateX(0deg) rotateY(0deg)', 150);
    }

    updateScore(add) {
        this.score += add;
        this.scoreValEl.textContent = this.score;
        if (this.score > this.best) {
            this.best = this.score;
            this.bestValEl.textContent = this.best;
            localStorage.setItem('2048elite-best', this.best);
        }

        if (add > 0) {
            this.scoreAdditionEl.textContent = `+${add}`;
            this.scoreAdditionEl.style.opacity = 1;
            this.scoreAdditionEl.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                this.scoreAdditionEl.style.opacity = 0;
                this.scoreAdditionEl.style.transform = 'translateY(0)';
            }, 600);
        }
    }

    getGrid() {
        const grid = [];
        for (let i = 0; i < 4; i++) grid.push(this.board.slice(i * 4, (i + 1) * 4));
        return grid;
    }

    saveState() {
        this.prevStates.push({
            board: JSON.parse(JSON.stringify(this.board)),
            score: this.score
        });
        if (this.prevStates.length > 20) this.prevStates.shift();
    }

    undo() {
        if (this.prevStates.length === 0) return;
        const state = this.prevStates.pop();
        this.board = state.board;
        this.score = state.score;
        this.scoreValEl.textContent = this.score;
        this.renderAll();
    }

    isGameOver() {
        if (this.board.includes(null)) return false;
        for (let i = 0; i < 16; i++) {
            const x = i % 4;
            const y = Math.floor(i / 4);
            const val = this.board[i].val;
            if (x < 3 && this.board[i + 1].val === val) return false;
            if (y < 3 && this.board[i + 4].val === val) return false;
        }
        return true;
    }

    showGameOver() {
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over').classList.add('visible');
    }
}

window.onload = () => new Game2048();
