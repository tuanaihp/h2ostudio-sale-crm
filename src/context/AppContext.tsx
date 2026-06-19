import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import { ConsultationProvider, useConsultations } from './ConsultationContext';
import { ContentProvider, useContent } from './ContentContext';
import { ToastProvider, useToast } from './ToastContext';

// ─── Composed provider ────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <SettingsProvider>
      <ToastProvider>
        <ConsultationProvider>
          <ContentProvider>
            {children}
          </ContentProvider>
        </ConsultationProvider>
      </ToastProvider>
    </SettingsProvider>
  </AuthProvider>
);

// ─── Unified hook — backward-compatible with all existing useApp() calls ──────

export const useApp = () => ({
  ...useAuth(),
  ...useSettings(),
  ...useConsultations(),
  ...useContent(),
  ...useToast(),
});

// Re-export individual hooks for direct usage
export { useAuth } from './AuthContext';
export { useSettings } from './SettingsContext';
export { useConsultations } from './ConsultationContext';
export { useContent } from './ContentContext';
export { useToast } from './ToastContext';
