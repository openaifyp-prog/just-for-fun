class Sudoku {
    constructor() {
        this.board = Array(81).fill(0);
        this.solution = Array(81).fill(0);
        this.fixed = Array(81).fill(false);
        this.selectedCell = null;
        this.mistakes = 0;
        this.hintsRemaining = 3;
        this.timer = 0;
        this.timerInterval = null;
        this.difficulty = 'medium';
        
        this.init();
    }

    init() {
        this.createBoard();
        this.setupEventListeners();
        // Don't start game automatically, wait for difficulty selection
    }

    createBoard() {
        const boardEl = document.getElementById('sudoku-board');
        boardEl.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.selectCell(i));
            boardEl.appendChild(cell);
        }
    }

    setupEventListeners() {
        // Difficulty selection
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.difficulty = btn.dataset.level;
                document.getElementById('difficulty-modal').classList.add('hidden');
                this.startNewGame();
            });
        });

        // Show difficulty modal
        document.getElementById('show-difficulty-btn').addEventListener('click', () => {
            document.getElementById('difficulty-modal').classList.remove('hidden');
        });

        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleNumberInput(parseInt(btn.dataset.value)));
        });

        document.getElementById('erase-btn').addEventListener('click', () => this.eraseCell());
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        
        document.getElementById('modal-new-game').addEventListener('click', () => {
            document.getElementById('win-modal').classList.add('hidden');
            document.getElementById('difficulty-modal').classList.remove('hidden');
        });

        window.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') this.handleNumberInput(parseInt(e.key));
            if (e.key === 'Backspace' || e.key === 'Delete') this.eraseCell();
        });
    }

    startNewGame() {
        this.generatePuzzle();
        this.mistakes = 0;
        this.hintsRemaining = 3;
        this.timer = 0;
        this.selectedCell = null;
        this.updateStats();
        this.startTimer();
        this.render();
    }

    generatePuzzle() {
        this.solution = this.solveSudoku(Array(81).fill(0));
        this.board = [...this.solution];
        
        let removed = 0;
        let target = 40; // Medium
        if (this.difficulty === 'easy') target = 30;
        if (this.difficulty === 'hard') target = 50;

        while (removed < target) {
            let idx = Math.floor(Math.random() * 81);
            if (this.board[idx] !== 0) {
                this.board[idx] = 0;
                removed++;
            }
        }
        
        this.fixed = this.board.map(val => val !== 0);
    }

    solveSudoku(board) {
        const solve = (b) => {
            for (let i = 0; i < 81; i++) {
                if (b[i] === 0) {
                    const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
                    for (let n of nums) {
                        if (this.isValid(b, i, n)) {
                            b[i] = n;
                            if (solve(b)) return true;
                            b[i] = 0;
                        }
                    }
                    return false;
                }
            }
            return true;
        };
        const newBoard = [...board];
        solve(newBoard);
        return newBoard;
    }

    isValid(board, idx, num) {
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        for (let i = 0; i < 9; i++) {
            if (board[row * 9 + i] === num) return false;
            if (board[i * 9 + col] === num) return false;
            const bIdx = (boxRow + Math.floor(i / 3)) * 9 + (boxCol + (i % 3));
            if (board[bIdx] === num) return false;
        }
        return true;
    }

    selectCell(idx) {
        if (this.fixed[idx]) {
            this.selectedCell = idx;
        } else {
            this.selectedCell = idx;
        }
        this.render();
    }

    handleNumberInput(num) {
        if (this.selectedCell === null || this.fixed[this.selectedCell]) return;

        if (num === this.solution[this.selectedCell]) {
            this.board[this.selectedCell] = num;
            if (this.checkWin()) this.handleWin();
            this.render();
        } else {
            this.mistakes++;
            this.updateStats();
            
            // Visual feedback
            const cellEl = document.querySelector(`.cell[data-index="${this.selectedCell}"]`);
            cellEl.classList.add('error-shake');
            setTimeout(() => {
                cellEl.classList.remove('error-shake');
            }, 400);

            if (this.mistakes >= 3) {
                setTimeout(() => {
                    alert("Game Over! Try again.");
                    document.getElementById('difficulty-modal').classList.remove('hidden');
                }, 500);
            }
        }
    }

    showHint() {
        if (this.hintsRemaining <= 0) return;
        
        // Find empty cells
        const emptyCells = [];
        for (let i = 0; i < 81; i++) {
            if (this.board[i] === 0) emptyCells.push(i);
        }

        if (emptyCells.length > 0) {
            const randomIdx = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[randomIdx] = this.solution[randomIdx];
            this.fixed[randomIdx] = true; // Make it fixed so they can't erase it
            this.hintsRemaining--;
            this.updateStats();
            this.render();
            
            if (this.checkWin()) this.handleWin();
        }
    }

    eraseCell() {
        if (this.selectedCell === null || this.fixed[this.selectedCell]) return;
        this.board[this.selectedCell] = 0;
        this.render();
    }

    updateStats() {
        document.getElementById('mistakes').textContent = `${this.mistakes}/3`;
        document.getElementById('timer').textContent = this.formatTime(this.timer);
        document.getElementById('hint-count').textContent = this.hintsRemaining;
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer++;
            document.getElementById('timer').textContent = this.formatTime(this.timer);
        }, 1000);
    }

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    render() {
        const cells = document.querySelectorAll('.cell');
        const selectedVal = this.selectedCell !== null ? this.board[this.selectedCell] : null;

        cells.forEach((cell, i) => {
            const val = this.board[i];
            cell.textContent = val !== 0 ? val : '';
            cell.className = 'cell';
            
            if (this.fixed[i]) cell.classList.add('fixed');
            if (this.selectedCell === i) cell.classList.add('selected');
            
            if (this.selectedCell !== null) {
                const sRow = Math.floor(this.selectedCell / 9);
                const sCol = this.selectedCell % 9;
                const iRow = Math.floor(i / 9);
                const iCol = i % 9;
                const sBoxR = Math.floor(sRow / 3);
                const sBoxC = Math.floor(sCol / 3);
                const iBoxR = Math.floor(iRow / 3);
                const iBoxC = Math.floor(iCol / 3);

                if (sRow === iRow || sCol === iCol || (sBoxR === iBoxR && sBoxC === iBoxC)) {
                    cell.classList.add('related');
                }

                if (selectedVal !== 0 && val === selectedVal) {
                    cell.classList.add('same-number');
                }
            }
        });
    }

    checkWin() {
        return this.board.every((val, i) => val === this.solution[i]);
    }

    handleWin() {
        clearInterval(this.timerInterval);
        document.getElementById('final-time').textContent = this.formatTime(this.timer);
        document.getElementById('win-modal').classList.remove('hidden');
    }
}

new Sudoku();
