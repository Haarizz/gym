import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Shield } from 'lucide-react';
import { authService } from '../utils/supabase/auth-service';

export function DemoBanner() {
  try {
    // Only show if in demo mode
    if (!authService?.isDemoMode()) {
      return null;
    }

    return (
      <Alert className="mx-6 mt-4 bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <span className="font-medium">Demo Mode Active</span> - You're viewing sample data. 
          All features are fully functional with demonstration content.
        </AlertDescription>
      </Alert>
    );
  } catch (error) {
    console.error('Demo banner error:', error);
    return null;
  }
}