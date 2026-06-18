import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  staffPhones: ['0899252393', '0973685994', '0363234909'],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'global')
        .maybeSingle();
      if (data?.data) setSettings(data.data as AppSettings);
    };
    loadSettings();

    const channel = supabase.channel('settings-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'settings', filter: 'id=eq.global',
      }, () => loadSettings())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await supabase.from('settings').upsert({
      id: 'global',
      data: merged,
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
