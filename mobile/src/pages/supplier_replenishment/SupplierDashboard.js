import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Modal,
    ActivityIndicator,
    Vibration,
    Platform,
    Animated,
} from 'react-native';
import {
    Home,
    Package,
    FileText,
    Store,
    Truck,
    Bell,
    User,
    Tag,
    Globe,
    MapPin,
    ChevronDown,
    Check,
    X,
    ExternalLink,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

// Subscreen imports
import SupplierCatalogScreen from './SupplierCatalogPage';
import ReplenishmentRequestsScreen from './ReplenishmentRequestsPage';
import RestockRequestDetailsScreen from './RestockRequestDetailsPage';
import StoreListScreen from './StoreListPage';
import DeliveryTrackingScreen from './DeliveryTrackingPage';
import SupplierNotificationsScreen from './SupplierNotificationsPage';
import SupplierProfileScreen from './SupplierProfilePage';

export default function SupplierDashboard({ onNavigate: topNav, initialTab = 'home' }) {
    const { user, logout } = useAuth();
    const userKey = user?.email || user?.supplierName || user?.name || 'anonymous';

    const [activeTab, setActiveTab] = useState(initialTab); // home, catalog, requests, stores, deliveries, notifications, profile
    const [subView, setSubView] = useState('list'); // list, details
    const [selectedPo, setSelectedPo] = useState(null);
    const [showNotifSheet, setShowNotifSheet] = useState(false);
    const [showCatMenu, setShowCatMenu] = useState(false);

    const [dashboardStats, setDashboardStats] = useState({
        storeClients: 0,
        pendingOrders: 0,
        deliveriesToday: 0,
    });
    const [latestAlert, setLatestAlert] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `${API_BASE_URL}/supplier-replenishment/dashboard?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();

            if (data.success && data.stats) {
                setDashboardStats({
                    storeClients: Number(data.stats.storeClients ?? 0),
                    pendingOrders: Number(data.stats.pendingOrders ?? 0),
                    deliveriesToday: Number(data.stats.deliveriesToday ?? 0),
                });
            }
            if (data.success && data.latestAlert) {
                setLatestAlert({
                    storeName: data.latestAlert.storeName || 'Store Client',
                    productName: data.latestAlert.productName || 'Stock threshold alert',
                    currentStock: Number(data.latestAlert.currentStock ?? 0),
                    suggestedReorder: Number(data.latestAlert.suggestedReorder ?? 20),
                });
            } else {
                setLatestAlert(null);
            }

            // Sync fresh profile and supplyCategories from MongoDB Atlas
            if (supplierEmail) {
                try {
                    const uRes = await fetch(`${API_BASE_URL}/auth/user-details?email=${encodeURIComponent(supplierEmail)}`);
                    const uData = await uRes.json();
                    if (uData.success && uData.user && updateUser) {
                        updateUser(uData.user);
                    }
                } catch (e) { }
            }
        } catch (err) {
            console.error('Backend API dashboard error:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `${API_BASE_URL}/supplier-replenishment/notifications?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.notifications)) {
                const notifs = data.notifications.map((n) => ({
                    id: n._id || n.id,
                    title: n.title,
                    message: n.message,
                    read: Boolean(n.read),
                    type: n.type || 'po',
                }));
                setNotifications(notifs);
            }
        } catch (err) {
            console.error('Fetch notifications error:', err.message);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        fetchNotifications();
        const interval = setInterval(() => {
            fetchDashboardData();
            fetchNotifications();
        }, 15000);
        return () => clearInterval(interval);
    }, [userKey]);

    const unreadCount = notifications.filter((n) => !n.read).length;
    const bellShakeAnim = useRef(new Animated.Value(0)).current;

    // Continuous Bell Shaking Animation & Vibration loop when unread notifications arrive
    useEffect(() => {
        let vibrateInterval = null;
        let loopAnim = null;
        const hasUnread = unreadCount > 0;
        const isViewingNotifications = showNotifSheet || activeTab === 'notifications';

        if (hasUnread && !isViewingNotifications) {
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

            const triggerVibration = () => {
                try {
                    if (Platform.OS !== 'web') {
                        Vibration.vibrate([0, 300, 150, 300], false);
                    }
                } catch (err) {}
            };

            triggerVibration();
            vibrateInterval = setInterval(triggerVibration, 2600);

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
        } else {
            if (loopAnim) loopAnim.stop();
            bellShakeAnim.setValue(0);
            try {
                if (Platform.OS !== 'web') {
                    Vibration.cancel();
                }
            } catch (err) {}
        }
    }, [unreadCount, showNotifSheet, activeTab]);

    const handleBellClick = () => {
        try {
            if (Platform.OS !== 'web') {
                Vibration.cancel();
            }
        } catch (e) {}
        setShowNotifSheet((prev) => !prev);
    };

    const handleMarkAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            await fetch(`${API_BASE_URL}/supplier-replenishment/notifications/mark-read`, { method: 'PUT' });
        } catch (e) {
            console.error('Failed to update read status on server:', e);
        }
    };

    const handleViewAllNotifications = () => {
        setShowNotifSheet(false);
        setActiveTab('notifications');
    };

    const handleLogout = () => {
        if (logout) logout();
        if (topNav) topNav('login');
    };

    const categoriesList = Array.isArray(user?.supplyCategories) && user.supplyCategories.length > 0
        ? user.supplyCategories
        : user?.supplyCategory
            ? user.supplyCategory.split(',').map((s) => s.trim()).filter(Boolean)
            : ['Dairy & Eggs', 'Fresh Produce (Vegetables & Fruits)', 'Soft Drinks', 'Bakery'];

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

    const isBottomNavVisible = true;

    return (
        <View style={styles.mainContainer}>
            {/* Top Bar Header matching React Web with PickFresh Logo, Bell & Profile */}
            <View style={styles.topHeader}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../../../assets/logo.jpg')}
                        style={styles.logoImg}
                        resizeMode="cover"
                    />
                    <View>
                        <Text style={styles.brandName}>PickFresh</Text>
                        <Text style={styles.brandSubtitle}>Replenishment</Text>
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
                            style={styles.iconBtn}
                            onPress={handleBellClick}
                            activeOpacity={0.7}
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
                            styles.iconBtn,
                            activeTab === 'profile' && styles.profileBtnActive,
                        ]}
                        onPress={() => setActiveTab('profile')}
                        activeOpacity={0.7}
                    >
                        <User size={22} color="#27672D" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Notifications Sheet Modal Overlay */}
            <Modal visible={showNotifSheet} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNotifSheet(false)}
                >
                    <View style={styles.notifSheetCard}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Supplier Notifications</Text>
                            <View style={styles.sheetHeaderActions}>
                                {unreadCount > 0 && (
                                    <TouchableOpacity onPress={handleMarkAllRead}>
                                        <Text style={styles.readAllText}>Read all</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setShowNotifSheet(false)}>
                                    <X size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                            {notifications.length === 0 ? (
                                <Text style={styles.noNotifsText}>No new notifications</Text>
                            ) : (
                                notifications.map((n) => (
                                    <View key={n.id} style={styles.notifItemBox}>
                                        <Text style={styles.notifItemTitle}>{n.title}</Text>
                                        <Text style={styles.notifItemMsg}>{n.message}</Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.viewAllNotifsBtn}
                            onPress={handleViewAllNotifications}
                        >
                            <Text style={styles.viewAllNotifsBtnText}>View all notifications</Text>
                            <ExternalLink size={14} color="#27672D" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Category Dropdown Modal */}
            <Modal visible={showCatMenu} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCatMenu(false)}
                >
                    <View style={styles.catDropdownCard}>
                        <Text style={styles.catDropdownHeader}>
                            Supplied Product Lines ({categoriesList.length})
                        </Text>
                        {categoriesList.map((cat, idx) => (
                            <View
                                key={idx}
                                style={[
                                    styles.catDropdownRow,
                                    idx === 0 && { backgroundColor: '#FEF3C7' },
                                ]}
                            >
                                <Check size={14} color="#B45309" />
                                <Text style={styles.catDropdownText}>{cat}</Text>
                            </View>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Main Viewport Content Area */}
            <View style={styles.viewportContent}>
                {activeTab === 'home' && (
                    <ScrollView
                        style={styles.homeScroll}
                        contentContainerStyle={styles.homeScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Welcome Greeting & Business Name */}
                        <View style={styles.welcomeSection}>
                            <Text style={styles.greetingText}>{greeting},</Text>
                            <Text style={styles.supplierTitle}>
                                {user?.supplierName || user?.name || 'Wholesale Supplier'}
                            </Text>

                            {/* Tags / Categories Chips Row */}
                            <View style={styles.chipsRow}>
                                <View style={styles.primaryCatChip}>
                                    <Tag size={12} color="#B45309" />
                                    <Text style={styles.primaryCatChipText}>
                                        {categoriesList[0] || 'Dairy & Eggs'}
                                    </Text>
                                </View>

                                {categoriesList.length > 1 && (
                                    <TouchableOpacity
                                        style={styles.moreCatsBtn}
                                        onPress={() => setShowCatMenu(true)}
                                    >
                                        <Text style={styles.moreCatsBtnText}>
                                            +{categoriesList.length - 1} More Categories
                                        </Text>
                                        <ChevronDown size={13} color="#B45309" />
                                    </TouchableOpacity>
                                )}

                                <View style={styles.regionChip}>
                                    {(user?.supplyRegion || user?.location || '').includes('Islandwide') || true ? (
                                        <>
                                            <Globe size={12} color="#15803D" />
                                            <Text style={styles.regionChipTextGreen}>Islandwide Supply Partner</Text>
                                        </>
                                    ) : (
                                        <>
                                            <MapPin size={12} color="#15803D" />
                                            <Text style={styles.regionChipText}>{user?.supplyRegion || user?.location || 'Colombo 03'}</Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* 3 Metric Stat Cards Row connected to MongoDB Atlas */}
                        <Text style={styles.sectionTitle}>Overview</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <Text style={styles.statNum}>{dashboardStats.storeClients}</Text>
                                <Text style={styles.statLabel}>Store Clients</Text>
                            </View>

                            <View style={styles.statCard}>
                                <Text style={styles.statNum}>{dashboardStats.pendingOrders}</Text>
                                <Text style={styles.statLabel}>Pending Orders</Text>
                            </View>

                            <View style={styles.statCard}>
                                <Text style={[styles.statNum, styles.statNumAmber]}>
                                    {dashboardStats.deliveriesToday}
                                </Text>
                                <Text style={styles.statLabel}>Deliveries Today</Text>
                            </View>
                        </View>

                        {/* Action Buttons Stack */}
                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick Actions</Text>
                        <View style={styles.actionsStack}>
                            <TouchableOpacity
                                style={styles.actionBtnSolid}
                                onPress={() => setActiveTab('requests')}
                                activeOpacity={0.8}
                            >
                                <FileText size={18} color="#FFFFFF" />
                                <Text style={styles.actionBtnSolidText}>View replenishment requests</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionBtnOutline}
                                onPress={() => setActiveTab('deliveries')}
                                activeOpacity={0.8}
                            >
                                <Truck size={18} color="#27672D" />
                                <Text style={styles.actionBtnOutlineText}>Track Active Deliveries</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Latest Alert Section matching Image 1 */}
                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Latest alert</Text>
                        {latestAlert?.productName ? (
                            <View style={styles.alertCard}>
                                <Text style={styles.alertStore}>{latestAlert.storeName || 'GroceryMart'}</Text>
                                {(() => {
                                    const rawStr = latestAlert.productName || '';
                                    const items = rawStr
                                        .replace(/\s*restock alert\s*$/i, '')
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter(Boolean);

                                    if (items.length > 1) {
                                        return (
                                            <View style={styles.alertItemsList}>
                                                {items.map((prod, idx) => (
                                                    <View key={idx} style={styles.alertItemRow}>
                                                        <Text style={styles.alertItemDot}>•</Text>
                                                        <Text style={styles.alertItemName}>{prod}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        );
                                    }
                                    return <Text style={styles.alertProduct}>{rawStr}</Text>;
                                })()}
                                <Text style={styles.alertDetails}>
                                    Current stock: {latestAlert.currentStock ?? 4} • Suggested reorder: {latestAlert.suggestedReorder ?? 50}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.noAlertCard}>
                                <Text style={styles.noAlertText}>No active stock alerts</Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                {/* Catalog Tab */}
                {activeTab === 'catalog' && (
                    <SupplierCatalogScreen onNavigate={(screen) => setActiveTab(screen || 'home')} />
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                    subView === 'details' ? (
                        <RestockRequestDetailsScreen
                            po={selectedPo}
                            onNavigate={(screen) => {
                                if (screen === 'delivery_tracking' || screen === 'deliveries') {
                                    setActiveTab('deliveries');
                                    setSubView('list');
                                } else {
                                    setSubView('list');
                                }
                            }}
                            onBack={() => setSubView('list')}
                        />
                    ) : (
                        <ReplenishmentRequestsScreen
                            onNavigate={(screen, extra) => {
                                if (screen === 'request_details' && extra?.po) {
                                    setSelectedPo(extra.po);
                                    setSubView('details');
                                } else {
                                    setActiveTab('home');
                                }
                            }}
                        />
                    )
                )}

                {/* Stores Tab */}
                {activeTab === 'stores' && (
                    <StoreListScreen onNavigate={() => setActiveTab('home')} />
                )}

                {/* Deliveries Tab */}
                {activeTab === 'deliveries' && (
                    <DeliveryTrackingScreen onNavigate={() => setActiveTab('home')} isSupplier={true} />
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                    <SupplierNotificationsScreen onNavigate={() => setActiveTab('home')} />
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <SupplierProfileScreen
                        onNavigate={(screen) => screen === 'login' ? handleLogout() : setActiveTab('home')}
                    />
                )}
            </View>

            {/* Fixed Persistent Bottom Navigation Bar across all 5 main tabs */}
            {isBottomNavVisible && (
                <View style={styles.bottomNav}>
                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => { setActiveTab('home'); setSubView('list'); }}
                        activeOpacity={0.7}
                    >
                        <Home size={22} color={activeTab === 'home' ? '#27672D' : '#64748B'} strokeWidth={activeTab === 'home' ? 2.2 : 2} />
                        <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
                            Home
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => { setActiveTab('catalog'); setSubView('list'); }}
                        activeOpacity={0.7}
                    >
                        <Package size={22} color={activeTab === 'catalog' ? '#27672D' : '#64748B'} strokeWidth={activeTab === 'catalog' ? 2.2 : 2} />
                        <Text style={[styles.navLabel, activeTab === 'catalog' && styles.navLabelActive]}>
                            Catalog
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => { setActiveTab('requests'); setSubView('list'); }}
                        activeOpacity={0.7}
                    >
                        <FileText size={22} color={activeTab === 'requests' ? '#27672D' : '#64748B'} strokeWidth={activeTab === 'requests' ? 2.2 : 2} />
                        <Text style={[styles.navLabel, activeTab === 'requests' && styles.navLabelActive]}>
                            Requests
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => { setActiveTab('stores'); setSubView('list'); }}
                        activeOpacity={0.7}
                    >
                        <Store size={22} color={activeTab === 'stores' ? '#27672D' : '#64748B'} strokeWidth={activeTab === 'stores' ? 2.2 : 2} />
                        <Text style={[styles.navLabel, activeTab === 'stores' && styles.navLabelActive]}>
                            Stores
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => { setActiveTab('deliveries'); setSubView('list'); }}
                        activeOpacity={0.7}
                    >
                        <Truck size={22} color={activeTab === 'deliveries' ? '#27672D' : '#64748B'} strokeWidth={activeTab === 'deliveries' ? 2.2 : 2} />
                        <Text style={[styles.navLabel, activeTab === 'deliveries' && styles.navLabelActive]}>
                            Deliveries
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    brandName: {
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
        gap: 8,
    },
    iconBtn: {
        padding: 6,
        borderRadius: 20,
        position: 'relative',
    },
    profileBtnActive: {
        backgroundColor: '#E8F5E9',
    },
    notifBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#EF4444',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    notifBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },
    viewportContent: {
        flex: 1,
    },
    homeScroll: {
        flex: 1,
    },
    homeScrollContent: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 28,
        gap: 0,
    },
    welcomeSection: {
        marginBottom: 8,
    },
    greetingText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2,
    },
    supplierTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3,
        marginBottom: 8,
    },
    chipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    primaryCatChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    primaryCatChipText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#B45309',
    },
    moreCatsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    moreCatsBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#B45309',
    },
    regionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    regionChipTextGreen: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#15803D',
    },
    regionChipText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#334155',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 20,
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    statNum: {
        fontSize: 28,
        fontWeight: '800',
        color: '#27672D',
        lineHeight: 32,
    },
    statNumAmber: {
        color: '#F57C00',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        textAlign: 'center',
        marginTop: 4,
    },
    actionsStack: {
        flexDirection: 'column',
        gap: 12,
    },
    actionBtnSolid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#27672D',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 2,
    },
    actionBtnSolidText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    actionBtnOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#27672D',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
    },
    actionBtnOutlineText: {
        color: '#27672D',
        fontSize: 15,
        fontWeight: '700',
    },
    alertCard: {
        backgroundColor: '#FFF4E5',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#FFE0B2',
        borderLeftWidth: 5,
        borderLeftColor: '#F57C00',
        shadowColor: '#F57C00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        marginTop: 4,
        gap: 6,
    },
    alertStore: {
        fontSize: 16,
        fontWeight: '800',
        color: '#475569',
    },
    alertProduct: {
        fontSize: 15,
        fontWeight: '800',
        color: '#F57C00',
        lineHeight: 20,
    },
    alertItemsList: {
        gap: 4,
        marginVertical: 4,
    },
    alertItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    alertItemDot: {
        color: '#F57C00',
        fontWeight: '900',
        fontSize: 15,
    },
    alertItemName: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#F57C00',
        flex: 1,
        lineHeight: 19,
    },
    alertDetails: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 2,
    },
    noAlertCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        padding: 14,
        alignItems: 'center',
        marginTop: 2,
    },
    noAlertText: {
        fontSize: 13.5,
        color: '#64748B',
        fontStyle: 'italic',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        height: Platform.OS === 'ios' ? 76 : 64,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    navLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 3,
        textAlign: 'center',
    },
    navLabelActive: {
        color: '#27672D',
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 18,
    },
    notifSheetCard: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 335,
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
        elevation: 8,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sheetTitle: {
        fontSize: 16.5,
        fontWeight: '800',
        color: '#1E293B',
    },
    sheetHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    readAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#27672D',
    },
    noNotifsText: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        paddingVertical: 16,
    },
    notifItemBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
    },
    notifItemTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 2,
    },
    notifItemMsg: {
        fontSize: 11.5,
        color: '#475569',
        lineHeight: 16,
    },
    viewAllNotifsBtn: {
        marginTop: 10,
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    viewAllNotifsBtnText: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#27672D',
    },
    catDropdownCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: 250,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 5,
    },
    catDropdownHeader: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 6,
    },
    catDropdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 2,
    },
    catDropdownText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1E293B',
    },
});
