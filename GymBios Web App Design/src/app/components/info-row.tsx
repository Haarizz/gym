import React from 'react';

interface InfoRowProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  className?: string;
}

export function InfoRow({ label, value, icon, className = '' }: InfoRowProps) {
  const displayValue = value && value.trim() !== '' ? value : 'Not provided';
  const isProvided = value && value.trim() !== '';

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center space-x-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <label className="text-sm text-muted-foreground">{label}</label>
      </div>
      <p className={`text-sm ${isProvided ? 'text-slateText' : 'text-muted-foreground italic'}`}>
        {displayValue}
      </p>
    </div>
  );
}
