import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick,
  interactive = false
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-white/10 backdrop-blur-xl 
        border border-white/20 
        shadow-lg shadow-black/10
        rounded-3xl
        transition-all duration-300
        group
        ${interactive ? 'active:scale-[0.98] cursor-pointer hover:bg-white/15' : ''}
        ${className}
      `}
    >
      {/* Shimmer Effect Overlay */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-0" />
      
      {/* Top Shine */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-0" />
      
      {/* Content Container */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};