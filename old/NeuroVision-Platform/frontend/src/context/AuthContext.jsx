import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Mock multi-tenant org database
const MOCK_ORGS = [
  { id: 'org_metro', name: 'Metropolitan General Hospital', location: 'Mumbai, IN', patients: 1842, tier: 'Enterprise' },
  { id: 'org_neuro', name: 'Neurology Associates Clinic', location: 'Delhi, IN', patients: 476, tier: 'Professional' },
  { id: 'org_aic',   name: 'Apollo Imaging Centre',       location: 'Bangalore, IN', patients: 923, tier: 'Professional' },
];

// Mock user DB (keyed by email)
const MOCK_USERS = {
  'dr.patel@metro.in':    { id: 'u1', name: 'Dr. Priya Patel',    role: 'Radiologist',   orgs: ['org_metro', 'org_aic'] },
  'dr.sharma@neuro.in':   { id: 'u2', name: 'Dr. Rohan Sharma',   role: 'Neuro-Oncologist', orgs: ['org_neuro'] },
  'admin@neurovision.ai': { id: 'u3', name: 'System Administrator', role: 'Admin',        orgs: ['org_metro', 'org_neuro', 'org_aic'] },
};
const MOCK_PASSWORD = 'password123'; // All mock accounts share this

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [org, setOrg]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('nv_session');
    if (saved) {
      const { user, org } = JSON.parse(saved);
      setUser(user);
      setOrg(org);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setAuthError('');
    await new Promise(r => setTimeout(r, 800)); // simulate network
    const found = MOCK_USERS[email.toLowerCase()];
    if (!found || password !== MOCK_PASSWORD) {
      setAuthError('Invalid credentials. Please try again.');
      return false;
    }
    setUser(found);
    return true;
  };

  const selectOrg = (orgId) => {
    const selected = MOCK_ORGS.find(o => o.id === orgId);
    setOrg(selected);
    sessionStorage.setItem('nv_session', JSON.stringify({ user, org: selected }));
  };

  const logout = () => {
    setUser(null);
    setOrg(null);
    sessionStorage.removeItem('nv_session');
  };

  const getUserOrgs = () => {
    if (!user) return [];
    return MOCK_ORGS.filter(o => user.orgs.includes(o.id));
  };

  return (
    <AuthContext.Provider value={{ user, org, loading, authError, login, selectOrg, logout, getUserOrgs }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
