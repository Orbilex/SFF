import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, BookOpen, Lightbulb, Zap, Hexagon, Snowflake, Crosshair, Radio, CircleDot, Globe, Sigma, Bot, Box, Rocket, Package } from 'lucide-react';
import { TowerType, Rarity, EnemyShape, EnemyTrait, Tower, Enemy } from '../types';
import { TOWER_STATS, ROMAN_NUMERALS } from '../constants';

interface ArmoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const getTowerIcon = (type: TowerType, size: number = 24, className: string = "") => {
    switch(type) {
        case TowerType.PULSE: return <Radio size={size} className={className} />;
        case TowerType.BLASTER: return <Crosshair size={size} className={className} />;
        case TowerType.LASER: return <Zap size={size} className={className} />;
        case TowerType.CRYO: return <Snowflake size={size} className={className} />;
        case TowerType.PLASMA: return <Hexagon size={size} className={className} />;
        case TowerType.ROCKET: return <Rocket size={size} className={className} />;
        case TowerType.BLACKHOLE: return <CircleDot size={size} className={className} />;
        case TowerType.OSAPM: return <Globe size={size} className={className} />;
        case TowerType.SIGMANATOR: return <Sigma size={size} className={className} />;
        case TowerType.EVERYMECH: return <Bot size={size} className={className} />;
        default: return <Box size={size} className={className} />;
    }
};

