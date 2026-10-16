import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { API_BASE_URL } from '../../config/api';

export default function DeleteProductPage({ onNavigate, product }) {
    const productName = product?.name || 'Coca-Cola 1.5L';
    const [isDeleted, setIsDeleted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleDeletePermanently = async () => {
        setIsSubmitting(true);
        try {
            const prodId = product?._id || product?.id;
            if (prodId) {
                await fetch(`${API_BASE_URL}/product-inventory/products/${prodId}`, {
                    method: 'DELETE',
                });
            }
        } catch (err) {
            console.warn('Delete product error:', err);
        } finally {
            setIsSubmitting(false);
            setIsDeleted(true);
            setTimeout(() => {
                if (onNavigate) onNavigate('product_list', { deletedProductId: prodId, refresh: true });
            }, 500);
        }
    };

    const handleCancel = () => {
        if (onNavigate) onNavigate('edit_product', { product });
    };

    return (
        <View style={styles.container}>
            {/* Top Page Header Title */}
            <View>
                <Text style={styles.pageTitle}>Delete product?</Text>
            </View>

            {isDeleted ? (
                <View style={styles.successBanner}>
                    <Check size={20} color="#27672D" />
                    <Text style={styles.successText}>
                        Product permanently removed! Redirecting...
                    </Text>
                </View>
            ) : (
                /* Center Warning Content */
                <View style={styles.centerContent}>
                    {/* Large Red Circle with Exclamation Mark ! */}
                    <View style={styles.redCircle}>
                        <Text style={styles.exclamationMark}>!</Text>
                    </View>

                    <Text style={styles.itemTitle}>Remove {productName}?</Text>

                    <Text style={styles.warningMsg}>
                        This action permanently removes the product from inventory and cannot be undone.
                    </Text>
                </View>
            )}

            {/* Bottom Action Buttons Stack */}
            <View style={styles.actionsGroup}>
                <TouchableOpacity
                    style={[styles.deleteBtn, isSubmitting && { opacity: 0.85 }]}
                    onPress={handleDeletePermanently}
                    disabled={isSubmitting || isDeleted}
                    activeOpacity={0.85}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.deleteBtnText}>Delete permanently</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
        padding: 18,
        paddingBottom: 36,
        justifyContent: 'space-between',
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    successBanner: {
        backgroundColor: '#E8F5E9',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    successText: {
        color: '#27672D',
        fontWeight: '700',
        fontSize: 14,
    },
    centerContent: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    redCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#D9383A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        shadowColor: '#D9383A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 6,
    },
    exclamationMark: {
        color: '#FFFFFF',
        fontSize: 42,
        fontWeight: '800',
        lineHeight: 48,
    },
    itemTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    warningMsg: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        maxWidth: 290,
        lineHeight: 18,
        fontWeight: '500',
    },
    actionsGroup: {
        flexDirection: 'column',
        gap: 10,
        marginBottom: 24,
    },
    deleteBtn: {
        width: '100%',
        backgroundColor: '#D9383A',
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#D9383A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 3,
    },
    deleteBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cancelBtn: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#D9383A',
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#D9383A',
    },
});
