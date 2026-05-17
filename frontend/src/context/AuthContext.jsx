import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser, fetchWorkspaces, fetchUserProfile, fetchCurrentWorkspace, createWorkspace as apiCreateWorkspace, setTenantDomain } from '../services/api';
import config from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [org, setOrg]           = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [authError, setAuthError] = useState('');

  // 1. Initial Load: Check session and recover from subdomain cookies
  useEffect(() => {
    const initializeAuth = async () => {
      // Safety timeout: don't block the app for more than 5 seconds
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 5000);

      const saved = sessionStorage.getItem('nv_session');
      
      const host = window.location.hostname;
      // Determine if we are on a tenant subdomain (e.g. sub.localtest.me)
      const isSubdomain = !config.isMainDomain;

      if (saved) {
        try {
          const { user, org } = JSON.parse(saved);
          setUser(user);
          setOrg(org);
          await refreshWorkspaces();
        } catch (e) {
          console.error("Failed to parse saved session", e);
        }
      } else {
        // Try to recover session from HttpOnly cookies via Profile API
        try {
          const profileData = await fetchUserProfile();
          if (profileData.user) {
            const userProfile = {
              ...profileData.user,
              name: profileData.user.first_name || profileData.user.email.split('@')[0],
              role: 'Professional'
            };
            setUser(userProfile);
            
            // If on a subdomain, fetch the specific workspace details
            if (isSubdomain) {
              try {
                const currentWs = await fetchCurrentWorkspace();
                setOrg(currentWs);
              } catch (wsErr) {
                console.error("Failed to fetch current workspace details", wsErr);
              }
            } else {
              await refreshWorkspaces();
            }
          }
        } catch (err) {
          console.log("No active session found");
        }
      }
      
      clearTimeout(timeout);
      setLoading(false);
    };
    
    initializeAuth();
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
      await loginUser({ email, password });
      
      const userProfile = { 
        id: 'user_backend', 
        name: email.split('@')[0], 
        role: 'Professional',
        email: email
      };
      
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
      
      setAuthError('Invalid credentials. Please try again.');
      return { success: false };
    }
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

  const selectOrg = (workspace) => {
    setOrg(workspace);
    sessionStorage.setItem('nv_session', JSON.stringify({ user, org: workspace }));
    
    if (workspace.domain_url) {
      setTenantDomain(workspace.domain_url);
      
      const isCloudDefault = workspace.domain_url.includes('onrender.com') || workspace.domain_url.includes('vercel.app');
      
      if (isCloudDefault) {
        const targetUrl = `${window.location.origin}/dashboard`;
        if (window.location.href !== targetUrl) {
          window.location.href = targetUrl;
        }
      } else {
        const portSuffix = config.FRONTEND_PORT ? `:${config.FRONTEND_PORT}` : '';
        const targetUrl = `${config.protocol}//${workspace.domain_url}${portSuffix}/dashboard`;
        
        if (window.location.origin + window.location.pathname !== targetUrl) {
          window.location.href = targetUrl;
        }
      }
    }
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
      login, selectOrg, logout, refreshWorkspaces, createWorkspace 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
