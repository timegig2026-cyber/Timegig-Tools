import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Wait for fade out animation
    }, 1000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950 flex items-center justify-center overflow-hidden animate-out fade-out duration-500 fill-mode-forwards">
      {/* Blurry Map Background Wallpaper */}
      <div 
        className="absolute inset-0 opacity-40 blur-xl scale-110"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=2000")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 text-center space-y-4 animate-in zoom-in-95 duration-700">
        <h1 className="text-6xl sm:text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
          TimeGiG
        </h1>
        <div className="flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white animate-progress w-full origin-left" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 1s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};
