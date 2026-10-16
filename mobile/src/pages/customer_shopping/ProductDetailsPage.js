import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Plus,
    Minus,
    Store,
    ShoppingBag,
    Sparkles,
    Tag,
} from 'lucide-react-native';
import { API_BASE_URL } from '../../config/api';

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

function resolveStoreProfilePic(storeName, rawPic) {
    if (typeof rawPic === 'string' && (rawPic.startsWith('data:image') || rawPic.startsWith('http://') || rawPic.startsWith('https://'))) {
        return { uri: rawPic };
    }
    const nameLower = (storeName || '').toLowerCase().replace(/\s+/g, '');
    if (nameLower.includes('grocery')) {
        return require('../../../assets/GroceryMart.jpg');
    }
    if (nameLower.includes('lanka')) {
        return require('../../../assets/logo.jpg');
    }
    return require('../../../assets/GroceryMart.jpg');
}

export default function ProductDetailsPage({
    product,
    onNavigate,
    onAddToCart,
    addToCart,
    selectedStore,
}) {
    const [quantity, setQuantity] = useState(1);
    const [selectedPortion, setSelectedPortion] = useState('1kg');
    const [storePicture, setStorePicture] = useState(selectedStore?.picture || selectedStore?.image || null);

    const activeProduct = product || {
        id: 'p0',
        name: 'Fresh Red Tomatoes',
        brand: 'Lanka Mart',
        category: 'Vegetables',
        price: 340,
        unit: '1kg',
        available: 100,
        stock: 50,
    };

    const storeDisplayName = selectedStore
        ? (selectedStore.name ? selectedStore.name.split(' - ')[0] : String(selectedStore))
        : (activeProduct?.storeName || 'PickFresh Super');

    // Resolve store profile picture
    useEffect(() => {
        if (selectedStore?.picture || selectedStore?.image) {
            setStorePicture(selectedStore.picture || selectedStore.image);
            return;
        }

        const fetchStoreProfile = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/customer-shopping/stores`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.stores)) {
                    const match = data.stores.find((st) =>
                        st.name.toLowerCase().includes(storeDisplayName.toLowerCase()) ||
                        storeDisplayName.toLowerCase().includes(st.name.toLowerCase())
                    );
                    if (match && match.picture) {
                        setStorePicture(match.picture);
                    }
                }
            } catch (err) { }
        };
        fetchStoreProfile();
    }, [selectedStore, storeDisplayName]);

    const catLower = String(activeProduct?.category || '').toLowerCase().trim();
    const isWeightedProduct = (
        catLower.includes('vegetable') ||
        catLower.includes('fruit') ||
        catLower.includes('produce')
    );

    let portionMultiplier = 1;
    if (isWeightedProduct) {
        if (selectedPortion === '250g') portionMultiplier = 0.25;
        else if (selectedPortion === '500g') portionMultiplier = 0.5;
        else if (selectedPortion === '1kg') portionMultiplier = 1.0;
    }

    const basePrice = Number(activeProduct?.price) || 340;
    const finalPrice = isWeightedProduct ? Math.round(basePrice * portionMultiplier) : basePrice;
    const displayUnit = isWeightedProduct ? selectedPortion : (activeProduct?.unit || 'Item');

    const lowThreshold = activeProduct?.lowStockThreshold || activeProduct?.minStock || 10;
    const stockCount = activeProduct?.stock !== undefined ? activeProduct.stock : (activeProduct?.available !== undefined ? activeProduct.available : 50);
    const isOutOfStock = stockCount <= 0;
    const isLowStock = stockCount > 0 && stockCount <= lowThreshold;

    const handleAddToCart = () => {
        const addFn = onAddToCart || addToCart;
        if (addFn && activeProduct) {
            addFn({
                ...activeProduct,
                name: isWeightedProduct ? `${activeProduct.name || 'Product'} (${selectedPortion})` : (activeProduct.name || 'Product'),
                price: finalPrice,
                unit: displayUnit,
                stock: stockCount,
                lowStockThreshold: lowThreshold,
                isLowStock: isLowStock || quantity > stockCount,
            }, quantity);
        }
        if (onNavigate) {
            onNavigate('cart');
        }
    };

    const category = activeProduct?.category || 'Grocery';

    let productBrand = activeProduct?.brand ? String(activeProduct.brand).trim() : '';
    if (!productBrand && activeProduct?.name) {
        const nameStr = String(activeProduct.name).trim();
        const firstWord = nameStr.split(' ')[0];
        const knownBrands = [
            'cic', 'dove', 'highland', 'munchee', 'maliban', 'anchor', 'kist',
            'prima', 'kotmale', 'pelwatte', 'cbl', 'harischandra', 'wijeya',
            'mcfoil', 'dilmah', 'watawala', 'zesta', 'lipton', 'nestle', 'milo',
            'maggi', 'coca-cola', 'sprite', 'fanta', 'pepsi', 'dettol', 'lux', 'sunsilk'
        ];
        if (firstWord && knownBrands.includes(firstWord.toLowerCase())) {
            productBrand = firstWord;
        } else if (nameStr.toLowerCase().startsWith('elephant house')) {
            productBrand = 'Elephant House';
        }
    }

    const hasBrand = Boolean(
        productBrand &&
        productBrand.toLowerCase() !== 'undefined' &&
        productBrand.toLowerCase() !== 'null' &&
        productBrand.toLowerCase() !== storeDisplayName.toLowerCase()
    );

    const imageSource = resolveProductImage(activeProduct);

    return (
        <View style={styles.container}>
            {/* Page Header Titles */}
            <View style={styles.headerRow}>
                <View style={styles.titleCol}>
                    <Text style={styles.mainTitle}>Product details</Text>
                    <Text style={styles.mainSub} numberOfLines={1}>{storeDisplayName}</Text>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('search')}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Product Image Card */}
                <View style={styles.heroImageCard}>
                    {/* Stock Pill */}
                    <View
                        style={[
                            styles.stockPill,
                            isOutOfStock
                                ? styles.stockPillOut
                                : isLowStock
                                    ? styles.stockPillLow
                                    : styles.stockPillIn,
                        ]}
                    >
                        <View
                            style={[
                                styles.stockDot,
                                isOutOfStock
                                    ? styles.stockDotOut
                                    : isLowStock
                                        ? styles.stockDotLow
                                        : styles.stockDotIn,
                            ]}
                        />
                        <Text
                            style={[
                                styles.stockPillText,
                                isOutOfStock
                                    ? styles.stockTextOut
                                    : isLowStock
                                        ? styles.stockTextLow
                                        : styles.stockTextIn,
                            ]}
                        >
                            {isOutOfStock
                                ? 'OUT OF STOCK'
                                : isLowStock
                                    ? `LOW STOCK (${stockCount} LEFT)`
                                    : 'IN STOCK'}
                        </Text>
                    </View>

                    <Image
                        source={imageSource}
                        style={styles.heroImg}
                        resizeMode="contain"
                    />
                </View>

                {/* Main Details Card */}
                <View style={styles.detailsCard}>
                    {/* Tag Row */}
                    <View style={styles.tagRow}>
                        {hasBrand && (
                            <View style={styles.brandChip}>
                                <Tag size={12} color="#B45309" />
                                <Text style={styles.brandChipText}>{productBrand}</Text>
                            </View>
                        )}
                        <View style={styles.categoryChip}>
                            <Text style={styles.categoryChipText}>{category}</Text>
                        </View>
                        <View style={styles.storeChip}>
                            {(() => {
                                const storePicSrc = resolveStoreProfilePic(storeDisplayName, storePicture);
                                return storePicSrc ? (
                                    <Image
                                        source={storePicSrc}
                                        style={styles.storeMiniPic}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Store size={12} color="#2D7B38" />
                                );
                            })()}
                            <Text style={styles.storeChipText} numberOfLines={1}>
                                {storeDisplayName}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.productName}>{activeProduct.name}</Text>

                    {/* Price Row */}
                    <View style={styles.priceRow}>
                        <View style={styles.priceMain}>
                            <Text style={styles.currency}>Rs.</Text>
                            <Text style={styles.amount}>{finalPrice}</Text>
                            <Text style={styles.portionLabel}>/ {displayUnit}</Text>
                        </View>
                        {isWeightedProduct && selectedPortion !== '1kg' && (
                            <Text style={styles.originalUnitPrice}>
                                (Base: Rs. {basePrice}/1kg)
                            </Text>
                        )}
                    </View>

                    {/* Portion Selector Grid (ONLY for Weighted / Produce items) */}
                    {isWeightedProduct && (
                        <View style={styles.portionSection}>
                            <Text style={styles.sectionLabel}>Select Portion / Weight:</Text>
                            <View style={styles.portionGrid}>
                                {['250g', '500g', '1kg'].map((portion) => {
                                    const isSel = selectedPortion === portion;
                                    return (
                                        <TouchableOpacity
                                            key={portion}
                                            style={[styles.portionBtn, isSel && styles.portionBtnActive]}
                                            onPress={() => setSelectedPortion(portion)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.portionText, isSel && styles.portionTextActive]}>
                                                {portion}
                                            </Text>
                                            {isSel && <Text style={styles.activeCheck}> ✓</Text>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Quantity Selector Section */}
                    <View style={styles.quantitySection}>
                        <Text style={styles.sectionLabel}>Quantity:</Text>
                        <View style={styles.qtyControlBox}>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={quantity <= 1}
                                activeOpacity={0.7}
                            >
                                <Minus
                                    size={16}
                                    strokeWidth={2.5}
                                    color={quantity <= 1 ? '#94A3B8' : '#1E293B'}
                                />
                            </TouchableOpacity>
                            <Text style={styles.qtyNumber}>{quantity}</Text>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => setQuantity(quantity + 1)}
                                activeOpacity={0.7}
                            >
                                <Plus size={16} strokeWidth={2.5} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Low Stock / Smart Replacement Alert Banner */}
                    {(isLowStock || quantity > stockCount) && (
                        <View
                            style={[
                                styles.smartAlertBanner,
                                quantity > stockCount
                                    ? styles.smartAlertRed
                                    : styles.smartAlertAmber,
                            ]}
                        >
                            <Sparkles
                                size={16}
                                color={quantity > stockCount ? '#DC2626' : '#B45309'}
                            />
                            <Text
                                style={[
                                    styles.smartAlertText,
                                    { color: quantity > stockCount ? '#991B1B' : '#B45309' },
                                ]}
                            >
                                {quantity > stockCount
                                    ? `Stock limit: Only ${stockCount} available in store. Adding to cart will trigger Smart Replacement for remaining items!`
                                    : `Low stock item (${stockCount} left). Smart Substitution available if stock runs out.`}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Fixed Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={handleAddToCart}
                    activeOpacity={0.85}
                >
                    <ShoppingBag size={18} color="#FFFFFF" />
                    <Text style={styles.addToCartBtnText}>
                        Add {quantity} to cart • Rs. {finalPrice * quantity}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F5',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        zIndex: 10,
    },
    titleCol: {
        flex: 1,
        gap: 2,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    mainSub: {
        fontSize: 13,
        color: '#64748B',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'android' ? 124 : 100,
    },
    heroImageCard: {
        width: '100%',
        height: 220,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    heroImg: {
        width: '90%',
        height: 180,
    },
    stockPill: {
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
    },
    stockPillIn: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
    },
    stockPillLow: {
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    stockPillOut: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    stockDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    stockDotIn: {
        backgroundColor: '#22C55E',
    },
    stockDotLow: {
        backgroundColor: '#F59E0B',
    },
    stockDotOut: {
        backgroundColor: '#EF4444',
    },
    stockPillText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    stockTextIn: {
        color: '#166534',
    },
    stockTextLow: {
        color: '#92400E',
    },
    stockTextOut: {
        color: '#991B1B',
    },
    detailsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        gap: 6,
        marginBottom: 10,
    },
    brandChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3.5,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        flexShrink: 0,
    },
    brandChipText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#B45309',
    },
    categoryChip: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 10,
        flexShrink: 0,
    },
    categoryChipText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2D7B38',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    storeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexShrink: 1,
    },
    storeMiniPic: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    storeChipText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#475569',
        maxWidth: 120,
    },
    productName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.4,
        marginBottom: 10,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    priceMain: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    currency: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2D7B38',
    },
    amount: {
        fontSize: 26,
        fontWeight: '800',
        color: '#2D7B38',
        marginLeft: 2,
    },
    portionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginLeft: 4,
    },
    originalUnitPrice: {
        fontSize: 12,
        color: '#94A3B8',
    },
    portionSection: {
        marginBottom: 18,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
    },
    portionGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    portionBtn: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    portionBtnActive: {
        backgroundColor: '#F0FDF4',
        borderColor: '#2D7B38',
    },
    portionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    portionTextActive: {
        color: '#2D7B38',
    },
    activeCheck: {
        fontSize: 12,
        fontWeight: '800',
        color: '#2D7B38',
    },
    quantitySection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
        marginBottom: 12,
    },
    qtyControlBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 6,
        paddingVertical: 5,
        gap: 12,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    qtyNumber: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        minWidth: 20,
        textAlign: 'center',
    },
    smartAlertBanner: {
        borderRadius: 14,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 6,
    },
    smartAlertRed: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    smartAlertAmber: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    smartAlertText: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 17,
        flex: 1,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'android' ? 24 : 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    addToCartBtn: {
        backgroundColor: '#2D7B38',
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 3,
    },
    addToCartBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
