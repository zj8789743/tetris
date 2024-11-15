class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d', { alpha: false });
        
        // 设置画布大小
        this.setupCanvas();
        
        this.blockSize = this.canvas.width / 10; // 动态计算方块大小
        this.cols = 10;
        this.rows = 20;
        
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        
        this.currentPiece = null;
        this.nextPiece = null;
        
        // 添加游戏循环相关变量
        this.lastTime = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        
        // 添加窗口调整监听
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.blockSize = this.canvas.width / 10;
            this.draw();
        });
        
        this.initializeControls();
        this.initializeGame();
    }

    setupCanvas() {
        // 获取父容器的宽度
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 20; // 减去padding
        
        // 设置主画布
        this.canvas.width = Math.min(300, containerWidth);
        this.canvas.height = this.canvas.width * 2;
        
        // 设置预览画布
        this.nextCanvas.width = Math.min(100, containerWidth / 3);
        this.nextCanvas.height = this.nextCanvas.width;
        
        // 设置画布样式
        this.ctx.imageSmoothingEnabled = false;
        this.nextCtx.imageSmoothingEnabled = false;
    }

    initializeControls() {
        // 触摸控制
        const addTouchHandler = (elementId, handler) => {
            const element = document.getElementById(elementId);
            if (!element) return;

            let touchInterval;
            
            element.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handler.bind(this)();
                
                // 长按处理
                if (elementId === 'down') {
                    touchInterval = setInterval(() => handler.bind(this)(), 50);
                }
            });
            
            element.addEventListener('touchend', () => {
                if (touchInterval) {
                    clearInterval(touchInterval);
                }
            });

            // 添加鼠标事件支持
            element.addEventListener('mousedown', (e) => {
                e.preventDefault();
                handler.bind(this)();
                
                if (elementId === 'down') {
                    touchInterval = setInterval(() => handler.bind(this)(), 50);
                }
            });
            
            element.addEventListener('mouseup', () => {
                if (touchInterval) {
                    clearInterval(touchInterval);
                }
            });
        };

        // 绑定方向控制
        addTouchHandler('left', this.moveLeft);
        addTouchHandler('right', this.moveRight);
        addTouchHandler('down', this.moveDown);
        addTouchHandler('up', this.rotate);
        addTouchHandler('rotate', this.rotate);
        
        // 开始按钮
        const startButton = document.getElementById('start');
        if (startButton) {
            startButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startGame();
            });
            startButton.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startGame();
            });
        }
        
        // 暂停按钮
        const pauseButton = document.getElementById('pause');
        if (pauseButton) {
            pauseButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.togglePause();
            });
            pauseButton.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.togglePause();
            });
        }
        
        // 防止页面滚动
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.game-console')) {
                e.preventDefault();
            }
        }, { passive: false });

        // 添加键盘控制
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.moveLeft();
                    break;
                case 'ArrowRight':
                    this.moveRight();
                    break;
                case 'ArrowDown':
                    this.moveDown();
                    break;
                case 'ArrowUp':
                case ' ':
                    this.rotate();
                    break;
                case 'p':
                case 'P':
                    this.togglePause();
                    break;
                case 'Enter':
                    if (this.gameOver) {
                        this.startGame();
                    }
                    break;
            }
        });
    }

    initializeGame() {
        this.pieces = [
            [[1,1,1,1]], // I
            [[1,1,1],[0,1,0]], // T
            [[1,1,1],[1,0,0]], // L
            [[1,1,1],[0,0,1]], // J
            [[1,1],[1,1]], // O
            [[1,1,0],[0,1,1]], // Z
            [[0,1,1],[1,1,0]] // S
        ];
        
        this.createNewPiece();
        this.gameLoop();
    }

    createNewPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.pieces[Math.floor(Math.random() * this.pieces.length)];
        }
        
        this.currentPiece = {
            shape: this.nextPiece,
            x: Math.floor(this.cols/2) - Math.floor(this.nextPiece[0].length/2),
            y: 0
        };
        
        this.nextPiece = this.pieces[Math.floor(Math.random() * this.pieces.length)];
        this.drawNextPiece();
        
        if (this.checkCollision()) {
            this.gameOver = true;
            this.saveScore();
        }
    }

    moveLeft() {
        if (this.gameOver || this.isPaused) return;
        this.currentPiece.x--;
        if (this.checkCollision()) {
            this.currentPiece.x++;
        }
    }

    moveRight() {
        if (this.gameOver || this.isPaused) return;
        this.currentPiece.x++;
        if (this.checkCollision()) {
            this.currentPiece.x--;
        }
    }

    moveDown() {
        if (this.gameOver || this.isPaused) return;
        this.currentPiece.y++;
        if (this.checkCollision()) {
            this.currentPiece.y--;
            this.freezePiece();
            this.clearLines();
            this.createNewPiece();
        }
    }

    rotate() {
        if (this.gameOver || this.isPaused) return;
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );
        
        const previousShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;
        
        if (this.checkCollision()) {
            this.currentPiece.shape = previousShape;
        }
    }

    checkCollision() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardX = this.currentPiece.x + x;
                    const boardY = this.currentPiece.y + y;
                    
                    if (boardX < 0 || boardX >= this.cols ||
                        boardY >= this.rows ||
                        (boardY >= 0 && this.board[boardY][boardX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    freezePiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = this.currentPiece.y + y;
                    if (boardY >= 0) {
                        this.board[boardY][this.currentPiece.x + x] = 1;
                    }
                }
            }
        }
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell === 1)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.cols).fill(0));
                linesCleared++;
                y++;
            }
        }
        
        if (linesCleared > 0) {
            const points = [40, 100, 300, 1200][linesCleared - 1] * this.level;
            this.score += points;
            this.level = Math.floor(this.score / 1000) + 1;
            document.getElementById('score').textContent = this.score;
            document.getElementById('level').textContent = this.level;
        }
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景网格
        this.ctx.strokeStyle = '#a5c147';
        this.ctx.lineWidth = 0.5;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.ctx.strokeRect(
                    x * this.blockSize,
                    y * this.blockSize,
                    this.blockSize,
                    this.blockSize
                );
            }
        }
        
        // 绘制已固定的方块
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y);
                }
            }
        }
        
        // 绘制当前方块
        if (this.currentPiece) {
            for (let y = 0; y < this.currentPiece.shape.length; y++) {
                for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                    if (this.currentPiece.shape[y][x]) {
                        this.drawBlock(this.currentPiece.x + x, this.currentPiece.y + y);
                    }
                }
            }
        }

        // 绘制游戏状态
        if (this.gameOver || this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            
            if (this.gameOver) {
                this.ctx.fillText('游戏结束', this.canvas.width/2, this.canvas.height/2);
                this.ctx.font = '20px Arial';
                this.ctx.fillText('点击开始重新游戏', this.canvas.width/2, this.canvas.height/2 + 40);
            } else {
                this.ctx.fillText('暂停', this.canvas.width/2, this.canvas.height/2);
            }
        }
    }

    drawBlock(x, y) {
        // 使用固定的颜色而不是随机颜色
        this.ctx.fillStyle = '#306230';
        this.ctx.fillRect(
            x * this.blockSize,
            y * this.blockSize,
            this.blockSize - 1,
            this.blockSize - 1
        );
        
        // 添加内部阴影效果使方块更立体
        this.ctx.fillStyle = '#8bac0f';
        this.ctx.fillRect(
            x * this.blockSize + 3,
            y * this.blockSize + 3,
            this.blockSize - 4,
            this.blockSize - 4
        );
    }

    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const blockSize = 20;
        const offsetX = (this.nextCanvas.width - this.nextPiece[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.length * blockSize) / 2;
        
        for (let y = 0; y < this.nextPiece.length; y++) {
            for (let x = 0; x < this.nextPiece[y].length; x++) {
                if (this.nextPiece[y][x]) {
                    this.nextCtx.fillStyle = '#0f380f';
                    this.nextCtx.fillRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            }
        }
    }

    gameLoop(time = 0) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        
        if (!this.gameOver && !this.isPaused) {
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval / (this.level * 0.5 + 0.5)) {
                this.moveDown();
                this.dropCounter = 0;
            }
        }
        
        this.draw();
        requestAnimationFrame(time => this.gameLoop(time));
    }

    startGame() {
        if (this.gameOver) {
            this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
            this.score = 0;
            this.level = 1;
            this.gameOver = false;
            this.isPaused = false;
            document.getElementById('score').textContent = '0';
            document.getElementById('level').textContent = '1';
            this.createNewPiece();
        }
    }

    togglePause() {
        if (!this.gameOver) {
            this.isPaused = !this.isPaused;
        }
    }

    async saveScore() {
        if (this.score > 0) {
            await Database.saveScore(this.score);
        }
    }
}

// 游戏实例化
document.addEventListener('DOMContentLoaded', () => {
    const game = new TetrisGame();
});
