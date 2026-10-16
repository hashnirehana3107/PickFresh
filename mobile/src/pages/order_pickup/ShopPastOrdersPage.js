import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    ActivityIndicator,
} from 'react-native';
import {
    ArrowLeft,
    Clock,
    History,
    Package,
    Search,
    ChevronRight,
    Store,
    CheckCircle2,
    XCircle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export default function ShopPastOrdersPage({ onNavigate, storeName: initialStoreName, onBack }) {
    const { user } = useAuth();
    const registeredStore =
        user?.shopName || user?.storeName || initialStoreName || user?.name || 'PickFresh Super • Main Counter';

    const [pastOrders, setPastOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'COLLECTED' | 'CANCELLED'
    const [isLoading, setIsLoading] = useState(true);

    const fetchPastOrders = async () => {
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

                // Filter ONLY past orders (Collected, Completed, Cancelled)
                const pastList = shopOrders.filter((o) => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'collected' || s === 'completed' || s === 'cancelled';
                });

                setPastOrders(pastList);
            }
        } catch (err) {
            console.warn('Past orders fetch error:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPastOrders();
    }, [registeredStore]);

    useEffect(() => {
        let result = pastOrders;

        if (activeFilter === 'COLLECTED') {
            result = result.filter((o) => {
                const s = (o.status || '').toLowerCase();
                return s === 'collected' || s === 'completed';
            });
        } else if (activeFilter === 'CANCELLED') {
            result = result.filter((o) => (o.status || '').toLowerCase() === 'cancelled');
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((o) => {
                const idStr = (o.orderNumber || o._id || '').toLowerCase();
                const custName = (o.customerName || '').toLowerCase();
                return idStr.includes(q) || custName.includes(q);
            });
        }

        setFilteredOrders(result);
    }, [searchQuery, activeFilter, pastOrders]);

    const getStatusBadge = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        if (s === 'collected' || s === 'completed') {
            return {
                bg: '#F3E8FF',
                color: '#6B21A8',
                border: '#D8B4FE',
                label: 'COLLECTED',
                isCollected: true,
            };
        }
        if (s === 'cancelled') {
            return {
                bg: '#FEE2E2',
                color: '#991B1B',
                border: '#FCA5A5',
                label: 'CANCELLED',
                isCollected: false,
            };
        }
        return {
            bg: '#F1F5F9',
            color: '#475569',
            border: '#CBD5E1',
            label: (statusStr || 'PAST').toUpperCase(),
            isCollected: true,
        };
    };

    const handleOpenOrderDetails = (orderObj) => {
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
                status: (orderObj.status || 'COLLECTED').toUpperCase(),
                phone: orderObj.customerPhone || '0771234567',
                totalAmount: `Rs. ${(orderObj.totalAmount || 0).toLocaleString()}`,
                rawOrder: orderObj,
            };
            onNavigate('order_details', { order: formattedOrder });
        }
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('dashboard');
        } else if (onBack) {
            onBack();
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Title Row matching React Web */}
            <View style={styles.titleRow}>
                <View>
                    <Text style={styles.pageTitle}>Past Orders</Text>
                    <View style={styles.storeSubtitleRow}>
                        <Store size={14} color="#27672D" />
                        <Text style={styles.storeNameText}>{registeredStore}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleBack}
                    activeOpacity={0.7}
                    accessibilityLabel="Back to order dashboard"
                >
                    <ArrowLeft size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBox}>
                <Search size={18} color="#64748B" />
                <TextInput
                    placeholder="Search by order # or customer..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabsRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeFilter === 'ALL' && styles.tabBtnActive]}
                    onPress={() => setActiveFilter('ALL')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeFilter === 'ALL' && styles.tabTextActive]}>
                        All ({pastOrders.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeFilter === 'COLLECTED' && styles.tabBtnActive]}
                    onPress={() => setActiveFilter('COLLECTED')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeFilter === 'COLLECTED' && styles.tabTextActive]}>
                        Collected (
                        {
                            pastOrders.filter((o) =>
                                ['collected', 'completed'].includes((o.status || '').toLowerCase())
                            ).length
                        }
                        )
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeFilter === 'CANCELLED' && styles.tabBtnActive]}
                    onPress={() => setActiveFilter('CANCELLED')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeFilter === 'CANCELLED' && styles.tabTextActive]}>
                        Cancelled (
                        {
                            pastOrders.filter((o) => (o.status || '').toLowerCase() === 'cancelled')
                                .length
                        }
                        )
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Orders List Stack */}
            <ScrollView
                style={styles.scrollList}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#27672D" />
                        <Text style={styles.loadingText}>Loading past orders...</Text>
                    </View>
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((orderObj, index) => {
                        const orderIdDisplay =
                            orderObj.orderNumber ||
                            (orderObj._id ? `PF-${String(orderObj._id).slice(-4)}` : `PF-10${index + 20}`);
                        const badge = getStatusBadge(orderObj.status);
                        const totalAmountDisplay = orderObj.totalAmount
                            ? `Rs. ${Number(orderObj.totalAmount).toLocaleString()}`
                            : '';
                        const itemsCount = orderObj.items ? orderObj.items.length : 1;

                        const avatarUri =
                            orderObj.customerAvatar && !orderObj.customerAvatar.includes('unsplash.com')
                                ? orderObj.customerAvatar
                                : orderObj.customerImage && !orderObj.customerImage.includes('unsplash.com')
                                ? orderObj.customerImage
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      orderObj.customerName || 'Customer'
                                  )}&background=F3E8FF&color=6B21A8&bold=true&font-size=0.45`;

                        return (
                            <View key={orderObj._id || index} style={styles.pastCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.userGroup}>
                                        <View style={styles.avatar}>
                                            <Image
                                                source={{ uri: avatarUri }}
                                                style={styles.avatarImg}
                                                resizeMode="cover"
                                            />
                                        </View>
                                        <View>
                                            <Text style={styles.orderIdText}>#{orderIdDisplay}</Text>
                                            <Text style={styles.customerName}>
                                                {orderObj.customerName || 'Customer'}
                                            </Text>
                                        </View>
                                    </View>
                                    {totalAmountDisplay ? (
                                        <Text style={styles.priceText}>{totalAmountDisplay}</Text>
                                    ) : null}
                                </View>

                                <View style={styles.detailsRow}>
                                    <View style={styles.chip}>
                                        <Clock size={13} color="#64748B" />
                                        <Text style={styles.chipText}>
                                            {orderObj.pickupTimeSlot || 'Scheduled Slot'}
                                        </Text>
                                    </View>
                                    <View style={styles.chip}>
                                        <Package size={13} color="#64748B" />
                                        <Text style={styles.chipText}>
                                            {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <View
                                        style={[
                                            styles.badge,
                                            {
                                                backgroundColor: badge.bg,
                                                borderColor: badge.border,
                                            },
                                        ]}
                                    >
                                        {badge.isCollected ? (
                                            <CheckCircle2 size={13} color={badge.color} />
                                        ) : (
                                            <XCircle size={13} color={badge.color} />
                                        )}
                                        <Text style={[styles.badgeText, { color: badge.color }]}>
                                            {badge.label}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.openBtn}
                                        onPress={() => handleOpenOrderDetails(orderObj)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.openBtnText}>View details</Text>
                                        <ChevronRight size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.emptyBox}>
                        <History size={36} color="#94A3B8" />
                        <Text style={styles.emptyTitle}>No Past Orders Found</Text>
                        <Text style={styles.emptyDesc}>
                            {pastOrders.length === 0
                                ? 'Orders marked as "Collected" or "Cancelled" will automatically move here.'
                                : 'No orders matched your search or filter.'}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
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
    },
    backBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        color: '#1E293B',
    },
    filterTabsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    tabBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    tabBtnActive: {
        backgroundColor: '#27672D',
        borderColor: '#27672D',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    scrollList: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 80,
        gap: 12,
    },
    pastCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F3E8FF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    orderIdText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    customerName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 1,
    },
    priceText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    openBtn: {
        backgroundColor: '#27672D',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    openBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    emptyBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#334155',
        marginTop: 10,
        marginBottom: 4,
    },
    emptyDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
    },
    loadingBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 10,
    },
});
