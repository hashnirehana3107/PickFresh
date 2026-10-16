import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Modal,
    AppState,
    Animated,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Search,
    ShoppingBag,
    Store,
    Clock,
    ChevronRight,
    MapPin,
    Package,
    CheckCircle2,
    XCircle,
    RotateCcw,
    X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
];

// Robust local image fallback by name/category keyword
function getFallbackImage(name = '', cat = '') {
    const hint = `${name} ${cat}`.toLowerCase();
    if (hint.includes('butter') || hint.includes('anchor')) {
        return require('../../../assets/Pic117561.jpg');
    }
    if (hint.includes('7 up') || hint.includes('7up')) {
        return require('../../../assets/7 Up Pet Bottle 1L.jpeg');
    }
    if (hint.includes('sprite')) {
        return require('../../../assets/Sprite 1L Bottle.jpg');
    }
    if (hint.includes('coca') || hint.includes('coke')) {
        return require('../../../assets/Coca Cola Pet Bottle 1.05L.jpg');
    }
    if (hint.includes('soap') || hint.includes('dove') || hint.includes('lux')) {
        return require('../../../assets/Dove Beauty Cream Soap 100g.jpg');
    }
    if (hint.includes('milk') || hint.includes('dairy') || hint.includes('cheese')) {
        return require('../../../assets/highland_milk.png');
    }
    if (hint.includes('chicken') || hint.includes('meat') || hint.includes('fish')) {
        return require('../../../assets/meat.webp');
    }
    if (hint.includes('rice') || hint.includes('grain') || hint.includes('samba')) {
        return require('../../../assets/grains.jpg');
    }
    if (hint.includes('fruit') || hint.includes('apple') || hint.includes('mango') || hint.includes('grape') || hint.includes('avocado')) {
        return require('../../../assets/fruits.webp');
    }
    if (hint.includes('tomato') || hint.includes('carrot') || hint.includes('bean') || hint.includes('veg')) {
        return require('../../../assets/vegetables.jpg');
    }
    return require('../../../assets/fresh_produce_hero.png');
}

function resolveItemImage(item, catalogMap) {
    // Try live catalog image first
    const nameKey = (item?.name || '').trim().toLowerCase();
    const baseKey = nameKey.replace(/\s*\([\d\sA-Za-z]+\)/g, '').trim();
    const catalogImg = catalogMap?.[nameKey] || catalogMap?.[baseKey];
    if (catalogImg && (catalogImg.startsWith('http') || catalogImg.startsWith('data:'))) {
        return { uri: catalogImg };
    }
    // Try item's own image
    const raw = item?.image || item?.imageUrl;
    if (raw && typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:'))) {
        return { uri: raw };
    }
    // Local fallback
    return getFallbackImage(item?.name, item?.category);
}

