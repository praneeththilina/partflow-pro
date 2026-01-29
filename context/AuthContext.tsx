import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
    login: (user: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>(() => {
        const savedAuth = localStorage.getItem('partflow_auth');
        if (savedAuth) {
            return JSON.parse(savedAuth);
        }
        return { user: null, token: null, isAuthenticated: false };
    });

    const login = (user: User, token: string) => {
        const newState = { user, token, isAuthenticated: true };
        setState(newState);
        localStorage.setItem('partflow_auth', JSON.stringify(newState));
    };

    const logout = () => {
        setState({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('partflow_auth');
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
