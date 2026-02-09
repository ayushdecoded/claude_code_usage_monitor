'use client';

import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [dots, setDots] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: i * 0.15,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `float 6s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
              opacity: Math.random() * 0.5 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="relative w-24 h-24">
            {/* Rotating outer ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-400"
              style={{
                animation: 'spin 3s linear infinite',
              }}
            />
            {/* Pulsing inner ring */}
            <div
              className="absolute inset-2 rounded-full border border-purple-400"
              style={{
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center text-3xl">
              📊
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Claude Usage Dashboard</h2>
          <p className="text-slate-400 text-sm">
            Loading your activity data
            {Array.from({ length: dots }).map((_, i) => (
              <span key={i}>.</span>
            ))}
          </p>
        </div>

        {/* Pulsing dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>

        {/* Loading items */}
        <div className="space-y-2 text-xs text-slate-500">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
            <span>Parsing sessions</span>
          </div>
          <div className="flex items-center justify-center gap-2" style={{ animationDelay: '0.2s' }}>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span>Computing metrics</span>
          </div>
          <div className="flex items-center justify-center gap-2" style={{ animationDelay: '0.4s' }}>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            <span>Organizing data</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
