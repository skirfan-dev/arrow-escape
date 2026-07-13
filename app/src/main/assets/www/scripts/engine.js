/**
 * Arrow Escape - Game Engine
 * Manages grid states, arrow sliding physics, collision checks, Undo/Redo operations,
 * active hints, and different game modes (Classic, Infinite, Daily, Timed, Zen, Hardcore).
 */

class GameEngine {
    constructor() {
        this.arrows = [];
        this.gridSize = 3;
        this.currentLevelData = null;
        this.moveCount = 0;
        this.undoStack = [];
        this.redoStack = [];
        this.isCompleted = false;
        this.hintArrowId = null;
        
        // Game state variables
        this.gameMode = "classic"; // 'classic', 'infinite', 'daily', 'timed', 'zen', 'hardcore'
        this.score = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.timeElapsed = 0;
        
        // Interaction states
        this.selectedArrowId = null;
        this.touchStart = { x: 0, y: 0 };
    }

    /**
     * Start a level
     */
    startLevel(levelData, mode = "classic") {
        this.currentLevelData = levelData;
        this.gridSize = levelData.size;
        this.gameMode = mode;
        this.isCompleted = false;
        this.moveCount = 0;
        this.undoStack = [];
        this.redoStack = [];
        this.hintArrowId = null;
        this.selectedArrowId = null;
        this.timeElapsed = 0;

        // Clear previous level's snapshot when starting a new level
        storage.clearSnapshot();

        // Clone arrows to prevent mutating original procedural level data
        this.arrows = levelData.arrows.map(a => ({
            id: a.id,
            r: a.r,
            c: a.c,
            dir: a.dir,
            offsetX: 0,
            offsetY: 0,
            alpha: 1,
            isSliding: false,
            slideProgress: 0,
            isShaking: false,
            shakeOffset: 0,
            shakeFrames: 0
        }));

        // Reset stats timers
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Mode specific setups
        if (mode === "timed" && this.score === 0) {
            this.timer = 120; // 2 minutes starting timer
        }
        
        this.timerInterval = setInterval(() => {
            this.timeElapsed++;
            if (this.gameMode === "timed") {
                this.timer--;
                if (this.timer <= 0) {
                    this.timer = 0;
                    clearInterval(this.timerInterval);
                    if (window.ui) window.ui.showTimedGameOver();
                }
            }
            if (window.ui) window.ui.updateStatusPanel();
        }, 1000);

        // Auto-save the active state (except for daily/timed modes which shouldn't resume halfway)
        if (mode === "classic" || mode === "infinite" || mode === "zen" || mode === "hardcore") {
            this.saveGameState();
        }

        if (window.ui) {
            window.ui.initCanvas();
            window.ui.updateStatusPanel();
        }
    }

    /**
     * Save snapshot of current board state to Undo stack
     */
    pushStateToUndo() {
        // Deep copy remaining arrows
        const snapshot = this.arrows.map(a => ({
            id: a.id,
            r: a.r,
            c: a.c,
            dir: a.dir,
            offsetX: 0,
            offsetY: 0,
            alpha: 1,
            isSliding: false,
            slideProgress: 0,
            isShaking: false,
            shakeOffset: 0,
            shakeFrames: 0
        }));
        this.undoStack.push(snapshot);
        this.redoStack = []; // Clear redo stack on new move
    }

    /**
     * Revert to previous board snapshot
     */
    undo() {
        if (this.gameMode === "hardcore") return; // No undo in hardcore!
        if (this.undoStack.length === 0 || this.isCompleted) return;

        audio.playUndo();
        utils.vibrate(30);

        // Push current state to redo stack
        const currentSnapshot = this.arrows.map(a => ({ ...a }));
        this.redoStack.push(currentSnapshot);

        this.arrows = this.undoStack.pop();
        this.moveCount++;
        this.hintArrowId = null;

        // Log stats
        const stats = storage.getStats();
        stats.undoCount++;
        storage.saveStats(stats);

        this.saveGameState();
        this.checkAndSaveSnapshot();
        if (window.ui) window.ui.updateStatusPanel();
    }

