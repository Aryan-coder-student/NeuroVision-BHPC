import React, { useState, useEffect } from 'react';
import { loginUser, logoutUser, fetchWorkspaces, fetchUserProfile, fetchCurrentWorkspace, createWorkspace as apiCreateWorkspace, setTenantDomain } from '../services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [org, setOrg]           = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [authError, setAuthError] = useState('');

  // Trust the backend, not a saved user object, to establish a session.
  useEffect(() => {
    let cancelled = false;
    const initializeAuth = async () => {
      try {
        const profile = await fetchUserProfile();
        if (cancelled || !profile.user) return;
        const verifiedUser = {
          ...profile.user,
          name: profile.user.first_name || profile.user.email.split('@')[0],
          role: 'Professional'
        };
        setUser(verifiedUser);

        const stored = sessionStorage.getItem('nv_session');
        if (stored) {
          try {
            const { org: savedOrg } = JSON.parse(stored);
            if (savedOrg) {
              const verified = await fetchCurrentWorkspace(savedOrg.id);
              if (!cancelled) setOrg(verified);
            }
          } catch {
            setOrg(null);
            sessionStorage.removeItem('nv_session');
          }
        }
        try {
          const list = await fetchWorkspaces();
          if (!cancelled) {
            setWorkspaces(Array.isArray(list) ? list : list.results || []);
            // Don't trust a workspace from storage if the backend no longer grants access.
            if (stored) {
              const saved = JSON.parse(stored);
              if (saved.org && !(Array.isArray(list) ? list : list.results || []).some(ws => ws.id === saved.org.id)) {
                setOrg(null);
                sessionStorage.removeItem('nv_session');
              }
            }
          }
        } catch (err) {
          console.error('Workspace lookup failed', err);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setOrg(null);
          setWorkspaces([]);
          sessionStorage.removeItem('nv_session');
          setTenantDomain(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    initializeAuth();
    return () => { cancelled = true; };
  }, []);

  const refreshWorkspaces = async () => {
    try {
      const data = await fetchWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
    }
  };

  const login = async (email, password) => {
    setAuthError('');
    try {
      const response = await loginUser({ email, password });
      
      const userProfile = {
        ...response.user,
        name: response.user.first_name || email.split('@')[0],
        role: 'Professional'
      };
      
      setTenantDomain(null);
      sessionStorage.removeItem('nv_session');
      setOrg(null);
      setUser(userProfile);
      await refreshWorkspaces();
      return { success: true };
    } catch (err) {
      console.error('Login failed', err);
      const data = err.response?.data;
      const errorCode = Array.isArray(data?.error) ? data.error[0] : data?.error;
      const errorEmail = Array.isArray(data?.email) ? data.email[0] : data?.email;
      
      if (errorCode === 'OTP_NOT_VERIFIED') {
        return { success: false, reason: 'OTP_NOT_VERIFIED', email: errorEmail || email };
      }
      
      setAuthError(err.response?.status === 403 ? 'Session or CSRF check failed. Refresh and try again.' : (err.response?.status === 400 ? 'Invalid email or password.' : 'Unable to sign in. Please try again.'));
      return { success: false };
    }
  };

  const restoreSession = async () => {
    const profile = await fetchUserProfile();
    if (!profile.user) throw new Error('Could not restore verified session');
    const verifiedUser = {
      ...profile.user,
      name: profile.user.first_name || profile.user.email.split('@')[0],
      role: 'Professional'
    };
    setUser(verifiedUser);
    setOrg(null);
    sessionStorage.removeItem('nv_session');
    setTenantDomain(null);
    await refreshWorkspaces();
    return verifiedUser;
  };

  const createWorkspace = async (data) => {
    try {
      const newWs = await apiCreateWorkspace(data);
      await refreshWorkspaces();
      return newWs;
    } catch (err) {
      console.error("Workspace creation failed", err);
      throw err;
    }
  };

  const selectOrg = async (workspace) => {
    // Authenticate membership against the public schema before selecting a tenant.
    const verified = await fetchCurrentWorkspace(workspace.id);
    setOrg(verified);
    sessionStorage.setItem('nv_session', JSON.stringify({ org: verified }));
    setTenantDomain(null);
    return verified;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error("Backend logout failed:", e);
    }
    setUser(null);
    setOrg(null);
    setWorkspaces([]);
    sessionStorage.removeItem('nv_session');
    setTenantDomain(null);
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', background: '#0a0a0a', color: '#fff', 
        fontFamily: 'Inter, system-ui, sans-serif' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin" style={{ 
            width: '40px', height: '40px', border: '3px solid #333', 
            borderTopColor: '#007AFF', borderRadius: '50%', margin: '0 auto 20px' 
          }} />
          <p style={{ fontSize: '14px', letterSpacing: '0.05em', opacity: 0.6 }}>
            INITIALIZING NEUROVISION...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, org, workspaces, loading, authError, 
      login, selectOrg, logout, refreshWorkspaces, createWorkspace, restoreSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
