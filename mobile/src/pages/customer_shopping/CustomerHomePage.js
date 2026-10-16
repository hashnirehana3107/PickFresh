import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
    ActivityIndicator,
} from 'react-native';
import {
    Store,
    ArrowRight,
    MapPin,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

// Global in-memory cache for instant tab switching without loading delay
let homeDataCache = null;

const DEFAULT_STORES = [];
const DEFAULT_CATEGORIES = [];
const DEFAULT_PRODUCTS = [];

const DEFAULT_BANNER = {
    badge: '⚡ Click & Collect',
    storeName: 'LankaMart',
    title: 'Order Ahead, Skip the Queue',
    subtitle: 'Order online and pick up packed fresh items at the store in minutes.',
    btnText: 'Shop Now',
    active: true,
    bannerBg: '',
};

// Robust helper to resolve image sources from backend strings (base64, URL, or local asset fallback)
function resolveImageSource(rawImg, type = 'product', nameHint = '') {
    if (!rawImg) {
        return getFallbackImage(type, nameHint);
    }
    if (typeof rawImg === 'number') {
        return rawImg;
    }
    if (typeof rawImg === 'string') {
        const trimmed = rawImg.trim();
        if (trimmed.startsWith('data:image') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return { uri: trimmed };
        }
        if (trimmed.includes('banner_bg') || trimmed.includes('fresh_banner')) {
            return require('../../../assets/banner_bg.png');
        }
        if (trimmed.includes('logo')) {
            return require('../../../assets/logo.jpg');
        }
    }
    return getFallbackImage(type, nameHint);
}

function getFallbackImage(type, nameHint = '') {
    const hint = (nameHint || '').toLowerCase();
    if (type === 'banner') {
        return require('../../../assets/banner_bg.png');
    }
    if (type === 'store') {
        if (hint.includes('grocery')) return require('../../../assets/GroceryMart.jpg');
        if (hint.includes('lanka')) return require('../../../assets/logo.jpg');
        return require('../../../assets/GroceryMart.jpg');
    }
    if (type === 'category') {
        if (hint.includes('dairy') || hint.includes('egg') || hint.includes('milk')) return require('../../../assets/diary.jpg');
        if (hint.includes('drink') || hint.includes('bev') || hint.includes('soft')) return require('../../../assets/Beverages.jpg');
        if (hint.includes('snack')) return require('../../../assets/snacks.jpg');
        if (hint.includes('meat') || hint.includes('sea') || hint.includes('fish')) return require('../../../assets/meat.webp');
        if (hint.includes('veg')) return require('../../../assets/cat_veg.png');
        if (hint.includes('fruit')) return require('../../../assets/cat_fruits.png');
        return require('../../../assets/cat_veg.png');
    }
    if (type === 'product') {
        if (hint.includes('butter') || hint.includes('anchor')) return require('../../../assets/Pic117561.jpg');
        if (hint.includes('7 up') || hint.includes('7up')) return require('../../../assets/7 Up Pet Bottle 1L.jpeg');
        if (hint.includes('sprite')) return require('../../../assets/Sprite 1L Bottle.jpg');
        if (hint.includes('coca') || hint.includes('coke')) return require('../../../assets/Coca Cola Pet Bottle 1.05L.jpg');
        if (hint.includes('milk')) return require('../../../assets/highland_milk.png');
        if (hint.includes('chicken') || hint.includes('meat')) return require('../../../assets/meat.webp');
        if (hint.includes('soap') || hint.includes('dove') || hint.includes('lux')) return require('../../../assets/Dove Beauty Cream Soap 100g.jpg');
        return require('../../../assets/fresh_produce_hero.png');
    }
    return require('../../../assets/fresh_produce_hero.png');
}

export default function CustomerHomePage({
    onNavigate,
    onSelectProduct,
    selectedStore,
    onSelectStore,
    addToCart,
    onAddToCart,
}) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [popularStores, setPopularStores] = useState(
        homeDataCache?.stores && homeDataCache.stores.length > 0 ? homeDataCache.stores : []
    );
    const [recommendedProducts, setRecommendedProducts] = useState(
        homeDataCache?.featuredProducts && homeDataCache.featuredProducts.length > 0
            ? homeDataCache.featuredProducts
            : []
    );
    const [popularCategories, setPopularCategories] = useState(
        homeDataCache?.topCategories && homeDataCache.topCategories.length > 0
            ? homeDataCache.topCategories
            : []
    );
    const [isLoading, setIsLoading] = useState(!homeDataCache);

    const [allBanners, setAllBanners] = useState(homeDataCache?.allBanners || [DEFAULT_BANNER]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const bannerTimerRef = useRef(null);
    const storesScrollRef = useRef(null);
    const [storesScrollX, setStoresScrollX] = useState(0);

    const offerBanner = allBanners[currentBannerIndex] || DEFAULT_BANNER;

    // Auto rotate banners every 4 seconds
    useEffect(() => {
        if (allBanners.length <= 1) return;
        bannerTimerRef.current = setInterval(() => {
            setCurrentBannerIndex((prev) => (prev + 1) % allBanners.length);
        }, 4000);
        return () => clearInterval(bannerTimerRef.current);
    }, [allBanners.length]);

    // Fetch real data from MongoDB Atlas Backend
    useEffect(() => {
        const fetchHomeData = async () => {
            if (!homeDataCache) setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/customer-shopping/home`);
                const data = await res.json();
                if (res.ok && data.success) {
                    homeDataCache = data;
                    if (Array.isArray(data.stores)) {
                        setPopularStores(data.stores);
                    }
                    if (Array.isArray(data.featuredProducts)) {
                        setRecommendedProducts(data.featuredProducts);
                    }
                    if (Array.isArray(data.topCategories)) {
                        setPopularCategories(data.topCategories);
                    }
                    if (Array.isArray(data.allBanners) && data.allBanners.length > 0) {
                        setAllBanners(data.allBanners);
                        // If banner with LankaMart exists, set it as active initial banner matching user image
                        const lankaIdx = data.allBanners.findIndex(
                            (b) => (b.title && b.title.includes('Skip the Queue')) || (b.storeName && b.storeName.includes('LankaMart'))
                        );
                        if (lankaIdx > -1) {
                            setCurrentBannerIndex(lankaIdx);
                        } else {
                            setCurrentBannerIndex(0);
                        }
                    } else if (data.activeBanner) {
                        setAllBanners([data.activeBanner]);
                    }
                }
            } catch (err) {
                console.warn('Failed to load customer home data from backend:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    // Also fetch latest products from product-inventory if featuredProducts is empty
    useEffect(() => {
        if (recommendedProducts.length === 0) {
            const fetchProducts = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/product-inventory/products`);
                    const data = await res.json();
                    if (data.success && Array.isArray(data.products) && data.products.length > 0) {
                        setRecommendedProducts(data.products.slice(0, 8));
                    }
                } catch (e) {}
            };
            fetchProducts();
        }
    }, [recommendedProducts.length]);

    // Time-based greeting matching web
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const userName = user?.name ? user.name.split(' ')[0] : 'Guest';

    // Location matching logic strictly matching customer's preferred city
    const doesStoreMatchUserLocation = (store, userLocRaw) => {
        if (!userLocRaw || typeof userLocRaw !== 'string' || !userLocRaw.trim() || userLocRaw.trim().toLowerCase() === 'islandwide') {
            return true;
        }
        const userLoc = userLocRaw.toLowerCase().trim();
        const baseLoc = userLoc.replace(/\([^)]*\)/g, '').trim();
        const parenMatch = userLoc.match(/\(([^)]+)\)/);
        const parenText = parenMatch ? parenMatch[1].toLowerCase().trim() : '';

        const tokens = [userLoc, baseLoc, parenText].filter((t) => t && t.length >= 3);
        baseLoc.split(/\s+/).forEach((w) => {
            if (w.length >= 3 && !/^\d+$/.test(w)) {
                tokens.push(w);
            }
        });

        const uniqueTokens = [...new Set(tokens)];
        const storeHaystack = `${store.location || ''} ${store.storeAddress || ''} ${store.address || ''} ${store.name || ''}`.toLowerCase();

        return uniqueTokens.some((tok) => storeHaystack.includes(tok));
    };

    const hasSpecificLocation = Boolean(
        user?.location &&
        user.location.trim().length > 0 &&
        user.location.trim().toLowerCase() !== 'islandwide'
    );
    const displayLocationName = hasSpecificLocation ? user.location.trim() : 'you';

    const filteredStoresByLocation = popularStores.filter((st) => doesStoreMatchUserLocation(st, user?.location));
    const displayStores = (hasSpecificLocation && filteredStoresByLocation.length > 0) ? filteredStoresByLocation : popularStores;

    // Filter recommended products by store if selected
    const selectedStoreName = selectedStore
        ? (typeof selectedStore === 'string' ? selectedStore : (selectedStore.name || selectedStore.storeName || ''))
        : '';

    const isStoreMatch = (productStore, targetStoreObj) => {
        if (!targetStoreObj) return true;
        const selName = typeof targetStoreObj === 'string' ? targetStoreObj : (targetStoreObj.name || targetStoreObj.storeName || '');
        if (!selName) return true;
        const prodStoreStr = String(productStore || '').toLowerCase().trim();
        const targetStoreStr = selName.toLowerCase().trim();
        if (!prodStoreStr) return true;
        return prodStoreStr.includes(targetStoreStr) || targetStoreStr.includes(prodStoreStr);
    };

    const displayRecommended = recommendedProducts.filter((item) => isStoreMatch(item.storeName, selectedStore));
    const recListToRender = displayRecommended.length > 0 ? displayRecommended : recommendedProducts;

    const scrollStores = (direction) => {
        const offset = direction === 'left' ? Math.max(0, storesScrollX - 220) : storesScrollX + 220;
        storesScrollRef.current?.scrollTo({ x: offset, animated: true });
        setStoresScrollX(offset);
    };

    const handleSearchSubmit = () => {
        if (onNavigate) onNavigate('search', { query: searchQuery });
    };

    const handleCategoryClick = (catName) => {
        setSelectedCategory(catName);
        if (onNavigate) onNavigate('search', { category: catName });
    };

    const handleBannerClick = (banner) => {
        const targetBanner = banner || offerBanner;
        const storeNameFromBanner = targetBanner?.storeName || (popularStores && popularStores.length > 0 ? popularStores[0].name : 'GroceryMart');

        const matchedStore = popularStores.find(
            (s) =>
                (s.name || '').toLowerCase().includes(storeNameFromBanner.toLowerCase()) ||
                storeNameFromBanner.toLowerCase().includes((s.name || '').toLowerCase())
        ) || { name: storeNameFromBanner, storeName: storeNameFromBanner };

        if (onSelectStore) onSelectStore(matchedStore);
        if (onNavigate) onNavigate('search', { store: matchedStore, storeName: storeNameFromBanner });
    };

    if (isLoading && !homeDataCache) {
        return (
            <View style={styles.loadingFullContainer}>
                <ActivityIndicator size="large" color="#2D7B38" />
                <Text style={styles.loadingTitleText}>Loading PickFresh...</Text>
                <Text style={styles.loadingSubText}>Connecting to MongoDB database</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* 1. Greeting Header */}
            <View style={styles.exactGreeting}>
                <Text style={styles.exactGreetingTitle}>
                    {timeGreeting}, {userName}
                </Text>
                <Text style={styles.exactGreetingSub}>Fresh picks ready near you</Text>
            </View>

            {/* 2. Exact Search Bar */}
            <View style={styles.exactSearchForm}>
                <TextInput
                    style={styles.exactSearchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search organic produce, dairy, bakery..."
                    placeholderTextColor="#888888"
                    returnKeyType="search"
                    onSubmitEditing={handleSearchSubmit}
                />
            </View>

            {/* 3. Multi-Store Auto-Rotating Banner Carousel */}
            {offerBanner.active !== false && (
                <View style={styles.bannerContainer}>
                    <TouchableOpacity
                        style={styles.modernBannerCard}
                        onPress={() => handleBannerClick(offerBanner)}
                        activeOpacity={0.9}
                    >
                        <Image
                            source={resolveImageSource(offerBanner.bannerBg, 'banner')}
                            style={styles.modernBannerBg}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['rgba(10, 30, 16, 0.94)', 'rgba(18, 48, 23, 0.8)', 'rgba(0, 0, 0, 0.12)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.modernBannerOverlay}
                        >
                            <View style={styles.bannerTagsRow}>
                                {offerBanner.storeName ? (
                                    <View style={styles.bannerStorePill}>
                                        <Store size={11} color="#FFFFFF" />
                                        <Text style={styles.bannerStorePillText}>{offerBanner.storeName}</Text>
                                    </View>
                                ) : null}
                                <View style={styles.modernBannerBadge}>
                                    <Text style={styles.modernBannerBadgeText}>
                                        {offerBanner.badge || '⚡ Click & Collect'}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.modernBannerTitle}>
                                {offerBanner.title || 'Order Ahead, Skip the Queue'}
                            </Text>
                            <Text style={styles.modernBannerSubtitle}>
                                {offerBanner.subtitle || 'Order online and pick up packed fresh items at the store in minutes.'}
                            </Text>

                            <TouchableOpacity
                                style={styles.modernBannerBtn}
                                onPress={() => handleBannerClick(offerBanner)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modernBannerBtnText}>
                                    {offerBanner.btnText || 'Shop Now'}
                                </Text>
                                <ArrowRight size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Carousel Dot Indicators */}
                    {allBanners.length > 1 && (
                        <View style={styles.carouselDotsRow}>
                            {allBanners.map((_, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => {
                                        if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
                                        setCurrentBannerIndex(idx);
                                    }}
                                    style={[
                                        styles.carouselDot,
                                        idx === currentBannerIndex && styles.carouselDotActive,
                                    ]}
                                    activeOpacity={0.8}
                                />
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* 4. Popular Pickup Stores Section */}
            <View style={styles.exactSection}>
                <View style={styles.sectionHeaderRow}>
                    <View>
                        <Text style={styles.exactSectionTitle}>Popular pickup stores</Text>
                        <Text style={styles.storeCountSub}>
                            {displayStores.length} {displayStores.length === 1 ? 'store' : 'stores'} near {displayLocationName}
                        </Text>
                    </View>
                    <View style={styles.sectionHeaderRight}>
                        <TouchableOpacity onPress={() => onNavigate && onNavigate('stores')}>
                            <Text style={styles.sectionSeeAll}>View all</Text>
                        </TouchableOpacity>
                        <View style={styles.storeScrollArrows}>
                            <TouchableOpacity
                                style={styles.scrollArrowBtn}
                                onPress={() => scrollStores('left')}
                                activeOpacity={0.7}
                            >
                                <ChevronLeft size={16} color="#2D7B38" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.scrollArrowBtn}
                                onPress={() => scrollStores('right')}
                                activeOpacity={0.7}
                            >
                                <ChevronRight size={16} color="#2D7B38" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {displayStores.length > 0 ? (
                    <ScrollView
                        ref={storesScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.popularStoresGrid}
                        onScroll={(e) => setStoresScrollX(e.nativeEvent.contentOffset.x)}
                        scrollEventThrottle={16}
                    >
                        {displayStores.map((st) => {
                            const isSelected = selectedStore?.id === st.id || selectedStore?.name === st.name;
                            const storePic = st.picture || st.profilePicture || st.image || '';

                            return (
                                <TouchableOpacity
                                    key={st.id || st.name}
                                    style={[styles.storeCard, isSelected && styles.storeCardActive]}
                                    onPress={() => {
                                        if (onSelectStore) onSelectStore(st);
                                        if (onNavigate) onNavigate('search');
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.storeCardTop}>
                                        <View style={[styles.storeAvatar, isSelected && styles.storeAvatarActive]}>
                                            {storePic ? (
                                                <Image
                                                    source={resolveImageSource(storePic, 'store', st.name)}
                                                    style={styles.storeAvatarImg}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Store size={18} color="#2D7B38" />
                                            )}
                                        </View>
                                    </View>
                                    <Text style={styles.storeCardName} numberOfLines={1}>
                                        {st.name}
                                    </Text>
                                    <Text style={styles.storeCardAddress} numberOfLines={1}>
                                        {st.address || st.location || 'Local store'}
                                    </Text>
                                    <View style={styles.storeCardFooter}>
                                        <Text style={styles.storeStatusText}>
                                            {st.storeStatus === 'closed' ? 'Closed' : (st.status || 'Open • Pick up in 30m')}
                                        </Text>
                                        <View style={styles.storeSelectBtnWrap}>
                                            <Text style={styles.storeSelectBtn}>Shop →</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <View style={styles.emptyStoresCard}>
                        <MapPin size={28} color="#2D7B38" />
                        <Text style={styles.emptyStoresTitle}>
                            No pickup stores found near {displayLocationName}
                        </Text>
                        <Text style={styles.emptyStoresSub}>
                            We don't have registered partner stores in {displayLocationName} yet.
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyStoresBtn}
                            onPress={() => onNavigate && onNavigate('stores')}
                        >
                            <Text style={styles.emptyStoresBtnText}>View All Stores</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* 5. Popular Categories Section (Strictly Max 4 Categories) */}
            <View style={styles.exactSection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.exactSectionTitle}>Popular categories</Text>
                    <TouchableOpacity onPress={() => onNavigate && onNavigate('search', { category: 'All' })}>
                        <Text style={styles.sectionSeeAll}>See all</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.richCategoriesGrid}>
                    {popularCategories.slice(0, 4).map((cat) => {
                        const isSelected = selectedCategory === cat.name;
                        return (
                            <TouchableOpacity
                                key={cat.id || cat.name}
                                style={[styles.richCatCard, isSelected && styles.richCatCardActive]}
                                onPress={() => handleCategoryClick(cat.name)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.richCatIcon}>
                                    <Image
                                        source={resolveImageSource(cat.image, 'category', cat.name)}
                                        style={styles.richCatImg}
                                        resizeMode="cover"
                                    />
                                </View>
                                <View style={styles.richCatInfo}>
                                    <Text style={styles.richCatName}>
                                        {cat.name}
                                    </Text>
                                    <Text style={styles.richCatCount}>{cat.items || '5 items'}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* 6. Recommended For You Section - Filtered by Store */}
            <View style={styles.exactSection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.exactSectionTitle}>
                        {selectedStoreName ? `Recommended from ${selectedStoreName}` : 'Recommended for you'}
                    </Text>
                </View>

                <View style={styles.recProductsList}>
                    {recListToRender.slice(0, 4).map((item) => {
                        const isOutOfStock = (item.stock !== undefined && item.stock <= 0);
                        const itemImg = item.image || item.imageUrl || '';
                        const targetStoreName = item.storeName || selectedStoreName || 'PickFresh Super';
                        const matchedStore = popularStores.find(
                            (s) =>
                                (s.name && targetStoreName && s.name.toLowerCase().trim() === targetStoreName.toLowerCase().trim()) ||
                                (s.name && targetStoreName && (s.name.toLowerCase().includes(targetStoreName.toLowerCase()) || targetStoreName.toLowerCase().includes(s.name.toLowerCase())))
                        );
                        const storePic = matchedStore?.picture || matchedStore?.profilePicture || matchedStore?.image || item.storePicture || item.storeImage || '';

                        return (
                            <TouchableOpacity
                                key={item._id || item.id || item.name}
                                style={styles.image2ProductCard}
                                onPress={() => onSelectProduct && onSelectProduct(item)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.productCardThumbWrapper}>
                                    <Image
                                        source={resolveImageSource(itemImg, 'product', item.name)}
                                        style={styles.productCardThumbImg}
                                        resizeMode="cover"
                                    />
                                </View>
                                <View style={styles.productCardDetails}>
                                    <Text style={styles.productCardTitle} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.exactRecPrice}>
                                        Rs. {item.price} / {(!item.unit || item.unit === 'item') ? '1kg' : item.unit}
                                    </Text>
                                    <View style={styles.productBadgesRow}>
                                        <View style={[styles.inStockBadge, isOutOfStock && styles.outStockBadge]}>
                                            <Text style={[styles.inStockBadgeText, isOutOfStock && styles.outStockBadgeText]}>
                                                {isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}
                                            </Text>
                                        </View>
                                        {item.brand ? (
                                            <View style={styles.brandBadge}>
                                                <Text style={styles.brandBadgeText}>{item.brand}</Text>
                                            </View>
                                        ) : null}
                                        <View style={styles.productStoreTagGroup}>
                                            <View style={styles.productStoreMiniAvatar}>
                                                <Image
                                                    source={resolveImageSource(storePic, 'store', targetStoreName)}
                                                    style={styles.productStoreMiniAvatarImg}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                            <Text style={styles.storeNameBadgeText} numberOfLines={1}>
                                                {targetStoreName}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* 7. View Products CTA Button Matching Web & Image */}
            <View style={styles.exactCtaContainer}>
                <TouchableOpacity
                    style={styles.exactViewBtn}
                    onPress={() => onNavigate && onNavigate('search')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.exactViewBtnText}>View Products</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F5',
    },
    loadingFullContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#FAF9F5',
        minHeight: 400,
    },
    loadingTitleText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 14,
    },
    loadingSubText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'android' ? 44 : 24,
        gap: 20,
    },

    // 1. Greeting
    exactGreeting: {
        flexDirection: 'column',
        gap: 4,
    },
    exactGreetingTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.5,
    },
    exactGreetingSub: {
        fontSize: 13,
        color: '#666666',
        fontWeight: '400',
    },

    // 2. Search Bar
    exactSearchForm: {
        width: '100%',
    },
    exactSearchInput: {
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        fontSize: 14,
        color: '#222222',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },

    // 3. Hero Banner
    bannerContainer: {
        position: 'relative',
        width: '100%',
    },
    modernBannerCard: {
        width: '100%',
        height: 172,
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 28,
        elevation: 6,
    },
    modernBannerBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    modernBannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        paddingVertical: 18,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 4,
    },
    bannerTagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    bannerStorePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    bannerStorePillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
    modernBannerBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    modernBannerBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    modernBannerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.4,
        lineHeight: 23,
        marginTop: 2,
        marginBottom: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    modernBannerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.92)',
        fontWeight: '500',
        marginBottom: 6,
        lineHeight: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    modernBannerBtn: {
        backgroundColor: '#27672D',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 3,
    },
    modernBannerBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    carouselDotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 8,
    },
    carouselDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#CBD5E1',
    },
    carouselDotActive: {
        width: 20,
        backgroundColor: '#2D7B38',
    },

    // 4. Section Common
    exactSection: {
        flexDirection: 'column',
        gap: 12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exactSectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.3,
    },
    storeCountSub: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2D7B38',
        marginTop: 2,
    },
    sectionHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionSeeAll: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2D7B38',
    },
    storeScrollArrows: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    scrollArrowBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
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

    // Popular Pickup Stores
    popularStoresGrid: {
        gap: 12,
        paddingBottom: 4,
    },
    storeCard: {
        width: 210,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        flexDirection: 'column',
        gap: 6,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    storeCardActive: {
        borderColor: '#2D7B38',
        backgroundColor: '#F4FBF5',
    },
    storeCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    storeAvatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    storeAvatarActive: {
        backgroundColor: '#DCFCE7',
    },
    storeAvatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    storeCardName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
        lineHeight: 16,
        marginTop: 2,
    },
    storeCardAddress: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    storeCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    storeStatusText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#059669',
    },
    storeSelectBtnWrap: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    storeSelectBtn: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
    },
    emptyStoresCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
    },
    emptyStoresTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
    },
    emptyStoresSub: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    emptyStoresBtn: {
        marginTop: 4,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#2D7B38',
        borderRadius: 10,
    },
    emptyStoresBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },

    // 5. Popular Categories
    richCategoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    richCatCard: {
        width: '48.5%',
        minHeight: 64,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    richCatCardActive: {
        borderColor: '#2D7B38',
        backgroundColor: '#F4FBF5',
    },
    richCatIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        flexShrink: 0,
    },
    richCatImg: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
    },
    richCatInfo: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
    },
    richCatName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
        lineHeight: 16,
    },
    richCatCount: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },

    // 6. Recommended For You (Image 2 Horizontal Card)
    recProductsList: {
        flexDirection: 'column',
        gap: 10,
    },
    image2ProductCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    productCardThumbWrapper: {
        width: 65,
        height: 65,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productCardThumbImg: {
        width: '100%',
        height: '100%',
    },
    productCardDetails: {
        flex: 1,
        flexDirection: 'column',
        gap: 4,
    },
    productCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    exactRecPrice: {
        color: '#2D7B38',
        fontWeight: '800',
        fontSize: 15,
    },
    productBadgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        flexWrap: 'wrap',
    },
    inStockBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    outStockBadge: {
        backgroundColor: '#FEE2E2',
    },
    inStockBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#166534',
    },
    outStockBadgeText: {
        color: '#991B1B',
    },
    brandBadge: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    brandBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#15803D',
    },
    productStoreTagGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    productStoreMiniAvatar: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productStoreMiniAvatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 7.5,
    },
    storeNameBadgeText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },

    // 7. View Products CTA
    exactCtaContainer: {
        justifyContent: 'center',
        marginTop: 6,
        marginBottom: 8,
    },
    exactViewBtn: {
        width: '100%',
        paddingVertical: 14,
        backgroundColor: '#2D7B38',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
        elevation: 3,
    },
    exactViewBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
