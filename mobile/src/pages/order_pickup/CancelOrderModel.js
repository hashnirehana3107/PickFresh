import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
} from 'react-native';
import { AlertOctagon, X } from 'lucide-react-native';

export default function CancelOrderModal({ isOpen, onClose, onConfirmCancel, order }) {
    const [reason, setReason] = useState('Item out of stock / quality issue');
    const [customNote, setCustomNote] = useState('');
    const [processRefund, setProcessRefund] = useState(true);

    const cancelReasons = [
        'Item out of stock / quality issue',
        'Customer requested cancellation',
        'Store pickup window closed',
        'Unverified / Fraudulent payment',
        'Other reason',
    ];

    const handleSubmit = () => {
        if (onConfirmCancel) {
            onConfirmCancel(order.id || order.dbId, reason, customNote, processRefund);
        }
        if (onClose) onClose();
    };

    if (!isOpen || !order) return null;

    return (
        <Modal visible={isOpen} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <X size={18} color="#64748B" />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <AlertOctagon size={24} color="#DC2626" />
                        </View>
                        <Text style={styles.title}>Cancel Order #{order.id || order.orderNumber || '1028'}?</Text>
                        <Text style={styles.subtitle}>
                            Customer: <Text style={styles.boldText}>{order.customerName || 'Customer'}</Text> ({order.totalAmount || `Rs. ${order.total || 0}`})
                        </Text>
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>Select Reason for Cancellation *</Text>
                        <View style={styles.reasonsList}>
                            {cancelReasons.map((r) => {
                                const isSelected = reason === r;
                                return (
                                    <TouchableOpacity
                                        key={r}
                                        style={[styles.reasonItem, isSelected && styles.reasonItemSelected]}
                                        onPress={() => setReason(r)}
                                    >
                                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]} />
                                        <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>{r}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={[styles.label, { marginTop: 12 }]}>Additional Explanation for Customer</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="e.g. Apologies, organic carrots failed quality check..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            numberOfLines={2}
                            value={customNote}
                            onChangeText={setCustomNote}
                        />

                        <TouchableOpacity
                            style={styles.refundBox}
                            onPress={() => setProcessRefund(!processRefund)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.checkbox, processRefund && styles.checkboxActive]} />
                            <Text style={styles.refundText}>💳 Issue full refund to customer (Visa / Koko)</Text>
                        </TouchableOpacity>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.backBtn} onPress={onClose}>
                                <Text style={styles.backBtnText}>Keep Order</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelBtn} onPress={handleSubmit}>
                                <Text style={styles.cancelBtnText}>Confirm Cancellation</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
        maxHeight: '90%',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 14,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12.5,
        color: '#64748B',
    },
    boldText: {
        fontWeight: '700',
        color: '#0F172A',
    },
    form: {
        marginTop: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 6,
    },
    reasonsList: {
        gap: 6,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    reasonItemSelected: {
        borderColor: '#DC2626',
        backgroundColor: '#FEF2F2',
    },
    radioCircle: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: '#94A3B8',
    },
    radioCircleSelected: {
        borderColor: '#DC2626',
        backgroundColor: '#DC2626',
    },
    reasonText: {
        fontSize: 12,
        color: '#334155',
        fontWeight: '600',
    },
    reasonTextSelected: {
        color: '#DC2626',
        fontWeight: '700',
    },
    textArea: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        padding: 10,
        fontSize: 12.5,
        color: '#1E293B',
        minHeight: 50,
        textAlignVertical: 'top',
    },
    refundBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#D1FAE5',
        padding: 10,
        borderRadius: 12,
        marginTop: 12,
    },
    checkbox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#059669',
    },
    checkboxActive: {
        backgroundColor: '#059669',
    },
    refundText: {
        fontSize: 11.5,
        color: '#059669',
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    backBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    backBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#DC2626',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
