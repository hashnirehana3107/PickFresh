import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    Image,
    Platform,
} from 'react-native';
import { Trash2, AlertTriangle, X, Package } from 'lucide-react-native';

export default function DeleteProductModal({ isOpen, onClose, onConfirm, product }) {
    if (!isOpen || !product) return null;

    return (
        <Modal visible={isOpen} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <X size={18} color="#64748B" />
                    </TouchableOpacity>

                    <View style={styles.iconCircle}>
                        <Trash2 size={26} color="#DC2626" />
                    </View>

                    <Text style={styles.title}>Delete Product?</Text>
                    <Text style={styles.subtitle}>
                        Are you sure you want to permanently remove this item from your store inventory?
                    </Text>

                    <View style={styles.productSnippet}>
                        <View style={styles.snippetImgWrap}>
                            {product.image && (typeof product.image === 'string' && (product.image.startsWith('http') || product.image.startsWith('data:'))) ? (
                                <Image
                                    source={{ uri: product.image }}
                                    style={styles.snippetImg}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Package size={22} color="#166534" />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                            <Text style={styles.productStock}>
                                Current Stock: {product.stock !== undefined ? product.stock : (product.stockQuantity || 0)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.warningBox}>
                        <AlertTriangle size={16} color="#B45309" />
                        <Text style={styles.warningText}>
                            This action cannot be undone. Customers will no longer be able to find or order this item.
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Keep Product</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => {
                                if (onConfirm) onConfirm(product._id || product.id);
                                if (onClose) onClose();
                            }}
                        >
                            <Text style={styles.deleteBtnText}>Yes, Delete</Text>
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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 20,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)' } : {}),
    },
    card: {
        width: '100%',
        maxWidth: 335,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 22,
        alignItems: 'center',
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
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12.5,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 14,
    },
    productSnippet: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },
    snippetImgWrap: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    snippetImg: {
        width: '100%',
        height: '100%',
    },
    productName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    productMeta: {
        fontSize: 11.5,
        color: '#64748B',
        marginTop: 1,
    },
    productStock: {
        fontSize: 11,
        color: '#27672D',
        fontWeight: '700',
        marginTop: 2,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 12,
        padding: 10,
        marginBottom: 16,
        width: '100%',
    },
    warningText: {
        flex: 1,
        fontSize: 11,
        color: '#92400E',
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    deleteBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#DC2626',
        alignItems: 'center',
    },
    deleteBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
