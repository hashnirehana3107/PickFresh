import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    TextInput,
} from 'react-native';
import { QrCode, ShieldCheck, X, CheckCircle2, Key } from 'lucide-react-native';

export default function PickupVerificationModal({ isOpen, onClose, onVerifySuccess }) {
    const [pin, setPin] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = () => {
        if (pin === '4821' || pin.length === 4) {
            setIsVerified(true);
            setError('');
            setTimeout(() => {
                if (onVerifySuccess) onVerifySuccess(pin);
                setIsVerified(false);
                setPin('');
                if (onClose) onClose();
            }, 1200);
        } else {
            setError('Invalid Verification PIN. Please check customer phone app.');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal visible={isOpen} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <X size={18} color="#64748B" />
                    </TouchableOpacity>

                    {isVerified ? (
                        <View style={styles.successBox}>
                            <CheckCircle2 size={48} color="#2E7D32" />
                            <Text style={styles.successTitle}>QR Code / PIN Verified!</Text>
                            <Text style={styles.successSub}>Locker #04 unlocked. Order handed over to customer.</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.header}>
                                <View style={styles.qrCircle}>
                                    <QrCode size={28} color="#2E7D32" />
                                </View>
                                <Text style={styles.title}>Customer Pickup Verification</Text>
                                <Text style={styles.subtitle}>Scan customer QR code or enter 4-digit pickup PIN</Text>
                            </View>

                            <View style={styles.form}>
                                <View style={styles.pinWrap}>
                                    <Key size={18} color="#94A3B8" />
                                    <TextInput
                                        style={styles.pinInput}
                                        maxLength={4}
                                        placeholder="Enter 4-Digit PIN (e.g. 4821)"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={pin}
                                        onChangeText={(val) => {
                                            setPin(val);
                                            setError('');
                                        }}
                                    />
                                </View>
                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                <View style={styles.simulatedCamera}>
                                    <QrCode size={36} color="#2E7D32" />
                                    <Text style={styles.cameraText}>Camera Scanner Active • Align QR inside frame</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleVerify}
                                    activeOpacity={0.85}
                                >
                                    <ShieldCheck size={18} color="#FFFFFF" />
                                    <Text style={styles.submitBtnText}>Confirm Handover & Complete</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
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
        marginBottom: 16,
    },
    qrCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    form: {
        gap: 12,
    },
    pinWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    pinInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: 2,
    },
    errorText: {
        fontSize: 11,
        color: '#DC2626',
        fontWeight: '600',
    },
    simulatedCamera: {
        borderWidth: 2,
        borderColor: '#2E7D32',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F4FBF7',
    },
    cameraText: {
        fontSize: 11,
        color: '#2E7D32',
        fontWeight: '600',
        textAlign: 'center',
    },
    submitBtn: {
        backgroundColor: '#2E7D32',
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    submitBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    successBox: {
        paddingVertical: 20,
        alignItems: 'center',
        gap: 8,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#2E7D32',
        textAlign: 'center',
    },
    successSub: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
});
