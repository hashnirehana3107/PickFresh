import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { Plus, Star, Leaf } from 'lucide-react-native';

export default function ProductCard({ product, onSelect, onAddToCart }) {
    if (!product) return null;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onSelect}
            activeOpacity={0.88}
        >
            {/* Top Farm & Ripeness Badge */}
            <View style={styles.badgeRow}>
                <View style={styles.badgePill}>
                    <Leaf size={10} color="#2E7D32" />
                    <Text style={styles.badgePillText}>Organic</Text>
                </View>
                <View style={styles.ratingRow}>
                    <Star size={10} color="#EAB308" fill="#EAB308" />
                    <Text style={styles.ratingText}>{product.rating || '4.8'}</Text>
                </View>
            </View>

            {/* Product Produce Icon / Image */}
            <View style={styles.imgWrapper}>
                <Text style={styles.emoji}>{product.image || '🥗'}</Text>
            </View>

            {/* Title & Farm Name */}
            <View style={styles.infoWrapper}>
                <Text style={styles.farmName} numberOfLines={1}>
                    {product.farm || 'Local Organic Farm'}
                </Text>
                <Text style={styles.title} numberOfLines={1}>
                    {product.name}
                </Text>
                <Text style={styles.ripeness} numberOfLines={1}>
                    {product.ripeness || 'Harvested Fresh'}
                </Text>
            </View>

            {/* Price & Add Button */}
            <View style={styles.bottomRow}>
                <View style={styles.priceGroup}>
                    <Text style={styles.price}>Rs. {product.price}</Text>
                    <Text style={styles.unit}>/ {product.unit || 'kg'}</Text>
                </View>

                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={(e) => {
                        e.stopPropagation?.();
                        if (onAddToCart) onAddToCart(product);
                    }}
                    activeOpacity={0.8}
                >
                    <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F0F4EF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        justifyContent: 'space-between',
        flex: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    badgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgePillText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#2E7D32',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
    },
    imgWrapper: {
        width: '100%',
        height: 80,
        backgroundColor: '#F8FAF7',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emoji: {
        fontSize: 42,
    },
    infoWrapper: {
        gap: 2,
        marginBottom: 8,
    },
    farmName: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
    },
    title: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 16,
    },
    ripeness: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '600',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: 6,
    },
    priceGroup: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    price: {
        fontSize: 14,
        fontWeight: '800',
        color: '#2E7D32',
    },
    unit: {
        fontSize: 10,
        color: '#64748B',
    },
    addBtn: {
        backgroundColor: '#2E7D32',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    addBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
