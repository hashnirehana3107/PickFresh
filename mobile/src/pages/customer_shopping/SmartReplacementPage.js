import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native';
import {
    ArrowLeft,
    Sparkles,
    Tag,
    CheckCircle2,
    Circle,
    Store,
    ArrowRight,
} from 'lucide-react-native';
import { API_BASE_URL } from '../../config/api';

const extractCoreKeywords = (nameStr = '') => {
    if (!nameStr) return [];
    const ignoreWords = new Set([
        'anchor', 'highland', 'maliban', 'munchee', 'keells', 'ratthi', 'elephant', 'house',
        'coca-cola', 'coke', 'sunquick', 'kist', 'astra', 'maggi', 'md', 'surf', 'excel',
        'vim', 'sunlight', 'signal', 'kotmale', 'bairaha', 'prima', 'nestle', 'milo',
        'laksala', 'pelwatte', 'harischandra', 'mccurrie', 'dilmah', 'zesta', 'watawala',
        '1kg', '500g', '250g', '100g', '1l', '500ml', 'pack', 'bottle', 'loaf', 'bag', 'liter', 'item', 'fresh', 'organic', 'salted', 'unsalted'
    ]);
    const words = nameStr.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3);
    const coreKeywords = words.filter((w) => !ignoreWords.has(w));
    return coreKeywords.length > 0 ? coreKeywords : words;
};

function resolveAlternativeImage(p) {
    const raw = p?.image || p?.imageUrl;
    if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:'))) {
        return { uri: raw };
    }
    const cat = (p?.category || '').toLowerCase();
    const name = (p?.name || '').toLowerCase();
    if (name.includes('tomato') || name.includes('carrot') || cat.includes('veg')) {
        return require('../../../assets/vegetables.jpg');
    }
    if (name.includes('apple') || cat.includes('fruit')) {
        return require('../../../assets/fruits.webp');
    }
    if (name.includes('milk') || cat.includes('dairy')) {
        return require('../../../assets/highland_milk.png');
    }
    if (name.includes('chicken') || name.includes('meat')) {
        return require('../../../assets/meat.webp');
    }
    return require('../../../assets/fresh_produce_hero.png');
}