    /**
     * Restore undone move
     */
    redo() {
        if (this.gameMode === "hardcore") return;
        if (this.redoStack.length === 0 || this.isCompleted) return;

        audio.playClick();
        utils.vibrate(20);

        // Push current state to undo stack
        const currentSnapshot = this.arrows.map(a => ({ ...a }));
        this.undoStack.push(currentSnapshot);

        this.arrows = this.redoStack.pop();
        this.moveCount++;
        this.hintArrowId = null;

        this.saveGameState();
        this.checkAndSaveSnapshot();
        if (window.ui) window.ui.updateStatusPanel();
    }

    /**
     * Ask solver for the single correct next move
     */
    getHint() {
        if (this.isCompleted) return;

        audio.playHint();
        utils.vibrate([20, 50, 20]);

        // Run solver on current remaining arrows
        const currentPuzzleState = this.arrows.filter(a => !a.isSliding);
        const result = solver.solve(currentPuzzleState, this.gridSize);

        if (result.solvable && result.moves.length > 0) {
            this.hintArrowId = result.moves[0]; // Highlight the next correct arrow ID

            // Update stats
            const stats = storage.getStats();
            stats.hintsUsed++;
            storage.saveStats(stats);
        }
    }

    /**
     * Try to move a specific arrow
     */
    tryMoveArrow(arrowId) {
        if (this.isCompleted) return;

        const arrow = this.arrows.find(a => a.id === arrowId);
        if (!arrow || arrow.isSliding) return;

        // Check blocking using solver's logic
        const activeArrows = this.arrows.filter(a => !a.isSliding);
        const blocked = solver.isBlocked(arrow, activeArrows, this.gridSize);

        if (!blocked) {
            // Push current state to undo stack before making move
            this.pushStateToUndo();

            arrow.isSliding = true;
            arrow.slideProgress = 0;
            this.moveCount++;
            this.hintArrowId = null; // Clear hint on interaction

            audio.playSlide();
            utils.vibrate(40);

            // Save snapshot every 5 moves for recovery
            this.checkAndSaveSnapshot();
        } else {
            // Shake visual feedback
            arrow.isShaking = true;
            arrow.shakeFrames = 15;
            animation.shake(6);
            audio.playClick(); // Tiny negative feedback sound
            utils.vibrate([40, 20]);
        }

        if (window.ui) window.ui.updateStatusPanel();
    }

    /**
     * Core update loop (runs ~60 times per second)
     */
    update() {
        let boardChanged = false;

        this.arrows.forEach((a, index) => {
            // Handle Sliding
            if (a.isSliding) {
                boardChanged = true;
                a.slideProgress += 0.08; // Slid rate

                const boardPixSize = window.ui ? window.ui.boardPixSize : 400;
                const cellSize = boardPixSize / this.gridSize;

                // Move offset based on direction
                switch (a.dir) {
                    case 'UP': a.offsetY -= cellSize * 0.15; break;
                    case 'DOWN': a.offsetY += cellSize * 0.15; break;
                    case 'LEFT': a.offsetX -= cellSize * 0.15; break;
                    case 'RIGHT': a.offsetX += cellSize * 0.15; break;
                }

                // Check if completely off-screen
                const xPos = a.c * cellSize + cellSize / 2 + a.offsetX;
                const yPos = a.r * cellSize + cellSize / 2 + a.offsetY;

                if (xPos < -cellSize || xPos > boardPixSize + cellSize ||
                    yPos < -cellSize || yPos > boardPixSize + cellSize) {
                    // Trigger particle burst at the edge of the board
                    const burstX = utils.clamp(xPos, 0, boardPixSize);
                    const burstY = utils.clamp(yPos, 0, boardPixSize);
                    
                    particles.createArrowBurst(burstX, burstY, a.dir);

                    // Remove arrow from active list
                    this.arrows.splice(index, 1);
                    this.checkVictory();
                }
            }

            // Handle Blocked Shaking
            if (a.isShaking) {
                boardChanged = true;
                a.shakeFrames--;
                if (a.shakeFrames <= 0) {
                    a.isShaking = false;
                    a.shakeOffset = 0;
                } else {
                    // Alternating offset
                    a.shakeOffset = Math.sin(a.shakeFrames * 1.5) * 4;
                }
            }
        });

        return boardChanged;
    }

