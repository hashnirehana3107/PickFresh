import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated,
    Platform,
} from 'react-native';
import {
    ShoppingBag,
    X,
    ChevronRight,
    MapPin,
    Clock,
} from 'lucide-react-native';

export default function ReadyPickupAlertModal({
    visible,
    alertOrder,
    onClose,
    onTrackOrder,
}) {
    // Animation values for vibration / ring pulse
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!visible || !alertOrder) return;

        // Realistic notification vibration + pulse loop
        const vibrationLoop = Animated.loop(
            Animated.sequence([
                // Initial pulse expand
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 180,
                    useNativeDriver: true,
                }),
                // Rapid vibration wiggle
                Animated.timing(shakeAnim, { toValue: 1, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -1, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 1, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -1, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 1, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -1, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
                // Settle back to normal size
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
                // Rest period before next vibration burst
                Animated.delay(1200),
            ])
        );

        vibrationLoop.start();
        return () => vibrationLoop.stop();
    }, [visible, alertOrder]);

    const rotateInterpolation = shakeAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-8deg', '0deg', '8deg'],
    });

    const translateXInterpolation = shakeAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-3, 0, 3],
    });

    if (!alertOrder) return null;

    const orderNum = alertOrder.orderNumber || 'PF-1048';
    const storeName = alertOrder.storeName || alertOrder.pickupStore || 'GroceryMart';
    const pickupSlot = alertOrder.pickupTimeSlot || '15 Mins Express Pickup';

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    {/* Close Top Right */}
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                        activeOpacity={0.7}
                        accessibilityLabel="Close notification"
                    >
                        <X size={16} color="#64748B" />
                    </TouchableOpacity>

                    {/* Vibrating Concentric Ring Bag Icon Header (Matches Image 2) */}
                    <Animated.View
                        style={[
                            styles.pulseOuter,
                            {
                                transform: [
                                    { scale: pulseAnim },
                                    { rotate: rotateInterpolation },
                                    { translateX: translateXInterpolation },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.pulseMiddle}>
                            <View style={styles.pulseInner}>
                                <ShoppingBag size={24} color="#FFFFFF" strokeWidth={2.4} />
                            </View>
                        </View>
                    </Animated.View>

                    {/* Status Badge */}
                    <View style={styles.readyBadge}>
                        <View style={styles.badgeDot} />
                        <Text style={styles.readyBadgeText}>READY FOR PICKUP</Text>
                    </View>

                    {/* Title & Message */}
                    <Text style={styles.readyTitle}>Order #{orderNum} is Ready!</Text>
                    <Text style={styles.readyMessage}>
                        Great news! Your order at <Text style={styles.boldText}>{storeName}</Text> is packed and ready for pickup at the express counter.
                    </Text>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <MapPin size={15} color="#2D7B38" />
                            <Text style={styles.infoText}>{storeName} • Pickup Counter</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Clock size={15} color="#2D7B38" />
                            <Text style={styles.infoText}>Slot: {pickupSlot}</Text>
                        </View>
                    </View>

                    {/* Action Buttons (Matches Image 2) */}
                    <View style={styles.actionsBox}>
                        <TouchableOpacity
                            style={styles.trackBtn}
                            onPress={() => {
                                if (onTrackOrder) onTrackOrder(alertOrder);
                                if (onClose) onClose();
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.trackBtnText}>Track Order & Collect</Text>
                            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dismissBtn}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.dismissBtnText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }
            : {}),
    },
    modalCard: {
        width: '88%',
        maxWidth: 325,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingVertical: 20,
        paddingHorizontal: 18,
        alignItems: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 8,
    },
    closeBtn: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    pulseOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#E8F5E9',
        borderWidth: 2,
        borderColor: '#C8E6C9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    pulseMiddle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#DCFCE7',
        borderWidth: 2,
        borderColor: '#86EFAC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseInner: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#1E6B35',
        alignItems: 'center',
        justifyContent: 'center',
    },
    readyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#86EFAC',
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#16A34A',
    },
    readyBadgeText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#15803D',
        letterSpacing: 0.4,
    },
    readyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    readyMessage: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 17,
        marginBottom: 14,
        paddingHorizontal: 6,
    },
    boldText: {
        color: '#0F172A',
        fontWeight: '700',
    },
    infoCard: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoText: {
        fontSize: 12,
        color: '#334155',
        fontWeight: '600',
    },
    actionsBox: {
        width: '100%',
        gap: 8,
    },
    trackBtn: {
        backgroundColor: '#27672D',
        borderRadius: 12,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    trackBtnText: {
        color: '#FFFFFF',
        fontSize: 13.5,
        fontWeight: '700',
    },
    dismissBtn: {
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dismissBtnText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '600',
    },
});