export default function PastOrdersPage({ onNavigate, addToCart, initialFilter = 'all' }) {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState(initialFilter || 'all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [productCatalogMap, setProductCatalogMap] = useState({});
    const [toastMsg, setToastMsg] = useState('');
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const isMountedRef = useRef(true);

    useEffect(() => {
        if (initialFilter) {
            setActiveFilter(initialFilter);
        }
    }, [initialFilter]);

    const showToast = (msg) => {
        setToastMsg(msg);
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(2200),
            Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start(() => setToastMsg(''));
    };

    const fetchOrders = async (isFirst = false) => {
        if (isFirst) setIsLoading(true);
        if (!user || (!user.email && !user._id && !user.id)) {
            if (isMountedRef.current) {
                setOrders([]);
                if (isFirst) setIsLoading(false);
            }
            return;
        }

        try {
            const queryParams = new URLSearchParams();
            if (user?.email) queryParams.append('customerEmail', user.email.trim());
            if (user?._id || user?.id) queryParams.append('customerId', user._id || user.id);

            const url = `${API_BASE_URL}/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.orders) && isMountedRef.current) {
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

                const formatted = userOrders.map(o => ({
                    id: o.orderNumber || `PF-${o._id ? String(o._id).slice(-4).toUpperCase() : '1024'}`,
                    dbId: o._id,
                    date: o.pickupTimeSlot
                        ? `${o.pickupDate || 'Today'}, ${o.pickupTimeSlot}`
                        : (o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Today'),
                    rawDate: o.createdAt || new Date().toISOString(),
                    store: o.pickupStore || 'PickFresh Super',
                    pickupCounter: 'Express Pickup Counter',
                    status: o.status || 'Pending',
                    paymentMethod: o.paymentStatus || 'Pay at Pickup',
                    items: (o.items && o.items.length > 0) ? o.items.map(it => ({
                        id: it._id || it.product || `item_${Math.random()}`,
                        name: it.name,
                        brand: it.brand || 'Fresh',
                        price: Number(it.price) || 0,
                        quantity: Number(it.quantity) || 1,
                        image: it.image || it.imageUrl || '',
                        category: it.category || '',
                    })) : [
                        { id: 'p0', name: 'Grocery Item', brand: 'PickFresh', price: Number(o.totalAmount) || 500, quantity: 1, image: '', category: '' }
                    ],
                    totalAmount: Number(o.totalAmount) || 0,
                }));
                setOrders(formatted);
            }
        } catch (err) {
            // silent
        } finally {
            if (isFirst && isMountedRef.current) setIsLoading(false);
        }
    };

    // Fetch product catalog for image resolution
    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/product-inventory/products`);
                const data = await res.json();
                if (data.success && Array.isArray(data.products)) {
                    const map = {};
                    data.products.forEach(p => {
                        const imgUrl = p.image || p.imageUrl;
                        if (p.name && imgUrl) {
                            map[p.name.trim().toLowerCase()] = imgUrl;
                            const baseKey = p.name.trim().toLowerCase().replace(/\s*\([\d\sA-Za-z]+\)/g, '').trim();
                            map[baseKey] = imgUrl;
                        }
                    });
                    if (isMountedRef.current) setProductCatalogMap(map);
                }
            } catch (e) { /* silent */ }
        };
        fetchCatalog();
    }, []);

    // Initial fetch + 1s polling + AppState focus
    useEffect(() => {
        isMountedRef.current = true;
        fetchOrders(true);

        // 1-second real-time polling matching React web
        const interval = setInterval(() => fetchOrders(false), 1000);

        // Re-fetch when app comes to foreground (matching React web's visibilitychange)
        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active') fetchOrders(false);
        });

        return () => {
            isMountedRef.current = false;
            clearInterval(interval);
            appStateSub?.remove();
        };
    }, [user]);

    const isCompletedStatus = (s) => {
        const v = (s || '').toLowerCase();
        return v === 'completed' || v === 'collected';
    };

    const isCancelledStatus = (s) => {
        const v = (s || '').toLowerCase();
        return v === 'cancelled' || v.includes('cancel');
    };

    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        if (isCompletedStatus(s)) return { color: '#166534', bg: '#DCFCE7', text: status || 'Collected' };
        if (isCancelledStatus(s)) return { color: '#991B1B', bg: '#FEE2E2', text: status || 'Cancelled' };
        return { color: '#B45309', bg: '#FEF3C7', text: status || 'Pending' };
    };

    const filteredOrders = orders.filter(o => {
        if (activeFilter === 'completed' && !isCompletedStatus(o.status)) return false;
        if (activeFilter === 'cancelled' && !isCancelledStatus(o.status)) return false;

        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            o.id.toLowerCase().includes(q) ||
            o.store.toLowerCase().includes(q) ||
            o.items.some(i => i.name.toLowerCase().includes(q))
        );
    });

    const handleReorder = (order) => {
        if (addToCart && order.items) {
            order.items.forEach(item => addToCart(item, item.quantity));
            showToast(`Added items from #${order.id} to cart!`);
        } else {
            showToast(`Reordered #${order.id} successfully!`);
        }
    };

    return (
        <View style={styles.container}>
            {/* Toast */}
            {toastMsg ? (
                <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
                    <CheckCircle2 size={16} color="#166534" />
                    <Text style={styles.toastText}>{toastMsg}</Text>
                </Animated.View>
            ) : null}

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Orders</Text>
                    <Text style={styles.headerSubtitle}>View and manage your pre-orders</Text>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('profile')}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Search size={18} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by Order #, Store, or Item..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                            <X size={15} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterTabsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
                    {FILTER_TABS.map((tab) => {
                        const isActive = activeFilter === tab.key;
                        const count = tab.key === 'all' ? orders.length
                            : tab.key === 'completed' ? orders.filter(o => isCompletedStatus(o.status)).length
                            : orders.filter(o => isCancelledStatus(o.status)).length;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.filterTab, isActive && styles.filterTabActive]}
                                onPress={() => setActiveFilter(tab.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                                    {tab.label} ({count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#2D7B38" />
                        <Text style={styles.loadingText}>Loading order history from database...</Text>
                    </View>
                ) : filteredOrders.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <ShoppingBag size={48} color="#94A3B8" />
                        <Text style={styles.emptyTitle}>No orders found</Text>
                        <Text style={styles.emptySub}>
                            {searchQuery ? 'Try a different search term.' : "We couldn't find any orders matching your filter."}
                        </Text>
                        <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={() => { setActiveFilter('All'); setSearchQuery(''); }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.resetBtnText}>Reset filters</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.ordersList}>
                        {filteredOrders.map((order) => {
                            const badge = getStatusStyle(order.status);
                            return (
                                <TouchableOpacity
                                    key={order.id}
                                    style={styles.orderCard}
                                    onPress={() => setSelectedOrder(order)}
                                    activeOpacity={0.8}
                                >
                                    {/* Card Top Row */}
                                    <View style={styles.cardHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.orderNum}>#{order.id}</Text>
                                            <Text style={styles.orderDate}>{order.date}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                            {isCompletedStatus(order.status) && <CheckCircle2 size={12} color={badge.color} />}
                                            {isCancelledStatus(order.status) && <XCircle size={12} color={badge.color} />}
                                            {!isCompletedStatus(order.status) && !isCancelledStatus(order.status) && <Clock size={12} color={badge.color} />}
                                            <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
                                        </View>
                                    </View>

                                    {/* Store Info */}
                                    <View style={styles.storeRow}>
                                        <MapPin size={13} color="#2D7B38" />
                                        <Text style={styles.storeName}>{order.store}</Text>
                                        <Text style={styles.dotDivider}>•</Text>
                                        <Text style={styles.counterText}>{order.pickupCounter}</Text>
                                    </View>                                     {/* Item Thumbnails Preview */}
                                    <View style={styles.itemsPreview}>
                                        {order.items.map((item, idx) => {
                                            const imgSrc = resolveItemImage(item, productCatalogMap);
                                            return (
                                                <View key={idx} style={styles.previewChip}>
                                                    <View style={styles.previewImgBox}>
                                                        <Image
                                                            source={typeof imgSrc === 'object' && imgSrc.uri ? imgSrc : imgSrc}
                                                            style={styles.previewImg}
                                                            resizeMode="contain"
                                                        />
                                                    </View>
                                                    <View style={styles.previewDetails}>
                                                        <Text style={styles.previewItemName} numberOfLines={1}>{item.name}</Text>
                                                        <Text style={styles.previewItemQty}>Qty: {item.quantity}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Card Bottom */}
                                    <View style={styles.cardBottom}>
                                        <View style={styles.totalSummaryBox}>
                                            <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                                            <Text style={styles.totalVal}>Rs. {order.totalAmount.toLocaleString()}</Text>
                                        </View>
                                        {!isCompletedStatus(order.status) && !isCancelledStatus(order.status) && (
                                            <TouchableOpacity
                                                style={styles.btnTrackOrderSolid}
                                                onPress={() => onNavigate && onNavigate('live_tracking', {
                                                    _id: order.dbId,
                                                    orderNumber: order.id,
                                                    pickupStore: order.store,
                                                    pickupTimeSlot: order.date,
                                                    status: order.status,
                                                })}
                                                activeOpacity={0.85}
                                            >
                                                <Clock size={14} color="#FFFFFF" />
                                                <Text style={styles.btnTrackOrderSolidText}>Track Order</Text>
                                            </TouchableOpacity>
                                        )}
                                        {isCompletedStatus(order.status) && (
                                            <TouchableOpacity
                                                style={styles.reorderLink}
                                                onPress={() => handleReorder(order)}
                                                activeOpacity={0.8}
                                            >
                                                <RotateCcw size={13} color="#2D7B38" />
                                                <Text style={styles.trackLinkText}>Reorder</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Order Detail Bottom Sheet Modal - contained within mobile frame */}
            {selectedOrder && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setSelectedOrder(null)}
                    />
                    <View style={styles.modalSheet}>
                        {selectedOrder && (
                            <>
                                {/* Modal Header */}
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>Order Details</Text>
                                        <Text style={styles.modalSubtitle}>#{selectedOrder.id}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.modalCloseBtn}
                                        onPress={() => setSelectedOrder(null)}
                                        activeOpacity={0.7}
                                    >
                                        <X size={20} color="#64748B" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                    {/* Status & Info Card */}
                                    <View style={styles.modalInfoCard}>
                                        <View style={styles.infoCardRow}>
                                            <Text style={styles.infoCardLabel}>Status</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedOrder.status).bg }]}>
                                                <Text style={[styles.statusText, { color: getStatusStyle(selectedOrder.status).color }]}>
                                                    {getStatusStyle(selectedOrder.status).text}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoCardRow}>
                                            <Text style={styles.infoCardLabel}>Order Date</Text>
                                            <Text style={styles.infoCardValue}>{selectedOrder.date}</Text>
                                        </View>
                                        <View style={styles.infoCardRow}>
                                            <Text style={styles.infoCardLabel}>Pickup Location</Text>
                                            <Text style={styles.infoCardValue}>{selectedOrder.store}</Text>
                                        </View>
                                        <View style={styles.infoCardRow}>
                                            <Text style={styles.infoCardLabel}>Payment</Text>
                                            <Text style={styles.infoCardValue}>{selectedOrder.paymentMethod}</Text>
                                        </View>
                                    </View>

                                    {/* Ordered Items List */}
                                    <Text style={styles.sectionLabel}>Ordered Items ({selectedOrder.items.length})</Text>
                                    <View style={styles.itemsListBox}>
                                        {selectedOrder.items.map((item, idx) => {
                                            const imgSrc = resolveItemImage(item, productCatalogMap);
                                            return (
                                                <View key={idx} style={styles.modalItemRow}>
                                                    <View style={styles.modalItemImgBox}>
                                                        <Image
                                                            source={typeof imgSrc === 'object' && imgSrc.uri ? imgSrc : imgSrc}
                                                            style={styles.modalItemImg}
                                                            resizeMode="contain"
                                                        />
                                                    </View>
                                                    <View style={styles.modalItemInfo}>
                                                        <Text style={styles.modalItemName} numberOfLines={1}>{item.name}</Text>
                                                        <Text style={styles.modalItemSub}>{item.brand || 'Fresh'} • Rs. {item.price} each</Text>
                                                    </View>
                                                    <View style={styles.modalItemTotalCol}>
                                                        <Text style={styles.modalQty}>x{item.quantity}</Text>
                                                        <Text style={styles.modalPrice}>Rs. {(item.price * item.quantity).toLocaleString()}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Total Breakdown */}
                                    <View style={styles.totalBox}>
                                        <View style={styles.summaryLine}>
                                            <Text style={styles.summaryLineLabel}>Subtotal</Text>
                                            <Text style={styles.summaryLineVal}>Rs. {selectedOrder.totalAmount.toLocaleString()}</Text>
                                        </View>
                                        <View style={styles.summaryLine}>
                                            <Text style={styles.summaryLineLabel}>Pickup Counter Fee</Text>
                                            <Text style={styles.freeText}>FREE</Text>
                                        </View>
                                        <View style={[styles.summaryLine, styles.totalBoldRow]}>
                                            <Text style={styles.totalBoldLabel}>Total Paid</Text>
                                            <Text style={styles.grandTotal}>Rs. {selectedOrder.totalAmount.toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </ScrollView>

                                {/* Modal Footer Actions */}
                                <View style={styles.modalFooter}>
                                    {isCompletedStatus(selectedOrder.status) && (
                                        <TouchableOpacity
                                            style={styles.btnModalReorder}
                                            onPress={() => {
                                                handleReorder(selectedOrder);
                                                setSelectedOrder(null);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <RotateCcw size={16} color="#FFFFFF" />
                                            <Text style={styles.btnModalReorderText}>Reorder All Items</Text>
                                        </TouchableOpacity>
                                    )}
                                    {!isCompletedStatus(selectedOrder.status) && !isCancelledStatus(selectedOrder.status) && (
                                        <TouchableOpacity
                                            style={styles.btnModalTrack}
                                            onPress={() => {
                                                onNavigate && onNavigate('live_tracking', {
                                                    _id: selectedOrder.dbId,
                                                    orderNumber: selectedOrder.id,
                                                    pickupStore: selectedOrder.store,
                                                    pickupTimeSlot: selectedOrder.date,
                                                    status: selectedOrder.status,
                                                });
                                                setSelectedOrder(null);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <Clock size={16} color="#FFFFFF" />
                                            <Text style={styles.btnModalReorderText}>Track Order</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={styles.btnModalClose}
                                        onPress={() => setSelectedOrder(null)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.btnModalCloseText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F5',
    },
    // Toast
    toast: {
        position: 'absolute',
        top: 80,
        left: 20,
        right: 20,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        zIndex: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
    },
    toastText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#166534',
        flex: 1,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: '#FAF9F5',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 2,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    // Search
    searchWrap: {
        paddingHorizontal: 24,
        marginBottom: 16,
        backgroundColor: '#FAF9F5',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#1E293B',
    },
    // Filter tabs
    filterTabsRow: {
        backgroundColor: '#FAF9F5',
        marginBottom: 16,
    },
    filterTabsScroll: {
        paddingHorizontal: 24,
        gap: 8,
        paddingBottom: 4,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    filterTabActive: {
        backgroundColor: '#2D7B38',
        borderColor: '#2D7B38',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 3,
    },
    filterTabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    filterTabTextActive: {
        color: '#FFFFFF',
    },
    // Scroll content
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'android' ? 60 : 40,
    },
    // Loading
    loadingWrap: {
        paddingVertical: 50,
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        color: '#64748B',
    },
    // Empty
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    emptySub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    resetBtn: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
    resetBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    // Orders list
    ordersList: {
        gap: 12,
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    orderNum: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    orderDate: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 14,
    },
    storeName: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '700',
    },
    dotDivider: {
        fontSize: 12,
        color: '#CBD5E1',
        fontWeight: '800',
    },
    counterText: {
        fontSize: 12,
        color: '#64748B',
    },
    // Item previews
    itemsPreview: {
        gap: 8,
        marginBottom: 14,
    },
    previewChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FAF9F5',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    previewImgBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewImg: {
        width: '100%',
        height: '100%',
    },
    previewDetails: {
        flex: 1,
    },
    previewItemName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
    },
    previewItemQty: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 1,
    },
    // Card bottom
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    totalSummaryBox: {
        flexDirection: 'column',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 0.3,
    },
    totalVal: {
        fontSize: 16,
        fontWeight: '800',
        color: '#2D7B38',
    },
    btnTrackOrderSolid: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2D7B38',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    btnTrackOrderSolidText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    reorderLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E6F4EA',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    trackLinkText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#2D7B38',
    },
    // Modal
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 16,
        width: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    // Info card in modal
    modalInfoCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
        gap: 10,
    },
    infoCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoCardLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    infoCardValue: {
        fontSize: 12,
        color: '#0F172A',
        fontWeight: '700',
        maxWidth: '60%',
        textAlign: 'right',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 10,
    },
    // Items in modal
    itemsListBox: {
        gap: 8,
        marginBottom: 16,
    },
    modalItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    modalItemImgBox: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalItemImg: {
        width: '100%',
        height: '100%',
    },
    modalItemInfo: {
        flex: 1,
    },
    modalItemName: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#0F172A',
    },
    modalItemSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    modalItemTotalCol: {
        alignItems: 'flex-end',
    },
    modalQty: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    modalPrice: {
        fontSize: 13,
        fontWeight: '800',
        color: '#2D7B38',
    },
    // Total breakdown in modal
    totalBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
        marginBottom: 10,
    },
    summaryLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLineLabel: {
        fontSize: 12.5,
        color: '#64748B',
    },
    summaryLineVal: {
        fontSize: 12.5,
        color: '#334155',
        fontWeight: '600',
    },
    freeText: {
        fontSize: 12.5,
        color: '#166534',
        fontWeight: '800',
    },
    totalBoldRow: {
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 8,
        marginTop: 2,
    },
    totalBoldLabel: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    grandTotal: {
        fontSize: 16,
        fontWeight: '900',
        color: '#2D7B38',
    },
    // Modal footer
    modalFooter: {
        paddingHorizontal: 20,
        paddingBottom: 28,
        paddingTop: 12,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    btnModalReorder: {
        backgroundColor: '#15803D',
        borderRadius: 14,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnModalTrack: {
        backgroundColor: '#2D7B38',
        borderRadius: 14,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnModalReorderText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    btnModalClose: {
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
    btnModalCloseText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#334155',
    },
});
