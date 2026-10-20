// brettisgay.com: Connect Four vs. AI (ported from the original site; minimax depth 7)
(() => {
                const KEY = 'brett.best.c4';
                let record = { w: 0, l: 0, d: 0 };
                try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && typeof r.w === 'number') record = r; } catch (e) {}
                function recordText() { return 'Record: ' + record.w + 'W ' + record.l + 'L ' + record.d + 'D'; }
                function tally(k) { record[k]++; try { localStorage.setItem(KEY, JSON.stringify(record)); } catch (e) {} bestEl.textContent = recordText(); }
                const boardElement = document.getElementById('board');
                const columnSelectorsElement = document.getElementById('column-selectors');
                const statusElement = document.getElementById('status');
                const newGameButton = document.getElementById('newGame');
                const winnerModal = document.getElementById('winnerModal');
                const statusDot = document.getElementById('status-dot');
                const recordEl = document.getElementById('winnerRecord');
                const bestEl = document.getElementById('best');
                const winnerText = document.getElementById('winnerText');
                const playAgainButton = document.getElementById('playAgain');

                const ROWS = 6;
                const COLS = 7;
                const HUMAN_PLAYER = 1;
                const AI_PLAYER = 2;
                let board = [];
                let currentPlayer = HUMAN_PLAYER;
                let gameOver = false;
                let gameId = 0;

                function createBoard() {
                    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
                    gameId++;
                    gameOver = false;
                    currentPlayer = HUMAN_PLAYER;
                    boardElement.innerHTML = '';
                    columnSelectorsElement.innerHTML = '';
                    for (let row = 0; row < ROWS; row++) {
                        for (let col = 0; col < COLS; col++) {
                            const cell = document.createElement('div');
                            cell.classList.add('cell');
                            cell.dataset.row = row;
                            cell.dataset.col = col;
                            boardElement.appendChild(cell);
                        }
                    }
                    for (let col = 0; col < COLS; col++) {
                        const column = document.createElement('button');
                        column.type = 'button';
                        column.classList.add('column');
                        column.dataset.col = col;
                        column.setAttribute('aria-label', 'Drop a piece in column ' + (col + 1));
                        column.addEventListener('click', () => handleColumnClick(col));
                        columnSelectorsElement.appendChild(column);
                    }
                    updateStatus();
                    toggleColumnSelectors(true);
                }

                function handleColumnClick(col) {
                    if (gameOver || currentPlayer !== HUMAN_PLAYER) return;
                    const row = findAvailableRow(board, col);
                    if (row === -1) return;
                    dropPiece(row, col, HUMAN_PLAYER);
                    if (gameOver) return;
                    currentPlayer = AI_PLAYER;
                    updateStatus();
                    toggleColumnSelectors(false);
                    const g = gameId; setTimeout(() => { if (g === gameId) aiMove(); }, 500); // ignore if New Game was pressed meanwhile
                }

                function aiMove() {
                    statusElement.textContent = "Computer is thinking...";
                    const { col } = minimax(board, 7, -Infinity, Infinity, true);
                    if (col === null) {
                        gameOver = true;
                        tally('d'); showWinner("It's a Draw! Brett's still Gay!");
                        return;
                    }
                    const row = findAvailableRow(board, col);
                    dropPiece(row, col, AI_PLAYER);
                    if (gameOver) return;
                    currentPlayer = HUMAN_PLAYER;
                    updateStatus();
                    toggleColumnSelectors(true);
                }

                function findAvailableRow(b, col) { for (let row = ROWS - 1; row >= 0; row--) { if (b[row][col] === 0) return row; } return -1; }
                function dropPiece(row, col, player) {
                    board[row][col] = player;
                    const piece = document.createElement('div');
                    piece.classList.add('piece', `player${player}`);
                    const targetCell = document.querySelector(`#c4 .cell[data-row='${row}'][data-col='${col}']`);
                    targetCell.appendChild(piece);
                    if (checkForWin(board, player)) {
                        gameOver = true;
                        if (player === HUMAN_PLAYER) { tally('w'); showWinner("You won! Screenshot for a free surprise from Brett."); } 
                        else { tally('l'); showWinner("The Computer Wins! Brett is laughing at you (lovingly)."); }
                        highlightWinningCells(board, player);
                    } else if (isBoardFull(board)) {
                        gameOver = true;
                        tally('d'); showWinner("It's a Draw! Brett's still Gay!");
                    }
                }

                function updateStatus() { if (gameOver) return; if (currentPlayer === HUMAN_PLAYER) { statusElement.textContent = "Your Turn (Red)"; statusDot.classList.remove('is-ai'); } else { statusElement.textContent = "Computer's Turn (Yellow)"; statusDot.classList.add('is-ai'); } }
                function toggleColumnSelectors(enabled) { columnSelectorsElement.style.pointerEvents = enabled ? 'auto' : 'none'; columnSelectorsElement.querySelectorAll('.column').forEach((c) => { c.disabled = !enabled || board[0][+c.dataset.col] !== 0; }); }
                function showWinner(message) { toggleColumnSelectors(false); statusElement.textContent = message; winnerText.textContent = message; recordEl.textContent = recordText(); winnerModal.hidden = false; playAgainButton.focus({ preventScroll: true }); }
                function isBoardFull(b) { return b[0].every(cell => cell !== 0); }
                function checkForWin(b, player) { for (let r = 0; r < ROWS; r++) { for (let c = 0; c <= COLS - 4; c++) { if (b[r][c] === player && b[r][c+1] === player && b[r][c+2] === player && b[r][c+3] === player) return true; } } for (let c = 0; c < COLS; c++) { for (let r = 0; r <= ROWS - 4; r++) { if (b[r][c] === player && b[r+1][c] === player && b[r+2][c] === player && b[r+3][c] === player) return true; } } for (let r = 0; r <= ROWS - 4; r++) { for (let c = 0; c <= COLS - 4; c++) { if (b[r][c] === player && b[r+1][c+1] === player && b[r+2][c+2] === player && b[r+3][c+3] === player) return true; } } for (let r = 3; r < ROWS; r++) { for (let c = 0; c <= COLS - 4; c++) { if (b[r][c] === player && b[r-1][c+1] === player && b[r-2][c+2] === player && b[r-3][c+3] === player) return true; } } return false; }
                function highlightWinningCells(b, player) {
                    let winningLine = [];
                    const findLine = () => {
                        for (let r = 0; r < ROWS; r++) { for (let c = 0; c <= COLS - 4; c++) { if (b[r][c] === player && b[r][c+1] === player && b[r][c+2] === player && b[r][c+3] === player) return [{r,c},{r,c:c+1},{r,c:c+2},{r,c:c+3}]; } }
                        for (let c = 0; c < COLS; c++) { for (let r = 0; r <= ROWS - 4; r++) { if (b[r][c] === player && b[r+1][c] === player && b[r+2][c] === player && b[r+3][c] === player) return [{r,c},{r:r+1,c},{r:r+2,c},{r:r+3,c}]; } }
                        for (let r = 0; r <= ROWS - 4; r++) { for (let c = 0; c <= COLS - 4; c++) { if (b[r][c] === player && b[r+1][c+1] === player && b[r+2][c+2] === player && b[r+3][c+3] === player) return [{r,c},{r:r+1,c:c+1},{r:r+2,c:c+2},{r:r+3,c:c+3}]; } }
                        for (let r = 3; r < ROWS; r++) { for (let c = 0; c <= COLS - 4; c++) { if (b[r][c] === player && b[r-1][c+1] === player && b[r-2][c+2] === player && b[r-3][c+3] === player) return [{r,c},{r:r-1,c:c+1},{r:r-2,c:c+2},{r:r-3,c:c+3}]; } }
                        return [];
                    };
                    winningLine = findLine();
                    winningLine.forEach(pos => {
                        const cellElement = document.querySelector(`#c4 .cell[data-row='${pos.r}'][data-col='${pos.c}']`);
                        if (cellElement) cellElement.classList.add('winning-cell');
                    });
                }
                function scorePosition(b, player) {
                    let score = 0;
                    const centerArray = b.map(row => row[Math.floor(COLS / 2)]);
                    score += centerArray.filter(p => p === player).length * 6;
                    const scoreLine = (line, p) => {
                        let s = 0;
                        const opponentPlayer = p === AI_PLAYER ? HUMAN_PLAYER : AI_PLAYER;
                        const playerCount = line.filter(val => val === p).length;
                        const emptyCount = line.filter(val => val === 0).length;
                        const opponentCount = line.filter(val => val === opponentPlayer).length;
                        if (playerCount === 4) s += 1000000;
                        else if (playerCount === 3 && emptyCount === 1) s += 5000;
                        else if (playerCount === 2 && emptyCount === 2) s += 50;
                        if (opponentCount === 3 && emptyCount === 1) s -= 10000;
                        return s;
                    };
                    for (let r = 0; r < ROWS; r++) { for (let c = 0; c <= COLS - 4; c++) { score += scoreLine(b[r].slice(c, c + 4), player); } }
                    for (let c = 0; c < COLS; c++) { for (let r = 0; r <= ROWS - 4; r++) { score += scoreLine([b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]], player); } }
                    for (let r = 0; r <= ROWS - 4; r++) { for (let c = 0; c <= COLS - 4; c++) { score += scoreLine([b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]], player); } }
                    for (let r = 3; r < ROWS; r++) { for (let c = 0; c <= COLS - 4; c++) { score += scoreLine([b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]], player); } }
                    return score;
                }
                function getValidLocations(b) { return [...Array(COLS).keys()].filter(c => b[0][c] === 0); }
                function minimax(b, depth, alpha, beta, maximizingPlayer) {
                    const isTerminal = checkForWin(b, HUMAN_PLAYER) || checkForWin(b, AI_PLAYER) || isBoardFull(b);
                    if (depth === 0 || isTerminal) {
                        if (isTerminal) {
                            if (checkForWin(b, AI_PLAYER)) return { col: null, score: 10000000 };
                            if (checkForWin(b, HUMAN_PLAYER)) return { col: null, score: -10000000 };
                            return { col: null, score: 0 };
                        }
                        return { col: null, score: scorePosition(b, AI_PLAYER) };
                    }
                    const validLocations = getValidLocations(b);
                    const columnOrder = [3, 4, 2, 5, 1, 6, 0];
                    const prioritizedLocations = columnOrder.filter(col => validLocations.includes(col));
                    if (maximizingPlayer) {
                        let value = -Infinity;
                        let column = prioritizedLocations[0];
                        for (const col of prioritizedLocations) {
                            let b_copy = b.map(r => [...r]);
                            const row = findAvailableRow(b_copy, col);
                            b_copy[row][col] = AI_PLAYER;
                            let new_score = minimax(b_copy, depth - 1, alpha, beta, false).score;
                            if (new_score > value) {
                                value = new_score;
                                column = col;
                            }
                            alpha = Math.max(alpha, value);
                            if (alpha >= beta) break;
                        }
                        return { col: column, score: value };
                    } else { // Minimizing player
                        let value = Infinity;
                        let column = prioritizedLocations[0];
                        for (const col of prioritizedLocations) {
                            let b_copy = b.map(r => [...r]);
                            const row = findAvailableRow(b_copy, col);
                            b_copy[row][col] = HUMAN_PLAYER;
                            let new_score = minimax(b_copy, depth - 1, alpha, beta, true).score;
                            if (new_score < value) {
                                value = new_score;
                                column = col;
                            }
                            beta = Math.min(beta, value);
                            if (alpha >= beta) break;
                        }
                        return { col: column, score: value };
                    }
                }
                function resetGame() {
                    winnerModal.hidden = true;
                    createBoard();
                }
                newGameButton.addEventListener('click', resetGame);
                playAgainButton.addEventListener('click', resetGame);
                bestEl.textContent = recordText();
                createBoard();
})();
