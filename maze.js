let canvas, ctx, maze;

window.addEventListener("load", startAnimation);
window.addEventListener("resize", () => maze.onResize());

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
		this.grid = [];
		const numCells = Math.floor(canvas.width / this.cellSize / 2) * 2;

		for (let x = 0; x < numCells; x++) {
			this.grid.push([]);

			for (let y = 0; y < numCells; y++) {
				this.grid[this.grid.length - 1].push({
					x, y, prev: null,
					neighbours: [null, null, null, null],
					distance: -1
				});
			}
		}

		this.runDFS();

		const mid = this.grid.length / 2;
		this.goalCells = [
			this.grid[mid - 1][mid - 1], this.grid[mid - 1][mid],
			this.grid[mid][mid - 1], this.grid[mid][mid]
		];
		this.goalCells.forEach(c => c.neighbours = [1, 1, 1, 1]);

		this.start();
	}

	runDFS() {
		const stack = [this.grid[0][0]];
		const visited = new Set();

		const shuffle = (arr) => {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			return arr;
		}

		while (stack.length) {
			const current = stack.pop();
			if (current.prev) {
				if (current.prev.x === current.x - 1) {
					current.neighbours[0] = current.prev;
					current.prev.neighbours[2] = current;
				}
				if (current.prev.y === current.y - 1) {
					current.neighbours[3] = current.prev;
					current.prev.neighbours[1] = current;
				}
				if (current.prev.x === current.x + 1) {
					current.neighbours[2] = current.prev;
					current.prev.neighbours[0] = current;
				}
				if (current.prev.y === current.y + 1) {
					current.neighbours[1] = current.prev;
					current.prev.neighbours[3] = current;
				}
			}
			visited.add(current);
			let neighbours = [];

			if (current.x > 0) neighbours.push(this.grid[current.x - 1][current.y]);
			if (current.y > 0) neighbours.push(this.grid[current.x][current.y - 1]);
			if (current.x < this.grid.length - 1) neighbours.push(this.grid[current.x + 1][current.y]);
			if (current.y < this.grid.length - 1) neighbours.push(this.grid[current.x][current.y + 1]);

			neighbours = neighbours.filter(n => !visited.has(n));
			neighbours.forEach(n => {
				if (!n.prev) {
					n.prev = current;
				}
			});
			neighbours = shuffle(neighbours);
			stack.push(...neighbours);
		}
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
		if (this.queue.length === 0) {
			return;
		}

		if (this.done) {
			this.current.explored = 3;
			this.render();

			if (!this.current.prev || (this.current.x === 0 && this.current.y === 0)) {
				return;
			}

			this.current = this.current.prev;
			window.setTimeout(this.step.bind(this), 50);
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
	ctx = canvas.getContext("2d");

	maze = new Maze();
	maze.onResize();
}