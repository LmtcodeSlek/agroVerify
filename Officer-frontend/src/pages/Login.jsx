import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useWallet from '../hooks/useWallet';

const Login = () => {
  const navigate = useNavigate();
  const { walletConnected, connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (walletConnected) {
      navigate('/app');
    }
  }, [walletConnected, navigate]);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await connectWallet();
    } catch (err) {
      setError(err?.message || 'Wallet connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scroll-content login-screen">
      <div className="login-card alt">
        <div className="login-badge">
          <div className="login-badge-logo">AF</div>
        </div>
        <h1>Officer Portal</h1>
        <p className="login-subtitle">Connect an authorized officer wallet to continue.</p>
        <div className="login-form compact">
          <button type="button" className="btn-full btn-green dark" disabled={loading} onClick={handleLogin}>
            {loading ? 'Connecting Wallet...' : 'Connect Wallet'}
          </button>
          {error ? <div className="form-error">{error}</div> : null}
        </div>
      </div>
      <div className="login-footer">Powered by AgriTrust smart contract</div>
    </div>
  );
};

export default Login;
