import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform,
} from 'react-native';
import {
    Search,
    ArrowLeft,
    X,
    Store,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react-native';
import { API_BASE_URL } from '../../config/api';

let searchDataCache = null;

const DEFAULT_PRODUCTS = [];

const DEFAULT_CATEGORIES = [
    'All',
    'Vegetables',
    'Fruits',
    'Dairy',
    'Bakery',
    'Soft Drinks',
    'Beverages',
    'Snacks',
    'Grains',
];

function resolveProductImage(product) {
    const raw = product?.imageUrl || product?.image;
    if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:'))) {
        return { uri: raw };
    }
    const name = (product?.name || '').toLowerCase();
    const cat = (product?.category || '').toLowerCase();
    if (name.includes('butter') || name.includes('anchor')) {
        return require('../../../assets/Pic117561.jpg');
    }
    if (name.includes('7 up') || name.includes('7up')) {
        return require('../../../assets/7 Up Pet Bottle 1L.jpeg');
    }
    if (name.includes('sprite')) {
        return require('../../../assets/Sprite 1L Bottle.jpg');
    }
    if (name.includes('coca') || name.includes('coke')) {
        return require('../../../assets/Coca Cola Pet Bottle 1.05L.jpg');
    }
    if (name.includes('milk') || cat.includes('dairy')) {
        return require('../../../assets/highland_milk.png');
    }
    if (name.includes('chicken') || name.includes('meat') || cat.includes('meat')) {
        return require('../../../assets/meat.webp');
    }
    if (name.includes('soap') || name.includes('dove') || name.includes('lux')) {
        return require('../../../assets/Dove Beauty Cream Soap 100g.jpg');
    }
    if (name.includes('tomato') || name.includes('carrot') || name.includes('bean') || cat.includes('veg')) {
        return require('../../../assets/vegetables.jpg');
    }
    if (name.includes('apple') || name.includes('avocado') || name.includes('grape') || cat.includes('fruit')) {
        return require('../../../assets/fruits.webp');
    }
    if (name.includes('rice') || cat.includes('grain')) {
        return require('../../../assets/grains.jpg');
    }
    return require('../../../assets/fresh_produce_hero.png');
}

function getStoreProfileSource(storeName, storeProfilesMap, selectedStoreObj) {
    const sClean = (storeName || '').split(' - ')[0].replace(/\s+/g, '').trim().toLowerCase();
    const raw = storeProfilesMap?.[sClean] || (selectedStoreObj && (selectedStoreObj.picture || selectedStoreObj.image));
    if (typeof raw === 'string' && (raw.startsWith('data:image') || raw.startsWith('http://') || raw.startsWith('https://'))) {
        return { uri: raw };
    }
    if (sClean.includes('grocery')) {
        return require('../../../assets/GroceryMart.jpg');
    }
    if (sClean.includes('lanka')) {
        return require('../../../assets/logo.jpg');
    }
    return require('../../../assets/GroceryMart.jpg');
}

