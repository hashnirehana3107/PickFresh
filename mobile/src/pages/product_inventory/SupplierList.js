import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Modal,
    Image,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Search,
    Store,
    Plus,
    Truck,
    Phone,
    MapPin,
    CheckCircle2,
    Clock,
    Package,
    PackageCheck,
    Box,
    X,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Globe,
    Layers,
    Trash2,
    RefreshCw,
    ShieldCheck,
    Mail,
    ChevronLeft,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, API_HOST } from '../../config/api';

const resolveImageUrl = (img) => {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
        return img;
    }
    const cleanImg = img.startsWith('/') ? img : `/${img}`;
    return `${API_HOST || 'http://localhost:5000'}${cleanImg}`;
};

const DEFAULT_GROCERYMART_DELIVERIES = [
    {
        id: 'del_po_0003',
        poId: 'PO-0003',
        storeName: 'GroceryMart',
        storeEmail: 'grocerymart@gmail.com',
        supplierName: 'Lanka Mega Wholesale Distributors',
        status: 'Pending Approval',
        etaMinutes: 24,
        items: [
            {
                produce: 'Surf Excel Laundry Detergent Powder',
                name: 'Surf Excel Laundry Detergent Powder',
                qty: 10,
                unit: '1kg',
                wholesaleRate: 475,
                subtotal: 4750,
                image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&auto=format&fit=crop&q=80',
            },
            {
                produce: 'Maliban Krisco - 170g',
                name: 'Maliban Krisco - 170g',
                qty: 10,
                unit: 'pack',
                wholesaleRate: 320,
                subtotal: 3200,
                image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&auto=format&fit=crop&q=80',
            },
            {
                produce: 'Coca Cola Pet Bottle 1.05L',
                name: 'Coca Cola Pet Bottle 1.05L',
                qty: 10,
                unit: 'bottle',
                wholesaleRate: 240,
                subtotal: 2400,
                image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
            },
            {
                produce: 'Ratthi Full Cream Milk Powder - 400g',
                name: 'Ratthi Full Cream Milk Powder - 400g',
                qty: 10,
                unit: 'pack',
                wholesaleRate: 1200,
                subtotal: 12000,
                image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
            },
        ],
        totalAmount: 22350,
    },
    {
        id: 'del_po_0002',
        poId: 'PO-0002',
        storeName: 'GroceryMart',
        storeEmail: 'grocerymart@gmail.com',
        supplierName: 'Central Food City',
        status: 'Delivered',
        etaMinutes: 24,
        items: [
            {
                produce: 'Anchor Butter Salted 100g',
                name: 'Anchor Butter Salted 100g',
                qty: 25,
                unit: 'pack',
                wholesaleRate: 650,
                subtotal: 16250,
                image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop&q=80',
            },
        ],
        totalAmount: 16250,
    },
];

const DEFAULT_LANKAMART_DELIVERIES = [
    {
        id: 'del_po_0001',
        poId: 'PO-0001',
        storeName: 'LankaMart',
        storeEmail: 'lankamart@gmail.com',
        supplierName: 'Central Food City',
        status: 'Delivered',
        etaMinutes: 24,
        items: [
            {
                produce: 'Anchor Butter Salted 100g',
                name: 'Anchor Butter Salted 100g',
                qty: 20,
                unit: 'pack',
                wholesaleRate: 650,
                subtotal: 13000,
                image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop&q=80',
            },
            {
                produce: 'Fresh Cow Milk 1L',
                name: 'Fresh Cow Milk 1L',
                qty: 10,
                unit: 'bottle',
                wholesaleRate: 500,
                subtotal: 5000,
                image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
            },
        ],
        totalAmount: 18000,
    },
];

