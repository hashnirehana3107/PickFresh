import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Animated,
    Easing,
} from 'react-native';
import {
    ArrowLeft,
    Clock,
    Package,
    Store,
    RefreshCw,
    History,
    ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export default function OrderDashboard({ onNavigate, storeName: initialStoreName }) {
    const { user } = useAuth();
    const registeredStore =
        user?.shopName || user?.storeName || initialStoreName || user?.name || 'PickFresh Super • Main Counter';

    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });
    const [activeOrdersList, setActiveOrdersList] = useState([]);
    const [pastOrdersCount, setPastOrdersCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const spinAnim = useRef(new Animated.Value(0)).current;
    const spinLoopRef = useRef(null);

    const startSpin = () => {
        spinAnim.setValue(0);
        spinLoopRef.current = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 750,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        spinLoopRef.current.start();
    };

    const stopSpin = () => {
        if (spinLoopRef.current) {
            spinLoopRef.current.stop();
            spinLoopRef.current = null;
        }
        Animated.timing(spinAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start();
    };

    const fetchDashboardOrders = async (isInitial = false) => {
        if (isInitial) {
            setIsLoading(true);
        }
        try {
            const queryParams = new URLSearchParams();
            if (registeredStore) queryParams.append('storeName', registeredStore);

            const res = await fetch(`${API_BASE_URL}/orders?${queryParams.toString()}&_t=${Date.now()}`);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.orders)) {
                const cleanRegistered = (registeredStore || '').split('•')[0].split('-')[0].trim().toLowerCase();
                let shopOrders = data.orders;

                if (cleanRegistered) {
                    shopOrders = data.orders.filter((o) => {
                        const pStore = (o.pickupStore || '').toLowerCase();
                        return pStore.includes(cleanRegistered) || cleanRegistered.includes(pStore.split('•')[0].trim());
                    });
                }

                setOrders(shopOrders);

                const pending = shopOrders.filter((o) => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'pending' || s.includes('new');
                }).length;

                const preparing = shopOrders.filter((o) => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'preparing' || s.includes('pack') || s === 'accepted';
                }).length;

                const ready = shopOrders.filter((o) => {
                    const s = (o.status || '').toLowerCase();
                    return s.includes('ready');
                }).length;

                setStats({ pending, preparing, ready });

                // Active pre-orders: ONLY Pending, Accepted, Preparing, Ready for Pickup
                const activeList = shopOrders.filter((o) => {
                    const s = (o.status || '').toLowerCase();
                    return s !== 'completed' && s !== 'cancelled' && s !== 'collected';
                });

                // Past orders count (Collected, Completed, Cancelled)
                const pastCount = shopOrders.filter((o) => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'collected' || s === 'completed' || s === 'cancelled';
                }).length;

                setActiveOrdersList(activeList);
                setPastOrdersCount(pastCount);
            }
        } catch (err) {
            console.warn('Backend dashboard fetch error:', err.message);
        } finally {
            if (isInitial) {
                setIsLoading(false);
            }
        }
    };

    const handleManualRefresh = () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        startSpin();

        fetchDashboardOrders(false).finally(() => {
            setTimeout(() => {
                stopSpin();
                setIsRefreshing(false);
            }, 600);
        });
    };

    useEffect(() => {
        fetchDashboardOrders(true);
        const interval = setInterval(() => fetchDashboardOrders(false), 3000);
        return () => clearInterval(interval);
    }, [registeredStore]);

    const getStatusBadgeConfig = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        if (s === 'collected' || s === 'completed') {
            return { bg: '#F3E8FF', color: '#6B21A8', border: '#D8B4FE', label: 'COLLECTED' };
        }
        if (s.includes('ready')) {
            return { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: 'READY FOR PICKUP' };
        }
        if (s.includes('prep') || s.includes('pack')) {
            return { bg: '#E0E7FF', color: '#3730A3', border: '#A5B4FC', label: 'PREPARING' };
        }
        if (s.includes('accept')) {
            return { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD', label: 'ACCEPTED' };
        }
        if (s.includes('cancel')) {
            return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'CANCELLED' };
        }
        return { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D', label: 'PENDING' };
    };

    const handleOpenOrder = (orderObj) => {
        if (onNavigate) {
            const avatarUrl =
                orderObj.customerAvatar ||
                orderObj.customerImage ||
                (orderObj.rawOrder && (orderObj.rawOrder.customerAvatar || orderObj.rawOrder.customerImage)) ||
                '';

            const formattedOrder = {
                id: orderObj.orderNumber || (orderObj._id ? `PF-${String(orderObj._id).slice(-4)}` : 'PF-1028'),
                dbId: orderObj._id,
                customerName: orderObj.customerName || 'Customer',
                customerAvatar: avatarUrl,
                customerImage: avatarUrl,
                pickupTime: orderObj.pickupTimeSlot || 'Scheduled Pickup',
                itemsCount: orderObj.items ? orderObj.items.length : 1,
                items: orderObj.items || [],
                status: (orderObj.status || 'PENDING').toUpperCase(),
                phone: orderObj.customerPhone || '0771234567',
                totalAmount: `Rs. ${(orderObj.totalAmount || 0).toLocaleString()}`,
                rawOrder: orderObj,
            };
            onNavigate('order_details', { order: formattedOrder });
        }
    };

    const handleViewPickupSchedule = () => {
        if (onNavigate) {
            onNavigate('pickup_schedule');
        }
    };

    const handleViewPastOrders = () => {
        if (onNavigate) {
            onNavigate('past_orders');
        }
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('home');
        }
    };

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.mainScroll}
                contentContainerStyle={styles.mainScrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Title Row matching React Web */}
                <View style={styles.titleRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageTitle}>Order dashboard</Text>
                        <View style={styles.storeSubtitleRow}>
                            <Store size={14} color="#27672D" />
                            <Text style={styles.storeNameText} numberOfLines={1}>{registeredStore}</Text>
                            <View style={styles.liveDbChip}>
                                <Text style={styles.liveDbText}>LIVE DB</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.headerRightControls}>
                        <TouchableOpacity
                            style={styles.refreshBtn}
                            onPress={handleManualRefresh}
                            activeOpacity={0.7}
                            disabled={isRefreshing}
                        >
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <RefreshCw size={18} color="#475569" />
                            </Animated.View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={handleBack}
                            activeOpacity={0.7}
                            accessibilityLabel="Back to home"
                        >
                            <ArrowLeft size={22} color="#1E293B" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Loading orders indicator banner when refreshing */}
                {isRefreshing && (
                    <View style={styles.loadingOrdersBanner}>
                        <ActivityIndicator size="small" color="#27672D" />
                        <Text style={styles.loadingOrdersText}>Loading orders...</Text>
                    </View>
                )}

                {/* 3 Metric Stat Cards Row matching React Web */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCardItem, styles.statCardPending]}>
                        <Text style={[styles.statNum, styles.pendingNum]}>{stats.pending}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>

                    <View style={[styles.statCardItem, styles.statCardPreparing]}>
                        <Text style={[styles.statNum, styles.preparingNum]}>{stats.preparing}</Text>
                        <Text style={styles.statLabel}>Preparing</Text>
                    </View>

                    <View style={[styles.statCardItem, styles.statCardReady]}>
                        <Text style={[styles.statNum, styles.readyNum]}>{stats.ready}</Text>
                        <Text style={styles.statLabel}>Ready</Text>
                    </View>
                </View>

                {/* Next pickup / Active Pre-Orders Section */}
                <View style={styles.nextPickupSection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeaderLeft}>
                            <Text style={styles.sectionTitle}>Active Pre-Orders</Text>
                            {activeOrdersList.length > 0 && (
                                <View style={styles.activeCountBadge}>
                                    <Text style={styles.activeCountText}>{activeOrdersList.length} Active</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.viewPastBtn}
                            onPress={handleViewPastOrders}
                            activeOpacity={0.8}
                        >
                            <History size={14} color="#334155" />
                            <Text style={styles.viewPastText}>View Past Orders ({pastOrdersCount})</Text>
                        </TouchableOpacity>
                    </View>

                    {activeOrdersList.length > 0 ? (
                        <View style={styles.ordersListContainer}>
                            {activeOrdersList.map((orderObj, index) => {
                                const orderIdDisplay =
                                    orderObj.orderNumber ||
                                    (orderObj._id ? `PF-${String(orderObj._id).slice(-4)}` : `PF-102${index + 4}`);
                                const badge = getStatusBadgeConfig(orderObj.status);
                                const totalAmountDisplay = orderObj.totalAmount
                                    ? `Rs. ${Number(orderObj.totalAmount).toLocaleString()}`
                                    : '';
                                const itemsCount = orderObj.items ? orderObj.items.length : 1;

                                const avatarUri =
                                    (orderObj.customerAvatar && !orderObj.customerAvatar.includes('unsplash.com'))
                                        ? orderObj.customerAvatar
                                        : (orderObj.customerImage && !orderObj.customerImage.includes('unsplash.com'))
                                            ? orderObj.customerImage
                                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(orderObj.customerName || 'Customer')}&background=E8F5E9&color=27672D&bold=true&font-size=0.45`;

                                return (
                                    <TouchableOpacity
                                        key={orderObj._id || index}
                                        style={styles.pickupCardEnhanced}
                                        onPress={() => handleOpenOrder(orderObj)}
                                        activeOpacity={0.9}
                                    >
                                        {/* Card Header Row */}
                                        <View style={styles.cardHeaderRow}>
                                            <View style={styles.cardTitleGroup}>
                                                <View style={styles.avatarCircle}>
                                                    <Image
                                                        source={{ uri: avatarUri }}
                                                        style={styles.avatarImg}
                                                        resizeMode="cover"
                                                    />
                                                </View>
                                                <View>
                                                    <Text style={styles.pickupCardHeader}>#{orderIdDisplay}</Text>
                                                    <Text style={styles.customerNameSub}>
                                                        {orderObj.customerName || 'Customer'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {totalAmountDisplay ? (
                                                <View style={styles.cardPriceBadge}>
                                                    <Text style={styles.cardPriceText}>{totalAmountDisplay}</Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        {/* Card Details Row: Time Slot & Items */}
                                        <View style={styles.cardDetailsRow}>
                                            <View style={styles.detailChip}>
                                                <Clock size={13} color="#64748B" />
                                                <Text style={styles.detailChipText}>
                                                    {orderObj.pickupTimeSlot || '4:00 PM - 4:30 PM'}
                                                </Text>
                                            </View>
                                            <View style={styles.detailChip}>
                                                <Package size={13} color="#64748B" />
                                                <Text style={styles.detailChipText}>
                                                    {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Card Footer: Status Badge & Open Order Button */}
                                        <View style={styles.pickupCardFooterEnhanced}>
                                            <View
                                                style={[
                                                    styles.statusBadgeDynamic,
                                                    {
                                                        backgroundColor: badge.bg,
                                                        borderColor: badge.border,
                                                    },
                                                ]}
                                            >
                                                <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                                                    {badge.label}
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.openOrderBtnEnhanced}
                                                onPress={() => handleOpenOrder(orderObj)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.openOrderBtnText}>Open order</Text>
                                                <ChevronRight size={16} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : isLoading ? (
                        <View style={styles.loadingOrdersCard}>
                            <ActivityIndicator size="small" color="#27672D" />
                            <Text style={styles.loadingOrdersCardText}>Loading orders...</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>
                                No active pre-orders right now. New customer pre-orders for your shop will appear here in real time.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Shop Owner Time Slot Capacity & Schedule Management Banner matching React Web */}
                <View style={styles.scheduleManageSection}>
                    <TouchableOpacity
                        style={styles.scheduleCard}
                        onPress={handleViewPickupSchedule}
                        activeOpacity={0.85}
                    >
                        <View style={styles.scheduleCardLeft}>
                            <View style={styles.scheduleIconBox}>
                                <Clock size={20} color="#27672D" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.scheduleCardTitle}>Pickup schedule & slots</Text>
                                <Text style={styles.scheduleCardSub}>Manage store capacity limits & busy times</Text>
                            </View>
                        </View>

                        <View style={styles.scheduleCardRight}>
                            <Text style={styles.scheduleBtnText}>Manage</Text>
                            <ChevronRight size={18} color="#27672D" />
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    mainScroll: {
        flex: 1,
    },
    mainScrollContent: {
        padding: 18,
        paddingBottom: 36,
        gap: 20,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    storeSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    storeNameText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#27672D',
        maxWidth: 180,
    },
    liveDbChip: {
        backgroundColor: '#D1FAE5',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    liveDbText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#059669',
    },
    headerRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    refreshBtn: {
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCardItem: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 1,
    },
    statCardPending: {
        backgroundColor: '#FFFDF5',
        borderColor: '#FDE68A',
    },
    pendingNum: {
        color: '#D97706',
    },
    statCardPreparing: {
        backgroundColor: '#F8FAFC',
        borderColor: '#BFDBFE',
    },
    preparingNum: {
        color: '#2563EB',
    },
    statCardReady: {
        backgroundColor: '#F0FDF4',
        borderColor: '#A7F3D0',
    },
    readyNum: {
        color: '#059669',
    },
    statNum: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    nextPickupSection: {
        gap: 12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 2,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.2,
    },
    activeCountBadge: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#C8E6C9',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    activeCountText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#27672D',
    },
    viewPastBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    viewPastText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    ordersListContainer: {
        gap: 14,
    },
    pickupCardEnhanced: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    pickupCardHeader: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    customerNameSub: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 1,
    },
    cardPriceBadge: {
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    cardPriceText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    cardDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    detailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailChipText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#475569',
    },
    pickupCardFooterEnhanced: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 4,
        gap: 12,
    },
    statusBadgeDynamic: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    openOrderBtnEnhanced: {
        backgroundColor: '#27672D',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 2,
    },
    openOrderBtnText: {
        color: '#FFFFFF',
        fontSize: 13.5,
        fontWeight: '700',
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748B',
        fontSize: 13.5,
        fontWeight: '600',
        lineHeight: 20,
    },
    scheduleManageSection: {
        marginTop: 4,
    },
    scheduleCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    scheduleCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    scheduleIconBox: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scheduleCardTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.2,
    },
    scheduleCardSub: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 2,
    },
    scheduleCardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    scheduleBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#27672D',
    },
    loadingOrdersBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 14,
        gap: 8,
    },
    loadingOrdersText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#166534',
    },
    loadingOrdersCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 36,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingOrdersCardText: {
        fontSize: 13.5,
        color: '#64748B',
        fontWeight: '600',
    },
});
