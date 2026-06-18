import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { Navigate } from 'react-router-dom';
import { Shield, Phone, LogIn } from 'lucide-react';
import { supabase } from '../supabase';

const AdminLogin: React.FC = () => {
  const { isAdmin, login, setUserPhone, settings, isAuthReady } = useApp();
  const [phoneInput, setPhoneInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthReady && isAdmin) {
    return <Navigate to="/admin/consultations" />;
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneInput.replace(/\D/g, '');

    if (cleanPhone.length < 9 || cleanPhone.length > 11) {
      setError('Số điện thoại không hợp lệ');
      return;
    }

    const authorizedPhones = ['0899252393', '0973685994', '0363234909', ...(settings.staffPhones || [])];

    if (!authorizedPhones.includes(cleanPhone)) {
      setError('Số điện thoại không có quyền truy cập Admin');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: 'staff@h2ostudio.com',
        password: 'H2oStudioStaff2026!',
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Tài khoản nhân viên chưa được tạo trong hệ thống. Vui lòng liên hệ Admin để tạo tài khoản staff@h2ostudio.com trong Supabase Dashboard → Authentication → Users.');
        } else {
          setError(`Lỗi đăng nhập: ${signInError.message}`);
        }
        setIsLoading(false);
        return;
      }

      setUserPhone(cleanPhone);
    } catch (err: any) {
      setError(`Lỗi hệ thống: ${err.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Đăng nhập Admin">
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-light-gray max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-dark">Đăng nhập Quản trị</h1>
            <p className="text-dark/60 text-sm mt-2">Dành cho nhân viên và quản lý hệ thống</p>
          </div>

          <form onSubmit={handlePhoneLogin} className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-bold text-dark mb-2">Số điện thoại nhân viên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone size={20} className="text-dark/40" />
                </div>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => { setPhoneInput(e.target.value); setError(''); }}
                  placeholder="Nhập số điện thoại..."
                  className="w-full pl-12 pr-4 py-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              {isLoading ? 'Đang đăng nhập...' : 'Vào hệ thống'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-light-gray" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-dark/40">Hoặc dành cho Quản lý</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={login}
              type="button"
              className="w-full py-3 bg-white border border-light-gray text-dark font-bold rounded-xl hover:bg-light-gray/50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Đăng nhập bằng Google
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLogin;
