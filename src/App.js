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
    const [gameHeight, setGameHeight] = useState(200);

    const GROUND_HEIGHT = 350;
    const BEE_SIZE = 40;
    const JUMP_HEIGHT = 120;
    const OBSTACLE_WIDTH = 30;
    const OBSTACLE_HEIGHT = 60;
    const BITCOIN_SIZE = 30;

    // Set up responsive game height
    useEffect(() => {
        const updateGameHeight = () => {
            const vh = window.innerHeight;

            // На мобильных устройствах используем реальную высоту viewport
            setGameHeight(vh);
            // if (vw <= 768) {
            //     setGameHeight(vh);
            // } else {
            //     setGameHeight(vh);
            // }
        };

        updateGameHeight();
        window.addEventListener('resize', updateGameHeight);
        window.addEventListener('orientationchange', updateGameHeight);

        return () => {
            window.removeEventListener('resize', updateGameHeight);
            window.removeEventListener('orientationchange', updateGameHeight);
        };
    }, []);

    // Update bee position when game height changes
    useEffect(() => {
        if (gameState === 'start' || gameState === 'gameOver') {
            const groundY = gameHeight - (gameHeight - GROUND_HEIGHT);
            setBeePosition({ x: 100, y: groundY - BEE_SIZE });
        }
    }, [gameHeight, gameState]);

    // Load high score on component mount
    useEffect(() => {
        const savedHighScore = localStorage.getItem('bitcoinChaseHighScore');
        if (savedHighScore) {
            setHighScore(parseInt(savedHighScore));
        }
    }, []);

    // Save high score to localStorage
    const saveHighScore = useCallback((score) => {
        localStorage.setItem('bitcoinChaseHighScore', score.toString());
        setHighScore(score);
    }, []);

    // Generate obstacles
    const generateObstacle = useCallback(() => {
        const groundY = gameHeight - (gameHeight - GROUND_HEIGHT);
        return {
            id: Date.now() + Math.random(),
            x: 800,
            y: groundY - OBSTACLE_HEIGHT,
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT
        };
    }, [gameHeight]);

    // Bee jump
    const jump = useCallback(() => {
        if (gameState !== 'playing' || isJumping) return;

        setIsJumping(true);
        setBeePosition(prev => ({ ...prev, y: prev.y - JUMP_HEIGHT }));

        setTimeout(() => {
            const groundY = gameHeight - (gameHeight - GROUND_HEIGHT);
            setBeePosition(prev => ({ ...prev, y: groundY - BEE_SIZE }));
            setIsJumping(false);
        }, 600);
    }, [gameState, isJumping, gameHeight]);

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

        setCanRestart(false);

        if (finalScore > highScore) {
            setIsNewRecord(true);
            saveHighScore(finalScore);
        }

        setGameState('gameOver');

        setTimeout(() => {
            setCanRestart(true);
        }, 500);
    }, [score, highScore, saveHighScore]);

    // Start game
    const startGame = () => {
        const groundY = gameHeight - (gameHeight - GROUND_HEIGHT);

        setGameState('playing');
        setScore(0);
        setBeePosition({ x: 100, y: groundY - BEE_SIZE });
        setObstacles([]);
        setGameSpeed(2);
        setIsJumping(false);
        setBitcoinPosition({ x: 700, y: groundY - BITCOIN_SIZE - 30 });
        setBitcoinCaught(false);
        setIsNewRecord(false);
        setCanRestart(true);
    };

    // Main game loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const gameLoop = setInterval(() => {
            const groundY = gameHeight - (gameHeight - GROUND_HEIGHT);

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
                    setTimeout(() => {
                        handleGameOver();
                    }, 0);
                }

                return newObstacles;
            });

            // Move bitcoin (floating movement)
            setBitcoinPosition(prev => {
                const newX = prev.x - gameSpeed * 0.8;
                const newY = groundY - BITCOIN_SIZE - 30 + Math.sin(Date.now() * 0.01) * 20;

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
    }, [gameState, beePosition, bitcoinPosition, gameSpeed, gameHeight, checkCollision, checkBitcoinCatch, generateObstacle, handleGameOver]);

    // Bee component
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
                {/*<div*/}
                {/*    className="w-full h-full bg-orange-500 rounded-full border-2 border-orange-600 flex items-center justify-center text-white font-bold"*/}
                {/*    style={{*/}
                {/*        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',*/}
                {/*    }}*/}
                {/*>*/}
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

                {/*</div>*/}
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

    const groundHeight = gameHeight - GROUND_HEIGHT;

    return (
        <div
            className="w-full bg-gradient-to-b from-blue-200 to-green-200 relative overflow-hidden select-none"
            style={{
                height: `${gameHeight}px`,
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
                style={{ height: `${groundHeight}px` }}
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
            <div className="absolute top-4 left-4 bg-white bg-opacity-80 px-2 py-1 rounded-lg text-sm sm:px-4 sm:py-2 sm:text-base">
                <div className="font-bold text-gray-800">Score: {Math.floor(score / 10)}</div>
                {highScore > 0 && <div className="text-xs text-gray-600 sm:text-sm">High: {highScore}</div>}
            </div>

            {/* Start screen */}
            {gameState === 'start' && (
                <div style={{zIndex: 10}} className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white p-4 rounded-lg text-center max-w-sm w-full sm:p-8">
                        <h1 className="text-2xl font-bold text-gray-800 mb-2 sm:text-4xl sm:mb-4">🐝 Bitcoin Chase</h1>
                        <p className="text-sm text-gray-600 mb-2 sm:text-lg sm:mb-4">
                            Help the bee catch the floating Bitcoin!
                        </p>
                        <p className="text-xs text-gray-500 mb-4 sm:text-sm sm:mb-6">
                            Tap the screen or press SPACE/↑ to jump and avoid obstacles
                        </p>
                        <button
                            onClick={startGame}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg transition-colors sm:py-3 sm:px-6"
                        >
                            Start Game
                        </button>
                    </div>
                </div>
            )}

            {/* Game over screen */}
            {gameState === 'gameOver' && (
                <div style={{zIndex: 10}} className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white p-4 rounded-lg text-center max-w-sm w-full sm:p-8">
                        <h2 style={{fontFamily: 'Trebuchet MS, sans-serif'}} className="text-2xl font-bold text-red-600 mb-2 sm:text-4xl sm:mb-4">Game Over!</h2>
                        <p style={{fontFamily: 'Trebuchet MS, sans-serif'}} className="text-lg text-gray-800 mb-1 sm:text-xl sm:mb-2">
                            Final Score: {Math.floor(score / 10)}
                        </p>
                        <p style={{fontFamily: 'Trebuchet MS, sans-serif'}} className="text-xs text-gray-600 mb-2 sm:text-sm sm:mb-4">
                            High Score: {highScore}
                        </p>
                        <p className="text-xs text-gray-600 mb-4 sm:text-sm sm:mb-6">
                            The bee hit an obstacle while chasing Bitcoin
                        </p>
                        <button
                            onClick={startGame}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg transition-colors sm:py-3 sm:px-6"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions */}
            {gameState === 'playing' && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                    <p className="bg-black bg-opacity-50 px-2 py-1 rounded text-xs sm:px-4 sm:py-2 sm:text-sm">
                        TAP or SPACE/↑ - Jump | Catch the Bitcoin
                    </p>
                </div>
            )}

            {/* Bitcoin caught effect */}
            {bitcoinCaught && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-yellow-400 animate-bounce sm:text-4xl">
                    +100 ₿
                </div>
            )}

            {/* New Record notification */}
            {isNewRecord && (
                <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 px-4">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse sm:px-8 sm:py-4">
                        <div style={{fontFamily: 'Courier New, sans-serif'}} className="text-lg font-bold text-center mb-1 sm:text-3xl sm:mb-2">🏆 NEW RECORD! 🏆</div>
                        <div style={{fontFamily: 'Georgia, sans-serif'}} className="text-sm text-center sm:text-xl">Score: {highScore}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
