import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { ArrowLeft, ShoppingCart, Store, Truck, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function RoleSelectScreen({ onNavigate, selectedRole = 'customer', onSelectRole }) {
    const { switchRole } = useAuth();
    const currentRole = selectedRole || 'customer';

    const handleSelectRole = (key) => {
        if (onSelectRole) onSelectRole(key);
        if (switchRole) switchRole(key);
    };

    const roles = [
        {
            key: 'customer',
            title: 'Customer',
            desc: 'Pre-order items, skip queues & track live order status.',
            icon: ShoppingCart,
        },
        {
            key: 'shop_owner',
            title: 'Shop Owner / Employee',
            desc: 'Manage your store & orders',
            icon: Store,
        },
        {
            key: 'supplier',
            title: 'Product Supplier',
            desc: 'Supply & restock local stores',
            icon: Truck,
        },
    ];

    return (
        <View style={styles.container}>
            {/* Top Back Navigation */}
            <View style={styles.topNav}>
                <TouchableOpacity
                    onPress={() => onNavigate('welcome')}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={22} color="#0F172A" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Text */}
                <View style={styles.header}>
                    <Text style={styles.title}>Select Your Role</Text>
                    <Text style={styles.subtitle}>Choose how you want to use PickFresh</Text>
                </View>

                {/* Role Options */}
                <View style={styles.optionsList}>
                    {roles.map((item) => {
                        const IconComponent = item.icon;
                        const isSelected = currentRole === item.key;

                        return (
                            <TouchableOpacity
                                key={item.key}
                                style={[styles.roleCard, isSelected && styles.roleCardActive]}
                                onPress={() => handleSelectRole(item.key)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.roleCardLeft}>
                                    <View style={styles.iconBadge}>
                                        <IconComponent size={22} color="#2E7D32" />
                                    </View>
                                    <View style={styles.roleTextWrap}>
                                        <Text style={styles.roleTitle}>{item.title}</Text>
                                        <Text style={styles.roleDesc}>{item.desc}</Text>
                                    </View>
                                </View>

                                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    style={styles.continueBtn}
                    onPress={() => onNavigate('signup', { role: currentRole })}
                    activeOpacity={0.85}
                >
                    <Text style={styles.continueBtnText}>Continue</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    topNav: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 4,
    },
    backBtn: {
        padding: 6,
        marginLeft: -6,
        alignSelf: 'flex-start',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'android' ? 95 : 28,
        flexGrow: 1,
    },
    header: {
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 32,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 6,
        fontWeight: '500',
        textAlign: 'center',
    },
    optionsList: {
        gap: 16,
        marginBottom: 32,
    },
    roleCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    roleCardActive: {
        borderColor: '#2E7D32',
        backgroundColor: '#F3FAF3',
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 3,
    },
    roleCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 14,
        paddingRight: 10,
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleTextWrap: {
        flex: 1,
        gap: 3,
    },
    roleTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
    },
    roleDesc: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
    },
    radioCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleActive: {
        borderColor: '#2E7D32',
        backgroundColor: '#2E7D32',
    },
    continueBtn: {
        backgroundColor: '#2E7D32',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 'auto',
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
        elevation: 4,
    },
    continueBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
