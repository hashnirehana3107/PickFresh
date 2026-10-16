import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    AlertTriangle,
    Send,
    CheckCircle2,
    PackageCheck,
    AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const formatStockUnit = (unit) => {
    if (!unit) return '';
    const clean = String(unit).trim();
    const stripped = clean.replace(/^1\s*/, '').trim();
    return stripped || clean;
};

export default function LowStockAdvancedPage({ onNavigate }) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [alertItems, setAlertItems] = useState([]);
    const [fetchError, setFetchError] = useState(false);
    const [sentItems, setSentItems] = useState(new Set());
    const [sendingSupplier, setSendingSupplier] = useState(null);
    const [toastMessage, setToastMessage] = useState('');

    const activeStatuses = ['Pending', 'Pending Approval', 'Accepted', 'Approved', 'Shipped', 'Dispatched', 'In Transit', 'Confirmed', 'Packed'];

    const loadData = async () => {
        setIsLoading(true);
        setFetchError(false);

        const userEmail = user?.email || user?.storeEmail || '';
        const endpoint = userEmail
            ? `${API_BASE_URL}/product-inventory/products?storeEmail=${encodeURIComponent(userEmail)}`
            : `${API_BASE_URL}/product-inventory/products`;

        try {
            const [prodRes, reqRes] = await Promise.all([
                fetch(endpoint).catch(() => null),
                fetch(`${API_BASE_URL}/product-inventory/restock-requests`).catch(() => null),
            ]);

            if (prodRes) {
                const data = await prodRes.json();
                if (data.success && Array.isArray(data.products)) {
                    const lowStockFiltered = data.products
                        .filter((p) => {
                            const stock = p.stock !== undefined ? p.stock : (p.stockQuantity ?? 0);
                            const threshold = p.minStock || p.lowStockThreshold || 10;
                            return stock <= threshold;
                        })
                        .map((p) => ({
                            id: p._id || p.id,
                            name: p.name,
                            currentStock: p.stock !== undefined ? p.stock : (p.stockQuantity ?? 0),
                            threshold: p.minStock || p.lowStockThreshold || 10,
                            unit: p.unit || 'units',
                            category: p.category || 'Grocery',
                            image: p.image || p.imageUrl || '',
                            supplierName: p.supplierName || 'Central Food City',
                            supplierEmail: p.supplierEmail || '',
                        }));

                    setAlertItems(lowStockFiltered);
                } else {
                    setFetchError(true);
                }
            }

            if (reqRes) {
                const data = await reqRes.json();
                if (data.success) {
                    const fetchedNames = new Set();
                    if (Array.isArray(data.requests)) {
                        data.requests.forEach((r) => {
                            const statusClean = (r.status || '').trim();
                            if (activeStatuses.some((s) => s.toLowerCase() === statusClean.toLowerCase())) {
                                if (r.supplierName) fetchedNames.add(r.supplierName);
                                if (r.items && Array.isArray(r.items)) {
                                    r.items.forEach((it) => {
                                        const n = it.name || it.produce || it.product;
                                        if (n) fetchedNames.add(n);
                                    });
                                }
                            }
                        });
                    }
                    if (Array.isArray(data.replenishments)) {
                        data.replenishments.forEach((rep) => {
                            const statusClean = (rep.status || '').trim();
                            if (activeStatuses.some((s) => s.toLowerCase() === statusClean.toLowerCase())) {
                                if (rep.supplierName) fetchedNames.add(rep.supplierName);
                                if (rep.product) fetchedNames.add(rep.product);
                                if (rep.items && Array.isArray(rep.items)) {
                                    rep.items.forEach((it) => {
                                        const n = it.name || it.produce || it.product;
                                        if (n) fetchedNames.add(n);
                                    });
                                }
                            }
                        });
                    }
                    setSentItems((prev) => new Set([...prev, ...fetchedNames]));
                }
            }
        } catch (err) {
            setFetchError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.email]);

    const handleSendRequest = async (supplier, items) => {
        setSendingSupplier(supplier);
        const itemNames = items.map((i) => i.name);

        try {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const tomorrowFormatted = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

            let resolvedSupplierEmail = items.find((it) => it.supplierEmail)?.supplierEmail || '';
            if (!resolvedSupplierEmail) {
                const sLower = supplier.toLowerCase();
                if (sLower.includes('lanka mega') || sLower.includes('mega')) {
                    resolvedSupplierEmail = 'megasupplier@gmail.com';
                } else if (sLower.includes('central food') || sLower.includes('central')) {
                    resolvedSupplierEmail = 'centralfoodcity@gmail.com';
                }
            }

            const payload = {
                supplierName: supplier,
                supplierEmail: resolvedSupplierEmail,
                storeName: user?.shopName || user?.storeName || user?.name || 'GroceryMart',
                storeEmail: user?.email || '',
                deliveryDate: tomorrowFormatted,
                deliveryTarget: tomorrowFormatted,
                status: 'Pending',
                items: items.map((i) => ({
                    id: i.id,
                    name: i.name,
                    produce: i.name,
                    quantity: i.threshold ? i.threshold * 2 : 20,
                    qty: i.threshold ? i.threshold * 2 : 20,
                    unit: i.unit || 'pack',
                    currentStock: i.currentStock,
                    threshold: i.threshold || 10,
                    image: i.image || '',
                    imageUrl: i.image || '',
                })),
                notes: 'Automated low stock restock order.',
            };

            const res = await fetch(`${API_BASE_URL}/product-inventory/restock-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setSentItems((prev) => new Set([...prev, supplier, ...itemNames]));
                setToastMessage(`Restock request sent to ${supplier}!`);
                setTimeout(() => setToastMessage(''), 4000);
            }
        } catch (err) {
            console.warn('Failed to submit restock request:', err);
        } finally {
            setSendingSupplier(null);
        }
    };

    const groupedItems = alertItems.reduce((acc, item) => {
        const supplier = item.supplierName || 'Central Food City';
        if (!acc[supplier]) acc[supplier] = [];
        acc[supplier].push(item);
        return acc;
    }, {});

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* Header Title Row */}
            <View style={styles.titleRow}>
                <View>
                    <Text style={styles.pageTitle}>Stock alerts</Text>
                    <Text style={styles.subTitle}>Live Inventory Health</Text>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('dashboard')}
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
            </View>

            {/* Success Toast */}
            {toastMessage ? (
                <View style={styles.toastBanner}>
                    <CheckCircle2 size={18} color="#166534" />
                    <Text style={styles.toastBannerText}>{toastMessage}</Text>
                </View>
            ) : null}

            {/* Banner Card */}
            <View style={styles.bannerCard}>
                <View style={styles.bannerIconBox}>
                    <AlertTriangle size={22} color="#D97706" />
                </View>
                <View style={styles.bannerTextCol}>
                    <Text style={styles.bannerTitle}>
                        {isLoading ? 'Checking stock levels...' : `${alertItems.length} product${alertItems.length !== 1 ? 's' : ''} need attention`}
                    </Text>
                    <Text style={styles.bannerDesc}>
                        Automated threshold monitoring against product restock levels.
                    </Text>
                </View>
            </View>

            {/* Loading State Spinner */}
            {isLoading && (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="small" color="#166534" />
                    <Text style={styles.loadingText}>Fetching low stock items from database...</Text>
                </View>
            )}

            {/* Error State */}
            {!isLoading && fetchError && (
                <View style={styles.emptyBox}>
                    <AlertCircle size={40} color="#EF4444" />
                    <Text style={styles.emptyTitle}>Could not connect to backend.</Text>
                    <Text style={styles.emptySub}>Make sure the backend server is running on port 5000.</Text>
                </View>
            )}

            {/* Empty State */}
            {!isLoading && !fetchError && alertItems.length === 0 && (
                <View style={styles.emptyBox}>
                    <PackageCheck size={44} color="#166534" />
                    <Text style={[styles.emptyTitle, { color: '#166534' }]}>All products are well-stocked!</Text>
                    <Text style={styles.emptySub}>No items are below their minimum stock threshold right now.</Text>
                </View>
            )}

            {/* Alert Cards Stack */}
            {!isLoading && alertItems.length > 0 && (
                <View style={styles.alertList}>
                    {Object.entries(groupedItems).map(([supplier, items]) => {
                        const isGroupSent = sentItems.has(supplier) || items.some((it) => sentItems.has(it.name) || sentItems.has(it.id));
                        return (
                            <View key={supplier} style={styles.supplierGroup}>
                                <View style={styles.supplierHeader}>
                                    <View style={styles.supplierMetaRow}>
                                        <View style={styles.supplierAvatar}>
                                            <Text style={styles.supplierAvatarText}>
                                                {supplier.substring(0, 1).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.supplierName}>{supplier}</Text>
                                            <Text style={styles.supplierCount}>
                                                {items.length} item{items.length !== 1 ? 's' : ''} low on stock
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ width: '100%', marginTop: 12 }}>
                                        {isGroupSent ? (
                                            <View style={styles.sentBadge}>
                                                <CheckCircle2 size={15} color="#15803D" />
                                                <Text style={styles.sentBadgeText}>Request Sent</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.btnRow}>
                                                <TouchableOpacity
                                                    style={[styles.sendBtn, { flex: 1 }]}
                                                    onPress={() => handleSendRequest(supplier, items)}
                                                    disabled={sendingSupplier === supplier}
                                                    activeOpacity={0.85}
                                                >
                                                    {sendingSupplier === supplier ? (
                                                        <ActivityIndicator size="small" color="#D97706" />
                                                    ) : (
                                                        <Send size={15} color="#D97706" />
                                                    )}
                                                    <Text style={styles.sendBtnText}>
                                                        {sendingSupplier === supplier ? 'Sending...' : 'Send Request'}
                                                    </Text>
                                                </TouchableOpacity>

                                                {onNavigate && (
                                                    <TouchableOpacity
                                                        style={styles.reviewBtn}
                                                        onPress={() => {
                                                            let supEmail = items.find((it) => it.supplierEmail)?.supplierEmail || '';
                                                            if (!supEmail) {
                                                                if (supplier.toLowerCase().includes('lanka mega')) supEmail = 'megasupplier@gmail.com';
                                                                else if (supplier.toLowerCase().includes('central food')) supEmail = 'centralfoodcity@gmail.com';
                                                            }
                                                            onNavigate('restock_request', {
                                                                supplierName: supplier,
                                                                supplierEmail: supEmail,
                                                                items: items,
                                                                fromScreen: 'low_stock',
                                                                onRequestSent: () => {
                                                                    setSentItems((prev) => new Set([...prev, supplier, ...items.map(it => it.name)]));
                                                                },
                                                            });
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text style={styles.reviewBtnText}>Customize</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.itemsList}>
                                    {items.map((item) => {
                                        const isOut = item.currentStock === 0;
                                        return (
                                            <View
                                                key={item.id}
                                                style={[styles.itemCard, isOut && styles.itemCardOut]}
                                            >
                                                <View style={styles.itemAvatarBox}>
                                                    {item.image ? (
                                                        <Image source={{ uri: item.image }} style={styles.itemImg} resizeMode="cover" />
                                                    ) : (
                                                        <Text style={{ fontSize: 18 }}>{isOut ? '⚠️' : '📦'}</Text>
                                                    )}
                                                </View>
                                                <View style={styles.itemInfo}>
                                                    <Text style={styles.itemName}>{item.name}</Text>
                                                    <View style={[styles.stockBadge, isOut ? styles.stockBadgeOut : styles.stockBadgeLow]}>
                                                        <Text style={[styles.stockBadgeText, isOut ? styles.stockBadgeTextOut : styles.stockBadgeTextLow]}>
                                                            {isOut ? 'Out of Stock' : `${item.currentStock} / ${item.threshold} ${formatStockUnit(item.unit)}`}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    contentContainer: {
        padding: 18,
        paddingBottom: Platform.OS === 'android' ? 60 : 40,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    subTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
    },
    backBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    bannerCard: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 16,
        padding: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    bannerIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerTextCol: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#92400E',
    },
    bannerDesc: {
        fontSize: 12,
        fontWeight: '500',
        color: '#B45309',
        marginTop: 2,
    },
    loadingState: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    emptyBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 10,
    },
    emptySub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'center',
    },
    alertList: {
        flexDirection: 'column',
    },
    supplierGroup: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        marginBottom: 16,
    },
    supplierHeader: {
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 14,
        marginBottom: 12,
    },
    supplierMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    supplierAvatar: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#E0E7FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    supplierAvatarText: {
        color: '#3730A3',
        fontWeight: '800',
        fontSize: 17,
    },
    supplierName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 20,
    },
    supplierCount: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 2,
    },
    sendBtn: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        borderRadius: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reviewBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewBtnText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '700',
    },
    toastBanner: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        borderRadius: 14,
        padding: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    toastBannerText: {
        color: '#166534',
        fontSize: 13.5,
        fontWeight: '700',
        flex: 1,
    },
    sendBtnText: {
        color: '#D97706',
        fontSize: 13.5,
        fontWeight: '800',
    },
    sentBadge: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    sentBadgeText: {
        color: '#15803D',
        fontSize: 13.5,
        fontWeight: '800',
    },
    itemsList: {
        flexDirection: 'column',
        gap: 8,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemCardOut: {
        borderColor: '#FCA5A5',
    },
    itemAvatarBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    itemImg: {
        width: '100%',
        height: '100%',
    },
    itemInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
    },
    stockBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    stockBadgeLow: {
        backgroundColor: '#FEF3C7',
    },
    stockBadgeOut: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    stockBadgeText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    stockBadgeTextLow: {
        color: '#B45309',
    },
    stockBadgeTextOut: {
        color: '#DC2626',
    },
});
