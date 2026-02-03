"use client";

import { useEffect, useRef } from "react";

export function ShaderBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext("webgl");
        if (!gl) return;

        // Shader sources - Subtle, premium "Aurora" style gradient
        const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

        const fsSource = `
      precision mediump float;
      uniform float time;
      uniform vec2 resolution;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        
        // Premium dark gradient background
        vec3 color = vec3(0.05, 0.08, 0.15); // Deep blue-black base
        
        // Slowly moving gradient orbs
        float t = time * 0.2;
        
        // Orb 1 (Blue-ish)
        vec2 p1 = vec2(0.5 + 0.3 * sin(t), 0.5 + 0.3 * cos(t * 0.8));
        float d1 = length(uv - p1);
        float glow1 = 0.4 / (d1 * 2.0 + 0.1);
        color += vec3(0.2, 0.4, 0.8) * glow1 * 0.15;
        
        // Orb 2 (Purple-ish)
        vec2 p2 = vec2(0.3 + 0.4 * cos(t * 1.2), 0.7 + 0.2 * sin(t * 0.9));
        float d2 = length(uv - p2);
        float glow2 = 0.4 / (d2 * 2.0 + 0.1);
        color += vec3(0.6, 0.2, 0.7) * glow2 * 0.15;
        
        // Orb 3 (Teal-ish)
        vec2 p3 = vec2(0.8 + 0.1 * sin(t * 0.5), 0.2 + 0.3 * cos(t * 0.7));
        float d3 = length(uv - p3);
        float glow3 = 0.4 / (d3 * 2.0 + 0.1);
        color += vec3(0.1, 0.6, 0.6) * glow3 * 0.15;

        // Subtle noise/grain could be added here if needed, but keeping it clean for now
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

        // Helper to compile shaders
        const compileShader = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fsSource);

        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        if (!program) return;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return;
        }

        gl.useProgram(program);

        // Set up full screen quad
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            1.0, 1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Uniforms
        const timeLocation = gl.getUniformLocation(program, "time");
        const resolutionLocation = gl.getUniformLocation(program, "resolution");

        let animationFrameId: number;
        let startTime = Date.now();

        const render = () => {
            const currentTime = (Date.now() - startTime) / 1000;
            gl.uniform1f(timeLocation, currentTime);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = window.innerWidth;
            const height = window.innerHeight;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        };

        // Initial sizing
        handleResize();
        window.addEventListener("resize", handleResize);

        // Start loop
        render();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);

            // Cleanup WebGL resources
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteBuffer(positionBuffer);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -10,
                pointerEvents: 'none'
            }}
        />
    );
}
