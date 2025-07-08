import React, { useState, useCallback, useEffect } from 'react';

function App() {
    const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'gameOver'
    const [score, setScore] = useState(0);
    const [beePosition, setBeePosition] = useState({ x: 100, y: 300 });
    const [isJumping, setIsJumping] = useState(false);
    const [obstacles, setObstacles] = useState([]);
    const [gameSpeed, setGameSpeed] = useState(2);
    const [bitcoinPosition, setBitcoinPosition] = useState({ x: 700, y: 280 });
    const [bitcoinCaught, setBitcoinCaught] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [canRestart, setCanRestart] = useState(true);

    const GROUND_HEIGHT = 350;
    const BEE_SIZE = 40;
    const JUMP_HEIGHT = 120;
    const OBSTACLE_WIDTH = 30;
    const OBSTACLE_HEIGHT = 60;
    const BITCOIN_SIZE = 30;

    // Load high score on component mount
    useEffect(() => {
        try {
            const savedHighScore = localStorage.getItem('bitcoinChaseHighScore');
            if (savedHighScore) {
                setHighScore(parseInt(savedHighScore));
            }
        } catch (error) {
            console.error('Error loading high score from localStorage:', error);
        }
    }, []);

    // Save high score to localStorage
    const saveHighScore = useCallback((score) => {
        try {
            localStorage.setItem('bitcoinChaseHighScore', score.toString());
            setHighScore(score);
            console.log('High score saved to localStorage:', score);
        } catch (error) {
            console.error('Error saving high score to localStorage:', error);
            // Fallback - просто обновляем состояние
            setHighScore(score);
        }
    }, []);

    // Generate obstacles
    const generateObstacle = useCallback(() => {
        return {
            id: Date.now() + Math.random(),
            x: 800,
            y: GROUND_HEIGHT - OBSTACLE_HEIGHT,
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT
        };
    }, []);

    // Bee jump
    const jump = useCallback(() => {
        if (gameState !== 'playing' || isJumping) return;

        setIsJumping(true);
        setBeePosition(prev => ({ ...prev, y: prev.y - JUMP_HEIGHT }));

        setTimeout(() => {
            setBeePosition(prev => ({ ...prev, y: GROUND_HEIGHT - BEE_SIZE }));
            setIsJumping(false);
        }, 600);
    }, [gameState, isJumping]);

    // Handle key presses
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                if (gameState === 'playing') {
                    jump();
                } else if ((gameState === 'start' || gameState === 'gameOver') && canRestart) {
                    startGame();
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [gameState, jump, canRestart]);

    // Handle touch events for mobile
    useEffect(() => {
        const handleTouchStart = (e) => {
            e.preventDefault();
            if (gameState === 'playing') {
                jump();
            } else if ((gameState === 'start' || gameState === 'gameOver') && canRestart) {
                startGame();
            }
        };

        const handleTouchEnd = (e) => {
            e.preventDefault();
        };

        // Add touch event listeners
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [gameState, jump, canRestart]);

    // Check collision
    const checkCollision = useCallback((bee, obstacle) => {
        const padding = 16;
        return (
            bee.x + padding < obstacle.x + obstacle.width &&
            bee.x + BEE_SIZE - padding > obstacle.x &&
            bee.y + padding < obstacle.y + obstacle.height &&
            bee.y + BEE_SIZE - padding > obstacle.y
        );
    }, []);

    // Check bitcoin catch
    const checkBitcoinCatch = useCallback((bee, bitcoin) => {
        const catchDistance = 50;
        return (
            Math.abs(bee.x - bitcoin.x) < catchDistance &&
            Math.abs(bee.y - bitcoin.y) < catchDistance
        );
    }, []);

    // Game over handler
    const handleGameOver = useCallback(() => {
        const finalScore = Math.floor(score / 10);

        // Запрещаем перезапуск на короткое время
        setCanRestart(false);

        // Check for new high score and save it
        if (finalScore > highScore) {
            setIsNewRecord(true);
            saveHighScore(finalScore);
            setTimeout(() => setIsNewRecord(false), 3000);
        }

        setGameState('gameOver');

        // Разрешаем перезапуск через небольшую задержку
        setTimeout(() => {
            setCanRestart(true);
        }, 500);
    }, [score, highScore, saveHighScore]);

    // Start game
    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setBeePosition({ x: 100, y: GROUND_HEIGHT - BEE_SIZE });
        setObstacles([]);
        setGameSpeed(2);
        setIsJumping(false);
        setBitcoinPosition({ x: 700, y: 280 });
        setBitcoinCaught(false);
        setIsNewRecord(false);
        setCanRestart(true);
    };

    // Main game loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const gameLoop = setInterval(() => {
            // Move obstacles
            setObstacles(prev => {
                const newObstacles = prev
                    .map(obstacle => ({ ...obstacle, x: obstacle.x - gameSpeed }))
                    .filter(obstacle => obstacle.x > -OBSTACLE_WIDTH);

                // Add new obstacles
                if (newObstacles.length === 0 ||
                    newObstacles[newObstacles.length - 1].x < 500) {
                    if (Math.random() < 0.25) {
                        newObstacles.push(generateObstacle());
                    }
                }

                // Check collisions
                const currentBee = { x: beePosition.x, y: beePosition.y };
                const collision = newObstacles.some(obstacle =>
                    checkCollision(currentBee, obstacle)
                );

                if (collision) {
                    // Use setTimeout to ensure state updates don't conflict
                    setTimeout(() => {
                        handleGameOver();
                    }, 0);
                }

                return newObstacles;
            });

            // Move bitcoin (floating movement)
            setBitcoinPosition(prev => {
                const newX = prev.x - gameSpeed * 0.8;
                const newY = GROUND_HEIGHT - BITCOIN_SIZE - 30 + Math.sin(Date.now() * 0.01) * 20;

                if (newX < -BITCOIN_SIZE) {
                    return { x: 800 + Math.random() * 200, y: newY };
                }

                return { x: newX, y: newY };
            });

            // Check if bitcoin is caught
            const currentBee = { x: beePosition.x, y: beePosition.y };
            const currentBitcoin = { x: bitcoinPosition.x, y: bitcoinPosition.y };

            if (checkBitcoinCatch(currentBee, currentBitcoin)) {
                setBitcoinCaught(true);
                setTimeout(() => {
                    setBitcoinCaught(false);
                    setBitcoinPosition({ x: 800 + Math.random() * 200, y: bitcoinPosition.y });
                }, 200);
                setScore(prev => prev + 100);
            }

            // Increase score
            setScore(prev => prev + 1);

            // Increase speed
            setGameSpeed(prev => Math.min(prev + 0.001, 5));
        }, 16);

        return () => clearInterval(gameLoop);
    }, [gameState, beePosition, bitcoinPosition, gameSpeed, checkCollision, checkBitcoinCatch, generateObstacle, handleGameOver]);

    // Компонент пчелы
    const Bee = ({ x, y }) => (
        <div
            className={`absolute transition-all duration-100 ${isJumping ? 'animate-bounce' : ''}`}
            style={{
                left: x,
                top: y,
                width: BEE_SIZE,
                height: BEE_SIZE,
                zIndex: 10
            }}
        >
            <img
                src={require('./mascot_native.png')}
                // src="https://i.ibb.co/QFwZZjJj/Copilot-20250628-030848-1.png"
                alt="GoNative Bee"
                className="w-full h-full object-contain"
                style={{
                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                    transform: 'scale(3.5)',
                    paddingBottom: 8
                }}
            />
        </div>
    );

    // Bitcoin component
    const Bitcoin = ({ x, y }) => (
        <div
            className={`absolute transition-all duration-100 ${bitcoinCaught ? 'animate-ping' : ''}`}
            style={{
                left: x,
                top: y,
                width: BITCOIN_SIZE,
                height: BITCOIN_SIZE,
                zIndex: 8
            }}
        >
            <div className="w-full h-full flex items-center justify-center text-2xl animate-pulse">
                <img
                    src={require('./btc.webp')}
                    // src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png"
                    alt="BTC"
                    className="w-full h-full object-contain"
                    style={{
                        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                        transform: 'scale(1.5)',
                        paddingBottom: 8
                    }}
                />
                {/*₿*/}
            </div>
        </div>
    );

    // Obstacle component
    const Obstacle = ({ obstacle }) => (
        <div
            className="absolute bg-red-600 rounded-t-lg"
            style={{
                left: obstacle.x,
                top: obstacle.y,
                width: obstacle.width,
                height: obstacle.height
            }}
        >
            <div className="w-full h-2 bg-red-700 rounded-t-lg"></div>
        </div>
    );

    return (
        <div
            className="w-full h-screen bg-gradient-to-b from-blue-200 to-green-200 relative overflow-hidden select-none"
            style={{
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
            }}
        >

            {/* Clouds */}
            <div className="absolute top-10 left-20 w-16 h-8 bg-white rounded-full opacity-70"></div>
            <div className="absolute top-20 right-40 w-12 h-6 bg-white rounded-full opacity-70"></div>
            <div className="absolute top-16 left-1/2 w-20 h-10 bg-white rounded-full opacity-70"></div>

            {/* Sun */}
            <div className="absolute top-8 right-8 w-16 h-16 bg-yellow-300 rounded-full"></div>

            {/* Ground */}
            <div
                className="absolute bottom-0 left-0 right-0 bg-green-400"
                style={{ height: `${window.innerHeight - GROUND_HEIGHT}px` }}
            >
                <div className="w-full h-4 bg-green-500"></div>
            </div>

            {/* Bee */}
            <Bee x={beePosition.x} y={beePosition.y} />

            {/* Bitcoin */}
            <Bitcoin x={bitcoinPosition.x} y={bitcoinPosition.y} />

            {/* Obstacles */}
            {obstacles.map(obstacle => (
                <Obstacle key={obstacle.id} obstacle={obstacle} />
            ))}

            {/* Score */}
            <div className="absolute top-4 left-4 bg-white bg-opacity-80 px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">Score: {Math.floor(score / 10)}</div>
                {highScore > 0 && <div className="text-sm text-gray-600">High Score.: {highScore}</div>}
            </div>

            {/* Bitcoin counter */}
            {/*<div className="absolute top-4 right-4 bg-yellow-400 bg-opacity-90 px-4 py-2 rounded-lg">*/}
            {/*    <div className="text-xl font-bold text-gray-800">₿ Chase the Bitcoin!</div>*/}
            {/*</div>*/}

            {/* Start screen */}
            {gameState === 'start' && (
                <div style={{zIndex: 10}} className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg text-center">
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">🐝 Bitcoin Chase</h1>
                        <p className="text-lg text-gray-600 mb-4">
                            Help the bee catch the floating Bitcoin!
                        </p>
                        <p className="text-gray-500 mb-6">
                            Tap the screen or press SPACE/↑ to jump and avoid obstacles
                        </p>
                        <button
                            onClick={startGame}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            Start Game
                        </button>
                    </div>
                </div>
            )}

            {/* Game over screen */}
            {gameState === 'gameOver' && (
                <div style={{zIndex: 10}} className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg text-center">
                        <h2 className="text-4xl font-bold text-red-600 mb-4">Game Over!</h2>
                        <p className="text-xl text-gray-800 mb-2">
                            Final Score: {Math.floor(score / 10)}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                            High Score: {highScore}
                        </p>
                        <p className="text-gray-600 mb-6">
                            The bee hit an obstacle while chasing Bitcoin
                        </p>
                        <button
                            onClick={startGame}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions */}
            {gameState === 'playing' && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                    <p className="bg-black bg-opacity-50 px-4 py-2 rounded">
                        TAP or SPACE/↑ - Jump | Catch the Bitcoin
                    </p>
                </div>
            )}

            {/* Bitcoin caught effect */}
            {bitcoinCaught && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-yellow-400 animate-bounce">
                    +100 ₿
                </div>
            )}

            {/* New Record notification */}
            {isNewRecord && (
                <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-lg shadow-lg animate-pulse">
                        <div className="text-3xl font-bold text-center mb-2">🏆 NEW RECORD! 🏆</div>
                        <div className="text-xl text-center">Score: {highScore}</div>
                    </div>
                </div>
            )}

            <img style={{position: "absolute", left: 0, bottom: 0, width: 45, height: 45}} src={require('./mg_logo.png')} alt={'mg'} />
        </div>
    );
}

export default App;
