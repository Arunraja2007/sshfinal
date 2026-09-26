import React, { useState } from 'react';
import { Activity, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Search, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import demoAccounts from '../data/demoAccounts.json';

interface LoginPageProps {
  onLoginSuccess?: (redirectUrl: string) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'agencies' | 'mps'>('admin');
  const [mpSearch, setMpSearch] = useState('');
  const { login, isLoading, authError } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both Email and Password.');
      return;
    }

    const res = await login(email, password);
    if (res.success && res.redirectUrl) {
      if (onLoginSuccess) {
        onLoginSuccess(res.redirectUrl);
      } else {
        window.history.pushState({}, '', res.redirectUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const handleSelectDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLocalError(null);
  };

  const adminRoles = demoAccounts.filter(a => a.role !== 'MP' && a.role !== 'IMPLEMENTING_AGENCY');
  const agencyRoles = demoAccounts.filter(a => a.role === 'IMPLEMENTING_AGENCY');
  const mpRoles = demoAccounts.filter(a => a.role === 'MP');
  const filteredMpRoles = mpRoles.filter(a => {
    if (!mpSearch.trim()) return true;
    const q = mpSearch.toLowerCase().trim();
    return (
      (a.constituency && a.constituency.toLowerCase().includes(q)) ||
      (a.state && a.state.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.name && a.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#f6faff] flex flex-col justify-between font-sans">
      {/* Top Banner */}
      <header className="bg-white border-b border-[#E9ECEF] px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#00204a] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#000a1f] leading-none tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              MPLADS SENTINEL
            </h1>
            <p className="text-[10px] text-[#44474f] leading-none mt-0.5">
              AI-Powered MPLADS Risk & Anomaly Intelligence Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#747780] font-mono bg-[#F8F9FA] px-3 py-1.5 rounded border border-[#E9ECEF]">
          <ShieldCheck size={13} className="text-[#198754]" />
          <span>Encrypted Gateway · Supabase Auth</span>
        </div>
      </header>

      {/* Main Login Form & Demo Selector */}
      <main className="flex-1 flex items-center justify-center p-6 my-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Credentials Form */}
          <div className="md:col-span-6 bg-white border border-[#E9ECEF] rounded-sm p-8 shadow-[0_8px_30px_rgba(0,10,31,0.06)] space-y-6">
            <div>
              <span className="text-[10px] font-bold text-[#00204a] tracking-widest uppercase bg-[#EEF2F6] px-2.5 py-1 rounded-sm border border-[#D5DCE4]">
                Authorized Access
              </span>
              <h2 className="text-xl font-bold text-[#000a1f] mt-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Officer & Member Login
              </h2>
              <p className="text-xs text-[#747780] mt-1">
                Enter your authorized application identifier and credentials to access your designated command portal.
              </p>
            </div>

            {(authError || localError) && (
              <div className="p-3 bg-[#FFF5F5] border border-[#FFD8D8] rounded-sm text-[#DC3545] text-xs flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{localError || authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#000a1f] uppercase tracking-wider mb-1.5">
                  Authorized Identifier / Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-3 text-[#747780]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@mplads-demo.local"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#CED4DA] rounded-sm focus:border-[#00204a] focus:ring-1 focus:ring-[#00204a] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000a1f] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-3 text-[#747780]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-[#CED4DA] rounded-sm focus:border-[#00204a] focus:ring-1 focus:ring-[#00204a] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-[#747780] hover:text-[#00204a] p-0.5 rounded focus:outline-none cursor-pointer transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-2.5 text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isLoading ? (
                  <span>Verifying Credentials…</span>
                ) : (
                  <>
                    <span>Sign In to Secure Portal</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-[#E9ECEF] text-[10px] text-[#747780] leading-relaxed">
              <p>
                <strong>Security Notice:</strong> Role and data scopes are enforced via Supabase Row-Level Security (RLS) and backend authentication middleware.
              </p>
            </div>
          </div>

          {/* Quick Demo Credentials Assistant */}
          <div className="md:col-span-6 bg-white border border-[#E9ECEF] rounded-sm p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-[#00204a]" />
                <h3 className="text-xs font-bold text-[#000a1f] uppercase tracking-wider">
                  Prototype Demo Credentials
                </h3>
              </div>
              <span className="text-[9px] font-mono bg-[#E7F5FF] text-[#0066CC] px-2 py-0.5 rounded border border-[#BCE1FF]">
                SIH Prototype Only
              </span>
            </div>

            <p className="text-[11px] text-[#44474f] leading-snug">
              Select any role below to pre-populate credentials. For Lok Sabha MPs, credentials use Constituency Name:{' '}
              <code className="bg-[#F8F9FA] px-1 py-0.5 rounded border border-[#E9ECEF] font-mono text-[#00204a]">
                mp.&lt;constituency&gt;@mplads-demo.local
              </code>{' '}
              with password <code className="bg-[#F8F9FA] px-1 py-0.5 rounded border border-[#E9ECEF] font-mono text-[#00204a]">Mplads@123</code>.
            </p>

            {/* Toggle Tabs */}
            <div className="flex border border-[#E9ECEF] rounded-sm p-0.5 bg-[#F8F9FA] gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex-1 py-1.5 px-1 text-[11px] font-semibold rounded-sm transition-colors text-center ${
                  activeTab === 'admin' ? 'bg-white text-[#00204a] shadow-xs' : 'text-[#747780] hover:text-[#000a1f]'
                }`}
              >
                Officers &amp; Admin
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('agencies')}
                className={`flex-1 py-1.5 px-1 text-[11px] font-semibold rounded-sm transition-colors text-center ${
                  activeTab === 'agencies' ? 'bg-white text-[#00204a] shadow-xs' : 'text-[#747780] hover:text-[#000a1f]'
                }`}
              >
                Implementing Agencies
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mps')}
                className={`flex-1 py-1.5 px-1 text-[11px] font-semibold rounded-sm transition-colors text-center ${
                  activeTab === 'mps' ? 'bg-white text-[#00204a] shadow-xs' : 'text-[#747780] hover:text-[#000a1f]'
                }`}
              >
                Hon'ble MPs
              </button>
            </div>

            {/* Constituency Search (when on MPs tab) */}
            {activeTab === 'mps' && (
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-[#747780]" />
                <input
                  type="text"
                  placeholder="Search by constituency or state (e.g. Puri, Varanasi, Kalyan, Badaun)..."
                  value={mpSearch}
                  onChange={(e) => setMpSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CED4DA] rounded-sm focus:border-[#00204a] outline-none"
                />
              </div>
            )}

            {/* Account List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {((activeTab === 'admin' ? adminRoles : activeTab === 'agencies' ? agencyRoles : filteredMpRoles)).length === 0 ? (
                <div className="text-center py-6 text-xs text-[#747780]">
                  {activeTab === 'mps' ? `No parliamentary constituency matching "${mpSearch}".` : 'No accounts available.'}
                </div>
              ) : (
                ((activeTab === 'admin' ? adminRoles : activeTab === 'agencies' ? agencyRoles : filteredMpRoles)).slice(0, 100).map((acc: any, i) => {
                  const isSelected = email === acc.email;
                  return (
                    <div
                      key={i}
                      onClick={() => handleSelectDemo(acc.email, acc.passwordFormat)}
                      className={`p-3 rounded-sm border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#00204a] bg-[#F0F4F8] shadow-xs'
                          : 'border-[#E9ECEF] hover:border-[#CED4DA] hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#00204a] uppercase tracking-wider">
                          {acc.constituency ? `Constituency: ${acc.constituency}` : acc.role.replace(/_/g, ' ')}
                        </span>
                        {acc.house && (
                          <span className="text-[9px] font-semibold text-[#44474f] bg-white px-1.5 py-0.5 rounded border border-[#E9ECEF]">
                            {acc.house}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-[#000a1f]">{acc.name}</div>
                      <div className="text-[11px] text-[#747780] mt-0.5">{acc.scope}</div>
                      <div className="mt-2 pt-1.5 border-t border-[#E9ECEF]/60 flex items-center justify-between text-[10px] font-mono text-[#44474f]">
                        <span>{acc.email}</span>
                        <span className="text-[#0066CC] font-bold">Use Credentials →</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E9ECEF] px-8 py-3 text-center text-[10px] text-[#747780]">
        MPLADS Sentinel · AI-Powered Risk & Anomaly Intelligence Platform · Multi-Role Oversight Portal
      </footer>
    </div>
  );
}
