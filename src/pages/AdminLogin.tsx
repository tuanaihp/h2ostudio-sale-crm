import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { Navigate } from 'react-router-dom';
import { Shield, LogIn, Mail, Lock } from 'lucide-react';
import { supabase } from '../supabase';

const AdminLogin: React.FC = () => {
  const { isAdmin, login, isAuthReady } = useApp();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthReady && isAdmin) {
    return <Navigate to="/admin/consultations" />;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setIsLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password: passwordInput,
    });
    if (err) {
      setError(err.message.includes('Invalid login') ? 'Email hoặc mật khẩu không đúng' : err.message);
    }
    setIsLoading(false);
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

          <button
            type="button"
            onClick={login}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            Đăng nhập bằng Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-light-gray" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-dark/40">Hoặc bằng email</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-dark/40" />
              </div>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setError(''); }}
                placeholder="Email nhân viên..."
                className="w-full pl-11 pr-4 py-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-dark/40" />
              </div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setError(''); }}
                placeholder="Mật khẩu..."
                className="w-full pl-11 pr-4 py-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || !emailInput || !passwordInput}
              className="w-full py-3 bg-dark text-white font-bold rounded-xl hover:bg-dark/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập bằng Email'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLogin;
