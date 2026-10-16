import React, { useState, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Animated,
    Easing,
} from 'react-native';
import {
    Check,
    Truck,
    Clock,
    RefreshCw,
    ArrowLeft,
    PackageCheck,
    Package,
    Box,
    CheckCircle2,
    Trash2,
    Edit3,
    Zap,
    ChevronDown,
    ChevronUp,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, API_HOST } from '../../config/api';

const DEFAULT_DELIVERIES = [];

const resolveImageUrl = (img) => {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
        return img;
    }
    const cleanImg = img.startsWith('/') ? img : `/${img}`;
    return `${API_HOST || 'http://localhost:5000'}${cleanImg}`;
};

const formatDate = (dateVal) => {
    if (!dateVal) return '10 Oct 2026';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return '10 Oct 2026';
    }
};

export default function DeliveryTrackingScreen({ onNavigate, po, isSupplier: isSupplierProp }) {
    const { user } = useAuth();
    const isSupplier = isSupplierProp !== undefined
        ? isSupplierProp
        : (user?.role === 'supplier' || !!user?.supplierName || !user?.shopName);
    const [deliveriesList, setDeliveriesList] = useState(po ? [po] : []);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(!po);
    const [updating, setUpdating] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [expandedCompletedPoIds, setExpandedCompletedPoIds] = useState({});
    const [hasInitializedCompleted, setHasInitializedCompleted] = useState(false);

    const [trackingFilter, setTrackingFilter] = useState('active'); // Default 'active' matching Image 5

    const [isEditingEta, setIsEditingEta] = useState(false);
    const [newEtaValue, setNewEtaValue] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    const spinAnim = React.useRef(new Animated.Value(0)).current;

    const startSpin = () => {
        spinAnim.setValue(0);
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 750,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    };

    const stopSpin = () => {
        spinAnim.stopAnimation();
        spinAnim.setValue(0);
    };

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const fetchTracking = async (isManual = false) => {
        if (!isManual) setLoading(true);
        try {
            let endpoint = `${API_BASE_URL}/supplier-replenishment/delivery-tracking`;
            if (isSupplier) {
                const supplierName = user?.supplierName || user?.companyName || user?.name || '';
                const supplierEmail = user?.email || '';
                const params = [];
                if (supplierName) params.push(`supplierName=${encodeURIComponent(supplierName)}`);
                if (supplierEmail) params.push(`supplierEmail=${encodeURIComponent(supplierEmail)}`);
                params.push(`_t=${Date.now()}`);
                endpoint += `?${params.join('&')}`;
            } else {
                const currentStoreName = user?.shopName || user?.storeName || (user?.name && !user?.name.includes(' ') && user?.name !== 'Shop Owner' && user?.name !== 'Kamal Bandara' ? user?.name : 'GroceryMart');
                const currentStoreEmail = user?.email || (currentStoreName.toLowerCase().includes('lanka') ? 'lankamart@gmail.com' : 'grocerymart@gmail.com');
                const params = [];
                if (currentStoreName) params.push(`storeName=${encodeURIComponent(currentStoreName)}`);
                if (currentStoreEmail) params.push(`storeEmail=${encodeURIComponent(currentStoreEmail)}`);
                params.push(`_t=${Date.now()}`);
                if (params.length > 0) endpoint += `?${params.join('&')}`;
            }

            const res = await fetch(endpoint, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                }
            });
            const data = await res.json();
            if (isSupplier) {
                if (data.success && Array.isArray(data.deliveries)) {
                    setDeliveriesList(data.deliveries);
                } else if (data.delivery) {
                    setDeliveriesList([data.delivery]);
                } else if (po) {
                    setDeliveriesList([po]);
                } else {
                    setDeliveriesList([]);
                }
            } else {
                const currentStoreName = (user?.shopName || user?.storeName || (user?.name && !user?.name.includes(' ') && user?.name !== 'Shop Owner' && user?.name !== 'Kamal Bandara' ? user?.name : 'GroceryMart')).toLowerCase().trim();
                const rawList = data.success && Array.isArray(data.deliveries) ? data.deliveries : (data.delivery ? [data.delivery] : []);
                const storeFiltered = rawList.filter((d) => {
                    const dStore = (d.storeName || '').toLowerCase().trim();
                    return dStore === currentStoreName || dStore.includes(currentStoreName) || currentStoreName.includes(dStore);
                });

                if (storeFiltered.length > 0) {
                    setDeliveriesList(storeFiltered);
                } else if (po) {
                    setDeliveriesList([po]);
                } else {
                    setDeliveriesList([]);
                }
            }
        } catch (err) {
            console.warn('Error fetching delivery tracking:', err.message);
            if (po) setDeliveriesList([po]);
            else setDeliveriesList([]);
        } finally {
            if (!isManual) setLoading(false);
        }
    };

    useEffect(() => {
        fetchTracking();
    }, [po, user?.email, user?.supplierName]);

    const isMatchingSupplierItem = (item) => {
        if (!isSupplier || !user) return true;
        const sEmail = (user.email || '').trim().toLowerCase();
        const sName = (user.supplierName || user.companyName || user.name || '').trim().toLowerCase();
        const itemEmail = (item.supplierEmail || '').trim().toLowerCase();
        const itemName = (item.supplierName || '').trim().toLowerCase();

        if (sEmail && itemEmail && sEmail === itemEmail) return true;
        if (sName && itemName && (sName === itemName || itemName.includes(sName) || sName.includes(itemName))) return true;
        return false;
    };

    const activeDeliveriesList = useMemo(() => {
        return deliveriesList.filter((item) => isMatchingSupplierItem(item) && item.status !== 'Delivered');
    }, [deliveriesList, isSupplier, user?.email, user?.supplierName, user?.name]);

    const completedDeliveriesList = useMemo(() => {
        return deliveriesList.filter((item) => isMatchingSupplierItem(item) && item.status === 'Delivered');
    }, [deliveriesList, isSupplier, user?.email, user?.supplierName, user?.name]);

    useEffect(() => {
        if (!hasInitializedCompleted && completedDeliveriesList.length > 0) {
            const firstItem = completedDeliveriesList[0];
            const firstId = firstItem.poId || firstItem.id || firstItem._id;
            if (firstId) {
                setExpandedCompletedPoIds((prev) => ({
                    ...prev,
                    [firstId]: true,
                }));
                setHasInitializedCompleted(true);
            }
        }
    }, [hasInitializedCompleted, completedDeliveriesList]);

    const currentList = trackingFilter === 'completed' ? completedDeliveriesList : activeDeliveriesList;
    const activeItem = currentList[selectedIndex] || currentList[0] || null;

    const rawPoId = activeItem ? (activeItem.poId || activeItem.id || activeItem._id || 'PO-1331') : '';
    const displayPoId = rawPoId.length > 18 ? `PO-${rawPoId.substring(rawPoId.length - 4).toUpperCase()}` : rawPoId;
    const cleanPoNumber = displayPoId.startsWith('#') ? displayPoId : `#${displayPoId}`;

    const storeName = activeItem ? (activeItem.storeName || activeItem.store || 'GroceryMart') : '';
    const currentStatus = activeItem ? (activeItem.status || 'Pending Approval') : 'Pending Approval';

    const handleUpdateStatus = async (newStatus) => {
        if (!activeItem) return;
        setUpdating(true);
        try {
            const targetId = activeItem.poId || activeItem._id || activeItem.id;
            const res = await fetch(`${API_BASE_URL}/supplier-replenishment/update-po-status/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setDeliveriesList((prev) => prev.map((item) => {
                    const itemId = item.poId || item._id || item.id;
                    return (itemId === targetId || item === activeItem) ? { ...item, status: newStatus } : item;
                }));
                if (newStatus === 'Delivered') {
                    setToastMsg(`Order ${cleanPoNumber} delivered & removed from Active Orders! ✅`);
                    setSelectedIndex(0);
                } else {
                    setToastMsg(`Status updated to ${newStatus}! 📦`);
                }
                setTimeout(() => setToastMsg(''), 3500);
            }
        } catch (err) {
            console.error('Failed to update status:', err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleSaveEta = async () => {
        const parsedEta = parseInt(newEtaValue, 10);
        if (isNaN(parsedEta) || parsedEta < 0 || !activeItem) return;

        setUpdating(true);
        try {
            const targetId = activeItem.poId || activeItem._id || activeItem.id;
            const res = await fetch(`${API_BASE_URL}/supplier-replenishment/update-po-status/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ etaMinutes: parsedEta, deliveryTarget: `${parsedEta} mins` }),
            });
            const data = await res.json();
            if (data.success) {
                setDeliveriesList((prev) => prev.map((item) => {
                    const itemId = item.poId || item._id || item.id;
                    return (itemId === targetId || item === activeItem)
                        ? { ...item, etaMinutes: parsedEta, deliveryTarget: `${parsedEta} mins` }
                        : item;
                }));
                setIsEditingEta(false);
                setToastMsg(`Delivery ETA updated to ${parsedEta} mins! ⏱️`);
                setTimeout(() => setToastMsg(''), 3000);
                fetchTracking(true);
            }
        } catch (err) {
            console.error('Failed to update ETA:', err.message);
        } finally {
            setUpdating(false);
        }
    };

    const isStep1Done = true;
    const isStep2Done = ['Accepted', 'Confirmed', 'Packed', 'Dispatched', 'In Transit', 'Delivered'].includes(currentStatus);
    const isStep3Done = ['Packed', 'Dispatched', 'In Transit', 'Delivered'].includes(currentStatus);
    const isStep4Done = ['Dispatched', 'In Transit', 'Delivered'].includes(currentStatus);
    const isStep5Done = currentStatus === 'Delivered';

    const steps = [
        { id: 1, label: 'Requested', completed: isStep1Done },
        { id: 2, label: 'Confirmed', completed: isStep2Done },
        { id: 3, label: 'Packed', completed: isStep3Done },
        { id: 4, label: 'Dispatched', completed: isStep4Done },
        { id: 5, label: 'Delivered', completed: isStep5Done },
    ];

    const handleBack = () => {
        if (onNavigate) {
            if (isSupplier) {
                onNavigate('supplier_portal');
            } else {
                onNavigate('supplier_list');
            }
        }
    };

    const toggleExpandOrder = (targetId) => {
        setExpandedCompletedPoIds((prev) => ({
            ...prev,
            [targetId]: !prev[targetId],
        }));
    };

    const getBadgeStyle = (status) => {
        switch (status) {
            case 'Delivered':
                return { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' };
            case 'In Transit':
            case 'Dispatched':
                return { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' };
            case 'Packed':
            case 'Accepted':
            case 'Confirmed':
                return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
            default:
                return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
        }
    };

    const badgeStyle = getBadgeStyle(currentStatus);

    return (
        <View style={styles.container}>
            {/* 🔝 Top Fixed Header Section */}
            <View style={styles.headerSection}>
                {/* Header Title Row */}
                <View style={styles.titleRow}>
                    <Text style={styles.pageTitle}>Delivery Tracking</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[styles.syncBtn, isSyncing && styles.syncBtnActive]}
                            onPress={async () => {
                                if (isSyncing) return;
                                setIsSyncing(true);
                                startSpin();
                                try {
                                    await fetchTracking(true);
                                    setToastMsg('Synced with live database! 🔄');
                                    setTimeout(() => setToastMsg(''), 3000);
                                } catch (err) {
                                    setToastMsg('Sync failed. Please check connection.');
                                    setTimeout(() => setToastMsg(''), 3000);
                                } finally {
                                    setIsSyncing(false);
                                    stopSpin();
                                }
                            }}
                            disabled={isSyncing}
                            activeOpacity={0.7}
                        >
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <RefreshCw size={13.5} color="#16A34A" />
                            </Animated.View>
                            <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing...' : 'Sync'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={handleBack}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={18} color="#0F172A" />
                        </TouchableOpacity>
                    </View>
                </View>

                {toastMsg ? (
                    <View style={styles.toastBanner}>
                        <Check size={16} color="#15803D" />
                        <Text style={styles.toastBannerText}>{toastMsg}</Text>
                    </View>
                ) : null}

                {/* Filter Tabs: Active Orders vs Completed History */}
                <View style={styles.filterTabsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.filterTabActive,
                            trackingFilter === 'active' && styles.filterTabActiveActive,
                        ]}
                        onPress={() => { setTrackingFilter('active'); setSelectedIndex(0); }}
                        activeOpacity={0.8}
                    >
                        <Clock size={13} color={trackingFilter === 'active' ? '#15803D' : '#64748B'} />
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.filterTabText,
                                trackingFilter === 'active' && styles.filterTabTextActiveActive,
                            ]}
                        >
                            Active Orders ({activeDeliveriesList.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTabCompleted,
                            trackingFilter === 'completed' && styles.filterTabActiveCompleted,
                        ]}
                        onPress={() => { setTrackingFilter('completed'); setSelectedIndex(0); }}
                        activeOpacity={0.8}
                    >
                        <Box size={13} color={trackingFilter === 'completed' ? '#2563EB' : '#64748B'} />
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.filterTabText,
                                trackingFilter === 'completed' && styles.filterTabTextActiveCompleted,
                            ]}
                        >
                            Completed History ({completedDeliveriesList.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Horizontal Selector Pills if multiple active orders */}
                {trackingFilter === 'active' && activeDeliveriesList.length > 1 && (
                    <View style={styles.orderTabsRow}>
                        <Text style={styles.orderTabsLabel}>ACTIVE ORDERS:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.orderTabsScroll}>
                            {activeDeliveriesList.map((item, idx) => {
                                const pId = item.poId || item.id || item._id || '';
                                const cleanPId = pId.length > 18 ? `PO-${pId.substring(pId.length - 4).toUpperCase()}` : pId;
                                const isSel = idx === selectedIndex;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.orderTabPill, isSel && styles.orderTabPillActive]}
                                        onPress={() => setSelectedIndex(idx)}
                                    >
                                        <Text style={[styles.orderTabPillText, isSel && styles.orderTabPillTextActive]}>
                                            #{cleanPId}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* 📜 Scrollable Content Area */}
            <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {loading && deliveriesList.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <ActivityIndicator size="large" color="#15803D" />
                        <Text style={[styles.emptyTitle, { marginTop: 14 }]}>Loading deliveries from database...</Text>
                        <Text style={styles.emptySub}>Syncing latest supplier orders</Text>
                    </View>
                ) : trackingFilter === 'completed' ? (
                    completedDeliveriesList.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <PackageCheck size={32} color="#15803D" />
                            <Text style={styles.emptyTitle}>No Delivered Orders Yet</Text>
                            <Text style={styles.emptySub}>
                                Completed delivery history will be archived and shown here once orders are fulfilled.
                            </Text>
                        </View>
                    ) : (
                        completedDeliveriesList.map((item, idx) => {
                            const itemId = item.poId || item.id || item._id || `completed-${idx}`;
                            const cleanPId = itemId.length > 18 ? `PO-${itemId.substring(itemId.length - 4).toUpperCase()}` : itemId;
                            const cleanPoNumber = String(cleanPId).startsWith('#') ? cleanPId : `#${cleanPId}`;
                            const isExpanded = !!expandedCompletedPoIds[itemId] || !!expandedCompletedPoIds[cleanPoNumber] || !!expandedCompletedPoIds[String(item.poId)];

                            const totalItemsCount = item.items ? item.items.length : 1;
                            const itemsSummaryText = item.items && item.items.length > 0
                                ? item.items.map((i) => `${i.produce || i.name} (${i.qty || 1} ${i.unit || 'pack'})`).join(', ')
                                : (item.product || item.itemsSummary || 'Fresh Produce Restock');

                            const calculatedTotal = item.totalAmount || (item.items ? item.items.reduce((sum, i) => sum + (i.subtotal || ((Number(i.wholesaleRate || i.wholesalePrice || i.price || 0) || 150) * (i.qty || 1))), 0) : 0);

                            const storeName = item.storeName || item.store || 'GroceryMart';
                            const supplierName = item.supplierName || user?.supplierName || user?.name || 'Central Food City';

                            return (
                                <View
                                    key={itemId}
                                    style={[
                                        styles.completedCard,
                                        isExpanded && styles.completedCardExpanded
                                    ]}
                                >
                                    {/* Summary Card Header (Click to toggle expand/collapse) */}
                                    <TouchableOpacity
                                        onPress={() => toggleExpandOrder(itemId)}
                                        activeOpacity={0.85}
                                        style={[
                                            styles.completedCardHeader,
                                            isExpanded && styles.completedCardHeaderExpanded
                                        ]}
                                    >
                                        {/* Top Row: PO Badge + Delivered Tag */}
                                        <View style={styles.completedTopRow}>
                                            <Text style={styles.completedReqTitle}>
                                                Request <Text style={styles.completedPoHighlight}>{cleanPoNumber}</Text>
                                            </Text>
                                            <View style={styles.deliveredTag}>
                                                <CheckCircle2 size={13} color="#15803D" />
                                                <Text style={styles.deliveredTagText}>DELIVERED</Text>
                                            </View>
                                        </View>

                                        {/* Store & Supplier */}
                                        <View style={styles.completedStoreRow}>
                                            <Text style={styles.completedStoreText}>
                                                Target Store: <Text style={styles.completedStoreNameBold}>{storeName}</Text>
                                                <Text style={styles.completedDotSep}> • </Text>
                                                Supplier: <Text style={styles.completedSupplierNameBold}>{supplierName}</Text>
                                            </Text>
                                        </View>

                                        {/* Date */}
                                        <Text style={styles.completedDateText}>
                                            {formatDate(item.requestedDate || item.createdAt)}
                                        </Text>

                                        {/* Summary Bar */}
                                        <View style={[styles.completedSummaryBar, isExpanded && styles.completedSummaryBarExpanded]}>
                                            <View style={styles.completedSummaryLeft}>
                                                <Package size={16} color="#15803D" style={{ flexShrink: 0 }} />
                                                <Text style={styles.completedSummaryItemsText} numberOfLines={1}>
                                                    {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}: {itemsSummaryText}
                                                </Text>
                                            </View>

                                            <View style={styles.completedSummaryRight}>
                                                <Text style={styles.completedSummaryPriceText}>
                                                    Rs. {calculatedTotal.toLocaleString()}
                                                </Text>
                                                <View style={[styles.completedExpandCircle, isExpanded && styles.completedExpandCircleExpanded]}>
                                                    {isExpanded ? (
                                                        <ChevronUp size={16} color="#FFFFFF" strokeWidth={2.5} />
                                                    ) : (
                                                        <ChevronDown size={16} color="#334155" strokeWidth={2.5} />
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Expanded Details Body */}
                                    {isExpanded && (
                                        <View style={styles.completedExpandedBody}>
                                            {/* Supplier Info Box */}
                                            <View style={styles.supplierCardBox}>
                                                <View style={styles.supplierCardTopRow}>
                                                    <View style={styles.supplierTruckIconWrap}>
                                                        <Truck size={17} color="#15803D" />
                                                    </View>
                                                    <View style={styles.supplierCardInfoCol}>
                                                        <Text style={styles.supplierCardLabel}>Supplier:</Text>
                                                        <Text style={styles.supplierCardName} numberOfLines={2}>
                                                            {supplierName}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.statusYellowAlertBox}>
                                                    <View style={styles.statusYellowLeftWrap}>
                                                        <Clock size={13} color="#D97706" />
                                                        <Text style={styles.statusYellowLabelText}>Status:</Text>
                                                        <Text style={styles.statusYellowValText} numberOfLines={2}>
                                                            Fully Delivered & Restocked
                                                        </Text>
                                                    </View>
                                                    <View style={styles.completedPillBadge}>
                                                        <Text style={styles.completedPillBadgeText}>Completed</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Ordered Products Section */}
                                            <View style={styles.orderedProdSectionWrap}>
                                                <View style={styles.orderedProdSectionHeader}>
                                                    <Package size={14} color="#15803D" />
                                                    <Text style={styles.orderedProdSectionHeaderText}>ORDERED PRODUCTS LIST</Text>
                                                </View>

                                                {item.items && item.items.length > 0 ? (
                                                    <View style={styles.orderedProdListStack}>
                                                        {item.items.map((prodItem, pIdx) => {
                                                            const prodName = prodItem.produce || prodItem.name || 'Product';
                                                            const qty = prodItem.qty || 1;
                                                            const unit = prodItem.unit || 'pack';
                                                            const rate = Number(prodItem.wholesaleRate || prodItem.wholesalePrice || prodItem.price || 0) || 150;
                                                            const itemSubtotal = prodItem.subtotal || (qty * rate);
                                                            const itemImage = prodItem.image || prodItem.imageUrl || '';

                                                            return (
                                                                <View key={pIdx} style={styles.prodItemRowCard}>
                                                                    <View style={styles.prodItemLeft}>
                                                                        <View style={styles.prodItemThumbWrap}>
                                                                            {itemImage ? (
                                                                                <Image
                                                                                    source={{ uri: resolveImageUrl(itemImage) }}
                                                                                    style={styles.prodItemThumbImg}
                                                                                    resizeMode="cover"
                                                                                />
                                                                            ) : (
                                                                                <View style={styles.prodItemFallback}>
                                                                                    <Package size={20} color="#15803D" />
                                                                                </View>
                                                                            )}
                                                                        </View>
                                                                        <View style={styles.prodItemTextCol}>
                                                                            <Text style={styles.prodItemTitle} numberOfLines={2}>
                                                                                {prodName}
                                                                            </Text>
                                                                            <Text style={styles.prodItemWholesale}>
                                                                                Wholesale: <Text style={styles.prodItemRateBold}>Rs. {rate.toLocaleString()}/{unit}</Text>
                                                                            </Text>
                                                                        </View>
                                                                    </View>

                                                                    <View style={styles.prodItemRight}>
                                                                        <View style={styles.prodItemQtyBadge}>
                                                                            <Text style={styles.prodItemQtyBadgeText}>
                                                                                {qty} {unit.endsWith('s') ? unit : `${unit}s`}
                                                                            </Text>
                                                                        </View>
                                                                        <Text style={styles.prodItemSubtotalText}>
                                                                            Rs. {itemSubtotal.toLocaleString()}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                ) : (
                                                    <View style={styles.prodItemRowCard}>
                                                        <View style={styles.prodItemLeft}>
                                                            <View style={styles.prodItemFallback}>
                                                                <Package size={18} color="#15803D" />
                                                            </View>
                                                            <Text style={styles.prodItemTitle}>
                                                                {item.product || item.itemsSummary || 'Fresh Produce Restock'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )}

                                                {/* Order Total Value Yellow Box */}
                                                <View style={styles.orderTotalValueYellowBox}>
                                                    <Text style={styles.orderTotalValueLabel}>Order Total Value</Text>
                                                    <Text style={styles.orderTotalValueNum}>
                                                        Rs. {calculatedTotal.toLocaleString()}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Timeline Stepper for Completed Order */}
                                            <View style={styles.timelineStepperCard}>
                                                <Text style={styles.timelineStepperTitle}>DISPATCH TIMELINE</Text>
                                                <View style={styles.stepperNodesStack}>
                                                    {steps.map((step, sIdx) => {
                                                        const isLast = sIdx === steps.length - 1;
                                                        return (
                                                            <View key={step.id} style={[styles.timelineStepNode, isLast && styles.timelineStepNodeLast]}>
                                                                {!isLast && <View style={styles.timelineStepLine} />}
                                                                <View style={styles.timelineStepCircle}>
                                                                    <Check size={13} color="#FFFFFF" strokeWidth={3} />
                                                                </View>
                                                                <Text style={styles.timelineStepLabel}>{step.label}</Text>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>

                                            {/* Delivered Badge & Delete Record Button (matching Image 1 100%) */}
                                            {isSupplier && (
                                                <View style={styles.completedActionsStack}>
                                                    <View style={styles.deliveredBadgeBox}>
                                                        <Check size={16} color="#15803D" strokeWidth={2.5} />
                                                        <Text style={styles.deliveredBadgeBoxText}>Order Delivered & Handed Off to Store</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.deletePermBtn}
                                                        onPress={() => {
                                                            setItemToDelete(item);
                                                            setDeleteConfirm(true);
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Trash2 size={15} color="#DC2626" />
                                                        <Text style={styles.deletePermBtnText}>Delete Order Record</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}

                                            {/* Quick Collapse Button at Bottom of Details */}
                                            <TouchableOpacity
                                                style={styles.collapseDetailsBtn}
                                                onPress={() => toggleExpandOrder(itemId)}
                                                activeOpacity={0.8}
                                            >
                                                <ChevronUp size={15} color="#64748B" />
                                                <Text style={styles.collapseDetailsBtnText}>Collapse Order Details</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )
                ) : (!activeItem || activeDeliveriesList.length === 0) ? (
                    <View style={styles.emptyCard}>
                        <PackageCheck size={32} color="#15803D" />
                        <Text style={styles.emptyTitle}>No Active Delivery Orders</Text>
                        <Text style={styles.emptySub}>
                            All store replenishment requests have been fulfilled or there are no pending orders right now.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.activeCardWrapper}>
                        {/* Status Card */}
                        <View style={styles.statusCard}>
                            <View style={styles.statusCardTop}>
                                <View>
                                    <Text style={styles.reqBadgeText}>
                                        Request <Text style={styles.poHighlight}>{cleanPoNumber}</Text>
                                    </Text>
                                    <Text style={styles.targetStoreText}>
                                        Target Store: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{storeName}</Text>
                                    </Text>
                                </View>
                                <View style={[styles.statusPill, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
                                    <Text style={[styles.statusPillText, { color: badgeStyle.color }]}>
                                        {currentStatus}
                                    </Text>
                                </View>
                            </View>

                            {/* Supplier & ETA Box */}
                            <View style={styles.supplierEtaBox}>
                                <View style={styles.supplierRow}>
                                    <View style={styles.truckIconWrap}>
                                        <Truck size={18} color="#15803D" />
                                    </View>
                                    <View style={styles.supplierTextBox}>
                                        <Text style={styles.supplierLabel}>Supplier:</Text>
                                        <Text style={styles.supplierVal}>
                                            {activeItem.supplierName || user?.supplierName || user?.name || 'Wholesale Supplier'}
                                        </Text>
                                    </View>
                                </View>

                                {/* ETA Bar */}
                                <View style={styles.etaBar}>
                                    <View style={styles.etaLeft}>
                                        <Clock size={15} color="#D97706" />
                                        <Text style={styles.etaLabel}>ETA:</Text>
                                        {!isEditingEta && (
                                            <Text style={styles.etaVal}>
                                                {activeItem.etaMinutes !== undefined && activeItem.etaMinutes !== null
                                                    ? (String(activeItem.etaMinutes).includes('min') ? activeItem.etaMinutes : `${activeItem.etaMinutes} mins`)
                                                    : (activeItem.deliveryTarget || '24 mins')}
                                            </Text>
                                        )}
                                    </View>

                                    {isSupplier && (
                                        isEditingEta ? (
                                            <View style={styles.editEtaGroup}>
                                                <TextInput
                                                    style={styles.etaInput}
                                                    keyboardType="numeric"
                                                    value={String(newEtaValue)}
                                                    onChangeText={setNewEtaValue}
                                                    autoFocus
                                                />
                                                <Text style={styles.minsText}>mins</Text>
                                                <TouchableOpacity style={styles.saveEtaBtn} onPress={handleSaveEta}>
                                                    <Text style={styles.saveEtaBtnText}>Save</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.cancelEtaBtn} onPress={() => setIsEditingEta(false)}>
                                                    <Text style={styles.cancelEtaBtnText}>✕</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.editEtaBtn}
                                                onPress={() => {
                                                    const currentVal = activeItem.etaMinutes !== undefined && activeItem.etaMinutes !== null
                                                        ? String(activeItem.etaMinutes).replace(/[^0-9]/g, '')
                                                        : (activeItem.deliveryTarget ? String(activeItem.deliveryTarget).replace(/[^0-9]/g, '') : '24');
                                                    setNewEtaValue(currentVal || '24');
                                                    setIsEditingEta(true);
                                                }}
                                            >
                                                <Edit3 size={12} color="#D97706" />
                                                <Text style={styles.editEtaBtnText}>Edit ETA</Text>
                                            </TouchableOpacity>
                                        )
                                    )}
                                </View>
                            </View>

                            {/* Ordered Products Section */}
                            <View style={styles.orderedProdSection}>
                                <Text style={styles.orderedProdHeader}>
                                    <Package size={14} color="#15803D" /> ORDERED PRODUCTS LIST
                                </Text>

                                {activeItem.items && activeItem.items.length > 0 ? (
                                    activeItem.items.map((prod, idx) => {
                                        const prodName = prod.produce || prod.name || 'Product';
                                        const qty = prod.qty || 1;
                                        const unit = prod.unit || 'pack';
                                        const rate = Number(prod.wholesaleRate || prod.wholesalePrice || prod.price || 0) || 150;
                                        const itemSubtotal = prod.subtotal || (qty * rate);
                                        const itemImage = prod.image || prod.imageUrl || '';

                                        return (
                                            <View key={idx} style={styles.productItemCard}>
                                                <View style={styles.prodLeftWrap}>
                                                    <View style={styles.prodThumbWrap}>
                                                        {itemImage ? (
                                                            <Image source={{ uri: itemImage }} style={styles.prodThumbImg} />
                                                        ) : (
                                                            <View style={styles.prodThumbFallback}>
                                                                <Package size={20} color="#15803D" />
                                                            </View>
                                                        )}
                                                    </View>
                                                    <View style={styles.prodInfoWrap}>
                                                        <Text style={styles.prodNameText} numberOfLines={2}>
                                                            {prodName}
                                                        </Text>
                                                        <Text style={styles.prodWholesaleText}>
                                                            Wholesale: <Text style={{ color: '#334155', fontWeight: '700' }}>Rs. {rate.toLocaleString()}/{unit}</Text>
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.prodRightWrap}>
                                                    <View style={styles.qtyPill}>
                                                        <Text style={styles.qtyPillText}>{qty} {unit}s</Text>
                                                    </View>
                                                    <Text style={styles.subtotalText}>
                                                        Rs. {itemSubtotal.toLocaleString()}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <View style={styles.singleProdCard}>
                                        <Text style={styles.prodNameText}>{activeItem.product || 'Fresh Produce Restock'}</Text>
                                    </View>
                                )}

                                {/* Total Value Box */}
                                <View style={styles.totalValueBox}>
                                    <Text style={styles.totalValueLabel}>Order Total Value</Text>
                                    <Text style={styles.totalValueNum}>
                                        Rs. {(activeItem.totalAmount || (activeItem.items ? activeItem.items.reduce((sum, i) => sum + (i.subtotal || ((Number(i.wholesaleRate || 150)) * (i.qty || 1))), 0) : 0)).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Dispatch Timeline Stepper */}
                        <View style={styles.stepperCard}>
                            <Text style={styles.stepperHeader}>Dispatch Timeline</Text>
                            <View style={styles.stepperBody}>
                                {steps.map((step, sIdx) => {
                                    const isLast = sIdx === steps.length - 1;
                                    const nextStepDone = !isLast && steps[sIdx + 1].completed;
                                    return (
                                        <View key={step.id} style={styles.stepNode}>
                                            {!isLast && (
                                                <View style={[styles.stepLine, nextStepDone && styles.stepLineCompleted]} />
                                            )}
                                            <View style={[styles.stepCircle, step.completed ? styles.stepCircleDone : styles.stepCirclePending]}>
                                                {step.completed ? (
                                                    <Check size={14} color="#FFFFFF" />
                                                ) : (
                                                    <Text style={styles.stepNumText}>{step.id}</Text>
                                                )}
                                            </View>
                                            <Text style={[styles.stepLabelText, !step.completed && styles.stepLabelPending]}>
                                                {step.label}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* 🔒 Fixed Bottom Action Controls */}
            {isSupplier && trackingFilter === 'active' && activeItem && activeDeliveriesList.length > 0 && (
                <View style={styles.bottomControlsBar}>
                    <View style={styles.controlsCard}>
                        <View style={styles.controlsHeader}>
                            <Zap size={15} color="#D97706" />
                            <Text style={styles.controlsTitle}>Supplier Dispatch Action Controls</Text>
                        </View>

                        {(!['Packed', 'Dispatched', 'In Transit', 'Delivered'].includes(currentStatus)) && (
                            <TouchableOpacity
                                style={styles.btnPack}
                                onPress={() => handleUpdateStatus('Packed')}
                                disabled={updating}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnActionText}>Mark as Packed</Text>
                                <Box size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}

                        {currentStatus === 'Packed' && (
                            <TouchableOpacity
                                style={styles.btnDispatch}
                                onPress={() => handleUpdateStatus('Dispatched')}
                                disabled={updating}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnActionText}>Mark as Dispatched</Text>
                                <Truck size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}

                        {(currentStatus === 'Dispatched' || currentStatus === 'In Transit') && (
                            <TouchableOpacity
                                style={styles.btnDeliver}
                                onPress={() => handleUpdateStatus('Delivered')}
                                disabled={updating}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnActionText}>Mark as Delivered</Text>
                                <CheckCircle2 size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}

                        {currentStatus === 'Delivered' && (
                            <View style={{ gap: 8 }}>
                                <View style={styles.deliveredBadgeBox}>
                                    <Check size={16} color="#15803D" />
                                    <Text style={styles.deliveredBadgeBoxText}>Order Delivered & Handed Off to Store</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.deletePermBtn}
                                    onPress={() => setDeleteConfirm(true)}
                                >
                                    <Trash2 size={15} color="#DC2626" />
                                    <Text style={styles.deletePermBtnText}>Delete Order Record</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Custom Delete Modal */}
            <Modal visible={deleteConfirm} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <Trash2 size={26} color="#DC2626" />
                        </View>
                        <Text style={styles.modalTitle}>Delete Order Record?</Text>
                        <Text style={styles.modalDesc}>
                            This will permanently remove the order record from the database. This cannot be undone.
                        </Text>
                        <View style={styles.modalBtnGroup}>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={async () => {
                                    setDeleteConfirm(false);
                                    const targetItem = itemToDelete || activeItem;
                                    const targetId = targetItem?.poId || targetItem?.id || targetItem?._id;
                                    try {
                                        const res = await fetch(`${API_BASE_URL}/supplier-replenishment/requests/${encodeURIComponent(targetId)}`, { method: 'DELETE' });
                                        const data = await res.json();
                                        if (data.success) {
                                            setDeliveriesList((prev) => prev.filter((i) => {
                                                const isMatch = (targetItem?.poId && (i.poId === targetItem.poId || i.id === targetItem.poId)) ||
                                                                (targetItem?.id && (i.id === targetItem.id || i.poId === targetItem.id)) ||
                                                                (targetItem?._id && i._id === targetItem._id) ||
                                                                (targetId && (i.poId === targetId || i.id === targetId || i._id === targetId));
                                                return !isMatch;
                                            }));
                                            setItemToDelete(null);
                                            setToastMsg('Order record permanently deleted! 🗑️');
                                            setTimeout(() => setToastMsg(''), 3000);
                                        } else {
                                            setToastMsg(data.message || 'Failed to delete order record');
                                            setTimeout(() => setToastMsg(''), 3000);
                                        }
                                    } catch (err) {
                                        console.error('Delete error:', err);
                                        setToastMsg('Error deleting order record');
                                        setTimeout(() => setToastMsg(''), 3000);
                                    }
                                }}
                            >
                                <Trash2 size={16} color="#FFFFFF" />
                                <Text style={styles.confirmDeleteBtnText}>Yes, Delete Permanently</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelDeleteBtn}
                                onPress={() => {
                                    setDeleteConfirm(false);
                                    setItemToDelete(null);
                                }}
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
    syncBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#DCFCE7',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    syncBtnActive: {
        backgroundColor: '#F0FDF4',
        borderColor: '#86EFAC',
    },
    syncBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#16A34A',
    },
    backBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    toastBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        padding: 10,
        borderRadius: 10,
    },
    toastBannerText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#15803D',
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
        paddingHorizontal: 6,
        borderRadius: 10,
        backgroundColor: 'transparent',
    },
    filterTabActive: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 10,
        backgroundColor: 'transparent',
    },
    filterTabCompleted: {
        flex: 1.18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 10,
        backgroundColor: 'transparent',
    },
    filterTabActiveActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    filterTabActiveCompleted: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    filterTabText: {
        fontSize: 11.8,
        fontWeight: '700',
        color: '#64748B',
    },
    filterTabTextActiveActive: {
        color: '#15803D',
        fontWeight: '800',
    },
    filterTabTextActiveCompleted: {
        color: '#2563EB',
        fontWeight: '800',
    },
    orderTabsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 4,
    },
    orderTabsLabel: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#64748B',
    },
    orderTabsScroll: {
        gap: 6,
    },
    orderTabPill: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    orderTabPillActive: {
        backgroundColor: '#15803D',
        borderColor: '#15803D',
    },
    orderTabPillText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#475569',
    },
    orderTabPillTextActive: {
        color: '#FFFFFF',
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: Platform.OS === 'android' ? 60 : 32,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    emptySub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
    },
    activeCardWrapper: {
        gap: 14,
    },
    statusCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    statusCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    reqBadgeText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    poHighlight: {
        color: '#15803D',
    },
    targetStoreText: {
        fontSize: 13.5,
        color: '#334155',
        marginTop: 4,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '800',
    },
    supplierEtaBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 14,
        marginTop: 14,
        gap: 10,
    },
    supplierRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    truckIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    supplierTextBox: {
        flex: 1,
    },
    supplierLabel: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '600',
    },
    supplierVal: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    etaBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FEF9C3',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    etaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    etaLabel: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#B45309',
    },
    etaVal: {
        fontSize: 13.5,
        fontWeight: '900',
        color: '#D97706',
    },
    editEtaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    editEtaBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#D97706',
    },
    editEtaGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    etaInput: {
        width: 45,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#D97706',
        borderRadius: 6,
        paddingVertical: 2,
        paddingHorizontal: 4,
        fontSize: 12,
        fontWeight: '800',
        color: '#92400E',
        textAlign: 'center',
    },
    minsText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#92400E',
    },
    saveEtaBtn: {
        backgroundColor: '#15803D',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    saveEtaBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    cancelEtaBtn: {
        backgroundColor: '#CBD5E1',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    cancelEtaBtnText: {
        color: '#334155',
        fontSize: 11,
        fontWeight: '700',
    },
    orderedProdSection: {
        marginTop: 16,
    },
    orderedProdHeader: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    productItemCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        gap: 10,
    },
    prodLeftWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    prodThumbWrap: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    prodThumbImg: {
        width: '100%',
        height: '100%',
    },
    prodThumbFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    prodInfoWrap: {
        flex: 1,
    },
    prodNameText: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 18,
    },
    prodWholesaleText: {
        fontSize: 11.5,
        color: '#64748B',
        marginTop: 2,
    },
    prodRightWrap: {
        alignItems: 'flex-end',
        gap: 4,
    },
    qtyPill: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    qtyPillText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#166534',
    },
    subtotalText: {
        fontSize: 13.5,
        fontWeight: '900',
        color: '#0F172A',
    },
    singleProdCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
    },
    totalValueBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FEF9C3',
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        borderRadius: 14,
        padding: 12,
        marginTop: 10,
    },
    totalValueLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#92400E',
    },
    totalValueNum: {
        fontSize: 16,
        fontWeight: '900',
        color: '#92400E',
    },
    stepperCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    stepperHeader: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
    },
    stepperBody: {
        paddingLeft: 6,
    },
    stepNode: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        paddingBottom: 16,
    },
    stepLine: {
        position: 'absolute',
        top: 24,
        left: 12,
        width: 2,
        height: '100%',
        backgroundColor: '#E2E8F0',
    },
    stepLineCompleted: {
        backgroundColor: '#15803D',
    },
    stepCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        zIndex: 1,
    },
    stepCircleDone: {
        backgroundColor: '#15803D',
    },
    stepCirclePending: {
        backgroundColor: '#E2E8F0',
    },
    stepNumText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    stepLabelText: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    stepLabelPending: {
        color: '#94A3B8',
        fontWeight: '600',
    },
    bottomControlsBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    controlsCard: {
        gap: 10,
    },
    controlsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    controlsTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    btnPack: {
        backgroundColor: '#166534',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnDispatch: {
        backgroundColor: '#2563EB',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnDeliver: {
        backgroundColor: '#15803D',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnActionText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    deliveredBadgeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        padding: 12,
        borderRadius: 12,
    },
    deliveredBadgeBoxText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#15803D',
    },
    deletePermBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        padding: 12,
        borderRadius: 12,
    },
    deletePermBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#DC2626',
    },
    completedCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    completedCardExpanded: {
        borderWidth: 1.5,
        borderColor: '#86EFAC',
        shadowColor: '#15803D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    completedCardHeader: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        gap: 8,
    },
    completedCardHeaderExpanded: {
        backgroundColor: '#F0FDF4',
        borderBottomWidth: 1,
        borderBottomColor: '#DCFCE7',
    },
    completedTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    completedReqTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    completedPoHighlight: {
        color: '#15803D',
        fontWeight: '900',
    },
    deliveredTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    deliveredTagText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#15803D',
    },
    completedStoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    completedStoreText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
        lineHeight: 18,
    },
    completedStoreNameBold: {
        fontWeight: '800',
        color: '#0F172A',
    },
    completedSupplierNameBold: {
        fontWeight: '800',
        color: '#0F172A',
    },
    completedDotSep: {
        color: '#94A3B8',
        marginHorizontal: 4,
    },
    completedDateText: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 1,
    },
    completedSummaryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: 4,
    },
    completedSummaryBarExpanded: {
        backgroundColor: '#FFFFFF',
        borderColor: '#DCFCE7',
    },
    completedSummaryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        marginRight: 10,
    },
    completedSummaryItemsText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#334155',
        flexShrink: 1,
    },
    completedSummaryRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
    },
    completedSummaryPriceText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#15803D',
    },
    completedExpandCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedExpandCircleExpanded: {
        backgroundColor: '#15803D',
        shadowColor: '#15803D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
    },
    completedExpandedBody: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        gap: 14,
    },
    supplierCardBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 12,
        gap: 10,
    },
    supplierCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    supplierTruckIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    supplierCardInfoCol: {
        flex: 1,
        justifyContent: 'center',
    },
    supplierCardLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    supplierCardName: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 1,
    },
    statusYellowAlertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FEF9C3',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        gap: 6,
    },
    statusYellowLeftWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 1,
    },
    statusYellowLabelText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#B45309',
    },
    statusYellowValText: {
        flex: 1,
        flexShrink: 1,
        fontSize: 12,
        fontWeight: '900',
        color: '#D97706',
    },
    completedPillBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        flexShrink: 0,
    },
    completedPillBadgeText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#15803D',
    },
    completedActionsStack: {
        gap: 8,
        marginTop: 8,
    },
    orderedProdSectionWrap: {
        gap: 8,
    },
    orderedProdSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    orderedProdSectionHeaderText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    orderedProdListStack: {
        gap: 8,
    },
    prodItemRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    prodItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 0,
    },
    prodItemThumbWrap: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    prodItemThumbImg: {
        width: '100%',
        height: '100%',
    },
    prodItemFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    prodItemTextCol: {
        flex: 1,
        minWidth: 0,
    },
    prodItemTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 2,
    },
    prodItemWholesale: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    prodItemRateBold: {
        color: '#334155',
        fontWeight: '700',
    },
    prodItemRight: {
        alignItems: 'flex-end',
        gap: 3,
        flexShrink: 0,
    },
    prodItemQtyBadge: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    prodItemQtyBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#166534',
    },
    prodItemSubtotalText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0F172A',
    },
    orderTotalValueYellowBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FEF9C3',
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: 4,
    },
    orderTotalValueLabel: {
        fontSize: 12.5,
        color: '#92400E',
        fontWeight: '800',
    },
    orderTotalValueNum: {
        fontSize: 15,
        color: '#92400E',
        fontWeight: '900',
    },
    timelineStepperCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 14,
    },
    timelineStepperTitle: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: 0.5,
        marginBottom: 14,
        textTransform: 'uppercase',
    },
    stepperNodesStack: {
        paddingLeft: 4,
    },
    timelineStepNode: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        position: 'relative',
        paddingBottom: 20,
    },
    timelineStepNodeLast: {
        paddingBottom: 0,
    },
    timelineStepLine: {
        position: 'absolute',
        left: 11,
        top: 24,
        bottom: 0,
        width: 3,
        backgroundColor: '#27672D',
        borderRadius: 2,
        zIndex: 1,
    },
    timelineStepCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#27672D',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    timelineStepLabel: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1E293B',
    },
    collapseDetailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginTop: 4,
    },
    collapseDetailsBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
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
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
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
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    bottomControlsBar: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        flexShrink: 0,
    },
    controlsCard: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5,
        borderColor: '#BBF7D0',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        gap: 8,
    },
    controlsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    controlsTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#166534',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    btnPack: {
        backgroundColor: '#15803D',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#15803D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    btnDispatch: {
        backgroundColor: '#2563EB',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    btnDeliver: {
        backgroundColor: '#16A34A',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    btnActionText: {
        color: '#FFFFFF',
        fontSize: 14.5,
        fontWeight: '800',
    },
    deliveredBadgeBox: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    deliveredBadgeBoxText: {
        color: '#15803D',
        fontSize: 13,
        fontWeight: '800',
    },
    deletePermBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    deletePermBtnText: {
        color: '#DC2626',
        fontSize: 13.5,
        fontWeight: '800',
    },
});
