'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

// 游戏配置
const GRID_SIZE = 20;
const INITIAL_SPEED = 200; // 初始速度(ms)
const SPEED_INCREMENT = 5; // 每得10分加速(ms)

// 方向类型
type Direction = 'up' | 'down' | 'left' | 'right';

// 位置接口
interface Position {
  x: number;
  y: number;
}

export default function SnakeGame() {
  // 游戏状态
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('right');
  const [nextDirection, setNextDirection] = useState<Direction>('right');
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [gameSpeed, setGameSpeed] = useState(INITIAL_SPEED);
  // 新增：网格尺寸状态，避免hydration不匹配
  const [gridSize, setGridSize] = useState('300px');
  
  // 游戏循环计时器
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // 生成随机食物位置
  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };

    // 确保食物不会出现在蛇身上
    const isOnSnake = snake.some(segment => 
      segment.x === newFood.x && segment.y === newFood.y
    );

    if (isOnSnake) {
      return generateFood();
    }

    return newFood;
  }, [snake]);

  // 移动蛇
  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused) return;

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      setDirection(nextDirection);

      // 根据方向移动头部
      switch (nextDirection) {
        case 'up':
          head.y = (head.y - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'down':
          head.y = (head.y + 1) % GRID_SIZE;
          break;
        case 'left':
          head.x = (head.x - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'right':
          head.x = (head.x + 1) % GRID_SIZE;
          break;
      }

      // 检查是否吃到食物
      const ateFood = head.x === food.x && head.y === food.y;
      
      if (ateFood) {
        // 生成新食物
        setFood(generateFood());
        
        // 增加分数
        const newScore = score + 10;
        setScore(newScore);
        
        // 加速游戏
        setGameSpeed(prev => Math.max(50, prev - SPEED_INCREMENT));
        
        // 蛇变长（不删除尾部）
        return [head, ...prevSnake];
      } else {
        // 正常移动（删除尾部）
        const newSnake = [head, ...prevSnake.slice(0, -1)];
        
        // 检查是否撞到自己
        const selfCollision = newSnake.slice(1).some(segment => 
          segment.x === head.x && segment.y === head.y
        );
        
        if (selfCollision) {
          setIsGameOver(true);
          if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
          }
        }
        
        return newSnake;
      }
    });
  }, [isGameOver, isPaused, nextDirection, food, score, generateFood, gameSpeed]);

  // 游戏循环
  useEffect(() => {
    if (!isGameOver && !isPaused) {
      gameLoopRef.current = setInterval(moveSnake, gameSpeed);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isGameOver, isPaused, moveSnake, gameSpeed]);

  // 处理键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      
      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'down') setNextDirection('up');
          break;
        case 'ArrowDown':
          if (direction !== 'up') setNextDirection('down');
          break;
        case 'ArrowLeft':
          if (direction !== 'right') setNextDirection('left');
          break;
        case 'ArrowRight':
          if (direction !== 'left') setNextDirection('right');
          break;
        case ' ': // 空格暂停/继续
          setIsPaused(prev => !prev);
          break;
        case 'r': // R键重置游戏
          resetGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isGameOver]);

  // 重置游戏
  const resetGame = useCallback(() => {
    setSnake([
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]);
    setFood(generateFood());
    setDirection('right');
    setNextDirection('right');
    setScore(0);
    setIsGameOver(false);
    setIsPaused(true);
    setGameSpeed(INITIAL_SPEED);
    
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
  }, [generateFood]);

  // 计算网格大小（响应式）- 修复hydration错误
  useEffect(() => {
    // 只在客户端执行
    const calculateGridSize = () => {
      const maxSize = Math.min(window.innerWidth * 0.9, 500);
      setGridSize(`${maxSize}px`);
    };

    // 初始化计算
    calculateGridSize();
    
    // 监听窗口大小变化
    window.addEventListener('resize', calculateGridSize);
    return () => window.removeEventListener('resize', calculateGridSize);
  }, []);

  // 移动控制函数
  const handleDirectionChange = (newDirection: Direction) => {
    if (
      (newDirection === 'up' && direction !== 'down') ||
      (newDirection === 'down' && direction !== 'up') ||
      (newDirection === 'left' && direction !== 'right') ||
      (newDirection === 'right' && direction !== 'left')
    ) {
      setNextDirection(newDirection);
      // 如果游戏暂停，开始游戏
      if (isPaused && !isGameOver) {
        setIsPaused(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
          贪吃蛇游戏
        </h1>
        <p className="text-gray-400">使用方向键或屏幕按钮控制，空格键暂停/继续</p>
      </div>

      <div className="relative mb-6">
        {/* 分数显示 */}
        <div className="flex justify-between items-center mb-3 px-2">
          <div className="bg-gray-700 rounded-lg px-4 py-2 font-mono">
            分数: <span className="text-green-400">{score}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPaused(prev => !prev)}
              disabled={isGameOver}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isGameOver 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : isPaused 
                    ? 'bg-green-600 hover:bg-green-500' 
                    : 'bg-yellow-600 hover:bg-yellow-500'
              }`}
            >
              {isPaused ? '开始' : '暂停'}
            </button>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-all"
            >
              重置
            </button>
          </div>
        </div>

        {/* 游戏网格 */}
        <div
          ref={gridRef}
          className="relative border-4 border-gray-700 rounded-lg bg-gray-900 overflow-hidden"
          style={{
            width: gridSize,
            height: gridSize,
          }}
        >
          {/* 蛇身 */}
          {snake.map((segment, index) => (
            <div
              key={index}
              className={`absolute rounded-sm transition-all ${
                index === 0 
                  ? 'bg-blue-500'  // 蛇头
                  : `bg-green-500 opacity-${100 - Math.min(30, index * 2)}`  // 蛇身逐渐变淡
              }`}
              style={{
                width: `calc(100% / ${GRID_SIZE})`,
                height: `calc(100% / ${GRID_SIZE})`,
                left: `${(segment.x / GRID_SIZE) * 100}%`,
                top: `${(segment.y / GRID_SIZE) * 100}%`,
                zIndex: index === 0 ? 2 : 1,
              }}
            />
          ))}

          {/* 食物 */}
          <div
            className="absolute bg-red-500 rounded-full transition-all scale-75 hover:scale-100"
            style={{
              width: `calc(100% / ${GRID_SIZE})`,
              height: `calc(100% / ${GRID_SIZE})`,
              left: `${(food.x / GRID_SIZE) * 100}%`,
              top: `${(food.y / GRID_SIZE) * 100}%`,
              zIndex: 1,
            }}
          />

          {/* 游戏结束覆盖层 */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 z-30">
              <h2 className="text-3xl font-bold text-red-500">游戏结束!</h2>
              <p className="text-xl">最终分数: {score}</p>
              <button
                onClick={resetGame}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-medium text-lg transition-all"
              >
                再来一局
              </button>
            </div>
          )}

          {/* 暂停覆盖层 */}
          {isPaused && !isGameOver && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <p className="text-2xl font-bold text-yellow-400">已暂停</p>
            </div>
          )}
        </div>
      </div>

      {/* 移动设备控制按钮 */}
      <div className="lg:hidden grid grid-cols-3 gap-2 max-w-[200px]">
        <div className="col-start-2">
          <button
            onClick={() => handleDirectionChange('up')}
            disabled={isGameOver}
            className="w-full h-16 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-all"
          >
            <Image src="/up.svg" alt="上" width={30} height={30} />
          </button>
        </div>
        <div className="col-start-1 row-start-2">
          <button
            onClick={() => handleDirectionChange('left')}
            disabled={isGameOver}
            className="w-full h-16 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-all"
          >
            <Image src="/left.svg" alt="左" width={30} height={30} />
          </button>
        </div>
        <div className="col-start-2 row-start-2">
          <button
            onClick={() => handleDirectionChange('down')}
            disabled={isGameOver}
            className="w-full h-16 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-all"
          >
            <Image src="/down.svg" alt="下" width={30} height={30} />
          </button>
        </div>
        <div className="col-start-3 row-start-2">
          <button
            onClick={() => handleDirectionChange('right')}
            disabled={isGameOver}
            className="w-full h-16 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-all"
          >
            <Image src="/right.svg" alt="右" width={30} height={30} />
          </button>
        </div>
      </div>

      <footer className="mt-8 text-gray-500 text-sm">
        <p>在电脑上使用方向键控制，空格键暂停/继续，R键重置游戏</p>
      </footer>
    </div>
  );
}
