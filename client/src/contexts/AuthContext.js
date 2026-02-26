import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { SERVER_URL } from '../utils/api';
import socketService from '../utils/socketService';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
      };
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      socketService.disconnect();
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'AUTH_ERROR':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Function to establish socket connection with retry logic
  const establishSocketConnection = async (userData) => {
    try {
      await socketService.connect(userData);
      console.log('✅ [AuthContext] Socket connected successfully');
    } catch (socketError) {
      console.error('❌ [AuthContext] Socket connection failed:', socketError);
      
      // Don't automatically retry - let the user manually refresh if needed
      // The app should still work without real-time features
      console.log('ℹ️ [AuthContext] App will continue without real-time features');
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        
        // Validate token by making a quick API call
        const validateToken = async () => {
          try {
            const response = await axios.get(`${SERVER_URL}/api/users/profile`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000
            });
            
            if (response.data.success) {
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { token, user: userData }
              });
              
              // Establish socket connection
              establishSocketConnection(userData);
            } else {
              throw new Error('Token validation failed');
            }
          } catch (error) {
            console.error('Token validation error:', error);
            dispatch({ type: 'AUTH_ERROR', payload: 'Session expired' });
          }
        };
        
        validateToken();
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        dispatch({ type: 'AUTH_ERROR', payload: 'Invalid session data' });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await axios.post(`${SERVER_URL}/api/auth/login`, credentials);

      if (response.data.success) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: response.data
        });
        
        // Establish socket connection after successful login
        establishSocketConnection(response.data.user);
        
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  const logout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Disconnect socket before logout
      if (socketService.isConnected) {
        socketService.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting socket:', error);
    }
    
    dispatch({ type: 'LOGOUT' });
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const value = {
    ...state,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
