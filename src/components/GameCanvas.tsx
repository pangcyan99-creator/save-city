import React, { useEffect, useRef, useState } from 'react';
import { Rocket, Missile, Explosion, City, Battery, Point, GameStatus } from '../types';
import { audioManager } from '../utils/audio';

interface GameCanvasProps {
  status: GameStatus;
  score: number;
  onScoreUpdate: (points: number) => void;
  onGameEnd: (win: boolean) => void;
  onAmmoUpdate: (batteries: Battery[]) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, score, onScoreUpdate, onGameEnd, onAmmoUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  
  // Game Entities
  const rocketsRef = useRef<Rocket[]>([]);
  const missilesRef = useRef<Missile[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const citiesRef = useRef<City[]>([]);
  const batteriesRef = useRef<Battery[]>([]);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const GRAVITY = 0.005; // Even lower gravity for very slow fall

  // Initialize game objects
  const initGame = (width: number, height: number) => {
    // 6 Cities (Buildings)
    const cities: City[] = [];
    const cityWidth = width / 10;
    const cityPositions = [1.8, 2.8, 3.8, 6.2, 7.2, 8.2]; // Adjusted positions to be more central
    cityPositions.forEach((pos, i) => {
      cities.push({
        id: `city-${i}`,
        x: pos * cityWidth,
        y: height - 25,
        active: true
      });
    });
    citiesRef.current = cities;

    // 3 Batteries (Cats: Siamese, Ragdoll, Maine Coon)
    const batteries: Battery[] = [
      { id: 'bat-0', x: width * 0.08, y: height - 35, active: true, ammo: 20, maxAmmo: 20, throwingTimer: 0, lastTargetAngle: -Math.PI / 2 },
      { id: 'bat-1', x: width * 0.5, y: height - 35, active: true, ammo: 40, maxAmmo: 40, throwingTimer: 0, lastTargetAngle: -Math.PI / 2 },
      { id: 'bat-2', x: width * 0.92, y: height - 35, active: true, ammo: 20, maxAmmo: 20, throwingTimer: 0, lastTargetAngle: -Math.PI / 2 },
    ];
    batteriesRef.current = batteries;
    onAmmoUpdate([...batteries]);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const { clientWidth, clientHeight } = canvasRef.current.parentElement!;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        setDimensions({ width: clientWidth, height: clientHeight });
        if (status === 'START' || status === 'PLAYING') {
          initGame(clientWidth, clientHeight);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [status]);

  useEffect(() => {
    if (status === 'PLAYING') {
      // Spawn first rocket immediately
      spawnRocket();
    }
  }, [status]);

  const spawnRocket = () => {
    if (status !== 'PLAYING') return;
    const startX = Math.random() * dimensions.width;
    const startY = -40;
    const targets = [...citiesRef.current.filter(c => c.active), ...batteriesRef.current.filter(b => b.active)];
    if (targets.length === 0) return;
    
    const target = targets[Math.floor(Math.random() * targets.length)];
    
    // Much slower flight time
    const minT = 1200; 
    const maxT = 2400; 
    const scoreFactor = Math.min(score / 5000, 1);
    const T = (maxT - (maxT - minT) * scoreFactor) * (0.9 + Math.random() * 0.2);

    const vx = (target.x - startX) / T;
    const vy = (target.y - startY - 0.5 * GRAVITY * T * T) / T;

    const rocket: Rocket = {
      id: Math.random().toString(36).substr(2, 9),
      startX,
      startY,
      x: startX,
      y: startY,
      targetX: target.x,
      targetY: target.y,
      vx,
      vy,
      angle: Math.atan2(target.y - startY, target.x - startX),
      exhaust: []
    };
    rocketsRef.current.push(rocket);
  };

  const createFirework = (x: number, y: number) => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
    const particles = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    explosionsRef.current.push({
      id: `firework-${Math.random()}`,
      x,
      y,
      radius: 0,
      maxRadius: 60,
      expanding: true,
      type: 'FIREWORK',
      particles
    });
  };

  const fireMissile = (targetX: number, targetY: number) => {
    if (status !== 'PLAYING') return;

    let bestBattery = -1;
    let minDist = Infinity;

    batteriesRef.current.forEach((bat, i) => {
      if (bat.active && bat.ammo > 0) {
        const dist = Math.abs(bat.x - targetX);
        if (dist < minDist) {
          minDist = dist;
          bestBattery = i;
        }
      }
    });

    if (bestBattery !== -1) {
      const bat = batteriesRef.current[bestBattery];
      bat.ammo -= 1;
      bat.throwingTimer = 20; 
      bat.lastTargetAngle = Math.atan2(targetY - (bat.y - 15), targetX - bat.x);
      onAmmoUpdate([...batteriesRef.current]);
      audioManager.playLaunch();

      const missile: Missile = {
        id: Math.random().toString(36).substr(2, 9),
        startX: bat.x,
        startY: bat.y - 15,
        x: bat.x,
        y: bat.y - 15,
        targetX,
        targetY,
        progress: 0,
        speed: 0.025, // Slightly faster poop for easier hits
        batteryIndex: bestBattery
      };
      missilesRef.current.push(missile);
    }
  };

  const update = (time: number) => {
    if (status !== 'PLAYING') return;

    if (Math.random() < 0.02 + (score / 15000)) {
      spawnRocket();
    }

    // Update Batteries animation
    batteriesRef.current.forEach(bat => {
      if (bat.throwingTimer > 0) bat.throwingTimer--;
    });

    // Update Rockets with Free Fall Physics
    rocketsRef.current = rocketsRef.current.filter(rocket => {
      rocket.vy += GRAVITY;
      rocket.x += rocket.vx;
      rocket.y += rocket.vy;
      rocket.angle = Math.atan2(rocket.vy, rocket.vx);

      // Add exhaust particles
      if (Math.random() < 0.3) {
        rocket.exhaust.push({
          x: rocket.x - Math.cos(rocket.angle) * 12,
          y: rocket.y - Math.sin(rocket.angle) * 12,
          opacity: 1
        });
      }
      rocket.exhaust.forEach(p => p.opacity -= 0.03);
      rocket.exhaust = rocket.exhaust.filter(p => p.opacity > 0);

      if (rocket.y >= rocket.targetY) {
        explosionsRef.current.push({
          id: `exp-hit-${Math.random()}`,
          x: rocket.targetX,
          y: rocket.targetY,
          radius: 0,
          maxRadius: 40,
          expanding: true,
          type: 'IMPACT'
        });
        audioManager.playExplosion();

        citiesRef.current.forEach(city => {
          if (city.active && Math.abs(city.x - rocket.targetX) < 20 && Math.abs(city.y - rocket.targetY) < 20) {
            city.active = false;
          }
        });
        batteriesRef.current.forEach(bat => {
          if (bat.active && Math.abs(bat.x - rocket.targetX) < 20 && Math.abs(bat.y - rocket.targetY) < 20) {
            bat.active = false;
            onAmmoUpdate([...batteriesRef.current]);
          }
        });

        if (batteriesRef.current.every(b => !b.active)) {
          onGameEnd(false);
        }
        return false;
      }
      return true;
    });

    // Update Missiles (Poop)
    missilesRef.current = missilesRef.current.filter(missile => {
      missile.progress += missile.speed;
      missile.x = missile.startX + (missile.targetX - missile.startX) * missile.progress;
      
      // Dynamic arc based on horizontal distance
      const dist = Math.abs(missile.targetX - missile.startX);
      const arcHeight = Math.max(80, Math.min(250, dist * 0.6));
      const linearY = missile.startY + (missile.targetY - missile.startY) * missile.progress;
      missile.y = linearY - Math.sin(Math.PI * missile.progress) * arcHeight;

      if (missile.progress >= 1) {
        explosionsRef.current.push({
          id: `exp-${Math.random()}`,
          x: missile.targetX,
          y: missile.targetY,
          radius: 0,
          maxRadius: 80, // Larger explosion for easier hits
          expanding: true,
          type: 'POOP'
        });
        audioManager.playExplosion();
        return false;
      }
      return true;
    });

    // Update Explosions
    explosionsRef.current = explosionsRef.current.filter(exp => {
      if (exp.expanding) {
        exp.radius += 3; // Faster expansion
        if (exp.radius >= exp.maxRadius) {
          exp.expanding = false;
        }
      } else {
        exp.radius -= 2;
      }

      // Update particles for fireworks
      if (exp.particles) {
        exp.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05; // gravity for particles
          p.life -= 0.02;
        });
        exp.particles = exp.particles.filter(p => p.life > 0);
      }

      rocketsRef.current = rocketsRef.current.filter(rocket => {
        const dx = rocket.x - exp.x;
        const dy = rocket.y - exp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Larger collision buffer for easier hits
        if (dist < exp.radius + 25) {
          onScoreUpdate(20);
          createFirework(rocket.x, rocket.y); // Trigger firework on hit
          return false;
        }
        return true;
      });

      return exp.radius > 0 || (exp.particles && exp.particles.length > 0);
    });

