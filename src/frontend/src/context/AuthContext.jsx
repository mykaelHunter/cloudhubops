import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [apiKey,   setApiKey]   = useState(() => localStorage.getItem("payday_api_key") || "");
  const [merchant, setMerchant] = useState(null);
  const [ready,    setReady]    = useState(false);

  // On mount, validate stored key
  useEffect(() => {
    async function validate() {
      const stored = localStorage.getItem("payday_api_key");
      if (!stored) { setReady(true); return; }
      try {
        const base = import.meta.env.VITE_API_URL || "";
        const res  = await fetch(`${base}/api/v1/merchant/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (res.ok) {
          const data = await res.json();
          setApiKey(stored);
          setMerchant(data.merchant);
        } else {
          localStorage.removeItem("payday_api_key");
          setApiKey("");
        }
      } catch {
        // Network error — keep key, let app handle
      } finally {
        setReady(true);
      }
    }
    validate();
  }, []);

  function login(key, merchantData) {
    setApiKey(key);
    setMerchant(merchantData);
    localStorage.setItem("payday_api_key", key);
  }

  function logout() {
    setApiKey("");
    setMerchant(null);
    localStorage.removeItem("payday_api_key");
  }

  return (
    <AuthContext.Provider value={{ apiKey, merchant, login, logout, ready, isAuthenticated: !!apiKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
