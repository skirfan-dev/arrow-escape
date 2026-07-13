/**
 * Arrow Escape - Built-in Solver
 * Uses Breadth-First Search (BFS) to solve puzzles, calculate dependency depths,
 * find minimum moves, and calculate a precise difficulty score.
 */

class Solver {
    /**
     * Checks if a cell is on the board
     */
    inBounds(r, c, size) {
        return r >= 0 && r < size && c >= 0 && c < size;
    }

    /**
     * Gets all cells along the exit path of an arrow
     */
    getPathCells(arrow, size) {
        const cells = [];
        let currR = arrow.r;
        let currC = arrow.c;

        while (true) {
            switch (arrow.dir) {
                case 'UP': currR--; break;
                case 'DOWN': currR++; break;
                case 'LEFT': currC--; break;
                case 'RIGHT': currC++; break;
            }
            if (!this.inBounds(currR, currC, size)) break;
            cells.push({ r: currR, c: currC });
        }
        return cells;
    }

    /**
     * Determines if an arrow is blocked in a given board state
     * @param {object} arrow The arrow to check
     * @param {Array} activeArrows Array of currently active arrows
     * @param {number} size Board size
     */
    isBlocked(arrow, activeArrows, size) {
        const path = this.getPathCells(arrow, size);
        for (const p of path) {
            const hasBlocker = activeArrows.some(other => 
                other.id !== arrow.id && other.r === p.r && other.c === p.c
            );
            if (hasBlocker) return true;
        }
        return false;
    }

    /**
     * Builds a dependency graph of the arrows
     * A points to B if B blocks A's direct exit path
     */
    buildDependencyGraph(arrows, size) {
        const graph = {};
        arrows.forEach(a => {
            graph[a.id] = [];
            const path = this.getPathCells(a, size);
            path.forEach(p => {
                const blocker = arrows.find(other => other.id !== a.id && other.r === p.r && other.c === p.c);
                if (blocker) {
                    graph[a.id].push(blocker.id);
                }
            });
        });
        return graph;
    }

    /**
     * Calculates the longest chain of dependencies (DAG Depth)
     */
    calculateLongestChain(arrows, size) {
        const graph = this.buildDependencyGraph(arrows, size);
        const memo = {};

        const dfs = (nodeId) => {
            if (nodeId in memo) return memo[nodeId];
            let maxDist = 0;
            const neighbors = graph[nodeId] || [];
            for (const neighbor of neighbors) {
                maxDist = Math.max(maxDist, 1 + dfs(neighbor));
            }
            memo[nodeId] = maxDist;
            return maxDist;
        };

        let longest = 0;
        arrows.forEach(a => {
            longest = Math.max(longest, dfs(a.id));
        });

        return longest;
    }

    /**
     * Solves the given puzzle
     * @param {Array} arrows Array of arrow objects { id, r, c, dir }
     * @param {number} size Grid dimensions (e.g. 5 for 5x5)
     * @returns {object} Solver output { solvable, minMoves, moves, longestChain, branchCount, difficultyScore }
     */
    solve(arrows, size) {
        if (arrows.length === 0) {
            return {
                solvable: true,
                minMoves: 0,
                moves: [],
                longestChain: 0,
                branchCount: 0,
                difficultyScore: 0
            };
        }

        // Setup BFS
        // Represent state as a sorted string of active arrow IDs
        const startState = arrows.map(a => a.id).sort().join(',');
        const queue = [{
            stateStr: startState,
            active: [...arrows],
            moves: []
        }];
        
        const visited = new Set();
        visited.add(startState);

        let solution = null;
        let totalBranchesExplored = 0;
        let maxBranchesAtState = 0;
        let maxQueueSize = 2500; // Hard cap on state exploration to keep speed instant

        while (queue.length > 0) {
            // Cap safety check
            if (visited.size > maxQueueSize) {
                break;
            }

            const curr = queue.shift();
            
            // Winning state
            if (curr.active.length === 0) {
                solution = curr.moves;
                break;
            }

            // Find all unblocked moves from this state
            const unblocked = [];
            curr.active.forEach(arrow => {
                if (!this.isBlocked(arrow, curr.active, size)) {
                    unblocked.push(arrow);
                }
            });

            totalBranchesExplored += unblocked.length;
            maxBranchesAtState = Math.max(maxBranchesAtState, unblocked.length);

            // Explore next states
            unblocked.forEach(arrowToRemove => {
                const nextActive = curr.active.filter(a => a.id !== arrowToRemove.id);
                const nextStateStr = nextActive.map(a => a.id).sort().join(',');

                if (!visited.has(nextStateStr)) {
                    visited.add(nextStateStr);
                    queue.push({
                        stateStr: nextStateStr,
                        active: nextActive,
                        moves: [...curr.moves, arrowToRemove.id]
                    });
                }
            });
        }

        const longestChain = this.calculateLongestChain(arrows, size);

        if (solution) {
            // Difficulty calculation
            // Base difficulty on board size, number of arrows, dependency depth, and lack of branches (narrow critical path is harder)
            const sizeWeight = size * 1.5;
            const arrowWeight = arrows.length * 1.2;
            const chainWeight = longestChain * 3.5;
            // Fewer solutions/branches means more constraint and planning required (harder)
            const averageBranching = visited.size > 0 ? (totalBranchesExplored / visited.size) : 1;
            const branchingWeight = (5 - Math.min(averageBranching, 4)) * 2.0;

            const score = Math.round(sizeWeight + arrowWeight + chainWeight + branchingWeight);

            return {
                solvable: true,
                minMoves: solution.length,
                moves: solution, // Array of arrow IDs in correct solving order
                longestChain: longestChain,
                branchCount: visited.size,
                difficultyScore: score
            };
        } else {
            return {
                solvable: false,
                minMoves: 0,
                moves: [],
                longestChain: longestChain,
                branchCount: 0,
                difficultyScore: 0
            };
        }
    }
}

const solver = new Solver();
window.solver = solver;
