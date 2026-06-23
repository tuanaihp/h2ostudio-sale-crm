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

export const useApp = () => {
  const auth = useAuth();
  const settingsCtx = useSettings();
  const consultations = useConsultations();
  const content = useContent();
  const toast = useToast();

  // isAdmin: ngoài HARDCODED_STAFF_PHONES, còn check settings.staffPhones từ Supabase
  // Yêu cầu user phải đã Supabase-authenticated (auth.user !== null) để tránh PhoneGate bypass
  const staffPhones = settingsCtx.settings?.staffPhones || [];
  const isAdmin = auth.isAdmin ||
    (auth.user !== null && auth.checkPhoneInWhitelist(auth.userPhone, staffPhones));

  return {
    ...auth,
    ...settingsCtx,
    ...consultations,
    ...content,
    ...toast,
    isAdmin,
  };
};

// Re-export individual hooks for direct usage
export { useAuth } from './AuthContext';
export { useSettings } from './SettingsContext';
export { useConsultations } from './ConsultationContext';
export { useContent } from './ContentContext';
export { useToast } from './ToastContext';
