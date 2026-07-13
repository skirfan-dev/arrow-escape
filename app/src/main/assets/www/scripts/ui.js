/**
 * Arrow Escape - UI Manager
 * Handles HTML screens, buttons, touch gestures on canvas, themes,
 * responsive board drawings, statistics, achievements, and layout flows.
 */

class UIManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.boardPixSize = 400; // Native resolution of board
        this.canvasScale = 1;
        this.isLooping = false;
        
        this.activeScreen = "home-screen";
        this.touchStartPos = { x: 0, y: 0 };
        this.isSwiping = false;
        
        // Dynamic Board Colors (Tailored to current theme)
        this.colors = {
            dark: {
                bg: "#0B0C10",
                gridBg: "#1F2833",
                gridLines: "rgba(255, 255, 255, 0.05)",
                arrowGradientStart: "#00F0FF",
                arrowGradientEnd: "#7000FF",
                arrowText: "#FFFFFF",
                arrowBlocked: "#FF2E93",
                hintGlow: "#FFDF00",
                pitColor: "rgba(0, 0, 0, 0.4)"
            },
            light: {
                bg: "#F4F6F9",
                gridBg: "#E2E8F0",
                gridLines: "rgba(0, 0, 0, 0.05)",
                arrowGradientStart: "#0D6EFD",
                arrowGradientEnd: "#00D2FF",
                arrowText: "#FFFFFF",
                arrowBlocked: "#DC3545",
                hintGlow: "#FFC107",
                pitColor: "rgba(0, 0, 0, 0.08)"
            },
            high_contrast: {
                bg: "#000000",
                gridBg: "#111111",
                gridLines: "#FFFFFF",
                arrowGradientStart: "#FFFFFF",
                arrowGradientEnd: "#FFFFFF",
                arrowText: "#000000",
                arrowBlocked: "#FF0000",
                hintGlow: "#FFFF00",
                pitColor: "rgba(255, 255, 255, 0.2)"
            }
        };
    }

    /**
     * Start the canvas rendering loop
     */
    startRenderLoop() {
        if (this.isLooping) return;
        this.isLooping = true;
        const loop = () => {
            if (!this.isLooping) return;
            this.updateAndRender();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    /**
     * Stop the rendering loop
     */
    stopRenderLoop() {
        this.isLooping = false;
    }

    /**
     * Initial setup for screens, navigation, and canvas inputs
     */
    init() {
        // Setup canvas
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        
        // Set up particle overlay canvas
        const particleCanvas = document.getElementById("particle-canvas");
        particles.init(particleCanvas);

        this.initCanvas();
        this.bindEvents();
        this.setupNavigation();
        this.updateStatsScreen();
        this.updateAchievementsList();
        this.renderLevelSelect();
        this.checkContinueState();
        this.checkRecoveryState();

        // Start BGM if enabled
        if (storage.getSettings().music) {
            audio.startBGM();
        }

        // Apply theme on start
        settings.applyTheme();

        // Start render loops
        this.startRenderLoop();
    }

    /**
     * Bind gesture, touch, and click listeners to the canvas
     */
    bindEvents() {
        const handleDown = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = (clientX - rect.left) / this.canvasScale;
            const canvasY = (clientY - rect.top) / this.canvasScale;

            const cellSize = this.boardPixSize / engine.gridSize;
            const col = Math.floor(canvasX / cellSize);
            const row = Math.floor(canvasY / cellSize);

            const clickedArrow = engine.arrows.find(a => a.r === row && a.c === col && !a.isSliding);
            if (clickedArrow) {
                this.touchStartPos = { x: canvasX, y: canvasY };
                engine.selectedArrowId = clickedArrow.id;
                this.isSwiping = false;
            }
        };

        const handleMove = (clientX, clientY) => {
            if (!engine.selectedArrowId) return;

            const rect = this.canvas.getBoundingClientRect();
            const canvasX = (clientX - rect.left) / this.canvasScale;
            const canvasY = (clientY - rect.top) / this.canvasScale;

            const deltaX = canvasX - this.touchStartPos.x;
            const deltaY = canvasY - this.touchStartPos.y;
            const threshold = 25; // Swipe detection threshold

            if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
                this.isSwiping = true;
                const arrow = engine.arrows.find(a => a.id === engine.selectedArrowId);
                if (arrow) {
                    // Check if swipe matches arrow's direction
                    let swipedCorrectly = false;
                    if (arrow.dir === "RIGHT" && deltaX > threshold && Math.abs(deltaX) > Math.abs(deltaY)) swipedCorrectly = true;
                    if (arrow.dir === "LEFT" && deltaX < -threshold && Math.abs(deltaX) > Math.abs(deltaY)) swipedCorrectly = true;
                    if (arrow.dir === "DOWN" && deltaY > threshold && Math.abs(deltaY) > Math.abs(deltaX)) swipedCorrectly = true;
                    if (arrow.dir === "UP" && deltaY < -threshold && Math.abs(deltaY) > Math.abs(deltaX)) swipedCorrectly = true;

                    if (swipedCorrectly) {
                        engine.tryMoveArrow(arrow.id);
                        engine.selectedArrowId = null;
                    }
                }
            }
        };

        const handleUp = () => {
            if (!this.isSwiping && engine.selectedArrowId) {
                engine.tryMoveArrow(engine.selectedArrowId);
            }
            engine.selectedArrowId = null;
        };

        // Touch event bindings
        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (e.touches.length > 0) handleDown(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        this.canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        this.canvas.addEventListener("touchend", handleUp);

        // Mouse event bindings
        this.canvas.addEventListener("mousedown", (e) => {
            handleDown(e.clientX, e.clientY);
        });

        this.canvas.addEventListener("mousemove", (e) => {
            handleMove(e.clientX, e.clientY);
        });

        window.addEventListener("mouseup", handleUp);

        // Window resize
        window.addEventListener("resize", () => this.initCanvas());
    }

    /**
     * Screen setup for board resizing and responsive scaling
     */
    initCanvas() {
        const boardContainer = document.querySelector(".board-container");
        if (!boardContainer) return;

        const maxDisplaySize = Math.min(boardContainer.clientWidth, boardContainer.clientHeight, 450);
        
        // Scale Canvas physically
        this.canvas.width = maxDisplaySize;
        this.canvas.height = maxDisplaySize;
        
        this.canvasScale = maxDisplaySize / this.boardPixSize;
        this.ctx.scale(this.canvasScale, this.canvasScale);

        // Particle canvas resizing
        particles.resize(maxDisplaySize, maxDisplaySize);
    }

    /**
     * Map HTML click navigations and menus
     */
    setupNavigation() {
        // Link all DOM menu transitions
        const navigateTo = (screenId) => {
            audio.playClick();
            
            document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.classList.add("active");
                this.activeScreen = screenId;
            }

            // Sync features on specific screen entry
            if (screenId === "game-screen") {
                this.initCanvas();
            } else if (screenId === "stats-screen") {
                this.updateStatsScreen();
            } else if (screenId === "achievements-screen") {
                this.updateAchievementsList();
            } else if (screenId === "levels-screen") {
                this.renderLevelSelect();
            } else if (screenId === "settings-screen") {
                this.populateSettings();
            }
            this.checkContinueState();
        };

        // Home screen selections
        document.getElementById("btn-play")?.addEventListener("click", () => {
            const progress = storage.getProgress();
            const seed = levels.getClassicSeed(progress.classicLevel);
            const levelData = generator.generateLevel(progress.classicLevel, seed);
            engine.startLevel(levelData, "classic");
            navigateTo("game-screen");
        });

        document.getElementById("btn-continue")?.addEventListener("click", () => {
            const hasResumed = engine.resumeSavedGame();
            if (hasResumed) {
                navigateTo("game-screen");
            }
        });

        document.getElementById("btn-level-select")?.addEventListener("click", () => navigateTo("levels-screen"));
        document.getElementById("btn-daily")?.addEventListener("click", () => {
            const dateStr = levels.getCurrentDateString();
            const progress = storage.getProgress();
            
            if (progress.dailyCompleted[dateStr]) {
                alert("You have already completed today's challenge! Come back tomorrow.");
                return;
            }

            const dailyLevel = levels.getDailyLevel();
            engine.startLevel(dailyLevel, "daily");
            navigateTo("game-screen");
        });

        document.getElementById("btn-achievements")?.addEventListener("click", () => navigateTo("achievements-screen"));
        document.getElementById("btn-stats")?.addEventListener("click", () => navigateTo("stats-screen"));
        document.getElementById("btn-settings")?.addEventListener("click", () => navigateTo("settings-screen"));
        document.getElementById("btn-credits")?.addEventListener("click", () => navigateTo("credits-screen"));

        // Back button handlers
        document.querySelectorAll(".btn-back").forEach(btn => {
            btn.addEventListener("click", () => {
                engine.saveGameState();
                navigateTo("home-screen");
            });
        });

        // Game footer tools
        document.getElementById("btn-hint")?.addEventListener("click", () => engine.getHint());
        document.getElementById("btn-undo")?.addEventListener("click", () => engine.undo());
        document.getElementById("btn-redo")?.addEventListener("click", () => engine.redo());

        // Victory screen controls
        document.getElementById("btn-victory-next")?.addEventListener("click", () => {
            audio.playClick();
            document.getElementById("victory-modal").classList.add("hidden");
            
            if (engine.gameMode === "classic") {
                const nextLevel = engine.currentLevelData.level + 1;
                const seed = levels.getClassicSeed(nextLevel);
                const nextLevelData = generator.generateLevel(nextLevel, seed);
                engine.startLevel(nextLevelData, "classic");
            } else if (engine.gameMode === "infinite") {
                // Generate next random level with increasing difficulty
                const nextLevel = engine.currentLevelData.level + 1;
                const nextLevelData = generator.generateLevel(nextLevel, `inf_seed_${utils.generateId()}`);
                engine.startLevel(nextLevelData, "infinite");
            } else {
                navigateTo("home-screen");
            }
        });

        document.getElementById("btn-victory-menu")?.addEventListener("click", () => {
            document.getElementById("victory-modal").classList.add("hidden");
            navigateTo("home-screen");
        });

        // Recovery modal actions
        document.getElementById("btn-recovery-restore")?.addEventListener("click", () => {
            audio.playClick();
            document.getElementById("recovery-modal").classList.add("hidden");
            
            const snapshot = storage.getSnapshot();
            if (snapshot) {
                engine.resumeSnapshotGame(snapshot);
                navigateTo("game-screen");
            }
        });

        document.getElementById("btn-recovery-discard")?.addEventListener("click", () => {
            audio.playClick();
            document.getElementById("recovery-modal").classList.add("hidden");
            storage.clearSnapshot();
        });
    }

    /**
     * Populate settings checkboxes and toggles
     */
    populateSettings() {
        const s = storage.getSettings();
        const musicCheckbox = document.getElementById("chk-music");
        const soundCheckbox = document.getElementById("chk-sound");
        const vibrationCheckbox = document.getElementById("chk-vibration");
        const motionCheckbox = document.getElementById("chk-motion");
        const themeSelect = document.getElementById("sel-theme");

        if (musicCheckbox) musicCheckbox.checked = s.music;
        if (soundCheckbox) soundCheckbox.checked = s.sound;
        if (vibrationCheckbox) vibrationCheckbox.checked = s.vibration;
        if (motionCheckbox) motionCheckbox.checked = s.reducedMotion;
        if (themeSelect) themeSelect.value = s.theme;

        // Settings event listeners
        musicCheckbox?.onchange = () => settings.toggle("music");
        soundCheckbox?.onchange = () => settings.toggle("sound");
        vibrationCheckbox?.onchange = () => settings.toggle("vibration");
        motionCheckbox?.onchange = () => settings.toggle("reducedMotion");
        
        if (themeSelect) {
            themeSelect.onchange = (e) => settings.set("theme", e.target.value);
        }

        // Reset progress click
        const resetBtn = document.getElementById("btn-reset-data");
        if (resetBtn) {
            resetBtn.onclick = () => {
                const choice = confirm(settings.get("reset_warning"));
                if (choice) {
                    storage.resetProgress();
                    alert("Game data has been reset.");
                    navigateTo("home-screen");
                }
            };
        }
    }

    /**
     * Sync Continue button availability
     */
    checkContinueState() {
        const btnContinue = document.getElementById("btn-continue");
        if (btnContinue) {
            if (storage.getActiveGame()) {
                btnContinue.classList.remove("hidden");
            } else {
                btnContinue.classList.add("hidden");
            }
        }
    }

    /**
     * Check if an unexpected refresh snapshot exists and prompt user
     */
    checkRecoveryState() {
        const snapshot = storage.getSnapshot();
        if (snapshot) {
            const recoveryModal = document.getElementById("recovery-modal");
            const recLevel = document.getElementById("recovery-level");
            const recMoves = document.getElementById("recovery-moves-count");

            if (recLevel) recLevel.innerText = snapshot.level;
            if (recMoves) recMoves.innerText = snapshot.moveCount;

            if (recoveryModal) {
                recoveryModal.classList.remove("hidden");
            }
        }
    }

    /**
     * Render level selection layout
     */
    renderLevelSelect() {
        const container = document.getElementById("levels-grid");
        if (!container) return;
        container.innerHTML = "";

        const progress = storage.getProgress();

        // Let's offer first 100 levels initially
        for (let i = 1; i <= 100; i++) {
            const card = document.createElement("div");
            card.className = "level-card";
            
            // Highlight current / completed states
            const isCompleted = progress.completedLevels[i] || false;
            const isCurrent = progress.classicLevel === i;
            const isLocked = i > progress.classicLevel;

            if (isLocked) {
                card.classList.add("locked");
                card.innerHTML = `
                    <div class="level-num">${i}</div>
                    <div class="level-status">🔒</div>
                `;
            } else {
                if (isCompleted) card.classList.add("completed");
                if (isCurrent) card.classList.add("current");
                
                card.innerHTML = `
                    <div class="level-num">${i}</div>
                    <div class="level-status">${isCompleted ? "✔" : "▶"}</div>
                `;
                
                card.onclick = () => {
                    const seed = levels.getClassicSeed(i);
                    const levelData = generator.generateLevel(i, seed);
                    engine.startLevel(levelData, "classic");
                    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
                    document.getElementById("game-screen").classList.add("active");
                    this.activeScreen = "game-screen";
                    this.initCanvas();
                };
            }
            container.appendChild(card);
        }
    }

    /**
     * Sync and update statistical charts/boxes
     */
    updateStatsScreen() {
        const stats = storage.getStats();
        const progress = storage.getProgress();

        document.getElementById("stat-played").innerText = stats.gamesPlayed;
        document.getElementById("stat-won").innerText = stats.gamesWon;
        
        // Calculate Win Ratio
        const ratio = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
        document.getElementById("stat-ratio").innerText = `${ratio}%`;

        // Calculate averages
        const avgTime = stats.gamesWon > 0 ? Math.round(stats.totalSolveTime / stats.gamesWon) : 0;
        document.getElementById("stat-avg-time").innerText = utils.formatTime(avgTime);
        
        document.getElementById("stat-streak").innerText = stats.currentStreak;
        document.getElementById("stat-longest-streak").innerText = stats.longestStreak;
        document.getElementById("stat-hints").innerText = stats.hintsUsed;
        document.getElementById("stat-undos").innerText = stats.undoCount;

        // Daily Challenge complete info
        const dateStr = levels.getCurrentDateString();
        const isDailyDone = progress.dailyCompleted[dateStr] ? "Completed!" : "Available";
        document.getElementById("stat-daily").innerText = isDailyDone;
    }

    /**
     * Update visual badges in achievements screen
     */
    updateAchievementsList() {
        const listContainer = document.getElementById("achievements-list");
        if (!listContainer) return;
        listContainer.innerHTML = "";

        const badges = storage.getAchievements();
        
        Object.keys(badges).forEach(key => {
            const b = badges[key];
            const badgeEl = document.createElement("div");
            badgeEl.className = `achievement-item ${b.unlocked ? "unlocked" : "locked"}`;
            
            // Mapping descriptions and titles
            let title = "";
            let desc = "";
            let icon = "";

            switch (key) {
                case "first_win":
                    title = "First Win";
                    desc = "Clear your first puzzle!";
                    icon = "🏆";
                    break;
                case "wins_10":
                    title = "Dedicated Player";
                    desc = "Win 10 puzzles.";
                    icon = "⭐";
                    break;
                case "wins_100":
                    title = "Puzzle Enthusiast";
                    desc = "Win 100 puzzles.";
                    icon = "🔥";
                    break;
                case "wins_1000":
                    title = "Supreme Master";
                    desc = "Win 1000 puzzles!";
                    icon = "👑";
                    break;
                case "no_hint":
                    title = "Eagle Eye";
                    desc = "Solve a level without utilizing hints.";
                    icon = "👁️";
                    break;
                case "no_undo":
                    title = "Perfect Path";
                    desc = "Solve a level without undoing any moves.";
                    icon = "⚡";
                    break;
                case "speed_runner":
                    title = "Speed Demon";
                    desc = "Clear a level in under 15 seconds.";
                    icon = "⏱️";
                    break;
                case "puzzle_master":
                    title = "Century Club";
                    desc = "Reach and clear Classic level 100.";
                    icon = "🧩";
                    break;
            }

            badgeEl.innerHTML = `
                <div class="achievement-icon">${b.unlocked ? icon : "🔒"}</div>
                <div class="achievement-details">
                    <div class="achievement-title">${title}</div>
                    <div class="achievement-desc">${desc}</div>
                    <div class="achievement-progress-bar">
                        <div class="achievement-progress" style="width: ${(b.progress / b.max) * 100}%"></div>
                    </div>
                </div>
            `;
            listContainer.appendChild(badgeEl);
        });
    }

    /**
     * Handle Level Won and trigger achievements logic
     */
    handleLevelWon() {
        const stats = storage.getStats();
        const progress = storage.getProgress();
        const activeTheme = storage.getSettings().theme;

        stats.gamesWon++;
        stats.totalSolveTime += engine.timeElapsed;

        // Streaks
        stats.currentStreak++;
        if (stats.currentStreak > stats.longestStreak) {
            stats.longestStreak = stats.currentStreak;
        }

        // Fast solve metrics
        const levelSizeKey = `size_${engine.gridSize}`;
        if (!stats.fastestSolve[levelSizeKey] || engine.timeElapsed < stats.fastestSolve[levelSizeKey]) {
            stats.fastestSolve[levelSizeKey] = engine.timeElapsed;
        }

        // Progress saves
        if (engine.gameMode === "classic") {
            progress.completedLevels[engine.currentLevelData.level] = true;
            if (engine.currentLevelData.level === progress.classicLevel) {
                progress.classicLevel++;
            }
        } else if (engine.gameMode === "daily") {
            const dateStr = levels.getCurrentDateString();
            progress.dailyCompleted[dateStr] = true;
        }

        storage.saveStats(stats);
        storage.saveProgress(progress);

        // Process Achievements unlock logic
        this.checkAchievementsUnlock(stats, progress);

        // Show popup overlay
        const modal = document.getElementById("victory-modal");
        const scoreVal = document.getElementById("victory-moves");
        const timeVal = document.getElementById("victory-time");
        const nextBtn = document.getElementById("btn-victory-next");

        if (scoreVal) scoreVal.innerText = engine.moveCount;
        if (timeVal) timeVal.innerText = utils.formatTime(engine.timeElapsed);

        if (engine.gameMode === "daily") {
            nextBtn.classList.add("hidden");
        } else {
            nextBtn.classList.remove("hidden");
        }

        modal.classList.remove("hidden");
    }

    /**
     * Unlock and save achievement progression
     */
    checkAchievementsUnlock(stats, progress) {
        const achievements = storage.getAchievements();

        // 1. First Win
        if (!achievements.first_win.unlocked) {
            achievements.first_win.progress = 1;
            achievements.first_win.unlocked = true;
        }

        // 2. 10 Wins
        if (!achievements.wins_10.unlocked) {
            achievements.wins_10.progress = Math.min(stats.gamesWon, 10);
            if (achievements.wins_10.progress >= 10) achievements.wins_10.unlocked = true;
        }

        // 3. 100 Wins
        if (!achievements.wins_100.unlocked) {
            achievements.wins_100.progress = Math.min(stats.gamesWon, 100);
            if (achievements.wins_100.progress >= 100) achievements.wins_100.unlocked = true;
        }

        // 4. 1000 Wins
        if (!achievements.wins_1000.unlocked) {
            achievements.wins_1000.progress = Math.min(stats.gamesWon, 1000);
            if (achievements.wins_1000.progress >= 1000) achievements.wins_1000.unlocked = true;
        }

        // 5. No Hint
        if (!achievements.no_hint.unlocked && stats.hintsUsed === 0) {
            achievements.no_hint.progress = 1;
            achievements.no_hint.unlocked = true;
        }

        // 6. No Undo
        if (!achievements.no_undo.unlocked && stats.undoCount === 0) {
            achievements.no_undo.progress = 1;
            achievements.no_undo.unlocked = true;
        }

        // 7. Speed runner
        if (!achievements.speed_runner.unlocked && engine.timeElapsed <= 15) {
            achievements.speed_runner.progress = 1;
            achievements.speed_runner.unlocked = true;
        }

        // 8. Puzzle Master
        if (!achievements.puzzle_master.unlocked && progress.classicLevel >= 100) {
            achievements.puzzle_master.progress = 1;
            achievements.puzzle_master.unlocked = true;
        }

        storage.saveAchievements(achievements);
    }

    /**
     * Redraw text panels during play
     */
    updateStatusPanel() {
        const levelNumEl = document.getElementById("game-level");
        const movesEl = document.getElementById("game-moves");
        const timerEl = document.getElementById("game-timer");

        if (levelNumEl) levelNumEl.innerText = engine.currentLevelData ? engine.currentLevelData.level : "";
        if (movesEl) movesEl.innerText = engine.moveCount;
        
        if (timerEl) {
            if (engine.gameMode === "timed") {
                timerEl.innerText = utils.formatTime(engine.timer);
            } else {
                timerEl.innerText = utils.formatTime(engine.timeElapsed);
            }
        }
    }

    /**
     * Handle Timed GameOver
     */
    showTimedGameOver() {
        alert("Time is up! Let's return to the menu.");
        document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
        document.getElementById("home-screen").classList.add("active");
    }

    /**
     * Synchronize and animate canvas frame updates
     */
    updateAndRender() {
        // Run update on engine & particles
        const animationChanged = engine.update();
        animation.update();
        particles.updateAndDraw();

        // Render board
        this.renderBoard();
    }

    /**
     * Paint entire game state to the 2D canvas
     */
    renderBoard() {
        if (!this.canvas || !this.ctx) return;

        const theme = storage.getSettings().theme || "dark";
        const themeColors = this.colors[theme] || this.colors["dark"];

        // Clear local context
        this.ctx.fillStyle = themeColors.bg;
        this.ctx.fillRect(0, 0, this.boardPixSize, this.boardPixSize);

        // Apply camera/shake offsets
        this.ctx.save();
        this.ctx.translate(animation.shakeX, animation.shakeY);

        // 1. Draw rounded Board background
        const margin = 10;
        const boardSize = this.boardPixSize - margin * 2;
        this.drawRoundedRect(this.ctx, margin, margin, boardSize, boardSize, 24, themeColors.gridBg);

        const cellSize = boardSize / engine.gridSize;

        // 2. Draw cell pits/slots for depth feel
        for (let r = 0; r < engine.gridSize; r++) {
            for (let c = 0; c < engine.gridSize; c++) {
                const cx = margin + c * cellSize + cellSize / 2;
                const cy = margin + r * cellSize + cellSize / 2;
                const radius = cellSize * 0.35;
                
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = themeColors.pitColor;
                this.ctx.fill();
            }
        }

        // 3. Draw Arrows
        engine.arrows.forEach(a => {
            const cx = margin + a.c * cellSize + cellSize / 2 + a.offsetX + a.shakeOffset;
            const cy = margin + a.r * cellSize + cellSize / 2 + a.offsetY;
            const cardSize = cellSize * 0.72;

            this.ctx.save();
            this.ctx.translate(cx, cy);

            // Handle glowing hint overlay
            if (engine.hintArrowId === a.id) {
                this.ctx.shadowColor = themeColors.hintGlow;
                this.ctx.shadowBlur = 12 + Math.sin(Date.now() * 0.008) * 6;
            }

            // Draw arrow card
            const isBlocked = solver.isBlocked(a, engine.arrows.filter(o => !o.isSliding), engine.gridSize);
            const bodyColor = (isBlocked && a.isShaking) ? themeColors.arrowBlocked : themeColors.arrowGradientStart;

            // Gradient fill for arrow cards
            const grad = this.ctx.createLinearGradient(-cardSize / 2, -cardSize / 2, cardSize / 2, cardSize / 2);
            grad.addColorStop(0, bodyColor);
            grad.addColorStop(1, themeColors.arrowGradientEnd);

            this.drawRoundedRect(this.ctx, -cardSize / 2, -cardSize / 2, cardSize, cardSize, 12, grad);
            this.ctx.shadowBlur = 0; // Reset shadow

            // Draw direction arrow symbol
            this.ctx.fillStyle = themeColors.arrowText;
            this.ctx.strokeStyle = themeColors.arrowText;
            this.ctx.lineWidth = cardSize * 0.08;
            this.ctx.lineCap = "round";
            this.ctx.lineJoin = "round";

            this.drawArrowSymbol(this.ctx, a.dir, cardSize * 0.45);

            this.ctx.restore();
        });

        this.ctx.restore();
    }

    /**
     * Helper: draw rounded filled rectangle
     */
    drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }

    /**
     * Helper: draw crisp scalable arrow symbol
     */
    drawArrowSymbol(ctx, dir, size) {
        ctx.save();
        
        // Rotate symbol depending on direction
        let angle = 0;
        switch (dir) {
            case "RIGHT": angle = 0; break;
            case "DOWN": angle = Math.PI / 2; break;
            case "LEFT": angle = Math.PI; break;
            case "UP": angle = -Math.PI / 2; break;
        }
        ctx.rotate(angle);

        // Draw modern flat arrowhead stem
        ctx.beginPath();
        // Line stem
        ctx.moveTo(-size / 2, 0);
        ctx.lineTo(size * 0.2, 0);
        // Arrow cap
        ctx.moveTo(0, -size * 0.35);
        ctx.lineTo(size / 2, 0);
        ctx.lineTo(0, size * 0.35);

        ctx.stroke();
        ctx.restore();
    }
}

const ui = new UIManager();
window.ui = ui;
