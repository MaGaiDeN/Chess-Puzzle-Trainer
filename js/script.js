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

        console.log('Puzzle actual:', this.currentPuzzle);
        
        // Establecer posición inicial
        this.game.load(this.currentPuzzle.fen);
        this.board.position(this.currentPuzzle.fen);
        
        // Extraer movimientos
        this.currentMoves = this.handleMateInTwo();
        
        // Resetear primer intento
        this.firstAttempt = true;
        
        // Actualizar UI
        this.updatePuzzleDisplay();
        this.waitingForMate = false;
        
        // Actualizar información del puzzle
        this.updateGameInfo();
    }

    handleMateInTwo() {
        const moves = this.currentPuzzle.moves[0];
        console.log('Secuencia completa:', moves);

        // Si es mate en uno
        if (this.currentPuzzle.mateType === 'Mate en uno') {
            const moveMatch = moves.match(/^1\.([A-Za-z0-9x#\+]+)/);
            if (moveMatch) {
                const firstMove = moveMatch[1].trim();
                console.log('Mate en uno detectado:', firstMove);
                return {
                    firstMove,
                    opponentResponse: null,
                    mateMove: null
                };
            }
        }

        // Para mates en dos - formato con comentarios
        const moveRegex = /1\.([A-Za-z0-9]+).*?1\.{3}([A-Za-z0-9]+)\s+2\.([A-Za-z0-9#]+)/;
        const matches = moves.match(moveRegex);
        
        if (matches) {
            const [_, firstMove, opponentResponse, mateMove] = matches;
            console.log('Mate en dos detectado:', {
                primero: firstMove,
                respuesta: opponentResponse,
                mate: mateMove
            });
            
            return {
                firstMove: firstMove.trim(),
                opponentResponse: opponentResponse.trim(),
                mateMove: mateMove.trim()
            };
        }
        
        // Intentar formato alternativo con comentarios
        const altRegex = /1\.([A-Za-z0-9]+)\s*{[^}]*}\s*([A-Za-z0-9]+)\s+2\.([A-Za-z0-9#]+)/;
        const altMatches = moves.match(altRegex);
        
        if (altMatches) {
            const [_, firstMove, opponentResponse, mateMove] = altMatches;
            console.log('Mate en dos detectado (formato alternativo):', {
                primero: firstMove,
                respuesta: opponentResponse,
                mate: mateMove
            });
            
            return {
                firstMove: firstMove.trim(),
                opponentResponse: opponentResponse.trim(),
                mateMove: mateMove.trim()
            };
        }
        
        console.log('No se pudo parsear la secuencia de movimientos');
        return null;
    }

    updatePuzzleDisplay() {
        // Actualizar la lista de puzzles
        const items = document.querySelectorAll('.puzzle-item');
        items.forEach(item => item.classList.remove('active'));
        
        const currentItem = document.querySelector(`.puzzle-item[onclick*="${this.currentPuzzle.index}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    }

    onDragStart(source, piece) {
        // Solo permitir mover piezas blancas
        return !this.game.game_over() && piece.search(/^w/) !== -1;
    }

    onDrop(source, target) {
        console.log('Intentando mover de', source, 'a', target);
        
        // Verificar si es un movimiento de promoción
        const isPromotion = (target.charAt(1) === '8' || target.charAt(1) === '1') 
                           && this.game.get(source).type === 'p';

        if (isPromotion) {
            return this.handlePromotion(source, target);
        }

        // Movimiento normal sin promoción
        let move = this.game.move({
            from: source,
            to: target
        });

        if (move === null) {
            console.log('Movimiento ilegal');
            return 'snapback';
        }

        return this.handleMove(move);
    }

    handlePromotion(source, target) {
        const promotionDialog = document.createElement('div');
        promotionDialog.className = 'promotion-dialog';
        promotionDialog.innerHTML = `
            <div class="promotion-pieces">
                <div class="promotion-piece" data-piece="q">♕</div>
                <div class="promotion-piece" data-piece="r">♖</div>
                <div class="promotion-piece" data-piece="b">♗</div>
                <div class="promotion-piece" data-piece="n">♘</div>
            </div>
        `;

        // Añadir estilos al diálogo
        document.head.insertAdjacentHTML('beforeend', `
            <style>
                .promotion-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 10px;
                    border: 2px solid #333;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    z-index: 1000;
                }
                .promotion-pieces {
                    display: flex;
                    gap: 10px;
                }
                .promotion-piece {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    cursor: pointer;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                }
                .promotion-piece:hover {
                    background: #eee;
                }
            </style>
        `);

        document.body.appendChild(promotionDialog);

        return new Promise((resolve) => {
            promotionDialog.addEventListener('click', (e) => {
                const piece = e.target.closest('.promotion-piece');
                if (piece) {
                    const promotionPiece = piece.dataset.piece;
                    document.body.removeChild(promotionDialog);

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

    handleMove(move) {
        console.log('Movimiento realizado:', move.san);

        if (this.currentPuzzle.mateType === 'Mate en uno') {
            if (move.san === this.currentMoves?.firstMove && this.game.in_checkmate()) {
                console.log('¡Mate en uno conseguido!');
                this.handlePuzzleCompletion();
            } else {
                console.log('No es mate o movimiento incorrecto');
                this.game.undo();
                return 'snapback';
            }
        } else if (this.currentPuzzle.mateType === 'Mate en dos') {
            if (!this.waitingForMate) {
                if (move.san === this.currentMoves.firstMove) {
                    console.log('Primer movimiento correcto');
                    this.waitingForMate = true;
                    
                    // Hacer el movimiento de respuesta del oponente
                    setTimeout(() => {
                        try {
                            const opponentMove = this.game.move(this.currentMoves.opponentResponse);
                            if (opponentMove) {
                                console.log('Respuesta del oponente:', opponentMove.san);
                                this.board.position(this.game.fen());
                                this.updateGameInfo();
                            } else {
                                console.error('No se pudo realizar el movimiento del oponente');
                            }
                        } catch (error) {
                            console.error('Error al realizar el movimiento del oponente:', error);
                            this.game.undo();
                            this.waitingForMate = false;
                            return 'snapback';
                        }
                    }, 500);
                } else {
                    console.log('Primer movimiento incorrecto');
                    this.game.undo();
                    return 'snapback';
                }
            } else {
                if (move.san === this.currentMoves.mateMove && this.game.in_checkmate()) {
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

    makeOpponentMove() {
        console.log('Realizando movimiento del oponente');
        if (this.currentMoves.opponentResponse) {
            const move = this.game.move(this.currentMoves.opponentResponse);
            if (move) {
                console.log('Movimiento del oponente realizado:', move.san);
                this.board.position(this.game.fen());
            } else {
                console.error('Error al realizar movimiento del oponente');
            }
        }
    }

    onSnapEnd() {
        this.board.position(this.game.fen());
    }

    checkMate() {
        if (this.game.in_checkmate()) {
            const lastMove = this.game.history({ verbose: true }).slice(-1)[0].san;
            console.log('Último movimiento:', lastMove);
            console.log('Movimiento de mate esperado:', this.currentMoves.mateMove);
            
            if (lastMove === this.currentMoves.mateMove) {
                console.log('¡Mate correcto!');
                this.handlePuzzleCompletion();
                return true;
            }
        }
        return false;
    }

    loadUserProgress() {
        console.log('Cargando progreso del usuario');
        const savedProgress = localStorage.getItem('chessPuzzleProgress');
        console.log('Progreso guardado en localStorage:', savedProgress);
        
        return savedProgress ? JSON.parse(savedProgress) : {
            solvedPuzzles: [],
            statistics: {
                totalAttempts: 0,
                correctFirstTry: 0
            }
        };
    }

    async initializeApp() {
        try {
            console.log('Iniciando carga de aplicación');
            
            // Mostrar el diálogo de bienvenida antes de continuar
            await this.showWelcomeDialog();
            
            // Configurar el botón de reset
            this.setupResetButton();
            
            // Cargar puzzles
            await this.loadPuzzles();
            console.log('Puzzles cargados:', this.allPuzzles.length);
            
            // Inicializar tablero
            this.initBoard();
            console.log('Tablero inicializado');
            
            // Cargar último puzzle resuelto o el primero
            this.loadLastSolvedPuzzle();
            
            // Actualizar estadísticas
            this.updateProgressDisplay();
            console.log('Estadísticas actualizadas');
            
        } catch (error) {
            console.error('Error en la inicialización:', error);
        }
    }

    setupResetButton() {
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', async () => {
                if (confirm('¿Estás seguro de que quieres reiniciar todo tu progreso? Esta acción no se puede deshacer.')) {
                    // Limpiar localStorage del usuario actual si existe
                    if (this.playerName) {
                        localStorage.removeItem(`chessPuzzleProgress_${this.playerName}`);
                    }
                    
                    // Reiniciar variables de progreso
                    this.userProgress = {
                        solvedPuzzles: [],
                        statistics: {
                            totalAttempts: 0,
                            correctFirstTry: 0
                        }
                    };
                    this.saveProgress = false;
                    this.playerName = '';
                    
                    // Mostrar diálogo de bienvenida nuevamente
                    await this.showWelcomeDialog();
                    
                    // Actualizar la UI
                    this.updateProgressDisplay();
                    this.displayPuzzlePage(1);
                    this.loadPuzzle(0);
                    
                    console.log('Progreso reiniciado completamente');
                }
            });
        }
    }

    async loadPuzzles() {
        const getBasePath = () => {
            const isGitHubPages = window.location.hostname.includes('github.io');
            if (isGitHubPages) {
                return '/Chess-Puzzle-Trainer';
            } else {
                return '.';
            }
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
            // Mostrar error al usuario
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
        console.log('Parseando PGN');
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
                    // Obtener el tipo de mate del tag White
                    const mateType = whiteMatch ? whiteMatch[1] : '';
                    const isMateInOne = mateType.toLowerCase().includes('mate in one');
                    
                    // Traducir el tipo de mate
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
                    
                    console.log(`Puzzle ${i} parseado:`, {
                        moves: moves,
                        tipo: mateDescription
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
            onDrop: (source, target) => this.onDrop(source, target),
            onSnapEnd: () => this.onSnapEnd()
        };
        
        this.board = Chessboard('board', this.boardConfig);
        console.log('Tablero creado');
    }

    displayPuzzlePage(pageNumber) {
        console.log('Mostrando página:', pageNumber);
        const puzzlesPerPage = 10;
        const totalPages = Math.ceil(this.allPuzzles.length / puzzlesPerPage);
        
        // Asegurar que el número de página es válido
        pageNumber = Math.max(1, Math.min(pageNumber, totalPages));
        
        // Crear navegación simplificada
        const navigationHtml = `
            <div class="navigation-controls">
                <button 
                    class="nav-button" 
                    onclick="app.displayPuzzlePage(${pageNumber - 1})"
                    ${pageNumber === 1 ? 'disabled' : ''}>
                    <span class="nav-icon">←</span>
                </button>
                <span class="page-info">${pageNumber} / ${totalPages}</span>
                <button 
                    class="nav-button" 
                    onclick="app.displayPuzzlePage(${pageNumber + 1})"
                    ${pageNumber === totalPages ? 'disabled' : ''}>
                    <span class="nav-icon">→</span>
                </button>
            </div>
        `;

        // Resto del código para mostrar puzzles...
        const start = (pageNumber - 1) * puzzlesPerPage;
        const end = start + puzzlesPerPage;
        const puzzlesForPage = this.allPuzzles.slice(start, end);
        
        let puzzlesHtml = '';
        puzzlesForPage.forEach(puzzle => {
            const isSolved = this.userProgress.solvedPuzzles.includes(puzzle.id);
            puzzlesHtml += `
                <div class="puzzle-item ${isSolved ? 'solved' : ''} ${puzzle === this.currentPuzzle ? 'active' : ''}"
                     onclick="app.loadPuzzle(${puzzle.index})">
                    <span class="puzzle-info">
                        ${puzzle.id}
                        <span class="mate-type">${puzzle.mateType}</span>
                    </span>
                    ${isSolved ? '<span class="solved-mark">✓</span>' : ''}
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
            playerInfo.innerHTML = `
                <span class="label">Jugador</span>
                <span class="name">${this.playerName}</span>
            `;
        } else {
            playerInfo.className = 'player-info guest-mode';
            playerInfo.innerHTML = `
                <span class="label">Modo</span>
                <span class="name">Sin Guardar</span>
            `;
        }
        
        console.log('Actualizando display de progreso');
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
        console.log('Puzzle completado');
        
        // Actualizar progreso
        if (!this.userProgress.solvedPuzzles.includes(this.currentPuzzle.id)) {
            this.userProgress.solvedPuzzles.push(this.currentPuzzle.id);
            if (this.firstAttempt) {
                this.userProgress.statistics.correctFirstTry++;
            }
            this.userProgress.statistics.totalAttempts++;
            
            // Guardar y actualizar UI
            this.saveUserProgress();
            this.updateProgressDisplay();
            
            // Verificar si todos los puzzles de la página actual están resueltos
            const puzzlesPerPage = 10;
            const currentPageStart = (this.currentPage - 1) * puzzlesPerPage;
            const currentPageEnd = Math.min(currentPageStart + puzzlesPerPage, this.allPuzzles.length);
            const currentPagePuzzles = this.allPuzzles.slice(currentPageStart, currentPageEnd);
            
            const allCurrentPagePuzzlesSolved = currentPagePuzzles.every(puzzle => 
                this.userProgress.solvedPuzzles.includes(puzzle.id)
            );

            // Si todos los puzzles de la página actual están resueltos, avanzar a la siguiente página
            if (allCurrentPagePuzzlesSolved) {
                const nextPage = this.currentPage + 1;
                const totalPages = Math.ceil(this.allPuzzles.length / puzzlesPerPage);
                
                if (nextPage <= totalPages) {
                    console.log('Avanzando a la siguiente página:', nextPage);
                    this.displayPuzzlePage(nextPage);
                }
            } else {
                this.displayPuzzlePage(this.currentPage);
            }
            
            console.log('Progreso actualizado:', {
                puzzlesResueltos: this.userProgress.solvedPuzzles.length,
                correctosPrimerIntento: this.userProgress.statistics.correctFirstTry,
                intentosTotales: this.userProgress.statistics.totalAttempts
            });

            // Cargar siguiente puzzle después de un breve delay
            setTimeout(() => {
                const nextIndex = this.currentPuzzle.index + 1;
                if (this.allPuzzles[nextIndex]) {
                    this.loadPuzzle(nextIndex);
                }
            }, 1000);
        }
    }

    loadLastSolvedPuzzle() {
        console.log('Cargando último puzzle resuelto');
        
        if (this.userProgress.solvedPuzzles.length > 0) {
            // Encontrar el índice del último puzzle resuelto
            const lastSolvedId = this.userProgress.solvedPuzzles[this.userProgress.solvedPuzzles.length - 1];
            const lastSolvedPuzzle = this.allPuzzles.find(p => p.id === lastSolvedId);
            
            if (lastSolvedPuzzle) {
                const nextPuzzleIndex = lastSolvedPuzzle.index + 1;
                
                // Cargar el siguiente puzzle después del último resuelto
                if (this.allPuzzles[nextPuzzleIndex]) {
                    console.log('Cargando siguiente puzzle después del último resuelto:', nextPuzzleIndex);
                    this.loadPuzzle(nextPuzzleIndex);
                    
                    // Calcular y mostrar la página correcta
                    const puzzlesPerPage = 10;
                    const pageNumber = Math.floor(nextPuzzleIndex / puzzlesPerPage) + 1;
                    this.displayPuzzlePage(pageNumber);
                } else {
                    // Si no hay siguiente, cargar el último
                    console.log('No hay más puzzles, cargando el último resuelto');
                    this.loadPuzzle(lastSolvedPuzzle.index);
                    const pageNumber = Math.floor(lastSolvedPuzzle.index / puzzlesPerPage) + 1;
                    this.displayPuzzlePage(pageNumber);
                }
            }
        } else {
            // Si no hay puzzles resueltos, empezar desde el principio
            console.log('No hay puzzles resueltos, comenzando desde el principio');
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
                this.updateProgressDisplay(); // Actualizar para mostrar "Modo sin guardar"
                resolve();
            });

            saveButton.addEventListener('click', () => {
                const name = nameInput.value.trim();
                if (name) {
                    this.saveProgress = true;
                    this.playerName = name;
                    // Cargar progreso previo si existe
                    const savedProgress = localStorage.getItem(`chessPuzzleProgress_${this.playerName}`);
                    if (savedProgress) {
                        this.userProgress = JSON.parse(savedProgress);
                    }
                    modal.style.display = 'none';
                    this.updateProgressDisplay(); // Actualizar para mostrar el nombre
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
        
        // Actualizar turno
        const turn = this.game.turn() === 'w' ? 'Blancas' : 'Negras';
        turnIndicator.textContent = turn;
        turnIndicator.className = 'value ' + (turn === 'Blancas' ? 'white' : 'black');
        
        // Actualizar tipo de puzzle
        puzzleType.textContent = this.currentPuzzle.mateType;
    }
}

// Inicializar la aplicación cuando la página esté completamente cargada
window.addEventListener('load', () => {
    console.log('Página completamente cargada, iniciando aplicación');
    window.app = new ChessPuzzleSolver();
}); 