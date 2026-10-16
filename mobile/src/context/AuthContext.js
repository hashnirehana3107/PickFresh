import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Initial load from AsyncStorage
    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                const savedUser = await AsyncStorage.getItem('pickfresh_user');
                const savedToken = await AsyncStorage.getItem('pickfresh_token');
                if (savedUser) setUser(JSON.parse(savedUser));
                if (savedToken) setToken(savedToken);
            } catch (err) {
                console.warn('Error reading auth from storage:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadStoredAuth();
    }, []);

    // Sync user changes to AsyncStorage
    useEffect(() => {
        if (user) {
            AsyncStorage.setItem('pickfresh_user', JSON.stringify(user));
        } else {
            AsyncStorage.removeItem('pickfresh_user');
        }
    }, [user]);

    // Sync token changes to AsyncStorage
    useEffect(() => {
        if (token) {
            AsyncStorage.setItem('pickfresh_token', token);
        } else {
            AsyncStorage.removeItem('pickfresh_token');
        }
    }, [token]);

    // Refresh user context from server
    useEffect(() => {
        if (token && user?.email) {
            fetch(`${API_BASE_URL}/auth/user-details?email=${encodeURIComponent(user.email)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        setUser(data.user);
                        AsyncStorage.setItem('pickfresh_user', JSON.stringify(data.user));
                    }
                })
                .catch(err => console.warn('Failed to refresh user context:', err));
        }
    }, [token, user?.email]);

    const switchRole = (newRole) => {
        if (user) {
            const updatedUser = { ...user, role: newRole };
            setUser(updatedUser);
        }
    };

    const login = async (email, password) => {
        if (!email || !password) {
            throw new Error('Please enter both email and password.');
        }

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Invalid email or password.');
            }

            setToken(data.token);
            setUser(data.user);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                if (data.user?.role === 'customer' || !data.user?.role) {
                    window.location.hash = '#/home';
                }
            }
            return data.user;
        } catch (error) {
            if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
                throw new Error(`Cannot connect to PickFresh API at ${API_BASE_URL}. Ensure backend is running.`);
            }
            throw error;
        }
    };

    const register = async (userData) => {
        if (!userData.email || !userData.password) {
            throw new Error('Please fill in all required fields.');
        }

        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Registration failed.');
            }

            setToken(data.token);
            setUser(data.user);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                if (data.user?.role === 'customer' || !data.user?.role) {
                    window.location.hash = '#/home';
                }
            }
            return data.user;
        } catch (error) {
            if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
                throw new Error(`Cannot connect to PickFresh API at ${API_BASE_URL}. Ensure backend is running.`);
            }
            throw error;
        }
    };

    const logout = async () => {
        setUser(null);
        setToken('');
        await AsyncStorage.removeItem('pickfresh_user');
        await AsyncStorage.removeItem('pickfresh_token');
        await AsyncStorage.removeItem('pickfresh_active_order');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.hash = '#/login';
        }
    };

    const loginWithGoogle = async (socialUserData, providerOverride = 'google', options = {}) => {
        const provider = socialUserData.provider ||
            (socialUserData.id && String(socialUserData.id).startsWith('apple') ? 'apple' : providerOverride);

        const isSignUp = options.isSignUp !== undefined
            ? options.isSignUp
            : (socialUserData.isSignUp !== undefined ? socialUserData.isSignUp : false);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/social-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    providerId: socialUserData.id || '',
                    name: socialUserData.name || '',
                    email: socialUserData.email,
                    picture: socialUserData.picture || '',
                    role: socialUserData.role || 'customer',
                    isSignUp
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Social authentication failed.');
            }

            setToken(data.token);
            setUser(data.user);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                if (data.user?.role === 'shop_owner') {
                    window.location.hash = '#/shop_owner';
                } else if (data.user?.role === 'supplier') {
                    window.location.hash = '#/supplier';
                } else {
                    window.location.hash = '#/home';
                }
            }
            return data.user;
        } catch (err) {
            throw err;
        }
    };

    const updateUser = async (updatedFields) => {
        if (user) {
            const updated = { ...user, ...updatedFields };
            setUser(updated);
            AsyncStorage.setItem('pickfresh_user', JSON.stringify(updated));

            try {
                const reqEmail = user.email || '';
                const res = await fetch(`${API_BASE_URL}/auth/update-profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: reqEmail, id: user.id || user._id, role: user.role, ...updatedFields })
                });
                const data = await res.json();
                if (res.ok && data.success && data.user) {
                    const freshUser = { ...updated, ...data.user };
                    setUser(freshUser);
                    AsyncStorage.setItem('pickfresh_user', JSON.stringify(freshUser));
                    return freshUser;
                }
            } catch (err) {
                console.warn('Backend profile sync pending:', err);
            }
        }
    };

    const deactivateAccount = async () => {
        if (user?.email || user?.id || user?._id) {
            try {
                await fetch(`${API_BASE_URL}/auth/deactivate-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user.email,
                        id: user.id || user._id,
                        role: user.role
                    })
                });
            } catch (err) {
                console.warn('Backend account deactivation failed:', err);
            }
        }
        await logout();
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, switchRole, login, register, loginWithGoogle, logout, updateUser, deactivateAccount }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
