import React, { useEffect, useRef } from 'react';
import { ServoType } from '../types';
import { SERVO_STATS } from '../constants';

interface DemoServoCanvasProps {
    selectedServo: ServoType;
}

const DemoServoCanvas: React.FC<DemoServoCanvasProps> = ({ selectedServo }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawServo3D = (ctx: CanvasRenderingContext2D, servo: any, time: number) => {
            const { x, y } = servo.position;
            const stats = servo.data.stats;
            const timeSinceFire = time - servo.lastFired;
            
            ctx.save();
            ctx.translate(x, y);
            
            // --- Mech Scale & Global Animations ---
            const scale = 3.2;
            ctx.scale(scale, scale);
            
            const isShooting = timeSinceFire < 250;
            const recoilT = isShooting ? timeSinceFire / 250 : 1;
            const recoilKick = isShooting ? Math.pow(1 - recoilT, 2) : 0;
            
            const hover = Math.sin(time * 0.003) * 1.5 - 5;
            const mechBreathe = Math.sin(time * 0.004) * 0.5;
            const coatFlutter = Math.sin(time * 0.005) * 2;
            
            ctx.translate(0, hover);

            let aimAngle = servo.angle || 0;

            const isFacingLeft = Math.abs(aimAngle) > Math.PI / 2;
            if (isFacingLeft) {
                ctx.scale(-1, 1);
                aimAngle = Math.PI - aimAngle;
            }

            // Colors
            const cArmorDark = '#09090b';
            const cArmorMid = '#18181b';
            const cArmorLight = '#27272a';
            const cArmorHighlight = '#3f3f46';
            const cWhite = '#f8fafc';
            const cPurple = stats.color || '#a855f7';
            const cPurpleGlow = stats.color || '#d8b4fe';

            const applyGlow = (blur: number, color: string = cPurpleGlow) => {
                ctx.shadowColor = color;
                ctx.shadowBlur = blur;
            };
            const clearGlow = () => { ctx.shadowBlur = 0; };

            // Helper to draw polygons for mechanical look
            const drawPoly = (points: number[][], fill: string, stroke?: string, lineW: number = 0.5) => {
                ctx.fillStyle = fill;
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                for(let i=1; i<points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
                ctx.closePath();
                ctx.fill();
                if (stroke) {
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = lineW;
                    ctx.stroke();
                }
            };

            // --- Mechanical Tailcoat (Back Plates) ---
            for (let i = 0; i < 3; i++) {
                const offsetY = 10 + i * 8;
                const spread = 12 + i * 4 + coatFlutter * (i+1) * 0.5;
                drawPoly([[-5, offsetY], [-spread, offsetY + 15], [-spread + 4, offsetY + 20], [-2, offsetY + 10]], cArmorMid, cArmorHighlight);
                drawPoly([[5, offsetY], [spread, offsetY + 15], [spread - 4, offsetY + 20], [2, offsetY + 10]], cArmorMid, cArmorHighlight);
                applyGlow(5);
                drawPoly([[-spread+2, offsetY+16], [-spread+4, offsetY+18], [-4, offsetY+10]], cPurple);
                drawPoly([[spread-2, offsetY+16], [spread-4, offsetY+18], [4, offsetY+10]], cPurple);
                clearGlow();
            }

            // --- Legs (Hydraulic & Angular) ---
            drawPoly([[-4, 10], [-12, 10], [-14, 22], [-6, 25]], cArmorDark, cArmorHighlight);
            applyGlow(5); ctx.fillStyle = cPurple; ctx.beginPath(); ctx.arc(-10, 24, 2, 0, Math.PI*2); ctx.fill(); clearGlow();
            drawPoly([[-6, 25], [-14, 22], [-12, 38], [-4, 40]], cArmorMid, cArmorHighlight);
            drawPoly([[-4, 40], [-12, 38], [-16, 43], [-2, 43]], cArmorDark, cWhite);

            drawPoly([[4, 10], [12, 10], [14, 22], [6, 25]], cArmorDark, cArmorHighlight);
            applyGlow(5); ctx.fillStyle = cPurple; ctx.beginPath(); ctx.arc(10, 24, 2, 0, Math.PI*2); ctx.fill(); clearGlow();
            drawPoly([[6, 25], [14, 22], [12, 38], [4, 40]], cArmorMid, cArmorHighlight);
            drawPoly([[4, 40], [12, 38], [16, 43], [2, 43]], cArmorDark, cWhite);

            // --- Torso (Muscular Mech V-Shape) ---
            ctx.fillStyle = '#52525b';
            ctx.fillRect(-4, 0, 2, 10);
            ctx.fillRect(2, 0, 2, 10);
            
            drawPoly([[0, 5], [-16, -10 - mechBreathe], [-10, -16 - mechBreathe], [10, -16 - mechBreathe], [16, -10 - mechBreathe]], cArmorMid, cArmorHighlight);
            drawPoly([[0, 2], [-10, -10 - mechBreathe], [-6, -14 - mechBreathe], [6, -14 - mechBreathe], [10, -10 - mechBreathe]], cWhite, cArmorLight);

            applyGlow(20);
            ctx.fillStyle = cPurpleGlow;
            ctx.beginPath();
            ctx.moveTo(0, -10 - mechBreathe);
            ctx.lineTo(-4, -4 - mechBreathe);
            ctx.lineTo(0, 2 - mechBreathe);
            ctx.lineTo(4, -4 - mechBreathe);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -4 - mechBreathe, 1.5, 0, Math.PI*2);
            ctx.fill();
            clearGlow();

            drawPoly([[-6, -16 - mechBreathe], [6, -16 - mechBreathe], [4, -20 - mechBreathe], [-4, -20 - mechBreathe]], cArmorDark, cArmorHighlight);

            // --- Head & Tophat (Sensor Array) ---
            ctx.save();
            ctx.translate(0, -20 - mechBreathe);
            
            drawPoly([[-5, 0], [5, 0], [7, -8], [-7, -8]], cArmorMid, cArmorHighlight);
            
            applyGlow(15);
            ctx.fillStyle = cPurpleGlow;
            ctx.beginPath();
            ctx.moveTo(-8, -6);
            ctx.lineTo(0, -3);
            ctx.lineTo(8, -6);
            ctx.lineTo(0, -5);
            ctx.fill();
            clearGlow();

            // Tophat (Armored Crown)
            ctx.save();
            drawPoly([[-14, -8], [14, -8], [12, -11], [-12, -11]], cArmorDark, cWhite);
            drawPoly([[-10, -11], [10, -11], [8, -25], [-8, -25]], cArmorMid, cArmorHighlight);
            drawPoly([[-9, -25], [9, -25], [10, -27], [-10, -27]], cArmorDark, cWhite);
            
            applyGlow(10);
            ctx.fillStyle = cPurple;
            drawPoly([[-9.5, -12], [9.5, -12], [9, -15], [-9, -15]], cPurple);
            clearGlow();
            
            ctx.restore(); // End hat save
            clearGlow();

            ctx.restore(); // End head save

            // --- Left Arm (Posed, Hydraulic) ---
            drawPoly([[-14, -16 - mechBreathe], [-22, -12 - mechBreathe], [-18, -6 - mechBreathe]], cArmorDark, cWhite);
            drawPoly([[-16, -10 - mechBreathe], [-20, 0], [-16, 2]], cArmorMid, cArmorHighlight);
            drawPoly([[-20, 0], [-14, 12], [-10, 10]], cArmorLight, cArmorHighlight);
            applyGlow(5); ctx.fillStyle = cPurple; ctx.beginPath(); ctx.arc(-18, 1, 1.5, 0, Math.PI*2); ctx.fill(); clearGlow();

            // --- Right Arm & Alien Tech Railgun ---
            ctx.save();
            ctx.translate(14, -12 - mechBreathe);
            
            const recoilRotation = isShooting ? -(recoilKick * 0.8) : 0;
            ctx.rotate(aimAngle + recoilRotation);
            
            const armSlide = isShooting ? -(recoilKick * 4) : 0;
            ctx.translate(armSlide, 0);

            drawPoly([[-2, -4], [6, -4], [8, 2], [0, 2]], cArmorDark, cWhite);
            drawPoly([[0, 0], [10, -2], [10, 4], [0, 4]], cArmorMid, cArmorHighlight);
            applyGlow(5); ctx.fillStyle = cPurple; ctx.beginPath(); ctx.arc(10, 1, 1.5, 0, Math.PI*2); ctx.fill(); clearGlow();
            drawPoly([[10, -2], [20, -2], [20, 4], [10, 4]], cArmorLight, cArmorHighlight);

            ctx.translate(20, 1);
            
            ctx.fillStyle = cArmorDark;
            ctx.beginPath();
            ctx.roundRect(0, -2, 4, 5, 1);
            ctx.fill();
            ctx.strokeStyle = cWhite;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // --- Ultra-Detailed Alien Tech Railgun Pistol ---
            ctx.translate(2, -4); 
            
            drawPoly([[-1, 2], [3, 2], [2, 8], [-2, 8]], cArmorMid, cArmorHighlight);
            drawPoly([[-4, -4], [12, -5], [16, -2], [16, 2], [12, 4], [-4, 4]], cArmorDark, cArmorHighlight);
            
            const railOffset = recoilKick * 6;
            drawPoly([[12 - railOffset, -6], [28 - railOffset, -6], [30 - railOffset, -3], [14 - railOffset, -3]], cArmorMid, cWhite);
            drawPoly([[12 - railOffset, 3], [28 - railOffset, 3], [30 - railOffset, 0], [14 - railOffset, 0]], cArmorMid, cWhite);

            applyGlow(isShooting ? 25 : 10, cPurpleGlow);
            
            ctx.fillStyle = cPurple;
            ctx.fillRect(14, -2, 14, 3);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(16, -1, 10, 1);

            if (isShooting && recoilKick > 0.1) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${recoilKick})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(14, -2);
                ctx.lineTo(20 + Math.random()*4, -4 + Math.random()*2);
                ctx.lineTo(28, -1);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(14, 1);
                ctx.lineTo(20 + Math.random()*4, 2 + Math.random()*2);
                ctx.lineTo(28, 0);
                ctx.stroke();

                ctx.fillStyle = `rgba(216, 180, 254, ${recoilKick})`;
                ctx.beginPath();
                ctx.arc(32 - railOffset, -0.5, (4 + Math.random() * 4) * recoilKick, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = `rgba(255, 255, 255, ${recoilKick})`;
                ctx.beginPath();
                ctx.arc(32 - railOffset, -0.5, (2 + Math.random() * 2) * recoilKick, 0, Math.PI*2);
                ctx.fill();
            }
            clearGlow();

            ctx.fillStyle = cWhite;
            ctx.fillRect(4, -2, 4, 1);
            ctx.fillRect(4, 2, 4, 1);
            ctx.fillStyle = cPurple;
            ctx.fillRect(8, 0, 2, 2);

            ctx.restore(); // End Right Arm & Gun
            ctx.restore(); // End Mech
        };

        const render = (time: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2 + 20;

            const mockServo = {
                position: { x: cx, y: cy },
                data: { stats: SERVO_STATS[selectedServo] },
                lastFired: 0,
                angle: Math.sin(time * 0.001) * 0.2,
                castingSkill: null,
                castingEndTime: 0
            };

            drawServo3D(ctx, mockServo, time);

            requestRef.current = requestAnimationFrame(render);
        };

        requestRef.current = requestAnimationFrame(render);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [selectedServo]);

    return (
        <canvas 
            ref={canvasRef} 
            width={600} 
            height={600} 
            className="w-full h-full object-contain"
        />
    );
};

export default DemoServoCanvas;
