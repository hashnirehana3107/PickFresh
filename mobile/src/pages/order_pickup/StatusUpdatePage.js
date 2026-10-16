import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    Clock,
} from 'lucide-react-native';
import { API_BASE_URL } from '../../config/api';

export default function StatusUpdatePage({ onNavigate, order, onBack }) {
    const [currentOrder, setCurrentOrder] = useState(order || {
        id: 'PF-1028',
        dbId: null,
        customerName: 'Kiara Fernando',
        phone: '0772345445',
        pickupTime: '4:00 PM - 4:30 PM',
        status: 'PENDING',
        items: [],
    });

    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    useEffect(() => {
        if (order) {
            setCurrentOrder(order);
        }
    }, [order]);

    const steps = [
        { id: 1, key: 'Pending', label: 'Pending', desc: 'Order received & waiting for confirmation' },
        { id: 2, key: 'Accepted', label: 'Accepted', desc: 'Order confirmed by store staff' },
        { id: 3, key: 'Preparing', label: 'Preparing', desc: 'Items being picked & packed' },
        { id: 4, key: 'Ready for Pickup', label: 'Ready for Pickup', desc: 'Packed & ready at pickup counter' },
        { id: 5, key: 'Collected', label: 'Collected', desc: 'Picked up by customer' },
    ];

    const getInitialStepIndex = (statusStr) => {
        if (!statusStr) return 0;
        const s = String(statusStr).toLowerCase();
        if (s.includes('collect') || s.includes('complete')) return 4;
        if (s.includes('ready')) return 3;
        if (s.includes('prep') || s.includes('pack')) return 2;
        if (s.includes('accept')) return 1;
        return 0; // Default: Pending
    };

    const [activeStepIndex, setActiveStepIndex] = useState(() =>
        getInitialStepIndex(currentOrder?.status)
    );

    useEffect(() => {
        if (currentOrder?.status) {
            setActiveStepIndex(getInitialStepIndex(currentOrder.status));
        }
    }, [currentOrder?.status]);

    const selectedStep = steps[activeStepIndex] || steps[0];

    const handleConfirmUpdate = async () => {
        setIsUpdating(true);
        const targetId = currentOrder.dbId || currentOrder.rawOrder?._id || currentOrder.id;
        const newStatus = selectedStep.key;
        let serverUpdatedOrder = null;

        try {
            if (targetId) {
                const res = await fetch(`${API_BASE_URL}/orders/${targetId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });
                const data = await res.json();
                if (data.success && data.order) {
                    serverUpdatedOrder = data.order;
                }
            }
        } catch (err) {
            console.error('Failed to update status in MongoDB Atlas:', err);
        }

        setIsUpdating(false);
        setUpdateSuccess(true);

        const updatedOrderObj = {
            ...currentOrder,
            status: newStatus,
            dbId: serverUpdatedOrder?._id || currentOrder.dbId,
            customerAvatar:
                serverUpdatedOrder?.customerAvatar || currentOrder.customerAvatar || resolvedAvatar,
            customerImage:
                serverUpdatedOrder?.customerImage || currentOrder.customerImage || resolvedAvatar,
            rawOrder: serverUpdatedOrder || currentOrder.rawOrder,
        };

        setTimeout(() => {
            if (onNavigate) {
                onNavigate('order_details', { order: updatedOrderObj });
            } else if (onBack) {
                onBack();
            }
        }, 600);
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('order_details', { order: currentOrder });
        } else if (onBack) {
            onBack();
        }
    };

    const resolvedAvatar =
        currentOrder.customerAvatar && !currentOrder.customerAvatar.includes('unsplash.com')
            ? currentOrder.customerAvatar
            : currentOrder.customerImage && !currentOrder.customerImage.includes('unsplash.com')
            ? currentOrder.customerImage
            : currentOrder.rawOrder?.customerAvatar && !currentOrder.rawOrder?.customerAvatar.includes('unsplash.com')
            ? currentOrder.rawOrder.customerAvatar
            : currentOrder.rawOrder?.customerImage && !currentOrder.rawOrder?.customerImage.includes('unsplash.com')
            ? currentOrder.rawOrder.customerImage
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  currentOrder.customerName || 'Customer'
              )}&background=E8F5E9&color=27672D&bold=true&font-size=0.45`;

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollableBody}
                contentContainerStyle={styles.scrollableContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Top Navigation Header matching React Web */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.subTitle}>Order #{currentOrder.id || 'PF-1028'}</Text>
                        <Text style={styles.pageTitle}>Update Status</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={handleBack}
                        activeOpacity={0.7}
                        accessibilityLabel="Back to Order Details"
                    >
                        <ArrowLeft size={22} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                {/* Customer & Order Context Card */}
                <View style={styles.orderCard}>
                    <View style={styles.customerInfo}>
                        <View style={styles.avatar}>
                            <Image
                                source={{ uri: resolvedAvatar }}
                                style={styles.avatarImg}
                                resizeMode="cover"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.custName}>
                                {currentOrder.customerName || 'Kiara Fernando'}
                            </Text>
                            <View style={styles.slotRow}>
                                <Clock size={12} color="#64748B" />
                                <Text style={styles.slotText}>
                                    Pickup: {currentOrder.pickupTime || '4:00 PM - 4:30 PM'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stepper Timeline Section matching React Web */}
                <View style={styles.stepperContainer}>
                    <Text style={styles.sectionLabel}>Select Order Progress Status</Text>

                    <View style={styles.stepperList}>
                        <View style={styles.timelineLine} />

                        {steps.map((step, index) => {
                            const isCompleted = index < activeStepIndex;
                            const isActive = index === activeStepIndex;

                            return (
                                <TouchableOpacity
                                    key={step.id}
                                    style={[
                                        styles.stepCard,
                                        isActive && styles.stepCardActive,
                                    ]}
                                    onPress={() => setActiveStepIndex(index)}
                                    activeOpacity={0.85}
                                >
                                    <View
                                        style={[
                                            styles.circle,
                                            isCompleted
                                                ? styles.circleCompleted
                                                : isActive
                                                ? styles.circleActive
                                                : styles.circlePending,
                                        ]}
                                    >
                                        {isCompleted ? (
                                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.circleText,
                                                    isActive ? styles.circleTextActive : styles.circleTextPending,
                                                ]}
                                            >
                                                {step.id}
                                            </Text>
                                        )}
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[
                                                styles.stepTitle,
                                                isActive || isCompleted
                                                    ? styles.textDark
                                                    : styles.textMuted,
                                            ]}
                                        >
                                            {step.label}
                                        </Text>
                                        <Text style={styles.stepDesc}>{step.desc}</Text>
                                    </View>

                                    {isActive ? (
                                        <View style={styles.selectedPill}>
                                            <Text style={styles.selectedPillText}>Selected</Text>
                                        </View>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Success Message Banner */}
                {updateSuccess ? (
                    <View style={styles.successBanner}>
                        <CheckCircle2 size={18} color="#166534" />
                        <Text style={styles.successText}>
                            Status updated to "{selectedStep.label}" in MongoDB Atlas!
                        </Text>
                    </View>
                ) : null}
            </ScrollView>

            {/* Action Buttons Stack (Anchored at Bottom) */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleConfirmUpdate}
                    disabled={isUpdating}
                    activeOpacity={0.85}
                >
                    {isUpdating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <CheckCircle2 size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.saveBtnText}>
                        {isUpdating ? 'Saving to Database...' : `Save Status: ${selectedStep.label}`}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleBack}
                    activeOpacity={0.85}
                >
                    <Text style={styles.cancelBtnText}>Back to Order Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
        justifyContent: 'space-between',
    },
    scrollableBody: {
        flex: 1,
    },
    scrollableContent: {
        padding: 16,
        paddingBottom: Platform.OS === 'android' ? 44 : 20,
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
        marginTop: 2,
    },
    backBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    custName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },
    slotText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#64748B',
    },
    stepperContainer: {
        gap: 10,
        marginTop: 4,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    stepperList: {
        position: 'relative',
        gap: 10,
    },
    timelineLine: {
        position: 'absolute',
        left: 27,
        top: 24,
        bottom: 24,
        width: 2,
        backgroundColor: '#E2E8F0',
        zIndex: 1,
    },
    stepCard: {
        position: 'relative',
        zIndex: 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    stepCardActive: {
        backgroundColor: '#F0FDF4',
        borderWidth: 2,
        borderColor: '#27672D',
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
    },
    circle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleCompleted: {
        backgroundColor: '#27672D',
    },
    circleActive: {
        backgroundColor: '#27672D',
        borderWidth: 3,
        borderColor: '#DCFCE7',
    },
    circlePending: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    circleText: {
        fontSize: 13,
        fontWeight: '800',
    },
    circleTextActive: {
        color: '#FFFFFF',
    },
    circleTextPending: {
        color: '#94A3B8',
    },
    stepTitle: {
        fontSize: 14.5,
        fontWeight: '800',
    },
    textDark: {
        color: '#1E293B',
    },
    textMuted: {
        color: '#94A3B8',
    },
    stepDesc: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 2,
    },
    selectedPill: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    selectedPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#27672D',
    },
    successBanner: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
    },
    successText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#166534',
        flex: 1,
    },
    actions: {
        flexDirection: 'column',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'android' ? 24 : 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    saveBtn: {
        width: '100%',
        backgroundColor: '#27672D',
        borderRadius: 16,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 3,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    cancelBtn: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        color: '#64748B',
        fontSize: 14.5,
        fontWeight: '700',
    },
});
