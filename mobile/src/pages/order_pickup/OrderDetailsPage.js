import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Clock,
    Phone,
    Package,
    RefreshCw,
} from 'lucide-react-native';
import { API_BASE_URL } from '../../config/api';

export default function OrderDetailsPage({ onNavigate, order, onBack }) {
    const [currentOrder, setCurrentOrder] = useState(order || {
        id: 'PF-1028',
        customerName: 'Kiara Fernando',
        phone: '0772345445',
        pickupTime: '4:00 PM - 4:30 PM',
        status: 'PENDING',
        items: [],
    });

    useEffect(() => {
        if (order) {
            const initialAvatar =
                order.customerAvatar ||
                order.customerImage ||
                (order.rawOrder && (order.rawOrder.customerAvatar || order.rawOrder.customerImage)) ||
                '';

            setCurrentOrder((prev) => ({
                ...prev,
                ...order,
                customerAvatar: initialAvatar || prev.customerAvatar || '',
                customerImage: initialAvatar || prev.customerImage || '',
            }));

            const targetId = order.dbId || order._id || order.id || order.orderNumber;
            if (targetId) {
                fetch(`${API_BASE_URL}/orders/${targetId}`)
                    .then((res) => res.json())
                    .then((data) => {
                        if (data.success && data.order) {
                            const fetchedAvatar = data.order.customerAvatar || data.order.customerImage || '';
                            setCurrentOrder((prev) => ({
                                ...prev,
                                status: data.order.status || prev.status,
                                dbId: data.order._id || prev.dbId,
                                customerAvatar: fetchedAvatar || prev.customerAvatar || initialAvatar,
                                customerImage: fetchedAvatar || prev.customerImage || initialAvatar,
                                customerName: data.order.customerName || prev.customerName,
                                phone: data.order.customerPhone || prev.phone,
                                pickupTime: data.order.pickupTimeSlot || prev.pickupTime,
                                rawOrder: data.order,
                            }));
                        }
                    })
                    .catch((err) => console.warn('Order status sync error:', err));
            }
        }
    }, [order]);

    // Format dynamic items safely preventing duplicate unit text like (1kg) (1kg)
    const rawItems = currentOrder.items || (currentOrder.rawOrder && currentOrder.rawOrder.items) || [];

    const formattedItems =
        Array.isArray(rawItems) && rawItems.length > 0
            ? rawItems.map((it) => {
                  if (typeof it === 'string') {
                      return { name: it, quantity: 1 };
                  }
                  let name = it.name || 'Grocery Item';
                  const qty = it.quantity || 1;
                  const unit = (it.unit || '').trim();
                  if (unit && !name.toLowerCase().includes(unit.toLowerCase())) {
                      name = `${name} (${unit})`;
                  }
                  return {
                      name,
                      quantity: qty,
                      price: it.price ? `Rs. ${(it.price * qty).toLocaleString()}` : null,
                      image: it.image || it.productImage || (it.product && it.product.image) || null,
                  };
              })
            : [
                  { name: 'Fresh Milk (1L)', quantity: 1, price: 'Rs. 450' },
                  { name: 'Keeri Samba Rice (5kg)', quantity: 1, price: 'Rs. 1,450' },
              ];

    const getStatusBadgeConfig = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        if (s.includes('collect') || s.includes('complete')) {
            return { bg: '#F3E8FF', color: '#6B21A8', border: '#D8B4FE', label: 'COLLECTED' };
        }
        if (s.includes('ready')) {
            return { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: 'READY FOR PICKUP' };
        }
        if (s.includes('prep') || s.includes('pack')) {
            return { bg: '#E0E7FF', color: '#3730A3', border: '#A5B4FC', label: 'PREPARING' };
        }
        if (s.includes('accept')) {
            return { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD', label: 'ACCEPTED' };
        }
        if (s.includes('cancel')) {
            return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'CANCELLED' };
        }
        return { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D', label: 'PENDING' };
    };

    const badge = getStatusBadgeConfig(currentOrder.status);

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('dashboard');
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
            {/* 🔝 Top Navigation Bar matching React Web */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.subTag}>Order Details</Text>
                    <Text style={styles.pageTitle}>Order #{currentOrder.id || 'PF-1028'}</Text>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleBack}
                    activeOpacity={0.7}
                    accessibilityLabel="Back to dashboard"
                >
                    <ArrowLeft size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* 📜 Scrollable Content Area */}
            <ScrollView
                style={styles.scrollableBody}
                contentContainerStyle={styles.scrollableContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Current Status Banner matching React Web */}
                <View
                    style={[
                        styles.statusBanner,
                        {
                            backgroundColor: badge.bg,
                            borderColor: badge.border,
                        },
                    ]}
                >
                    <Text style={[styles.statusBannerText, { color: badge.color }]}>
                        Current Status: <Text style={styles.statusBold}>{badge.label}</Text>
                    </Text>
                </View>

                {/* Customer Information Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Customer Information</Text>
                    <View style={styles.customerRow}>
                        <View style={styles.avatar}>
                            <Image
                                source={{ uri: resolvedAvatar }}
                                style={styles.avatarImg}
                                resizeMode="cover"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.customerName}>
                                {currentOrder.customerName || 'Kiara Fernando'}
                            </Text>
                            <View style={styles.phoneRow}>
                                <Phone size={13} color="#64748B" />
                                <Text style={styles.phoneText}>{currentOrder.phone || '0772345445'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Ordered Items Section */}
                <View style={styles.itemsSection}>
                    <View style={styles.itemsSectionHeader}>
                        <Text style={styles.sectionTitle}>Ordered Items</Text>
                        <View style={styles.itemsCountBadge}>
                            <Text style={styles.itemsCountText}>
                                {formattedItems.length} {formattedItems.length === 1 ? 'item' : 'items'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.itemsList}>
                        {formattedItems.map((item, index) => (
                            <View key={index} style={styles.itemCard}>
                                <View style={styles.itemLeft}>
                                    <View style={styles.itemIconBox}>
                                        {item.image ? (
                                            <Image
                                                source={{ uri: item.image }}
                                                style={styles.itemThumbnail}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Package size={20} color="#27672D" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemTitle}>{item.name}</Text>
                                        {item.price ? <Text style={styles.itemPrice}>{item.price}</Text> : null}
                                    </View>
                                </View>
                                <View style={styles.itemQtyBadge}>
                                    <Text style={styles.itemQtyText}>× {item.quantity}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Scheduled Pickup Slot Banner */}
                <View style={styles.pickupCard}>
                    <View style={styles.pickupIconBox}>
                        <Clock size={20} color="#27672D" />
                    </View>
                    <View>
                        <Text style={styles.pickupLabel}>Scheduled Pickup Slot</Text>
                        <Text style={styles.pickupTime}>{currentOrder.pickupTime || '4:00 PM - 4:30 PM'}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* 🔒 Fixed Bottom Action Bar matching React Web */}
            <View style={styles.actionsGroup}>
                <TouchableOpacity
                    style={styles.updateBtn}
                    onPress={() =>
                        onNavigate &&
                        onNavigate('status_update', {
                            order: {
                                ...currentOrder,
                                customerAvatar: resolvedAvatar,
                                customerImage: resolvedAvatar,
                            },
                        })
                    }
                    activeOpacity={0.85}
                >
                    <RefreshCw size={18} color="#FFFFFF" />
                    <Text style={styles.updateBtnText}>Update order status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.dashboardBtn}
                    onPress={handleBack}
                    activeOpacity={0.85}
                >
                    <ArrowLeft size={18} color="#27672D" />
                    <Text style={styles.dashboardBtnText}>Back to Dashboard</Text>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        zIndex: 10,
    },
    subTag: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
        marginTop: 1,
    },
    backBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollableBody: {
        flex: 1,
    },
    scrollableContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'android' ? 44 : 24,
        gap: 14,
    },
    statusBanner: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusBannerText: {
        fontSize: 13,
        fontWeight: '600',
    },
    statusBold: {
        fontWeight: '800',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    cardLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },
    phoneText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    itemsSection: {
        gap: 12,
    },
    itemsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.2,
    },
    itemsCountBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
    },
    itemsCountText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#27672D',
    },
    itemsList: {
        gap: 10,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    itemIconBox: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    itemThumbnail: {
        width: '100%',
        height: '100%',
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    itemPrice: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 1,
    },
    itemQtyBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    itemQtyText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#27672D',
    },
    pickupCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#C8E6C9',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },
    pickupIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickupLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    pickupTime: {
        fontSize: 15,
        fontWeight: '800',
        color: '#27672D',
        marginTop: 1,
    },
    actionsGroup: {
        flexDirection: 'column',
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'android' ? 24 : 14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 6,
    },
    updateBtn: {
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
    updateBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    dashboardBtn: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#27672D',
        borderRadius: 16,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    dashboardBtnText: {
        color: '#27672D',
        fontSize: 15,
        fontWeight: '700',
    },
});
