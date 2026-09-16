import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Brain, Sparkles } from 'lucide-react';
import { BIEngineDashboardV2 } from "./bi-engine-dashboard-v2";
import { ExtraStrategicIntelligence } from "./extra-strategic-intelligence";

interface BIEngineWrapperProps {
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
}

export function BIEngineWrapper({ formatCurrency, getCurrentPeriod }: BIEngineWrapperProps) {
  const [activeTab, setActiveTab] = useState('main-dashboard');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 bg-white shadow-md">
        <TabsTrigger 
          value="main-dashboard" 
          className="data-[state=active]:bg-[#2B7A78] data-[state=active]:text-white"
        >
          <Brain className="h-4 w-4 mr-2" />
          GymBios Strategic BI & Decision-Making Engine™
        </TabsTrigger>
        <TabsTrigger 
          value="extra-intelligence" 
          className="data-[state=active]:bg-[#E63946] data-[state=active]:text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Extra Strategic Intelligence
        </TabsTrigger>
      </TabsList>

      <TabsContent value="main-dashboard">
        <BIEngineDashboardV2 
          formatCurrency={formatCurrency}
          getCurrentPeriod={getCurrentPeriod}
        />
      </TabsContent>

      <TabsContent value="extra-intelligence">
        <ExtraStrategicIntelligence 
          formatCurrency={formatCurrency}
          getCurrentPeriod={getCurrentPeriod}
        />
      </TabsContent>
    </Tabs>
  );
}
