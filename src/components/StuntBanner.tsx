import React, { useEffect, useState } from 'react';
import { StuntNotification } from '../game/types';

interface StuntBannerProps {
  notification: StuntNotification | null;
}

export const StuntBanner: React.FC<StuntBannerProps> = ({ notification }) => {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<StuntNotification | null>(null);

  useEffect(() => {
    if (notification) {
      setCurrent(notification);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!visible || !current) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-30 animate-in fade-in slide-in-from-top-6 zoom-in-90 duration-200">
      <div className="flex flex-col items-center px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-slate-950 rounded-2xl shadow-2xl border-2 border-yellow-200 shadow-orange-500/50">
        <div className="flex items-center gap-2 font-display font-extrabold text-xl sm:text-2xl text-slate-950 uppercase tracking-wide drop-shadow-sm">
          <span>🔥</span>
          <span>{current.text}</span>
        </div>
        {current.subtext && (
          <div className="text-xs font-bold text-yellow-950 mt-0.5 tracking-wide">
            {current.subtext}
          </div>
        )}
      </div>
    </div>
  );
};
