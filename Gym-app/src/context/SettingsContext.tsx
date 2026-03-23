import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getThemeColors } from "../theme";

export type AppSettings = {
  darkMode: boolean;
  notifications: boolean;
  sound: boolean;
  emailUpdates: boolean;
  classReminders: boolean;
  privateProfile: boolean;
};

const STORAGE_KEY = "gymbios.settings";

const defaultSettings: AppSettings = {
  darkMode: false,
  notifications: true,
  sound: true,
  emailUpdates: true,
  classReminders: true,
  privateProfile: false,
};

type SettingsContextValue = {
  settings: AppSettings;
  colors: ReturnType<typeof getThemeColors>;
  isLoaded: boolean;
  saveSettings: (next: AppSettings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings({ ...defaultSettings, ...JSON.parse(stored) });
        }
      } catch (error) {
        console.warn("Failed to load settings", error);
      } finally {
        setIsLoaded(true);
      }
    };

    load();
  }, []);

  const saveSettings = async (next: AppSettings) => {
    setSettings(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn("Failed to save settings", error);
    }
  };

  const colors = useMemo(() => getThemeColors(settings.darkMode), [settings.darkMode]);

  return (
    <SettingsContext.Provider value={{ settings, colors, isLoaded, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
