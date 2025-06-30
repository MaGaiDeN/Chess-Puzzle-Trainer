class ChessPuzzleSolver {
    constructor() {
        console.log('Iniciando ChessPuzzleSolver');
        this.userProgress = this.loadUserProgress();
        this.firstAttempt = true;
        this.allPuzzles = [];
        this.currentPage = 1;
        this.game = new Chess();
        this.waitingForMate = false;
        this.saveProgress = false;
        this.playerName = '';
        
        this.initializeApp();
    }

    loadPuzzle(index) {
        console.log('Cargando puzzle:', index);
        this.currentPuzzle = this.allPuzzles[index];
        
        if (!this.currentPuzzle) {
            console.error('Puzzle no encontrado:', index);
            return;
        }

        try {
            this.game.load(this.currentPuzzle.fen);
            this.board.position(this.currentPuzzle.fen);
            this.currentMoves = this.handleMateInTwo();
            
            if (this.currentPuzzle.mateType === 'Mate en uno' && !this.currentMoves.firstMove) {
                console.error('No se pudo extraer el movimiento de mate en uno');
                return;
            }
            
            if (this.currentPuzzle.mateType === 'Mate en dos' && 
                (!this.currentMoves.firstMove || !this.currentMoves.opponentResponse || !this.currentMoves.mateMove)) {
                console.error('No se pudieron extraer todos los movimientos para mate en dos');
                return;
            }
            
            this.firstAttempt = true;
            this.updatePuzzleDisplay();
            this.waitingForMate = false;
            this.updateGameInfo();
            
        } catch (error) {
            console.error('Error cargando puzzle:', error);
            const boardElement = document.getElementById('board');
            if (boardElement) {
                boardElement.innerHTML = `
                    <div class="puzzle-error">
                        <h3>Error cargando el puzzle</h3>
                        <p>Ha ocurrido un error al cargar el puzzle ${index + 1}.</p>
                        <button onclick="app.loadPuzzle(${Math.max(0, index - 1)})">Puzzle anterior</button>
                        <button onclick="app.loadPuzzle(${Math.min(this.allPuzzles.length - 1, index + 1)})">Puzzle siguiente</button>
                    </div>
                `;
            }
        }
    }

    handleMateInTwo() {
        const moves = this.currentPuzzle.moves[0];
        console.log('Secuencia completa:', moves);

        if (this.currentPuzzle.mateType === 'Mate en uno') {
            const cleanMoves = moves.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
            const moveMatch = cleanMoves.match(/1\.([A-Za-z0-9x#\+=\-]+)/);
            if (moveMatch) {
                const firstMove = moveMatch[1].trim();
                console.log('Mate en uno detectado:', firstMove);
                return { firstMove, opponentResponse: null, mateMove: null };
            }
        }

        if (this.currentPuzzle.mateType === 'Mate en dos') {
            const cleanMoves = moves.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
            const patterns = [
                /1\.([A-Za-z0-9x#\+=\-]+)\s+([A-Za-z0-9x#\+=\-]+)\s+2\.([A-Za-z0-9x#\+=\-]+)/,
                /1\.([A-Za-z0-9x#\+=\-]+)\s+1\.\.\.([A-Za-z0-9x#\+=\-]+)\s+2\.([A-Za-z0-9x#\+=\-]+)/,
                /1\.([A-Za-z0-9x#\+=\-]+)[^A-Za-z0-9]*([A-Za-z0-9x#\+=\-]+)[^A-Za-z0-9]*2\.([A-Za-z0-9x#\+=\-]+)/
            ];

            for (const pattern of patterns) {
                const matches = cleanMoves.match(pattern);
                if (matches) {
                    const [_, firstMove, opponentResponse, mateMove] = matches;
                    return {
                        firstMove: firstMove.trim(),
                        opponentResponse: opponentResponse.trim(),
                        mateMove: mateMove.trim()
                    };
                }
            }
        }
        
        console.error('No se pudo parsear la secuencia de movimientos:', moves);
        return { firstMove: null, opponentResponse: null, mateMove: null };
    }

    updatePuzzleDisplay() {
        const items = document.querySelectorAll('.puzzle-item');
        items.forEach(item => item.classList.remove('active'));
        
        const currentItem = document.querySelector(`.puzzle-item[onclick*="${this.currentPuzzle.index}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    }

    onDragStart(source, piece) {
        return !this.game.game_over() && piece.search(/^w/) !== -1;
    }

    async onDrop(source, target) {
        console.log('Intentando mover de', source, 'a', target);
        
        const isPromotion = (target.charAt(1) === '8' || target.charAt(1) === '1') 
                           && this.game.get(source).type === 'p';

        if (isPromotion) {
            const result = await this.handlePromotion(source, target);
            return result;
        }

        let move = this.game.move({ from: source, to: target });

        if (move === null) {
            console.log('Movimiento ilegal');
            return 'snapback';
        }

        return this.handleMove(move);
    }

    async handlePromotion(source, target) {
        const promotionDialog = document.createElement('div');
        promotionDialog.className = 'promotion-dialog';
        promotionDialog.innerHTML = `
            <div class="promotion-overlay"></div>
            <div class="promotion-content">
                <h3>Selecciona la pieza de promoción:</h3>
                <div class="promotion-pieces">
                    <div class="promotion-piece" data-piece="q">♕</div>
                    <div class="promotion-piece" data-piece="r">♖</div>
                    <div class="promotion-piece" data-piece="b">♗</div>
                    <div class="promotion-piece" data-piece="n">♘</div>
                </div>
            </div>
        `;

        if (!document.querySelector('#promotion-styles')) {
            const styles = document.createElement('style');
            styles.id = 'promotion-styles';
            styles.textContent = `
                .promotion-dialog { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; display: flex; align-items: center; justify-content: center; }
                .promotion-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
                .promotion-content { position: relative; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center; }
                .promotion-pieces { display: flex; gap: 15px; justify-content: center; }
                .promotion-piece { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 40px; cursor: pointer; border: 2px solid #ddd; border-radius: 8px; transition: all 0.2s ease; background: #f9f9f9; }
                .promotion-piece:hover { background: #e0e0e0; border-color: #007bff; }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(promotionDialog);

        return new Promise((resolve) => {
            const cleanup = () => {
                if (document.body.contains(promotionDialog)) {
                    document.body.removeChild(promotionDialog);
                }
                document.removeEventListener('keydown', escapeHandler);
            };

            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve('snapback');
                }
            };

            document.addEventListener('keydown', escapeHandler);

            promotionDialog.addEventListener('click', (e) => {
                if (e.target.classList.contains('promotion-overlay')) {
                    cleanup();
                    resolve('snapback');
                    return;
                }

                const piece = e.target.closest('.promotion-piece');
                if (piece) {
                    const promotionPiece = piece.dataset.piece;
                    cleanup();

                    const move = this.game.move({
                        from: source,
                        to: target,
                        promotion: promotionPiece
                    });

                    if (move === null) {
                        resolve('snapback');
                    } else {
                        resolve(this.handleMove(move));
                    }
                }
            });
        });
    }

    async handleMove(move) {
        console.log('Movimiento realizado:', move.san);

        if (!this.currentMoves) {
            console.error('No hay movimientos definidos');
            this.game.undo();
            return 'snapback';
        }

        if (this.currentPuzzle.mateType === 'Mate en uno') {
            const expectedMove = this.currentMoves.firstMove;
            const actualMove = move.san;

            if (actualMove === expectedMove && this.game.in_checkmate()) {
                console.log('¡Mate en uno conseguido!');
                this.handlePuzzleCompletion();
            } else {
                console.log('No es mate o movimiento incorrecto');
                this.game.undo();
                return 'snapback';
            }
        } else if (this.currentPuzzle.mateType === 'Mate en dos') {
            if (!this.waitingForMate) {
                const expectedMove = this.currentMoves.firstMove;
                const actualMove = move.san;

                if (actualMove === expectedMove) {
                    console.log('Primer movimiento correcto');
                    this.waitingForMate = true;
                    
                    setTimeout(() => {
                        const opponentMove = this.game.move(this.currentMoves.opponentResponse);
                        if (opponentMove) {
                            this.board.position(this.game.fen());
                        }
                    }, 500);
                } else {
                    console.log('Movimiento incorrecto');
                    this.game.undo();
                    return 'snapback';
                }
            } else {
                const expectedMove = this.currentMoves.mateMove;
                const actualMove = move.san;

                if (actualMove === expectedMove && this.game.in_checkmate()) {
                    console.log('¡Mate en dos conseguido!');
                    this.handlePuzzleCompletion();
                } else {
                    console.log('No es mate o movimiento incorrecto');
                    this.game.undo();
                    return 'snapback';
                }
            }
        }

        this.updateGameInfo();
        return true;
    }

    onSnapEnd() {
        this.board.position(this.game.fen());
    }

    loadUserProgress() {
        const savedProgress = localStorage.getItem('chessPuzzleProgress');
        return savedProgress ? JSON.parse(savedProgress) : {
            solvedPuzzles: [],
            statistics: { totalAttempts: 0, correctFirstTry: 0 }
        };
    }

    async initializeApp() {
        try {
            await this.showWelcomeDialog();
            this.setupResetButton();
            await this.loadPuzzles();
            this.initBoard();
            this.setupBoardResize();
            this.loadLastSolvedPuzzle();
            this.updateProgressDisplay();
        } catch (error) {
            console.error('Error en la inicialización:', error);
        }
    }

    setupResetButton() {
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', async () => {
                if (confirm('¿Estás seguro de que quieres reiniciar todo tu progreso? Esta acción no se puede deshacer.')) {
                    if (this.playerName) {
                        localStorage.removeItem(`chessPuzzleProgress_${this.playerName}`);
                    }
                    
                    this.userProgress = {
                        solvedPuzzles: [],
                        statistics: { totalAttempts: 0, correctFirstTry: 0 }
                    };
                    this.saveProgress = false;
                    this.playerName = '';
                    
                    await this.showWelcomeDialog();
                    this.updateProgressDisplay();
                    this.displayPuzzlePage(1);
                    this.loadPuzzle(0);
                }
            });
        }
    }

    async loadPuzzles() {
        const getBasePath = () => {
            const isGitHubPages = window.location.hostname.includes('github.io');
            return isGitHubPages ? '/Chess-Puzzle-Trainer' : '.';
        };

        try {
            const basePath = getBasePath();
            const url = `${basePath}/Mate_en_Dos.pgn`;
            console.log('Intentando cargar desde:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.text();
            this.allPuzzles = this.parsePGN(data);
            console.log('Puzzles parseados:', this.allPuzzles.length);
            return this.allPuzzles;
        } catch (error) {
            console.error('Error cargando puzzles:', error);
            const boardColumn = document.querySelector('.board-column');
            if (boardColumn) {
                boardColumn.innerHTML = `
                    <div class="error-message">
                        Error cargando los puzzles. 
                        Por favor, verifica la conexión y recarga la página.
                        <button onclick="location.reload()">Recargar</button>
                    </div>
                `;
            }
            return [];
        }
    }

    parsePGN(pgn) {
        const puzzles = [];
        const games = pgn.split(/\[Event/);
        
        for (let i = 1; i < games.length; i++) {
            const game = '[Event' + games[i];
            
            try {
                const fenMatch = game.match(/\[FEN "([^"]+)"\]/);
                const whiteMatch = game.match(/\[White "([^"]+)"\]/);
                const moveText = game.split(/\]\s*\n\s*\n/)[1];
                
                if (fenMatch && moveText) {
                    const moves = moveText.trim();
                    const mateType = whiteMatch ? whiteMatch[1] : '';
                    const isMateInOne = mateType.toLowerCase().includes('mate in one');
                    const mateDescription = isMateInOne ? 'Mate en uno' : 'Mate en dos';
                    
                    puzzles.push({
                        id: `Puzzle ${i}`,
                        fen: fenMatch[1],
                        moves: [moves],
                        description: mateDescription,
                        mateType: mateDescription,
                        index: i - 1,
                        type: isMateInOne ? 'mate-in-one' : 'mate-in-two'
                    });
                }
            } catch (e) {
                console.error(`Error procesando juego ${i}:`, e);
            }
        }
        
        return puzzles;
    }

    initBoard() {
        console.log('Iniciando tablero');
        this.game = new Chess();
        this.boardConfig = {
            draggable: true,
            position: 'start',
            pieceTheme: 'https://lichess1.org/assets/piece/cburnett/{piece}.svg',
            onDragStart: (source, piece) => this.onDragStart(source, piece),
            onDrop: async (source, target) => {
                const handleAsync = async () => {
                    try {
                        const result = await this.onDrop(source, target);
                        return result;
                    } catch (error) {
                        console.error('Error en onDrop:', error);
                        return 'snapback';
                    }
                };
                return handleAsync();
            },
            onSnapEnd: () => this.onSnapEnd()
        };
        
        this.board = Chessboard('board', this.boardConfig);
        console.log('Tablero creado');
    }

    setupBoardResize() {
        const resizeBoard = () => {
            if (this.board) {
                setTimeout(() => {
                    this.board.resize();
                }, 100);
            }
        };

        window.addEventListener('resize', resizeBoard);
        
        if (window.ResizeObserver) {
            const observer = new ResizeObserver(resizeBoard);
            const boardElement = document.getElementById('board');
            if (boardElement) {
                observer.observe(boardElement);
            }
        }
    }

    displayPuzzlePage(pageNumber) {
        const puzzlesPerPage = 10;
        const totalPages = Math.ceil(this.allPuzzles.length / puzzlesPerPage);
        
        pageNumber = Math.max(1, Math.min(pageNumber, totalPages));
        
        const navigationHtml = `
            <div class="navigation-controls">
                <button class="nav-button" onclick="app.displayPuzzlePage(${pageNumber - 1})" ${pageNumber === 1 ? 'disabled' : ''}>←</button>
                <span class="page-info">${pageNumber} / ${totalPages}</span>
                <button class="nav-button" onclick="app.displayPuzzlePage(${pageNumber + 1})" ${pageNumber === totalPages ? 'disabled' : ''}>→</button>
            </div>
        `;

        const start = (pageNumber - 1) * puzzlesPerPage;
        const end = start + puzzlesPerPage;
        const puzzlesForPage = this.allPuzzles.slice(start, end);
        
        let puzzlesHtml = '';
        puzzlesForPage.forEach(puzzle => {
            const isSolved = this.userProgress.solvedPuzzles.includes(puzzle.id);
            puzzlesHtml += `
                <div class="puzzle-item ${isSolved ? 'solved' : ''} ${puzzle === this.currentPuzzle ? 'active' : ''}"
                     onclick="app.loadPuzzle(${puzzle.index})">
                    ${puzzle.id.replace('Puzzle ', '')}${isSolved ? '<span class="solved-mark">✓</span>' : ''}
                </div>
            `;
        });

        const puzzlesList = document.getElementById('puzzlesList');
        if (puzzlesList) {
            puzzlesList.innerHTML = navigationHtml + puzzlesHtml;
        }
        
        this.currentPage = pageNumber;
    }

    updateProgressDisplay() {
        const playerInfo = document.getElementById('playerInfo');
        
        if (this.saveProgress && this.playerName) {
            playerInfo.className = 'player-info';
            playerInfo.innerHTML = `<span class="label">Jugador</span><span class="name">${this.playerName}</span>`;
        } else {
            playerInfo.className = 'player-info guest-mode';
            playerInfo.innerHTML = `<span class="label">Modo</span><span class="name">Sin Guardar</span>`;
        }
        
        const totalPuzzles = this.allPuzzles.length;
        const solvedCount = this.userProgress.solvedPuzzles.length;
        const accuracy = this.userProgress.statistics.totalAttempts > 0 
            ? Math.round((this.userProgress.statistics.correctFirstTry / this.userProgress.statistics.totalAttempts) * 100) 
            : 0;

        const progressHtml = `
            <div class="progress-stats">
                <div class="stats-row">
                    <div class="stat-item">
                        <div class="stat-value">${solvedCount}/${totalPuzzles}</div>
                        <div class="stat-label">Puzzles Resueltos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${accuracy}%</div>
                        <div class="stat-label">Precisión</div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(solvedCount/totalPuzzles)*100}%"></div>
                </div>
            </div>
        `;

        const logoContainer = document.querySelector('.logo-container');
        if (logoContainer) {
            const existingStats = document.querySelector('.progress-stats');
            if (existingStats) {
                existingStats.remove();
            }
            logoContainer.insertAdjacentHTML('afterend', progressHtml);
        }
    }

    saveUserProgress() {
        if (this.saveProgress && this.playerName) {
            localStorage.setItem(`chessPuzzleProgress_${this.playerName}`, JSON.stringify(this.userProgress));
        }
    }

    handlePuzzleCompletion() {
        if (!this.userProgress.solvedPuzzles.includes(this.currentPuzzle.id)) {
            this.userProgress.solvedPuzzles.push(this.currentPuzzle.id);
            if (this.firstAttempt) {
                this.userProgress.statistics.correctFirstTry++;
            }
            this.userProgress.statistics.totalAttempts++;
            
            this.saveUserProgress();
            this.updateProgressDisplay();
            
            const currentPuzzleElement = document.querySelector(`.puzzle-item[onclick*="${this.currentPuzzle.index}"]`);
            if (currentPuzzleElement) {
                currentPuzzleElement.classList.add('solved');
                if (!currentPuzzleElement.querySelector('.solved-mark')) {
                    currentPuzzleElement.innerHTML += '<span class="solved-mark">✓</span>';
                }
            }

            const puzzlesPerPage = 10;
            const currentPageStart = (this.currentPage - 1) * puzzlesPerPage;
            const currentPageEnd = currentPageStart + puzzlesPerPage - 1;
            
            if (this.currentPuzzle.index === currentPageEnd) {
                const nextPage = this.currentPage + 1;
                const totalPages = Math.ceil(this.allPuzzles.length / puzzlesPerPage);
                
                if (nextPage <= totalPages) {
                    setTimeout(() => {
                        this.displayPuzzlePage(nextPage);
                    }, 500);
                }
            }

            setTimeout(() => {
                const nextIndex = this.currentPuzzle.index + 1;
                if (this.allPuzzles[nextIndex]) {
                    this.loadPuzzle(nextIndex);
                    this.updatePuzzlesList();
                }
            }, 1000);
        }
    }

    updatePuzzlesList() {
        const puzzlesPerPage = 10;
        const start = (this.currentPage - 1) * puzzlesPerPage;
        const end = start + puzzlesPerPage;
        const puzzlesForPage = this.allPuzzles.slice(start, end);
        
        let puzzlesHtml = '';
        puzzlesForPage.forEach(puzzle => {
            const isSolved = this.userProgress.solvedPuzzles.includes(puzzle.id);
            puzzlesHtml += `
                <div class="puzzle-item ${isSolved ? 'solved' : ''} ${puzzle === this.currentPuzzle ? 'active' : ''}"
                     onclick="app.loadPuzzle(${puzzle.index})">
                    ${puzzle.id.replace('Puzzle ', '')}${isSolved ? '<span class="solved-mark">✓</span>' : ''}
                </div>
            `;
        });

        const puzzlesContainer = document.querySelector('.puzzles-grid');
        if (puzzlesContainer) {
            const navigation = puzzlesContainer.parentElement.querySelector('.navigation-controls');
            puzzlesContainer.innerHTML = puzzlesHtml;
        }
    }

    loadLastSolvedPuzzle() {
        if (this.userProgress.solvedPuzzles.length > 0) {
            const lastSolvedId = this.userProgress.solvedPuzzles[this.userProgress.solvedPuzzles.length - 1];
            const lastSolvedPuzzle = this.allPuzzles.find(p => p.id === lastSolvedId);
            
            if (lastSolvedPuzzle) {
                const nextPuzzleIndex = lastSolvedPuzzle.index + 1;
                
                if (this.allPuzzles[nextPuzzleIndex]) {
                    this.loadPuzzle(nextPuzzleIndex);
                    const pageNumber = Math.floor(nextPuzzleIndex / 10) + 1;
                    this.displayPuzzlePage(pageNumber);
                } else {
                    this.loadPuzzle(lastSolvedPuzzle.index);
                    const pageNumber = Math.floor(lastSolvedPuzzle.index / 10) + 1;
                    this.displayPuzzlePage(pageNumber);
                }
            }
        } else {
            this.loadPuzzle(0);
            this.displayPuzzlePage(1);
        }
    }

    showWelcomeDialog() {
        return new Promise((resolve) => {
            const modal = document.getElementById('welcomeModal');
            const nameInput = document.getElementById('playerName');
            const saveButton = document.getElementById('startWithSaving');
            const skipButton = document.getElementById('startWithoutSaving');

            modal.style.display = 'flex';

            skipButton.addEventListener('click', () => {
                this.saveProgress = false;
                this.playerName = '';
                modal.style.display = 'none';
                this.updateProgressDisplay();
                resolve();
            });

            saveButton.addEventListener('click', () => {
                const name = nameInput.value.trim();
                if (name) {
                    this.saveProgress = true;
                    this.playerName = name;
                    const savedProgress = localStorage.getItem(`chessPuzzleProgress_${this.playerName}`);
                    if (savedProgress) {
                        this.userProgress = JSON.parse(savedProgress);
                    }
                    modal.style.display = 'none';
                    this.updateProgressDisplay();
                    resolve();
                } else {
                    alert('Por favor, introduce tu nombre para guardar el progreso');
                }
            });
        });
    }

    updateGameInfo() {
        const turnIndicator = document.getElementById('turnIndicator');
        const puzzleType = document.getElementById('puzzleType');
        
        const turn = this.game.turn() === 'w' ? 'Blancas' : 'Negras';
        turnIndicator.textContent = turn;
        turnIndicator.className = 'value ' + (turn === 'Blancas' ? 'white' : 'black');
        
        puzzleType.textContent = this.currentPuzzle.mateType;
    }
}

// Inicializar la aplicación
window.addEventListener('load', () => {
    console.log('Página completamente cargada, iniciando aplicación');
    window.app = new ChessPuzzleSolver();
});