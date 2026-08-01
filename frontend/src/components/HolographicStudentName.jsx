import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * HolographicStudentName Component - 3D Volumetric Holographic Renderer
 * 
 * Renders student name as a 3D volumetric holographic text block with:
 * - Real-time 3D perspective projection (X, Y, Z coordinates)
 * - 3D extruded bevel depth layers for true physical text volume
 * - Dynamic 3D interactive mouse tilt & rotation (yaw/pitch)
 * - Electric 3D neon gradient colors (Cyan, Electric Blue, Violet, Magenta, Gold)
 * - Dynamic 3D specular highlight and laser shimmer pulses
 */

export default function HolographicStudentName({ name }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);
  const isTabVisibleRef = useRef(true);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, rotX: 0, rotY: 0, targetRotX: 0, targetRotY: 0 });
  const dimensionsRef = useRef({ width: 0, height: 0, dpr: 1 });
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const cleanName = (name || '').trim().toUpperCase();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Interactive 3D Mouse Tilt & Parallax Tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normX = (e.clientX - centerX) / (rect.width / 2);
      const normY = (e.clientY - centerY) / (rect.height / 2);
      
      mouseRef.current.targetRotY = Math.max(-1, Math.min(1, normX)) * 0.35; // 3D Yaw rotation
      mouseRef.current.targetRotX = Math.max(-1, Math.min(1, normY)) * -0.25; // 3D Pitch rotation
      mouseRef.current.targetX = Math.max(-1, Math.min(1, normX)) * 8;
      mouseRef.current.targetY = Math.max(-1, Math.min(1, normY)) * 8;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetRotY = 0;
      mouseRef.current.targetRotX = 0;
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Main 3D Canvas Renderer
  useEffect(() => {
    if (prefersReducedMotion || !cleanName) return;

    timeRef.current = 0;
    particlesRef.current = [];

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');

    // 3D Neon Gradient Color Palette
    const colorPalette = [
      { main: '#00f0ff', glow: 'rgba(0, 240, 255, 0.6)', bevel: '#0284c7' },   // Electric Cyan
      { main: '#38bdf8', glow: 'rgba(56, 189, 248, 0.6)', bevel: '#0369a1' },   // Sky Neon
      { main: '#818cf8', glow: 'rgba(129, 140, 248, 0.6)', bevel: '#4338ca' },  // Deep Indigo
      { main: '#c084fc', glow: 'rgba(192, 132, 252, 0.6)', bevel: '#7e22ce' },  // Neon Violet
      { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.6)', bevel: '#be123c' },    // Hologram Magenta
      { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)', bevel: '#b45309' },   // Electric Gold
    ];

    // Create 3D Volumetric Particle Grid for Text
    const create3DParticlesForText = (w, h) => {
      if (w <= 0 || h <= 0) return [];

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

      const nameLength = Math.max(1, cleanName.length);
      let fontSize = Math.floor((w * 0.86) / (nameLength * 0.58));
      fontSize = Math.min(fontSize, Math.floor(h * 0.52));
      fontSize = Math.max(18, fontSize);

      offCtx.fillStyle = '#ffffff';
      offCtx.font = `900 ${fontSize}px "Outfit", "Inter", "Poppins", sans-serif`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillText(cleanName, w / 2, h / 2);

      const imgData = offCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const gap = w < 400 ? 3 : 2;
      const rawTargets = [];

      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          const alphaIndex = (y * w + x) * 4 + 3;
          if (data[alphaIndex] > 90) {
            rawTargets.push({ x, y });
          }
        }
      }

      const maxParticles = w < 600 ? 1200 : 2200;
      let finalTargets = rawTargets;
      if (rawTargets.length > maxParticles) {
        const step = rawTargets.length / maxParticles;
        finalTargets = [];
        for (let i = 0; i < maxParticles; i++) {
          finalTargets.push(rawTargets[Math.floor(i * step)]);
        }
      }

      const particles = [];
      const zDepths = [-10, -5, 0, 5, 10]; // 3D Volumetric Extrusion Layers

      for (let i = 0; i < finalTargets.length; i++) {
        const target = finalTargets[i];
        const colorObj = colorPalette[i % colorPalette.length];
        
        // Front & 3D bevel depth layers
        const zLayer = zDepths[i % zDepths.length];
        const isFront = zLayer === 0;

        particles.push({
          id: i,
          x: w / 2 + (Math.random() - 0.5) * w * 1.2,
          y: h / 2 + (Math.random() - 0.5) * h * 1.4,
          z: (Math.random() - 0.5) * 60,
          targetX: target.x,
          targetY: target.y,
          targetZ: zLayer,
          vx: 0,
          vy: 0,
          vz: 0,
          baseSize: isFront ? 1.6 : 1.3,
          colorObj,
          isFront,
          phase: Math.random() * Math.PI * 2,
          sparkle: Math.random() < 0.08,
        });
      }

      return particles;
    };

    const updateCanvasDimensions = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w <= 0 || h <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dimensionsRef.current = { width: w, height: h, dpr };

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.scale(dpr, dpr);
      particlesRef.current = create3DParticlesForText(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasDimensions();
    });
    resizeObserver.observe(container);
    updateCanvasDimensions();

    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ----------------------------------------------------
    // 3D VOLUMETRIC RENDER LOOP (60 FPS)
    // ----------------------------------------------------
    const render = () => {
      if (!isTabVisibleRef.current) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const { width: w, height: h } = dimensionsRef.current;
      if (w <= 0 || h <= 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      timeRef.current += 1;
      const frame = timeRef.current;

      // 3D Smooth Mouse Rotation & Parallax Easing
      const mouse = mouseRef.current;
      mouse.rotX += (mouse.targetRotX - mouse.rotX) * 0.08;
      mouse.rotY += (mouse.targetRotY - mouse.rotY) * 0.08;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      ctx.clearRect(0, 0, w, h);

      // Ambient 3D Radial Hologram Spotlight
      const ambientGlow = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.42);
      ambientGlow.addColorStop(0, 'rgba(59, 130, 246, 0.16)');
      ambientGlow.addColorStop(0.5, 'rgba(139, 92, 246, 0.08)');
      ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, w, h);

      const fov = 260; // 3D Field of View
      const cx = w / 2;
      const cy = h / 2;
      const particles = particlesRef.current;
      const len = particles.length;

      // 3D Matrix Transformations & Projection
      const sinY = Math.sin(mouse.rotY + Math.sin(frame * 0.015) * 0.06);
      const cosY = Math.cos(mouse.rotY + Math.sin(frame * 0.015) * 0.06);
      const sinX = Math.sin(mouse.rotX + Math.cos(frame * 0.015) * 0.04);
      const cosX = Math.cos(mouse.rotX + Math.cos(frame * 0.015) * 0.04);

      // Sort 3D particles back-to-front (Z-sorting)
      const projected = [];

      for (let i = 0; i < len; i++) {
        const p = particles[i];

        // Easing towards 3D target coordinates
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dz = p.targetZ - p.z;

        p.vx = (p.vx + dx * 0.12) * 0.82;
        p.vy = (p.vy + dy * 0.12) * 0.82;
        p.vz = (p.vz + dz * 0.12) * 0.82;

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Translate to 3D center origin
        const relX = p.x - cx;
        const relY = p.y - cy;
        const relZ = p.z;

        // 3D Yaw (Y-axis) rotation
        const rx1 = relX * cosY - relZ * sinY;
        const rz1 = relX * sinY + relZ * cosY;

        // 3D Pitch (X-axis) rotation
        const ry1 = relY * cosX - rz1 * sinX;
        const rz2 = relY * sinX + rz1 * cosX;

        // 3D Perspective Projection Scale
        const scale = fov / (fov + rz2);
        const projX = cx + rx1 * scale + mouse.x * 0.4;
        const projY = cy + ry1 * scale + mouse.y * 0.4;

        if (scale > 0 && projX >= -20 && projX <= w + 20 && projY >= -20 && projY <= h + 20) {
          projected.push({
            p,
            projX,
            projY,
            scale,
            rz: rz2
          });
        }
      }

      // Sort by depth rz2 ascending (furthest first)
      projected.sort((a, b) => b.rz - a.rz);

      // Render 3D Extruded Particles & Bevel Lighting
      const projLen = projected.length;
      for (let i = 0; i < projLen; i++) {
        const item = projected[i];
        const { p, projX, projY, scale } = item;

        p.phase += 0.03;
        const pulse = Math.sin(p.phase) * 0.15;
        const renderSize = p.baseSize * scale * (p.sparkle ? 1.4 : 1.0);
        const renderAlpha = Math.max(0.2, Math.min(0.98, (0.75 + pulse) * (scale * 0.85)));

        ctx.globalAlpha = renderAlpha;

        // 3D Bevel depth fill & front glow
        if (p.isFront) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = p.colorObj.main;
          ctx.shadowBlur = 8 * scale;
        } else {
          ctx.fillStyle = p.colorObj.main;
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(projX, projY, Math.max(0.8, renderSize), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw subtle horizontal 3D laser scan beam
      ctx.shadowBlur = 0;
      const scanY = (frame * 1.5) % (h + 40) - 20;
      const scanGrad = ctx.createLinearGradient(0, scanY - 3, 0, scanY + 3);
      scanGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      scanGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.4)');
      scanGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 3, w, 6);

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cleanName, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minWidth: 180,
        height: '100%',
        minHeight: 110,
        maxHeight: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      aria-label={`3D Holographic name display: ${cleanName}`}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
