class Minesweeper {
    constructor() {
        this.boardSize = { rows: 8, cols: 8 };
        this.mineCount = 10;
        this.mines = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.firstClick = true;
        this.flagMode = false;
        this.timer = 0;
        this.timerInterval = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        // Show difficulty modal on load
    }

    setupEventListeners() {
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setDifficulty(btn.dataset.level);
                document.getElementById('difficulty-modal').classList.add('hidden');
                this.startNewGame();
            });
        });

        document.getElementById('show-difficulty-btn').addEventListener('click', () => {
            document.getElementById('difficulty-modal').classList.remove('hidden');
        });

        document.getElementById('flag-mode-btn').addEventListener('click', () => this.toggleFlagMode());

        document.getElementById('modal-new-game').addEventListener('click', () => this.resetToDifficulty());
        document.getElementById('modal-retry').addEventListener('click', () => this.resetToDifficulty());

        // Prevent right click menu
        document.getElementById('minesweeper-board').addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    setDifficulty(level) {
        if (level === 'easy') {
            this.boardSize = { rows: 10, cols: 10 };
            this.mineCount = 12;
        } else if (level === 'medium') {
            this.boardSize = { rows: 16, cols: 16 };
            this.mineCount = 40;
        } else if (level === 'hard') {
            this.boardSize = { rows: 22, cols: 22 };
            this.mineCount = 99;
        }
    }

    startNewGame() {
        this.mines = [];
        this.revealed = Array(this.boardSize.rows * this.boardSize.cols).fill(false);
        this.flagged = Array(this.boardSize.rows * this.boardSize.cols).fill(false);
        this.gameOver = false;
        this.firstClick = true;
        this.timer = 0;
        this.stopTimer();
        this.updateStats();
        this.createBoard();
    }

    resetToDifficulty() {
        document.getElementById('win-modal').classList.add('hidden');
        document.getElementById('game-over-modal').classList.add('hidden');
        document.getElementById('difficulty-modal').classList.remove('hidden');
    }

    createBoard() {
        const boardEl = document.getElementById('minesweeper-board');
        boardEl.style.gridTemplateColumns = `repeat(${this.boardSize.cols}, 1fr)`;
        boardEl.innerHTML = '';

        for (let i = 0; i < this.boardSize.rows * this.boardSize.cols; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            
            cell.addEventListener('click', () => this.handleCellClick(i));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.handleRightClick(i);
            });

            boardEl.appendChild(cell);
        }
    }

    toggleFlagMode() {
        this.flagMode = !this.flagMode;
        const btn = document.getElementById('flag-mode-btn');
        btn.textContent = `Flag Mode: ${this.flagMode ? 'ON' : 'OFF'}`;
        btn.dataset.active = this.flagMode;
    }

    handleCellClick(index) {
        if (this.gameOver || this.flagged[index] || this.revealed[index]) return;

        if (this.flagMode) {
            this.handleRightClick(index);
            return;
        }

        if (this.firstClick) {
            this.placeMines(index);
            this.firstClick = false;
            this.startTimer();
        }

        if (this.mines.includes(index)) {
            this.handleGameOver();
        } else {
            this.revealCell(index);
            if (this.checkWin()) this.handleWin();
        }
    }

    handleRightClick(index) {
        if (this.gameOver || this.revealed[index]) return;
        this.flagged[index] = !this.flagged[index];
        this.render();
        this.updateStats();
    }

    placeMines(safeIndex) {
        const totalCells = this.boardSize.rows * this.boardSize.cols;
        const indices = Array.from({length: totalCells}, (_, i) => i).filter(i => i !== safeIndex);
        
        for (let i = 0; i < this.mineCount; i++) {
            const randomIndex = Math.floor(Math.random() * indices.length);
            this.mines.push(indices.splice(randomIndex, 1)[0]);
        }
    }

    revealCell(index) {
        if (this.revealed[index] || this.flagged[index]) return;
        this.revealed[index] = true;

        const count = this.getAdjacentMineCount(index);
        if (count === 0) {
            const neighbors = this.getNeighbors(index);
            neighbors.forEach(n => this.revealCell(n));
        }
        this.render();
    }

    getAdjacentMineCount(index) {
        return this.getNeighbors(index).filter(n => this.mines.includes(n)).length;
    }

    getNeighbors(index) {
        const r = Math.floor(index / this.boardSize.cols);
        const c = index % this.boardSize.cols;
        const neighbors = [];

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < this.boardSize.rows && nc >= 0 && nc < this.boardSize.cols) {
                    neighbors.push(nr * this.boardSize.cols + nc);
                }
            }
        }
        return neighbors;
    }

    render() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, i) => {
            cell.className = 'cell';
            cell.textContent = '';
            
            if (this.revealed[i]) {
                cell.classList.add('revealed');
                if (this.mines.includes(i)) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else {
                    const count = this.getAdjacentMineCount(i);
                    if (count > 0) {
                        cell.textContent = count;
                        cell.dataset.count = count;
                    }
                }
            } else if (this.flagged[i]) {
                cell.classList.add('flagged');
                cell.textContent = '🚩';
            }
        });
    }

    updateStats() {
        const remaining = this.mineCount - this.flagged.filter(f => f).length;
        document.getElementById('mine-count').textContent = remaining.toString().padStart(2, '0');
        document.getElementById('timer').textContent = this.formatTime(this.timer);
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer++;
            document.getElementById('timer').textContent = this.formatTime(this.timer);
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    checkWin() {
        const nonMineCells = (this.boardSize.rows * this.boardSize.cols) - this.mineCount;
        return this.revealed.filter(r => r).length === nonMineCells;
    }

    handleWin() {
        this.gameOver = true;
        this.stopTimer();
        document.getElementById('final-time').textContent = this.formatTime(this.timer);
        document.getElementById('win-modal').classList.remove('hidden');
    }

    handleGameOver() {
        this.gameOver = true;
        this.stopTimer();
        this.mines.forEach(m => this.revealed[m] = true);
        this.render();
        document.getElementById('game-over-modal').classList.remove('hidden');
    }
}

new Minesweeper();
