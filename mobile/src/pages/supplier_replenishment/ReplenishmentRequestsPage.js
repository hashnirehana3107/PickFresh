import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Platform,
    Animated,
} from 'react-native';
import {
    ArrowLeft,
    RefreshCw,
    Clock,
    PackageCheck,
    Trash2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export default function ReplenishmentRequestsScreen({ onNavigate }) {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filterTab, setFilterTab] = useState('active'); // 'active' | 'delivered' | 'all'
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { cleanPo, targetId }
    const [spinAnim] = useState(new Animated.Value(0));

    const startSpin = () => {
        spinAnim.setValue(0);
        Animated.timing(spinAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    };

    const fetchRequests = async () => {
        startSpin();
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `${API_BASE_URL}/supplier-replenishment/requests?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.requests)) {
                setRequests(data.requests);
            }
        } catch (err) {
            console.error('Error fetching replenishment requests:', err.message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 8000);
        return () => clearInterval(interval);
    }, [user?.email]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchRequests();
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('home');
        }
    };

    const handleCardClick = (po) => {
        if (onNavigate) {
            onNavigate('request_details', { po });
        }
    };

    const activeRequests = requests.filter((r) => r.status !== 'Delivered');
    const deliveredRequests = requests.filter((r) => r.status === 'Delivered');

    const displayedRequests = requests.filter((r) => {
        if (filterTab === 'active') return r.status !== 'Delivered';
        if (filterTab === 'delivered') return r.status === 'Delivered';
        return true;
    });

    const handleDeleteOrder = async () => {
        if (!deleteConfirm) return;
        const { targetId } = deleteConfirm;
        setDeleteConfirm(null);
        try {
            const res = await fetch(`${API_BASE_URL}/supplier-replenishment/requests/${targetId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                setRequests((prev) => prev.filter((r) => (r._id || r.id || r.poId) !== targetId));
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const spinInterpolate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            {/* 🔝 Top Fixed Header Section */}
            <View style={styles.headerSection}>
                {/* Header Title Row */}
                <View style={styles.titleRow}>
                    <Text style={styles.pageTitle}>Replenishment Requests</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.refreshBtn}
                            onPress={handleRefresh}
                            activeOpacity={0.7}
                        >
                            <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                                <RefreshCw size={18} color="#475569" />
                            </Animated.View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={handleBack}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={18} color="#1E293B" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Status Filter Tabs (Active Orders vs Delivered History) */}
                <View style={styles.filterTabsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filterTab === 'active' && styles.filterTabActive,
                        ]}
                        onPress={() => setFilterTab('active')}
                        activeOpacity={0.8}
                    >
                        <Clock size={13} color={filterTab === 'active' ? '#15803D' : '#64748B'} />
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.filterTabText,
                                filterTab === 'active' && { color: '#15803D', fontWeight: '800' },
                            ]}
                        >
                            Active ({activeRequests.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filterTab === 'delivered' && styles.filterTabActive,
                        ]}
                        onPress={() => setFilterTab('delivered')}
                        activeOpacity={0.8}
                    >
                        <PackageCheck size={13} color={filterTab === 'delivered' ? '#2563EB' : '#64748B'} />
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.filterTabText,
                                filterTab === 'delivered' && { color: '#2563EB', fontWeight: '800' },
                            ]}
                        >
                            Delivered ({deliveredRequests.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filterTab === 'all' && styles.filterTabActive,
                        ]}
                        onPress={() => setFilterTab('all')}
                        activeOpacity={0.8}
                    >
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.filterTabText,
                                filterTab === 'all' && { color: '#1E293B', fontWeight: '800' },
                            ]}
                        >
                            All ({requests.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 📜 Scrollable Content Area */}
            <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="small" color="#27672D" />
                        <Text style={styles.centerText}>Loading requests from MongoDB...</Text>
                    </View>
                ) : displayedRequests.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>
                            {filterTab === 'active'
                                ? 'No active replenishment orders pending.'
                                : 'No delivered order history found.'}
                        </Text>
                    </View>
                ) : (
                    displayedRequests.map((req) => {
                        const isDelivered = req.status === 'Delivered';
                        const displayPoId = req.poId || req.id || req._id || 'PO-0001';
                        const cleanPo = displayPoId.startsWith('#') ? displayPoId : `#${displayPoId}`;

                        const itemsList = Array.isArray(req.items) && req.items.length > 0
                            ? req.items
                            : (req.itemsSummary
                                ? req.itemsSummary.split(',').map((s) => ({ produce: s.trim(), qty: 1 }))
                                : [{ produce: req.product, qty: req.reorderUnits }]);

                        const maxVisible = 2;
                        const hasMore = itemsList.length > maxVisible;

                        return (
                            <TouchableOpacity
                                key={req.id || req._id}
                                style={[
                                    styles.requestCard,
                                    isDelivered && { opacity: 0.95 },
                                ]}
                                onPress={() => handleCardClick(req)}
                                activeOpacity={0.85}
                            >
                                {/* Top Header Row */}
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.storeNameBox}>
                                        <Text style={styles.storeNameText}>{req.store || req.storeName}</Text>
                                        <View style={styles.poBadge}>
                                            <Text style={styles.poBadgeText}>{cleanPo}</Text>
                                        </View>
                                    </View>

                                    <View
                                        style={[
                                            styles.statusPill,
                                            isDelivered ? styles.statusPillDelivered : styles.statusPillPending,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusPillText,
                                                isDelivered ? styles.statusTextDelivered : styles.statusTextPending,
                                            ]}
                                        >
                                            {req.status}
                                        </Text>
                                    </View>
                                </View>

                                {/* Items Breakdown Container */}
                                <View style={styles.itemsBox}>
                                    <Text style={styles.itemsBoxHeader}>
                                        Requested Items ({itemsList.length})
                                    </Text>

                                    {itemsList.slice(0, maxVisible).map((it, idx) => (
                                        <View key={idx} style={styles.itemRow}>
                                            <View style={styles.itemLeft}>
                                                <Text style={styles.itemDot}>•</Text>
                                                <Text style={styles.itemName} numberOfLines={1}>
                                                    {it.produce || it.name}
                                                </Text>
                                            </View>
                                            <View style={styles.qtyBadge}>
                                                <Text style={styles.qtyBadgeText}>
                                                    {it.qty || 1} {it.unit || 'pack'}s
                                                </Text>
                                            </View>
                                        </View>
                                    ))}

                                    {hasMore && (
                                        <Text style={styles.moreItemsText}>
                                            + {itemsList.length - maxVisible} more product(s) in this PO • Click to view details
                                        </Text>
                                    )}
                                </View>

                                {/* Bottom Metadata Row */}
                                <View style={styles.cardFooterRow}>
                                    <Text style={styles.stockText}>
                                        Current stock:{' '}
                                        <Text style={styles.stockRed}>{req.unitsLeft || 0} units</Text>
                                    </Text>
                                    <View style={styles.reorderPill}>
                                        <Text style={styles.reorderText}>
                                            Reorder: {req.reorderUnits || 20} Units
                                        </Text>
                                    </View>
                                </View>

                                {/* If Delivered, Delete Option */}
                                {isDelivered && (
                                    <View style={styles.deleteRow}>
                                        <TouchableOpacity
                                            style={styles.deleteOrderBtn}
                                            onPress={(e) => {
                                                const targetId = req._id || req.id || req.poId;
                                                setDeleteConfirm({ cleanPo, targetId });
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Trash2 size={13} color="#DC2626" />
                                            <Text style={styles.deleteOrderBtnText}>Delete Order Record</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* 🔒 Fixed Bottom Action Bar */}
            <View style={styles.bottomActionBar}>
                <TouchableOpacity
                    style={styles.returnBtn}
                    onPress={handleBack}
                    activeOpacity={0.8}
                >
                    <Text style={styles.returnBtnText}>Return to Supplier Dashboard</Text>
                </TouchableOpacity>
            </View>

            {/* Custom Delete Confirmation Modal */}
            <Modal visible={!!deleteConfirm} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <Trash2 size={26} color="#DC2626" />
                        </View>
                        <Text style={styles.modalTitle}>Delete Order Record?</Text>
                        <Text style={styles.modalDesc}>
                            This will permanently remove <Text style={{ fontWeight: '800', color: '#0F172A' }}>{deleteConfirm?.cleanPo}</Text> from the database. This cannot be undone.
                        </Text>
                        <View style={styles.modalBtnGroup}>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={handleDeleteOrder}
                                activeOpacity={0.8}
                            >
                                <Trash2 size={16} color="#FFFFFF" />
                                <Text style={styles.confirmDeleteBtnText}>Yes, Delete Permanently</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelDeleteBtn}
                                onPress={() => setDeleteConfirm(null)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    headerSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 10,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.4,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    refreshBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterTabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        borderRadius: 10,
    },
    filterTabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: Platform.OS === 'android' ? 60 : 32,
    },
    centerBox: {
        paddingVertical: 32,
        alignItems: 'center',
        gap: 8,
    },
    centerText: {
        fontSize: 13,
        color: '#64748B',
    },
    emptyBox: {
        padding: 32,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
    },
    requestCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    storeNameBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    storeNameText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
    },
    poBadge: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    poBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1E293B',
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusPillPending: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
    },
    statusPillDelivered: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '800',
    },
    statusTextPending: {
        color: '#B45309',
    },
    statusTextDelivered: {
        color: '#166534',
    },
    itemsBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginVertical: 8,
        gap: 6,
    },
    itemsBoxHeader: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    itemDot: {
        color: '#166534',
        fontWeight: '900',
        fontSize: 14,
    },
    itemName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
    },
    qtyBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    qtyBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#15803D',
    },
    moreItemsText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#2563EB',
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#CBD5E1',
        borderStyle: 'dashed',
    },
    cardFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    stockText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    stockRed: {
        color: '#E11D48',
        fontWeight: '700',
    },
    reorderPill: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    reorderText: {
        fontSize: 12,
        color: '#334155',
        fontWeight: '700',
    },
    deleteRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    deleteOrderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    deleteOrderBtnText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#DC2626',
    },
    bottomActionBar: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    returnBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#27672D',
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    returnBtnText: {
        color: '#27672D',
        fontSize: 14.5,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 24,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 20,
        width: '100%',
        maxWidth: 325,
        alignItems: 'center',
    },
    modalIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FEF2F2',
        borderWidth: 2,
        borderColor: '#FCA5A5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    modalDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    modalBtnGroup: {
        width: '100%',
        gap: 10,
    },
    confirmDeleteBtn: {
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    confirmDeleteBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    cancelDeleteBtn: {
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelDeleteBtnText: {
        color: '#334155',
        fontSize: 15,
        fontWeight: '700',
    },
});