export default function SmartReplacementPage({
    itemToReplace,
    onNavigate,
    onReplaceItem,
}) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [alternativesList, setAlternativesList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const originalName = itemToReplace?.name || 'Fresh Product';
    const category = itemToReplace?.category || '';
    const currentBrand = itemToReplace?.brand || '';
    const targetStoreName = itemToReplace?.storeName || '';

    useEffect(() => {
        let isMounted = true;

        const fetchRealDatabaseAlternatives = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/product-inventory/products`);
                const data = await res.json();

                if (data.success && Array.isArray(data.products) && isMounted) {
                    const coreKeywords = extractCoreKeywords(originalName);

                    let storeFiltered = data.products.filter((p) => {
                        const isExactSame = p.name === originalName || p._id === itemToReplace?.id || p.id === itemToReplace?.id;
                        if (isExactSame) return false;

                        if (!targetStoreName) return true;
                        const pStoreClean = (p.storeName || p.storeEmail || '').toLowerCase().replace(/\s+/g, '');
                        const tStoreClean = targetStoreName.toLowerCase().replace(/\s+/g, '');
                        return !pStoreClean || pStoreClean.includes(tStoreClean) || tStoreClean.includes(pStoreClean);
                    });

                    const candidatePool = storeFiltered.length > 0 ? storeFiltered : data.products.filter((p) => p.name !== originalName && p._id !== itemToReplace?.id);

                    const matchedProducts = candidatePool
                        .filter((p) => {
                            const pNameLower = (p.name || '').toLowerCase();
                            const pCatLower = (p.category || '').toLowerCase();
                            const targetCatLower = category.toLowerCase();

                            const hasNameWord = coreKeywords.some((kw) => pNameLower.includes(kw));
                            const hasSameCat = targetCatLower && (pCatLower.includes(targetCatLower) || targetCatLower.includes(pCatLower));

                            return hasNameWord || hasSameCat;
                        })
                        .map((p) => {
                            const pNameLower = (p.name || '').toLowerCase();
                            const matchedWord = coreKeywords.find((kw) => pNameLower.includes(kw));

                            return {
                                id: p.id || p._id,
                                name: p.name,
                                brand: p.brand || (p.name ? p.name.split(' ')[0] : 'Store Product'),
                                category: p.category || category || 'Store Inventory',
                                price: p.price,
                                stock: p.stock !== undefined ? p.stock : (p.available !== undefined ? p.available : 50),
                                matchPercentage: matchedWord ? 98 : 92,
                                image: p.image || p.imageUrl,
                                priceNote: matchedWord ? `Same Type: "${matchedWord.toUpperCase()}"` : (p.brand ? `Brand: ${p.brand}` : 'Same Category'),
                                storeName: p.storeName || targetStoreName || 'PickFresh Super',
                            };
                        });

                    matchedProducts.sort((a, b) => b.matchPercentage - a.matchPercentage);
                    setAlternativesList(matchedProducts);
                }
            } catch (err) {
                // Fallback default alternatives if database offline
                if (isMounted) {
                    setAlternativesList([
                        {
                            id: 'alt_1',
                            name: 'Highland Fresh Whole Milk',
                            brand: 'Highland',
                            category: 'Dairy',
                            price: 450,
                            matchPercentage: 98,
                            priceNote: 'Same Type: "PASTEURIZED WHOLE MILK"',
                        },
                        {
                            id: 'alt_2',
                            name: 'Kotmale Pure Fresh Milk',
                            brand: 'Kotmale',
                            category: 'Dairy',
                            price: 430,
                            matchPercentage: 94,
                            priceNote: 'Same Type: "FRESH MILK 1L"',
                        },
                    ]);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchRealDatabaseAlternatives();
        return () => { isMounted = false; };
    }, [itemToReplace, category, currentBrand, originalName, targetStoreName]);

    const handleUseAlternative = () => {
        if (alternativesList.length === 0) return;
        const chosen = alternativesList[selectedIndex];
        if (onReplaceItem && chosen) {
            onReplaceItem(chosen, itemToReplace?.id);
        }
        if (onNavigate) {
            onNavigate('cart');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>Smart replacement</Text>
                    <Text style={styles.headerSubtitle}>
                        Substitute low-stock items with top-rated live inventory
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('cart')}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Out of Stock Alert Box */}
                <View style={styles.alertCard}>
                    <View style={styles.alertTitleRow}>
                        <Sparkles size={18} color="#B45309" />
                        <Text style={styles.alertTitle}>Low Stock Notice: {originalName}</Text>
                    </View>
                    <Text style={styles.alertDesc}>
                        The store is running low on your requested quantity. Select an instant fresh alternative from live MongoDB store inventory:
                    </Text>
                </View>

                {/* Alternatives List */}
                {isLoading ? (
                    <ActivityIndicator size="large" color="#2D7B38" style={{ marginTop: 40 }} />
                ) : alternativesList.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyTitle}>No exact alternative found</Text>
                        <Text style={styles.emptySub}>Please check back soon as inventory is refreshed continuously.</Text>
                    </View>
                ) : (
                    <View style={styles.altList}>
                        {alternativesList.map((item, idx) => {
                            const isSelected = selectedIndex === idx;
                            const imgSrc = resolveAlternativeImage(item);

                            return (
                                <TouchableOpacity
                                    key={item.id || idx}
                                    style={[styles.altCard, isSelected && styles.altCardSelected]}
                                    onPress={() => setSelectedIndex(idx)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.radioBox}>
                                        {isSelected ? (
                                            <CheckCircle2 size={22} color="#2D7B38" />
                                        ) : (
                                            <Circle size={22} color="#CBD5E1" />
                                        )}
                                    </View>

                                    <Image
                                        source={imgSrc}
                                        style={styles.altImg}
                                        resizeMode="cover"
                                    />

                                    <View style={styles.altInfo}>
                                        <View style={styles.topRow}>
                                            <View style={styles.brandTag}>
                                                <Tag size={10} color="#166534" />
                                                <Text style={styles.brandTagText}>{item.brand}</Text>
                                            </View>
                                            <View style={styles.matchBadge}>
                                                <Text style={styles.matchBadgeText}>
                                                    {item.matchPercentage}% MATCH
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={styles.altName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.altMeta} numberOfLines={1}>
                                            {item.category} • {item.priceNote}
                                        </Text>

                                        <View style={styles.altFooter}>
                                            <Text style={styles.altPrice}>Rs. {item.price}</Text>
                                            <Text style={styles.stockText}>
                                                In stock: {item.stock || 25}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={handleUseAlternative}
                    disabled={alternativesList.length === 0}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryActionBtnText}>
                        Apply Smart Swap
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitleBox: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 90,
    },
    alertCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
        marginBottom: 16,
    },
    alertTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    alertTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#92400E',
    },
    alertDesc: {
        fontSize: 12,
        color: '#B45309',
        lineHeight: 17,
    },
    altList: {
        gap: 12,
    },
    altCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    altCardSelected: {
        borderColor: '#2D7B38',
        backgroundColor: '#F7FCF7',
    },
    radioBox: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    altImg: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    altInfo: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    brandTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    brandTagText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#166534',
    },
    matchBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    matchBadgeText: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#15803D',
    },
    altName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    altMeta: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    altFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    altPrice: {
        fontSize: 14,
        fontWeight: '800',
        color: '#2D7B38',
    },
    stockText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    emptyBox: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
        marginTop: 10,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    emptySub: {
        fontSize: 12.5,
        color: '#64748B',
        textAlign: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 20,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 8,
    },
    primaryActionBtn: {
        backgroundColor: '#2D7B38',
        borderRadius: 14,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryActionBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
