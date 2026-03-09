const PIECES = {
    wP: '&#9817;', wR: '&#9814;', wN: '&#9816;', wB: '&#9815;', wQ: '&#9813;', wK: '&#9812;',
    bP: '&#9823;', bR: '&#9820;', bN: '&#9822;', bB: '&#9821;', bQ: '&#9819;', bK: '&#9818;'
};

class ChessGame {
    constructor() {
        this.board = Array(64).fill(null);
        this.turn = 'w';
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.lastMove = null;
        this.castlingRights = {
            w: { k: true, sideA: true, sideH: true },
            b: { k: true, sideA: true, sideH: true }
        };
        
        this.init();
    }

    init() {
        this.setupInitialPosition();
        this.createBoardUI();
        this.setupEventListeners();
        this.render();
    }

    setupInitialPosition() {
        const layout = [
            'bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR',
            'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP',
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP',
            'wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'
        ];
        this.board = [...layout];
    }

    createBoardUI() {
        const boardEl = document.getElementById('chess-board');
        boardEl.innerHTML = '';
        for (let i = 0; i < 64; i++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((Math.floor(i / 8) + i) % 2 === 0 ? 'light' : 'dark');
            square.dataset.index = i;
            square.addEventListener('click', () => this.handleSquareClick(i));
            boardEl.appendChild(square);
        }
    }

    setupEventListeners() {
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('undo-btn').addEventListener('click', () => this.undoMove());
    }

    handleSquareClick(index) {
        const piece = this.board[index];
        
        // If already selected, deselect
        if (this.selectedSquare === index) {
            this.selectedSquare = null;
            this.validMoves = [];
            this.render();
            return;
        }

        // If a valid move is selected
        if (this.validMoves.includes(index)) {
            this.movePiece(this.selectedSquare, index);
            return;
        }

        // Select a piece of current turn color
        if (piece && piece.startsWith(this.turn)) {
            this.selectedSquare = index;
            this.validMoves = this.calculateValidMoves(index);
            this.render();
        }
    }

    calculateValidMoves(index) {
        const piece = this.board[index];
        if (!piece) return [];

        const type = piece[1];
        const color = piece[0];
        const row = Math.floor(index / 8);
        const col = index % 8;
        let moves = [];

        switch (type) {
            case 'P': moves = this.getPawnMoves(row, col, color); break;
            case 'R': moves = this.getSlidingMoves(row, col, color, [[0,1],[0,-1],[1,0],[-1,0]]); break;
            case 'B': moves = this.getSlidingMoves(row, col, color, [[1,1],[1,-1],[-1,1],[-1,-1]]); break;
            case 'Q': moves = this.getSlidingMoves(row, col, color, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]); break;
            case 'N': moves = this.getLeaperMoves(row, col, color, [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]); break;
            case 'K': 
                moves = this.getLeaperMoves(row, col, color, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);
                moves = moves.concat(this.getCastlingMoves(row, col, color));
                break;
        }