    if (score >= 1000) {
      onGameEnd(true);
    }
  };

  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y - size * 0.3, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 1.2, y, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawCat = (ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean, type: number, throwingTimer: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    
    // Throwing animation: slight jump
    if (throwingTimer > 0) {
      ctx.translate(0, -Math.sin(throwingTimer * 0.15) * 10);
    }

    let bodyColor = '#fbbf24';
    let accentColor = '#f59e0b';
    let eyeColor = '#000';
    let isFluffy = false;

    if (type === 0) { // Siamese
      bodyColor = '#fdf4ff';
      accentColor = '#451a03';
      eyeColor = '#3b82f6';
    } else if (type === 1) { // Ragdoll
      bodyColor = '#ffffff';
      accentColor = '#94a3b8';
      eyeColor = '#60a5fa';
      isFluffy = true;
    } else if (type === 2) { // Maine Coon
      bodyColor = '#9ca3af';
      accentColor = '#374151';
      eyeColor = '#fbbf24';
      isFluffy = true;
    }

    if (!active) {
      bodyColor = '#374151';
      accentColor = '#1f2937';
      eyeColor = '#4b5563';
    }

    // Tail
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = isFluffy ? 8 : 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(15, 5);
    ctx.quadraticCurveTo(25, 0, 30, -15);
    ctx.stroke();

    // Body
    ctx.fillStyle = bodyColor;
    if (isFluffy) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 12, 5 + Math.sin(a) * 8, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.ellipse(0, 5, type === 2 ? 22 : 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head - Rotates towards target
    ctx.save();
    ctx.translate(0, -10);
    if (active) {
      // Limit head rotation to be natural
      const headAngle = Math.max(-Math.PI * 0.8, Math.min(-Math.PI * 0.2, angle)) + Math.PI / 2;
      ctx.rotate(headAngle * 0.5);
    }
    
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    // Face Mask / Markings
    if (active) {
      if (type === 0) {
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.ellipse(0, 2, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 1) {
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(-6, -2, 5, 0, Math.PI * 2);
        ctx.arc(6, -2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Ears
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.lineTo(-16, -18);
    ctx.lineTo(-5, -11);
    ctx.fill();
    if (type === 2 && active) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(-16, -24); ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.moveTo(11, -8);
    ctx.lineTo(16, -18);
    ctx.lineTo(5, -11);
    ctx.fill();
    if (type === 2 && active) {
      ctx.beginPath(); ctx.moveTo(16, -18); ctx.lineTo(16, -24); ctx.stroke();
    }
    
    // Eyes
    if (active) {
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(-5, -1, 2.5, 0, Math.PI * 2);
      ctx.arc(5, -1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-5, -1, 1, 0, Math.PI * 2);
      ctx.arc(5, -1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Arm (Throwing) - Rotates 180 degrees towards target
    if (active) {
      ctx.save();
      ctx.translate(0, -5);
      if (throwingTimer > 0) {
        ctx.rotate(angle);
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
      } else {
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(15, 13);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean) => {
    if (!active) return;
    
    // Main structure
    ctx.fillStyle = '#f3f4f6'; // Very light grey
    ctx.fillRect(x - 16, y - 40, 32, 50);
    
    // Architectural detail
    ctx.fillStyle = '#d1d5db'; 
    ctx.fillRect(x - 12, y - 35, 24, 45);
    
    // Windows
    ctx.fillStyle = '#9ca3af';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 6; j++) {
        ctx.fillRect(x - 8 + i * 6, y - 30 + j * 7, 4, 4);
      }
    }

    // Roof detail
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(x - 18, y - 42, 36, 4);
  };

  const drawPoop = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y, 6, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y - 3, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawRocket = (ctx: CanvasRenderingContext2D, rocket: Rocket) => {
    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate(rocket.angle + Math.PI / 2);

    // Exhaust
    rocket.exhaust.forEach(p => {
      ctx.fillStyle = `rgba(255, 165, 0, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x - rocket.x, p.y - rocket.y, 3 * p.opacity, 0, Math.PI * 2);
      ctx.fill();
    });

    // Body
    ctx.fillStyle = '#d1d5db';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(8, 5);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();

    // Nose
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(4, -8);
    ctx.lineTo(-4, -8);
    ctx.closePath();
    ctx.fill();

    // Fins
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-10, 0, 4, 8);
    ctx.fillRect(6, 0, 4, 8);

    ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Sky Background
    const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
    gradient.addColorStop(0, '#7dd3fc');
    gradient.addColorStop(1, '#bae6fd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Clouds
    drawCloud(ctx, dimensions.width * 0.2, dimensions.height * 0.2, 30);
    drawCloud(ctx, dimensions.width * 0.5, dimensions.height * 0.15, 40);
    drawCloud(ctx, dimensions.width * 0.8, dimensions.height * 0.25, 25);

    // Draw Buildings
    citiesRef.current.forEach(city => {
      drawBuilding(ctx, city.x, city.y, city.active);
    });

    // Draw Cats
    batteriesRef.current.forEach((bat, i) => {
      drawCat(ctx, bat.x, bat.y, bat.active, i, bat.throwingTimer, bat.lastTargetAngle);
      
      if (bat.active) {
        ctx.fillStyle = '#0369a1';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bat.ammo.toString(), bat.x, bat.y + 25);
      }
    });

    // Draw Rockets
    rocketsRef.current.forEach(rocket => {
      drawRocket(ctx, rocket);
    });

    // Draw Poop Missiles
    missilesRef.current.forEach(missile => {
      drawPoop(ctx, missile.x, missile.y);

      // Target X
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.moveTo(missile.targetX - 5, missile.targetY - 5);
      ctx.lineTo(missile.targetX + 5, missile.targetY + 5);
      ctx.moveTo(missile.targetX + 5, missile.targetY - 5);
      ctx.lineTo(missile.targetX - 5, missile.targetY + 5);
      ctx.stroke();
    });

    // Draw Explosions
    explosionsRef.current.forEach(exp => {
      if (exp.type === 'FIREWORK' && exp.particles) {
        exp.particles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(exp.x + p.x, exp.y + p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else {
        const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
        
        if (exp.type === 'POOP') {
          // Brownish explosion for poop
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.3, '#d69e5e');
          gradient.addColorStop(0.6, '#78350f');
          gradient.addColorStop(1, 'transparent');
        } else {
          // Impact or default
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.4, '#fde047');
          gradient.addColorStop(0.7, '#f97316');
          gradient.addColorStop(1, 'transparent');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    update(time);
    draw(ctx);
    (requestRef as any).current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    (requestRef as any).current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [status, dimensions, score]);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (status !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }
    
    fireMissile(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair touch-none"
      onClick={handleClick}
      onTouchStart={handleClick}
    />
  );
};

export default GameCanvas;
