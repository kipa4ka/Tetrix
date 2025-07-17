// Оголошення змінних для елементів DOM
const screens = document.querySelectorAll(".screen");
const buttonContainer = document.querySelector(".button-container");
const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const scoreElement = document.getElementById('scoreValue');
const finalCoinsElement = document.getElementById('finalCoins');

// Завантаження зображення монетки
const coinImage = new Image();
coinImage.src = 'images/coin.png'; // Ви додасте це зображення самостійно

// Перевірка наявності необхідних елементів
if (!canvas || !ctx) {
    console.error("Помилка: Не знайдено canvas або контекст!");
}
if (!scoreElement) {
    console.error("Помилка: Не знайдено елемент для рахунку!");
}
if (!finalCoinsElement) {
    console.error("Помилка: Не знайдено елемент для фінального рахунку!");
} else {
    console.log("finalCoinsElement знайдено:", finalCoinsElement);
}

// Налаштування canvas
const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
if (canvas) {
    canvas.width = BOARD_WIDTH * BLOCK_SIZE; // 400 пікселів
    canvas.height = BOARD_HEIGHT * BLOCK_SIZE; // 800 пікселів
}

// Стан гри
let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill({ color: 0, hasCoin: false }));
let coins = 0;
let gameOver = false;
let currentPiece = null;
let gameLoop = null;
let clearAnimation = null;
let lastUpdate = null;
let fallSpeed = 1000;
let fastFall = false;
const FAST_FALL_MULTIPLIER = 0.1;

// Фігури тетроміно
const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]], // Z
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]], // L
];

const COLORS = [
    '#00ffff', // Бірюзовий
    '#ffff00', // Жовтий
    '#ff9d00', // Помаранчевий
    '#00ff9d', // Зелений
    '#ff3e3e', // Червоний
    '#0000f0', // Синій
    '#f0a000', // Темно-помаранчевий
];

// Створення нової фігури
function createPiece() {
    const index = Math.floor(Math.random() * SHAPES.length);
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    const piece = {
        shape: SHAPES[index],
        color: COLORS[colorIndex],
        x: Math.floor((BOARD_WIDTH - SHAPES[index][0].length) / 2),
        y: 0,
        fallProgress: 0,
        lastFallTime: Date.now(),
        animationOffset: Date.now(),
        coinPosition: null
    };
    if (Math.random() < 0.5) {
        const blocks = [];
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    blocks.push({ x, y });
                }
            }
        }
        if (blocks.length > 0) {
            const randomBlock = blocks[Math.floor(Math.random() * blocks.length)];
            piece.coinPosition = { x: randomBlock.x, y: randomBlock.y };
        }
    }
    return piece;
}

// Малювання дошки з анімаціями
function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x].color) {
                drawBlock(x, y, board[y][x].color, board[y][x].hasCoin);
            }
        }
    }
    if (currentPiece) {
        const time = Date.now();
        ctx.fillStyle = currentPiece.color;
        ctx.globalAlpha = 1;
        const yOffset = currentPiece.fallProgress * BLOCK_SIZE;
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    const hasCoin = currentPiece.coinPosition && currentPiece.coinPosition.x === x && currentPiece.coinPosition.y === y;
                    drawBlock(currentPiece.x + x, currentPiece.y + y + currentPiece.fallProgress, currentPiece.color, hasCoin);
                }
            }
        }
        ctx.globalAlpha = 1;
    }
}

// Малювання блоку з чорною обводкою та монеткою
function drawBlock(x, y, color, hasCoin = false) {
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 1;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
    if (hasCoin && coinImage.complete && coinImage.naturalWidth !== 0) {
        ctx.drawImage(coinImage, x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
    }
}

// Перевірка колізій
function collision(piece, dx = 0, dy = 0, useProgress = true) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + dx;
                const minY = Math.floor(piece.y + y);
                const maxY = Math.floor(piece.y + y + (useProgress ? piece.fallProgress : 0)) + 1;
                if (
                    newX < 0 ||
                    newX >= BOARD_WIDTH ||
                    (dy === 0 && minY < BOARD_HEIGHT && maxY >= 0)
                ) {
                    for (let checkY = Math.max(0, minY); checkY < Math.min(BOARD_HEIGHT, maxY); checkY++) {
                        if (board[checkY][newX].color) {
                            return true;
                        }
                    }
                }
                const newY = Math.floor(piece.y + y + dy + (useProgress ? piece.fallProgress : 0));
                if (
                    newY >= BOARD_HEIGHT ||
                    (newY >= 0 && board[newY][newX].color)
                ) {
                    return true;
                }
            }
        }
    }
    return false;
}
window.Te
// Об’єднання фігури з дошкою
function merge() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = Math.floor(currentPiece.y + y + currentPiece.fallProgress);
                if (boardY >= 0 && boardY < BOARD_HEIGHT) {
                    const hasCoin = currentPiece.coinPosition && currentPiece.coinPosition.x === x && currentPiece.coinPosition.y === y;
                    board[boardY][currentPiece.x + x] = { color: currentPiece.color, hasCoin };
                }
            }
        }
    }
    currentPiece.fallProgress = 0;
}

