let canvas, ctx, maze;

window.addEventListener("load", startAnimation);
window.addEventListener("resize", () => {
	if (maze) maze.onResize();
});

class MazeNode {
	constructor(x, y, isGoal = false) {
		this.x = x;
		this.y = y;
		this.walls = [1, 1, 1, 1];
		this.neighbours = [null, null, null, null];
		this.previous = null;
		this.prev = null;
		this.distance = -1;
		this.isGoal = isGoal;
	}

	getDirectionBetween(otherNode) {
		if (otherNode.x < this.x) return 0;
		if (otherNode.y > this.y) return 1;
		if (otherNode.x > this.x) return 2;
		if (otherNode.y < this.y) return 3;
	}

	getNeighbours(maze, wallsMatter = false) {
		const neighbours = [];
		if (maze.isInBounds(this.x, this.y - 1) && (!wallsMatter || !this.walls[3])) neighbours.push(maze.grid[this.x][this.y - 1]);
		if (maze.isInBounds(this.x, this.y + 1) && (!wallsMatter || !this.walls[1])) neighbours.push(maze.grid[this.x][this.y + 1]);
		if (maze.isInBounds(this.x - 1, this.y) && (!wallsMatter || !this.walls[0])) neighbours.push(maze.grid[this.x - 1][this.y]);
		if (maze.isInBounds(this.x + 1, this.y) && (!wallsMatter || !this.walls[2])) neighbours.push(maze.grid[this.x + 1][this.y]);
		return neighbours;
	}

	removeWalls() {
		if (!this.previous) return;

		if (this.previous.y < this.y) {
			this.walls[3] = 0;
			this.previous.walls[1] = 0;
		}

		if (this.previous.y > this.y) {
			this.walls[1] = 0;
			this.previous.walls[3] = 0;
		}

		if (this.previous.x < this.x) {
			this.walls[0] = 0;
			this.previous.walls[2] = 0;
		}

		if (this.previous.x > this.x) {
			this.walls[2] = 0;
			this.previous.walls[0] = 0;
		}
	}
}

class Maze {
	constructor() {
		this.grid = [];
		this.done = false;
	}

	onResize(create=true) {
		this.cellSize = 50 / (window.devicePixelRatio >= 2 ? 1.5 : 1);
		canvas.width = Math.min(0.75 * window.innerWidth, 800, canvas.parentElement.clientWidth);
		const numCells = Math.floor(canvas.width / this.cellSize / 2) * 2;
		canvas.width = numCells * this.cellSize + 11;
		canvas.height = canvas.width;

		canvas.style.display = numCells < 5 ? "none" : "initial";

		if (numCells !== this.grid.length && create) {
			this.done = false;
			this.create();
		} else {
			this.render();
		}
	}

	create() {
		this.construct();
		this.start();
	}

	construct(straightFactor=2) {
		this.grid = [];
		const numCells = Math.floor(canvas.width / this.cellSize / 2) * 2;

		for (let x = 0; x < numCells; x++) {
			this.grid.push([]);
			for (let y = 0; y < numCells; y++) {
				const isGoal = Math.abs(x + 0.5 - numCells / 2) <= 0.5 && Math.abs(y + 0.5 - numCells / 2) <= 0.5;
				this.grid[x].push(new MazeNode(x, y, isGoal));
			}
		}

		const mid = numCells / 2;
		const tl = this.grid[mid - 1][mid - 1];
		const tr = this.grid[mid - 1][mid];
		const bl = this.grid[mid][mid - 1];
		const br = this.grid[mid][mid];

		tl.walls[1] = 0;
		tl.walls[2] = 0;
		tr.walls[2] = 0;
		tr.walls[3] = 0;
		bl.walls[0] = 0;
		bl.walls[1] = 0;
		br.walls[0] = 0;
		br.walls[3] = 0;

		const visited = new Set([tl, tr, bl, br]);
		let current = tl;

		while (current) {
			const neighbours = current.getNeighbours(this);
			if (current.previous) {
				neighbours.sort((a, b) => {
					return 	(current.previous.getDirectionBetween(current) - current.getDirectionBetween(b)) -
							(current.previous.getDirectionBetween(current) - current.getDirectionBetween(a));
				});
			}

			const distanceFromOutside = Math.min(current.x, current.y, numCells - current.x - 1, numCells - current.y - 1);

			let nextCurrent = null;
			while (neighbours.length > 0) {
				const power = distanceFromOutside < 2 ? straightFactor * 20 : straightFactor;
				const neighbour = neighbours.splice(Math.floor(Math.pow(Math.random(), power) * neighbours.length), 1)[0];
				if (!visited.has(neighbour)) {
					nextCurrent = neighbour;
					visited.add(neighbour);
					neighbour.previous = current;
					break;
				}
			}

			current = nextCurrent || current.previous;
		}

		for (let x = 0; x < numCells; x++) {
			for (let y = 0; y < numCells; y++) {
				this.grid[x][y].removeWalls();
			}
		}

		let countRemoved = 0;
		while (countRemoved < 15) {
			countRemoved += this.randomlyRemoveWall() ? 1 : 0;
		}

		for (let x = 0; x < numCells; x++) {
			for (let y = 0; y < numCells; y++) {
				const cell = this.grid[x][y];
				cell.neighbours = [
					cell.walls[0] === 0 && x > 0 ? this.grid[x - 1][y] : null,
					cell.walls[1] === 0 && y < numCells - 1 ? this.grid[x][y + 1] : null,
					cell.walls[2] === 0 && x < numCells - 1 ? this.grid[x + 1][y] : null,
					cell.walls[3] === 0 && y > 0 ? this.grid[x][y - 1] : null,
				];
			}
		}

		this.goalCells = [tl, tr, bl, br];
		return this;
	}

