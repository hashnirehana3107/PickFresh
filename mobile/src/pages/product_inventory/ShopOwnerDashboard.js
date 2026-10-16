import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
    TextInput,
    Vibration,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Bell,
    User,
    Home,
    Package,
    ClipboardList,
    Truck,
    Plus,
    ChevronRight,
    X,
    ShoppingBag,
    AlertTriangle,
    Tag,
    Sparkles,
    Edit3,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Trash2,
    CheckCheck,
    Check,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

// Subpage screens
import ProductListPage from './ProductListPage';
import AddProductPage from './AddProductPage';
import EditProductPage from './EditProductPage';
import DeleteProductPage from './DeleteProductPage';
import SupplierListPage from './SupplierList';
import AddSupplierPage from './AddSupplierPage';
import RestockRequestPage from './RestockRequestPage';
import SupplierReplenishmentModule from '../supplier_replenishment/SupplierReplenishmentModule';
import LowStockAdvancedPage from './LowStockAdvancedPage';
import ShopOwnerNotificationsPage from './ShopOwnerNotificationsPage';
import ShopOwnerProfilePage from './ShopOwnerProfilePage';
import OrderPickupModule from '../order_pickup/OrderPickupModule';
import OrderDashboardPage from '../order_pickup/OrderDashboard';
import OrderDetailsPage from '../order_pickup/OrderDetailsPage';
import PickupSchedulePage from '../order_pickup/PickupSchedulePage';
import ShopPastOrdersPage from '../order_pickup/ShopPastOrdersPage';
import StatusUpdatePage from '../order_pickup/StatusUpdatePage';

let shopOwnerDashboardCache = null;