    /**
     * Checks if all arrows have exited the board
     */
    checkVictory() {
        if (this.arrows.length === 0 && !this.isCompleted) {
            this.isCompleted = true;
            clearInterval(this.timerInterval);

            audio.playVictory();
            particles.createVictoryConfetti();
            
            // Clear auto-save and active snapshot
            storage.saveActiveGame(null);
            storage.clearSnapshot();

            // Handle mode wins
            setTimeout(() => {
                if (window.ui) window.ui.handleLevelWon();
            }, 800);
        }
    }

    /**
     * Save game state for auto-save / resume
     */
    saveGameState() {
        const state = {
            gameMode: this.gameMode,
            level: this.currentLevelData.level,
            seed: this.currentLevelData.seed,
            gridSize: this.gridSize,
            arrows: this.arrows,
            undoStack: this.undoStack,
            moveCount: this.moveCount,
            score: this.score,
            timer: this.timer,
            timeElapsed: this.timeElapsed
        };
        storage.saveActiveGame(state);
    }

    /**
     * Try to restore an auto-saved game
     */
    resumeSavedGame() {
        const saved = storage.getActiveGame();
        if (!saved) return false;

        this.gameMode = saved.gameMode;
        this.gridSize = saved.gridSize;
        this.moveCount = saved.moveCount;
        this.score = saved.score;
        this.timer = saved.timer;
        this.timeElapsed = saved.timeElapsed;
        this.undoStack = saved.undoStack;
        this.redoStack = [];
        this.isCompleted = false;

        this.currentLevelData = {
            level: saved.level,
            size: saved.gridSize,
            seed: saved.seed,
            arrows: saved.arrows
        };

        this.arrows = saved.arrows.map(a => ({ ...a }));

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            this.timeElapsed++;
            if (this.gameMode === "timed") {
                this.timer--;
                if (this.timer <= 0) {
                    this.timer = 0;
                    clearInterval(this.timerInterval);
                    if (window.ui) window.ui.showTimedGameOver();
                }
            }
            if (window.ui) window.ui.updateStatusPanel();
        }, 1000);

        if (window.ui) {
            window.ui.initCanvas();
            window.ui.updateStatusPanel();
        }

        return true;
    }

    /**
     * Check if 5 moves have passed and save a snapshot to LocalStorage
     */
    checkAndSaveSnapshot() {
        if (this.moveCount > 0 && this.moveCount % 5 === 0) {
            const state = {
                gameMode: this.gameMode,
                level: this.currentLevelData.level,
                seed: this.currentLevelData.seed,
                gridSize: this.gridSize,
                arrows: this.arrows,
                undoStack: this.undoStack,
                moveCount: this.moveCount,
                score: this.score,
                timer: this.timer,
                timeElapsed: this.timeElapsed
            };
            storage.saveSnapshot(state);
            console.log(`Saved board state snapshot to LocalStorage at move ${this.moveCount}`);
        }
    }

    /**
     * Resume game from a loaded snapshot
     */
    resumeSnapshotGame(saved) {
        if (!saved) return false;

        this.gameMode = saved.gameMode;
        this.gridSize = saved.gridSize;
        this.moveCount = saved.moveCount;
        this.score = saved.score;
        this.timer = saved.timer;
        this.timeElapsed = saved.timeElapsed;
        this.undoStack = saved.undoStack || [];
        this.redoStack = [];
        this.isCompleted = false;

        this.currentLevelData = {
            level: saved.level,
            size: saved.gridSize,
            seed: saved.seed,
            arrows: saved.arrows
        };

        this.arrows = saved.arrows.map(a => ({ ...a }));

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            this.timeElapsed++;
            if (this.gameMode === "timed") {
                this.timer--;
                if (this.timer <= 0) {
                    this.timer = 0;
                    clearInterval(this.timerInterval);
                    if (window.ui) window.ui.showTimedGameOver();
                }
            }
            if (window.ui) window.ui.updateStatusPanel();
        }, 1000);

        if (window.ui) {
            window.ui.initCanvas();
            window.ui.updateStatusPanel();
        }

        return true;
    }
}

const engine = new GameEngine();
window.engine = engine;
