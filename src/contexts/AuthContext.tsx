/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import axios from "axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MENTOR" | "MENTEE";
  status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  avatar?: string;
  verified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (formData: FormData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api" 

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't override Content-Type for FormData (multipart/form-data)
    // Axios will set it automatically with the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle both 401 (Unauthorized) and 403 (Forbidden) with "Invalid token" message
    const isAuthError = error.response?.status === 401 || 
                       (error.response?.status === 403 && 
                        error.response?.data?.message?.toLowerCase().includes('token'));

    if (isAuthError && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const response = await axios.post("/auth/refresh", { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } =
            response.data.data;

          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", newRefreshToken);

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Token refresh failed, logout user
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");

      if (token) {
        try {
          // Fetch current user details from API
          const response = await axios.get("/auth/me");
          const userData = response.data.data;
          setUser(userData);
          // Update localStorage with fresh data
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error: any) {
          console.error("Error fetching current user:", error);
          // If token is invalid or expired, clear everything
          logout();
        }
      } else {
        // No token, clear any stale user data
        localStorage.removeItem("user");
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post("/auth/login", { email, password });
      const { user: userData, accessToken, refreshToken } = response.data.data;

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      setUser(userData);
    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed";
      throw new Error(message);
    }
  };

  const register = async (formData: FormData) => {
    try {
      const response = await axios.post("/auth/register", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout for registration (email sending is non-blocking)
      });

      const responseData = response.data.data;
      const role = formData.get('role') as string;

      // Handle response based on role
      if (role === "MENTOR") {
        // Mentors don't get tokens, just return success
        return responseData;
      } else {
        // Mentees get tokens and should be logged in
        const { user: userData, accessToken, refreshToken } = responseData;
        if (accessToken && refreshToken && userData) {
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          setUser(userData);
        }
        return responseData;
      }
    } catch (error: any) {
      // Handle timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Registration request timed out. The server is taking too long to respond. Please check your connection and try again.');
      }
      // Handle network errors
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      const message = error.response?.data?.message || error.message || "Registration failed";
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;

    try {
      const response = await axios.put(`/users/${user.id}/profile`, data);
      const updatedUser = response.data.data;

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error: any) {
      const message = error.response?.data?.message || "Profile update failed";
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext };
