import React, { useRef, useEffect, useState } from 'react';
import { VisualsConfig, WatchBiofeedback } from '../types';

interface VisualCanvasProps {
  config: VisualsConfig;
  biofeedback: WatchBiofeedback;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  alpha: number;
  maxAlpha: number;
  phase: number;
  color: string;
}

export const VisualCanvas: React.FC<VisualCanvasProps> = ({ config, biofeedback }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  // Local state to track dimensions reactively
  const [size, setSize] = useState({ width: 600, height: 400 });

  // Handle ResizeObserver to resize canvas gracefully
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      
      dimensionsRef.current = { width, height };
      setSize({ width, height });

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        // Re-generate particles if dimensions change drastically
        initParticles(width, height);
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Initialize Particles based on visualStyle config
  const initParticles = (width: number, height: number) => {
    const list: Particle[] = [];
    const count = config.particleCount || 60;
    
    for (let i = 0; i < count; i++) {
      const alpha = Math.random() * 0.5 + 0.1;
      list.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedY: (Math.random() * 0.4 + 0.1),
        speedX: (Math.random() * 0.3 - 0.15),
        alpha,
        maxAlpha: alpha + 0.2,
        phase: Math.random() * Math.PI * 2,
        color: config.primaryColor
      });
    }
    particlesRef.current = list;
  };

  // Keep particles updated reactively when config color or particle count changes
  useEffect(() => {
    const { width, height } = dimensionsRef.current;
    if (width > 0 && height > 0) {
      initParticles(width, height);
    }
  }, [config.particleCount]);

  useEffect(() => {
    const list = particlesRef.current;
    list.forEach(p => {
      p.color = Math.random() > 0.4 ? config.primaryColor : config.secondaryColor;
    });
  }, [config.primaryColor, config.secondaryColor]);

  // Main high-performance render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrame: number;
    let angleShift = 0;

    const render = () => {
      const { width, height } = dimensionsRef.current;
      if (width === 0 || height === 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // 1. Draw solid or subtle nebula visual backdrop
      ctx.fillStyle = config.backgroundColor || '#050510';
      ctx.fillRect(0, 0, width, height);

      // Extract biofeedback parameters for animations
      const { currentPhase, phaseProgress, heartRateBpm } = biofeedback;
      
      // Calculate dynamic scale factor based on respiration phase
      // Breathing acts as a slow bellows, making objects pump and expand on inhale
      let breathIntensity = 0.5; // default hold or transit
      if (currentPhase === 'inhale') {
        breathIntensity = 0.2 + (0.8 * phaseProgress); // rises up
      } else if (currentPhase === 'hold') {
        breathIntensity = 1.0;
      } else if (currentPhase === 'exhale') {
        breathIntensity = 1.0 - (0.8 * phaseProgress); // slides down
      }

      // Smooth beat scale modeled after the heartbeat
      const heartBeatPulseRange = 1 + (0.04 * Math.sin(Date.now() * (heartRateBpm / 60) * Math.PI * 2 / 1000));

      // Realtime biofeedback-driven velocity scale factor: standard heart rate (70 BPM), breathing rate (6 BPM)
      const hrVelocityMultiplier = Math.max(0.3, Math.min(2.5, biofeedback.heartRateBpm / 70));
      const brVelocityMultiplier = Math.max(0.4, Math.min(2.5, biofeedback.breathingRateBpm / 6));
      const biofeedbackVelocityScale = hrVelocityMultiplier * brVelocityMultiplier;

      const particleSpeedFactor = (config.particleSpeed || 0.4) * biofeedbackVelocityScale;
      angleShift += 0.005 * particleSpeedFactor;

      // 2. Draw Visual-Specific Layer
      const style = config.visualStyle;
      
      if (style === 'canopy') {
        // --- SUNSHINE CANOPY MODEL ---
        // Generates beautiful soft golden sunray shafts starting from top right
        const sunX = width * 0.85;
        const sunY = height * 0.15;
        const sunRadius = Math.min(width, height) * 0.18 * heartBeatPulseRange;

        // Draw sun core with glow bloom
        const sunGlow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.1, sunX, sunY, sunRadius * 4);
        sunGlow.addColorStop(0, `${config.secondaryColor}ee`);
        sunGlow.addColorStop(0.1, `${config.secondaryColor}bb`);
        sunGlow.addColorStop(0.4, `${config.primaryColor}22`);
        sunGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Rays of light sweep
        ctx.strokeStyle = `${config.secondaryColor}08`;
        ctx.lineWidth = 15;
        const numRays = 12;
        for (let i = 0; i < numRays; i++) {
          const rayAngle = (i / numRays) * (Math.PI / 2) + Math.PI / 2 + Math.sin(angleShift + i) * 0.05;
          const targetX = sunX + Math.cos(rayAngle) * width * 1.5;
          const targetY = sunY + Math.sin(rayAngle) * height * 1.5;

          const rayGlow = ctx.createLinearGradient(sunX, sunY, targetX, targetY);
          rayGlow.addColorStop(0, `${config.secondaryColor}25`);
          rayGlow.addColorStop(0.3 + breathIntensity * 0.15, `${config.primaryColor}13`);
          rayGlow.addColorStop(1, 'transparent');
          ctx.strokeStyle = rayGlow;
          ctx.lineWidth = 40 + breathIntensity * 20;

          ctx.beginPath();
          ctx.moveTo(sunX, sunY);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
        }

        // Draw leafy silhouette curves swaying on top left
        ctx.fillStyle = '#052c1e';
        ctx.beginPath();
        // Sway amount reacts to wind velocity (particleSpeed)
        const leafSway = Math.cos(angleShift) * 15 * particleSpeedFactor;
        ctx.moveTo(-100, -100);
        ctx.quadraticCurveTo(width * 0.3 + leafSway, height * 0.2, width * 0.4 + leafSway, -100);
        ctx.closePath();
        ctx.fill();

      } else if (style === 'waves' || config.theme === 'custom-cool') {
        // --- SUNSET OCEAN SPLINE WAVES ---
        // Sinuous undulating waves stacked on top of each other.
        const numWaves = 4;
        const baseLine = height * 0.65;
        
        for (let w = 0; w < numWaves; w++) {
          const tier = w / numWaves;
          const waveGlow = ctx.createLinearGradient(0, baseLine - 100, 0, height);
          
          // Blend primary and secondary colors
          const alphaHex = Math.floor((0.15 - tier * 0.02) * 255).toString(16).padStart(2, '0');
          waveGlow.addColorStop(0, `${config.primaryColor}${alphaHex}`);
          waveGlow.addColorStop(0.7, `${config.secondaryColor}08`);
          waveGlow.addColorStop(1, 'transparent');
          
          ctx.fillStyle = waveGlow;
          ctx.beginPath();
          ctx.moveTo(0, height);
          ctx.lineTo(0, baseLine + w * 25);
          
          const segments = 40;
          const scaleW = width / segments;
          
          for (let s = 0; s <= segments; s++) {
            const sx = s * scaleW;
            const sineInput = (s * 0.12) - (angleShift * (2 - w * 0.3)) + (w * Math.PI / 3);
            const sy = baseLine + (w * 22) + 
                       Math.sin(sineInput) * (20 + breathIntensity * 30 * (1 - tier * 0.5));
            ctx.lineTo(sx, sy);
          }
          
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();
        }

      } else if (style === 'constellations' || style === 'nebula') {
        // --- COSMIC STAR CONSTELLATIONS ---
        const list = particlesRef.current;
        ctx.lineWidth = 0.6;
        
        // Let user's deep breathing weave cosmic strings connecting neighboring stars
        const connectDistance = Math.min(width, height) * 0.15 + (breathIntensity * 30);
        
        for (let i = 0; i < list.length; i++) {
          const pi = list[i];
          for (let j = i + 1; j < list.length; j++) {
            const pj = list[j];
            const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);
            
            if (dist < connectDistance) {
              const capAlpha = (1 - (dist / connectDistance)) * 0.18 * breathIntensity;
              ctx.strokeStyle = `${config.secondaryColor}${Math.floor(capAlpha * 255).toString(16).padStart(2, '0')}`;
              ctx.beginPath();
              ctx.moveTo(pi.x, pi.y);
              ctx.lineTo(pj.x, pj.y);
              ctx.stroke();
            }
          }
        }

      } else if (style === 'trees' || style === 'aurora') {
        // --- FRACTAL TREES & DEEP FOREST SUNSHAFTS ---
        // Create an organic light beams shining down at angles
        const beamGlow = ctx.createLinearGradient(0, 0, width, height);
        beamGlow.addColorStop(0, `${config.secondaryColor}${Math.floor((0.08 * breathIntensity) * 255).toString(16).padStart(2, '0')}`);
        beamGlow.addColorStop(0.5, `${config.primaryColor}05`);
        beamGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = beamGlow;
        ctx.fillRect(0, 0, width, height);

        // Render forest layers at bottom
        ctx.fillStyle = '#011910';
        const swayAngle = Math.sin(angleShift) * 0.08 * particleSpeedFactor;
        
        // Draw 3 layers of trees silhouettes (simple triangular crowns)
        const layers = 3;
        for (let l = 0; l < layers; l++) {
          const lRatio = l / layers;
          ctx.fillStyle = `rgba(1, ${24 - l * 4}, ${15 - l * 2}, ${0.3 + lRatio * 0.5})`;
          const treeWidth = 45 + l * 20;
          const treeHeight = 120 + l * 50;
          const yBase = height + 10;
          
          for (let tx = 20; tx < width; tx += (60 + l * 40)) {
            const swayOffset = swayAngle * treeHeight * (1 - lRatio * 0.3);
            ctx.beginPath();
            ctx.moveTo(tx, yBase);
            ctx.lineTo(tx + swayOffset, yBase - treeHeight);
            ctx.lineTo(tx + treeWidth + swayOffset, yBase);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else if (style === 'embers') {
        // --- COZY GLOWING EMBERS FIREPLACE GRID ---
        const hearthGlow = ctx.createRadialGradient(width / 2, height, 10, width / 2, height, height * 0.8 * heartBeatPulseRange);
        hearthGlow.addColorStop(0, `${config.secondaryColor}30`);
        hearthGlow.addColorStop(0.3, `${config.primaryColor}15`);
        hearthGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = hearthGlow;
        ctx.beginPath();
        ctx.arc(width / 2, height, height * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === 'rainbow' || config.theme === 'rainbow' || config.visualStyle === 'rainbow') {
        // --- IMMERSIVE GLOWING SPECULAR RAINBOW ARCS ---
        const rainbowColors = [
          'rgba(239, 68, 68, ',   // Rose/Red
          'rgba(249, 115, 22, ',  // Orange
          'rgba(234, 179, 8, ',   // Yellow
          'rgba(34, 197, 94, ',   // Clean Green
          'rgba(59, 130, 246, ',  // Sky Blue
          'rgba(168, 85, 247, ',  // Deep Violet
          'rgba(236, 72, 153, '   // Bright Pink
        ];
        
        const centerX = width / 2;
        // The rainbow arches breathe (moves up and down gently on respiration)
        const centerY = height * 1.05 + (Math.sin(angleShift) * 12);
        const baseRadius = Math.min(width, height) * 0.28 * heartBeatPulseRange;
        
        ctx.save();
        // Atmospheric soft color bloom behind the arches
        const backGlow = ctx.createRadialGradient(centerX, centerY * 0.8, 10, centerX, centerY * 0.8, baseRadius * 1.8);
        backGlow.addColorStop(0, 'rgba(168, 85, 247, 0.08)');
        backGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.04)');
        backGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = backGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY * 0.8, baseRadius * 2.0, 0, Math.PI * 2);
        ctx.fill();
        
        // Render 7 concentric neon-relaxed rainbow tubes
        ctx.lineWidth = Math.min(width, height) * 0.016 + (breathIntensity * 6);
        ctx.lineCap = 'round';
        
        for (let r = 0; r < rainbowColors.length; r++) {
          const radius = baseRadius + (r * ctx.lineWidth * 1.1) + (breathIntensity * 24);
          const arcAlpha = (0.28 - (r * 0.02)) * (0.8 + 0.2 * Math.sin(angleShift + r));
          
          ctx.strokeStyle = `${rainbowColors[r]}${arcAlpha})`;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, Math.PI + 0.06, Math.PI * 2 - 0.06);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Draw Common Layer: Soft Luminescent Floating Spheres
      const list = particlesRef.current;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        
        // Drift movement calculations
        p.y -= p.speedY * particleSpeedFactor;
        p.x += (p.speedX * particleSpeedFactor) + Math.sin(angleShift + p.phase) * 0.15;
        
        // Wrap edges smoothly
        if (p.y < -50) {
          p.y = height + 50;
          p.x = Math.random() * width;
        }
        if (p.x < -50) p.x = width + 50;
        if (p.x > width + 50) p.x = -50;

        // Twinkle factor using continuous sinusoidal oscillators
        const twinkle = Math.sin(angleShift * 2 + p.phase) * 0.2 + 0.8;
        // Breathing scales particle sizes up and down
        const dynamicSize = p.size * (1 + breathIntensity * 1.5) * heartBeatPulseRange * (style === 'embers' ? 0.8 : 1.0);
        
        // Determine particle alpha
        const glowAlpha = Math.min(1.0, Math.max(0, p.alpha * twinkle * (config.brightnessMultiplier || 1.0)));
        const colorHex = p.color;

        // Special dynamic rainbow spectrum shift for floating elements
        const isRainbowEffect = style === 'rainbow' || config.theme === 'rainbow' || config.visualStyle === 'rainbow';
        
        if (isRainbowEffect) {
          const hue = Math.round((i * (360 / list.length) + angleShift * 35) % 360);
          ctx.fillStyle = `hsla(${hue}, 95%, 70%, ${glowAlpha})`;
        } else {
          ctx.fillStyle = `${colorHex}${Math.floor(glowAlpha * 255).toString(16).padStart(2, '0')}`;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, dynamicSize, 0, Math.PI * 2);
        ctx.fill();

        // Extra outer blur ring for larger magical particles
        if (dynamicSize > 3.5) {
          if (isRainbowEffect) {
            const hue = Math.round((i * (360 / list.length) + angleShift * 35) % 360);
            ctx.fillStyle = `hsla(${hue}, 95%, 70%, 0.12)`;
          } else {
            ctx.fillStyle = `${colorHex}15`;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, dynamicSize * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw the Breathing Ring boundary indicator (acts as visual coach)
      ctx.strokeStyle = `${config.secondaryColor}25`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      // Center ring expands in and out matching the watch breath wave
      const ringRadius = 70 + (breathIntensity * 45);
      ctx.arc(width / 2, height / 2, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line style

      // 4. Render heartbeat rate line chart at the very bottom (humility, non-intrusive)
      ctx.strokeStyle = `${config.primaryColor}13`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      const waveSegments = 60;
      const step = width / waveSegments;
      ctx.moveTo(0, height - 10);
      for (let s = 0; s <= waveSegments; s++) {
        const sx = s * step;
        const sy = height - 15 + Math.sin(s * 0.3 - angleShift * 4) * (2 * heartBeatPulseRange);
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      localFrame = requestAnimationFrame(render);
    };

    localFrame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(localFrame);
    };
  }, [config, biofeedback]);

  return (
    <div id="canvas_parent" ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      <canvas
        id="relaxation_canvas"
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="block w-full h-full"
      />
    </div>
  );
};

export default VisualCanvas;
