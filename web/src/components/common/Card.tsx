import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 transition-all ${
      onClick ? 'cursor-pointer hover:border-brand-teal/40 hover:shadow-md' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export default Card;