export default function SearchPage({
    onNavigate,
    onSelectProduct,
    onAddToCart,
    selectedStore,
    onSelectStore,
    initialCategory = 'All',
}) {
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(initialCategory || 'All');
    const initialProducts = searchDataCache?.products?.length > 0 ? searchDataCache.products : [];
    const [products, setProducts] = useState(initialProducts);
    const [categoriesList, setCategoriesList] = useState(searchDataCache?.categoriesList || DEFAULT_CATEGORIES);
    const [storeProfilesMap, setStoreProfilesMap] = useState(searchDataCache?.storeProfilesMap || {});
    const [isLoading, setIsLoading] = useState(!searchDataCache?.products);
    const [showAllProducts, setShowAllProducts] = useState(false);
    const catScrollRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const fetchSearchData = async () => {
            if (!searchDataCache?.products) setIsLoading(true);
            try {
                const [prodRes, catRes, storeRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/product-inventory/products`).catch(() => null),
                    fetch(`${API_BASE_URL}/product-inventory/categories`).catch(() => null),
                    fetch(`${API_BASE_URL}/customer-shopping/stores`).catch(() => null),
                ]);

                let fetchedProducts = searchDataCache?.products || [];
                let fetchedCats = searchDataCache?.categoriesList || DEFAULT_CATEGORIES;
                let fetchedStoreMap = searchDataCache?.storeProfilesMap || {};

                if (prodRes && prodRes.ok) {
                    const prodData = await prodRes.json();
                    if (prodData.success && Array.isArray(prodData.products) && isMounted) {
                        fetchedProducts = prodData.products.map((p) => ({
                            id: p._id || p.id,
                            _id: p._id || p.id,
                            name: p.name,
                            brand: p.brand || '',
                            category: p.category || 'Grocery',
                            price: p.price,
                            unit: p.unit || '1kg',
                            stock: p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 10),
                            storeName: p.storeName || p.brand || 'Lanka Mart',
                            ownerEmail: (p.ownerEmail || p.storeEmail || '').toLowerCase().trim(),
                            storeEmail: (p.storeEmail || p.ownerEmail || '').toLowerCase().trim(),
                            imageUrl: p.imageUrl || p.image,
                        }));
                        setProducts(fetchedProducts);
                    }
                }

                if (catRes && catRes.ok) {
                    const catData = await catRes.json();
                    if (catData.success && Array.isArray(catData.categories) && isMounted) {
                        const fetchedNames = catData.categories
                            .map((c) => (typeof c === 'string' ? c : (c.name || '')))
                            .filter((c) => c && c !== 'Low Stock');
                        const productCats = fetchedProducts.map((p) => p.category).filter(Boolean);
                        const combinedCats = Array.from(new Set([...fetchedNames, ...productCats]));
                        fetchedCats = combinedCats.length > 0 ? ['All', ...combinedCats] : DEFAULT_CATEGORIES;
                        setCategoriesList(fetchedCats);
                    }
                }

                if (storeRes && storeRes.ok) {
                    const storeData = await storeRes.json();
                    if (storeData.success && Array.isArray(storeData.stores) && isMounted) {
                        const map = {};
                        storeData.stores.forEach((s) => {
                            const key = (s.name || '').split(' - ')[0].replace(/\s+/g, '').trim().toLowerCase();
                            if (key) {
                                map[key] = s.picture || s.image || null;
                            }
                        });
                        fetchedStoreMap = map;
                        setStoreProfilesMap(map);
                    }
                }

                searchDataCache = {
                    products: fetchedProducts,
                    categoriesList: fetchedCats,
                    storeProfilesMap: fetchedStoreMap,
                };
            } catch (err) {
                // Keep fallback
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchSearchData();
        return () => { isMounted = false; };
    }, []);

    const rawStoreName = selectedStore
        ? (typeof selectedStore === 'string' ? selectedStore : (selectedStore.name || selectedStore.shopName || selectedStore.storeName || ''))
        : '';
    const selectedStoreEmail = selectedStore && typeof selectedStore === 'object'
        ? (selectedStore.email || selectedStore.storeEmail || selectedStore.ownerEmail || '').toLowerCase().trim()
        : '';
    const isAllStoresSelected = !rawStoreName || rawStoreName.toLowerCase().includes('all nearby') || rawStoreName.toLowerCase().includes('all store');
    const selectedStoreName = isAllStoresSelected ? '' : rawStoreName;

    // Filter products
    const filtered = products.filter((p) => {
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const pBrand = (p.brand || '').toLowerCase();
        const q = query.toLowerCase().trim();

        const matchesQuery = !q || pName.includes(q) || pCat.includes(q) || pBrand.includes(q);

        const matchesCat = (() => {
            if (!activeCategory || activeCategory === 'All') return true;
            const actLower = activeCategory.toLowerCase().trim();
            const catLower = pCat.trim();
            if (catLower === actLower) return true;
            if (catLower.includes(actLower) || actLower.includes(catLower)) return true;
            return false;
        })();

        const matchesStore = (() => {
            if (!selectedStoreName && !selectedStoreEmail) return true;
            if (selectedStoreEmail) {
                const pEmail = (p.ownerEmail || p.storeEmail || '').toLowerCase().trim();
                if (pEmail && (pEmail === selectedStoreEmail || selectedStoreEmail.includes(pEmail) || pEmail.includes(selectedStoreEmail))) {
                    return true;
                }
            }
            if (selectedStoreName) {
                const prodStoreClean = String(p.storeName || '').toLowerCase().replace(/\s+/g, '').trim();
                const targetStoreClean = selectedStoreName.toLowerCase().split('-')[0].replace(/\s+/g, '').trim();
                if (!prodStoreClean || !targetStoreClean) return true;
                if (prodStoreClean.includes(targetStoreClean) || targetStoreClean.includes(prodStoreClean)) return true;
                if (targetStoreClean.includes('grocery') && prodStoreClean.includes('grocery')) return true;
                if (targetStoreClean.includes('lanka') && prodStoreClean.includes('lanka')) return true;
                return false;
            }
            return true;
        })();

        return matchesQuery && matchesCat && matchesStore;
    });

    const productsToDisplay = showAllProducts ? filtered : filtered.slice(0, 12);

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Store Selection Header Banner */}
                <View style={styles.storeBadgeBar}>
                    <View style={styles.storeBadgeInfo}>
                        <View style={styles.storeBadgeIconWrap}>
                            <Store size={18} color="#2D7B38" />
                        </View>
                        <View style={styles.storeBadgeTextCol}>
                            <Text style={styles.storeBadgeLabel}>
                                {selectedStoreName ? 'STORE SELECTED' : 'STORE FILTER'}
                            </Text>
                            <Text style={styles.storeBadgeName} numberOfLines={1}>
                                {selectedStoreName ? selectedStoreName : 'All Nearby Stores'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.storeBadgeActions}>
                        {selectedStoreName ? (
                            <TouchableOpacity
                                style={styles.allStoresBtn}
                                onPress={() => onSelectStore && onSelectStore(null)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.allStoresBtnText}>All Stores</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.changeStoreBtn}
                            onPress={() => onNavigate && onNavigate('stores')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.changeStoreBtnText}>
                                {selectedStoreName ? 'Change' : 'Select Store'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Page Header Titles with Back Arrow */}
                <View style={styles.headerRow}>
                    <View style={styles.headerTitleGroup}>
                        <Text style={styles.mainTitle}>Products</Text>
                        <Text style={styles.mainSub} numberOfLines={1}>
                            {selectedStoreName
                                ? `Showing produce for ${selectedStoreName}`
                                : (activeCategory !== 'All' ? `Showing ${activeCategory}` : 'Browse available groceries')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => onNavigate && onNavigate('home')}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={20} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                {/* Search Input Box */}
                <View style={styles.searchBox}>
                    <TextInput
                        style={styles.searchInput}
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search products..."
                        placeholderTextColor="#94A3B8"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
                            <X size={16} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Filter Chips Bar with Scroll Arrow Controls matching Image 1 */}
                <View style={styles.catBarWrapper}>
                    <TouchableOpacity
                        style={styles.catScrollArrow}
                        onPress={() => {
                            catScrollRef.current?.scrollTo({ x: 0, animated: true });
                        }}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={16} color="#64748B" />
                    </TouchableOpacity>

                    <ScrollView
                        ref={catScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.catBar}
                    >
                        {categoriesList.map((catName) => {
                            const isActive = activeCategory === catName;
                            return (
                                <TouchableOpacity
                                    key={catName}
                                    style={[styles.catPill, isActive && styles.catPillActive]}
                                    onPress={() => setActiveCategory(catName)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                                        {catName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.catScrollArrow}
                        onPress={() => {
                            catScrollRef.current?.scrollToEnd({ animated: true });
                        }}
                        activeOpacity={0.7}
                    >
                        <ChevronRight size={16} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* 2-Column Product Cards Grid */}
                {isLoading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#2D7B38" />
                        <Text style={styles.loadingText}>Loading products...</Text>
                    </View>
                ) : filtered.length > 0 ? (
                    <View style={styles.productGrid}>
                        {productsToDisplay.map((product) => {
                            const imgSrc = resolveProductImage(product);
                            const sName = product.storeName || selectedStoreName || 'PickFresh';
                            const shortStore = sName.split(' - ')[0];
                            const storePicSrc = getStoreProfileSource(shortStore, storeProfilesMap, selectedStore);

                            return (
                                <TouchableOpacity
                                    key={product.id || product._id}
                                    style={styles.gridCard}
                                    onPress={() => onSelectProduct && onSelectProduct(product)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.cardImgBox}>
                                        <Image
                                            source={imgSrc}
                                            style={styles.cardImg}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <View style={styles.storeTagPill}>
                                            {storePicSrc ? (
                                                <Image
                                                    source={storePicSrc}
                                                    style={styles.storeMiniAvatar}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Store size={10} color="#15803D" />
                                            )}
                                            <Text style={styles.storeTagPillText} numberOfLines={1}>
                                                {shortStore}
                                            </Text>
                                        </View>
                                        <Text style={styles.cardName} numberOfLines={2}>
                                            {product.name}
                                        </Text>
                                        <Text style={styles.cardPrice}>
                                            Rs. {product.price} / {(!product.unit || product.unit === 'item') ? 'pack' : product.unit}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.emptyBox}>
                        <Store size={36} color="#94A3B8" />
                        <Text style={styles.emptyTitle}>No Products Found</Text>
                        <Text style={styles.emptySub}>
                            {selectedStoreName
                                ? `No items available for "${selectedStoreName}" under "${activeCategory}"`
                                : 'No products match your search.'}
                        </Text>
                        {selectedStoreName ? (
                            <TouchableOpacity
                                style={styles.resetStoreBtn}
                                onPress={() => onSelectStore && onSelectStore(null)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.resetStoreBtnText}>Show products from all stores</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )}

                {/* Bottom View All Products Button */}
                {!showAllProducts && filtered.length > 12 && (
                    <TouchableOpacity
                        style={styles.viewMoreBtn}
                        onPress={() => setShowAllProducts(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.viewMoreBtnText}>
                            View all products (+{filtered.length - 12} more)
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'android' ? 50 : 30,
    },
    storeBadgeBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#F0FDF4',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#DCFCE7',
        marginBottom: 14,
    },
    storeBadgeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    storeBadgeIconWrap: {
        backgroundColor: '#DCFCE7',
        padding: 6,
        borderRadius: 10,
    },
    storeBadgeTextCol: {
        flex: 1,
    },
    storeBadgeLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#166534',
        letterSpacing: 0.5,
    },
    storeBadgeName: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 1,
    },
    storeBadgeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    allStoresBtn: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 10,
    },
    allStoresBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    changeStoreBtn: {
        backgroundColor: '#2D7B38',
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: 10,
    },
    changeStoreBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerTitleGroup: {
        flex: 1,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.4,
    },
    mainSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 14,
        height: 46,
        marginBottom: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
        padding: 0,
    },
    catBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 14,
    },
    catScrollArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    catBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 2,
    },
    catPill: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    catPillActive: {
        backgroundColor: '#2D7B38',
        borderColor: '#2D7B38',
    },
    catPillText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#475569',
    },
    catPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    gridCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    cardImgBox: {
        width: '100%',
        height: 110,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cardImg: {
        width: '88%',
        height: '88%',
    },
    cardInfo: {
        width: '100%',
    },
    storeTagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    storeMiniAvatar: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    storeTagPillText: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#15803D',
        maxWidth: 105,
    },
    cardName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
        lineHeight: 18,
        minHeight: 36,
    },
    cardPrice: {
        fontSize: 13,
        fontWeight: '800',
        color: '#2D7B38',
        marginTop: 4,
    },
    loadingBox: {
        paddingVertical: 40,
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    emptyBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        padding: 24,
        alignItems: 'center',
        gap: 8,
        marginVertical: 20,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#334155',
    },
    emptySub: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    resetStoreBtn: {
        backgroundColor: '#2D7B38',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        marginTop: 6,
    },
    resetStoreBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    viewMoreBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    viewMoreBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2D7B38',
    },
});
