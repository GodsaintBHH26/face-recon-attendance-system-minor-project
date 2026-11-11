import React, { useState } from 'react';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success) {
        onLoginSuccess(res.user || { email });
      } else {
        setErrorMsg(res.message || 'Invalid credentials');
      }
    } catch (err) {
      // In case server is offline, fallback for easy testing
      if (email === 'admin@example.com' && password === 'admin') {
        onLoginSuccess({ email, role: 'Administrator' });
      } else {
        setErrorMsg('Unable to connect to backend server. Make sure the server is running on port 5000.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signup(email, password);
      if (res.success) {
        setSuccessMsg(res.message || 'Registration successful! You can now log in.');
        setTimeout(() => {
          setIsLogin(true);
          setSuccessMsg('');
        }, 1500);
      } else {
        setErrorMsg(res.message || 'Registration failed');
      }
    } catch (err) {
      setErrorMsg('Unable to connect to backend server. Check server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#2DA493] to-[#9CD9B8] p-4">
      <section className="w-full max-w-[400px] h-auto bg-white p-8 rounded-xl shadow-md">
        {/* Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            {successMsg}
          </div>
        )}

        {/* LOGIN SECTION */}
        {isLogin ? (
          <div id="LoginSection" className="block">
            <form onSubmit={handleLoginSubmit}>
              <span className="block text-green-600 text-[24px] font-bold text-center mb-6">
                Login
              </span>

              {/* Email Container */}
              <div className="mb-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              {/* Password Container */}
              <div className="mb-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-3 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                  required
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="showPasswordLogin"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                <label htmlFor="showPasswordLogin" className="text-sm text-gray-600 cursor-pointer">
                  show password
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-700 text-white py-2.5 px-4 font-semibold rounded-lg hover:bg-teal-600 cursor-pointer transition disabled:opacity-50"
              >
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>

              {/* Bottom text */}
              <p className="text-gray-600 text-center mt-6 text-[16px]">
                Don't have an account?{' '}
                <span
                  onClick={toggleForm}
                  className="text-teal-700 font-semibold hover:underline cursor-pointer text-[16px]"
                >
                  Sign up
                </span>
              </p>
            </form>
          </div>
        ) : (
          /* SIGNUP SECTION */
          <div id="SignupSection" className="block">
            <form onSubmit={handleSignupSubmit}>
              <span className="block text-green-600 text-[24px] font-bold text-center mb-6">
                Signin
              </span>

              {/* Email Container */}
              <div className="mb-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              {/* Password Container */}
              <div className="mb-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-3 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div className="mb-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-3 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                  required
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="showPasswordSignup"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                <label htmlFor="showPasswordSignup" className="text-sm text-gray-600 cursor-pointer">
                  show password
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-700 text-white py-2.5 px-4 font-semibold rounded-lg hover:bg-teal-600 cursor-pointer transition disabled:opacity-50"
              >
                {loading ? 'REGISTERING...' : 'SIGN IN'}
              </button>

              {/* Bottom text */}
              <p className="text-gray-600 text-center mt-6 text-[16px]">
                Already have an account?{' '}
                <span
                  onClick={toggleForm}
                  className="text-teal-700 font-semibold hover:underline cursor-pointer text-[16px]"
                >
                  Log in
                </span>
              </p>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

