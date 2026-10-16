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
    Minus,
    Plus,
    Trash2,
    ShoppingBag,
    Sparkles,
    Store,
    ArrowRight,
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
    if (name.includes('soap') || name.includes('dove') || name.includes('lux')) {
        return require('../../../assets/Dove Beauty Cream Soap 100g.jpg');
    }
    if (name.includes('tomato') || name.includes('carrot') || name.includes('bean') || cat.includes('veg')) {
        return require('../../../assets/vegetables.jpg');
    }
    if (name.includes('apple') || name.includes('avocado') || name.includes('grape') || cat.includes('fruit')) {
        return require('../../../assets/fruits.webp');
    }
    if (name.includes('milk') || cat.includes('dairy')) {
        return require('../../../assets/highland_milk.png');
    }
    if (name.includes('chicken') || name.includes('meat') || cat.includes('meat')) {
        return require('../../../assets/meat.webp');
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
    if (rawPic) {
        return { uri: rawPic };
    }
    return null;
}

export default function CartPage({
    cartItems = [],
    onUpdateQuantity,
    onRemoveItem,
    onNavigate,
    onOpenReplacement,
    selectedStore,
}) {
    const items = cartItems || [];
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const [storeProfiles, setStoreProfiles] = useState({});

    useEffect(() => {
        const fetchStoreProfiles = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/customer-shopping/stores`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.stores)) {
                    const map = {};
                    data.stores.forEach((st) => {
                        const pic = st.picture || st.profilePicture || st.image;
                        if (st.name && pic) {
                            map[st.name.toLowerCase().trim()] = pic;
                        }
                    });
                    setStoreProfiles(map);
                }
            } catch (err) {
                // silent fallback
            }
        };
        fetchStoreProfiles();
    }, []);

    const hasSmartSwapBanner = items.some(
        (item) =>
            (item.stock !== undefined && item.quantity > item.stock) ||
            (item.stock !== undefined && item.stock <= 3) ||
            item.isLowStock
    );

    const openSwapModal = (targetItem) => {
        const itemToSwap = targetItem || items.find((i) => (i.stock !== undefined && i.stock <= 3) || i.isLowStock) || items[0];
        if (onOpenReplacement) {
            onOpenReplacement(itemToSwap);
        } else if (onNavigate) {
            onNavigate('smart_replacement');
        }
    };

    // Empty Cart State
    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Your Cart</Text>
                        <Text style={styles.headerSubtitle}>0 items in your shopping bag</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => onNavigate && onNavigate('search')}
                    >
                        <ArrowLeft size={20} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyBody}>
                    <View style={styles.emptyIconCircle}>
                        <ShoppingBag size={44} color="#2D7B38" />
                    </View>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptyDesc}>
                        Looks like you haven't added any fresh items to your cart yet.
                    </Text>
                    <TouchableOpacity
                        style={styles.exploreBtn}
                        onPress={() => onNavigate && onNavigate('home')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.exploreBtnText}>Start Shopping</Text>
                        <ArrowRight size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Your Cart</Text>
                    <Text style={styles.headerSubtitle}>
                        {totalCount} {totalCount === 1 ? 'item' : 'items'} ready for pickup
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.countChip}>
                        <Text style={styles.countChipText}>{totalCount} Items</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => onNavigate && onNavigate('search')}
                    >
                        <ArrowLeft size={20} color="#1E293B" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* AI Smart Swap Banner */}
                {hasSmartSwapBanner && (
                    <View style={styles.smartSwapBanner}>
                        <View style={styles.smartSwapLeft}>
                            <View style={styles.sparkleIcon}>
                                <Sparkles size={16} color="#B45309" />
                            </View>
                            <View style={styles.smartSwapTextWrap}>
                                <Text style={styles.smartSwapTitle}>Smart Substitution Enabled</Text>
                                <Text style={styles.smartSwapSub}>
                                    Item low stock? AI automatically suggests fresh swaps
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.swapActionBtn}
                            onPress={() => openSwapModal()}
                        >
                            <Text style={styles.swapActionBtnText}>AI Swap</Text>
                            <ArrowRight size={12} color="#B45309" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Cart Items List */}
                <View style={styles.itemsList}>
                    {items.map((item, idx) => {
                        const isLowStock =
                            (item.stock !== undefined && item.quantity > item.stock) ||
                            (item.stock !== undefined && item.stock <= 3) ||
                            item.isLowStock;
                        const imgSrc = resolveProductImage(item);

                        return (
                            <View key={item.id || item._id || idx} style={styles.itemCard}>
                                <View style={styles.itemImgContainer}>
                                    <Image
                                        source={imgSrc}
                                        style={styles.itemImg}
                                        resizeMode="contain"
                                    />
                                </View>

                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>

                                    <View style={styles.storeTag}>
                                        {(() => {
                                            const storeName = item.storeName || item.brand || selectedStore?.name || 'PickFresh Super';
                                            const cleanName = storeName.toLowerCase().trim();
                                            const rawStorePic = item.storePicture || item.storeImage || selectedStore?.picture || storeProfiles[cleanName];
                                            const storePicSrc = resolveStoreProfilePic(storeName, rawStorePic);
                                            return storePicSrc ? (
                                                <Image
                                                    source={storePicSrc}
                                                    style={styles.storeMiniPic}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Store size={11} color="#2D7B38" />
                                            );
                                        })()}
                                        <Text style={styles.storeNameText} numberOfLines={1}>
                                            {item.storeName || item.brand || 'PickFresh Super'}
                                        </Text>
                                        <Text style={styles.storeDot}>•</Text>
                                        <Text style={styles.catText}>{item.category || 'Produce'}</Text>
                                    </View>

                                    {isLowStock && (
                                        <TouchableOpacity
                                            style={styles.lowStockBadge}
                                            onPress={() => openSwapModal(item)}
                                        >
                                            <Sparkles size={11} color="#B45309" />
                                            <Text style={styles.lowStockText}>Smart Swap Eligible</Text>
                                        </TouchableOpacity>
                                    )}

                                    <View style={styles.itemBottomRow}>
                                        <Text style={styles.itemPrice}>Rs. {item.price * item.quantity}</Text>

                                        <View style={styles.actionsWrap}>
                                            {/* Quantity Stepper */}
                                            <View style={styles.qtyStepper}>
                                                <TouchableOpacity
                                                    style={styles.qtyBtn}
                                                    onPress={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity - 1)}
                                                >
                                                    <Minus size={13} color="#0F172A" strokeWidth={2.5} />
                                                </TouchableOpacity>
                                                <Text style={styles.qtyText}>{item.quantity}</Text>
                                                <TouchableOpacity
                                                    style={styles.qtyBtn}
                                                    onPress={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity + 1)}
                                                >
                                                    <Plus size={13} color="#0F172A" strokeWidth={2.5} />
                                                </TouchableOpacity>
                                            </View>

                                            {/* Delete Button */}
                                            <TouchableOpacity
                                                style={styles.deleteBtn}
                                                onPress={() => onRemoveItem && onRemoveItem(item.id)}
                                            >
                                                <Trash2 size={16} color="#DC2626" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Order Breakdown Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Order Breakdown</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryVal}>Rs. {totalAmount}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Pickup Service Fee</Text>
                        <Text style={styles.summaryFree}>FREE</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TOTAL PAYABLE</Text>
                        <Text style={styles.totalVal}>Rs. {totalAmount}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Bottom Checkout Bar */}
            <View style={styles.bottomBar}>
                <View style={styles.bottomBarInfo}>
                    <Text style={styles.bottomBarLabel}>Total Payable</Text>
                    <Text style={styles.bottomBarAmount}>Rs. {totalAmount}</Text>
                </View>
                <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={() => onNavigate && onNavigate('pickup_select')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.checkoutBtnText}>Select Pickup Time</Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 0,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    countChip: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countChipText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#166534',
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
        paddingTop: 14,
        paddingBottom: Platform.OS === 'android' ? 124 : 100,
    },
    smartSwapBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
    },
    smartSwapLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    sparkleIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FDE68A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    smartSwapTextWrap: {
        flex: 1,
    },
    smartSwapTitle: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#92400E',
    },
    smartSwapSub: {
        fontSize: 10.5,
        color: '#B45309',
        marginTop: 1,
    },
    swapActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    swapActionBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#B45309',
    },
    itemsList: {
        gap: 12,
        marginBottom: 20,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 14,
        elevation: 1,
    },
    itemImgContainer: {
        width: 72,
        height: 72,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    itemImg: {
        width: '100%',
        height: '100%',
    },
    itemDetails: {
        flex: 1,
        justifyContent: 'space-between',
    },
    itemName: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 18,
    },
    storeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    storeMiniPic: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 0.5,
        borderColor: '#CBD5E1',
    },
    storeNameText: {
        fontSize: 10.5,
        color: '#2D7B38',
        fontWeight: '700',
        maxWidth: 120,
    },
    storeDot: {
        fontSize: 10.5,
        color: '#94A3B8',
        marginHorizontal: 1,
    },
    catText: {
        fontSize: 10.5,
        color: '#64748B',
        fontWeight: '600',
    },
    lowStockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 5,
    },
    lowStockText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#B45309',
    },
    itemBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    itemPrice: {
        fontSize: 15,
        fontWeight: '900',
        color: '#2D7B38',
    },
    actionsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    qtyStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        height: 28,
        paddingHorizontal: 4,
    },
    qtyBtn: {
        width: 22,
        height: 22,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    qtyText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
        minWidth: 20,
        textAlign: 'center',
    },
    deleteBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 8,
        padding: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 14,
        elevation: 1,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    summaryVal: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    summaryFree: {
        fontSize: 13,
        fontWeight: '800',
        color: '#166534',
    },
    divider: {
        height: 1,
        borderTopWidth: 1.5,
        borderTopColor: '#E2E8F0',
        borderStyle: 'dashed',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    totalVal: {
        fontSize: 22,
        fontWeight: '900',
        color: '#2D7B38',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'android' ? 24 : 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 8,
    },
    bottomBarInfo: {
        justifyContent: 'center',
    },
    bottomBarLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bottomBarAmount: {
        fontSize: 20,
        fontWeight: '900',
        color: '#2D7B38',
    },
    checkoutBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2D7B38',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 16,
    },
    checkoutBtnText: {
        color: '#FFFFFF',
        fontSize: 14.5,
        fontWeight: '800',
    },
    emptyBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingBottom: 60,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 6,
    },
    emptyDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
    },
    exploreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2D7B38',
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 14,
    },
    exploreBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});
