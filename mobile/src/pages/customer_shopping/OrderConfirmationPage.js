import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Animated,
    Platform,
} from 'react-native';
import {
    Clock,
    MapPin,
    CreditCard,
    Check,
    ChevronDown,
    ChevronUp,
    Package,
} from 'lucide-react-native';

function resolveItemImage(item) {
    const raw = item?.image || item?.imageUrl;
    if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:'))) {
        return { uri: raw };
    }
    const name = (item?.name || '').toLowerCase();
    const cat = (item?.category || '').toLowerCase();
    if (name.includes('tomato') || name.includes('carrot') || cat.includes('veg')) {
        return require('../../../assets/vegetables.jpg');
    }
    if (name.includes('apple') || name.includes('fruit') || cat.includes('fruit')) {
        return require('../../../assets/fruits.webp');
    }
    if (name.includes('milk') || cat.includes('dairy')) {
        return require('../../../assets/highland_milk.png');
    }
    if (name.includes('chicken') || name.includes('meat')) {
        return require('../../../assets/meat.webp');
    }
    return require('../../../assets/fresh_produce_hero.png');
}

export default function OrderConfirmationPage({ onNavigate, orderDetails }) {
    const [showSummary, setShowSummary] = useState(true);

    // Heartbeat pulse animation — mirrors web's auraPulse & heartbeat keyframes
    const pulseScale = useRef(new Animated.Value(0.9)).current;
    const pulseOpacity = useRef(new Animated.Value(0.8)).current;
    const checkmarkScale = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        // Initial pop-in
        Animated.spring(checkmarkScale, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
        }).start();

        // Pulsing / heartbeat loop
        const anim = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulseScale, { toValue: 1.25, duration: 1100, useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 0.25, duration: 1100, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(pulseScale, { toValue: 0.9, duration: 1100, useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 0.8, duration: 1100, useNativeDriver: true }),
                ]),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    const orderNumber = orderDetails?.orderNumber ? orderDetails.orderNumber.replace('#', '') : 'PF-0001';
    const pickupStore = orderDetails?.pickupStore || 'PickFresh Super • Main Counter';
    const pickupTime = orderDetails?.pickupTimeSlot || orderDetails?.pickupTime || 'Today, 4:30 PM';
    const totalAmount = orderDetails?.totalAmount !== undefined ? Number(orderDetails.totalAmount) : 2930;

    const itemsList = Array.isArray(orderDetails?.items) && orderDetails.items.length > 0
        ? orderDetails.items
        : [
            { name: 'Fresh Red Tomatoes', price: 340, quantity: 2, unit: '1kg' },
            { name: 'Highland Fresh Milk 1L', price: 480, quantity: 1, unit: 'pack' },
        ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Top Success Header — centered like web */}
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Order confirmed</Text>
                <Text style={styles.pageSubtitle}>Your pickup has been reserved successfully</Text>
            </View>

            {/* Animated Checkmark — matches web .success-checkmark-wrapper + auraPulse */}
            <View style={styles.checkmarkWrapper}>
                <Animated.View
                    style={[
                        styles.pulseRing,
                        { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                    ]}
                />
                <Animated.View style={[styles.successCircle, { transform: [{ scale: checkmarkScale }] }]}>
                    <Check size={36} color="#FFFFFF" strokeWidth={3.5} />
                </Animated.View>
            </View>

            {/* Order Details Card — matches web .order-details-card */}
            <View style={styles.orderCard}>
                {/* Badge pill — matches web .card-top-badge */}
                <View style={styles.cardTopBadge}>
                    <View style={styles.badgeDot} />
                    <Text style={styles.badgeText}>RESERVATION CONFIRMED</Text>
                </View>

                {/* Order number — matches web .order-number (20px 800) */}
                <Text style={styles.orderNumber}>Order #{orderNumber}</Text>

                {/* Info rows — matches web .order-info-rows with dashed top borders */}
                <View style={styles.orderInfoRows}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Clock size={16} color="#2D7B38" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>PICKUP TIME</Text>
                            <Text style={styles.infoValue}>{pickupTime}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <MapPin size={16} color="#2D7B38" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>PICKUP LOCATION</Text>
                            <Text style={styles.infoValue} numberOfLines={2}>{pickupStore}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <CreditCard size={16} color="#2D7B38" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>TOTAL AMOUNT</Text>
                            <Text style={styles.infoValueTotal}>Rs. {totalAmount.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Order Summary Accordion — matches web summary section */}
            <View style={styles.summaryCard}>
                <TouchableOpacity
                    style={[styles.summaryHeader, showSummary && styles.summaryHeaderWithBorder]}
                    onPress={() => setShowSummary((prev) => !prev)}
                    activeOpacity={0.7}
                >
                    <View style={styles.summaryHeaderLeft}>
                        <View style={styles.pkgIconBox}>
                            <Package size={16} color="#2D7B38" />
                        </View>
                        <Text style={styles.summaryTitle}>Order Summary</Text>
                        <View style={styles.itemCountBadge}>
                            <Text style={styles.itemCountBadgeText}>
                                {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.chevronBox}>
                        {showSummary ? (
                            <ChevronUp size={16} color="#475569" />
                        ) : (
                            <ChevronDown size={16} color="#475569" />
                        )}
                    </View>
                </TouchableOpacity>

                {showSummary && (
                    <View style={styles.itemsList}>
                        {itemsList.map((item, idx) => {
                            const imgSrc = resolveItemImage(item);
                            return (
                                <View key={idx} style={styles.itemRow}>
                                    <View style={styles.itemRowLeft}>
                                        <Image
                                            source={imgSrc}
                                            style={styles.itemImg}
                                            resizeMode="contain"
                                        />
                                        <View style={styles.itemDetails}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                            <View style={styles.itemMeta}>
                                                <View style={styles.qtyBadge}>
                                                    <Text style={styles.qtyBadgeText}>Qty: {item.quantity}</Text>
                                                </View>
                                                {item.unit && item.unit !== 'item' && (
                                                    <Text style={styles.itemUnit}>• {item.unit}</Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={styles.itemPrice}>
                                        Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* Action Buttons — matches web .action-buttons-group */}
            <View style={styles.actionButtons}>
                {/* Track order — matches web .btn-primary */}
                <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => onNavigate && onNavigate('track', orderDetails)}
                    activeOpacity={0.85}
                >
                    <View style={styles.livePulseDot} />
                    <Text style={styles.btnPrimaryText}>Track order</Text>
                </TouchableOpacity>

                {/* Continue shopping — matches web .btn-outline-primary (green border) */}
                <TouchableOpacity
                    style={styles.btnOutline}
                    onPress={() => onNavigate && onNavigate('home')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.btnOutlineText}>Continue shopping</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    /* ── Container (.order-conf-container) ── */
    container: {
        flex: 1,
        backgroundColor: '#FAF9F5',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'android' ? 60 : 40,
    },

    /* ── Header — centered ── */
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    pageTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
        lineHeight: 32,
        textAlign: 'center',
    },
    pageSubtitle: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },

    /* ── Checkmark wrapper (.success-checkmark-wrapper) ── */
    checkmarkWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 24,
        height: 100,
    },
    pulseRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(45, 123, 56, 0.15)',
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2D7B38',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 28,
        elevation: 8,
    },

    /* ── Order card (.order-details-card) ── */
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 14,
        elevation: 2,
        marginBottom: 16,
    },

    /* ── Badge pill (.card-top-badge) ── */
    cardTopBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ECF6EE',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2D7B38',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2D7B38',
        letterSpacing: 0.3,
    },

    /* ── Order number (.order-number) — 20px 800 ── */
    orderNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.3,
        marginBottom: 14,
    },

    /* ── Info rows (.order-info-rows) ── */
    orderInfoRows: {
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        borderStyle: 'dashed',
    },

    /* ── Info icon box (.info-icon-box) — 32x32, radius 10, #F4F8F4 bg ── */
    infoIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F4F8F4',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    infoContent: {
        flex: 1,
        flexDirection: 'column',
    },

    /* ── Labels — uppercase, #94A3B8 like web ── */
    infoLabel: {
        fontSize: 10.5,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    infoValue: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1E293B',
    },
    infoValueTotal: {
        fontSize: 15.5,
        fontWeight: '800',
        color: '#2D7B38',
    },

    /* ── Summary card ── */
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 14,
        elevation: 2,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryHeaderWithBorder: {
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    summaryHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    pkgIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#ECF6EE',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    summaryTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    itemCountBadge: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    itemCountBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2D7B38',
    },
    chevronBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginLeft: 'auto',
    },
    itemsList: {
        marginTop: 14,
        gap: 8,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        gap: 12,
    },
    itemRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 0,
    },
    itemImg: {
        width: 46,
        height: 46,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexShrink: 0,
    },
    itemDetails: {
        flex: 1,
        gap: 3,
    },
    itemName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    qtyBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 7,
        paddingVertical: 1,
        borderRadius: 6,
    },
    qtyBadgeText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#334155',
    },
    itemUnit: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '800',
        color: '#2D7B38',
        flexShrink: 0,
        letterSpacing: -0.2,
    },

    /* ── Action buttons (.action-buttons-group) ── */
    actionButtons: {
        gap: 10,
        marginTop: 12,
        marginBottom: 16,
    },

    /* ── Primary btn (.btn-primary) ── */
    btnPrimary: {
        width: '100%',
        backgroundColor: '#2D7B38',
        borderRadius: 14,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 5,
    },
    livePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#86EFAC',
    },
    btnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },

    /* ── Outline btn (.btn-outline-primary) — light green tinted bg like image 2 ── */
    btnOutline: {
        width: '100%',
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5,
        borderColor: '#2D7B38',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnOutlineText: {
        color: '#2D7B38',
        fontSize: 14.5,
        fontWeight: '700',
    },
});
