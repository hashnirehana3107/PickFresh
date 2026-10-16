import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import {
    ArrowLeft,
    CheckCheck,
    Trash2,
    ShoppingBag,
    AlertTriangle,
    Truck,
    ChevronRight,
} from 'lucide-react-native';

export default function ShopOwnerNotificationsPage({
    onNavigate,
    onBack,
    notifications = [],
    onMarkAllRead,
    onClearAll,
    onSelectNotification,
}) {
    const [filter, setFilter] = useState('all'); // all, orders, stock, suppliers

    const filteredNotifs = notifications.filter((n) => {
        if (filter === 'orders') return n.type === 'order';
        if (filter === 'stock') return n.type === 'stock';
        if (filter === 'suppliers') return n.type === 'supplier';
        return true;
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (onNavigate) {
            onNavigate('home');
        }
    };

    const handleCardClick = (notif) => {
        if (onSelectNotification) {
            onSelectNotification(notif);
        } else if (onNavigate) {
            if (notif.targetTab) {
                onNavigate(notif.targetTab);
            } else if (notif.type === 'order') {
                onNavigate('orders');
            } else if (notif.type === 'stock') {
                onNavigate('inventory');
            } else if (notif.type === 'supplier') {
                onNavigate('suppliers');
            }
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Navigation */}
            <View style={styles.headerNav}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleBack}
                    accessibilityLabel="Back to dashboard"
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Notifications</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterBar}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                >
                    <TouchableOpacity
                        style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                            All ({notifications.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, filter === 'orders' && styles.filterChipActive]}
                        onPress={() => setFilter('orders')}
                    >
                        <Text style={[styles.filterChipText, filter === 'orders' && styles.filterChipTextActive]}>
                            Orders
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, filter === 'stock' && styles.filterChipActive]}
                        onPress={() => setFilter('stock')}
                    >
                        <Text style={[styles.filterChipText, filter === 'stock' && styles.filterChipTextActive]}>
                            Stock Alerts
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, filter === 'suppliers' && styles.filterChipActive]}
                        onPress={() => setFilter('suppliers')}
                    >
                        <Text style={[styles.filterChipText, filter === 'suppliers' && styles.filterChipTextActive]}>
                            Suppliers
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Action Bar */}
            <View style={styles.actionsRow}>
                <Text style={styles.unreadSummary}>
                    {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </Text>
                <View style={styles.actionBtns}>
                    {unreadCount > 0 && (
                        <TouchableOpacity style={styles.textBtn} onPress={onMarkAllRead}>
                            <CheckCheck size={14} color="#27672D" />
                            <Text style={styles.markReadText}>Mark read</Text>
                        </TouchableOpacity>
                    )}
                    {notifications.length > 0 && (
                        <TouchableOpacity style={styles.textBtn} onPress={onClearAll}>
                            <Trash2 size={14} color="#DC2626" />
                            <Text style={styles.clearText}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Notifications List Stack */}
            <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredNotifs.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>No notifications found.</Text>
                    </View>
                ) : (
                    filteredNotifs.map((notif) => {
                        const isUnread = !notif.read;
                        return (
                            <TouchableOpacity
                                key={notif.id}
                                style={[styles.cardItem, isUnread && styles.cardItemUnread]}
                                onPress={() => handleCardClick(notif)}
                                activeOpacity={0.88}
                            >
                                <View style={styles.cardIconBox}>
                                    {notif.type === 'order' && <ShoppingBag size={20} color="#27672D" />}
                                    {notif.type === 'stock' && <AlertTriangle size={20} color="#D97706" />}
                                    {notif.type === 'supplier' && <Truck size={20} color="#2563EB" />}
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle} numberOfLines={1}>
                                            {notif.title}
                                        </Text>
                                        <Text style={styles.cardTime}>{notif.time}</Text>
                                    </View>
                                    <Text style={styles.cardMsg}>{notif.message}</Text>
                                    <View style={styles.cardActionBtn}>
                                        <Text style={styles.cardActionBtnText}>
                                            {notif.type === 'order' && 'View Order'}
                                            {notif.type === 'stock' && 'Manage Inventory'}
                                            {notif.type === 'supplier' && 'Track Delivery'}
                                        </Text>
                                        <ChevronRight size={13} color="#FFFFFF" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
        paddingHorizontal: 18,
        paddingTop: 18,
    },
    headerNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
    },
    backBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBar: {
        marginBottom: 16,
    },
    filterScroll: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 4,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    filterChipActive: {
        backgroundColor: '#27672D',
        borderColor: '#27672D',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    unreadSummary: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    actionBtns: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    textBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    markReadText: {
        color: '#27672D',
        fontSize: 12,
        fontWeight: '700',
    },
    clearText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '700',
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 24,
        gap: 12,
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748B',
    },
    cardItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    cardItemUnread: {
        backgroundColor: '#F0FDF4',
        borderColor: '#86EFAC',
    },
    cardIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FAFBF8',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBody: {
        flex: 1,
        flexDirection: 'column',
        gap: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
        marginRight: 6,
    },
    cardTime: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    cardMsg: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 17,
    },
    cardActionBtn: {
        alignSelf: 'flex-start',
        marginTop: 6,
        backgroundColor: '#27672D',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardActionBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
});
