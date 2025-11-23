import React from 'react';
import { speak } from '../services/tts';

interface VoiceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  voiceLabel: string; // The text spoken when clicked
  variant?: 'primary' | 'secondary' | 'action' | 'icon' | 'card' | 'ghost';
  fullWidth?: boolean;
  customColorClass?: string; // For the specific card colors
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ 
  voiceLabel, 
  onClick, 
  children, 
  variant = 'primary', 
  className = '',
  fullWidth = false,
  customColorClass,
  ...props 
}) => {

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Priority: Speak first
    speak(voiceLabel);
    // Then execute action
    if (onClick) {
      onClick(e);
    }
  };

  // Improved visibility: font-black, tracking-wider, larger outlines
  const baseStyles = "transition-all active:scale-95 font-black tracking-wider flex items-center justify-center outline-none focus:ring-4 focus:ring-slate-400 select-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 rounded-2xl shadow-lg py-4 text-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1",
    secondary: "bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 rounded-2xl py-3 text-lg shadow-sm",
    action: "bg-green-600 text-white hover:bg-green-700 rounded-2xl shadow-lg py-4 text-xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1",
    icon: "p-3 text-slate-700 hover:bg-slate-100 rounded-full",
    ghost: "text-slate-600 hover:text-slate-900",
    // Card Variant for the Home Grid
    card: `flex-col aspect-square rounded-[2rem] shadow-md hover:shadow-xl border-2 transition-all ${customColorClass || 'bg-white border-slate-100 text-slate-800'}`
  };

  const widthClass = fullWidth ? "w-full" : "";

  const selectedVariantStyle = variants[variant];

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} ${selectedVariantStyle} ${widthClass} ${className}`}
      aria-label={voiceLabel}
      {...props}
    >
      {children}
    </button>
  );
};