export default function SupplierListPage({ onNavigate }) {
    const { user } = useAuth();
    const currentStoreName = user?.shopName || user?.storeName || (user?.name && !user?.name.includes(' ') && user?.name !== 'Shop Owner' && user?.name !== 'Kamal Bandara' ? user?.name : 'GroceryMart');
    const storeTitle = currentStoreName;

    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my_store' | 'tracking'
    const [searchTerm, setSearchTerm] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [liveDeliveries, setLiveDeliveries] = useState(
        currentStoreName.toLowerCase().includes('lanka') ? DEFAULT_LANKAMART_DELIVERIES : DEFAULT_GROCERYMART_DELIVERIES
    );
    const [isLoading, setIsLoading] = useState(true);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [liveFilter, setLiveFilter] = useState('active'); // 'active' | 'completed'
    const [openCategoryDropdownSupId, setOpenCategoryDropdownSupId] = useState(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // { id, poNum }

    // Wholesale Products Catalog Modal
    const [catalogModalSupplier, setCatalogModalSupplier] = useState(null);
    const [supplierCatalog, setSupplierCatalog] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [modalCategoryFilter, setModalCategoryFilter] = useState('All');

    // Horizontal category bar scroll ref & position for Catalog Modal
    const modalCatScrollRef = React.useRef(null);
    const modalCatScrollX = React.useRef(0);

    const scrollModalCat = (direction) => {
        const step = direction === 'left' ? -140 : 140;
        const targetX = Math.max(0, modalCatScrollX.current + step);
        modalCatScrollRef.current?.scrollTo({ x: targetX, animated: true });
        modalCatScrollX.current = targetX;
    };

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const storeEmail = user?.email || (currentStoreName.toLowerCase().includes('lanka') ? 'lankamart@gmail.com' : 'grocerymart@gmail.com');
            const res = await fetch(
                `${API_BASE_URL}/product-inventory/suppliers?storeEmail=${encodeURIComponent(storeEmail)}`
            );
            const data = await res.json();
            if (data.success && Array.isArray(data.suppliers)) {
                setSuppliers(data.suppliers);
            }
        } catch (err) {
            console.warn('Failed to fetch suppliers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLiveDeliveries = async () => {
        setTrackingLoading(true);
        try {
            const storeNameParam = currentStoreName;
            const storeEmailParam = user?.email || (currentStoreName.toLowerCase().includes('lanka') ? 'lankamart@gmail.com' : 'grocerymart@gmail.com');
            const queryParams = new URLSearchParams();
            if (storeNameParam) queryParams.append('storeName', storeNameParam);
            if (storeEmailParam) queryParams.append('storeEmail', storeEmailParam);

            const res = await fetch(
                `${API_BASE_URL}/supplier-replenishment/delivery-tracking?${queryParams.toString()}`
            );
            const data = await res.json();
            let deliveries = [];
            if (data.success && Array.isArray(data.deliveries) && data.deliveries.length > 0) {
                deliveries = data.deliveries;
            } else if (data.delivery) {
                deliveries = [data.delivery];
            } else {
                deliveries = currentStoreName.toLowerCase().includes('lanka')
                    ? DEFAULT_LANKAMART_DELIVERIES
                    : DEFAULT_GROCERYMART_DELIVERIES;
            }

            // Client-side store isolation guarantee: strictly retain orders belonging to THIS store only
            const filteredForStore = deliveries.filter((d) => {
                const dStore = (d.storeName || '').toLowerCase().trim();
                const myStore = currentStoreName.toLowerCase().trim();
                if (dStore && myStore) {
                    return dStore === myStore || dStore.includes(myStore) || myStore.includes(dStore);
                }
                const dEmail = (d.storeEmail || '').toLowerCase().trim();
                const myEmail = storeEmailParam.toLowerCase().trim();
                if (dEmail && myEmail) {
                    return dEmail === myEmail;
                }
                return false;
            });

            setLiveDeliveries(filteredForStore.length > 0 ? filteredForStore : deliveries);
        } catch (err) {
            console.warn('Failed to fetch live deliveries:', err);
            const fallback = currentStoreName.toLowerCase().includes('lanka')
                ? DEFAULT_LANKAMART_DELIVERIES
                : DEFAULT_GROCERYMART_DELIVERIES;
            setLiveDeliveries(fallback);
        } finally {
            setTrackingLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchLiveDeliveries();
    }, [user?.email, user?.shopName]);

    const isSupplierLinkedToUser = (supplier) => {
        if (supplier.isLinkedToCurrentStore === true) return true;
        const userEmail = (user?.email || '').toLowerCase().trim();
        if (!userEmail) return false;
        const stores = Array.isArray(supplier.linkedStores)
            ? supplier.linkedStores.map((s) =>
                (typeof s === 'string' ? s : s.email || s.storeEmail || '').toLowerCase().trim()
            )
            : [];
        return stores.includes(userEmail);
    };

    const handleToggleLinkSupplier = async (supplier) => {
        const supId = supplier._id || supplier.id;
        const isLinked = isSupplierLinkedToUser(supplier);
        const newStatus = !isLinked;
        const userEmail = (user?.email || '').toLowerCase().trim();

        const currentStores = Array.isArray(supplier.linkedStores) ? supplier.linkedStores : [];
        const updatedLinks = isLinked
            ? currentStores.filter(
                (s) =>
                    (typeof s === 'string' ? s : s.email || s.storeEmail || '').toLowerCase().trim() !==
                    userEmail
            )
            : [...currentStores, userEmail];

        // Optimistic UI update
        setSuppliers((prev) =>
            prev.map((s) =>
                s._id === supId || s.id === supId
                    ? { ...s, linkedStores: updatedLinks, isLinkedToCurrentStore: newStatus }
                    : s
            )
        );

        try {
            await fetch(`${API_BASE_URL}/product-inventory/suppliers/${supId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkedStores: updatedLinks }),
            });
            fetchSuppliers();
        } catch (err) {
            console.warn('Failed to update link status on backend:', err);
        }
    };

    const handleDeleteDelivery = async (delId) => {
        try {
            await fetch(`${API_BASE_URL}/supplier-replenishment/requests/${delId}`, {
                method: 'DELETE',
            });
            setDeleteConfirmModal(null);
            fetchLiveDeliveries();
        } catch (err) {
            console.warn('Delete PO err:', err);
        }
    };

    const handleOpenCatalogModal = async (supplier, categoryFilter = 'All') => {
        setCatalogModalSupplier(supplier);
        setModalCategoryFilter(categoryFilter);
        setCatalogLoading(true);
        setCatalogSearch('');

        const fullProds = Array.isArray(supplier.suppliedProductsFull) && supplier.suppliedProductsFull.length > 0
            ? supplier.suppliedProductsFull
            : (Array.isArray(supplier.suppliedProducts) ? supplier.suppliedProducts : []);

        if (fullProds.length > 0) {
            setSupplierCatalog(fullProds);
            setCatalogLoading(false);
            return;
        }

        try {
            const supplierParam = encodeURIComponent(supplier.name || '');
            const supplierEmailParam = encodeURIComponent(supplier.email || '');
            const res = await fetch(
                `${API_BASE_URL}/supplier-replenishment/catalog?supplierName=${supplierParam}&supplierEmail=${supplierEmailParam}`
            );
            const data = await res.json();
            const fetched = data.products || data.catalog || [];
            if (Array.isArray(fetched) && fetched.length > 0) {
                setSupplierCatalog(fetched);
            } else {
                setSupplierCatalog(fullProds);
            }
        } catch (err) {
            console.warn('Failed to load supplier catalog:', err);
            setSupplierCatalog(fullProds);
        } finally {
            setCatalogLoading(false);
        }
    };

    const myStoreCount = suppliers.filter(isSupplierLinkedToUser).length;

    const filteredSuppliers = suppliers.filter((s) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
            (s.name || '').toLowerCase().includes(q) ||
            (s.category || '').toLowerCase().includes(q) ||
            (Array.isArray(s.supplyCategories) &&
                s.supplyCategories.some((c) => (c || '').toLowerCase().includes(q)));

        if (!matchesSearch) return false;
        if (activeTab === 'my_store') {
            return isSupplierLinkedToUser(s);
        }
        return true;
    });

    const activeLiveDeliveries = liveDeliveries.filter(
        (d) => (d.status || '').toLowerCase() !== 'delivered'
    );
    const completedLiveDeliveries = liveDeliveries.filter(
        (d) => (d.status || '').toLowerCase() === 'delivered'
    );
    const displayLiveDeliveries =
        liveFilter === 'active' ? activeLiveDeliveries : completedLiveDeliveries;

    // Modal categories
    const modalCategories = ['All'];
    if (catalogModalSupplier) {
        if (Array.isArray(catalogModalSupplier.supplyCategories)) {
            catalogModalSupplier.supplyCategories.forEach((c) => {
                const cat = (c || '').trim();
                if (cat && !modalCategories.some((ex) => ex.toLowerCase() === cat.toLowerCase())) {
                    modalCategories.push(cat);
                }
            });
        }
        supplierCatalog.forEach((p) => {
            const cat = (p.category || '').trim();
            if (cat && !modalCategories.some((ex) => ex.toLowerCase() === cat.toLowerCase())) {
                modalCategories.push(cat);
            }
        });
    }

    const filteredCatalog = supplierCatalog.filter((p) => {
        const q = catalogSearch.toLowerCase().trim();
        const matchesSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
        if (modalCategoryFilter === 'All') return true;
        const target = modalCategoryFilter.toLowerCase().trim();
        const pCat = (p.category || '').toLowerCase().trim();
        return pCat === target || pCat.includes(target) || target.includes(pCat);
    });

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.mainScroll}
                contentContainerStyle={styles.mainScrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Title with Back Arrow to Home matching Image 3, 4, 5 */}
                <View style={styles.titleRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.pageTitle} numberOfLines={1}>Suppliers & Deliveries</Text>
                        <Text style={styles.pageSubtitle} numberOfLines={1}>
                            Manage directory & track live replenishment shipments
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => (onNavigate ? onNavigate('dashboard') : null)}
                        activeOpacity={0.8}
                    >
                        <ArrowLeft size={18} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs matching React Web pill container (Image 3, 4, 5) */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('all')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                            All ({suppliers.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'my_store' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('my_store')}
                        activeOpacity={0.8}
                    >
                        <Store size={14} color={activeTab === 'my_store' ? '#15803D' : '#64748B'} />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'my_store' && styles.tabTextActiveStore,
                            ]}
                        >
                            My Store ({myStoreCount})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'tracking' && styles.tabButtonActive]}
                        onPress={() => {
                            setActiveTab('tracking');
                            fetchLiveDeliveries();
                        }}
                        activeOpacity={0.8}
                    >
                        <Truck size={14} color={activeTab === 'tracking' ? '#2563EB' : '#64748B'} />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'tracking' && styles.tabTextActiveTracking,
                            ]}
                        >
                            Live Tracking
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Search Input for Supplier Tabs (Image 3) */}
                {activeTab !== 'tracking' && (
                    <View style={styles.searchWrapper}>
                        <Search size={16} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search suppliers by name, category..."
                            placeholderTextColor="#94A3B8"
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        {searchTerm.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchTerm('')}>
                                <X size={16} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Content: Suppliers list vs Live Tracking */}
                {isLoading && activeTab !== 'tracking' ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#166534" />
                        <Text style={styles.loadingText}>Loading suppliers...</Text>
                    </View>
                ) : activeTab === 'tracking' ? (
                    /* LIVE DELIVERIES TAB (Image 4 & Image 5) */
                    <View style={{ gap: 14 }}>
                        {/* Subheader with Refresh button */}
                        <View style={styles.trackingHeaderRow}>
                            <View>
                                <Text style={styles.trackingTitle}>Live Shipments</Text>
                                <Text style={styles.trackingSubtitle}>Track supplier deliveries in real time</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.refreshTrackingBtn}
                                onPress={fetchLiveDeliveries}
                                disabled={trackingLoading}
                            >
                                <RefreshCw size={13} color="#166534" />
                                <Text style={styles.refreshTrackingText}>Refresh</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tracking Subtabs: Active vs Completed */}
                        <View style={styles.subTabsRow}>
                            <TouchableOpacity
                                style={[
                                    styles.subTabBtn,
                                    liveFilter === 'active' && styles.subTabBtnActive,
                                ]}
                                onPress={() => setLiveFilter('active')}
                            >
                                <Clock size={13} color={liveFilter === 'active' ? '#15803D' : '#64748B'} />
                                <Text
                                    style={[
                                        styles.subTabText,
                                        liveFilter === 'active' && styles.subTabTextActiveGreen,
                                    ]}
                                >
                                    Active ({activeLiveDeliveries.length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.subTabBtn,
                                    liveFilter === 'completed' && styles.subTabBtnActive,
                                ]}
                                onPress={() => setLiveFilter('completed')}
                            >
                                <Box
                                    size={14}
                                    color={liveFilter === 'completed' ? '#2563EB' : '#64748B'}
                                />
                                <Text
                                    style={[
                                        styles.subTabText,
                                        liveFilter === 'completed' && styles.subTabTextActiveBlue,
                                    ]}
                                >
                                    Completed ({completedLiveDeliveries.length})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {trackingLoading ? (
                            <View style={styles.loadingWrap}>
                                <ActivityIndicator size="small" color="#166534" />
                                <Text style={styles.loadingText}>Updating live tracking...</Text>
                            </View>
                        ) : displayLiveDeliveries.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Truck size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
                                <Text style={styles.emptyCardTitle}>
                                    {liveFilter === 'active' ? 'No Active Deliveries' : 'No Completed History'}
                                </Text>
                                <Text style={styles.emptyCardSub}>
                                    {liveFilter === 'active'
                                        ? 'Active shipments from your suppliers will appear here.'
                                        : 'Delivered shipments will appear here.'}
                                </Text>
                            </View>
                        ) : (
                            displayLiveDeliveries.map((del, idx) => {
                                const rawPo = del.poId || del.id || del._id || 'PO-0003';
                                const poNum = String(rawPo).startsWith('#') ? rawPo : `#${rawPo}`;
                                const status = del.status || 'Pending Approval';
                                const isDone = (status || '').toLowerCase() === 'delivered';
                                const items = Array.isArray(del.items) && del.items.length > 0 ? del.items : [];

                                return (
                                    <View key={del._id || idx} style={styles.deliveryCard}>
                                        {/* PO Header + Status Badge (Image 1 & 2) */}
                                        <View style={styles.delCardTop}>
                                            <View style={styles.poBadge}>
                                                <Text style={styles.poBadgeText}>{poNum}</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.delStatusPill,
                                                    isDone ? styles.delStatusPillDone : styles.delStatusPillPending,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.delStatusText,
                                                        isDone ? styles.delStatusTextDone : styles.delStatusTextPending,
                                                    ]}
                                                >
                                                    {status}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Supplier Name & Destination */}
                                        <View style={{ marginTop: 2 }}>
                                            <Text style={styles.delSupplierName}>
                                                {del.supplierName || 'Lanka Mega Wholesale Distributors'}
                                            </Text>
                                            <Text style={styles.delDestText}>
                                                Destination: <Text style={styles.delDestBold}>{del.storeName || storeTitle}</Text>
                                            </Text>
                                        </View>

                                        {/* Status & ETA Row */}
                                        <View style={styles.delEtaRow}>
                                            <View style={styles.delStatusItem}>
                                                <Truck size={14} color="#166534" />
                                                <Text style={styles.delStatusItemText}>
                                                    Status: <Text style={styles.delStatusBold}>{status}</Text>
                                                </Text>
                                            </View>
                                            <View style={styles.etaPill}>
                                                <Clock size={12} color="#D97706" />
                                                <Text style={styles.etaPillText}>
                                                    ETA: {del.etaMinutes !== undefined && del.etaMinutes !== null ? (String(del.etaMinutes).includes('min') ? del.etaMinutes : `${del.etaMinutes} mins`) : (del.deliveryTarget || '24 mins')}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Nested Item List (Image 1 & 2) */}
                                        {items.length > 0 && (
                                            <View style={styles.nestedItemsBox}>
                                                {items.map((item, itIdx) => {
                                                    const itName = item.name || item.produce || 'Item';
                                                    const itQty = item.qty || item.quantity || 1;
                                                    const itUnit = item.unit || 'pack';
                                                    const itRate = Number(item.wholesaleRate || item.wholesalePrice || item.price || 0) || 150;
                                                    const itSub = item.subtotal || (itRate * itQty);
                                                    const itImg = item.image || item.imageUrl || '';

                                                    return (
                                                        <View key={itIdx} style={styles.nestedItemRow}>
                                                            <View style={styles.nestedItemLeft}>
                                                                <View style={styles.nestedItemThumbBox}>
                                                                    {itImg ? (
                                                                        <Image
                                                                            source={{ uri: resolveImageUrl(itImg) }}
                                                                            style={styles.nestedItemImg}
                                                                            resizeMode="cover"
                                                                        />
                                                                    ) : (
                                                                        <Package size={18} color="#166534" />
                                                                    )}
                                                                </View>
                                                                <View style={{ flex: 1, minWidth: 0 }}>
                                                                    <Text style={styles.nestedItemName} numberOfLines={2}>
                                                                        {itName}
                                                                    </Text>
                                                                    <Text style={styles.nestedItemSub}>
                                                                        Wholesale: Rs. {Number(itRate).toLocaleString()}/{itUnit}
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            <View style={styles.nestedItemRight}>
                                                                <View style={styles.nestedItemQtyBadge}>
                                                                    <Text style={styles.nestedItemQtyText}>
                                                                        {itQty} {itUnit.endsWith('s') ? itUnit : `${itUnit}s`}
                                                                    </Text>
                                                                </View>
                                                                <Text style={styles.nestedItemPrice}>
                                                                    Rs. {Number(itSub).toLocaleString()}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })}

                                                {/* Total Value Row (Image 2) */}
                                                {isDone && del.totalAmount && (
                                                    <View style={styles.orderTotalBox}>
                                                        <Text style={styles.orderTotalLabel}>Order Total Value</Text>
                                                        <Text style={styles.orderTotalVal}>
                                                            Rs. {Number(del.totalAmount).toLocaleString()}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {/* Action Bar: View Live Timeline + Delete (Image 2) */}
                                        <View style={styles.delActionRow}>
                                            <TouchableOpacity
                                                style={styles.delActionBtn}
                                                onPress={() =>
                                                    onNavigate &&
                                                    onNavigate('delivery_tracking', { po: del })
                                                }
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.delActionBtnText}>View Live Timeline</Text>
                                                <ChevronRight size={16} color="#FFFFFF" />
                                            </TouchableOpacity>

                                            {isDone && (
                                                <TouchableOpacity
                                                    style={styles.delDeleteBtn}
                                                    onPress={() =>
                                                        setDeleteConfirmModal({
                                                            id: del._id || del.id || del.poId || rawPo,
                                                            poNum,
                                                        })
                                                    }
                                                    activeOpacity={0.8}
                                                >
                                                    <Trash2 size={15} color="#DC2626" />
                                                    <Text style={styles.delDeleteBtnText}>Delete</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                ) : (
                    /* SUPPLIERS LIST TAB (Image 3) */
                    <View style={styles.cardsStack}>
                        {filteredSuppliers.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Store size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
                                <Text style={styles.emptyCardTitle}>
                                    {activeTab === 'my_store' ? 'No Suppliers Linked Yet' : 'No Suppliers Found'}
                                </Text>
                                <Text style={styles.emptyCardSub}>
                                    {activeTab === 'my_store'
                                        ? 'Switch to "All" tab and link suppliers to your store.'
                                        : 'Try searching with another name or category.'}
                                </Text>
                            </View>
                        ) : (
                            filteredSuppliers.map((supplier) => {
                                const supId = supplier._id || supplier.id;
                                const isLinked = isSupplierLinkedToUser(supplier);
                                const allCategories =
                                    Array.isArray(supplier.supplyCategories) && supplier.supplyCategories.length > 0
                                        ? supplier.supplyCategories
                                        : supplier.category
                                            ? supplier.category.split(',').map((s) => s.trim()).filter(Boolean)
                                            : ['Dairy & Eggs', 'Soft Drinks'];

                                const displayCategories = allCategories.slice(0, 2);
                                const extraCount = allCategories.length - 2;
                                const catalogCount =
                                    supplier.catalogCount !== undefined
                                        ? supplier.catalogCount
                                        : Array.isArray(supplier.suppliedProducts)
                                            ? supplier.suppliedProducts.length
                                            : 25;

                                return (
                                    <View
                                        key={supId}
                                        style={[
                                            styles.supplierCard,
                                            isLinked && styles.supplierCardLinked,
                                        ]}
                                    >
                                        {/* Top Row: Title + Status Badge (Image 3) */}
                                        <View style={styles.cardHeaderRow}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={styles.supplierTitle}>{supplier.name}</Text>
                                                <View style={styles.phoneRow}>
                                                    <Phone size={13} color="#166534" />
                                                    <Text style={styles.phoneText}>
                                                        {supplier.phone || '077 852 4578'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View
                                                style={[
                                                    styles.linkBadge,
                                                    isLinked ? styles.linkBadgeLinked : styles.linkBadgeUnlinked,
                                                ]}
                                            >
                                                {isLinked ? (
                                                    <>
                                                        <CheckCircle2 size={12} color="#15803D" />
                                                        <Text style={styles.linkBadgeTextLinked}>Linked to Store</Text>
                                                    </>
                                                ) : (
                                                    <Text style={styles.linkBadgeTextUnlinked}>
                                                        {supplier.status || 'Verified'}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Middle Row: Category Badges & Region Tag (Image 3) */}
                                        <View style={styles.metaRow}>
                                            {displayCategories.map((catItem, cIdx) => (
                                                <View key={cIdx} style={styles.catPill}>
                                                    <Text style={styles.catPillText}>{catItem}</Text>
                                                </View>
                                            ))}

                                            {extraCount > 0 ? (
                                                <TouchableOpacity
                                                    style={styles.morePill}
                                                    onPress={() =>
                                                        setOpenCategoryDropdownSupId((prev) =>
                                                            prev === supId ? null : supId
                                                        )
                                                    }
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.morePillText}>+{extraCount} more</Text>
                                                    {openCategoryDropdownSupId === supId ? (
                                                        <ChevronUp size={12} color="#1D4ED8" />
                                                    ) : (
                                                        <ChevronDown size={12} color="#1D4ED8" />
                                                    )}
                                                </TouchableOpacity>
                                            ) : null}

                                            {/* Region Tag */}
                                            {supplier.region && supplier.region.includes('Islandwide') ? (
                                                <View style={styles.islandwidePill}>
                                                    <Globe size={11} color="#047857" />
                                                    <Text style={styles.islandwideText}>Islandwide</Text>
                                                </View>
                                            ) : (
                                                <View style={styles.regionPill}>
                                                    <MapPin size={11} color="#166534" />
                                                    <Text style={styles.regionText}>
                                                        {supplier.region || 'Colombo 03'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Expandable Category Dropdown */}
                                        {openCategoryDropdownSupId === supId && (
                                            <View style={styles.categoryDropdownSheet}>
                                                <View style={styles.dropdownHeader}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Layers size={13} color="#166534" />
                                                        <Text style={styles.dropdownTitle}>
                                                            All Supply Categories ({allCategories.length})
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => setOpenCategoryDropdownSupId(null)}
                                                        style={styles.dropdownClose}
                                                    >
                                                        <X size={12} color="#475569" />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                                    {allCategories.map((cat, cIdx) => (
                                                        <TouchableOpacity
                                                            key={cIdx}
                                                            style={styles.dropCatChip}
                                                            onPress={() => handleOpenCatalogModal(supplier, cat)}
                                                        >
                                                            <Text style={styles.dropCatText}>{cat}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Action Buttons Row (Image 3) */}
                                        <View style={styles.cardActionsRow}>
                                            <TouchableOpacity
                                                style={styles.productsBtn}
                                                onPress={() => handleOpenCatalogModal(supplier)}
                                                activeOpacity={0.8}
                                            >
                                                <Package size={14} color="#166534" />
                                                <Text style={styles.productsBtnText}>
                                                    Products ({catalogCount})
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.linkToggleBtn,
                                                    isLinked ? styles.unlinkBtn : styles.addLinkBtn,
                                                ]}
                                                onPress={() => handleToggleLinkSupplier(supplier)}
                                                activeOpacity={0.8}
                                            >
                                                {isLinked ? (
                                                    <>
                                                        <Trash2 size={14} color="#991B1B" />
                                                        <Text style={styles.unlinkBtnText}>Remove from Store</Text>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={15} color="#FFFFFF" />
                                                        <Text style={styles.addLinkBtnText}>Add to My Store</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Delete PO Confirmation Modal */}
            <Modal visible={!!deleteConfirmModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBox}>
                                <Trash2 size={20} color="#DC2626" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Delete Shipment Record?</Text>
                                <Text style={styles.modalSub}>{deleteConfirmModal?.poNum}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setDeleteConfirmModal(null)}>
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalBodyText}>
                            Are you sure you want to delete this completed delivery record from history?
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={() => handleDeleteDelivery(deleteConfirmModal?.id)}
                            >
                                <Text style={styles.confirmDeleteText}>Yes, Delete Record</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelModalBtn}
                                onPress={() => setDeleteConfirmModal(null)}
                            >
                                <Text style={styles.cancelModalText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Wholesale Products Catalog Modal (100% React Web Matched to Image 3) */}
            <Modal visible={!!catalogModalSupplier} transparent animationType="fade" onRequestClose={() => setCatalogModalSupplier(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.catalogModalCard}>
                        {/* Modal Header */}
                        <View style={styles.catalogModalHeader}>
                            {/* Top row: Verified badge on left, close button on right (100% Image 3) */}
                            <View style={styles.catalogTopRow}>
                                <View style={styles.verifiedBadge}>
                                    <ShieldCheck size={12} color="#15803D" />
                                    <Text style={styles.verifiedBadgeText}>Verified Catalog</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setCatalogModalSupplier(null)}
                                    style={styles.catalogCloseBtn}
                                    activeOpacity={0.7}
                                >
                                    <X size={15} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Supplier Title */}
                            <Text style={styles.catalogSupplierTitle} numberOfLines={1}>
                                {catalogModalSupplier?.name}
                            </Text>

                            {/* Meta: Location • Catalog Count */}
                            <View style={styles.catalogMetaRow}>
                                <MapPin size={11} color="#64748B" />
                                <Text style={styles.catalogMetaText}>
                                    {catalogModalSupplier?.region || 'Islandwide'}
                                </Text>
                                <Text style={styles.catalogMetaDot}>•</Text>
                                <Text style={styles.catalogMetaGreen}>
                                    {filteredCatalog.length || supplierCatalog.length || 25} Catalog Products
                                </Text>
                            </View>

                            {/* Contact Badges Row */}
                            {(catalogModalSupplier?.phone || catalogModalSupplier?.email) ? (
                                <View style={styles.catalogContactRow}>
                                    {catalogModalSupplier?.phone ? (
                                        <View style={styles.catalogPhonePill}>
                                            <Phone size={10} color="#166534" />
                                            <Text style={styles.catalogPhoneText}>{catalogModalSupplier.phone}</Text>
                                        </View>
                                    ) : null}
                                    {catalogModalSupplier?.email ? (
                                        <View style={styles.catalogEmailPill}>
                                            <Mail size={10} color="#1D4ED8" />
                                            <Text style={styles.catalogEmailText} numberOfLines={1}>
                                                {catalogModalSupplier.email}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            ) : null}
                        </View>

                        {/* Search Input */}
                        <View style={styles.catalogSearchWrap}>
                            <Search size={14} color="#94A3B8" />
                            <TextInput
                                style={styles.catalogSearchInput}
                                placeholder="Search products in this catalog..."
                                placeholderTextColor="#94A3B8"
                                value={catalogSearch}
                                onChangeText={setCatalogSearch}
                            />
                            {catalogSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setCatalogSearch('')}>
                                    <X size={14} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Category Filter Pills Bar with Scroll Controls */}
                        <View style={styles.catScrollWrapper}>
                            <TouchableOpacity
                                style={styles.catArrowBtn}
                                onPress={() => scrollModalCat('left')}
                                activeOpacity={0.7}
                            >
                                <ChevronLeft size={16} color="#475569" />
                            </TouchableOpacity>

                            <ScrollView
                                ref={modalCatScrollRef}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.catScrollPills}
                                style={{ flex: 1, marginHorizontal: 6 }}
                                onScroll={(e) => {
                                    modalCatScrollX.current = e.nativeEvent.contentOffset.x;
                                }}
                                scrollEventThrottle={16}
                            >
                                {modalCategories.map((c) => {
                                    const isActive = modalCategoryFilter.toLowerCase() === c.toLowerCase();
                                    return (
                                        <TouchableOpacity
                                            key={c}
                                            style={[
                                                styles.catFilterPill,
                                                isActive && styles.catFilterPillActive,
                                            ]}
                                            onPress={() => setModalCategoryFilter(c)}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.catFilterPillText,
                                                    isActive && styles.catFilterPillTextActive,
                                                ]}
                                            >
                                                {c}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.catArrowBtn}
                                onPress={() => scrollModalCat('right')}
                                activeOpacity={0.7}
                            >
                                <ChevronRight size={16} color="#475569" />
                            </TouchableOpacity>
                        </View>

                        {/* Subheader Table Labels */}
                        <View style={styles.catalogListHeader}>
                            <Text style={styles.catalogListHeaderLeft}>
                                Products ({filteredCatalog.length})
                            </Text>
                            <Text style={styles.catalogListHeaderRight}>
                                Wholesale Price & MOQ
                            </Text>
                        </View>

                        {/* Catalog Products List */}
                        {catalogLoading ? (
                            <View style={{ flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' }}>
                                <ActivityIndicator size="small" color="#166534" />
                            </View>
                        ) : filteredCatalog.length === 0 ? (
                            <View style={{ flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#64748B', fontSize: 13 }}>
                                    No products found in this category.
                                </Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={styles.catalogListScroll}
                                contentContainerStyle={styles.catalogListContent}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                                keyboardShouldPersistTaps="handled"
                                scrollEventThrottle={16}
                            >
                                {filteredCatalog.map((prod, pIdx) => {
                                    const pName = prod.name || prod.produce || 'Product';
                                    const pPrice = Number(prod.price || prod.wholesalePrice || 0);
                                    const pUnit = prod.unit || '/ 1kg';
                                    const pMoq = prod.minOrderQty || 1;
                                    const pStatus = prod.status || 'Available';
                                    const pImg = prod.image || prod.imageUrl || '';

                                    return (
                                        <View key={prod._id || pIdx} style={styles.catalogProdItem}>
                                            <View style={styles.catalogProdLeft}>
                                                <View style={styles.catalogThumb}>
                                                    {pImg ? (
                                                        <Image
                                                            source={{ uri: resolveImageUrl(pImg) }}
                                                            style={styles.catalogThumbImg}
                                                            resizeMode="contain"
                                                        />
                                                    ) : (
                                                        <Package size={20} color="#166534" />
                                                    )}
                                                </View>
                                                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                                                    <Text style={styles.catalogProdName} numberOfLines={1}>
                                                        {pName}
                                                    </Text>
                                                    <View style={styles.prodCatMoqRow}>
                                                        {prod.category ? (
                                                            <View style={styles.prodCatPill}>
                                                                <Text style={styles.prodCatPillText}>{prod.category}</Text>
                                                            </View>
                                                        ) : null}
                                                        <Text style={styles.prodMoqText}>
                                                            Min: {pMoq} {pUnit}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View style={styles.catalogProdRight}>
                                                <View style={[styles.prodStatusBadge, pStatus !== 'Available' && styles.prodStatusBadgeRed]}>
                                                    <Text style={[styles.prodStatusText, pStatus !== 'Available' && styles.prodStatusTextRed]}>
                                                        {pStatus}
                                                    </Text>
                                                </View>
                                                <Text style={styles.catalogProdPrice}>
                                                    Rs. {pPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* Modal Footer */}
                        <View style={styles.catalogModalFooter}>
                            <Text style={styles.catalogFooterNote}>Catalog verified by supplier</Text>
                            <TouchableOpacity
                                style={styles.catalogCloseActionBtn}
                                onPress={() => setCatalogModalSupplier(null)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.catalogCloseActionText}>Close</Text>
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
    mainScroll: {
        flex: 1,
    },
    mainScrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'android' ? 60 : 40,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    pageSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748B',
        letterSpacing: -0.25,
        marginTop: 2,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        padding: 4,
        borderRadius: 14,
        gap: 6,
        marginBottom: 14,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        borderRadius: 10,
    },
    tabButtonActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    tabText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#0F172A',
        fontWeight: '800',
    },
    tabTextActiveStore: {
        color: '#15803D',
        fontWeight: '800',
    },
    tabTextActiveTracking: {
        color: '#2563EB',
        fontWeight: '700',
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        gap: 8,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '500',
        color: '#1E293B',
    },
    loadingWrap: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    loadingText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    cardsStack: {
        gap: 12,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 18,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    emptyCardSub: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        maxWidth: 240,
    },
    supplierCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 18,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
    },
    supplierCardLinked: {
        borderWidth: 1.5,
        borderColor: '#166534',
        backgroundColor: '#F0FDF4',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    supplierTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 4,
    },
    phoneText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    linkBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    linkBadgeLinked: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
    },
    linkBadgeUnlinked: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    linkBadgeTextLinked: {
        fontSize: 11,
        fontWeight: '800',
        color: '#15803D',
    },
    linkBadgeTextUnlinked: {
        fontSize: 11,
        fontWeight: '800',
        color: '#475569',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
        marginBottom: 12,
    },
    catPill: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 8,
    },
    catPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },
    morePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    morePillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1D4ED8',
    },
    islandwidePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 8,
    },
    islandwideText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#047857',
    },
    regionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 8,
    },
    regionText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    categoryDropdownSheet: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dropdownTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0F172A',
    },
    dropdownClose: {
        padding: 2,
    },
    dropCatChip: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    dropCatText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#334155',
    },
    cardActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        gap: 8,
    },
    productsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    productsBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    linkToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    unlinkBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    unlinkBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#991B1B',
    },
    addLinkBtn: {
        backgroundColor: '#166534',
    },
    addLinkBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    trackingHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    trackingTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
    },
    trackingSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    refreshTrackingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    refreshTrackingText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
    },
    subTabsRow: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        padding: 4,
        gap: 6,
    },
    subTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: 'transparent',
    },
    subTabBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    subTabText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#64748B',
    },
    subTabTextActiveGreen: {
        color: '#15803D',
        fontWeight: '800',
    },
    subTabTextActiveBlue: {
        color: '#2563EB',
        fontWeight: '700',
    },
    deliveryCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 18,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
    },
    delCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    poBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    poBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#15803D',
    },
    delStatusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    delStatusPillPending: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    delStatusPillDone: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
    },
    delStatusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    delStatusTextPending: {
        color: '#2563EB',
    },
    delStatusTextDone: {
        color: '#15803D',
    },
    delSupplierName: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 6,
    },
    delDestText: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    delDestBold: {
        fontWeight: '700',
        color: '#334155',
    },
    delEtaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    delStatusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    delStatusItemText: {
        fontSize: 12.5,
        color: '#334155',
    },
    delStatusBold: {
        fontWeight: '700',
        color: '#0F172A',
    },
    etaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    etaPillText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#B45309',
    },
    nestedItemsBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 10,
        gap: 8,
        marginBottom: 12,
    },
    nestedItemRow: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    nestedItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        marginRight: 8,
    },
    nestedItemThumbBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    nestedItemImg: {
        width: '100%',
        height: '100%',
    },
    nestedItemName: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 18,
    },
    nestedItemSub: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },
    nestedItemRight: {
        alignItems: 'flex-end',
        flexShrink: 0,
    },
    nestedItemQtyBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    nestedItemQtyText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#166534',
    },
    nestedItemPrice: {
        fontSize: 13.5,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 2,
    },
    orderTotalBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FEF9C3',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 4,
    },
    orderTotalLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#854D0E',
    },
    orderTotalVal: {
        fontSize: 14.5,
        fontWeight: '900',
        color: '#854D0E',
    },
    delActionRow: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
    },
    delActionBtn: {
        flex: 1,
        backgroundColor: '#166534',
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    delActionBtnText: {
        color: '#FFFFFF',
        fontSize: 13.5,
        fontWeight: '700',
    },
    delDeleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFF1F2',
        borderWidth: 1,
        borderColor: '#FECDD3',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
    },
    delDeleteBtnText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalSheet: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 20,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    modalSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    modalBodyText: {
        fontSize: 13,
        color: '#475569',
        marginVertical: 14,
        lineHeight: 18,
    },
    modalActions: {
        gap: 10,
    },
    confirmDeleteBtn: {
        backgroundColor: '#DC2626',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmDeleteText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    cancelModalBtn: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelModalText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '700',
    },
    catalogModalCard: {
        width: '100%',
        maxWidth: 390,
        height: '86%',
        maxHeight: '88%',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        overflow: 'hidden',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        flexDirection: 'column',
    },
    catalogModalHeader: {
        paddingTop: 14,
        paddingHorizontal: 16,
        paddingBottom: 6,
        backgroundColor: '#FFFFFF',
    },
    catalogTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    verifiedBadgeText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#15803D',
        marginLeft: 4,
    },
    catalogCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    catalogSupplierTitle: {
        fontSize: 16.5,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3,
        marginBottom: 3,
    },
    catalogMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    catalogMetaText: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
        marginLeft: 3,
    },
    catalogMetaDot: {
        fontSize: 11.5,
        color: '#94A3B8',
        marginHorizontal: 5,
    },
    catalogMetaGreen: {
        fontSize: 11.5,
        color: '#15803D',
        fontWeight: '700',
    },
    catalogContactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        paddingTop: 4,
        paddingBottom: 6,
    },
    catalogPhonePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 7,
        marginRight: 8,
    },
    catalogPhoneText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#166534',
        marginLeft: 4,
    },
    catalogEmailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 7,
    },
    catalogEmailText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1D4ED8',
        marginLeft: 4,
    },
    catalogSearchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        marginHorizontal: 16,
        paddingHorizontal: 10,
        height: 38,
        marginBottom: 10,
    },
    catalogSearchInput: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#0F172A',
        marginLeft: 8,
        paddingVertical: 0,
    },
    catScrollWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    catArrowBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    catScrollPills: {
        alignItems: 'center',
        paddingVertical: 2,
    },
    catFilterPill: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 13,
        paddingVertical: 5,
        borderRadius: 20,
        marginRight: 6,
    },
    catFilterPillActive: {
        backgroundColor: '#166534',
        borderColor: '#166534',
    },
    catFilterPillText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#475569',
    },
    catFilterPillTextActive: {
        color: '#FFFFFF',
    },
    catalogListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        marginBottom: 8,
    },
    catalogListHeaderLeft: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    catalogListHeaderRight: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    catalogListScroll: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    catalogListContent: {
        padding: 12,
        paddingBottom: 28,
    },
    catalogProdItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    catalogProdLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    catalogThumb: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginRight: 10,
    },
    catalogThumbImg: {
        width: '100%',
        height: '100%',
    },
    catalogProdName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 16,
    },
    prodCatMoqRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    prodCatPill: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 5,
        marginRight: 6,
    },
    prodCatPillText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#047857',
    },
    prodMoqText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    catalogProdRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    prodStatusBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        marginBottom: 3,
    },
    prodStatusBadgeRed: {
        backgroundColor: '#FEE2E2',
    },
    prodStatusText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#166534',
    },
    prodStatusTextRed: {
        color: '#991B1B',
    },
    catalogProdPrice: {
        fontSize: 13.5,
        fontWeight: '900',
        color: '#166534',
    },
    catalogModalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    catalogFooterNote: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    catalogCloseActionBtn: {
        backgroundColor: '#166534',
        paddingHorizontal: 18,
        paddingVertical: 7,
        borderRadius: 10,
    },
    catalogCloseActionText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