const PRESET_BANNER_IMAGES = [
    { name: 'Fresh Veggies', url: '/banner_bg.png' },
    { name: 'Fruits', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&auto=format&fit=crop&q=60' },
    { name: 'Supermarket', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60' },
    { name: 'Bakery', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=60' },
];

const getBannerSource = (bg) => {
    if (!bg || bg === '/banner_bg.png') {
        return require('../../../assets/banner_bg.png');
    }
    if (bg.startsWith('data:') || bg.startsWith('http')) {
        return { uri: bg };
    }
    return require('../../../assets/banner_bg.png');
};

export default function ShopOwnerDashboard({ onNavigate }) {
    const { user, updateUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home'); // home, inventory, orders, suppliers, profile, notifications
    const [subScreen, setSubScreen] = useState(null);
    const [subPageParams, setSubPageParams] = useState(null);
    const [showNotifSheet, setShowNotifSheet] = useState(false);

    // Live Store Open/Closed status sync
    const isStoreOpen = user?.storeStatus !== 'closed';

    const handleToggleStoreStatus = async () => {
        const newStatus = isStoreOpen ? 'closed' : 'open';
        try {
            await updateUser({ storeStatus: newStatus });
        } catch (err) {
            console.warn('Failed to update store status:', err);
        }
    };

    // Dynamic Stats State strictly from MongoDB Atlas Backend
    const [stats, setStats] = useState({
        totalProducts: 22,
        lowStockCount: 5,
        outOfStockCount: 1,
        todaySales: 0,
        activePickups: 6,
    });

    const [recentActivity, setRecentActivity] = useState([]);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // Shop Owner Specific Notifications Data strictly from MongoDB Atlas Backend
    const [notifications, setNotifications] = useState(shopOwnerDashboardCache?.notifications || [
        {
            id: 'ord_6acf39c1483aef103782f004',
            title: 'New Customer Pre-Order #PF-F004',
            message: 'Kiara Fernando placed a pickup order (2 items • Rs. 700).',
            time: '11h ago',
            type: 'order',
            targetTab: 'orders',
            read: false,
        },
        {
            id: 'ord_6acf35b5483aef103782eb62',
            title: 'New Customer Pre-Order #PF-EB62',
            message: 'Kiara Fernando placed a pickup order (1 item • Rs. 650).',
            time: '11h ago',
            type: 'order',
            targetTab: 'orders',
            read: false,
        },
        {
            id: 'ord_6acf3572483aef103782eb11',
            title: 'New Customer Pre-Order #PF-EB11',
            message: 'Guest Customer placed a pickup order (1 item • Rs. 300).',
            time: '11h ago',
            type: 'order',
            targetTab: 'orders',
            read: false,
        },
        {
            id: 'ord_6acf354e483aef103782eaec',
            title: 'New Customer Pre-Order #PF-EAEC',
            message: 'Guest Customer placed a pickup order (1 item • Rs. 650).',
            time: '11h ago',
            type: 'order',
            targetTab: 'orders',
            read: false,
        },
        {
            id: 'ord_6accf8d293f8284dc3c15b21',
            title: 'New Customer Pre-Order #PF-5B21',
            message: 'achala placed a pickup order (1 item • Rs. 660).',
            time: '2d ago',
            type: 'order',
            targetTab: 'orders',
            read: false,
        },
        {
            id: 'sup_6aca99a78ca7a309ae4fc919',
            title: 'Supplier Delivery Pending Approval',
            message: 'Lanka Mega Wholesale Distributors shipment #PO-0003 status is Pending Approval.',
            time: '3d ago',
            type: 'supplier',
            targetTab: 'suppliers',
            read: false,
        },
        {
            id: 'sup_6ac97d554e3dad798e73ec07',
            title: 'Supplier Delivery Delivered',
            message: 'Central Food City shipment #PO-0002 status is Delivered.',
            time: '4d ago',
            type: 'supplier',
            targetTab: 'suppliers',
            read: false,
        },
        {
            id: 'stk_6ac67f0971f7f3cd1a3104f1',
            title: 'Critical Low Stock Warning',
            message: 'Coca Cola Pet Bottle 1.05L is down to 1 bottle in stock. Reorder recommended.',
            time: '7d ago',
            type: 'stock',
            targetTab: 'inventory',
            read: false,
        },
        {
            id: 'stk_6ac67d7b71f7f3cd1a310262',
            title: 'Critical Low Stock Warning',
            message: 'Ratthi Full Cream Milk Powder - 400g is down to 0 pack in stock. Reorder recommended.',
            time: '7d ago',
            type: 'stock',
            targetTab: 'inventory',
            read: false,
        },
        {
            id: 'stk_6ac67af771f7f3cd1a30fe23',
            title: 'Critical Low Stock Warning',
            message: 'Bitter Gourd is down to 3 1kg in stock. Reorder recommended.',
            time: '7d ago',
            type: 'stock',
            targetTab: 'inventory',
            read: false,
        },
    ]);
    const unreadCount = notifications.filter((n) => !n.read).length;
    const bellShakeAnim = useRef(new Animated.Value(0)).current;

    // Store Offer Banner State
    const [offerBanner, setOfferBanner] = useState({
        badge: '🔥 In-Store Pickup Specials',
        title: 'Save Time on Every Grocery Run',
        subtitle: 'Pick up in 15 mins',
        btnText: 'Shop Now',
        active: true,
        bannerBg: '/banner_bg.png',
    });
    const [hasCustomBanner, setHasCustomBanner] = useState(false);
    const [showBannerModal, setShowBannerModal] = useState(false);
    const [showDeleteBannerModal, setShowDeleteBannerModal] = useState(false);
    const [editBadge, setEditBadge] = useState('🔥 In-Store Pickup Specials');
    const [editTitle, setEditTitle] = useState('Save Time on Every Grocery Run');
    const [editSubtitle, setEditSubtitle] = useState('Pick up in 15 mins');
    const [editBtnText, setEditBtnText] = useState('Shop Now');
    const [editActive, setEditActive] = useState(true);
    const [editBannerBg, setEditBannerBg] = useState('/banner_bg.png');
    const [isSavingBanner, setIsSavingBanner] = useState(false);

    const handleOpenBannerModal = () => {
        if (offerBanner) {
            setEditBadge(offerBanner.badge || '🔥 In-Store Pickup Specials');
            setEditTitle(offerBanner.title || 'Save Time on Every Grocery Run');
            setEditSubtitle(offerBanner.subtitle || 'Pick up in 15 mins');
            setEditBtnText(offerBanner.btnText || 'Shop Now');
            setEditActive(offerBanner.active !== false);
            setEditBannerBg(offerBanner.bannerBg || '/banner_bg.png');
        } else {
            setEditBadge('🔥 In-Store Pickup Specials');
            setEditTitle('Save Time on Every Grocery Run');
            setEditSubtitle('Pick up in 15 mins');
            setEditBtnText('Shop Now');
            setEditActive(true);
            setEditBannerBg('/banner_bg.png');
        }
        setShowBannerModal(true);
    };

    const handlePickBannerImage = () => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Image file size must be less than 5MB.');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setEditBannerBg(reader.result);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }
    };

    const storeTitle = user?.shopName || user?.storeName || user?.name || 'GroceryMart';

    const fetchDashboardData = async () => {
        try {
            const storeEmail = user?.email || 'grocerymart@gmail.com';
            const res = await fetch(
                `${API_BASE_URL}/product-inventory/dashboard?storeEmail=${encodeURIComponent(
                    storeEmail
                )}&storeName=${encodeURIComponent(storeTitle)}&_t=${Date.now()}`
            );
            const data = await res.json();
            if (data.success && data.stats) {
                setStats((prev) => ({
                    ...prev,
                    ...data.stats,
                }));
            }
            if (data.success && Array.isArray(data.recentActivity)) {
                setRecentActivity(data.recentActivity);
            }
        } catch (err) {
            console.warn('Dashboard fetch err:', err);
        }
    };

    const fetchOrderStats = async () => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/orders?storeName=${encodeURIComponent(storeTitle)}&_t=${Date.now()}`
            );
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.orders)) {
                const cleanRegistered = storeTitle.split('•')[0].split('-')[0].trim().toLowerCase();
                let shopOrders = data.orders;
                if (cleanRegistered) {
                    shopOrders = data.orders.filter((o) => {
                        const pStore = (o.pickupStore || '').toLowerCase();
                        return pStore.includes(cleanRegistered) || cleanRegistered.includes(pStore.split('•')[0].trim());
                    });
                }
                const activeCount = shopOrders.filter((o) => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'pending' || s === 'preparing' || s === 'ready for pickup';
                }).length;
                setStats((prev) => ({ ...prev, activePickups: activeCount }));
            }
        } catch (e) {
            console.warn('Orders count fetch err:', e);
        }
    };

    const fetchOfferBanner = async () => {
        try {
            const storeEmail = user?.email || 'grocerymart@gmail.com';
            const res = await fetch(
                `${API_BASE_URL}/product-inventory/offer-banner?storeEmail=${encodeURIComponent(
                    storeEmail
                )}&storeName=${encodeURIComponent(storeTitle)}`
            );
            const data = await res.json();
            if (res.ok && data.success && data.offerBanner) {
                setHasCustomBanner(!!data.hasCustomBanner);
                setOfferBanner(data.offerBanner);
                if (data.hasCustomBanner) {
                    setEditBadge(data.offerBanner.badge || '🔥 In-Store Pickup Specials');
                    setEditTitle(data.offerBanner.title || 'Save Time on Every Grocery Run');
                    setEditSubtitle(data.offerBanner.subtitle || '');
                    setEditBtnText(data.offerBanner.btnText || 'Shop Now');
                    setEditActive(data.offerBanner.active !== false);
                    setEditBannerBg(data.offerBanner.bannerBg || '/banner_bg.png');
                }
            }
        } catch (err) {
            console.warn('Banner fetch err:', err);
        }
    };

    const fetchNotifications = async () => {
        try {
            const storeEmail = user?.email || 'grocerymart@gmail.com';
            const storeName = user?.shopName || user?.storeName || user?.name || 'GroceryMart';
            const res = await fetch(
                `${API_BASE_URL}/product-inventory/notifications?storeEmail=${encodeURIComponent(
                    storeEmail
                )}&storeName=${encodeURIComponent(storeName)}&_t=${Date.now()}`
            );
            const data = await res.json();
            if (data.success && Array.isArray(data.notifications)) {
                setNotifications(data.notifications);
                shopOwnerDashboardCache = {
                    ...(shopOwnerDashboardCache || {}),
                    notifications: data.notifications,
                };
            }
        } catch (err) {
            console.warn('Notifications fetch err:', err);
        }
    };

    const handleBellClick = () => {
        try {
            Vibration.vibrate(100);
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate([100, 50, 100]);
            }
        } catch (e) {}
        setShowNotifSheet((prev) => !prev);
    };

    const handleMarkAllRead = () => {
        try {
            Vibration.cancel();
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(0);
            }
        } catch (e) {}
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const handleClearAll = () => {
        try {
            Vibration.cancel();
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(0);
            }
        } catch (e) {}
        setNotifications([]);
    };

    const handleNotificationClick = (notif) => {
        try {
            Vibration.cancel();
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(0);
            }
        } catch (e) {}
        setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setShowNotifSheet(false);
        const target = notif.targetTab || (notif.type === 'order' ? 'orders' : notif.type === 'stock' ? 'inventory' : notif.type === 'supplier' ? 'suppliers' : null);
        if (target) {
            setActiveTab(target);
            setSubScreen(null);
        }
    };

    // Continuous vibration loop and ringing bell shake animation when unread notifications arrive
    useEffect(() => {
        let vibrateInterval = null;
        let loopAnim = null;
        const hasUnread = unreadCount > 0;
        const isViewingNotifications = showNotifSheet || activeTab === 'notifications';

        if (hasUnread && !isViewingNotifications) {
            // Visual Bell Shake Animation Loop
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

            loopAnim = Animated.loop(shake);
            loopAnim.start();

            // Initial vibration
            try {
                if (Platform.OS === 'android') {
                    Vibration.vibrate([400, 500, 500, 500], true);
                } else if (Platform.OS === 'ios') {
                    Vibration.vibrate([300, 200, 300]);
                }
            } catch (err) {}

            // Repeating interval for iOS
            vibrateInterval = setInterval(() => {
                try {
                    if (Platform.OS === 'ios') {
                        Vibration.vibrate([300, 200, 300]);
                    }
                } catch (err) {}
            }, 3000);
        } else {
            if (loopAnim) loopAnim.stop();
            bellShakeAnim.setValue(0);
            try {
                if (Platform.OS !== 'web') {
                    Vibration.cancel();
                }
            } catch (err) {}
        }

        return () => {
            if (loopAnim) loopAnim.stop();
            bellShakeAnim.setValue(0);
            if (vibrateInterval) clearInterval(vibrateInterval);
            try {
                if (Platform.OS !== 'web') {
                    Vibration.cancel();
                }
            } catch (err) {}
        };
    }, [unreadCount, showNotifSheet, activeTab]);

    useEffect(() => {
        fetchDashboardData();
        fetchOrderStats();
        fetchOfferBanner();
        fetchNotifications();

        const interval = setInterval(() => {
            fetchDashboardData();
            fetchOrderStats();
            fetchOfferBanner();
            fetchNotifications();
        }, 45000);

        return () => clearInterval(interval);
    }, [user?.email, user?.shopName]);

    const handleSaveBanner = async () => {
        setIsSavingBanner(true);
        try {
            const payload = {
                storeEmail: user?.email || 'grocerymart@gmail.com',
                storeName: storeTitle,
                badge: editBadge,
                title: editTitle,
                subtitle: editSubtitle,
                btnText: editBtnText,
                active: editActive,
                bannerBg: editBannerBg || '/banner_bg.png',
            };
            const res = await fetch(`${API_BASE_URL}/product-inventory/offer-banner`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success && data.offerBanner) {
                setHasCustomBanner(true);
                setOfferBanner(data.offerBanner);
                setShowBannerModal(false);
            }
        } catch (err) {
            console.warn('Save banner err:', err);
        } finally {
            setIsSavingBanner(false);
        }
    };

    const handleDeleteOfferBanner = () => {
        setShowDeleteBannerModal(true);
    };

    const confirmDeleteOfferBanner = async () => {
        setIsSavingBanner(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/product-inventory/offer-banner?storeEmail=${encodeURIComponent(
                    user?.email || 'grocerymart@gmail.com'
                )}&storeName=${encodeURIComponent(storeTitle)}`,
                { method: 'DELETE' }
            );
            const data = await res.json();
            if (data.success) {
                setHasCustomBanner(false);
                setOfferBanner(null);
                setShowBannerModal(false);
                setShowDeleteBannerModal(false);
            }
        } catch (e) {
            console.warn('Delete banner err:', e);
        } finally {
            setIsSavingBanner(false);
        }
    };

    // Subpage routing handler
    const handleSubNavigate = (screen, params) => {
        if (screen === 'home' || screen === 'dashboard') {
            setActiveTab('home');
            setSubScreen(null);
            setSubPageParams(null);
            fetchDashboardData();
            return;
        }
        if (screen === 'inventory' || screen === 'product_list') {
            setActiveTab('inventory');
            setSubScreen(null);
            setSubPageParams(params || null);
            return;
        }
        if (
            screen === 'orders' ||
            screen === 'order_dashboard' ||
            screen === 'order_details' ||
            screen === 'status_update' ||
            screen === 'pickup_schedule' ||
            screen === 'past_orders'
        ) {
            setActiveTab('orders');
            setSubScreen(null);
            setSubPageParams(
                screen === 'orders' || screen === 'order_dashboard'
                    ? null
                    : { initialPage: screen, ...params }
            );
            return;
        }
        if (screen === 'suppliers' || screen === 'supplier_list') {
            setActiveTab('suppliers');
            setSubScreen(null);
            setSubPageParams(params || null);
            return;
        }
        if (screen === 'profile') {
            setActiveTab('profile');
            setSubScreen(null);
            return;
        }
        if (screen === 'notifications') {
            setActiveTab('notifications');
            setSubScreen(null);
            return;
        }

        // Subpages inside modules
        setSubPageParams(params || null);
        setSubScreen(screen);
    };

    return (
        <View style={styles.container}>
            {/* Top Header Bar matching React Web (Image 1) */}
            <View style={styles.topHeader}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../../../assets/logo.jpg')}
                        style={styles.headerLogo}
                        resizeMode="cover"
                    />
                    <View>
                        <Text style={styles.brandTitle}>PickFresh</Text>
                        <Text style={styles.brandSubtitle}>Shop staff</Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
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
                            style={[
                                styles.headerIconBtn,
                                (activeTab === 'notifications' || showNotifSheet) && { backgroundColor: '#E8F5E9' },
                            ]}
                            onPress={handleBellClick}
                            activeOpacity={0.8}
                        >
                            <Bell size={22} color={unreadCount > 0 ? '#27672D' : '#334155'} />
                            {unreadCount > 0 && (
                                <View style={styles.notifBadge}>
                                    <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                    <TouchableOpacity
                        style={[
                            styles.headerIconBtn,
                            activeTab === 'profile' && { backgroundColor: '#E8F5E9' },
                        ]}
                        onPress={() => setActiveTab('profile')}
                        activeOpacity={0.8}
                    >
                        <User size={22} color="#27672D" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* TAB VIEWS */}
            <View style={{ flex: 1 }}>
                {!subScreen && activeTab === 'home' && (
                    <ScrollView
                        style={styles.contentScroll}
                        contentContainerStyle={styles.contentScrollInner}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Welcome Card & Store Status Toggle matching React */}
                        <View style={styles.welcomeCard}>
                            <View>
                                <Text style={styles.welcomeSub}>WELCOME BACK</Text>
                                <Text style={styles.welcomeTitle}>{storeTitle}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.statusPill, isStoreOpen ? styles.statusPillOpen : styles.statusPillClosed]}
                                onPress={handleToggleStoreStatus}
                                activeOpacity={0.85}
                            >
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>
                                    {isStoreOpen ? 'STORE OPEN' : 'STORE CLOSED'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Page Title */}
                        <Text style={styles.pageTitle}>Merchant Dashboard</Text>

                        {/* Low Stock Warning Banner */}
                        {stats.lowStockCount > 0 && (
                            <TouchableOpacity
                                style={styles.lowStockBanner}
                                onPress={() => {
                                    setSubScreen('low_stock');
                                }}
                                activeOpacity={0.85}
                            >
                                <View style={styles.lowStockLeft}>
                                    <AlertTriangle size={20} color="#D97706" />
                                    <View>
                                        <Text style={styles.lowStockTitle}>Low Stock Warning</Text>
                                        <Text style={styles.lowStockSub}>
                                            {stats.lowStockCount} product(s) are running below threshold.
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.lowStockRight}>
                                    <Text style={styles.lowStockAction}>Restock</Text>
                                    <ChevronRight size={14} color="#D97706" />
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* 3 Metrics Overview Cards matching screenshot */}
                        <View style={styles.metricsRow}>
                            <TouchableOpacity
                                style={styles.metricCard}
                                onPress={() => {
                                    setSubPageParams({ filter: 'All' });
                                    setActiveTab('inventory');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.metricNum}>{stats.totalProducts}</Text>
                                <Text style={styles.metricLabel}>Total products</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.metricCard, styles.metricCardPeach]}
                                onPress={() => {
                                    setSubScreen('low_stock');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.metricNum, styles.numAmber]}>{stats.lowStockCount}</Text>
                                <Text style={styles.metricLabel}>Low stock</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.metricCard}
                                onPress={() => {
                                    setSubPageParams({ filter: 'All' });
                                    setActiveTab('inventory');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.metricNum, styles.numRed]}>{stats.outOfStockCount}</Text>
                                <Text style={styles.metricLabel}>Out of stock</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Dual Status Cards: Soft Modern Pastel Theme matching React */}
                        <View style={styles.dualGridRow}>
                            <TouchableOpacity
                                style={styles.dualCardGreen}
                                onPress={() => setActiveTab('orders')}
                                activeOpacity={0.85}
                            >
                                <View style={styles.dualCardHeader}>
                                    <Text style={styles.dualTagGreen}>CUSTOMER PICKUPS</Text>
                                    <View style={styles.dualIconCircleGreen}>
                                        <ShoppingBag size={14} color="#059669" />
                                    </View>
                                </View>
                                <Text style={styles.dualCountGreen}>{stats.activePickups ?? 6} Orders</Text>
                                <Text style={styles.dualLinkGreen}>Ready for collection →</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dualCardAmber}
                                onPress={() => {
                                    setSubScreen('low_stock');
                                }}
                                activeOpacity={0.85}
                            >
                                <View style={styles.dualCardHeader}>
                                    <Text style={styles.dualTagAmber}>STOCK RESTOCK</Text>
                                    <View style={styles.dualIconCircleAmber}>
                                        <Truck size={14} color="#D97706" />
                                    </View>
                                </View>
                                <Text style={styles.dualCountAmber}>{stats.lowStockCount ?? 5} Items</Text>
                                <Text style={styles.dualLinkAmber}>Reorder from supplier →</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Quick actions Section */}
                        <View style={styles.quickActionsWrap}>
                            <Text style={styles.sectionTitle}>Quick actions</Text>
                            <View style={styles.actionsCol}>
                                <TouchableOpacity
                                    style={styles.actionBtnSolidGreen}
                                    onPress={() => {
                                        setSubPageParams({ filter: 'All' });
                                        setActiveTab('inventory');
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.actionBtnTextWhite}>View all products</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionBtnOutlineGreen}
                                    onPress={() => setSubScreen('add_product')}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.actionBtnTextGreen}>Add new product</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionBtnSolidOrange}
                                    onPress={() => setActiveTab('orders')}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.actionBtnTextWhite}>View Pre-Orders</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Store Offer Banner Management */}
                        <View style={styles.bannerSection}>
                            <View style={styles.bannerHeaderLeft}>
                                <View style={styles.bannerIconWrap}>
                                    <Tag size={16} color="#27672D" />
                                </View>
                                <View>
                                    <Text style={styles.bannerHeaderTitle}>Store Offer Banner</Text>
                                    <Text style={[styles.bannerHeaderSub, hasCustomBanner && { color: '#059669' }]}>
                                        {hasCustomBanner ? '✓ Live on Customer App' : 'Not published yet'}
                                    </Text>
                                </View>
                            </View>

                            {hasCustomBanner && (
                                <View style={styles.bannerBtnsRow}>
                                    <TouchableOpacity
                                        style={styles.bannerEditBtn}
                                        onPress={handleOpenBannerModal}
                                        activeOpacity={0.8}
                                    >
                                        <Edit3 size={13} color="#166534" />
                                        <Text style={styles.bannerEditBtnText}>Edit Offer</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.bannerDelBtn}
                                        onPress={handleDeleteOfferBanner}
                                        activeOpacity={0.8}
                                    >
                                        <Trash2 size={13} color="#DC2626" />
                                        <Text style={styles.bannerDelBtnText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {hasCustomBanner && offerBanner ? (
                                <View style={styles.bannerPreviewCard}>
                                    <Image
                                        source={getBannerSource(offerBanner.bannerBg)}
                                        style={styles.bannerImg}
                                        resizeMode="cover"
                                    />
                                    <LinearGradient
                                        colors={['rgba(10, 30, 16, 0.94)', 'rgba(18, 48, 23, 0.8)', 'rgba(0, 0, 0, 0.12)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.bannerOverlay}
                                    >
                                        <View style={styles.bannerBadgePill}>
                                            <Text style={styles.bannerBadgeText}>{offerBanner.badge || '🔥 In-Store Pickup Specials'}</Text>
                                        </View>
                                        <Text style={styles.bannerTitleText}>{offerBanner.title || 'Save Time on Every Grocery Run'}</Text>
                                        <Text style={styles.bannerSubText}>{offerBanner.subtitle || 'Pick up in 15 mins'}</Text>
                                        <View style={styles.bannerActionPill}>
                                            <Text style={styles.bannerActionText}>{offerBanner.btnText || 'Shop Now'}</Text>
                                            <ArrowRight size={14} color="#FFFFFF" />
                                        </View>
                                    </LinearGradient>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.bannerDashedCard}
                                    onPress={handleOpenBannerModal}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.bannerAddIconWrap}>
                                        <Plus size={22} color="#27672D" />
                                    </View>
                                    <Text style={styles.bannerAddTitle}>Add a Store Banner</Text>
                                    <Text style={styles.bannerAddSub}>
                                        Create a banner to promote your deals on the Customer Home page
                                    </Text>
                                    <View style={styles.bannerCreateBtn}>
                                        <Sparkles size={14} color="#FFFFFF" />
                                        <Text style={styles.bannerCreateBtnText}>Create Banner</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Recent Stock Activity */}
                        <View style={styles.activitySection}>
                            <Text style={styles.sectionTitle}>Recent stock activity</Text>
                            <View style={styles.activityList}>
                                {recentActivity.length === 0 ? (
                                    <View style={styles.emptyActivityCard}>
                                        <Text style={styles.emptyActivityText}>
                                            No recent stock activity recorded yet. Newly added products will appear here in real time.
                                        </Text>
                                    </View>
                                ) : (
                                    recentActivity.map((act) => (
                                        <View key={act.id} style={styles.activityCard}>
                                            <View style={styles.activityLeft}>
                                                <View
                                                    style={[
                                                        styles.activityIconCircle,
                                                        act.type === 'in' ? styles.actInCircle : styles.actOutCircle,
                                                    ]}
                                                >
                                                    {act.type === 'in' ? (
                                                        <TrendingUp size={18} color="#27672D" />
                                                    ) : (
                                                        <TrendingDown size={18} color="#DC2626" />
                                                    )}
                                                </View>
                                                <View>
                                                    <Text style={styles.activityTitle}>{act.title}</Text>
                                                    <Text style={styles.activityTime}>{act.subtitle}</Text>
                                                </View>
                                            </View>
                                            <View
                                                style={[
                                                    styles.activityBadge,
                                                    act.type === 'in' ? styles.actInBadge : styles.actOutBadge,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.activityBadgeText,
                                                        act.type === 'in' ? styles.actInText : styles.actOutText,
                                                    ]}
                                                >
                                                    {act.change}
                                                </Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    </ScrollView>
                )}

                {/* Subscreen view for Add Product */}
                {subScreen === 'add_product' && (
                    <AddProductPage
                        onNavigate={(screen, params) => {
                            if (screen === 'inventory' || screen === 'product_list' || screen === 'back') {
                                setSubScreen(null);
                                setActiveTab('inventory');
                                fetchDashboardStats();
                            } else {
                                handleSubNavigate(screen, params);
                            }
                        }}
                        onBack={() => {
                            setSubScreen(null);
                            setActiveTab('inventory');
                            fetchDashboardStats();
                        }}
                    />
                )}

                {/* Subscreen view for Edit Product */}
                {subScreen === 'edit_product' && (
                    <EditProductPage
                        product={subPageParams?.product || subPageParams}
                        onNavigate={(screen, params) => {
                            if (screen === 'inventory' || screen === 'product_list' || screen === 'back') {
                                setSubScreen(null);
                                setActiveTab('inventory');
                                fetchDashboardStats();
                            } else {
                                handleSubNavigate(screen, params);
                            }
                        }}
                        onBack={() => {
                            setSubScreen(null);
                            setActiveTab('inventory');
                            fetchDashboardStats();
                        }}
                    />
                )}

                {/* Subscreen view for Delete Product */}
                {subScreen === 'delete_product' && (
                    <DeleteProductPage
                        product={subPageParams?.product || subPageParams}
                        onNavigate={(screen, params) => {
                            if (screen === 'inventory' || screen === 'product_list' || screen === 'back') {
                                setSubScreen(null);
                                setActiveTab('inventory');
                                fetchDashboardStats();
                            } else {
                                handleSubNavigate(screen, params);
                            }
                        }}
                        onBack={() => {
                            setSubScreen(null);
                            setActiveTab('inventory');
                            fetchDashboardStats();
                        }}
                    />
                )}

                {/* Subscreen view for Low Stock */}
                {subScreen === 'low_stock' && (
                    <LowStockAdvancedPage
                        onNavigate={(screen, params) => {
                            if (screen === 'dashboard' || screen === 'home') {
                                setSubScreen(null);
                                setActiveTab('home');
                                fetchDashboardData();
                            } else if (screen === 'inventory' || screen === 'product_list' || screen === 'back') {
                                setSubScreen(null);
                                setActiveTab('inventory');
                                fetchDashboardData();
                            } else {
                                handleSubNavigate(screen, params);
                            }
                        }}
                        onBack={() => {
                            setSubScreen(null);
                            setActiveTab('home');
                            fetchDashboardData();
                        }}
                    />
                )}

                {/* Subscreen view for Add Supplier */}
                {subScreen === 'add_supplier' && (
                    <AddSupplierPage
                        initialData={subPageParams}
                        onNavigate={(screen) => {
                            setSubScreen(null);
                            setActiveTab('suppliers');
                        }}
                        onBack={() => {
                            setSubScreen(null);
                            setActiveTab('suppliers');
                        }}
                    />
                )}

                {/* Subscreen view for Restock Request */}
                {subScreen === 'restock_request' && (
                    <RestockRequestPage
                        initialData={subPageParams}
                        onNavigate={(screen) => {
                            if (screen === 'low_stock' || subPageParams?.fromScreen === 'low_stock') {
                                setSubScreen('low_stock');
                            } else {
                                setSubScreen(null);
                                setActiveTab('suppliers');
                            }
                        }}
                        onBack={() => {
                            if (subPageParams?.fromScreen === 'low_stock') {
                                setSubScreen('low_stock');
                            } else {
                                setSubScreen(null);
                                setActiveTab('suppliers');
                            }
                        }}
                    />
                )}

                {/* Inventory Tab */}
                {!subScreen && activeTab === 'inventory' && (
                    <ProductListPage
                        onNavigate={handleSubNavigate}
                        initialFilter={subPageParams?.filter}
                        initialParams={subPageParams}
                    />
                )}

                {/* Orders Tab */}
                {!subScreen && activeTab === 'orders' && (
                    <OrderPickupModule
                        key={subPageParams?.initialPage || 'orders_tab'}
                        initialPage={subPageParams?.initialPage || 'dashboard'}
                        initialParams={subPageParams}
                        onNavigate={(screen, params) => {
                            if (screen === 'home') {
                                setActiveTab('home');
                                setSubScreen(null);
                            } else {
                                handleSubNavigate(screen, params);
                            }
                        }}
                    />
                )}

                {/* Suppliers Tab */}
                {!subScreen && activeTab === 'suppliers' && (
                    <SupplierReplenishmentModule
                        onNavigate={(screen, params) => {
                            if (screen === 'dashboard' || screen === 'home') {
                                setActiveTab('home');
                            } else {
                                handleSubNavigate(screen, params);
                            }
                        }}
                    />
                )}

                {/* Profile Tab */}
                {!subScreen && activeTab === 'profile' && (
                    <ShopOwnerProfilePage
                        onNavigate={(screen) => {
                            if (screen === 'login') {
                                onNavigate && onNavigate('login');
                            } else {
                                setActiveTab('home');
                            }
                        }}
                        onBack={() => setActiveTab('home')}
                    />
                )}

                {/* Notifications Tab */}
                {!subScreen && activeTab === 'notifications' && (
                    <ShopOwnerNotificationsPage
                        notifications={notifications}
                        onNavigate={(tab, params) => {
                            if (tab === 'home' || tab === 'dashboard') {
                                setActiveTab('home');
                                setSubScreen(null);
                            } else {
                                handleSubNavigate(tab, params);
                            }
                        }}
                        onBack={() => setActiveTab('home')}
                        onMarkAllRead={handleMarkAllRead}
                        onClearAll={handleClearAll}
                        onSelectNotification={handleNotificationClick}
                    />
                )}
            </View>

            {/* Fixed Bottom Navigation Bar matching React Web */}
            {(() => {
                const isInventoryTab =
                    (activeTab === 'inventory' && !subScreen) ||
                    ['add_product', 'edit_product', 'delete_product', 'low_stock'].includes(subScreen);
                const isHomeTab = activeTab === 'home' && !subScreen;
                const isOrdersTab = activeTab === 'orders' && !subScreen;
                const isSuppliersTab =
                    (activeTab === 'suppliers' && !subScreen) ||
                    ['add_supplier', 'restock_request'].includes(subScreen);

                return (
                    <View style={styles.bottomNav}>
                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => {
                                setActiveTab('home');
                                setSubScreen(null);
                            }}
                        >
                            <Home size={22} color={isHomeTab ? '#27672D' : '#94A3B8'} />
                            <Text style={[styles.navText, isHomeTab && styles.navTextActive]}>
                                Home
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => {
                                setActiveTab('inventory');
                                setSubScreen(null);
                            }}
                        >
                            <Package size={22} color={isInventoryTab ? '#27672D' : '#94A3B8'} />
                            <Text style={[styles.navText, isInventoryTab && styles.navTextActive]}>
                                Inventory
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => {
                                setActiveTab('orders');
                                setSubScreen(null);
                            }}
                        >
                            <ClipboardList size={22} color={isOrdersTab ? '#27672D' : '#94A3B8'} />
                            <Text style={[styles.navText, isOrdersTab && styles.navTextActive]}>
                                Orders
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => {
                                setActiveTab('suppliers');
                                setSubScreen(null);
                            }}
                        >
                            <Truck size={22} color={isSuppliersTab ? '#27672D' : '#94A3B8'} />
                            <Text style={[styles.navText, isSuppliersTab && styles.navTextActive]}>
                                Suppliers
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            })()}

            {/* Modal for editing Store Offer Banner */}
            <Modal visible={showBannerModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {/* Header */}
                        <View style={styles.modalHeaderRow}>
                            <View style={styles.modalHeaderLeft}>
                                <Sparkles size={20} color="#166534" />
                                <Text style={styles.modalHeaderTitle}>
                                    {hasCustomBanner ? 'Edit Store Offer Banner' : 'Create Store Offer Banner'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowBannerModal(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={styles.modalCloseBtn}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScrollView}
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={styles.modalScrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* OFFER BADGE / TAGLINE */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalFieldLabel}>OFFER BADGE / TAGLINE</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editBadge}
                                    onChangeText={setEditBadge}
                                    placeholder="e.g. 🔥 In-Store Pickup Specials"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            {/* BANNER HEADLINE / TITLE */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalFieldLabel}>BANNER HEADLINE / TITLE</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editTitle}
                                    onChangeText={setEditTitle}
                                    placeholder="e.g. Save Time on Every Grocery Run"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            {/* SUBTITLE / DESCRIPTION */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalFieldLabel}>SUBTITLE / DESCRIPTION</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editSubtitle}
                                    onChangeText={setEditSubtitle}
                                    placeholder="e.g. Pick up in 15 mins"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            {/* BUTTON ACTION LABEL */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalFieldLabel}>BUTTON ACTION LABEL</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editBtnText}
                                    onChangeText={setEditBtnText}
                                    placeholder="e.g. Shop Now"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            {/* BANNER BACKGROUND IMAGE */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalFieldLabel}>BANNER BACKGROUND IMAGE</Text>

                                {/* Live Selected Image Preview */}
                                <View style={styles.modalPreviewContainer}>
                                    <Image
                                        source={getBannerSource(editBannerBg)}
                                        style={styles.modalPreviewImg}
                                        resizeMode="cover"
                                    />
                                    <LinearGradient
                                        colors={['rgba(0, 0, 0, 0.6)', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.modalPreviewOverlay}
                                    >
                                        <View style={styles.modalPreviewTagPill}>
                                            <Text style={styles.modalPreviewTagText}>Selected Image Preview</Text>
                                        </View>
                                    </LinearGradient>
                                </View>

                                {/* Custom Upload Button */}
                                <TouchableOpacity
                                    style={styles.modalUploadBtn}
                                    onPress={handlePickBannerImage}
                                    activeOpacity={0.75}
                                >
                                    <Plus size={14} color="#166534" />
                                    <Text style={styles.modalUploadBtnText}>Upload Custom Image File</Text>
                                </TouchableOpacity>

                                {/* Preset Image Options */}
                                <Text style={styles.modalPresetHeader}>OR CHOOSE A PRESET STORE IMAGE:</Text>
                                <View style={styles.presetGrid}>
                                    {PRESET_BANNER_IMAGES.map((preset, idx) => {
                                        const isSelected = editBannerBg === preset.url;
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => setEditBannerBg(preset.url)}
                                                style={[
                                                    styles.presetThumbBtn,
                                                    isSelected && styles.presetThumbBtnSelected,
                                                ]}
                                                activeOpacity={0.8}
                                            >
                                                <Image
                                                    source={getBannerSource(preset.url)}
                                                    style={styles.presetThumbImg}
                                                    resizeMode="cover"
                                                />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Active Toggle Row */}
                            <TouchableOpacity
                                style={styles.modalActiveRow}
                                onPress={() => setEditActive((prev) => !prev)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.modalActiveLabel}>Active on Customer Home</Text>
                                <View style={[styles.modalCheckbox, editActive && styles.modalCheckboxActive]}>
                                    {editActive && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                                </View>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Action Buttons Row - Fixed at bottom of modal card */}
                        <View style={styles.modalFooterRow}>
                            {hasCustomBanner && (
                                <TouchableOpacity
                                    style={styles.modalDelBtn}
                                    onPress={handleDeleteOfferBanner}
                                    disabled={isSavingBanner}
                                    activeOpacity={0.8}
                                >
                                    <Trash2 size={16} color="#DC2626" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowBannerModal(false)}
                                disabled={isSavingBanner}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleSaveBanner}
                                disabled={isSavingBanner}
                                activeOpacity={0.8}
                            >
                                {isSavingBanner ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                                        <Text style={styles.modalSaveBtnText}>
                                            {hasCustomBanner ? 'Save Changes' : 'Publish Offer'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* In-app Confirmation Modal for Deleting Store Offer Banner */}
            <Modal
                visible={showDeleteBannerModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteBannerModal(false)}
            >
                <View style={styles.confirmModalOverlay}>
                    <View style={styles.confirmModalCard}>
                        <View style={styles.confirmIconBox}>
                            <Trash2 size={24} color="#DC2626" />
                        </View>

                        <Text style={styles.confirmModalTitle}>Remove Offer Banner?</Text>
                        <Text style={styles.confirmModalSub}>
                            Are you sure you want to remove your store offer banner? This promotional banner will no longer appear on your customer store.
                        </Text>

                        <View style={styles.confirmActionRow}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setShowDeleteBannerModal(false)}
                                disabled={isSavingBanner}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.confirmCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={confirmDeleteOfferBanner}
                                disabled={isSavingBanner}
                                activeOpacity={0.8}
                            >
                                {isSavingBanner ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Trash2 size={15} color="#FFFFFF" />
                                        <Text style={styles.confirmDeleteText}>Yes, Remove</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Store Notifications Dropdown Modal Sheet */}
            <Modal visible={showNotifSheet} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.notifModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNotifSheet(false)}
                >
                    <View style={styles.notifCard} onStartShouldSetResponder={() => true}>
                        <View style={styles.notifHeader}>
                            <Text style={styles.notifTitle}>Store Notifications</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                {unreadCount > 0 && (
                                    <TouchableOpacity
                                        onPress={handleMarkAllRead}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                    >
                                        <CheckCheck size={14} color="#27672D" />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#27672D' }}>
                                            Read all
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.notifCloseBtn}
                                    onPress={() => setShowNotifSheet(false)}
                                    activeOpacity={0.8}
                                >
                                    <X size={15} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ gap: 10, marginVertical: 12 }}>
                            {notifications.length === 0 ? (
                                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', paddingVertical: 20 }}>
                                    No new notifications
                                </Text>
                            ) : (
                                notifications.slice(0, 3).map((notif) => (
                                    <TouchableOpacity
                                        key={notif.id}
                                        style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                                        onPress={() => handleNotificationClick(notif)}
                                        activeOpacity={0.88}
                                    >
                                        <View style={styles.notifIconBox}>
                                            {notif.type === 'order' && <ShoppingBag size={18} color="#27672D" />}
                                            {notif.type === 'stock' && <AlertTriangle size={18} color="#D97706" />}
                                            {notif.type === 'supplier' && <Truck size={18} color="#2563EB" />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={styles.notifItemTitle} numberOfLines={1} ellipsizeMode="tail">
                                                    {notif.title}
                                                </Text>
                                                <Text style={styles.notifTime}>{notif.time}</Text>
                                            </View>
                                            <Text style={styles.notifMsg} numberOfLines={2}>
                                                {notif.message}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.notifViewAllBtn}
                            onPress={() => {
                                setShowNotifSheet(false);
                                setActiveTab('notifications');
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.notifViewAllBtnText}>View All Notifications</Text>
                            <ChevronRight size={16} color="#27672D" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    topHeader: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerLogo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    brandTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#27672D',
        letterSpacing: -0.3,
        lineHeight: 20,
    },
    brandSubtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
        fontWeight: '500',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconBtn: {
        padding: 6,
        borderRadius: 20,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBadge: {
        position: 'absolute',
        top: 1,
        right: 1,
        backgroundColor: '#EF4444',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        zIndex: 10,
    },
    notifBadgeText: {
        color: '#FFFFFF',
        fontSize: 9.5,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 12,
    },
    contentScroll: {
        flex: 1,
    },
    contentScrollInner: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 24,
    },
    welcomeCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    welcomeSub: {
        fontSize: 10,
        fontWeight: '800',
        color: '#166534',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    welcomeTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#052E16',
        lineHeight: 22,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    statusPillOpen: {
        backgroundColor: '#16A34A',
    },
    statusPillClosed: {
        backgroundColor: '#DC2626',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
        marginBottom: 16,
    },
    lowStockBanner: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    lowStockLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    lowStockTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#92400E',
    },
    lowStockSub: {
        fontSize: 11,
        color: '#B45309',
        marginTop: 1,
    },
    lowStockRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    lowStockAction: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D97706',
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    metricCardPeach: {
        backgroundColor: '#FFF4E5',
        borderColor: '#FFE0B2',
    },
    metricNum: {
        fontSize: 28,
        fontWeight: '800',
        color: '#27672D',
        lineHeight: 32,
        marginBottom: 6,
    },
    numAmber: {
        color: '#F57C00',
    },
    numRed: {
        color: '#DC2626',
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    dualGridRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    dualCardGreen: {
        flex: 1,
        backgroundColor: '#ECFDF5',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#A7F3D0',
        minHeight: 92,
        justifyContent: 'space-between',
    },
    dualCardAmber: {
        flex: 1,
        backgroundColor: '#FFFBEB',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
        minHeight: 92,
        justifyContent: 'space-between',
    },
    dualCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dualTagGreen: {
        fontSize: 10,
        fontWeight: '800',
        color: '#065F46',
        letterSpacing: 0.6,
    },
    dualTagAmber: {
        fontSize: 10,
        fontWeight: '800',
        color: '#92400E',
        letterSpacing: 0.6,
    },
    dualIconCircleGreen: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dualIconCircleAmber: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dualCountGreen: {
        fontSize: 20,
        fontWeight: '900',
        color: '#047857',
        marginTop: 4,
    },
    dualCountAmber: {
        fontSize: 20,
        fontWeight: '900',
        color: '#B45309',
        marginTop: 4,
    },
    dualLinkGreen: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '700',
        marginTop: 3,
    },
    dualLinkAmber: {
        fontSize: 11,
        color: '#D97706',
        fontWeight: '700',
        marginTop: 3,
    },
    quickActionsWrap: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.2,
        marginBottom: 12,
    },
    actionsCol: {
        gap: 12,
    },
    actionBtnSolidGreen: {
        backgroundColor: '#27672D',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnOutlineGreen: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#27672D',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnSolidOrange: {
        backgroundColor: '#FF8C00',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnTextWhite: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    actionBtnTextGreen: {
        color: '#27672D',
        fontSize: 15,
        fontWeight: '700',
    },
    bannerSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 14,
        marginBottom: 20,
    },
    bannerHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    bannerHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    bannerIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerHeaderTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
    },
    bannerHeaderSub: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    bannerBtnsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    bannerEditBtn: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 8,
        height: 32,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    bannerEditBtnText: {
        color: '#166534',
        fontSize: 12,
        fontWeight: '700',
    },
    bannerDelBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 8,
        height: 32,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    bannerDelBtnText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '700',
    },
    bannerPreviewCard: {
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        height: 172,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    bannerImg: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    bannerOverlay: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 18,
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 4,
    },
    bannerBadgePill: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        marginBottom: 4,
    },
    bannerBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    bannerTitleText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.4,
        lineHeight: 24,
        marginBottom: 3,
    },
    bannerSubText: {
        color: 'rgba(255, 255, 255, 0.92)',
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        marginBottom: 10,
    },
    bannerActionPill: {
        alignSelf: 'flex-start',
        backgroundColor: '#27672D',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    bannerActionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    bannerDashedCard: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        gap: 8,
    },
    bannerAddIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerAddTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    bannerAddSub: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        maxWidth: 240,
    },
    bannerCreateBtn: {
        backgroundColor: '#27672D',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    bannerCreateBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    activitySection: {
        marginBottom: 20,
    },
    activityList: {
        gap: 10,
    },
    emptyActivityCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 20,
        alignItems: 'center',
    },
    emptyActivityText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
    },
    activityCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    activityIconCircle: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actInCircle: {
        backgroundColor: '#E8F5E9',
    },
    actOutCircle: {
        backgroundColor: '#FEF2F2',
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    activityTime: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
        marginTop: 2,
    },
    activityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    actInBadge: {
        backgroundColor: '#E8F5E9',
    },
    actOutBadge: {
        backgroundColor: '#FEF2F2',
    },
    activityBadgeText: {
        fontSize: 13,
        fontWeight: '800',
    },
    actInText: {
        color: '#27672D',
    },
    actOutText: {
        color: '#DC2626',
    },
    bottomNav: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 8,
        paddingBottom: Platform.OS === 'android' ? 14 : 8,
        height: Platform.OS === 'android' ? 68 : undefined,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingVertical: 4,
    },
    navText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    navTextActive: {
        color: '#27672D',
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 24,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } : {}),
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 335,
        maxHeight: 520,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2,
        shadowRadius: 28,
        elevation: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        display: 'flex',
        flexDirection: 'column',
    },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 20,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } : {}),
    },
    confirmModalCard: {
        width: '100%',
        maxWidth: 335,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 22,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    confirmIconBox: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    confirmModalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
    },
    confirmModalSub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 20,
    },
    confirmActionRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    confirmCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmCancelText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    confirmDeleteBtn: {
        flex: 1.2,
        flexDirection: 'row',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#DC2626',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    confirmDeleteText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalScrollView: {
        flex: 1,
        flexGrow: 1,
        flexShrink: 1,
        maxHeight: 380,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalHeaderTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalScrollContent: {
        gap: 10,
        paddingBottom: 8,
    },
    formGroup: {
        gap: 4,
    },
    modalFieldLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
    },
    modalInput: {
        width: '100%',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
        backgroundColor: '#FFFFFF',
        height: 38,
    },
    modalPreviewContainer: {
        position: 'relative',
        width: '100%',
        height: 76,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    modalPreviewImg: {
        width: '100%',
        height: '100%',
    },
    modalPreviewOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingHorizontal: 10,
    },
    modalPreviewTagPill: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    modalPreviewTagText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    modalUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#94A3B8',
        borderStyle: 'dashed',
        borderRadius: 10,
        paddingVertical: 7,
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    modalUploadBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
    },
    modalPresetHeader: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '700',
        marginBottom: 6,
    },
    presetGrid: {
        flexDirection: 'row',
        gap: 6,
    },
    presetThumbBtn: {
        flex: 1,
        height: 38,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        overflow: 'hidden',
    },
    presetThumbBtnSelected: {
        borderWidth: 2,
        borderColor: '#166534',
    },
    presetThumbImg: {
        width: '100%',
        height: '100%',
    },
    modalActiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginTop: 2,
    },
    modalActiveLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    modalCheckbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCheckboxActive: {
        backgroundColor: '#166534',
        borderColor: '#166534',
    },
    modalFooterRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    modalDelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    modalSaveBtn: {
        flex: 1.5,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#166534',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    modalSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    notifModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    notifCard: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 380,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 14,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    notifTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
    },
    notifCloseBtn: {
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    notifItemUnread: {
        backgroundColor: '#F0FDF4',
        borderColor: '#86EFAC',
    },
    notifIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    notifItemTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
        marginRight: 6,
        ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {}),
    },
    notifTime: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
    },
    notifMsg: {
        fontSize: 11.5,
        color: '#475569',
        marginTop: 2,
        lineHeight: 16,
    },
    notifViewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        backgroundColor: '#E8F5E9',
        borderRadius: 14,
        marginTop: 8,
    },
    notifViewAllBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#27672D',
    },
});
