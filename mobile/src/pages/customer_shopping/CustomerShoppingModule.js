import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    Modal,
    ScrollView,
    Platform,
    Vibration,
    Animated,
    Easing,
} from 'react-native';
import {
    Home,
    Search,
    ShoppingCart,
    User,
    Bell,
    ChevronRight,
    CheckCheck,
    X,
    ShoppingBag,
    Tag,
    Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { API_BASE_URL } from '../../config/api';

// Subpages
import CustomerHomePage from './CustomerHomePage';
import SearchPage from './SearchPage';
import CustomerStoresPage from './CustomerStoresPage';
import ProductDetailsPage from './ProductDetailsPage';
import CartPage from './CartPage';
import PickupSelectionPage from './PickupSelectionPage';
import SmartReplacementPage from './SmartReplacementPage';
import OrderConfirmationPage from './OrderConfirmationPage';
import LiveTrackingPage from './LiveTrackingPage';
import ProfilePage from './ProfilePage';
import PastOrdersPage from './PastOrdersPage';
import NotificationsPage from './NotificationsPage';
import ReadyPickupAlertModal from './ReadyPickupAlertModal';

const VALID_CUSTOMER_SUBPAGES = [
    'home',
    'stores',
    'search',
    'cart',
    'profile',
    'notifications',
    'history',
    'product_details',
    'pickup_select',
    'smart_replacement',
    'order_confirm',
    'track',
    'live_tracking',
];

const resolveCustomerSubpage = (candidate) => {
    if (candidate && VALID_CUSTOMER_SUBPAGES.includes(candidate)) {
        return candidate;
    }
    return 'home';
};

export default function CustomerShoppingModule({ initialPage = 'home', onNavigate: topLevelNavigate }) {
    const { user } = useAuth();
    const customerUserId = user?.email || user?._id || user?.id || 'guest_customer';
    const { cartItems, addToCart, setQuantity, removeItem, clearCart } = useCart();

    const [subPage, setSubPage] = useState(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const rawHash = (window.location.hash || '').replace('#/', '').replace('#', '').trim();
            const ephemeralStates = ['order_confirm', 'pickup_select', 'welcome', 'login', 'signup', 'roleselect'];
            if (rawHash && VALID_CUSTOMER_SUBPAGES.includes(rawHash) && !ephemeralStates.includes(rawHash)) {
                return rawHash;
            }
        }
        return resolveCustomerSubpage(initialPage);
    });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);
    const [itemToReplace, setItemToReplace] = useState(null);
    const [searchCategory, setSearchCategory] = useState('All');
    const [lastOrderDetails, setLastOrderDetails] = useState(null);
    const [readyAlertOrder, setReadyAlertOrder] = useState(null);
    const [dismissedOrderId, setDismissedOrderId] = useState(null);
    const [historyFilter, setHistoryFilter] = useState('all');

    // Notifications state
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [notificationsList, setNotificationsList] = useState([]);

    // Bell Shake & Continuous Vibration Loop while unread notifications exist
    const bellShakeAnim = useRef(new Animated.Value(0)).current;


    // Synchronize browser URL hash with subpage when running on web
    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const handleHashChange = () => {
                const rawHash = (window.location.hash || '').replace('#/', '').replace('#', '').trim();
                const ephemeralStates = ['welcome', 'login', 'signup', 'roleselect'];
                if (ephemeralStates.includes(rawHash)) {
                    setSubPage('home');
                    window.history.replaceState?.(null, '', '#/home');
                    return;
                }
                if (VALID_CUSTOMER_SUBPAGES.includes(rawHash)) {
                    setSubPage(rawHash);
                } else {
                    setSubPage('home');
                    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
                        window.history.replaceState?.(null, '', '#/home');
                    }
                }
            };
            window.addEventListener('hashchange', handleHashChange);
            handleHashChange();
            return () => window.removeEventListener('hashchange', handleHashChange);
        }
    }, []);

    // Sync subPage state changes to browser URL hash
    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const target = subPage || 'home';
            const currentHash = (window.location.hash || '').replace('#/', '').replace('#', '').trim();
            if (currentHash !== target) {
                window.history.replaceState?.(null, '', `#/${target}`);
            }
        }
    }, [subPage]);

    // Backend notifications sync & ready for pickup detection
    useEffect(() => {
        let isMounted = true;

        const formatTimeAgo = (dateStr) => {
            if (!dateStr) return 'Just now';
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return 'Just now';
            const diffSec = Math.floor((new Date() - dateObj) / 1000);
            if (diffSec < 60) return 'Just now';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
        };

        const syncBackendOrdersAndNotifications = async () => {
            try {
                if (!user || (!user.email && !user._id && !user.id)) {
                    if (isMounted) {
                        setReadyAlertOrder(null);
                        setOrderNotifications([]);
                    }
                    return;
                }

                const notifParams = new URLSearchParams();
                if (user?.email) notifParams.append('customerEmail', user.email.trim());
                if (user?._id || user?.id) notifParams.append('customerId', user._id || user.id);
                const queryStr = notifParams.toString() ? `?${notifParams.toString()}` : '';

                const res = await fetch(`${API_BASE_URL}/orders${queryStr}`);
                const data = await res.json();

                if (data.success && Array.isArray(data.orders) && isMounted) {
                    const userOrders = data.orders.filter(o => {
                        if (!o) return false;
                        const ordEmail = (o.customerEmail || '').toLowerCase().trim();
                        const uEmail = (user.email || '').toLowerCase().trim();
                        if (ordEmail && uEmail && ordEmail === uEmail) return true;
                        const ordCustId = o.customer ? String(o.customer._id || o.customer) : '';
                        const uId = String(user._id || user.id || '');
                        if (ordCustId && uId && ordCustId === uId) return true;
                        return false;
                    });

                    // Check for ready pickup order
                    const readyOrder = userOrders.find((ord) => {
                        const s = (ord.status || '').toLowerCase().trim();
                        return s === 'ready' || s === 'ready for pickup';
                    });
                    if (readyOrder && dismissedOrderId !== (readyOrder._id || readyOrder.orderNumber)) {
                        setReadyAlertOrder(readyOrder);
                    } else if (!readyOrder) {
                        setReadyAlertOrder(null);
                    }

                    // Build notifications from real customer orders matching React frontend exactly
                    const dynamicNotifs = [];
                    userOrders.slice(0, 10).forEach((o) => {
                        const status = (o.status || '').toLowerCase().trim();
                        const orderNum = o.orderNumber || `PF-${o._id ? String(o._id).slice(-4) : '1024'}`;
                        const store = (o.pickupStore || o.storeName || 'GroceryMart').split(' - ')[0];
                        const time = formatTimeAgo(o.createdAt || o.orderDate || o.updatedAt);

                        if (status === 'placed' || status === 'pending') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_pending`,
                                orderId: o._id,
                                orderData: o,
                                title: `Order #${orderNum} Placed!`,
                                message: `Pre-order received at ${store}. Awaiting shop confirmation.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'live_tracking',
                            });
                        } else if (status === 'accepted' || status === 'confirmed') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_accepted`,
                                orderId: o._id,
                                orderData: o,
                                title: `Order #${orderNum} Accepted!`,
                                message: `${store} confirmed your order. Items will be packed soon.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'live_tracking',
                            });
                        } else if (status === 'preparing' || status === 'processing') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_preparing`,
                                orderId: o._id,
                                orderData: o,
                                title: `Packing Order #${orderNum}`,
                                message: `Your items are currently being packed by ${store}.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'live_tracking',
                            });
                        } else if (status === 'ready for pickup' || status === 'completed' || status === 'ready') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_ready`,
                                orderId: o._id,
                                orderData: o,
                                title: `Order #${orderNum} Ready for Pickup!`,
                                message: `Head to ${store} express pickup counter now.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'live_tracking',
                            });
                        } else if (status === 'cancelled') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_cancelled`,
                                orderId: o._id,
                                orderData: o,
                                title: `Order #${orderNum} Cancelled`,
                                message: `Order at ${store} was cancelled. Refund processed.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'live_tracking',
                            });
                        }
                    });

                    // Add welcome offer notification if empty
                    if (dynamicNotifs.length === 0) {
                        dynamicNotifs.push({
                            id: 'notif_welcome_1',
                            title: 'Welcome to PickFresh!',
                            message: 'Get 20% off on your first in-store pickup order.',
                            time: '1h ago',
                            type: 'offer',
                            read: false,
                        });
                    }

                    setNotificationsList((prev) => {
                        const readSet = new Set(prev.filter((n) => n.read).map((n) => n.id));
                        return dynamicNotifs.map((n) => (readSet.has(n.id) ? { ...n, read: true } : n));
                    });
                }
            } catch (err) {
                // Silent fallback
            }
        };

        syncBackendOrdersAndNotifications();
        const interval = setInterval(syncBackendOrdersAndNotifications, 4000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user, dismissedOrderId]);

    const unreadCount = notificationsList.filter((n) => !n.read).length;

    // Continuous Bell Shaking Animation & Vibration until user views notifications
    useEffect(() => {
        let vibTimer = null;
        if (unreadCount > 0) {
            const shake = Animated.sequence([
                Animated.timing(bellShakeAnim, { toValue: 14, duration: 100, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: -14, duration: 100, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
                Animated.delay(2000),
            ]);

            const loopAnim = Animated.loop(shake);
            loopAnim.start();

            const triggerVibration = () => {
                try {
                    if (Platform.OS !== 'web') {
                        Vibration.vibrate([0, 300, 150, 300], false);
                    }
                } catch (err) {
                    // Ignore
                }
            };

            triggerVibration();
            vibTimer = setInterval(triggerVibration, 2600);

            return () => {
                loopAnim.stop();
                bellShakeAnim.setValue(0);
                if (vibTimer) clearInterval(vibTimer);
                try {
                    if (Platform.OS !== 'web') {
                        Vibration.cancel();
                    }
                } catch (err) {}
            };
        } else {
            bellShakeAnim.setValue(0);
            try {
                if (Platform.OS !== 'web') {
                    Vibration.cancel();
                }
            } catch (err) {}
        }
    }, [unreadCount]);

    const handleMarkAllAsRead = () => {
        setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const handleMarkSingleAsRead = (id) => {
        setNotificationsList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    const handleNavigate = (page, data = null) => {
        if (page === 'login' || page === 'welcome' || page === 'signup' || page === 'roleselect') {
            if (topLevelNavigate) topLevelNavigate(page, data);
            return;
        }

        if (page === 'order_confirm') {
            if (data) setLastOrderDetails(data);
            if (clearCart) clearCart();
            // Clear backend cart from MongoDB Atlas via API
            try {
                fetch(`${API_BASE_URL}/cart/clear`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: customerUserId }),
                }).catch(() => { });
            } catch (e) {
                // silent
            }
        } else if (page === 'track' || page === 'live_tracking') {
            if (data) setLastOrderDetails(data);
            setSubPage('live_tracking');
            return;
        } else if (page === 'product_details') {
            if (data) setSelectedProduct(data);
        } else if (page === 'smart_replacement') {
            if (data) setItemToReplace(data);
        } else if (page === 'search') {
            if (data?.category) {
                setSearchCategory(data.category);
            } else {
                setSearchCategory('All');
            }
            if (data?.store) {
                setSelectedStore(data.store);
            }
        } else if (page === 'history' || page === 'past_orders' || page === 'order_history') {
            if (data?.filter) {
                setHistoryFilter(data.filter);
            } else if (typeof data === 'string' && ['all', 'completed', 'cancelled'].includes(data.toLowerCase())) {
                setHistoryFilter(data.toLowerCase());
            } else {
                setHistoryFilter('all');
            }
        }

        setSubPage(page);
    };

    const handleReplaceItem = (newProduct, oldId) => {
        if (oldId) removeItem(oldId);
        addToCart(newProduct, 1);
    };

    const totalCartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

    const isModalVisible = Boolean(
        readyAlertOrder && dismissedOrderId !== (readyAlertOrder._id || readyAlertOrder.orderNumber)
    );

    return (
        <View style={styles.customerShoppingMaster}>
            {/* Global Top Navigation Header Matching User Image & Web Prototype */}
            <View style={styles.globalTopHeader}>
                <View style={styles.exactLogoGroup}>
                    <View style={styles.exactLogoCircle}>
                        <Image
                            source={require('../../../assets/logo.jpg')}
                            style={styles.exactLogoImg}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.exactLogoText}>
                        <Text style={styles.exactBrandName}>PickFresh</Text>
                        <Text style={styles.exactBrandSub}>Customer view</Text>
                    </View>
                </View>

                <View style={styles.searchHeaderRight}>
                    <Animated.View
                        style={{
                            transform: [
                                {
                                    rotate: bellShakeAnim.interpolate({
                                        inputRange: [-20, 20],
                                        outputRange: ['-20deg', '20deg'],
                                    }),
                                },
                            ],
                        }}
                    >
                        <TouchableOpacity
                            style={styles.exactNotifBtn}
                            onPress={() => setShowNotifDropdown((prev) => !prev)}
                            activeOpacity={0.7}
                        >
                            <Bell size={20} color="#2D7B38" />
                            {unreadCount > 0 && (
                                <View style={styles.notifBadgeDot}>
                                    <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            {/* Quick Notifications Dropdown - Contained within phone screen matching React */}
            {showNotifDropdown && (
                <TouchableOpacity
                    style={styles.notifDropdownOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNotifDropdown(false)}
                >
                    <TouchableOpacity
                        style={styles.notifDropdownCard}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation?.()}
                    >
                        <View style={styles.notifDdHeader}>
                            <View style={styles.notifDdTitleRow}>
                                <Text style={styles.notifDdTitle}>Notifications</Text>
                                {unreadCount > 0 && (
                                    <View style={styles.notifDdCountPill}>
                                        <Text style={styles.notifDdCountPillText}>{unreadCount} new</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.notifDdActions}>
                                {unreadCount > 0 && (
                                    <TouchableOpacity
                                        style={styles.notifDdReadAll}
                                        onPress={handleMarkAllAsRead}
                                    >
                                        <CheckCheck size={14} color="#2D7B38" />
                                        <Text style={styles.notifDdReadAllText}>Mark read</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.notifDdClose}
                                    onPress={() => setShowNotifDropdown(false)}
                                >
                                    <X size={16} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={styles.notifDdBody} showsVerticalScrollIndicator={false}>
                            {notificationsList.length === 0 ? (
                                <Text style={styles.notifDdEmpty}>No notifications</Text>
                            ) : (
                                notificationsList.slice(0, 3).map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.notifDdItem, !item.read && styles.notifDdItemUnread]}
                                        onPress={() => {
                                            handleMarkSingleAsRead(item.id);
                                            setShowNotifDropdown(false);
                                            if (item.actionTarget === 'live_tracking' && item.orderData) {
                                                handleNavigate('live_tracking', item.orderData);
                                            } else if (item.actionTarget) {
                                                handleNavigate(item.actionTarget);
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.notifDdItemIcon}>
                                            {item.type === 'order' && <ShoppingBag size={16} color="#2D7B38" />}
                                            {item.type === 'offer' && <Tag size={16} color="#E65100" />}
                                            {item.type === 'system' && <Sparkles size={16} color="#7B1FA2" />}
                                        </View>
                                        <View style={styles.notifDdItemText}>
                                            <View style={styles.notifDdItemTop}>
                                                <Text style={styles.notifDdItemTitle}>{item.title}</Text>
                                                <Text style={styles.notifDdItemTime}>{item.time}</Text>
                                            </View>
                                            <Text style={styles.notifDdItemSub} numberOfLines={2}>
                                                {item.message}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>

                        <View style={styles.notifDdFooter}>
                            <TouchableOpacity
                                style={styles.notifDdViewAllBtn}
                                onPress={() => {
                                    setShowNotifDropdown(false);
                                    setSubPage('notifications');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.notifDdViewAllText}>View All Notifications</Text>
                                <ChevronRight size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Subpage View Container */}
            <View style={styles.subpageViewContainer}>
                {(subPage === 'home' || !VALID_CUSTOMER_SUBPAGES.includes(subPage)) && (
                    <CustomerHomePage
                        onNavigate={handleNavigate}
                        onSelectProduct={(p) => {
                            setSelectedProduct(p);
                            setSubPage('product_details');
                        }}
                        selectedStore={selectedStore}
                        onSelectStore={setSelectedStore}
                        addToCart={addToCart}
                        onAddToCart={addToCart}
                    />
                )}

                {subPage === 'search' && (
                    <SearchPage
                        onNavigate={handleNavigate}
                        onSelectProduct={(p) => {
                            setSelectedProduct(p);
                            setSubPage('product_details');
                        }}
                        onAddToCart={addToCart}
                        selectedStore={selectedStore}
                        onSelectStore={setSelectedStore}
                        initialCategory={searchCategory}
                    />
                )}

                {subPage === 'stores' && (
                    <CustomerStoresPage
                        onNavigate={handleNavigate}
                        onSelectStore={setSelectedStore}
                        selectedStore={selectedStore}
                    />
                )}

                {subPage === 'product_details' && (
                    <ProductDetailsPage
                        product={selectedProduct}
                        onNavigate={handleNavigate}
                        onAddToCart={addToCart}
                        addToCart={addToCart}
                        selectedStore={selectedStore}
                    />
                )}

                {subPage === 'cart' && (
                    <CartPage
                        cartItems={cartItems}
                        onUpdateQuantity={(id, qty) => setQuantity(id, qty)}
                        onRemoveItem={(id) => removeItem(id)}
                        onNavigate={handleNavigate}
                        selectedStore={selectedStore}
                        onSmartSwap={(item) => handleNavigate('smart_replacement', item)}
                        onOpenReplacement={(item) => handleNavigate('smart_replacement', item)}
                    />
                )}

                {subPage === 'pickup_select' && (
                    <PickupSelectionPage
                        onNavigate={handleNavigate}
                        cartItems={cartItems}
                        selectedStore={selectedStore}
                        onClearCart={clearCart}
                    />
                )}

                {subPage === 'smart_replacement' && (
                    <SmartReplacementPage
                        itemToReplace={itemToReplace}
                        onNavigate={handleNavigate}
                        onReplaceItem={handleReplaceItem}
                    />
                )}

                {subPage === 'order_confirm' && (
                    <OrderConfirmationPage
                        onNavigate={handleNavigate}
                        orderDetails={lastOrderDetails}
                    />
                )}

                {(subPage === 'track' || subPage === 'live_tracking') && (
                    <LiveTrackingPage
                        onNavigate={handleNavigate}
                        orderDetails={lastOrderDetails || readyAlertOrder}
                        onOrderCancelled={() => {
                            setLastOrderDetails(null);
                            setReadyAlertOrder(null);
                        }}
                    />
                )}

                {subPage === 'profile' && (
                    <ProfilePage
                        onNavigate={handleNavigate}
                        lastOrder={lastOrderDetails}
                        onOrderCancelled={() => {
                            setLastOrderDetails(null);
                            setReadyAlertOrder(null);
                        }}
                    />
                )}

                {(subPage === 'history' || subPage === 'past_orders' || subPage === 'order_history') && (
                    <PastOrdersPage
                        onNavigate={handleNavigate}
                        addToCart={addToCart}
                        initialFilter={historyFilter}
                    />
                )}

                {subPage === 'notifications' && (
                    <NotificationsPage
                        onNavigate={handleNavigate}
                        notifications={notificationsList}
                        onMarkAsRead={handleMarkSingleAsRead}
                        onClearAll={() => setNotificationsList([])}
                        onNotificationAction={(target, data) => handleNavigate(target, data)}
                    />
                )}
            </View>

            {/* Ready For Pickup Popup Modal */}
            <ReadyPickupAlertModal
                visible={isModalVisible}
                alertOrder={readyAlertOrder}
                onClose={() => setDismissedOrderId(readyAlertOrder?._id || readyAlertOrder?.orderNumber || 'dismissed')}
                onTrackOrder={(ord) => handleNavigate('live_tracking', ord)}
            />

            {/* Bottom Fixed Navigation Bar Matching Web Prototype (4 Tabs) */}
            <View style={styles.bottomNavBar}>
                <TouchableOpacity
                    style={styles.navTabBtn}
                    onPress={() => setSubPage('home')}
                    activeOpacity={0.7}
                >
                    <Home
                        size={22}
                        color={(subPage === 'home' || !VALID_CUSTOMER_SUBPAGES.includes(subPage)) ? '#2D7B38' : '#64748B'}
                        fill={(subPage === 'home' || !VALID_CUSTOMER_SUBPAGES.includes(subPage)) ? '#2D7B38' : 'none'}
                        strokeWidth={(subPage === 'home' || !VALID_CUSTOMER_SUBPAGES.includes(subPage)) ? 2.5 : 2}
                    />
                    <Text
                        style={[
                            styles.navTabLabel,
                            (subPage === 'home' || !VALID_CUSTOMER_SUBPAGES.includes(subPage)) && styles.navTabLabelActive,
                        ]}
                    >
                        Home
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navTabBtn}
                    onPress={() => setSubPage('search')}
                    activeOpacity={0.7}
                >
                    <Search
                        size={22}
                        color={subPage === 'search' ? '#2D7B38' : '#64748B'}
                        strokeWidth={subPage === 'search' ? 2.5 : 2}
                    />
                    <Text
                        style={[
                            styles.navTabLabel,
                            subPage === 'search' && styles.navTabLabelActive,
                        ]}
                    >
                        Search
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navTabBtn}
                    onPress={() => setSubPage('cart')}
                    activeOpacity={0.7}
                >
                    <View style={styles.cartIconWrapper}>
                        <ShoppingCart
                            size={22}
                            color={['cart', 'track', 'live_tracking'].includes(subPage) ? '#2D7B38' : '#64748B'}
                            strokeWidth={['cart', 'track', 'live_tracking'].includes(subPage) ? 2.5 : 2}
                        />
                        {totalCartCount > 0 && (
                            <View style={styles.navCartBadge}>
                                <Text style={styles.navCartBadgeText}>{totalCartCount}</Text>
                            </View>
                        )}
                    </View>
                    <Text
                        style={[
                            styles.navTabLabel,
                            ['cart', 'track', 'live_tracking'].includes(subPage) && styles.navTabLabelActive,
                        ]}
                    >
                        Cart
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navTabBtn}
                    onPress={() => setSubPage('profile')}
                    activeOpacity={0.7}
                >
                    <User
                        size={22}
                        color={['profile', 'history'].includes(subPage) ? '#2D7B38' : '#64748B'}
                        strokeWidth={['profile', 'history'].includes(subPage) ? 2.5 : 2}
                    />
                    <Text
                        style={[
                            styles.navTabLabel,
                            ['profile', 'history'].includes(subPage) && styles.navTabLabelActive,
                        ]}
                    >
                        Profile
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    customerShoppingMaster: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#FAF9F5',
        position: 'relative',
    },

    // Global Top Header Matching Screenshot
    globalTopHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingTop: 10,
        paddingBottom: 14,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        zIndex: 100,
    },
    exactLogoGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    exactLogoCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        padding: 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    exactLogoImg: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    exactLogoText: {
        flexDirection: 'column',
    },
    exactBrandName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#2D7B38',
        lineHeight: 24,
        letterSpacing: -0.5,
    },
    exactBrandSub: {
        fontSize: 12,
        color: '#777777',
        fontWeight: '500',
        marginTop: 1,
    },
    searchHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exactNotifBtn: {
        position: 'relative',
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F4F8F4',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    notifBadgeDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 17,
        height: 17,
        paddingHorizontal: 4,
        backgroundColor: '#EF4444',
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },

    // Subpage View Container
    subpageViewContainer: {
        flex: 1,
        width: '100%',
    },

    // Fixed Bottom Navigation Bar Matching Web Prototype (4 Tabs)
    bottomNavBar: {
        height: 64,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 8,
        zIndex: 9999,
    },
    navTabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingVertical: 6,
    },
    navTabLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    navTabLabelActive: {
        color: '#2D7B38',
        fontWeight: '800',
    },
    cartIconWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navCartBadge: {
        position: 'absolute',
        top: -5,
        right: -8,
        backgroundColor: '#2D7B38',
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navCartBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },

    // Notifications Dropdown Overlay (Contained in phone screen below header)
    notifDropdownOverlay: {
        position: 'absolute',
        top: 72,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        zIndex: 9999,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    notifDropdownCard: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        maxHeight: 420,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 30,
        elevation: 10,
    },
    notifDdHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    notifDdTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    notifDdTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    notifDdCountPill: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    notifDdCountPillText: {
        color: '#166534',
        fontSize: 11,
        fontWeight: '800',
    },
    notifDdActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notifDdReadAll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    notifDdReadAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2D7B38',
    },
    notifDdClose: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifDdBody: {
        maxHeight: 260,
    },
    notifDdEmpty: {
        padding: 24,
        textAlign: 'center',
        color: '#64748B',
        fontSize: 13,
    },
    notifDdItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    notifDdItemUnread: {
        backgroundColor: '#F4FBF5',
    },
    notifDdItemIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#C8E6C9',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    notifDdItemText: {
        flex: 1,
        flexDirection: 'column',
        gap: 2,
    },
    notifDdItemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notifDdItemTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    notifDdItemTime: {
        fontSize: 11,
        color: '#94A3B8',
    },
    notifDdItemSub: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
    },
    notifDdFooter: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    notifDdViewAllBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#2D7B38',
        paddingVertical: 11,
        borderRadius: 12,
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 3,
    },
    notifDdViewAllText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