// Очищення заповнених рядів з анімацією
function clearRows() {
    let rowsCleared = 0;
    let rowsToClear = [];
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell.color !== 0)) {
            rowsToClear.push(y);
            rowsCleared++;
        }
    }
    if (rowsCleared > 0) {
        clearAnimation = { rows: rowsToClear, startTime: Date.now() };
        rowsToClear.forEach(y => {
            board[y].forEach(cell => {
                if (cell.hasCoin) {
                    coins += 1;
                    console.log("Монетка додана, coins:", coins); // Дебаг
                    if (scoreElement) scoreElement.textContent = coins;
                }
            });
        });
    }
}

// Анімація очищення рядів
function animateClearRows() {
    if (!clearAnimation || !ctx) return;
    const progress = (Date.now() - clearAnimation.startTime) / 1000;
    if (progress >= 1) {
        clearAnimation.rows.sort((a, b) => b - a).forEach(y => {
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill({ color: 0, hasCoin: false }));
        });
        clearAnimation = null;
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x].color) {
                if (clearAnimation.rows.includes(y)) {
                    ctx.fillStyle = progress < 0.85 ? board[y][x].color : '#fff';
                    ctx.globalAlpha = progress < 0.85 ? 1 : 1 - (progress - 0.85) / 0.15;
                    drawBlock(x, y, ctx.fillStyle, board[y][x].hasCoin);
                    ctx.globalAlpha = 1;
                } else {
                    drawBlock(x, y, board[y][x].color, board[y][x].hasCoin);
                }
            }
        }
    }
}

// Поворот фігури
function rotatePiece() {
    if (!currentPiece) return;
    const newShape = Array(currentPiece.shape[0].length)
        .fill()
        .map(() => Array(currentPiece.shape.length).fill(0));
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            newShape[x][currentPiece.shape.length - 1 - y] = currentPiece.shape[y][x];
        }
    }
    const tempShape = currentPiece.shape;
    const tempCoinPosition = currentPiece.coinPosition;
    currentPiece.shape = newShape;
    if (tempCoinPosition) {
        const newX = tempCoinPosition.y;
        const newY = currentPiece.shape.length - 1 - tempCoinPosition.x;
        currentPiece.coinPosition = { x: newX, y: newY };
    }
    if (collision(currentPiece, 0, 0, false)) {
        currentPiece.shape = tempShape;
        currentPiece.coinPosition = tempCoinPosition;
    }
}

// Рух фігури
function movePiece(dx, dy) {
    if (!currentPiece) return false;
    if (!collision(currentPiece, dx, dy, dx !== 0)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

// Оновлення гри
function update() {
    if (gameOver || !ctx) return;
    if (clearAnimation) {
        animateClearRows();
        return;
    }
    if (!currentPiece) {
        currentPiece = createPiece();
        if (collision(currentPiece, 0, 0, false)) {
            gameOver = true;
            if (gameLoop) {
                clearInterval(gameLoop);
                gameLoop = null;
            }
            if (clearAnimation) {
                clearAnimation = null;
            }
            if (finalCoinsElement) {
                console.log("Оновлення finalCoins, coins:", coins); // Дебаг
                finalCoinsElement.textContent = coins;
            }
            setTimeout(() => {
                showScreen('gameOver');
            }, 1000);
            return;
        }
        draw();
        return;
    }
    const now = Date.now();
    const deltaTime = now - (lastUpdate || now);
    lastUpdate = now;
    const currentSpeed = fastFall ? fallSpeed * FAST_FALL_MULTIPLIER : fallSpeed;
    currentPiece.fallProgress += deltaTime / currentSpeed;
    const animationDuration = fastFall ? 10000 * FAST_FALL_MULTIPLIER : 10000;
    currentPiece.animationOffset = now - (now % animationDuration);
    if (currentPiece.fallProgress >= 1) {
        currentPiece.y += Math.floor(currentPiece.fallProgress);
        currentPiece.fallProgress = currentPiece.fallProgress % 1;
        if (collision(currentPiece, 0, 1, false)) {
            merge();
            clearRows();
            currentPiece = null;
        }
    }
    draw();
}

// Запуск гри
function startGame() {
    if (!ctx) {
        console.error("Не можна запустити гру: відсутній контекст canvas");
        return;
    }
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill({ color: 0, hasCoin: false }));
    coins = 0;
    if (scoreElement) scoreElement.textContent = coins;
    gameOver = false;
    currentPiece = createPiece();
    lastUpdate = Date.now();
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 16);
    draw();
    console.log("Гра запущена!");
}

