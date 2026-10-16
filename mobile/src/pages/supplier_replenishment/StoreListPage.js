import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Image,
    Platform,
    Animated,
} from 'react-native';
import {
    Store,
    ArrowLeft,
    MapPin,
    Phone,
    Mail,
    RefreshCw,
    Trash2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

function StoreIconOrPic({ store }) {
    const [imgErr, setImgErr] = useState(false);
    const picSrc = store?.picture || store?.profilePic || store?.image || store?.avatar;

    if (picSrc && !imgErr) {
        return (
            <Image
                source={{ uri: picSrc }}
                style={styles.storeAvatarImg}
                onError={() => setImgErr(true)}
            />
        );
    }
    return (
        <View style={styles.storeAvatarFallback}>
            <Store size={18} color="#166534" />
        </View>
    );
}

export default function StoreListScreen({ onNavigate }) {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState(null);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);

    const [spinAnim] = useState(new Animated.Value(0));

    const startSpin = () => {
        spinAnim.setValue(0);
        Animated.timing(spinAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    };

    const fetchStores = async () => {
        setLoading(true);
        startSpin();
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `${API_BASE_URL}/supplier-replenishment/stores?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.stores)) {
                setStores(data.stores);
                if (data.stores.length > 0 && !selectedStoreId) {
                    setSelectedStoreId(data.stores[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching stores:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, [user?.email, user?.supplierName, user?.name]);

    const filteredStores = stores.filter((s) =>
        (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleRemoveStore = () => {
        if (selectedStoreId) {
            setStores((prev) => prev.filter((s) => s.id !== selectedStoreId));
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
                    <Text style={styles.pageTitle}>Stores</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.refreshListBtn}
                            onPress={fetchStores}
                            activeOpacity={0.7}
                        >
                            <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                                <RefreshCw size={13} color="#166534" />
                            </Animated.View>
                            <Text style={styles.refreshListBtnText}>Refresh List</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => onNavigate && onNavigate('home')}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={18} color="#1E293B" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Box */}
                <View style={styles.searchBox}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search connected stores by name or location..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholderTextColor="#94A3B8"
                    />
                </View>
            </View>

            {/* 📜 Scrollable Content Area */}
            <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.cardsStack}>
                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="small" color="#27672D" />
                            <Text style={styles.centerText}>Loading client stores from MongoDB...</Text>
                        </View>
                    ) : filteredStores.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Store size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
                            <Text style={styles.emptyTitle}>No Store Clients Found</Text>
                            <Text style={styles.emptySub}>
                                Stores that send you replenishment requests will appear here automatically.
                            </Text>
                        </View>
                    ) : (
                        filteredStores.map((store) => {
                            const isSelected = store.id === selectedStoreId;
                            return (
                                <TouchableOpacity
                                    key={store.id}
                                    style={[
                                        styles.storeCard,
                                        isSelected && styles.storeCardSelected,
                                    ]}
                                    onPress={() => setSelectedStoreId(store.id)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.cardHeaderRow}>
                                        <View style={styles.storeNameWithPic}>
                                            <StoreIconOrPic store={store} />
                                            <Text style={styles.storeNameText}>{store.name}</Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                store.status === 'ACTIVE'
                                                    ? styles.statusBadgeActive
                                                    : styles.statusBadgeInactive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusBadgeText,
                                                    store.status === 'ACTIVE'
                                                        ? styles.statusBadgeTextActive
                                                        : styles.statusBadgeTextInactive,
                                                ]}
                                            >
                                                {store.status || 'ACTIVE'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.metaRow}>
                                        <MapPin size={13} color="#64748B" />
                                        <Text style={styles.metaText}>{store.address || 'Main Street'}</Text>
                                    </View>

                                    {store.phone ? (
                                        <View style={styles.metaRow}>
                                            <Phone size={13} color="#64748B" />
                                            <Text style={styles.metaText}>{store.phone}</Text>
                                        </View>
                                    ) : null}

                                    {store.email ? (
                                        <View style={styles.metaRow}>
                                            <Mail size={13} color="#64748B" />
                                            <Text style={styles.metaText}>{store.email}</Text>
                                        </View>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* 🔒 Fixed Bottom Action Bar */}
            {filteredStores.length > 0 && (
                <View style={styles.bottomActionBar}>
                    <TouchableOpacity
                        style={styles.removeStoreBtn}
                        onPress={handleRemoveStore}
                        activeOpacity={0.8}
                    >
                        <Trash2 size={16} color="#27672D" />
                        <Text style={styles.removeStoreBtnText}>Remove Selected Store</Text>
                    </TouchableOpacity>
                </View>
            )}
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
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 12,
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    refreshListBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    refreshListBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
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
    },
    searchBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    searchInput: {
        fontSize: 14,
        color: '#1E293B',
        padding: 0,
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'android' ? 60 : 32,
    },
    cardsStack: {
        gap: 10,
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
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    storeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 4,
    },
    storeCardSelected: {
        borderWidth: 2,
        borderColor: '#166534',
        backgroundColor: '#F0FDF4',
        shadowColor: '#166534',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    storeNameWithPic: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    storeAvatarImg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#166534',
    },
    storeAvatarFallback: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeNameText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusBadgeActive: {
        backgroundColor: '#DCFCE7',
    },
    statusBadgeInactive: {
        backgroundColor: '#F1F5F9',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    statusBadgeTextActive: {
        color: '#166534',
    },
    statusBadgeTextInactive: {
        color: '#64748B',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    metaText: {
        fontSize: 12,
        color: '#475569',
    },
    bottomActionBar: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
    },
    removeStoreBtn: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#27672D',
        paddingVertical: 14,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    removeStoreBtnText: {
        color: '#27672D',
        fontSize: 15,
        fontWeight: '700',
    },
});
