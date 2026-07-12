import React, { useState } from 'react';
import { apiClient } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

const EyeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('admin@ghazanfar.com');
  const [password, setPassword] = useState('admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.login({ email, password });
      localStorage.setItem('auth_token', response.access_token);
      onLoginSuccess(response.access_token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1>📦 Ghazanfar ERP</h1>
          <p>Warehouse Management System</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@ghazanfar.com"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                placeholder="admin@123"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? EyeOffIcon : EyeIcon}
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.info}>
          <h4>Demo Credentials:</h4>
          <code style={styles.code}>
            Email: admin@ghazanfar.com<br />
            Password: admin@123
          </code>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontWeight: 600,
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  passwordWrap: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    padding: '12px',
    paddingRight: '44px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    background: 'none',
    border: 'none',
    borderRadius: '4px',
    color: '#888',
    cursor: 'pointer',
    lineHeight: 0,
  },
  button: {
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '10px',
  },
  error: {
    color: '#e74c3c',
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '10px',
    background: '#fadbd8',
    borderRadius: '5px',
  },
  info: {
    marginTop: '20px',
    padding: '15px',
    background: '#f5f5f5',
    borderRadius: '5px',
    fontSize: '12px',
  },
  code: {
    display: 'block' as const,
    marginTop: '10px',
    fontFamily: 'monospace',
    background: '#fff',
    padding: '10px',
    borderRadius: '3px',
    color: '#333',
  },
};