// Функція перемикання екранів
function showScreen(screenId) {
    screens.forEach((screen) => {
        screen.style.display = "none";
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.style.display = "flex";
        console.log(`Відкрито екран: ${screenId}`);
        if (screenId === 'gamePage') {
            if (buttonContainer) buttonContainer.style.display = 'none';
            if (canvas) canvas.style.margin = '0 auto';
            startGame();
        } else if (screenId === 'gameOver') {
            if (buttonContainer) buttonContainer.style.display = 'flex';
            if (gameLoop) {
                clearInterval(gameLoop);
                gameLoop = null;
            }
            if (clearAnimation) {
                clearAnimation = null;
            }
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            if (userId && finalCoinsElement) {
                const finalCoins = parseInt(finalCoinsElement.textContent) || coins;
                fetch(`http://localhost:5000/users/${userId}/coins`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coins: finalCoins })
                })
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    console.log('Coins updated:', data);
                    if (finalCoinsElement) finalCoinsElement.textContent = data.coins;
                })
                .catch(err => console.error('Error updating coins:', err));
            }
        } else if (screenId === 'lobbyPage') {
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            if (userId) {
                // Отримання особистих коїнів
                fetch(`http://localhost:5000/users/${userId}`)
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.json();
                    })
                    .then(data => {
                        const lobbyCoins = document.getElementById('lobbyCoins');
                        if (lobbyCoins) lobbyCoins.textContent = data.coins || 0;
                    })
                    .catch(err => console.error('Error fetching coins for lobby:', err));
                // Отримання загальних коїнів
                fetch(`http://localhost:5000/total-coins`)
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.json();
                    })
                    .then(data => {
                        const totalCoinsElement = document.getElementById('totalCoins');
                        if (totalCoinsElement) totalCoinsElement.textContent = data.totalCoins || 0;
                    })
                    .catch(err => console.error('Error fetching total coins:', err));
            }
        } else {
            if (buttonContainer) buttonContainer.style.display = 'flex';
            if (gameLoop) {
                clearInterval(gameLoop);
                gameLoop = null;
            }
            if (clearAnimation) {
                clearAnimation = null;
            }
        }
    } else {
        console.error(`Екран з id ${screenId} не знайдено!`);
    }
}

function goTo(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}
window.onload = function () {
    goTo('lobbyPage');
};

// Обробники подій
document.addEventListener('keydown', (e) => {
    if (!currentPiece || gameOver) return;
    switch (e.key) {
        case 'a':
            movePiece(-1, 0);
            break;
        case 'd':
            movePiece(1, 0);
            break;
        case 's':
            fastFall = true;
            break;
        case 'w':
            rotatePiece();
            break;
    }
    draw();
});

document.addEventListener('keyup', (e) => {
    if (e.key === 's') {
        fastFall = false;
    }
});

// Обробник кнопки Play
const playButton = document.querySelector('.button-play');
if (playButton) {
    playButton.addEventListener('click', () => {
        console.log("Натиснуто кнопку Play!");
        showScreen('gamePage');
    });
} else {
    console.error("Помилка: Кнопка .button-play не знайдена!");
}

// Обробники кнопок на екрані Game Over
const restartButton = document.querySelector('.restart');
const backToHomeButton = document.querySelector('.lobbyfinalbutton');

if (restartButton) {
    restartButton.addEventListener('click', () => {
        console.log("Натиснуто кнопку Restart!");
        showScreen('gamePage');
    });
} else {
    console.error("Помилка: Кнопка .restart не знайдена!");
}

if (backToHomeButton) {
    backToHomeButton.addEventListener('click', () => {
        console.log("Натиснуто кнопку Lobby!");
        showScreen('lobbyPage');
    });
} else {
    console.error("Помилка: Кнопка .lobbyfinalbutton не знайдена!");
}