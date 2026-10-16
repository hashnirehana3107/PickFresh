import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [pickupDate, setPickupDate] = useState('Today');
    const [pickupTimeSlot, setPickupTimeSlot] = useState('4:30 PM - 5:00 PM');
    const [smartReplacement, setSmartReplacement] = useState(true);

    useEffect(() => {
        const loadCart = async () => {
            try {
                const saved = await AsyncStorage.getItem('pickfresh_cart');
                if (saved !== null) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        setCartItems(parsed);
                    }
                }
            } catch (e) {
                console.warn('Error loading cart:', e);
            } finally {
                setIsLoaded(true);
            }
        };
        loadCart();
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        AsyncStorage.setItem('pickfresh_cart', JSON.stringify(cartItems)).catch(() => { });
    }, [cartItems, isLoaded]);

    const addToCart = (product, qty = 1) => {
        const addQty = typeof qty === 'number' && qty > 0 ? qty : 1;
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id || item._id === product._id);
            if (existing) {
                return prev.map(item => (item.id === product.id || item._id === product._id) ? { ...item, quantity: item.quantity + addQty } : item);
            }
            return [...prev, { ...product, quantity: addQty }];
        });

        // Persist to MongoDB Atlas via Backend API
        try {
            fetch(`${API_BASE_URL}/cart/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'customer',
                    product,
                    quantity: addQty
                })
            }).catch(() => { });
        } catch (e) { }
    };

    const updateQuantity = (id, delta) => {
        setCartItems(prev => {
            const updated = prev.map(item => {
                if (item.id === id || item._id === id) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : null;
                }
                return item;
            }).filter(Boolean);

            const changedItem = updated.find(item => item.id === id || item._id === id);
            if (changedItem) {
                try {
                    fetch(`${API_BASE_URL}/cart/update`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: 'customer', id, quantity: changedItem.quantity })
                    }).catch(() => { });
                } catch (e) { }
            } else {
                try {
                    fetch(`${API_BASE_URL}/cart/item/delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: 'customer', id })
                    }).catch(() => { });
                } catch (e) { }
            }

            return updated;
        });
    };

    const setQuantity = (id, qty) => {
        if (qty <= 0) {
            removeItem(id);
            return;
        }
        setCartItems(prev => prev.map(item => {
            if (item.id === id || item._id === id) {
                return { ...item, quantity: qty };
            }
            return item;
        }));

        try {
            fetch(`${API_BASE_URL}/cart/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'customer', id, quantity: qty })
            }).catch(() => { });
        } catch (e) { }
    };

    const removeItem = (id) => {
        setCartItems(prev => prev.filter(item => item.id !== id && item._id !== id));
        try {
            fetch(`${API_BASE_URL}/cart/item/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'customer', id })
            }).catch(() => { });
        } catch (e) { }
    };

    const clearCart = () => {
        setCartItems([]);
        AsyncStorage.setItem('pickfresh_cart', JSON.stringify([])).catch(() => { });
        try {
            fetch(`${API_BASE_URL}/cart/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'customer' })
            }).catch(() => { });
        } catch (e) { }
    };

    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            updateQuantity,
            setQuantity,
            removeItem,
            clearCart,
            totalAmount,
            pickupDate,
            setPickupDate,
            pickupTimeSlot,
            setPickupTimeSlot,
            smartReplacement,
            setSmartReplacement
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
