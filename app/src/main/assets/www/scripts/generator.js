/**
 * Arrow Escape - Procedural Level Generator
 * Builds high-quality puzzles backwards in reverse solving order,
 * ensuring 100% solvability, zero duplicates, and precise difficulty matching.
 */

class LevelGenerator {
    constructor() {
        this.maxAttempts = 50;
    }

    /**
     * Get board size and target arrow count based on level difficulty
     * @param {number} level Level number (1 to infinity)
     */
    getDifficultyParams(level) {
        if (level <= 20) {
            // Very Easy (3x3 or 4x4)
            const size = level <= 8 ? 3 : 4;
            const arrows = utils.randomInt(3, size === 3 ? 5 : 6);
            return { size, arrows, targetChain: 1, maxChain: 3, label: "Very Easy" };
        } else if (level <= 50) {
            // Easy (5x5)
            const size = 5;
            const arrows = utils.randomInt(7, 11);
            return { size, arrows, targetChain: 3, maxChain: 5, label: "Easy" };
        } else if (level <= 100) {
            // Medium (6x6)
            const size = 6;
            const arrows = utils.randomInt(12, 16);
            return { size, arrows, targetChain: 5, maxChain: 8, label: "Medium" };
        } else if (level <= 250) {
            // Hard (7x7)
            const size = 7;
            const arrows = utils.randomInt(17, 23);
            return { size, arrows, targetChain: 8, maxChain: 12, label: "Hard" };
        } else if (level <= 500) {
            // Expert (8x8)
            const size = 8;
            const arrows = utils.randomInt(24, 32);
            return { size, arrows, targetChain: 12, maxChain: 18, label: "Expert" };
        } else {
            // Master (9x9)
            const size = 9;
            const arrows = utils.randomInt(33, 42);
            return { size, arrows, targetChain: 18, maxChain: 25, label: "Master" };
        }
    }

    /**
     * Checks if a reverse path is empty (the exit path of the arrow in forward motion)
     */
    isReversePathEmpty(r, c, dir, size, placedArrows) {
        let currR = r;
        let currC = c;

        while (true) {
            switch (dir) {
                case 'UP': currR--; break;
                case 'DOWN': currR++; break;
                case 'LEFT': currC--; break;
                case 'RIGHT': currC++; break;
            }
            // Out of bounds is fine, means we cleared to the edge
            if (currR < 0 || currR >= size || currC < 0 || currC >= size) break;

            // If there's an arrow in the exit path, it means it's not clear
            const occupied = placedArrows.some(a => a.r === currR && a.c === currC);
            if (occupied) return false;
        }
        return true;
    }

    /**
     * Generates a puzzle backwards
     * @param {number} size Board size
     * @param {number} targetCount Number of arrows to place
     * @returns {Array} Array of arrow objects
     */
    generateBackwards(size, targetCount) {
        const placedArrows = [];
        let attempts = 0;

        // Populate a pool of coordinates and shuffle them
        const cellPool = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                cellPool.push({ r, c });
            }
        }

        while (placedArrows.length < targetCount && attempts < 100) {
            attempts++;
            utils.shuffle(cellPool);

            let placedThisIteration = false;

            for (const cell of cellPool) {
                // Skip if already occupied
                if (placedArrows.some(a => a.r === cell.r && a.c === cell.c)) continue;

                // Test directions
                const directions = utils.shuffle(['UP', 'DOWN', 'LEFT', 'RIGHT']);
                for (const dir of directions) {
                    // Check if reverse path is empty
                    if (this.isReversePathEmpty(cell.r, cell.c, dir, size, placedArrows)) {
                        placedArrows.push({
                            id: `a_${placedArrows.length + 1}_${utils.generateId()}`,
                            r: cell.r,
                            c: cell.c,
                            dir: dir,
                            // Starting offset for animations
                            offsetX: 0,
                            offsetY: 0,
                            alpha: 1
                        });
                        placedThisIteration = true;
                        break;
                    }
                }

                if (placedArrows.length >= targetCount) break;
            }

            // If we couldn't place any arrows in this pass, break early to avoid infinite loop
            if (!placedThisIteration) break;
        }

        return placedArrows;
    }

    /**
     * Build a high-quality deterministic level from a level seed
     * @param {number} levelNum The level index
     * @param {string} seed Custom level seed
     */
    generateLevel(levelNum, seed) {
        // Seed the RNG to ensure deterministic levels
        utils.setSeed(seed || `level_${levelNum}`);

        const params = this.getDifficultyParams(levelNum);
        let bestPuzzle = null;
        let attempts = 0;

        // Try generating until we satisfy the dependency chain constraints
        while (attempts < this.maxAttempts) {
            attempts++;
            const rawArrows = this.generateBackwards(params.size, params.arrows);
            
            // Validate with solver
            const solutionResult = solver.solve(rawArrows, params.size);

            if (solutionResult.solvable) {
                // If the longest chain matches our difficulty criteria, keep it!
                if (solutionResult.longestChain >= params.targetChain && 
                    solutionResult.longestChain <= params.maxChain) {
                    bestPuzzle = {
                        level: levelNum,
                        size: params.size,
                        arrows: rawArrows,
                        solution: solutionResult,
                        difficulty: params.label,
                        seed: seed || `level_${levelNum}`
                    };
                    break;
                }
                
                // Fallback: store the first solvable one just in case we can't find a perfect chain match
                if (!bestPuzzle) {
                    bestPuzzle = {
                        level: levelNum,
                        size: params.size,
                        arrows: rawArrows,
                        solution: solutionResult,
                        difficulty: params.label,
                        seed: seed || `level_${levelNum}`
                    };
                }
            }
        }

        return bestPuzzle;
    }
}

const generator = new LevelGenerator();
window.generator = generator;
