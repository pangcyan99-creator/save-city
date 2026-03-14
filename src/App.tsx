import React, { useState } from 'react';
import { Battery, GameState } from './types';
import GameCanvas from './components/GameCanvas';
import { audioManager } from './utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Skull, Play, Languages, Shield } from 'lucide-react';

const translations = {
  en: {
    title: "DEFEND THE UNIVERSE",
    start: "START GAME",
    win: "VICTORY!",
    lose: "GAME OVER",
    score: "SCORE",
    target: "GOAL",
    playAgain: "PLAY AGAIN",
    instructions: "Click to throw poop! Protect your buildings and kittens!",
    ammo: "POOP",
    lang: "中文",
    level: "LEVEL",
    nextLevel: "NEXT LEVEL",
    levelComplete: "LEVEL COMPLETE!"
  },
  zh: {
    title: "保卫宇宙",
    start: "开始游戏",
    win: "胜利！",
    lose: "游戏结束",
    score: "得分",
    target: "目标",
    playAgain: "再玩一次",
    instructions: "点击屏幕让小猫扔粑粑。保护你的建筑和小猫！",
    ammo: "粑粑",
    lang: "EN",
    level: "关卡",
    nextLevel: "进入下一关",
    levelComplete: "关卡完成！"
  }
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    status: 'START',
    level: 1,
    language: 'zh'
  });

  const [batteries, setBatteries] = useState<Battery[]>([]);

  const t = translations[gameState.language];

  const handleScoreUpdate = (points: number) => {
    setGameState(prev => {
      const newScore = prev.score + points;
      const targetScore = prev.level * 500; // Each level requires 500 more points
      
      if (newScore >= targetScore && prev.status === 'PLAYING') {
        audioManager.playWin();
        return { ...prev, score: newScore, status: 'WON' };
      }
      
      return { ...prev, score: newScore };
    });
  };

  const handleGameEnd = (win: boolean) => {
    if (win) {
      // This is now handled in handleScoreUpdate for level progression
    } else {
      setGameState(prev => ({ ...prev, status: 'LOST' }));
      audioManager.playLose();
    }
  };

  const startGame = () => {
    setGameState(prev => ({ 
      ...prev, 
      status: 'PLAYING', 
      score: 0,
      level: 1 
    }));
  };

  const startNextLevel = () => {
    setGameState(prev => ({
      ...prev,
      status: 'PLAYING',
      score: 0,
      level: prev.level + 1
    }));
  };

  const toggleLanguage = () => {
    setGameState(prev => ({ ...prev, language: prev.language === 'en' ? 'zh' : 'en' }));
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono text-white select-none">
      {/* Game HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="text-xl font-bold text-blue-400 flex items-center gap-2">
            <Shield size={20} />
            {t.title}
          </div>
          <div className="text-sm opacity-70">
            {t.level}: <span className="text-blue-400 font-bold">{gameState.level}</span> | {t.score}: <span className="text-yellow-400 font-bold">{gameState.score}</span> / {t.target}: {gameState.level * 500}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-xs transition-colors"
          >
            <Languages size={14} />
            {t.lang}
          </button>
          
          {gameState.status === 'PLAYING' && (
            <div className="flex gap-4 mt-2">
              {batteries.map((bat, i) => (
                <div key={bat.id} className="flex flex-col items-center">
                  <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${bat.active ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${(bat.ammo / bat.maxAmmo) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] mt-1 opacity-50">{t.ammo} {i+1}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Game Canvas */}
      <div className="w-full h-full">
        <GameCanvas 
          status={gameState.status}
          score={gameState.score}
          level={gameState.level}
          onScoreUpdate={handleScoreUpdate}
          onGameEnd={handleGameEnd}
          onAmmoUpdate={setBatteries}
        />
      </div>

      {/* Overlays */}
      <AnimatePresence mode="wait">
        {gameState.status !== 'PLAYING' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full p-8 text-center"
            >
              {gameState.status === 'START' && (
                <>
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="mb-6 inline-block"
                  >
                    <Shield size={80} className="text-blue-500 mx-auto" />
                  </motion.div>
                  <h1 className="text-4xl font-black mb-4 tracking-tighter italic">
                    {t.title}
                  </h1>
                  <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                    {t.instructions}
                  </p>
                  <button 
                    onClick={startGame}
                    className="group relative inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
                  >
                    <Play size={20} fill="currentColor" />
                    {t.start}
                  </button>
                </>
              )}

              {gameState.status === 'WON' && (
                <>
                  <Trophy size={80} className="text-yellow-500 mx-auto mb-6" />
                  <h2 className="text-5xl font-black mb-2 text-yellow-400 italic">
                    {t.levelComplete}
                  </h2>
                  <p className="text-2xl mb-8">
                    {t.score}: {gameState.score}
                  </p>
                  <button 
                    onClick={startNextLevel}
                    className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
                  >
                    {t.nextLevel}
                  </button>
                </>
              )}

              {gameState.status === 'LOST' && (
                <>
                  <Skull size={80} className="text-red-500 mx-auto mb-6" />
                  <h2 className="text-5xl font-black mb-2 text-red-500 italic">
                    {t.lose}
                  </h2>
                  <p className="text-2xl mb-8">
                    {t.score}: {gameState.score}
                  </p>
                  <button 
                    onClick={startGame}
                    className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
                  >
                    {t.playAgain}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
    </div>
  );
}
