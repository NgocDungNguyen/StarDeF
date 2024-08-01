
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const startCustomizationBtn = document.getElementById('startCustomizationBtn');
        const startBattleBtn = document.getElementById('startBattleBtn');
        const restartBtn = document.getElementById('restartBtn');
        const menuBtn = document.getElementById('menuBtn');
        const levelTransitionElement = document.getElementById('levelTransition');
        const gameOverElement = document.getElementById('gameOver');
        const introScreenElement = document.getElementById('introScreen');
        const customizationScreenElement = document.getElementById('customizationScreen');
        const finalScoreElement = document.getElementById('finalScore');
        const muteBtn = document.getElementById('muteBtn');

        // Game variables
        let gameLoop;
        let player;
        let enemies = [];
        let bullets = [];
        let powerUps = [];
        let level = 1;
        let score = 0;
        let isGameRunning = false;
        let keys = {};
        let lastShootTime = 0;
        let boss = null;
        let isBossBattle = false;
        let levelScores = [0, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200];
        let powerUpsCollected = 0;

        // Audio
        const backgroundMusic = new Audio('https://example.com/background-music.mp3');
        backgroundMusic.loop = true;
        const shootSound = new Audio('https://example.com/shoot-sound.mp3');
        const explosionSound = new Audio('https://example.com/explosion-sound.mp3');
        const powerUpSound = new Audio('https://example.com/powerup-sound.mp3');
        let isMuted = false;

        class Player {
            constructor() {
                this.x = canvas.width / 2;
                this.y = canvas.height - 50;
                this.width = 40;
                this.height = 60;
                this.speed = 3.5;
                this.color = document.getElementById('jetColor').value;
                this.type = document.getElementById('jetType').value;
                this.bulletType = document.getElementById('bulletType').value;
                this.lives = 3;
                this.isShielded = false;
                this.shieldTimer = 0;
                this.bulletCount = 1;
            }

            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.width / 2, this.y + this.height);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                ctx.closePath();
                ctx.fill();

                // Cockpit
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(this.x, this.y + 15, 8, 15, 0, 0, Math.PI * 2);
                ctx.fill();

                // Wings
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(this.x - this.width / 2, this.y + 40);
                ctx.lineTo(this.x - this.width, this.y + 50);
                ctx.lineTo(this.x - this.width / 2, this.y + 50);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y + 40);
                ctx.lineTo(this.x + this.width, this.y + 50);
                ctx.lineTo(this.x + this.width / 2, this.y + 50);
                ctx.closePath();
                ctx.fill();

                if (this.isShielded) {
                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y + this.height / 2, this.width, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            move() {
                if (keys['ArrowLeft'] && this.x > this.width / 2) this.x -= this.speed;
                if (keys['ArrowRight'] && this.x < canvas.width - this.width / 2) this.x += this.speed;
                if (keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
                if (keys['ArrowDown'] && this.y < canvas.height - this.height) this.y += this.speed;
            }

            shoot() {
                const currentTime = Date.now();
                const shootDelay = this.bulletType === 'laser' ? 500 + (this.bulletCount - 1) * 100 : 500;
                if (currentTime - lastShootTime >= shootDelay) {
                    switch (this.bulletType) {
                        case 'single':
                            for (let i = 0; i < this.bulletCount; i++) {
                                const angle = (i - (this.bulletCount - 1) / 2) * 0.1;
                                bullets.push(new Bullet(this.x, this.y, angle));
                            }
                            break;
                        case 'auto':
                            for (let i = 0; i < this.bulletCount; i++) {
                                const angle = (i - (this.bulletCount - 1) / 2) * 0.2;
                                bullets.push(new Bullet(this.x, this.y, angle));
                            }
                            break;
                        case 'laser':
                            bullets.push(new Laser(this.x, this.y));
                            break;
                    }
                    lastShootTime = currentTime;
                    if (!isMuted) shootSound.play();
                }
            }

            activateShield() {
                this.isShielded = true;
                this.shieldTimer = 90; // 1.5 seconds at 60 FPS
            }

            updateShield() {
                if (this.isShielded) {
                    this.shieldTimer--;
                    if (this.shieldTimer <= 0) {
                        this.isShielded = false;
                    }
                }
            }
        }

        class Enemy {
            constructor() {
                this.x = Math.random() * (canvas.width - 30);
                this.y = 0;
                this.width = 30;
                this.height = 30;
                this.speed = (1 + Math.random()) * (1 + (level - 1) * 0.1);
                this.type = Math.random() < 0.7 ? 'jet' : 'asteroid';
            }

            draw() {
                if (this.type === 'jet') {
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.width / 2, this.y);
                    ctx.lineTo(this.x, this.y + this.height);
                    ctx.lineTo(this.x + this.width, this.y + this.height);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#808080';
                    ctx.beginPath();
                    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#606060';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            move() {
                this.y += this.speed;
            }
        }

        class Boss {
            constructor() {
                this.x = canvas.width / 2;
                this.y = 100;
                this.width = 150;
                this.height = 150;
                this.speed = 2 + level * 0.5;
                this.hp = 100 + level * 50;
                this.maxHp = this.hp;
                this.teleportCooldown = level === 3 ? 300 : 180; // Slower teleport for first boss
                this.shootCooldown = level === 3 ? 180 : 120 - level * 10; // Slower shooting for first boss
            }

            draw() {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.width / 2, this.y + this.height);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                ctx.closePath();
                ctx.fill();

                // Wings
                ctx.beginPath();
                ctx.moveTo(this.x - this.width / 2, this.y + this.height / 2);
                ctx.lineTo(this.x - this.width, this.y + this.height / 2 + 30);
                ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2 + 60);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width, this.y + this.height / 2 + 30);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2 + 60);
                ctx.closePath();
                ctx.fill();

                // Draw HP bar
                ctx.fillStyle = '#00ff00';
                const hpWidth = (this.hp / this.maxHp) * canvas.width;
                ctx.fillRect(0, 0, hpWidth, 10);
            }

            move() {
                if (this.teleportCooldown > 0) {
                    this.teleportCooldown--;
                } else if (Math.random() < 0.01) {
                    this.teleport();
                } else {
                    this.x += (Math.random() - 0.5) * this.speed * 2;
                    this.y += (Math.random() - 0.5) * this.speed;

                    this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
                    this.y = Math.max(this.height / 2, Math.min(canvas.height / 2, this.y));
                }
            }

            teleport() {
                this.x = Math.random() * (canvas.width - this.width) + this.width / 2;
                this.y = Math.random() * (canvas.height / 2 - this.height) + this.height / 2;
                this.teleportCooldown = level === 3 ? 300 : 180; // Reset cooldown
            }

            shoot() {
                if (this.shootCooldown <= 0) {
                    let bulletCount;
                    if (level === 3) {
                        bulletCount = 3;
                    } else if (level === 5) {
                        bulletCount = 5;
                    } else {
                        bulletCount = 7;
                    }
                    
                    for (let i = 0; i < bulletCount; i++) {
                        const angle = (i / bulletCount) * Math.PI * 2;
                        bullets.push(new EnemyBullet(this.x, this.y + this.height, angle));
                    }
                    this.shootCooldown = level === 3 ? 180 : 120 - level * 10; // Reset cooldown
                } else {
                    this.shootCooldown--;
                }
            }
        }

        class Bullet {
            constructor(x, y, angle) {
                this.x = x;
                this.y = y;
                this.width = 5;
                this.height = 10;
                this.speed = 8;
                this.angle = angle;
            }

            draw() {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
            }

            move() {
                this.y -= this.speed * Math.cos(this.angle);
                this.x += this.speed * Math.sin(this.angle);
            }
        }

        class EnemyBullet extends Bullet {
            constructor(x, y, angle) {
                super(x, y, angle);
                this.speed = 3 + level * 0.5;
                this.color = '#ff6600'; // Orange color for enemy bullets
            }

            draw() {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
            }

            move() {
                this.y += this.speed * Math.cos(this.angle);
                this.x += this.speed * Math.sin(this.angle);
            }
        }

        class Laser {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.width = 3;
                this.height = canvas.height;
                this.duration = 30; // 0.5 seconds at 60 FPS
            }

            draw() {
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(this.x - this.width / 2, 0, this.width, this.height);
            }

            move() {
                this.duration--;
            }
        }

        class PowerUp {
            constructor(type) {
                this.x = Math.random() * (canvas.width - 20);
                this.y = 0;
                this.width = 20;
                this.height = 20;
                this.speed = 1;
                this.type = type;
            }

            draw() {
                ctx.fillStyle = this.type === 'bulletUp' ? '#ff00ff' : '#ffff00';
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                ctx.lineTo(this.x + this.width, this.y + this.height / 2);
                ctx.closePath();
                ctx.fill();
            }

            move() {
                this.y += this.speed;
            }
        }

        function init() {
            canvas.width = 800;
            canvas.height = 600;
            player = new Player();
            enemies = [];
            bullets = [];
            powerUps = [];
            score = 0;
            level = 1;
            boss = null;
            isBossBattle = false;
            powerUpsCollected = 0;
            if (!isMuted) backgroundMusic.play();
        }

        function gameUpdate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            player.draw();
            player.move();
            player.updateShield();

            if (isBossBattle) {
                boss.draw();
                boss.move();
                boss.shoot();

                bullets.forEach((bullet, bulletIndex) => {
                    bullet.draw();
                    bullet.move();

                    if (bullet.y < 0 || bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width || (bullet instanceof Laser && bullet.duration <= 0)) {
                        bullets.splice(bulletIndex, 1);
                    } else if (bullet instanceof EnemyBullet) {
                        if (collision(player, bullet) && !player.isShielded) {
                            bullets.splice(bulletIndex, 1);
                            player.lives--;
                            if (player.lives <= 0) {
                                gameOver();
                            } else {
                                player.activateShield();
                            }
                        }
                    } else if (collision(boss, bullet)) {
                        bullets.splice(bulletIndex, 1);
                        boss.hp -= 5;
                        if (boss.hp <= 0) {
                            isBossBattle = false;
                            score += 1000;
                            if (level === 10) {
                                gameOver();
                            } else {
                                levelUp();
                            }
                        }
                    }
                });
            } else {
                if (Math.random() < 0.02 * (1 + (level - 1) * 0.1)) {
                    enemies.push(new Enemy());
                }

                if (Math.random() < 0.005 && powerUpsCollected < 2) {
                    powerUps.push(new PowerUp('bulletUp'));
                } else if (Math.random() < 0.01) {
                    powerUps.push(new PowerUp('shield'));
                }

                enemies.forEach((enemy, index) => {
                    enemy.draw();
                    enemy.move();

                    if (enemy.y > canvas.height) {
                        enemies.splice(index, 1);
                    }

                    if (collision(player, enemy) && !player.isShielded) {
                        enemies.splice(index, 1);
                        player.lives--;
                        if (player.lives <= 0) {
                            gameOver();
                        } else {
                            player.activateShield();
                        }
                    }
                });

                bullets.forEach((bullet, bulletIndex) => {
                    bullet.draw();
                    bullet.move();

                    if (bullet.y < 0 || (bullet instanceof Laser && bullet.duration <= 0)) {
                        bullets.splice(bulletIndex, 1);
                    }

                    enemies.forEach((enemy, enemyIndex) => {
                        if (collision(bullet, enemy)) {
                            enemies.splice(enemyIndex, 1);
                            if (!(bullet instanceof Laser)) {
                                bullets.splice(bulletIndex, 1);
                            }
                            score += 10;
                            if (!isMuted) explosionSound.play();
                        }
                    });
                });

                powerUps.forEach((powerUp, index) => {
                    powerUp.draw();
                    powerUp.move();

                    if (powerUp.y > canvas.height) {
                        powerUps.splice(index, 1);
                    }

                    if (collision(player, powerUp)) {
                        if (powerUp.type === 'bulletUp') {
                            if (powerUpsCollected < 2) {
                                player.bulletCount = Math.min(player.bulletCount + 1, 5);
                                powerUpsCollected++;
                            }
                        } else if (powerUp.type === 'shield') {
                            player.activateShield();
                        }
                        powerUps.splice(index, 1);
                        if (!isMuted) powerUpSound.play();
                    }
                });
            }

            drawHUD();

            if (score >= levelScores[level] && !isBossBattle) {
                if (level === 3 || level === 5 || level === 10) {
                    startBossBattle();
                } else {
                    levelUp();
                }
            }

            if (isGameRunning) {
                requestAnimationFrame(gameUpdate);
            }
        }

        function drawHUD() {
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Orbitron';
            ctx.fillText(`Score: ${score}`, 10, 30);
            ctx.fillText(`Level: ${level}`, canvas.width - 100, 30);
            ctx.fillText(`Lives: ${player.lives}`, 10, canvas.height - 10);
            ctx.fillText(`Next Level: ${levelScores[level] - score}`, canvas.width / 2 - 70, 30);
        }

        function levelUp() {
            if (level < 10) {
                level++;
                powerUpsCollected = 0;
                isGameRunning = false;
                displayLevelTransition();
            }
        }

        function startBossBattle() {
            isBossBattle = true;
            boss = new Boss();
            enemies = [];
            powerUps = [];
            displayLevelTransition("Boss Battle!");
        }

        function displayLevelTransition(message = "") {
            levelTransitionElement.style.display = 'flex';
            levelTransitionElement.innerHTML = `
                <h2 style="font-size: 3em; margin-bottom: 20px;">${message ? message : `Level ${level}`}</h2>
                <div id="countdown" style="font-size: 5em;"></div>
            `;
            countdown(3);
        }

        function countdown(count) {
            const countdownElement = document.getElementById('countdown');
            if (count > 0) {
                countdownElement.textContent = count;
                setTimeout(() => countdown(count - 1), 1000);
            } else {
                levelTransitionElement.style.display = 'none';
                isGameRunning = true;
                player.activateShield();
                gameUpdate();
            }
        }

        function collision(obj1, obj2) {
            return obj1.x < obj2.x + obj2.width &&
                   obj1.x + obj1.width > obj2.x &&
                   obj1.y < obj2.y + obj2.height &&
                   obj1.y + obj1.height > obj2.y;
        }

        function gameOver() {
            isGameRunning = false;
            gameOverElement.style.display = 'flex';
            finalScoreElement.textContent = score;
        }

        function startGame() {
            customizationScreenElement.style.display = 'none';
            init();
            displayLevelTransition();
        }

        startCustomizationBtn.addEventListener('click', () => {
            introScreenElement.style.display = 'none';
            customizationScreenElement.style.display = 'flex';
        });

        startBattleBtn.addEventListener('click', startGame);

        restartBtn.addEventListener('click', () => {
            gameOverElement.style.display = 'none';
            startGame();
        });

        menuBtn.addEventListener('click', () => {
            gameOverElement.style.display = 'none';
            customizationScreenElement.style.display = 'flex';
        });

        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            muteBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
            if (isMuted) {
                backgroundMusic.pause();
            } else {
                backgroundMusic.play();
            }
        });

        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            if (e.key === ' ') {
                e.preventDefault();
                player.shoot();
            }
        });

        document.addEventListener('keyup', (e) => {
            keys[e.key] = false;
        });

        // Add floating icons around the game container
        const iconClasses = ['fa-rocket', 'fa-star', 'fa-moon', 'fa-planet'];
        const container = document.querySelector('.container');
        const gameContainer = document.querySelector('.game-container');
        const rect = gameContainer.getBoundingClientRect();

        for (let i = 0; i < 20; i++) {
            const icon = document.createElement('i');
            icon.className = `fas ${iconClasses[Math.floor(Math.random() * iconClasses.length)]} floating-icon`;
            
            let x, y;
            do {
                x = Math.random() * container.clientWidth;
                y = Math.random() * container.clientHeight;
            } while (
                x > rect.left - 50 && x < rect.right + 50 &&
                y > rect.top - 50 && y < rect.bottom + 50
            );

            icon.style.left = `${x}px`;
            icon.style.top = `${y}px`;
            icon.style.animation = `float ${3 + Math.random() * 4}s infinite ease-in-out`;
            container.appendChild(icon);
        }

        // Animate title
        gsap.to('h1', {duration: 2, y: -20, yoyo: true, repeat: -1, ease: 'power1.inOut'});

        init();