        return moves;
    }

    getPawnMoves(r, c, color) {
        let moves = [];
        const dir = color === 'w' ? -1 : 1;
        
        // Forward
        if (this.isEmpty(r + dir, c)) {
            moves.push((r + dir) * 8 + c);
            if ((color === 'w' && r === 6 || color === 'b' && r === 1) && this.isEmpty(r + 2*dir, c)) {
                moves.push((r + 2*dir) * 8 + c);
            }
        }
        
        // Captures
        for (let dc of [-1, 1]) {
            if (this.isEnemy(r + dir, c + dc, color)) {
                moves.push((r + dir) * 8 + (c + dc));
            }
        }
        return moves;
    }

    getSlidingMoves(r, c, color, vectors) {
        let moves = [];
        for (let [dr, dc] of vectors) {
            let nr = r + dr, nc = c + dc;
            while (this.isOnBoard(nr, nc)) {
                if (this.isEmpty(nr, nc)) {
                    moves.push(nr * 8 + nc);
                } else {
                    if (this.isEnemy(nr, nc, color)) moves.push(nr * 8 + nc);
                    break;
                }
                nr += dr; nc += dc;
            }
        }
        return moves;
    }

    getLeaperMoves(r, c, color, vectors) {
        let moves = [];
        for (let [dr, dc] of vectors) {
            let nr = r + dr, nc = c + dc;
            if (this.isOnBoard(nr, nc) && (this.isEmpty(nr, nc) || this.isEnemy(nr, nc, color))) {
                moves.push(nr * 8 + nc);
            }
        }
        return moves;
    }

    getCastlingMoves(r, c, color) {
        let moves = [];
        const rights = this.castlingRights[color];
        if (!rights.k) return [];

        const rowOffset = color === 'w' ? 56 : 0;
        
        // King-side
        if (rights.sideH && this.board[rowOffset + 7] === color + 'R' && 
            this.board[rowOffset + 5] === null && 
            this.board[rowOffset + 6] === null) {
            moves.push(rowOffset + 6);
        }
        
        // Queen-side
        if (rights.sideA && this.board[rowOffset + 0] === color + 'R' && 
            this.board[rowOffset + 1] === null && 
            this.board[rowOffset + 2] === null && 
            this.board[rowOffset + 3] === null) {
            moves.push(rowOffset + 2);
        }
        
        return moves;
    }

    isOnBoard(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
    isEmpty(r, c) { return this.isOnBoard(r, c) && this.board[r * 8 + c] === null; }
    isEnemy(r, c, color) { 
        return this.isOnBoard(r, c) && this.board[r * 8 + c] && !this.board[r * 8 + c].startsWith(color); 
    }

    movePiece(from, to) {
        const piece = this.board[from];
        const captured = this.board[to];
        let specialMove = null;
        const prevRights = JSON.parse(JSON.stringify(this.castlingRights));

        // Castling logic
        if (piece[1] === 'K' && Math.abs(from - to) === 2) {
            specialMove = 'castle';
            const rookFrom = to > from ? from + 3 : from - 4;
            const rookTo = to > from ? from + 1 : from - 1;
            this.board[rookTo] = this.board[rookFrom];
            this.board[rookFrom] = null;
        }
        
        // Update rights
        const color = piece[0];
        if (piece[1] === 'K') this.castlingRights[color].k = false;
        if (piece[1] === 'R') {
            if (from % 8 === 0) this.castlingRights[color].sideA = false;
            if (from % 8 === 7) this.castlingRights[color].sideH = false;
        }

        this.board[to] = piece;
        this.board[from] = null;
        
        this.moveHistory.push({ from, to, piece, captured, turn: this.turn, special: specialMove, prevRights });
        this.lastMove = { from, to };
        this.turn = this.turn === 'w' ? 'b' : 'w';
        this.selectedSquare = null;
        this.validMoves = [];
        
        this.render();
        this.updateHistoryUI();
    }

    render() {
        const squares = document.querySelectorAll('.square');
        squares.forEach((sq, i) => {
            sq.innerHTML = '';
            sq.className = 'square ' + ((Math.floor(i / 8) + i) % 2 === 0 ? 'light' : 'dark');
            
            const piece = this.board[i];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.classList.add('piece');
                pieceEl.innerHTML = PIECES[piece];
                pieceEl.style.color = piece.startsWith('w') ? '#fff' : '#000';
                pieceEl.style.textShadow = piece.startsWith('w') ? '0 0 2px #000' : '0 0 2px #fff';
                pieceEl.style.fontSize = '2.5rem';
                sq.appendChild(pieceEl);
            }

            if (this.selectedSquare === i) sq.classList.add('selected');
            if (this.lastMove && (this.lastMove.from === i || this.lastMove.to === i)) sq.classList.add('last-move');
            if (this.validMoves.includes(i)) {
                sq.classList.add(this.board[i] ? 'capture' : 'highlight');
            }
        });

        document.getElementById('current-turn-text').textContent = `${this.turn === 'w' ? 'WHITE' : 'BLACK'}'S TURN`;
    }

    updateHistoryUI() {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        this.moveHistory.forEach((move, i) => {
            if (i % 2 === 0) {
                const num = document.createElement('div');
                num.textContent = Math.floor(i/2) + 1 + '.';
                list.appendChild(num);
            }
            const moveEl = document.createElement('div');
            moveEl.textContent = this.squareName(move.to);
            list.appendChild(moveEl);
        });
        list.scrollTop = list.scrollHeight;
    }

    squareName(i) {
        return String.fromCharCode(97 + (i % 8)) + (8 - Math.floor(i / 8));
    }

    resetGame() {
        this.setupInitialPosition();
        this.turn = 'w';
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.lastMove = null;
        this.castlingRights = {
            w: { k: true, sideA: true, sideH: true },
            b: { k: true, sideA: true, sideH: true }
        };
        this.render();
        this.updateHistoryUI();
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;
        const last = this.moveHistory.pop();
        
        if (last.special === 'castle') {
            const rookFrom = last.to > last.from ? last.from + 3 : last.from - 4;
            const rookTo = last.to > last.from ? last.from + 1 : last.from - 1;
            this.board[rookFrom] = this.board[rookTo];
            this.board[rookTo] = null;
        }

        this.board[last.from] = last.piece;
        this.board[last.to] = last.captured;
        this.castlingRights = last.prevRights;
        this.turn = last.turn;
        this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null;
        this.render();
        this.updateHistoryUI();
    }
}

new ChessGame();
