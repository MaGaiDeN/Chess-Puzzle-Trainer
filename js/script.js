class ChessPuzzleSolver {
    constructor() {
        // Referencias DOM
        this.boardContainer = document.getElementById('board');
        this.dbStats = document.getElementById('dbStats');
        this.puzzlesList = document.getElementById('puzzlesList');
        this.pgnStatus = document.getElementById('pgnStatus');
        this.checkSolutionButton = document.getElementById('checkSolution');
        this.evalContent = document.getElementById('engineEvaluation');
        this.loadDBButton = document.getElementById('loadDB');
        this.dbFileInput = document.getElementById('dbFile');
        this.movesNotation = document.getElementById('movesNotation');

        // Estado inicial
        this.engineActive = false;
        this.isAnalyzing = false;
        this.stockfishReady = false;
        this.pendingAnalysis = false;
        this.puzzles = [];
        this.currentPuzzleIndex = -1;
        this.moveHistory = [];
        this.currentMoveIndex = -1;

        // Inicializar el juego
        this.game = new Chess();
        
        // Inicializar el tablero
        this.initializeBoard();
        
        // Inicializar Stockfish
        this.initializeStockfish();

        // Configurar event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botón de carga de base de datos
        if (this.loadDBButton && this.dbFileInput) {
            this.loadDBButton.addEventListener('click', () => {
                console.log('Botón Load DB clickeado');
                this.dbFileInput.click();
            });

            this.dbFileInput.addEventListener('change', (e) => {
                console.log('Archivo seleccionado');
                const file = e.target.files[0];
                if (file) {
                    console.log('Cargando archivo:', file.name);
                    this.loadPuzzlesFromPGN(file);
                }
            });
        }

        // Botón de Stockfish
        if (this.checkSolutionButton) {
            this.checkSolutionButton.addEventListener('click', () => {
                console.log('Botón Stockfish clickeado');
                this.toggleEngine();
            });
        }

        // Botones de navegación
        document.getElementById('startBtn')?.addEventListener('click', () => this.goToStart());
        document.getElementById('prevBtn')?.addEventListener('click', () => this.goToPrevious());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.goToNext());
        document.getElementById('endBtn')?.addEventListener('click', () => this.goToEnd());
    }

    initializeBoard() {
        const config = {
            position: 'start',
            draggable: true,
            onDrop: (source, target) => this.onDrop(source, target),
            onDragStart: (source, piece) => this.onDragStart(source, piece),
            onSnapEnd: () => this.onSnapEnd(),
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        };
        
        this.board = Chessboard('board', config);
        window.addEventListener('resize', () => {
            if (this.board) this.board.resize();
        });
    }

    initializeStockfish() {
        try {
            console.log('Iniciando inicialización de Stockfish');
            this.stockfish = new Worker('./js/stockfish/stockfish.js');
            
            this.stockfish.onmessage = (event) => {
                const message = event.data;
                console.log('Mensaje de Stockfish:', message);

                if (message === 'uciok') {
                    this.stockfish.postMessage('isready');
                }
                else if (message === 'readyok') {
                    console.log('Stockfish está listo');
                    this.stockfishReady = true;
                    if (this.pendingAnalysis) {
                        this.pendingAnalysis = false;
                        this.analyzePosition();
                    }
                }
                else {
                    this.handleStockfishMessage(event);
                }
            };
            
            this.stockfish.onerror = (error) => {
                console.error('Error de Stockfish:', error);
                this.stockfishReady = false;
            };

            this.stockfish.postMessage('uci');
            
        } catch (error) {
            console.error('Error al inicializar Stockfish:', error);
            this.stockfishReady = false;
        }
    }

    loadPuzzlesFromPGN(file) {
        console.log('Iniciando carga de archivo PGN');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                console.log('Archivo leído, procesando contenido');
                const pgnContent = e.target.result;
                console.log('Tamaño del contenido:', pgnContent.length);
                
                const games = this.parsePGN(pgnContent);
                console.log('Juegos encontrados:', games.length);

                this.puzzles = games.map((game, index) => ({
                    id: game.headers.White || `Puzzle ${index + 1}`,
                    fen: game.headers.FEN || 'start',
                    moves: game.moves || [],
                    description: game.headers.Annotator || 'Sin descripción',
                    index: index + 1
                }));

                console.log('Puzzles procesados:', this.puzzles.length);

                this.updateDatabaseInfo();
                this.updatePuzzlesList();
                
                if (this.puzzles.length > 0) {
                    console.log('Cargando primer puzzle');
                    this.loadPuzzle(0);
                }

            } catch (error) {
                console.error('Error al procesar el archivo PGN:', error);
                if (this.pgnStatus) {
                    this.pgnStatus.innerHTML = `
                        <div class="error-message">
                            Error al procesar el archivo: ${error.message}
                        </div>
                    `;
                }
            }
        };

        reader.onerror = (error) => {
            console.error('Error al leer el archivo:', error);
            if (this.pgnStatus) {
                this.pgnStatus.innerHTML = `
                    <div class="error-message">
                        Error al leer el archivo: ${error}
                    </div>
                `;
            }
        };

        reader.readAsText(file);
    }

    parsePGN(pgnContent) {
        console.log('Iniciando parseo de PGN');
        const games = [];
        const gameStrings = pgnContent.split(/\n\s*\n(?=\[)/);
        console.log('Juegos encontrados:', gameStrings.length);

        gameStrings.forEach((gameString, index) => {
            if (!gameString.trim()) return;

            try {
                const game = {
                    headers: {},
                    moves: []
                };

                const headerRegex = /\[(.*?)\s+"(.*?)"\]/g;
                let match;
                while ((match = headerRegex.exec(gameString)) !== null) {
                    game.headers[match[1]] = match[2];
                }

                const moveText = gameString.replace(headerRegex, '').trim();
                if (moveText) {
                    game.moves = moveText.split(/\d+\./).filter(Boolean).map(m => m.trim());
                }

                if (game.headers.FEN) {
                    games.push(game);
                    console.log(`Juego ${index + 1} procesado correctamente`);
                }
            } catch (error) {
                console.error(`Error al parsear juego ${index}:`, error);
            }
        });

        console.log('Total de juegos válidos:', games.length);
        return games;
    }

    updateDatabaseInfo() {
        if (this.dbStats && this.puzzles) {
            console.log('Actualizando información de la base de datos');
            this.dbStats.innerHTML = `
                <div class="database-info">
                    <h3>Base de Datos de Puzzles</h3>
                    <p><strong>Total de problemas:</strong> ${this.puzzles.length}</p>
                    <p><strong>Fecha de carga:</strong> ${new Date().toLocaleString()}</p>
                </div>
            `;
        }
    }

    updatePuzzlesList() {
        if (!this.puzzlesList || !this.puzzles) return;
        
        console.log('Actualizando lista de puzzles');
        let html = `<div class="puzzles-header">Puzzles (${this.puzzles.length})</div>`;
        
        this.puzzles.forEach((puzzle, index) => {
            html += `
                <div class="puzzle-item ${index === this.currentPuzzleIndex ? 'active' : ''}" 
                     data-index="${index}">
                    <div class="puzzle-title">Puzzle ${puzzle.index}</div>
                    <div class="puzzle-description">${puzzle.description}</div>
                </div>
            `;
        });

        this.puzzlesList.innerHTML = html;

        const items = this.puzzlesList.querySelectorAll('.puzzle-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.loadPuzzle(index);
            });
        });
    }

    loadPuzzle(index) {
        if (!this.puzzles || !this.puzzles[index]) return;
        
        console.log('Cargando puzzle:', index);
        this.currentPuzzleIndex = index;
        const puzzle = this.puzzles[index];
        
        this.game = new Chess(puzzle.fen);
        this.board.position(puzzle.fen);
        console.log('Posición inicial establecida:', puzzle.fen);
        
        this.moveHistory = [];
        this.currentMoveIndex = -1;
        
        this.engineActive = false;
        if (this.checkSolutionButton) {
            this.checkSolutionButton.textContent = 'Activar Stockfish';
            this.checkSolutionButton.classList.remove('active');
        }
        if (this.evalContent) {
            this.evalContent.innerHTML = '';
        }
        
        this.updateMovesNotation();
        this.updateNavigationButtons();
        this.updatePuzzlesList();
    }

    toggleEngine() {
        console.log('toggleEngine llamado');
        this.engineActive = !this.engineActive;
        
        if (this.engineActive) {
            console.log('Activando motor');
            if (this.checkSolutionButton) {
                this.checkSolutionButton.textContent = 'Desactivar Stockfish';
                this.checkSolutionButton.classList.add('active');
            }
            if (!this.stockfishReady) {
                this.initializeStockfish();
            }
            this.analyzePosition();
        } else {
            console.log('Desactivando motor');
            if (this.checkSolutionButton) {
                this.checkSolutionButton.textContent = 'Activar Stockfish';
                this.checkSolutionButton.classList.remove('active');
            }
            if (this.evalContent) {
                this.evalContent.innerHTML = '';
            }
            if (this.stockfish) {
                this.stockfish.postMessage('stop');
                this.isAnalyzing = false;
            }
        }
    }

    analyzePosition() {
        console.log('analyzePosition llamado');
        
        if (!this.engineActive || !this.evalContent) {
            console.log('Análisis cancelado - motor inactivo o sin contenedor');
            return;
        }

        if (!this.stockfishReady) {
            console.log('Stockfish no está listo, poniendo análisis en espera');
            this.pendingAnalysis = true;
            return;
        }

        try {
            if (this.isAnalyzing) {
                console.log('Deteniendo análisis anterior');
                this.stockfish.postMessage('stop');
            }

            this.isAnalyzing = true;
            const fen = this.game.fen();
            console.log('Posición a analizar:', fen);

            this.evalContent.innerHTML = `
                <div class="evaluation-panel">
                    <div class="eval-header">Stockfish</div>
                    <div class="eval-content">
                        <p>Analizando posición...</p>
                    </div>
                </div>
            `;

            this.stockfish.postMessage('ucinewgame');
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage('go depth 20');

        } catch (error) {
            console.error('Error en analyzePosition:', error);
            this.isAnalyzing = false;
            if (this.evalContent) {
                this.evalContent.innerHTML = `
                    <div class="evaluation-panel">
                        <div class="eval-header">Error</div>
                        <div class="eval-content error-message">
                            Error al iniciar el análisis: ${error.message}
                        </div>
                    </div>
                `;
            }
        }
    }

    handleStockfishMessage(event) {
        const message = event.data;
        
        if (typeof message !== 'string') return;
        
        if (message.includes('info depth') && message.includes('pv')) {
            const tokens = message.split(' ');
            const pvIndex = tokens.indexOf('pv');
            const cpIndex = tokens.indexOf('cp');
            const mateIndex = tokens.indexOf('mate');
            const depthIndex = tokens.indexOf('depth');
            
            if (pvIndex !== -1 && depthIndex !== -1) {
                const depth = tokens[depthIndex + 1];
                
                let evaluationText = '';
                if (cpIndex !== -1) {
                    const evaluation = parseInt(tokens[cpIndex + 1]) / 100;
                    evaluationText = evaluation >= 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2);
                } else if (mateIndex !== -1) {
                    const mateIn = tokens[mateIndex + 1];
                    evaluationText = `Mate en ${Math.abs(mateIn)}`;
                }

                const pvMoves = tokens.slice(pvIndex + 1, pvIndex + 6);
                const formattedLine = this.formatPVLine(pvMoves);

                this.evalContent.innerHTML = `
                    <div class="evaluation-panel">
                        <div class="eval-header">Análisis de Stockfish</div>
                        <div class="eval-content">
                            <p><strong>Evaluación:</strong> ${evaluationText}</p>
                            <p><strong>Profundidad:</strong> ${depth}</p>
                            <p><strong>Línea principal:</strong></p>
                            <div class="pv-line">${formattedLine}</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    formatPVLine(moves) {
        try {
            const tempGame = new Chess(this.game.fen());
            let formattedLine = '';
            let moveNumber = Math.ceil(tempGame.history().length / 2) + 1;

            moves.forEach((moveUCI, index) => {
                try {
                    const from = moveUCI.substring(0, 2);
                    const to = moveUCI.substring(2, 4);
                    const promotion = moveUCI.length > 4 ? moveUCI[4] : undefined;

                    const move = tempGame.move({
                        from: from,
                        to: to,
                        promotion: promotion
                    });

                    if (move) {
                        if (index === 0 || tempGame.turn() === 'w') {
                            formattedLine += `${moveNumber}. `;
                            if (tempGame.turn() === 'w') {
                                moveNumber++;
                            }
                        }
                        formattedLine += `${move.san} `;
                    }
                } catch (error) {
                    console.error('Error al procesar movimiento:', moveUCI, error);
                }
            });

            return formattedLine || 'No hay movimientos disponibles';
        } catch (error) {
            console.error('Error al formatear línea:', error);
            return 'Error al mostrar la línea';
        }
    }

    goToStart() {
        console.log('goToStart llamado');
        if (this.currentMoveIndex === -1) return;
        
        this.currentMoveIndex = -1;
        const initialFen = this.puzzles[this.currentPuzzleIndex]?.fen || 'start';
        this.game = new Chess(initialFen);
        this.board.position(initialFen);
        
        console.log('Posición inicial establecida:', initialFen);
        
        this.updateMovesNotation();
        this.updateNavigationButtons();

        if (this.engineActive) {
            this.analyzePosition();
        }
    }

    goToPrevious() {
        console.log('goToPrevious llamado');
        if (this.currentMoveIndex < 0) return;
        
        this.currentMoveIndex--;
        const initialFen = this.puzzles[this.currentPuzzleIndex]?.fen || 'start';
        this.game = new Chess(initialFen);
        
        for (let i = 0; i <= this.currentMoveIndex; i++) {
            const move = this.moveHistory[i];
            console.log(`Reproduciendo movimiento ${i + 1}:`, move.san);
            this.game.move(move);
        }
        
        this.board.position(this.game.fen());
        console.log('Nueva posición FEN:', this.game.fen());
        
        this.updateMovesNotation();
        this.updateNavigationButtons();

        if (this.engineActive) {
            this.analyzePosition();
        }
    }

    goToNext() {
        console.log('goToNext llamado');
        if (this.currentMoveIndex >= this.moveHistory.length - 1) return;
        
        this.currentMoveIndex++;
        const move = this.moveHistory[this.currentMoveIndex];
        console.log(`Realizando movimiento:`, move.san);
        
        this.game.move(move);
        this.board.position(this.game.fen());
        console.log('Nueva posición FEN:', this.game.fen());
        
        this.updateMovesNotation();
        this.updateNavigationButtons();

        if (this.engineActive) {
            this.analyzePosition();
        }
    }

    goToEnd() {
        console.log('goToEnd llamado');
        if (this.currentMoveIndex >= this.moveHistory.length - 1) return;
        
        const initialFen = this.puzzles[this.currentPuzzleIndex]?.fen || 'start';
        this.game = new Chess(initialFen);
        
        this.moveHistory.forEach((move, index) => {
            console.log(`Reproduciendo movimiento ${index + 1}:`, move.san);
            this.game.move(move);
        });
        
        this.currentMoveIndex = this.moveHistory.length - 1;
        this.board.position(this.game.fen());
        console.log('Posición final FEN:', this.game.fen());
        
        this.updateMovesNotation();
        this.updateNavigationButtons();

        if (this.engineActive) {
            this.analyzePosition();
        }
    }

    onDragStart(source, piece) {
        if (this.game.game_over()) return false;
        
        if ((this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        return true;
    }

    onDrop(source, target) {
        try {
            const move = this.game.move({
                from: source,
                to: target,
                promotion: 'q'
            });

            if (move === null) return 'snapback';

            if (this.currentMoveIndex < this.moveHistory.length - 1) {
                this.moveHistory = this.moveHistory.slice(0, this.currentMoveIndex + 1);
            }

            this.moveHistory.push(move);
            this.currentMoveIndex++;

            this.updateMovesNotation();
            this.updateNavigationButtons();

            if (this.engineActive) {
                this.analyzePosition();
            }

            return move;
        } catch (error) {
            console.error('Error en onDrop:', error);
            return 'snapback';
        }
    }

    onSnapEnd() {
        this.board.position(this.game.fen());
    }

    updateMovesNotation() {
        if (!this.movesNotation) return;

        // Mapeo de piezas a notación española
        const piezas = {
            'K': '♔', // Rey
            'Q': '♕', // Dama
            'R': '♖', // Torre
            'B': '♗', // Alfil
            'N': '♘', // Caballo
            'P': ''   // Peón (no se indica en notación española)
        };

        let html = '';
        this.moveHistory.forEach((move, index) => {
            if (index % 2 === 0) {
                html += `${Math.floor(index/2 + 1)}. `;
            }

            // Convertir la notación algebraica a española
            let spanishMove = move.san;
            
            // Reemplazar las letras de las piezas por símbolos
            Object.entries(piezas).forEach(([piece, symbol]) => {
                if (piece !== 'P') {
                    spanishMove = spanishMove.replace(new RegExp(piece, 'g'), symbol);
                }
            });

            // Reemplazar 'x' por ':' para capturas
            spanishMove = spanishMove.replace('x', ':');

            const moveClass = index <= this.currentMoveIndex ? 'move active' : 'move';
            html += `<span class="${moveClass}">${spanishMove} </span>`;
        });

        this.movesNotation.innerHTML = html;
    }

    updateNavigationButtons() {
        const startBtn = document.getElementById('startBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const endBtn = document.getElementById('endBtn');

        if (startBtn) startBtn.disabled = this.currentMoveIndex < 0;
        if (prevBtn) prevBtn.disabled = this.currentMoveIndex < 0;
        if (nextBtn) nextBtn.disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
        if (endBtn) endBtn.disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
    }

    cleanup() {
        if (this.stockfish) {
            this.stockfish.postMessage('quit');
            this.stockfish.terminate();
            this.stockfishReady = false;
            this.isAnalyzing = false;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando aplicación');
    window.chessPuzzleSolver = new ChessPuzzleSolver();
});

// Limpiar recursos al cerrar la ventana
window.addEventListener('beforeunload', () => {
    if (window.chessPuzzleSolver) {
        window.chessPuzzleSolver.cleanup();
    }
}); 