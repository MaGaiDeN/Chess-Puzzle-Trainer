class ChessPuzzleSolver {
    constructor() {
        this.allPuzzles = [];
        this.currentPuzzle = null;
        this.moveHistory = [];
        this.puzzlesPerPage = 10;
        this.game = new Chess();
        this.solvedPuzzles = new Set();

        // Configuración del tablero
        const config = {
            draggable: true,
            position: 'start',
            onDrop: (source, target) => this.onDrop(source, target),
            pieceTheme: 'https://lichess1.org/assets/piece/cburnett/{piece}.svg',
            width: 400
        };

        // Inicializar el tablero y cargar puzzles después de que el DOM esté listo
        window.addEventListener('DOMContentLoaded', () => {
            this.board = Chessboard('board', config);
            $(window).resize(() => this.board.resize());
            
            // Cargar los puzzles inmediatamente después de inicializar el tablero
            this.loadPuzzles().then(() => {
                // Mostrar la primera página de puzzles
                this.displayPuzzlePage(0);
                
                // Cargar el primer puzzle si existe
                if (this.allPuzzles.length > 0) {
                    this.loadPuzzle(this.allPuzzles[0]);
                }
            });
        });
    }

    async loadPuzzles() {
        try {
            const response = await fetch('Mate_en_Dos.pgn');
            const pgnText = await response.text();
            
            // Dividir el texto en juegos individuales
            const games = pgnText.split(/(\[Event)/)
                .filter(text => text.trim())  // Eliminar líneas vacías
                .map((text, index) => {
                    if (index > 0 && !text.startsWith('[Event')) {
                        return '[Event' + text;
                    }
                    return text;
                })
                .filter(game => game.includes('[FEN'));  // Asegurar que solo procesamos juegos con FEN
            
            console.log('Juegos encontrados:', games.length);
            
            this.allPuzzles = this.parsePGNChunk(games);
            console.log('Puzzles procesados:', this.allPuzzles.length);
            
            if (this.allPuzzles.length > 0) {
                this.displayPuzzlePage(0);
                this.loadPuzzle(0);
            }
        } catch (error) {
            console.error('Error al cargar los puzzles:', error);
        }
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

    loadPuzzle(puzzleOrIndex) {
        let puzzle;
        if (typeof puzzleOrIndex === 'number') {
            puzzle = this.allPuzzles[puzzleOrIndex];
            this.currentPuzzleIndex = puzzleOrIndex;
        } else {
            puzzle = puzzleOrIndex;
            this.currentPuzzleIndex = this.allPuzzles.indexOf(puzzle);
        }
        
        if (!puzzle) return;
        
        console.log('Cargando puzzle:', puzzle);
        
        this.currentPuzzle = puzzle;
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
        if (this.updateNavigationButtons) this.updateNavigationButtons();
        if (this.updatePuzzlesList) this.updatePuzzlesList();
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
            
            if (this.evalContent) {
                this.evalContent.style.display = 'block';
                this.evalContent.innerHTML = `
                    <div class="evaluation-panel">
                        <div class="eval-content">
                            <p>Iniciando análisis...</p>
                        </div>
                    </div>
                `;
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
                this.evalContent.style.display = 'none';
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
            
            if (pvIndex !== -1) {
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

                if (this.evalContent) {
                    this.evalContent.innerHTML = `
                        <div class="evaluation-panel">
                            <div class="eval-content">
                                <span><strong>${evaluationText}</strong> ${formattedLine}</span>
                            </div>
                        </div>
                    `;
                }
            }
        }
    }

    formatPVLine(moves) {
        try {
            const piezas = {
                'K': '♔', 'Q': '♕', 'R': '♖', 
                'B': '♗', 'N': '♘', 'P': ''
            };

            const tempGame = new Chess(this.game.fen());
            let formattedLine = '';
            let moveNumber = Math.ceil(tempGame.history().length / 2) + 1;
            let isFirstMove = true;

            moves.forEach((moveUCI) => {
                const move = tempGame.move({
                    from: moveUCI.substring(0, 2),
                    to: moveUCI.substring(2, 4),
                    promotion: moveUCI.length > 4 ? moveUCI[4] : undefined
                });

                if (move) {
                    if (isFirstMove || tempGame.turn() === 'w') {
                        formattedLine += ` ${moveNumber}.`;
                        if (tempGame.turn() === 'b') moveNumber++;
                    }
                    formattedLine += ` ${move.san}`;
                    isFirstMove = false;
                }
            });

            return formattedLine.trim();
        } catch (error) {
            console.error('Error en formatPVLine:', error);
            return '';
        }
    }

    makeOpponentMove() {
        try {
            const moveIndex = this.moveHistory.length;
            const opponentMoveStr = this.currentPuzzle.moves[moveIndex];
            console.log('Realizando movimiento del oponente:', opponentMoveStr);

            // Encontrar el movimiento en el formato correcto
            const possibleMoves = this.game.moves({ verbose: true });
            const opponentMove = possibleMoves.find(m => {
                const moveStr = this.game.move(m).san;
                this.game.undo();
                return moveStr.replace(/[+#]$/, '').trim() === opponentMoveStr.replace(/[+#]$/, '').trim();
            });

            if (opponentMove) {
                // Realizar el movimiento
                const move = this.game.move(opponentMove);
                this.moveHistory.push(move);
                this.updateMovesNotation();

                // Animar el movimiento en el tablero
                const config = {
                    duration: 300,
                    onComplete: () => {
                        if (moveIndex < this.currentPuzzle.moves.length - 1) {
                            console.log('Esperando siguiente movimiento del jugador...');
                        }
                    }
                };

                this.board.move(`${opponentMove.from}-${opponentMove.to}`, config);
            } else {
                console.error('No se pudo encontrar el movimiento del oponente:', opponentMoveStr);
            }
        } catch (error) {
            console.error('Error en makeOpponentMove:', error);
        }
    }

    updateMovesNotation() {
        const movesElement = document.getElementById('movesList');
        if (movesElement) {
            movesElement.innerHTML = this.moveHistory.map(m => m.san).join(' ');
        }
    }

    showMessage(message) {
        alert(message);
    }

    undoLastMove(message) {
        setTimeout(() => {
            this.showMessage(message);
            this.game.undo();
            this.moveHistory.pop();
            this.updateMovesNotation();
            this.board.position(this.game.fen());
        }, 100);
    }

    parsePGNChunk(games) {
        return games.map((gameString, index) => {
            const fenMatch = gameString.match(/\[FEN "(.*?)"\]/);
            const titleMatch = gameString.match(/\[White "(.*?)"\]/);
            
            // Extraer el movimiento de la notación
            const moveMatch = gameString.match(/1\.(.*?)\*/);
            let moves = [];
            
            if (moveMatch) {
                // Limpiar y separar los movimientos
                moves = [moveMatch[1].trim()];
            }

            let description = 'Sin descripción';
            if (titleMatch) {
                const title = titleMatch[1].toLowerCase();
                if (title.includes('mate in one')) {
                    description = 'Mate en uno';
                } else if (title.includes('mate in two')) {
                    description = 'Mate en dos';
                }
            }

            if (fenMatch && moves.length > 0) {
                return {
                    id: `Puzzle ${index + 1}`,
                    fen: fenMatch[1],
                    moves: moves,
                    description: description,
                    index: index + 1
                };
            }
            return null;
        }).filter(puzzle => puzzle !== null);
    }

    displayPuzzlePage(pageNumber) {
        const startIndex = pageNumber * this.puzzlesPerPage;
        const endIndex = startIndex + this.puzzlesPerPage;
        const puzzlesForPage = this.allPuzzles.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.allPuzzles.length / this.puzzlesPerPage);
        
        const puzzlesList = document.getElementById('puzzlesList');
        if (!puzzlesList) return;

        // Header con información y navegación
        let html = `
            <div class="puzzles-header">
                <div>Puzzles (${this.allPuzzles.length})</div>
                <div>Página ${pageNumber + 1} de ${totalPages}</div>
            </div>
            <div class="pagination">
                <button ${pageNumber === 0 ? 'disabled' : ''} 
                        onclick="app.displayPuzzlePage(0)">
                    « Inicio
                </button>
                <button ${pageNumber === 0 ? 'disabled' : ''} 
                        onclick="app.displayPuzzlePage(${pageNumber - 1})">
                    ‹ Anterior
                </button>
                <span class="page-info">${pageNumber + 1} / ${totalPages}</span>
                <button ${pageNumber >= totalPages - 1 ? 'disabled' : ''} 
                        onclick="app.displayPuzzlePage(${pageNumber + 1})">
                    Siguiente ›
                </button>
                <button ${pageNumber >= totalPages - 1 ? 'disabled' : ''} 
                        onclick="app.displayPuzzlePage(${totalPages - 1})">
                    Final »
                </button>
            </div>
        `;

        // Lista de puzzles
        puzzlesForPage.forEach((puzzle, index) => {
            const absoluteIndex = startIndex + index;
            const isActive = absoluteIndex === this.currentPuzzleIndex;
            const isSolved = this.solvedPuzzles.has(absoluteIndex);
            
            html += `
                <div class="puzzle-item ${isActive ? 'active' : ''} ${isSolved ? 'solved' : ''}" 
                     data-index="${absoluteIndex}">
                    <div class="puzzle-title">Puzzle ${puzzle.index}</div>
                    <div class="puzzle-description">${puzzle.description}</div>
                </div>
            `;
        });

        puzzlesList.innerHTML = html;

        // Agregar event listeners a los items
        const items = puzzlesList.querySelectorAll('.puzzle-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.loadPuzzle(index);
            });
        });
    }

    onDrop(source, target) {
        try {
            const move = this.game.move({
                from: source,
                to: target,
                promotion: 'q'
            });

            if (move === null) return 'snapback';

            this.moveHistory.push(move);
            this.updateMovesNotation();

            const isMateInTwo = this.currentPuzzle.description === 'Mate en dos';
            
            if (isMateInTwo) {
                // Separar los movimientos del mate en dos
                const fullMoves = this.currentPuzzle.moves[0];
                console.log('Movimientos completos:', fullMoves);
                
                // Extraer los movimientos usando regex
                const movePattern = /(\S+)\s+(\S+)\s+2\.(\S+)/;
                const matches = fullMoves.match(movePattern);
                
                if (matches) {
                    const firstMove = matches[1];    // Primer movimiento (ej: Qg6+)
                    const opponentMove = matches[2]; // Respuesta (ej: Qxg6)
                    const mateMove = matches[3];     // Movimiento de mate (ej: Rxg6#)
                    
                    console.log('Primer movimiento esperado:', firstMove);
                    console.log('Respuesta del oponente:', opponentMove);
                    console.log('Movimiento de mate:', mateMove);
                    
                    const moveIndex = this.moveHistory.length - 1;
                    const cleanMove = move.san;
                    
                    if (moveIndex === 0) {
                        // Verificar primer movimiento
                        if (cleanMove === firstMove) {
                            // Hacer el movimiento del oponente
                            setTimeout(() => {
                                const move = this.game.move(opponentMove);
                                if (move) {
                                    this.moveHistory.push(move);
                                    this.updateMovesNotation();
                                    this.board.position(this.game.fen());
                                }
                            }, 500);
                        } else {
                            this.undoLastMove('¡Movimiento incorrecto! Intenta de nuevo.');
                        }
                    } else if (moveIndex === 2) {
                        // Verificar movimiento de mate
                        if (cleanMove === mateMove) {
                            this.solvedPuzzles.add(this.currentPuzzleIndex);
                            setTimeout(() => {
                                const nextIndex = this.currentPuzzleIndex + 1;
                                if (nextIndex < this.allPuzzles.length) {
                                    this.loadPuzzle(nextIndex);
                                    const nextPage = Math.floor(nextIndex / this.puzzlesPerPage);
                                    this.displayPuzzlePage(nextPage);
                                }
                            }, 500);
                        } else {
                            this.undoLastMove('¡Movimiento incorrecto! Intenta de nuevo.');
                        }
                    }
                }
            } else {
                // Lógica para mates en uno (sin cambios)
                const expectedMove = this.currentPuzzle.moves[0];
                const cleanMove = move.san;
                const cleanExpectedMove = expectedMove.replace(/\s*\*$/, '').trim();

                if (cleanMove === cleanExpectedMove) {
                    this.solvedPuzzles.add(this.currentPuzzleIndex);
                    setTimeout(() => {
                        const nextIndex = this.currentPuzzleIndex + 1;
                        if (nextIndex < this.allPuzzles.length) {
                            this.loadPuzzle(nextIndex);
                            const nextPage = Math.floor(nextIndex / this.puzzlesPerPage);
                            this.displayPuzzlePage(nextPage);
                        }
                    }, 500);
                } else {
                    this.undoLastMove('¡Movimiento incorrecto! Intenta de nuevo.');
                }
            }

        } catch (error) {
            console.error('Error en onDrop:', error);
            return 'snapback';
        }
    }
}

// Inicializar la aplicación
const app = new ChessPuzzleSolver(); 