const DemoCanvas = ({ selectedTower }: { selectedTower: TowerType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const stats = TOWER_STATS[selectedTower];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let startTime = performance.now();

        const drawTower3D = (ctx: CanvasRenderingContext2D, tower: Tower, time: number) => {
            const { x, y } = tower.position;
            const stats = TOWER_STATS[tower.type];
            const timeSinceFire = time - tower.lastFired;
            let recoil = 0;
            let recoilMax = 8;
            if (tower.type === TowerType.BLASTER) recoilMax = 24; 
            if (tower.type === TowerType.OSAPM) recoilMax = 0; 
            if (tower.type === TowerType.SIGMANATOR) recoilMax = 0; 
            if (tower.type === TowerType.EVERYMECH) recoilMax = 0; 
            if (timeSinceFire < 200 && tower.type !== TowerType.SIGMANATOR && tower.type !== TowerType.EVERYMECH) { const t = timeSinceFire / 200; recoil = t < 0.1 ? (t / 0.1) * recoilMax : (1 - (t - 0.1) / 0.9) * recoilMax; }
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 8, 24, 14, 0, 0, Math.PI * 2); ctx.fill();
            const gradBase = ctx.createLinearGradient(x-15, y-10, x+15, y+10); gradBase.addColorStop(0, '#334155'); gradBase.addColorStop(1, '#0f172a');
            if (tower.type !== TowerType.OSAPM && tower.type !== TowerType.SIGMANATOR && tower.type !== TowerType.EVERYMECH) { ctx.fillStyle = gradBase; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI*2); ctx.fill(); }
            if (tower.type === TowerType.SIGMANATOR && tower.lastShotWasPrecision && timeSinceFire < 500) { const fade = 1 - (timeSinceFire / 500); const rise = (timeSinceFire / 500) * 30; ctx.save(); ctx.translate(x, y - 30 - rise); ctx.globalAlpha = fade; ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; const chSize = 10; ctx.beginPath(); ctx.moveTo(0, -chSize); ctx.lineTo(0, chSize); ctx.moveTo(-chSize, 0); ctx.lineTo(chSize, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0,0, chSize * 0.6, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore(); }
            ctx.save();
            if (tower.type === TowerType.SIGMANATOR) {
                let scaleX = 1; let scaleY = 1; const animDur = 300; if (timeSinceFire < animDur) { const t = timeSinceFire / animDur; if (t < 0.3) { const squash = Math.sin((t / 0.3) * Math.PI); scaleX = 1 + (squash * 0.3); scaleY = 1 - (squash * 0.2); } else { const stretch = Math.sin(((t - 0.3) / 0.7) * Math.PI); scaleX = 1 - (stretch * 0.15); scaleY = 1 + (stretch * 0.15); } }
                const jitter = 0.5 + Math.random(); ctx.translate(x + (Math.random() - 0.5) * jitter, (y) + (Math.random() - 0.5) * jitter); ctx.scale(scaleX, scaleY);
                let spinAngle = 0; if (timeSinceFire < 600) { const progress = timeSinceFire / 600; const ease = 1 - Math.pow(1 - progress, 3); spinAngle = ease * (Math.PI * 4); } ctx.rotate(tower.angle + spinAngle);
            } else if (tower.type === TowerType.EVERYMECH) { ctx.translate(x, y); ctx.rotate(tower.angle); 
            } else if (tower.type !== TowerType.BLACKHOLE && tower.type !== TowerType.OSAPM) { ctx.translate(x, y - 8); ctx.rotate(tower.angle); ctx.translate(-recoil, 0); 
            } else if (tower.type === TowerType.OSAPM) { ctx.translate(x, y); 
            } else { ctx.translate(x, y - 8); }

            if (tower.type === TowerType.PULSE) {
                ctx.fillStyle = '#1a2e05'; ctx.fillRect(0, -6, 32, 12); ctx.fillStyle = '#365314'; ctx.fillRect(28, -7, 6, 14); ctx.fillStyle = '#3f6212'; ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(-16, -12); ctx.lineTo(-20, -8); ctx.lineTo(-20, 8); ctx.lineTo(-16, 12); ctx.lineTo(10, 12); ctx.lineTo(14, 6); ctx.lineTo(14, -6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a3e635'; ctx.fillRect(-10, -12, 5, 24);
            } else if (tower.type === TowerType.BLASTER) {
                ctx.fillStyle = '#292524'; ctx.fillRect(4, 4, 38, 8); ctx.fillRect(4, -12, 38, 8); ctx.fillStyle = '#000'; ctx.fillRect(42, -11, 3, 6); ctx.fillRect(42, 5, 3, 6); ctx.fillStyle = '#854d0e'; ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(-14, -22); ctx.lineTo(-18, -10); ctx.lineTo(-18, 10); ctx.lineTo(-14, 22); ctx.lineTo(10, 18); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a16207'; ctx.fillRect(-12, -14, 20, 28); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
            } else if (tower.type === TowerType.LASER) {
                ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, -6, 40, 4); ctx.fillRect(0, 2, 40, 4); ctx.fillStyle = stats.color; ctx.globalAlpha = 0.8; ctx.fillRect(4, -2, 34, 4); ctx.globalAlpha = 1.0; ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-20, -14); ctx.lineTo(-12, 0); ctx.lineTo(-20, 14); ctx.lineTo(0, 10); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d8b4fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, -8); ctx.lineTo(-5, -4); ctx.moveTo(-15, 8); ctx.lineTo(-5, 4); ctx.stroke();
            } else if (tower.type === TowerType.CRYO) {
                ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(28, -12); ctx.lineTo(28, 12); ctx.lineTo(0, 8); ctx.fill(); ctx.fillStyle = '#1e40af'; ctx.fillRect(-18, -14, 28, 28); ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(-18, -8, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-18, 8, 6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#e0f2fe'; ctx.globalAlpha = 0.3; ctx.fillRect(-14, -10, 20, 20); ctx.globalAlpha = 1.0;
            } else if (tower.type === TowerType.PLASMA) {
                ctx.fillStyle = '#4c0519'; ctx.fillRect(0, -10, 28, 20); ctx.fillStyle = stats.color; ctx.beginPath(); ctx.ellipse(28, 0, 4, 8, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#9f1239'; ctx.beginPath(); ctx.arc(-4, 0, 16, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#fda4af'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-4, 0, 10, 0, Math.PI*2); ctx.stroke();
            } else if (tower.type === TowerType.ROCKET) {
                ctx.fillStyle = '#facc15'; ctx.fillRect(-16, -12, 32, 24); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.strokeRect(-16, -12, 32, 24); ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(0, -12); ctx.lineTo(-16, 0); ctx.lineTo(-16, -8); ctx.fill(); ctx.fillStyle = '#1f2937'; ctx.fillRect(16, -10, 4, 20); ctx.fillStyle = '#7f1d1d'; ctx.fillRect(16, -8, 2, 16); ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
            } else if (tower.type === TowerType.EVERYMECH) {
                const mode = tower.mechMode || 'MG';
                const isFiring = timeSinceFire < 150;
                const isSpecialProc = tower.lastSpecialProc && isFiring;
                const metallicGrad = ctx.createLinearGradient(-10, -10, 10, 20); metallicGrad.addColorStop(0, '#94a3b8'); metallicGrad.addColorStop(0.5, '#334155'); metallicGrad.addColorStop(1, '#1e293b');
                const darkArmorGrad = ctx.createLinearGradient(0, -20, 0, 20); darkArmorGrad.addColorStop(0, '#0f172a'); darkArmorGrad.addColorStop(0.5, '#334155'); darkArmorGrad.addColorStop(1, '#020617');
                const neonBlue = '#22d3ee'; const neonRed = '#ef4444'; const neonGreen = '#4ade80';
                ctx.scale(2.5, 2.5);
                ctx.save();
                ctx.fillStyle = darkArmorGrad; ctx.beginPath(); ctx.moveTo(-12, 10); ctx.lineTo(-18, 20); ctx.lineTo(-8, 20); ctx.lineTo(-4, 10); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.5; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-18, -20); ctx.lineTo(-8, -20); ctx.lineTo(-4, -10); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#64748b'; ctx.fillRect(-16, 18, 6, 4); ctx.fillRect(-16, -22, 6, 4); ctx.restore();
                ctx.save();
                if (mode === 'MG') { ctx.fillStyle = '#d97706'; ctx.fillRect(-20, 4, 12, 14); ctx.strokeStyle = '#b45309'; ctx.strokeRect(-20, 4, 12, 14); ctx.beginPath(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([2, 2]); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-5, 20, 5, 12); ctx.stroke(); ctx.setLineDash([]); } 
                else if (mode === 'SNIPER') { ctx.fillStyle = '#0f172a'; ctx.fillRect(-20, -8, 10, 16); ctx.fillStyle = isFiring ? '#fff' : neonBlue; ctx.shadowColor = neonBlue; ctx.shadowBlur = 5; ctx.fillRect(-18, -6, 2, 12); ctx.fillRect(-14, -6, 2, 12); ctx.shadowBlur = 0; }
                ctx.fillStyle = metallicGrad; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(10, -16); ctx.lineTo(14, 0); ctx.lineTo(10, 16); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
                ctx.fillStyle = darkArmorGrad; ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(6, -10); ctx.lineTo(10, 0); ctx.lineTo(6, 10); ctx.lineTo(-5, 8); ctx.fill();
                ctx.fillStyle = mode === 'SNIPER' ? neonBlue : (mode === 'MG' ? '#fbbf24' : neonRed); if (isFiring) ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2, 0, 2, 0, Math.PI*2); ctx.fill();
                let headRecoil = 0; if (isSpecialProc) headRecoil = -3;
                ctx.save(); ctx.translate(headRecoil, 0); ctx.fillStyle = darkArmorGrad; ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(6, -6); ctx.lineTo(9, 0); ctx.lineTo(6, 6); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = mode === 'SNIPER' ? neonBlue : (mode === 'MG' ? neonGreen : neonRed); ctx.lineWidth = 1.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 5; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(7, 0); ctx.lineTo(4, 3); ctx.stroke(); ctx.shadowBlur = 0;
                if (mode === 'SNIPER') { const podOffset = isSpecialProc ? 6 : 0; ctx.fillStyle = '#334155'; ctx.fillRect(-2, -7 - podOffset, 8, 4); ctx.fillStyle = '#ef4444'; if (isSpecialProc) { ctx.beginPath(); ctx.arc(2, -7 - podOffset, 1.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, -7 - podOffset, 1.5, 0, Math.PI*2); ctx.fill(); } ctx.fillStyle = '#334155'; ctx.fillRect(-2, 3 + podOffset, 8, 4); ctx.fillStyle = '#ef4444'; if (isSpecialProc) { ctx.beginPath(); ctx.arc(2, 5 + podOffset, 1.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, 5 + podOffset, 1.5, 0, Math.PI*2); ctx.fill(); } } 
                else if (mode === 'MG') { const jawOffset = isSpecialProc ? 4 : 0; ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(6 + jawOffset, 4); ctx.lineTo(6 + jawOffset, 8); ctx.lineTo(0, 8); ctx.fill(); if (isSpecialProc) { ctx.fillStyle = neonGreen; ctx.shadowColor = neonGreen; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(4, 6, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; } }
                ctx.restore();
                let recoilX = 0; let recoilY = 0; if (isFiring) { recoilX = -4 + Math.random(); if (mode === 'MG') recoilX = -1 + (Math.random() * -2); }
                ctx.save(); ctx.translate(recoilX, recoilY);
                if (mode === 'SNIPER') { ctx.fillStyle = '#1e293b'; ctx.fillRect(-12, 2, 16, 6); ctx.fillStyle = '#475569'; ctx.fillRect(4, 0, 24, 10); ctx.fillStyle = '#0f172a'; ctx.fillRect(28, 2, 50, 2); ctx.fillRect(28, 6, 50, 2); if (time % 200 < 100 || isFiring) { ctx.fillStyle = neonBlue; ctx.shadowColor = neonBlue; ctx.shadowBlur = 10; ctx.fillRect(28, 4, 48, 2); ctx.shadowBlur = 0; } ctx.fillStyle = '#cbd5e1'; ctx.fillRect(78, 1, 4, 8); ctx.fillStyle = '#020617'; ctx.fillRect(8, -5, 20, 5); ctx.fillStyle = neonBlue; ctx.beginPath(); ctx.ellipse(28, -2.5, 1, 2, 0, 0, Math.PI*2); ctx.fill(); } 
                else if (mode === 'MG') { ctx.fillStyle = '#334155'; ctx.fillRect(4, 4, 20, 12); ctx.fillStyle = darkArmorGrad; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 20); ctx.lineTo(20, 18); ctx.lineTo(20, 2); ctx.fill(); ctx.fillStyle = '#94a3b8'; const spin = (time / 20) % (Math.PI * 2); ctx.fillRect(24, 6 + Math.sin(spin)*3, 24, 2); ctx.fillRect(24, 10 + Math.cos(spin)*3, 24, 2); ctx.fillRect(24, 8 - Math.sin(spin)*3, 24, 2); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.strokeRect(46, 5, 2, 10); } 
                else if (mode === 'HAMMER') { const swingDuration = 450; const t = timeSinceFire / swingDuration; let armRotation = 0; if (timeSinceFire < swingDuration) { if (t < 0.3) { const windUp = t / 0.3; const ease = windUp * windUp; armRotation = -0.8 - (ease * 1.2); } else if (t < 0.6) { const slashT = (t - 0.3) / 0.3; const ease = 1 - Math.pow(1 - slashT, 4); armRotation = -2.0 + (ease * 4.5); } else { const recT = (t - 0.6) / 0.4; const ease = recT * (2 - recT); armRotation = 2.5 - (ease * 3.3); } } else { armRotation = -0.8; } ctx.save(); ctx.translate(8, 8); ctx.rotate(armRotation); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.roundRect(0, -3, 14, 6, 2); ctx.fill(); ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(24, -3); ctx.lineTo(24, 3); ctx.lineTo(12, 4); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.5; ctx.stroke(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(26, 0, 5, 0, Math.PI*2); ctx.fill(); ctx.translate(26, 0); if (t > 0.3 && t < 0.6) { ctx.save(); ctx.rotate(Math.PI / 2); const swipeOpacity = 1 - ((t - 0.3) / 0.3); ctx.fillStyle = `rgba(239, 68, 68, ${swipeOpacity * 0.5})`; ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(-40, 120); ctx.lineTo(60, 120); ctx.lineTo(20, 20); ctx.fill(); ctx.restore(); } ctx.rotate(Math.PI / 2); const drawCleaver = (blurAlpha = 1.0) => { ctx.save(); ctx.fillStyle = `rgba(30, 41, 59, ${blurAlpha})`; ctx.fillRect(-5, -12, 10, 28); ctx.fillStyle = `rgba(15, 23, 42, ${blurAlpha})`; ctx.beginPath(); ctx.moveTo(-12, 16); ctx.lineTo(12, 16); ctx.lineTo(14, 24); ctx.lineTo(-14, 24); ctx.fill(); ctx.fillStyle = `rgba(51, 65, 85, ${blurAlpha})`; ctx.beginPath(); ctx.moveTo(-4, 24); ctx.lineTo(-8, 90); ctx.lineTo(35, 110); ctx.lineTo(45, 95); ctx.lineTo(18, 24); ctx.closePath(); ctx.fill(); if (blurAlpha === 1.0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(-4, 40); ctx.lineTo(10, 45); ctx.lineTo(5, 24); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-2, 80, 4, 4); ctx.fillRect(-2, 70, 4, 4); } ctx.fillStyle = `rgba(239, 68, 68, ${blurAlpha})`; if (blurAlpha === 1.0) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 20; } ctx.beginPath(); ctx.moveTo(18, 24); ctx.lineTo(45, 95); ctx.lineTo(35, 110); ctx.lineTo(25, 105); ctx.lineTo(12, 26); ctx.closePath(); ctx.fill(); ctx.strokeStyle = `rgba(255, 255, 255, ${blurAlpha * 0.8})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(18, 24); ctx.lineTo(45, 95); ctx.lineTo(35, 110); ctx.stroke(); ctx.shadowBlur = 0; ctx.restore(); }; if (t > 0.3 && t < 0.5) { ctx.save(); ctx.rotate(-0.4); ctx.globalAlpha = 0.4; drawCleaver(0.5); ctx.restore(); } drawCleaver(1.0); ctx.restore(); } 
                if (mode !== 'HAMMER') { ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0, 10, 6, 0, Math.PI*2); ctx.fill(); } else { ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.stroke(); } ctx.restore(); ctx.restore();
            } else if (tower.type === TowerType.SIGMANATOR) {
                const scale = 1.4; ctx.scale(scale, scale); ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(10, -10); ctx.lineTo(18, -4); ctx.lineTo(18, 4); ctx.lineTo(10, 10); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#1e293b'; ctx.fillRect(10, -7, 22, 14); ctx.fillStyle = '#020617'; ctx.fillRect(30, -9, 6, 18); ctx.fillStyle = '#334155'; ctx.fillRect(31, -9, 1, 18); ctx.save(); ctx.translate(0, 14); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-10, -4, 20, 10, 2); ctx.fill(); const tankGrad = ctx.createLinearGradient(-8, 0, 8, 0); tankGrad.addColorStop(0, '#000'); tankGrad.addColorStop(0.5, '#581c87'); tankGrad.addColorStop(1, '#000'); ctx.fillStyle = tankGrad; ctx.fillRect(-8, -2, 16, 6); ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8; ctx.fillRect(-6, 0, 12, 2); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-8, -2, 16, 1); ctx.restore(); ctx.strokeStyle = '#171717'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(0, 5, 5, 5, 5, 0); ctx.stroke(); ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); const isLoaded = timeSinceFire > (stats.cooldown - 1500); if (isLoaded) { ctx.save(); ctx.translate(-6, 0); ctx.fillStyle = '#2e1065'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(12, -5); ctx.lineTo(16, 0); ctx.lineTo(12, 5); ctx.lineTo(0, 5); ctx.fill(); ctx.fillStyle = '#c084fc'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 5; ctx.fillRect(4, -5, 2, 10); ctx.shadowBlur = 0; ctx.restore(); } ctx.fillStyle = '#0f172a'; ctx.fillRect(-16, -8, 12, 16); ctx.strokeStyle = '#334155'; ctx.strokeRect(-16, -8, 12, 16); ctx.fillStyle = '#000'; ctx.fillRect(-18, -6, 2, 4); ctx.fillRect(-18, 2, 2, 4); const heat = Math.max(0, 1 - (timeSinceFire / 1000)); if (heat > 0) { ctx.fillStyle = `rgba(239, 68, 68, ${heat})`; ctx.fillRect(-18, -6, 2, 4); ctx.fillRect(-18, 2, 2, 4); }
            } else if (tower.type === TowerType.OSAPM) {
                ctx.scale(1.8, 1.8); 
                const animTime = time - tower.lastFired; 
                let launcherAngle = 0; 
                const fireRecoil = animTime < 500 ? Math.sin(animTime * 0.02) * 3 : 0; 
                if (animTime > 18000) { const raiseProgress = Math.min(1, (animTime - 18000) / 5000); const ease = raiseProgress < 0.5 ? 2 * raiseProgress * raiseProgress : -1 + (4 - 2 * raiseProgress) * raiseProgress; launcherAngle = ease * (Math.PI / 2); } else if (animTime < 2000) { launcherAngle = (Math.PI / 2) * (1 - (animTime / 2000)); } else { launcherAngle = 0; } 
                ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(-28, -18, 56, 8, 2); ctx.fill(); ctx.beginPath(); ctx.roundRect(-28, 10, 56, 8, 2); ctx.fill(); 
                ctx.fillStyle = '#0f172a'; for(let i=0; i<6; i++) { const wx = -20 + (i * 8); ctx.beginPath(); ctx.arc(wx, -14, 2.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(wx, 14, 2.5, 0, Math.PI*2); ctx.fill(); } 
                ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(-32, -8); ctx.lineTo(-20, -14); ctx.lineTo(28, -14); ctx.lineTo(32, -6); ctx.lineTo(32, 6); ctx.lineTo(28, 14); ctx.lineTo(-20, 14); ctx.lineTo(-32, 8); ctx.closePath(); ctx.fill(); 
                ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-25, -8); ctx.lineTo(-15, -14); ctx.lineTo(-12, -14); ctx.lineTo(-22, -8); ctx.fill(); ctx.fillRect(20, -14, 4, 28); 
                
                ctx.save();
                ctx.translate(-21, 0); 
                ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
                const secRecoil = (time - (tower.lastSecondaryFired || 0)) < 150 ? -2 * (1 - (time - (tower.lastSecondaryFired||0))/150) : 0;
                ctx.rotate(tower.secondaryAngle || 0);
                ctx.translate(secRecoil, 0);
                
                ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(-4, -6, 14, 12, 2); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = '#ea580c'; ctx.fillRect(-2, -6, 4, 12);
                ctx.fillStyle = '#0f172a'; ctx.fillRect(8, -5, 3, 10);
                const isSecLoaded = (time - (tower.lastSecondaryFired || 0)) > 200;
                if (isSecLoaded) { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(9.5, 0, 2.5, 0, Math.PI*2); ctx.fill(); }
                ctx.restore();

                ctx.save(); const pivotX = 4; const pivotY = 0; ctx.translate(pivotX, pivotY + fireRecoil); ctx.rotate(launcherAngle); 
                let podLen = 32; let podHeight = 20; if (tower.ammoType === 'SPECIAL') { const expandDur = 800; const progress = Math.min(1, Math.max(0, (animTime - 15000) / expandDur)); const ease = 1 - Math.pow(1 - progress, 3); podLen = 32 + (12 * ease); podHeight = 20 + (8 * ease); } 
                if (tower.ammoType) { const isSpecial = tower.ammoType === 'SPECIAL'; ctx.save(); ctx.translate(32, 0); if (isSpecial) { ctx.scale(2.0, 2.0); const grad = ctx.createLinearGradient(0, -6, 0, 6); grad.addColorStop(0, '#475569'); grad.addColorStop(0.5, '#0f172a'); grad.addColorStop(1, '#020617'); ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-5, 5); ctx.lineTo(-40, 6); ctx.lineTo(-40, -6); ctx.fill(); const headGrad = ctx.createLinearGradient(-65, 0, -40, 0); headGrad.addColorStop(0, '#fff7ed'); headGrad.addColorStop(0.5, '#f97316'); headGrad.addColorStop(1, '#7c2d12'); ctx.fillStyle = headGrad; ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(-40, 6); ctx.lineTo(-65, 0); ctx.fill(); const pulse = Math.abs(Math.sin(time * 0.005)); ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10; ctx.fillStyle = `rgba(249, 115, 22, ${0.6 + pulse * 0.4})`; ctx.fillRect(-35, -2, 30, 4); ctx.shadowBlur = 0; } else { ctx.shadowBlur = 5; ctx.shadowColor = '#000'; ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-60, -7, 55, 14); ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-60, -7); ctx.lineTo(-60, 7); ctx.lineTo(-78, 0); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-50, -7, 4, 14); ctx.fillRect(-40, -7, 4, 14); } ctx.restore(); } ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.roundRect(-5, -podHeight/2, podLen, podHeight, 4); ctx.fill(); ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.roundRect(-5, -podHeight/2 - 2, podLen, podHeight/2 + 2, [4,4,0,0]); ctx.fill(); ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.roundRect(-5, 0, podLen, podHeight/2 + 2, [0,0,4,4]); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.strokeRect(-5, -podHeight/2, podLen, podHeight); ctx.fillStyle = '#f97316'; ctx.fillRect(10, -podHeight/2 + 4, 4, podHeight - 8); ctx.restore(); if (animTime > 18000) { if (Math.floor(time / 100) % 2 === 0) { ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(18, -8, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; } }
            } else if (tower.type === TowerType.BLACKHOLE) {
                const isGiantShot = tower.lastShotWasGiant || false; const animDuration = isGiantShot ? 1200 : 600; const isShooting = timeSinceFire < animDuration; const t = Math.min(1, timeSinceFire / animDuration); let scaleAnim = 0; if (isShooting) { if (t < 0.1) scaleAnim = t / 0.1; else { const releaseT = (t - 0.1) / 0.9; scaleAnim = 1 + Math.sin(releaseT * Math.PI * 5) * Math.exp(-releaseT * 3) * 0.3; } } const baseScale = 2.2; const targetScale = isGiantShot ? 4.5 : 1.4; const envelope = isShooting ? Math.pow(1 - t, 0.5) : 0; const expansion = envelope * (targetScale - 1.0); const currentScale = baseScale + expansion + (isShooting ? 0 : Math.sin(time/200)*0.05); const stretchAmt = isShooting ? (1-t) * (isGiantShot ? 0.6 : 0.3) : 0; const jitter = isGiantShot && isShooting ? (Math.random() - 0.5) * 0.1 : 0; const scaleX = currentScale * (1 - stretchAmt + jitter); const scaleY = currentScale * (1 + stretchAmt + jitter); ctx.save(); ctx.scale(scaleX, scaleY); ctx.beginPath(); ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)'; ctx.lineWidth = 2; ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke(); ctx.save(); ctx.rotate(time * 0.0005); ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'; ctx.lineWidth = 1; ctx.beginPath(); const dashLen = Math.PI / 4; for(let i=0; i<4; i++) { ctx.arc(0, 0, 22, i * Math.PI/2, i * Math.PI/2 + dashLen/2); ctx.stroke(); } ctx.restore(); ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.ellipse(0, 12, 16, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.shadowColor = '#2563eb'; ctx.shadowBlur = 10; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 0.5; ctx.stroke(); ctx.shadowBlur = 0; const rotation = (time / 400) + (isShooting ? Math.pow(1-t, 2) * 25 : 0); ctx.shadowBlur = isGiantShot && isShooting ? 60 : 20; ctx.shadowColor = isGiantShot ? '#ffffff' : '#3b82f6'; ctx.lineWidth = isGiantShot ? 3 : 2.5; ctx.strokeStyle = isGiantShot ? '#bfdbfe' : '#3b82f6'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 10, rotation, 0, Math.PI*2); ctx.stroke(); ctx.strokeStyle = isGiantShot ? '#60a5fa' : '#2563eb'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 18, -rotation * 1.2, 0, Math.PI*2); ctx.stroke(); if (isGiantShot) { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 32, rotation * 0.5, 0, Math.PI*2); ctx.stroke(); } ctx.fillStyle = '#fff'; for(let i=0; i<3; i++) { const ang = (time * 0.002) + (i * (Math.PI * 2 / 3)); const rx = Math.cos(ang) * 28; const ry = Math.sin(ang) * 8; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI*2); ctx.fill(); } ctx.globalAlpha = 1.0; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0,0, 15, 0, Math.PI*2); ctx.fill(); if (isShooting && t < 0.2) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - (t/0.2); ctx.beginPath(); ctx.arc(0,0, 16, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; } ctx.restore(); ctx.shadowBlur = 0;
            }
            ctx.restore();
            
            // Laser beam
            if (tower.type === TowerType.LASER && timeSinceFire < 50) {
                const barrelLen = 40 - recoil; const muzzleX = x + Math.cos(tower.angle) * barrelLen; const muzzleY = y - 8 + Math.sin(tower.angle) * barrelLen; 
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = stats.color; ctx.shadowBlur = 15; ctx.strokeStyle = stats.color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(muzzleX, muzzleY); ctx.lineTo(canvas.width - 60, canvas.height / 2); ctx.stroke(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
            }
        };

        const drawProceduralEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, simplified: boolean) => {
            const { x, y } = enemy.position; const r = enemy.radius; const tier = enemy.tier || 1;
            if (!simplified) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(x, y + 5, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
            const isFrozen = enemy.frozenFactor < 1; const isFlashing = enemy.damageFlashTimer > 0;
            if (enemy.stunTimer && enemy.stunTimer > 0) { ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = '#facc15'; ctx.beginPath(); ctx.arc(x, y - r - 10, 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
            if (enemy.irradiatedTimer > 0) { ctx.save(); const pulse = 1 + Math.sin(time * 0.01) * 0.2; ctx.fillStyle = `rgba(255, 165, 0, ${0.6 * pulse})`; ctx.shadowColor = 'orange'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
            const mainColor = isFlashing ? '#ef4444' : (isFrozen ? '#dbeafe' : enemy.color);
            ctx.save(); ctx.translate(x, y);
            if (tier === 5) {
                ctx.beginPath(); ctx.fillStyle = '#020617'; ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();
                if (!simplified) { ctx.save(); ctx.rotate(time * 0.001); ctx.strokeStyle = mainColor; ctx.lineWidth = 3; const s = r * 1.2; ctx.strokeRect(-s/2, -s/2, s, s); ctx.rotate(time * -0.002); ctx.lineWidth = 1; ctx.strokeRect(-s/3, -s/3, s*0.66, s*0.66); ctx.restore(); ctx.beginPath(); ctx.strokeStyle = isFlashing ? '#fff' : mainColor; ctx.lineWidth = 2; ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.stroke(); }
            } else if (tier >= 3 && !simplified) {
                ctx.save(); ctx.rotate(time * 0.001); ctx.strokeStyle = mainColor; ctx.lineWidth = tier >= 4 ? 3 : 1; ctx.globalAlpha = 0.5; ctx.beginPath(); const ringSize = r * (tier >= 4 ? 1.8 : 1.4); const segments = 3; for(let i=0; i<segments; i++) { ctx.rotate(Math.PI * 2 / segments); ctx.moveTo(ringSize, 0); ctx.lineTo(ringSize * 0.8, ringSize * 0.2); } ctx.arc(0, 0, ringSize, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            }
            if (enemy.traits.includes(EnemyTrait.SHIELDED) && !isFlashing) { ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI*2); ctx.stroke(); ctx.rotate(time * 0.002); ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI*1.5); ctx.stroke(); ctx.rotate(-time * 0.002); ctx.globalAlpha = 1.0; }
            if (!simplified && !isFlashing) { ctx.shadowColor = mainColor; ctx.shadowBlur = tier >= 4 ? 20 : 10; } ctx.fillStyle = mainColor;
            const drawShape = (size: number, shapeType: EnemyShape, rotation: number = 0) => {
                ctx.save(); ctx.rotate(rotation); ctx.beginPath();
                if (shapeType === EnemyShape.ORB) { ctx.arc(0, 0, size, 0, Math.PI * 2); }
                else if (shapeType === EnemyShape.BOX) { ctx.rect(-size*0.8, -size*0.8, size*1.6, size*1.6); }
                else if (shapeType === EnemyShape.CRYSTAL) { ctx.moveTo(0, -size); ctx.lineTo(size*0.7, 0); ctx.lineTo(0, size); ctx.lineTo(-size*0.7, 0); }
                else if (shapeType === EnemyShape.SPIKE) { for(let i=0; i<8; i++) { ctx.rotate(Math.PI/4); ctx.lineTo(0, i%2===0 ? size : size*0.4); } }
                else if (shapeType === EnemyShape.CORE) { ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, size*0.4, 0, Math.PI * 2); }
                else if (shapeType === EnemyShape.DIAMOND) { ctx.moveTo(0, -size*1.2); ctx.lineTo(size*0.8, 0); ctx.lineTo(0, size*1.2); ctx.lineTo(-size*0.8, 0); }
                else if (shapeType === EnemyShape.HEXAGON) { for(let i=0; i<6; i++) { ctx.rotate(Math.PI/3); ctx.lineTo(0, size); } }
                else if (shapeType === EnemyShape.VORTEX) { for(let i=0; i<4; i++) { ctx.rotate(Math.PI/2); ctx.moveTo(0,0); ctx.quadraticCurveTo(size, -size, size*1.2, 0); } ctx.stroke(); ctx.beginPath(); ctx.arc(0,0, size*0.3, 0, Math.PI*2); }
                ctx.closePath(); ctx.fill(); ctx.restore();
            };
            if (tier >= 2) { if (!simplified) ctx.globalAlpha = 0.7; drawShape(r, enemy.shape, time * 0.002); if (!simplified) ctx.globalAlpha = 1.0; ctx.fillStyle = (tier === 5 && !isFlashing) ? '#000' : '#000'; drawShape(r * 0.6, enemy.shape, -time * 0.002); ctx.fillStyle = (tier === 5 && !isFlashing) ? '#fff' : mainColor; drawShape(r * 0.4, enemy.shape, time * 0.005); } else { drawShape(r, enemy.shape); if (!simplified && !isFlashing) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-r/3, -r/3, r/3, 0, Math.PI*2); ctx.fill(); } }
            ctx.restore();
            const hpPct = Math.max(0, enemy.hp / enemy.maxHp); const barY = y - r - 12; const barW = 24 + (tier * 4); 
            ctx.fillStyle = '#111'; ctx.fillRect(x - barW/2, barY, barW, 4); if (enemy.traits.includes(EnemyTrait.SHIELDED)) ctx.fillStyle = '#60a5fa'; else ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444'; ctx.fillRect(x - barW/2, barY, barW * hpPct, 4);
            if (tier > 1) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.fillText(ROMAN_NUMERALS[tier] || '?', x + barW/2 + 4, barY + 4); }
        };

        const drawProjectile = (ctx: CanvasRenderingContext2D, type: TowerType, progress: number, startX: number, startY: number, endX: number, endY: number) => {
            if (type === TowerType.LASER) return; // Handled in drawTower3D

            const x = startX + (endX - startX) * progress;
            const y = startY + (endY - startY) * progress;
            const angle = Math.atan2(endY - startY, endX - startX);
            const color = TOWER_STATS[type].color;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);

            if (type === TowerType.PULSE || type === TowerType.BLASTER) {
                ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI*2); ctx.fill();
            } else if (type === TowerType.CRYO) {
                ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15;
                ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
            } else if (type === TowerType.PLASMA) {
                ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
            } else if (type === TowerType.ROCKET) {
                ctx.scale(1.5, 1.5);
                ctx.fillStyle = '#0891b2'; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-14, -6); ctx.lineTo(-14, 6); ctx.lineTo(-10, 4); ctx.fill();
                const grad = ctx.createLinearGradient(-10, -3, 6, 3); grad.addColorStop(0, '#06b6d4'); grad.addColorStop(0.5, '#cffafe'); grad.addColorStop(1, '#06b6d4');
                ctx.fillStyle = grad; ctx.fillRect(-10, -3, 16, 6);
                const headGrad = ctx.createLinearGradient(6, 0, 14, 0); headGrad.addColorStop(0, '#06b6d4'); headGrad.addColorStop(1, '#ecfeff'); 
                ctx.fillStyle = headGrad; ctx.beginPath(); ctx.moveTo(6, -3); ctx.bezierCurveTo(12, -4, 14, 0, 14, 0); ctx.bezierCurveTo(14, 0, 12, 4, 6, 3); ctx.fill();
            } else if (type === TowerType.BLACKHOLE) {
                ctx.fillStyle = '#000'; ctx.shadowColor = color; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
            } else if (type === TowerType.SIGMANATOR) {
                ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 25;
                ctx.fillRect(-10, -2, 20, 4);
                ctx.fillStyle = '#fff'; ctx.fillRect(-5, -1, 10, 2);
            } else if (type === TowerType.OSAPM) {
                ctx.scale(1.5, 1.5);
                ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-14, -6); ctx.lineTo(-14, 6); ctx.lineTo(-10, 4); ctx.fill();
                const grad = ctx.createLinearGradient(-10, -3, 6, 3); grad.addColorStop(0, '#ea580c'); grad.addColorStop(0.5, '#fed7aa'); grad.addColorStop(1, '#ea580c');
                ctx.fillStyle = grad; ctx.fillRect(-10, -3, 16, 6);
                const headGrad = ctx.createLinearGradient(6, 0, 14, 0); headGrad.addColorStop(0, '#ea580c'); headGrad.addColorStop(1, '#fff7ed'); 
                ctx.fillStyle = headGrad; ctx.beginPath(); ctx.moveTo(6, -3); ctx.bezierCurveTo(12, -4, 14, 0, 14, 0); ctx.bezierCurveTo(14, 0, 12, 4, 6, 3); ctx.fill();
            } else if (type === TowerType.EVERYMECH) {
                ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 5;
                ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
            }

            ctx.restore();
        };

        const render = (time: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const towerX = canvas.width / 4;
            const towerY = canvas.height / 2;
            const enemyX = canvas.width * 3 / 4;
            const enemyY = canvas.height / 2;

            let mechMode: 'MG' | 'SNIPER' | 'HAMMER' = 'MG';
            if (selectedTower === TowerType.EVERYMECH) {
                const cycle = Math.floor(time / 2000) % 3;
                if (cycle === 0) mechMode = 'MG';
                else if (cycle === 1) mechMode = 'SNIPER';
                else mechMode = 'HAMMER';
            }

            // Simulate firing
            const fireInterval = Math.max(stats.cooldown, 500); // At least 500ms for demo
            const lastFired = Math.floor(time / fireInterval) * fireInterval;
            const timeSinceFire = time - lastFired;

            const dummyTower: Tower = {
                id: 'demo',
                type: selectedTower,
                position: { x: towerX, y: towerY },
                level: 1,
                lastFired: lastFired,
                angle: 0,
                mechMode: mechMode,
                range: stats.range,
                damage: stats.damage,
                cooldown: stats.cooldown,
                targetId: 'dummy_enemy'
            };

            const dummyEnemy: Enemy = {
                id: 'dummy_enemy',
                position: { x: enemyX, y: enemyY },
                hp: 100,
                maxHp: 100,
                radius: 15,
                speed: 0,
                color: '#ef4444',
                tier: 1,
                shape: EnemyShape.ORB,
                traits: [],
                frozenFactor: 1,
                damageFlashTimer: timeSinceFire < 100 ? 100 : 0,
                stunTimer: 0,
                irradiatedTimer: 0,
                pathIndex: 0
            };

            // Draw Enemy
            drawProceduralEnemy(ctx, dummyEnemy, time, false);

            // Draw Projectile
            if (timeSinceFire < 200 && selectedTower !== TowerType.LASER) {
                const progress = timeSinceFire / 200;
                drawProjectile(ctx, selectedTower, progress, towerX, towerY, enemyX, enemyY);
            }

            // Draw Tower
            drawTower3D(ctx, dummyTower, time);

            requestRef.current = requestAnimationFrame(render);
        };

        requestRef.current = requestAnimationFrame(render);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [selectedTower]);

    return (
        <canvas 
            ref={canvasRef} 
            width={400} 
            height={200} 
            className="w-full h-full object-contain"
        />
    );
};

export default function ArmoryModal({ isOpen, onClose }: ArmoryModalProps) {
    const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);

    if (!isOpen) return null;

    const handleClose = () => {
        setSelectedTower(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#030712] font-mono select-none overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/20 blur-[120px] rounded-full"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0zOSAzOVYxaC0zOHYzOGgzOHoiIGZpbGw9IiMwNjA2MDYiIGZpbGwtb3BhY2l0eT0iMC41IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-20"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full w-full max-w-6xl mx-auto p-6">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 shadow-[0_0_15px_#a855f7]"></div>
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8 mt-4">
                    <div className="flex items-center gap-4">
                        {selectedTower ? (
                            <button onClick={() => setSelectedTower(null)} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                                <ChevronLeft size={20} /> Back to Grid
                            </button>
                        ) : (
                            <h2 className="text-4xl font-black text-white tracking-widest flex items-center gap-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                                <Package size={36} className="text-purple-400" /> ARMORY DATABANKS
                            </h2>
                        )}
                    </div>
                    <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                        <X size={20} /> Close Armory
                    </button>
                </div>
                
                {/* Content */}
                <div className="overflow-y-auto flex-grow pr-2 custom-scrollbar">
                    {!selectedTower ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pb-8">
                            {Object.entries(TOWER_STATS).map(([type, stats]) => (
                                <div 
                                    key={type} 
                                    onClick={() => setSelectedTower(type as TowerType)}
                                    className="bg-black/50 border border-white/5 hover:border-purple-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 group relative overflow-hidden shadow-lg"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 border border-white/10 transition-transform group-hover:scale-110" style={{ backgroundColor: `${stats.color}20`, boxShadow: `0 0 30px ${stats.color}20` }}>
                                        {getTowerIcon(type as TowerType, 40, "text-white")}
                                    </div>
                                    <h3 className="font-bold text-white text-center text-base mb-3">{stats.name}</h3>
                                    <span className={`text-[10px] px-3 py-1 rounded uppercase font-bold tracking-wider border ${
                                        stats.rarity === Rarity.LEGENDARY ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                                        stats.rarity === Rarity.EPIC ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' :
                                        stats.rarity === Rarity.RARE ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                                        'bg-zinc-500/20 text-zinc-400 border-zinc-500/50'
                                    }`}>
                                        {stats.rarity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-8 pb-8 h-full">
                            {/* Left Column: Demo Area */}
                            <div className="w-full lg:w-1/2 flex flex-col gap-6">
                                <div className="relative w-full h-64 sm:h-80 bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0zOSAzOVYxaC0zOHYzOGgzOHoiIGZpbGw9IiMwNjA2MDYiIGZpbGwtb3BhY2l0eT0iMC41IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-30"></div>
                                    
                                    <div className="relative z-10 w-full h-full">
                                        <DemoCanvas selectedTower={selectedTower} />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-zinc-900/80 border border-white/5 p-4 rounded-xl flex flex-col items-center shadow-inner">
                                        <span className="text-xs text-zinc-500 mb-1 tracking-widest">DAMAGE</span>
                                        <span className="text-2xl font-black text-white">{TOWER_STATS[selectedTower].damage}</span>
                                    </div>
                                    <div className="bg-zinc-900/80 border border-white/5 p-4 rounded-xl flex flex-col items-center shadow-inner">
                                        <span className="text-xs text-zinc-500 mb-1 tracking-widest">RANGE</span>
                                        <span className="text-2xl font-black text-white">{TOWER_STATS[selectedTower].range}</span>
                                    </div>
                                    <div className="bg-zinc-900/80 border border-white/5 p-4 rounded-xl flex flex-col items-center shadow-inner">
                                        <span className="text-xs text-zinc-500 mb-1 tracking-widest">COOLDOWN</span>
                                        <span className="text-2xl font-black text-white">{(TOWER_STATS[selectedTower].cooldown/1000).toFixed(1)}s</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Details */}
                            <div className="w-full lg:w-1/2 flex flex-col gap-6">
                                <div className="flex items-center gap-4 mb-2">
                                    <h3 className="text-4xl font-black text-white drop-shadow-md">{TOWER_STATS[selectedTower].name}</h3>
                                    <span className={`text-sm px-3 py-1 rounded uppercase font-bold tracking-wider border ${
                                        TOWER_STATS[selectedTower].rarity === Rarity.LEGENDARY ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                                        TOWER_STATS[selectedTower].rarity === Rarity.EPIC ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' :
                                        TOWER_STATS[selectedTower].rarity === Rarity.RARE ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                                        'bg-zinc-500/20 text-zinc-400 border-zinc-500/50'
                                    }`}>
                                        {TOWER_STATS[selectedTower].rarity}
                                    </span>
                                </div>

                                <div className="space-y-6 flex-grow">
                                    <div className="bg-black/40 border border-white/5 p-6 rounded-2xl shadow-lg">
                                        <h4 className="flex items-center gap-2 text-zinc-400 font-bold text-sm mb-3 uppercase tracking-widest">
                                            <Radio size={16} /> System Overview
                                        </h4>
                                        <p className="text-base text-zinc-300 leading-relaxed">{TOWER_STATS[selectedTower].desc}</p>
                                    </div>
                                    
                                    <div className="bg-blue-950/20 border border-blue-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                                        <h4 className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-3 uppercase tracking-widest relative z-10">
                                            <BookOpen size={16} /> Lore Archive
                                        </h4>
                                        <p className="text-sm text-blue-200/80 leading-relaxed italic relative z-10">"{TOWER_STATS[selectedTower].lore}"</p>
                                    </div>

                                    {TOWER_STATS[selectedTower].signature && (
                                        <div className="bg-orange-950/20 border border-orange-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full"></div>
                                            <h4 className="flex items-center gap-2 text-orange-500 font-bold text-sm mb-3 uppercase tracking-widest relative z-10">
                                                <Zap size={16} /> Signature: {TOWER_STATS[selectedTower].signature}
                                            </h4>
                                            <p className="text-sm text-orange-200/90 leading-relaxed relative z-10">{TOWER_STATS[selectedTower].signatureDesc}</p>
                                        </div>
                                    )}

                                    <div className="bg-yellow-950/20 border border-yellow-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full"></div>
                                        <h4 className="flex items-center gap-2 text-yellow-500 font-bold text-sm mb-3 uppercase tracking-widest relative z-10">
                                            <Lightbulb size={16} /> Tactical Advice
                                        </h4>
                                        <p className="text-sm text-yellow-200/90 leading-relaxed relative z-10">{TOWER_STATS[selectedTower].tips}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
