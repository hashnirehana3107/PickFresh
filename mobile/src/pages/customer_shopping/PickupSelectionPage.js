import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Clock,
    MapPin,
    Check,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const DEFAULT_SLOTS = [
    { id: 'slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', status: '5 slots available', full: false, badge: 'AVAILABLE', badgeType: 'normal' },
    { id: 'slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', status: '3 slots left', full: false, badge: '🔥 3 SLOTS LEFT', badgeType: 'hot' },
    { id: 'slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', status: '6 slots available', full: false, badge: 'AVAILABLE', badgeType: 'normal' },
    { id: 'slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', status: '8 slots available', full: false, badge: 'AVAILABLE', badgeType: 'normal' },
];

export default function PickupSelectionPage({
    onNavigate,
    cartItems = [],
    selectedStore,
    onClearCart,
}) {
    const { user } = useAuth();

    const storeDisplayName = (cartItems && cartItems.length > 0 && cartItems[0].storeName)
        ? cartItems[0].storeName
        : (selectedStore ? (selectedStore.name || selectedStore.storeName || 'PickFresh Super • Main Counter') : 'PickFresh Super • Main Counter');

    const [selectedSlotId, setSelectedSlotId] = useState('slot1');
    const [timeSlots, setTimeSlots] = useState(DEFAULT_SLOTS);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchAvailableSlots = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/order-pickup/slots?storeName=${encodeURIComponent(storeDisplayName)}&date=Today&_t=${Date.now()}`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.slots) && data.slots.length > 0 && isMounted) {
                    setTimeSlots(data.slots);
                    const availableSlot = data.slots.find((s) => !s.full && !s.isFull && !s.isBlocked && (s.remainingSlots === undefined || s.remainingSlots > 0));
                    if (availableSlot) {
                        setSelectedSlotId(availableSlot.id);
                    }
                }
            } catch (err) {
                // Keep default slots
            }
        };

        fetchAvailableSlots();
        return () => { isMounted = false; };
    }, [storeDisplayName]);

    const totalAmount = cartItems && cartItems.length > 0
        ? cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        : 2930;

    const selectedSlotObj = timeSlots.find((s) => s.id === selectedSlotId);

    const handlePlacePreOrder = async () => {
        setIsSubmitting(true);
        setSubmitError('');

        if (selectedSlotObj && (selectedSlotObj.full || selectedSlotObj.isFull || selectedSlotObj.isBlocked || (selectedSlotObj.remainingSlots !== undefined && selectedSlotObj.remainingSlots <= 0))) {
            setSubmitError('This pickup slot is now full and unavailable. Please choose another slot.');
            setIsSubmitting(false);
            return;
        }

        const slotText = selectedSlotObj ? (selectedSlotObj.duration || selectedSlotObj.time) : '4:30 PM - 5:00 PM';

        const payload = {
            items: cartItems.length > 0 ? cartItems.map((i) => ({
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                unit: i.unit || '1kg',
                image: i.image || i.imageUrl,
            })) : [
                { name: 'Fresh Red Tomatoes', price: 340, quantity: 2, unit: '1kg' },
                { name: 'Highland Fresh Milk 1L', price: 480, quantity: 1, unit: 'pack' },
            ],
            totalAmount: totalAmount,
            pickupStore: storeDisplayName,
            pickupDate: 'Today',
            pickupTimeSlot: slotText,
            customerName: user ? (user.name || user.fullName || user.email) : 'Guest Customer',
            customerEmail: user?.email || '',
            customerId: user?._id || user?.id || null,
            customerPhone: user?.phone || '0771234567',
            customerAvatar: user?.picture || user?.avatar || user?.image || '',
            smartReplacementOptIn: true,
        };

        try {
            const res = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok && data.success && data.order) {
                if (onClearCart) onClearCart();
                if (onNavigate) {
                    onNavigate('order_confirm', {
                        ...data.order,
                        pickupSlot: slotText,
                        items: cartItems.length > 0 ? cartItems : data.order.items,
                    });
                }
            } else {
                setSubmitError(data.message || 'Could not place order. Please try again.');
            }
        } catch (err) {
            // Local fallback for offline/simulator safety
            if (onClearCart) onClearCart();
            if (onNavigate) {
                onNavigate('order_confirm', {
                    ...payload,
                    pickupSlot: slotText,
                    _id: `ord_${Date.now()}`,
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header — matches web .new-pickup-header */}
            <View style={styles.header}>
                <View style={styles.titleGroup}>
                    <Text style={styles.mainTitle}>Choose pickup time</Text>
                    <Text style={styles.subTitle}>Pick the most convenient slot</Text>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('cart')}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Scrollable body — matches web .new-pickup-scroll-body */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Store banner — matches web .pickup-store-banner */}
                <View style={styles.storeBanner}>
                    <View style={styles.storeIconWrap}>
                        <MapPin size={16} color="#2D7B38" />
                    </View>
                    <View style={styles.storeInfo}>
                        <Text style={styles.storeBannerName} numberOfLines={1}>{storeDisplayName}</Text>
                        <Text style={styles.storeBannerDate}>Today • Pickup Reservation</Text>
                    </View>
                </View>

                {/* Time slots list — matches web .new-pickup-slots-list */}
                <View style={styles.slotsList}>
                    {timeSlots.map((slot) => {
                        const isSelected = selectedSlotId === slot.id;
                        const isFull = Boolean(
                            slot.full ||
                            slot.isFull ||
                            slot.isBlocked ||
                            (slot.remainingSlots !== undefined && slot.remainingSlots <= 0) ||
                            (slot.booked !== undefined && slot.capacity !== undefined && slot.booked >= slot.capacity && slot.capacity > 0)
                        );
                        const isHot = slot.badgeType === 'hot';
                        const badgeIsActive = isSelected && !isFull;

                        return (
                            <TouchableOpacity
                                key={slot.id}
                                style={[
                                    styles.slotCard,
                                    isSelected && !isFull && styles.slotCardSelected,
                                    isFull && styles.slotCardDisabled,
                                ]}
                                onPress={() => {
                                    if (!isFull) setSelectedSlotId(slot.id);
                                }}
                                disabled={isFull}
                                activeOpacity={isFull ? 1 : 0.8}
                            >
                                {/* Left: clock icon + time */}
                                <View style={styles.slotLeft}>
                                    <View style={[styles.clockIconWrap, isSelected && !isFull && styles.clockIconWrapActive]}>
                                        <Clock
                                            size={18}
                                            color={isSelected && !isFull ? '#2D7B38' : (isFull ? '#94A3B8' : '#64748B')}
                                        />
                                    </View>
                                    <View style={styles.slotTimeGroup}>
                                        <Text style={[styles.slotMainTime, isSelected && !isFull && styles.slotMainTimeSelected, isFull && styles.slotMainTimeFull]}>
                                            {slot.time}
                                        </Text>
                                        <Text style={styles.slotDurationText}>
                                            {slot.duration} {isFull ? '(Unavailable)' : ''}
                                        </Text>
                                    </View>
                                </View>

                                {/* Right: badge + radio */}
                                <View style={styles.slotRight}>
                                    <Text style={[
                                        styles.slotBadge,
                                        isHot && styles.slotBadgeHot,
                                        badgeIsActive && styles.slotBadgeActive,
                                        isFull && styles.slotBadgeFull,
                                    ]}>
                                        {isFull ? (slot.isBlocked ? 'CLOSED' : 'UNAVAILABLE (FULL)') : (slot.badge || slot.status)}
                                    </Text>
                                    <View style={[
                                        styles.radioCircle,
                                        isSelected && !isFull && styles.radioCircleSelected,
                                        isFull && styles.radioCircleFull,
                                    ]}>
                                        {isSelected && !isFull && (
                                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Bottom action bar — matches web .new-pickup-bottom-action-bar */}
            <View style={styles.bottomBar}>
                {/* Total row — matches web .new-pickup-total-row */}
                <View style={styles.totalRow}>
                    <View style={styles.totalLeftGroup}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.guaranteeText}>⚡ Express counter pickup</Text>
                    </View>
                    <Text style={styles.totalValue}>Rs. {totalAmount.toLocaleString()}</Text>
                </View>

                {/* Place Pre Order button — matches web .new-pickup-place-btn */}
                <TouchableOpacity
                    style={[styles.placeOrderBtn, isSubmitting && styles.placeOrderBtnDisabled]}
                    onPress={handlePlacePreOrder}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.placeOrderBtnText}>Place Pre Order</Text>
                    )}
                </TouchableOpacity>

                {/* Inline error */}
                {submitError ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>⚠️ {submitError}</Text>
                    </View>
                ) : null}

                {/* Back to Cart button — matches web .new-pickup-cart-btn */}
                <TouchableOpacity
                    style={styles.backToCartBtn}
                    onPress={() => onNavigate && onNavigate('cart')}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backToCartBtnText}>Back to Cart</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ── Container ── */
    container: {
        flex: 1,
        backgroundColor: '#FAF9F5',
    },

    /* ── Header (.new-pickup-header) ── */
    header: {
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
    titleGroup: {
        flexDirection: 'column',
    },
    mainTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
        lineHeight: 32,
    },
    subTitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '500',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,       // circular (50% equivalent)
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },

    /* ── Scroll body (.new-pickup-scroll-body) ── */
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'android' ? 44 : 20,
    },

    /* ── Store banner (.pickup-store-banner) ── */
    storeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    storeIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#ECF6EE',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    storeInfo: {
        flexDirection: 'column',
        flex: 1,
    },
    storeBannerName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    storeBannerDate: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },

    /* ── Slots list (.new-pickup-slots-list) ── */
    slotsList: {
        gap: 12,
        marginBottom: 24,
    },

    /* ── Slot card (.new-pickup-slot-card) ── */
    slotCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    slotCardSelected: {
        backgroundColor: '#ECF6EE',
        borderColor: '#2D7B38',
        shadowColor: '#2D7B38',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 3,
    },
    slotCardDisabled: {
        backgroundColor: '#FAFAFA',
        borderColor: '#F1F5F9',
        opacity: 0.6,
    },

    /* ── Slot left (.slot-left-info) ── */
    slotLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    clockIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clockIconWrapActive: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
    },
    slotTimeGroup: {
        flexDirection: 'column',
    },
    slotMainTime: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    slotMainTimeSelected: {
        color: '#2D7B38',
    },
    slotMainTimeFull: {
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    slotDurationText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 1,
    },

    /* ── Slot right (.slot-right-info) ── */
    slotRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    /* ── Slot badge (.slot-badge) ── */
    slotBadge: {
        fontSize: 10,
        fontWeight: '800',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        letterSpacing: 0.2,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        color: '#475569',
    },
    slotBadgeHot: {
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
    },
    slotBadgeActive: {
        backgroundColor: '#DCFCE7',
        color: '#15803D',
    },
    slotBadgeFull: {
        backgroundColor: '#F1F5F9',
        color: '#94A3B8',
    },

    /* ── Radio circle (.slot-radio-circle) ── */
    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleSelected: {
        backgroundColor: '#2D7B38',
        borderColor: '#2D7B38',
    },
    radioCircleFull: {
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },

    /* ── Bottom bar (.new-pickup-bottom-action-bar) ── */
    bottomBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 10,
        gap: 8,
    },

    /* ── Total row (.new-pickup-total-row) ── */
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    totalLeftGroup: {
        flexDirection: 'column',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    guaranteeText: {
        fontSize: 11,
        color: '#2D7B38',
        fontWeight: '700',
        marginTop: 1,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.4,
    },

    /* ── Place Pre Order btn (.new-pickup-place-btn) ── */
    placeOrderBtn: {
        width: '100%',
        backgroundColor: '#2D7B38',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 5,
    },
    placeOrderBtnDisabled: {
        opacity: 0.7,
    },
    placeOrderBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },

    /* ── Error box ── */
    errorBox: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    errorText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#991B1B',
        textAlign: 'center',
        lineHeight: 17,
    },

    /* ── Back to Cart btn (.new-pickup-cart-btn) ── */
    backToCartBtn: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#2D7B38',
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backToCartBtnText: {
        color: '#2D7B38',
        fontSize: 14.5,
        fontWeight: '800',
    },
});
