import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { authService } from '../../utils/supabase/auth-service';

export function SystemStatus() {
  const [status, setStatus] = useState<'online' | 'offline' | 'demo'>('online');

  useEffect(() => {
    const checkStatus = () => {
      try {
        if (authService.isDemoMode()) {
          setStatus('demo');
        } else if (navigator.onLine) {
          setStatus('online');
        } else {
          setStatus('offline');
        }
      } catch (error) {
        console.error('Status check error:', error);
        setStatus('offline');
      }
    };

    checkStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      clearInterval(interval);
    };
  }, []);

  const getStatusInfo = () => {
    switch (status) {
      case 'demo':
        return {
          icon: AlertTriangle,
          text: 'Demo',
          variant: 'secondary' as const,
          color: 'text-blue-600'
        };
      case 'online':
        return {
          icon: Wifi,
          text: 'Online',
          variant: 'default' as const,
          color: 'text-green-600'
        };
      case 'offline':
        return {
          icon: WifiOff,
          text: 'Offline',
          variant: 'destructive' as const,
          color: 'text-red-600'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  return (
    <Badge variant={statusInfo.variant} className="text-xs">
      <IconComponent className={`h-3 w-3 mr-1 ${statusInfo.color}`} />
      {statusInfo.text}
    </Badge>
  );
}