	randomlyRemoveWall() {
		const size = this.grid.length;
		const r1 = Math.floor(Math.random() * size), r2 = Math.floor(Math.random() * size);
		if (r1 < 1 || r2 < 1 || r1 >= size - 1 || r2 >= size - 1) {
			return false;
		}
		const node = this.grid[r1][r2];
		const chosenSide = Math.floor(Math.random() * 4);
		const others = node.getNeighbours(this)
			.filter(n => node.getDirectionBetween(n) === chosenSide);

		if (others.length === 0) {
			return false;
		}

		const oppositeDirs = [2, 3, 0, 1];
		if (node.walls[chosenSide] === 0) {
			return false;
		}
		node.walls[chosenSide] = 0;
		others[0].walls[oppositeDirs[chosenSide]] = 0;

		return true;
	}

	isInBounds(x, y) {
		return x >= 0 && y >= 0 && x <= this.grid.length - 1 && y <= this.grid.length - 1;
	}

	start() {
		for (let x = 0; x < this.grid.length; x++) {
			for (let y = 0; y < this.grid.length; y++) {
				this.grid[x][y].distance = -1;
				this.grid[x][y].prev = null;
			}
		}
		this.queue = [this.grid[0][0]];

		this.render();
		this.step();
	}

	step() {
		if (this.done) {
			this.render();

			if (!this.current.prev || (this.current.x === 0 && this.current.y === 0)) {
				return;
			}
			
			this.current.explored = 3;
			this.current = this.current.prev;
			window.setTimeout(this.step.bind(this), 50);
			return;
		}

		if (this.queue.length === 0) {
			return;
		}

		this.current = this.queue.shift();
		this.current.explored = 2;

		if (this.goalCells.includes(this.current)) {
			this.done = true;
			this.render();
			window.setTimeout(this.step.bind(this), 50);
			return;
		}

		for (const neighbour of this.current.neighbours) {
			if (!neighbour && neighbour !== 1) {
				continue;
			}

			if (neighbour.distance === -1) {
				neighbour.distance = this.current.distance + 1;
				neighbour.prev = this.current;
				neighbour.explored = 1;
				this.queue.push(neighbour);
			}
		}

		this.render();
		window.setTimeout(this.step.bind(this), 50);
	}

	render() {
		const lw = 8 / (window.devicePixelRatio >= 2 ? 2 : 1);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#323032";
		ctx.fillRect(lw / 2, lw / 2, canvas.width - lw, canvas.height - lw);
		ctx.lineWidth = lw;

		const lineDetails = [];

		const line = (x1, y1, x2, y2, c, z) => {
			lineDetails.push({
				x1, y1, x2, y2,
				color: c, zIndex: z
			});
		}

		for (let x = 0; x < this.grid.length; x++) {
			for (let y = 0; y < this.grid.length; y++) {
				const cell = this.grid[x][y];
				const cx = y * this.cellSize + 4, cy = x * this.cellSize + 4;

				if (!cell.neighbours[0]) {
					line(cx - lw / 2 + 3, cy + 3, cx + this.cellSize + lw / 2 + 3, cy + 3, "#aeb1a3", 1);
					line(cx - lw / 2, cy, cx + this.cellSize + lw / 2, cy, "#f1655a", 2);
				}
				if (!cell.neighbours[1]) {
					line(cx + this.cellSize + 3, cy - lw / 2 + 3, cx + this.cellSize + 3, cy + this.cellSize + lw / 2 + 3, "#aeb1a3", 1);
					line(cx + this.cellSize, cy - lw / 2, cx + this.cellSize, cy + this.cellSize + lw / 2, "#f1655a", 2);
				}
				if (!cell.neighbours[2]) {
					line(cx - lw / 2 + 3, cy + this.cellSize + 3, cx + this.cellSize + lw / 2 + 3, cy + this.cellSize + 3, "#aeb1a3", 1);
					line(cx - lw / 2, cy + this.cellSize, cx + this.cellSize + lw / 2, cy + this.cellSize, "#f1655a", 2);
				}
				if (!cell.neighbours[3]) {
					line(cx + 3, cy - lw / 2 + 3, cx + 3, cy + this.cellSize + lw / 2 + 3, "#aeb1a3", 1);
					line(cx, cy - lw / 2, cx, cy + this.cellSize + lw / 2, "#f1655a", 2);
				}

				if (cell.prev && cell.explored) {
					const color = cell.explored === 3 ? "#dde93c" : (cell.explored === 2 ? "#0c68b4" : "#124875");
					line(
						y * this.cellSize + this.cellSize / 2 + lw / 2, x * this.cellSize + this.cellSize / 2 + lw / 2,
						cell.prev.y * this.cellSize + this.cellSize / 2 + lw / 2, cell.prev.x * this.cellSize + this.cellSize / 2 + lw / 2,
						color, cell.explored
					);
				}
			}
		}

		lineDetails.sort((a, b) => a.zIndex - b.zIndex);
		lineDetails.forEach(line => {
			ctx.strokeStyle = line.color;
			ctx.beginPath();
			ctx.moveTo(line.x1, line.y1);
			ctx.lineTo(line.x2, line.y2);
			ctx.stroke();
		});

		ctx.fillStyle = "#b5a300";
		ctx.fillRect(canvas.width / 2 - 5, canvas.height / 2 - 5, 12, 12);

		ctx.fillStyle = "yellow";
		ctx.fillRect(canvas.width / 2 - 7, canvas.height / 2 - 7, 12, 12);
	}
}

function startAnimation() {
	canvas = document.getElementById("maze");
	if (!canvas) return;
	ctx = canvas.getContext("2d");

	maze = new Maze();
	maze.onResize();
}