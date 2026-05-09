import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser, fetchWorkspaces, fetchUserProfile, fetchCurrentWorkspace, createWorkspace as apiCreateWorkspace } from '../services/api';
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
      const saved = sessionStorage.getItem('nv_session');
      
      const host = window.location.hostname;
      // Determine if we are on a tenant subdomain (e.g. sub.localtest.me)
      const isSubdomain = !config.isMainDomain;

      if (saved) {
        const { user, org } = JSON.parse(saved);
        setUser(user);
        setOrg(org);
        await refreshWorkspaces();
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
      
      // Basic user profile from email for now
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
      
      // DRF often returns errors as lists: { error: ["CODE"], email: ["email@..."] }
      const errorCode = Array.isArray(data?.error) ? data.error[0] : data?.error;
      const errorEmail = Array.isArray(data?.email) ? data.email[0] : data?.email;
      
      // 1. Check if the error is OTP_NOT_VERIFIED
      if (errorCode === 'OTP_NOT_VERIFIED') {
        return { success: false, reason: 'OTP_NOT_VERIFIED', email: errorEmail || email };
      }
      
      // 2. Check if the error is wrapped in non_field_errors
      if (data?.non_field_errors && Array.isArray(data.non_field_errors)) {
        const errorDetail = data.non_field_errors[0];
        const nestedCode = typeof errorDetail === 'object' ? (Array.isArray(errorDetail.error) ? errorDetail.error[0] : errorDetail.error) : null;
        const nestedEmail = typeof errorDetail === 'object' ? (Array.isArray(errorDetail.email) ? errorDetail.email[0] : errorDetail.email) : null;
        
        if (nestedCode === 'OTP_NOT_VERIFIED') {
           return { success: false, reason: 'OTP_NOT_VERIFIED', email: nestedEmail || email };
        }
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
    
    // Multi-Tenant Redirection Logic
    if (workspace.domain_url) {
      // Use the FRONTEND_PORT from config to maintain environment consistency
      const targetUrl = `http://${workspace.domain_url}${config.FRONTEND_PORT ? `:${config.FRONTEND_PORT}` : ''}/dashboard`;
      
      if (window.location.origin + window.location.pathname !== targetUrl) {
        window.location.href = targetUrl;
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
