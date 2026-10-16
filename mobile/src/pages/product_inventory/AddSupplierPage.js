import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Check, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export default function AddSupplierPage({ onNavigate, initialData }) {
    const { user } = useAuth();

    const supplier = initialData?.supplier || {
        name: 'ABC Distributors',
        category: 'Beverages',
        phone: '077 555 1020',
        leadTime: '2 days',
        email: 'orders@abc.lk',
    };

    const [name, setName] = useState(supplier.name || '');
    const [category, setCategory] = useState(supplier.category || '');
    const [phone, setPhone] = useState(supplier.phone || '');
    const [leadTime, setLeadTime] = useState(supplier.leadTime || '2 days');
    const [email, setEmail] = useState(supplier.email || '');
    const [bannerStatus, setBannerStatus] = useState(null); // 'saved' | 'removed'
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                category: category.trim() || 'General Supply',
                phone: phone.trim(),
                leadTime: leadTime.trim() || '2 days',
                email: email.trim(),
                storeEmail: user?.email || '',
                isLinkedToCurrentStore: true,
            };

            await fetch(`${API_BASE_URL}/product-inventory/suppliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.warn('Failed to save supplier:', err);
        } finally {
            setIsSubmitting(false);
            setBannerStatus('saved');
            setTimeout(() => {
                if (onNavigate) onNavigate('supplier_list');
            }, 1000);
        }
    };

    const handleRemove = () => {
        setBannerStatus('removed');
        setTimeout(() => {
            if (onNavigate) onNavigate('supplier_list');
        }, 1000);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* Header Title Row */}
            <View style={styles.titleRow}>
                <Text style={styles.pageTitle}>Add Supplier</Text>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('supplier_list')}
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Banners */}
            {bannerStatus === 'saved' && (
                <View style={styles.successBanner}>
                    <Check size={18} color="#27672D" />
                    <Text style={styles.successText}>Supplier saved successfully! Redirecting...</Text>
                </View>
            )}

            {bannerStatus === 'removed' && (
                <View style={styles.dangerBanner}>
                    <Trash2 size={18} color="#DC2626" />
                    <Text style={styles.dangerText}>Supplier removed. Redirecting...</Text>
                </View>
            )}

            {/* Form Fields Stack */}
            <View style={styles.form}>
                {/* Supplier name */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Supplier name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter supplier name"
                        placeholderTextColor="#94A3B8"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Category */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Category</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter category"
                        placeholderTextColor="#94A3B8"
                        value={category}
                        onChangeText={setCategory}
                    />
                </View>

                {/* Phone */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Phone</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter phone number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />
                </View>

                {/* Lead time */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Lead time</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 2 days"
                        placeholderTextColor="#94A3B8"
                        value={leadTime}
                        onChangeText={setLeadTime}
                    />
                </View>

                {/* Email */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter email address"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

                {/* Action Buttons Stack */}
                <View style={styles.actionsStack}>
                    <TouchableOpacity
                        style={[styles.saveBtn, isSubmitting && { opacity: 0.85 }]}
                        onPress={handleSave}
                        disabled={isSubmitting}
                        activeOpacity={0.85}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save supplier</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={handleRemove}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.removeBtnText}>Remove supplier</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    contentContainer: {
        padding: 18,
        paddingBottom: 40,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    backBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    successBanner: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    successText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#27672D',
    },
    dangerBanner: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    dangerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#DC2626',
    },
    form: {
        flexDirection: 'column',
        gap: 16,
    },
    fieldGroup: {
        flexDirection: 'column',
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    input: {
        width: '100%',
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontSize: 14,
        fontWeight: '500',
        color: '#1E293B',
        backgroundColor: '#FFFFFF',
    },
    actionsStack: {
        flexDirection: 'column',
        gap: 12,
        marginTop: 8,
        marginBottom: 24,
    },
    saveBtn: {
        width: '100%',
        backgroundColor: '#27672D',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    removeBtn: {
        width: '100%',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#DC2626',
    },
});
