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
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Search,
    Store,
    MapPin,
    Clock,
    ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

// Module-level RAM cache for instant tab transitions
let cachedStores = null;

// Strictly real stores from database (NO fake dummy data)
const DEFAULT_STORES = [];

// Helper to resolve store picture with fallbacks
function resolveStorePic(picture, storeName = '') {
    if (typeof picture === 'string' && picture.trim().length > 0 && !picture.includes('ui-avatars.com')) {
        const trimmed = picture.trim();
        if (trimmed.startsWith('data:image') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return { uri: trimmed };
        }
        if (trimmed.includes('logo')) {
            return require('../../../assets/logo.jpg');
        }
        if (trimmed.includes('grocery')) {
            return require('../../../assets/GroceryMart.jpg');
        }
    }
    const nameLower = (storeName || '').toLowerCase();
    if (nameLower.includes('grocery')) {
        return require('../../../assets/GroceryMart.jpg');
    }
    if (nameLower.includes('lanka')) {
        return require('../../../assets/logo.jpg');
    }
    return null;
}

export default function CustomerStoresPage({ onNavigate, onSelectStore, selectedStore }) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOption, setFilterOption] = useState('All');
    const [stores, setStores] = useState(cachedStores && cachedStores.length > 0 ? cachedStores : []);
    const [isLoading, setIsLoading] = useState(!cachedStores || cachedStores.length === 0);

    useEffect(() => {
        let isMounted = true;
        const fetchStores = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/customer-shopping/stores`);
                const data = await res.json();
                if (data.success && Array.isArray(data.stores) && isMounted) {
                    cachedStores = data.stores;
                    setStores(data.stores);
                }
            } catch (err) {
                console.warn('Failed to load stores from backend:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchStores();
        return () => {
            isMounted = false;
        };
    }, []);

    const filteredStores = stores.filter((s) => {
        const matchesQuery =
            (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.location || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (filterOption === 'Near Me') {
            const userCity = (user?.location || '').toLowerCase().trim();
            const storeText = `${s.location || ''} ${s.storeAddress || ''} ${s.address || ''}`.toLowerCase();
            const matchesUserCity =
                userCity &&
                userCity !== 'islandwide' &&
                userCity.split(/\s+/).some((w) => w.length >= 3 && storeText.includes(w));
            return matchesQuery && (matchesUserCity || parseFloat(s.distance || 0) <= 2.0);
        }
        if (filterOption === 'Top Rated') {
            return matchesQuery && parseFloat(s.rating || 0) >= 4.8;
        }
        return matchesQuery;
    });

    const handleChooseStore = (store) => {
        if (onSelectStore) onSelectStore(store);
        if (onNavigate) onNavigate('search');
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Header matching exact Web & Screenshot layout */}
            <View style={styles.storesHeader}>
                <View style={styles.storesHeaderTitleBox}>
                    <Text style={styles.storesHeaderTitle}>Pickup Stores</Text>
                    <Text style={styles.storesHeaderSub}>Select your local grocery shop</Text>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('home')}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.storesSearchWrapper}>
                <Search size={18} color="#64748B" />
                <TextInput
                    style={styles.storesSearchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search stores by name, city or street..."
                    placeholderTextColor="#888888"
                />
            </View>

            {/* Filter Chips */}
            <View style={styles.storesFilterChips}>
                {['All', 'Near Me', 'Top Rated'].map((opt) => {
                    const isActive = filterOption === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.storesChip, isActive && styles.storesChipActive]}
                            onPress={() => setFilterOption(opt)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.storesChipText, isActive && styles.storesChipTextActive]}>
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Stores List */}
            <View style={styles.storesList}>
                {isLoading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#2D7B38" />
                        <Text style={styles.loadingText}>Loading pickup stores from database...</Text>
                    </View>
                ) : filteredStores.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Store size={36} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No Stores Found</Text>
                        <Text style={styles.emptySub}>No registered pickup stores available at the moment.</Text>
                    </View>
                ) : (
                    filteredStores.map((store) => {
                        const isSelected = selectedStore?.id === store.id || selectedStore?.name === store.name;
                        const isClosed = store.storeStatus === 'closed';
                        const resolvedPic = resolveStorePic(store.picture, store.name);

                        return (
                            <TouchableOpacity
                                key={store.id || store._id || store.name}
                                style={[
                                    styles.storeListCard,
                                    isSelected && styles.storeListCardSelected,
                                    isClosed && styles.storeListCardDisabled,
                                ]}
                                onPress={() => {
                                    if (!isClosed) handleChooseStore(store);
                                }}
                                activeOpacity={isClosed ? 1 : 0.85}
                            >
                                <View style={styles.storeListCardTop}>
                                    <View style={[styles.storeListIcon, isSelected && styles.storeListIconSelected]}>
                                        {resolvedPic ? (
                                            <Image
                                                source={resolvedPic}
                                                style={styles.storeListIconImg}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Store size={22} color={isSelected ? '#2D7B38' : '#475569'} />
                                        )}
                                    </View>
                                    <View style={styles.storeListTitleGroup}>
                                        <Text style={styles.storeListName}>{store.name}</Text>
                                    </View>
                                </View>

                                <View style={styles.storeListAddressRow}>
                                    <MapPin size={14} color="#64748B" />
                                    <Text style={styles.storeListAddressText} numberOfLines={1}>
                                        {store.address || store.location || 'Local Store'}
                                    </Text>
                                </View>

                                <View style={styles.storeListCardFooter}>
                                    <View style={styles.storeStatusGroup}>
                                        <Clock size={13} color={isClosed ? '#DC2626' : '#059669'} />
                                        <Text style={[styles.storeStatusText, isClosed && styles.storeStatusTextClosed]}>
                                            {isClosed ? 'Closed' : (store.status || 'Open • Pick up in 30m')}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.selectStoreActionBtn,
                                            isSelected && styles.selectStoreActionBtnSelected,
                                            isClosed && styles.selectStoreActionBtnDisabled,
                                        ]}
                                        onPress={() => {
                                            if (!isClosed) handleChooseStore(store);
                                        }}
                                        disabled={isClosed}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.selectStoreActionBtnText, isSelected && styles.selectStoreActionBtnTextSelected]}>
                                            {isClosed ? 'Unavailable' : (isSelected ? 'Selected ✓' : 'Shop at Store')}
                                        </Text>
                                        {!isClosed && (
                                            <ChevronRight
                                                size={14}
                                                color={isSelected ? '#2D7B38' : '#FFFFFF'}
                                            />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>
            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F5',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'android' ? 44 : 20,
        gap: 12,
    },
    bottomSpacer: {
        height: 8,
    },

    // Header
    storesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    storesHeaderTitleBox: {
        flex: 1,
        flexDirection: 'column',
        gap: 2,
    },
    storesHeaderTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.5,
    },
    storesHeaderSub: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },

    // Search Input
    storesSearchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 9,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    storesSearchInput: {
        flex: 1,
        fontSize: 13,
        color: '#1E293B',
        padding: 0,
    },

    // Filter Chips
    storesFilterChips: {
        flexDirection: 'row',
        gap: 8,
    },
    storesChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    storesChipActive: {
        backgroundColor: '#2D7B38',
        borderColor: '#2D7B38',
    },
    storesChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    storesChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    // Stores List & Cards
    storesList: {
        flexDirection: 'column',
        gap: 11,
    },
    storeListCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 13,
        flexDirection: 'column',
        gap: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    storeListCardSelected: {
        borderColor: '#2D7B38',
        backgroundColor: '#F4FBF5',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },
    storeListCardDisabled: {
        opacity: 0.65,
        backgroundColor: '#F8FAFC',
        borderColor: '#F1F5F9',
    },
    storeListCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    storeListIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    storeListIconSelected: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    storeListIconImg: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    storeListTitleGroup: {
        flex: 1,
        flexDirection: 'column',
        gap: 2,
    },
    storeListName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    storeListAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    storeListAddressText: {
        fontSize: 12,
        color: '#64748B',
        flex: 1,
    },
    storeListCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    storeStatusGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    storeStatusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    storeStatusTextClosed: {
        color: '#DC2626',
    },
    selectStoreActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2D7B38',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    selectStoreActionBtnSelected: {
        backgroundColor: '#DCFCE7',
    },
    selectStoreActionBtnDisabled: {
        opacity: 0.6,
    },
    selectStoreActionBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    selectStoreActionBtnTextSelected: {
        color: '#2D7B38',
    },

    // Loading & Empty states
    loadingBox: {
        paddingVertical: 40,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginTop: 12,
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    emptyBox: {
        paddingVertical: 32,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginTop: 12,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '700',
    },
    emptySub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
    },
});
