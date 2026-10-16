import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Image,
    Alert,
    Animated,
    Easing,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Plus,
    Edit3,
    Trash2,
    RefreshCw,
    Store,
    Package,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import DeleteProductModal from './DeleteProductModal';

export default function ProductListPage({ onNavigate, initialFilter, initialParams, onProductsUpdated }) {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(initialFilter || 'All');
    const [products, setProducts] = useState(initialParams?.newProduct ? [initialParams.newProduct] : []);
    const [categories, setCategories] = useState(['All', 'Low Stock', 'Dairy & Eggs', 'Vegetables', 'Fruits', 'Meat & Seafood', 'Bakery', 'Beverages']);
    const [isLoading, setIsLoading] = useState(!initialParams?.newProduct);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deletingProduct, setDeletingProduct] = useState(null);
    const catScrollRef = useRef(null);
    const catScrollX = useRef(0);
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

    const scrollCategories = (direction) => {
        const step = direction === 'left' ? -130 : 130;
        const targetX = Math.max(0, catScrollX.current + step);
        catScrollRef.current?.scrollTo({ x: targetX, animated: true });
        catScrollX.current = targetX;
    };

    const storeTitle = user?.shopName || user?.storeName || user?.name || 'GroceryMart';

    const fetchProducts = async (isManual = false) => {
        try {
            const email = user?.email || 'grocerymart@gmail.com';
            const refreshParam = isManual ? '&refresh=true' : '';
            const endpoint = `${API_BASE_URL}/product-inventory/products?storeEmail=${encodeURIComponent(
                email
            )}&storeName=${encodeURIComponent(storeTitle)}${refreshParam}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.products)) {
                setProducts(data.products);
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    AsyncStorage.setItem('@pickfresh_products_cache', JSON.stringify(data.products)).catch(() => {});
                } catch (e) {}
            }
        } catch (err) {
            console.warn('Failed to fetch products:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/product-inventory/categories`);
            const data = await res.json();
            if (data.success && Array.isArray(data.categories)) {
                const names = data.categories
                    .map((c) => (typeof c === 'string' ? c : c.name))
                    .filter(Boolean);
                setCategories(Array.from(new Set(['All', 'Low Stock', ...names])));
            }
        } catch (err) {}
    };

    // Instantly hydrate cached real products on startup (0ms)
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const cachedRaw = await AsyncStorage.getItem('@pickfresh_products_cache');
                if (cachedRaw && isMounted) {
                    const parsed = JSON.parse(cachedRaw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setProducts((prev) => (prev.length === 0 ? parsed : prev));
                        setIsLoading(false);
                    }
                }
            } catch (e) {}
        })();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [user?.email]);

    useEffect(() => {
        if (initialFilter) {
            setSelectedCategory(initialFilter);
        }
    }, [initialFilter]);

    useEffect(() => {
        if (!initialParams) return;

        if (initialParams.newProduct) {
            setProducts((prev) => {
                const idStr = String(initialParams.newProduct.id || initialParams.newProduct._id);
                const filtered = prev.filter((p) => String(p.id || p._id) !== idStr);
                return [initialParams.newProduct, ...filtered];
            });
            fetchProducts(true);
            if (onProductsUpdated) onProductsUpdated();
        } else if (initialParams.updatedProduct) {
            setProducts((prev) => {
                const idStr = String(initialParams.updatedProduct.id || initialParams.updatedProduct._id);
                return prev.map((p) => (String(p.id || p._id) === idStr ? { ...p, ...initialParams.updatedProduct } : p));
            });
            fetchProducts(true);
            if (onProductsUpdated) onProductsUpdated();
        } else if (initialParams.deletedProductId) {
            setProducts((prev) => {
                const idStr = String(initialParams.deletedProductId);
                return prev.filter((p) => String(p.id || p._id) !== idStr);
            });
            fetchProducts(true);
            if (onProductsUpdated) onProductsUpdated();
        } else if (initialParams.refresh) {
            fetchProducts(true);
            if (onProductsUpdated) onProductsUpdated();
        }
    }, [initialParams]);

    const handleManualRefresh = () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        startSpin();
        Promise.all([fetchProducts(true), fetchCategories()]).finally(() => {
            setTimeout(() => {
                stopSpin();
                setIsRefreshing(false);
            }, 600);
        });
    };

    const handleConfirmDelete = async (productId) => {
        const idStr = String(productId);
        // Optimistic UI update: immediately remove from view
        setProducts((prev) => prev.filter((p) => String(p.id || p._id) !== idStr));
        setDeletingProduct(null);
        if (onProductsUpdated) onProductsUpdated();

        try {
            const res = await fetch(`${API_BASE_URL}/product-inventory/products/${idStr}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                if (onProductsUpdated) onProductsUpdated();
            } else {
                fetchProducts(true);
                Alert.alert('Error', data.message || 'Failed to delete product.');
            }
        } catch (e) {
            fetchProducts(true);
            Alert.alert('Error', 'Network error while deleting product.');
        }
    };

    const filteredProducts = products.filter((p) => {
        const storeNameStr = p.storeName || storeTitle;
        const matchesSearch =
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            storeNameStr.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (selectedCategory === 'All') return true;
        if (selectedCategory === 'Low Stock') {
            const stock = p.stock !== undefined ? p.stock : (p.stockQuantity ?? 0);
            const threshold = p.minStock || p.lowStockThreshold || 10;
            return stock <= threshold;
        }
        return (p.category || '').toLowerCase().trim() === selectedCategory.toLowerCase().trim();
    });

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
                {/* Title & Top Action Row matching React Web screenshot */}
                <View style={styles.titleRow}>
                    <Text style={styles.pageTitle}>Products</Text>

                    <View style={styles.headerControls}>
                        {/* Refresh Icon Button */}
                        <TouchableOpacity
                            style={styles.refreshBtn}
                            onPress={handleManualRefresh}
                            disabled={isRefreshing}
                            activeOpacity={0.7}
                        >
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <RefreshCw size={17} color="#334155" />
                            </Animated.View>
                        </TouchableOpacity>

                        {/* Top "+ Add Product" Quick Action Button */}
                        <TouchableOpacity
                            style={styles.addProductBtn}
                            onPress={() => onNavigate && onNavigate('add_product')}
                        >
                            <Plus size={16} color="#FFFFFF" />
                            <Text style={styles.addProductBtnText}>Add Product</Text>
                        </TouchableOpacity>

                        {/* Back Arrow Button on Right */}
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => onNavigate && onNavigate('home')}
                        >
                            <ArrowLeft size={20} color="#0F172A" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Input Box */}
                <View style={styles.searchWrapper}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products..."
                        placeholderTextColor="#94A3B8"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>

                {/* Category Filter Pills Bar with Scroll Controls matching Image 4 */}
                <View style={styles.catWrapper}>
                    <TouchableOpacity
                        style={styles.catArrowBtn}
                        onPress={() => scrollCategories('left')}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={16} color="#64748B" />
                    </TouchableOpacity>

                    <ScrollView
                        ref={catScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.catScrollContent}
                        onScroll={(e) => {
                            catScrollX.current = e.nativeEvent.contentOffset.x;
                        }}
                        scrollEventThrottle={16}
                    >
                        {categories.map((cat, idx) => {
                            const catName = typeof cat === 'string' ? cat : cat?.name || '';
                            if (!catName) return null;
                            const isActive = selectedCategory === catName;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.catPill, isActive && styles.catPillActive]}
                                    onPress={() => setSelectedCategory(catName)}
                                >
                                    <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                                        {catName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.catArrowBtn}
                        onPress={() => scrollCategories('right')}
                        activeOpacity={0.7}
                    >
                        <ChevronRight size={16} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Product Cards Stack */}
                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#166534" />
                        <Text style={styles.loadingText}>Loading your products...</Text>
                    </View>
                ) : filteredProducts.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Package size={44} color="#94A3B8" />
                        <Text style={styles.emptyTitle}>No products found</Text>
                        <Text style={styles.emptySub}>
                            No products match "{selectedCategory !== 'All' ? selectedCategory : searchTerm}". Try a different filter or search term.
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyResetBtn}
                            onPress={() => {
                                setSelectedCategory('All');
                                setSearchTerm('');
                            }}
                        >
                            <Text style={styles.emptyResetText}>Show All Products</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.cardsStack}>
                        {filteredProducts.map((product) => {
                            const pId = product.id || product._id;
                            const stock = product.stock !== undefined ? product.stock : (product.stockQuantity ?? 0);
                            const minStockVal = product.minStock || product.lowStockThreshold || 10;
                            const isOutOfStock = stock <= 0;
                            const isLowStock = !isOutOfStock && stock <= minStockVal;

                            let statusLabel = 'In Stock';
                            let badgeStyle = styles.badgeInStock;
                            let badgeTextStyle = styles.badgeTextInStock;

                            if (isOutOfStock) {
                                statusLabel = 'Out of Stock';
                                badgeStyle = styles.badgeOutStock;
                                badgeTextStyle = styles.badgeTextOutStock;
                            } else if (isLowStock) {
                                statusLabel = 'Low Stock';
                                badgeStyle = styles.badgeLowStock;
                                badgeTextStyle = styles.badgeTextLowStock;
                            }

                            let badgeText = statusLabel;
                            if (stock > 0) {
                                const unitStr = String(product.unit || '1kg').toLowerCase();
                                if (unitStr.includes('pack')) {
                                    badgeText = `${statusLabel} • ${stock} pack`;
                                } else if (unitStr.includes('kg')) {
                                    badgeText = `${statusLabel} • ${stock} kg`;
                                } else {
                                    badgeText = `${statusLabel} • ${stock} ${product.unit || 'items'}`;
                                }
                            }

                            return (
                                <View key={pId} style={styles.productCard}>
                                    {/* Thumbnail Image */}
                                    <View style={styles.cardImgWrap}>
                                        {product.image ? (
                                            <Image
                                                source={{ uri: product.image }}
                                                style={styles.cardImg}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.cardFallbackWrap}>
                                                <Package size={24} color="#166534" />
                                            </View>
                                        )}
                                    </View>

                                    {/* Card Body */}
                                    <View style={styles.cardBody}>
                                        <View>
                                            {/* Header Row: Title & Price */}
                                            <View style={styles.cardTitleRow}>
                                                <Text style={styles.cardTitle} numberOfLines={2}>
                                                    {product.name}
                                                </Text>
                                                <Text style={styles.cardPrice}>
                                                    Rs. {Number(product.price).toLocaleString()}
                                                    <Text style={styles.cardUnit}>
                                                        {' '}/ {(!product.unit || product.unit === 'item') ? 'pack' : product.unit}
                                                    </Text>
                                                </Text>
                                            </View>

                                            {/* Brand & Store Name */}
                                            <View style={styles.cardMetaRow}>
                                                {product.brand ? (
                                                    <View style={styles.brandChip}>
                                                        <Text style={styles.brandChipText}>{product.brand}</Text>
                                                    </View>
                                                ) : null}
                                                {(() => {
                                                    const storePicUri =
                                                        product.storeIcon ||
                                                        (product.ownerEmail === user?.email || !product.ownerEmail
                                                            ? user?.storeLogo || user?.picture || user?.avatar || user?.profilePicture
                                                            : null) ||
                                                        user?.storeLogo ||
                                                        user?.picture ||
                                                        user?.avatar ||
                                                        user?.profilePicture;

                                                    return (
                                                        <View style={styles.storeChip}>
                                                            {storePicUri ? (
                                                                <Image
                                                                    source={{ uri: storePicUri }}
                                                                    style={styles.storeAvatarImg}
                                                                    resizeMode="cover"
                                                                />
                                                            ) : (
                                                                <Store size={12} color="#166534" />
                                                            )}
                                                            <Text style={styles.storeNameText}>
                                                                {product.storeName || storeTitle}
                                                            </Text>
                                                        </View>
                                                    );
                                                })()}
                                            </View>
                                        </View>

                                        {/* Bottom Row: Stock Badge (Left) & Actions (Right) */}
                                        <View style={styles.cardBottomRow}>
                                            <View style={[styles.stockBadge, badgeStyle]}>
                                                <Text style={[styles.stockBadgeText, badgeTextStyle]}>
                                                    {badgeText}
                                                </Text>
                                            </View>

                                            <View style={styles.actionsRow}>
                                                <TouchableOpacity
                                                    style={styles.editBtn}
                                                    onPress={() =>
                                                        onNavigate && onNavigate('edit_product', { product })
                                                    }
                                                >
                                                    <Edit3 size={12} color="#2563EB" />
                                                    <Text style={styles.editBtnText}>Edit</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.deleteBtn}
                                                    onPress={() => setDeletingProduct(product)}
                                                >
                                                    <Trash2 size={12} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Custom Delete Product Confirmation Modal matching React Web */}
            <DeleteProductModal
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                onConfirm={handleConfirmDelete}
                product={deletingProduct}
            />
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
        paddingTop: 14,
        paddingBottom: Platform.OS === 'android' ? 50 : 24,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    refreshBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addProductBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#166534',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    addProductBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
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
    },
    searchWrapper: {
        marginBottom: 12,
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0F172A',
    },
    catWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 6,
    },
    catArrowBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    catScrollContent: {
        gap: 8,
        paddingHorizontal: 2,
    },
    catPill: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
    },
    catPillActive: {
        backgroundColor: '#166534',
        borderColor: '#166534',
    },
    catPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    catPillTextActive: {
        color: '#FFFFFF',
    },
    cardsStack: {
        gap: 12,
    },
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        flexDirection: 'row',
        gap: 12,
    },
    cardImgWrap: {
        width: 62,
        height: 62,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardImg: {
        width: '100%',
        height: '100%',
    },
    cardFallbackWrap: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBody: {
        flex: 1,
        justifyContent: 'space-between',
    },
    cardTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    cardTitle: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#0F172A',
        flex: 1,
        lineHeight: 18,
    },
    cardPrice: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#166534',
    },
    cardUnit: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    brandChip: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#DCFCE7',
        borderRadius: 5,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    brandChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#15803D',
    },
    storeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    storeAvatarImg: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    storeNameText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    cardBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    stockBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    badgeInStock: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    badgeLowStock: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
    },
    badgeOutStock: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
    },
    stockBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    badgeTextInStock: {
        color: '#166534',
    },
    badgeTextLowStock: {
        color: '#B45309',
    },
    badgeTextOutStock: {
        color: '#DC2626',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 4,
    },
    editBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563EB',
    },
    deleteBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingWrap: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    emptyWrap: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#FDE68A',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#92400E',
    },
    emptySub: {
        fontSize: 12,
        color: '#B45309',
        textAlign: 'center',
        lineHeight: 18,
    },
    emptyResetBtn: {
        marginTop: 6,
        backgroundColor: '#D97706',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    emptyResetText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
});
