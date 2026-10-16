import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { ArrowLeft, Check, CheckCircle2 } from 'lucide-react-native';

export default function StatusUpdateModal({ isOpen, onClose, onUpdateStatus, currentOrder }) {
    const steps = [
        { id: 1, key: 'Pending', label: 'Pending' },
        { id: 2, key: 'Accepted', label: 'Accepted' },
        { id: 3, key: 'Preparing', label: 'Preparing' },
        { id: 4, key: 'Ready for Pickup', label: 'Ready for Pickup' },
        { id: 5, key: 'Collected', label: 'Collected' },
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

    const handleSelectStep = (index) => {
        setActiveStepIndex(index);
    };

    const selectedStep = steps[activeStepIndex] || steps[0];
    const buttonLabel = `Update Status to "${selectedStep.label}"`;

    const handleConfirmUpdate = () => {
        if (onUpdateStatus && currentOrder) {
            onUpdateStatus(currentOrder.id || currentOrder.dbId, selectedStep.key);
        }
        if (onClose) onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal visible={isOpen} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Header Title Row matching React Web */}
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={styles.subTag}>
                                Order #{currentOrder?.id || 'PF-1028'}
                            </Text>
                            <Text style={styles.pageTitle}>Update status</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={onClose}
                            accessibilityLabel="Close"
                        >
                            <ArrowLeft size={22} color="#1E293B" />
                        </TouchableOpacity>
                    </View>

                    {/* Vertical Timeline Stepper */}
                    <View style={styles.stepperWrapper}>
                        <View style={styles.verticalLine} />

                        {steps.map((step, index) => {
                            const isCompleted = index < activeStepIndex;
                            const isActive = index === activeStepIndex;

                            return (
                                <TouchableOpacity
                                    key={step.id}
                                    style={[
                                        styles.stepItem,
                                        isActive && styles.selectedStepCard,
                                    ]}
                                    onPress={() => handleSelectStep(index)}
                                    activeOpacity={0.8}
                                >
                                    <View
                                        style={[
                                            styles.stepCircle,
                                            isCompleted
                                                ? styles.circleCompleted
                                                : isActive
                                                ? styles.circleActive
                                                : styles.circlePending,
                                        ]}
                                    >
                                        {isCompleted ? (
                                            <Check size={18} color="#FFFFFF" strokeWidth={3} />
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
                                                styles.stepLabel,
                                                isActive || isCompleted
                                                    ? styles.labelActive
                                                    : styles.labelPending,
                                            ]}
                                        >
                                            {step.label}
                                        </Text>
                                        {isActive ? (
                                            <Text style={styles.selectedIndicator}>Selected Status</Text>
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Action Buttons Stack */}
                    <View style={styles.actionsGroup}>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={handleConfirmUpdate}
                            activeOpacity={0.85}
                        >
                            <CheckCircle2 size={18} color="#FFFFFF" />
                            <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.cancelBtnText}>Cancel Update</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
        gap: 18,
        maxHeight: '90%',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subTag: {
        fontSize: 11,
        fontWeight: '700',
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
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperWrapper: {
        position: 'relative',
        gap: 12,
    },
    verticalLine: {
        position: 'absolute',
        left: 20,
        top: 20,
        bottom: 20,
        width: 2,
        backgroundColor: '#E2E8F0',
        zIndex: 1,
    },
    stepItem: {
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
    },
    selectedStepCard: {
        backgroundColor: '#F0FDF4',
        borderWidth: 2,
        borderColor: '#27672D',
    },
    stepCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
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
    stepLabel: {
        fontSize: 15,
        fontWeight: '800',
    },
    labelActive: {
        color: '#1E293B',
    },
    labelPending: {
        color: '#94A3B8',
    },
    selectedIndicator: {
        fontSize: 11,
        fontWeight: '700',
        color: '#27672D',
        marginTop: 2,
    },
    actionsGroup: {
        gap: 10,
        marginTop: 6,
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: '#27672D',
        borderRadius: 16,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryBtnText: {
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
