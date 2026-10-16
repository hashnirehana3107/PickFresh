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
    Bell,
    ShoppingBag,
    Tag,
    Sparkles,
    Trash2,
    ChevronRight,
} from 'lucide-react-native';

export default function NotificationsPage({
    onNavigate,
    notifications = [],
    onMarkAsRead,
    onClearAll,
    onNotificationAction,
}) {
    const [activeTab, setActiveTab] = useState('All');

    const filtered = notifications.filter((item) => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Orders') return item.type === 'order';
        if (activeTab === 'Offers') return item.type === 'offer';
        if (activeTab === 'System') return item.type === 'system';
        return true;
    });

    const getIcon = (type) => {
        switch (type) {
            case 'order':
                return <ShoppingBag size={20} color="#2D7B38" />;
            case 'offer':
                return <Tag size={20} color="#E65100" />;
            case 'system':
                return <Sparkles size={20} color="#7B1FA2" />;
            default:
                return <Bell size={20} color="#2D7B38" />;
        }
    };

    const getIconBg = (type) => {
        switch (type) {
            case 'order':
                return '#E8F5E9';
            case 'offer':
                return '#FFF3E0';
            case 'system':
                return '#F3E5F5';
            default:
                return '#E8F5E9';
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Header matching exact Web & Screenshot Image 3 */}
            <View style={styles.header}>
                <View style={styles.headerTitleGroup}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <Text style={styles.headerSubtitle}>Stay updated on orders & fresh deals</Text>
                </View>

                <View style={styles.headerActions}>
                    {notifications.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearBtn}
                            onPress={onClearAll}
                            activeOpacity={0.7}
                        >
                            <Trash2 size={14} color="#64748B" />
                            <Text style={styles.clearBtnText}>Clear all</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => onNavigate && onNavigate('home')}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={20} color="#1E293B" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsRow}>
                {['All', 'Orders', 'Offers', 'System'].map((tab) => {
                    const count =
                        tab === 'All'
                            ? notifications.length
                            : notifications.filter((n) =>
                                tab === 'Orders'
                                    ? n.type === 'order'
                                    : tab === 'Offers'
                                        ? n.type === 'offer'
                                        : n.type === 'system'
                            ).length;

                    const isActive = activeTab === tab;

                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabChip, isActive && styles.tabChipActive]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.tabChipText,
                                    isActive && styles.tabChipTextActive,
                                ]}
                            >
                                {tab}
                            </Text>
                            {count > 0 && (
                                <View
                                    style={[
                                        styles.tabCountBadge,
                                        isActive && styles.tabCountBadgeActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.tabCountText,
                                            isActive && styles.tabCountTextActive,
                                        ]}
                                    >
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Notifications List */}
            {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                        <Bell size={36} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>No notifications yet</Text>
                    <Text style={styles.emptySub}>
                        We'll inform you when your order status updates or new offers arrive!
                    </Text>
                    <TouchableOpacity
                        style={styles.btnEmptyShop}
                        onPress={() => onNavigate && onNavigate('home')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnEmptyShopText}>Explore Fresh Deals</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {filtered.map((item) => {
                        const isUnread = !item.read;

                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.notifCard, isUnread && styles.notifCardUnread]}
                                onPress={() => onMarkAsRead && onMarkAsRead(item.id)}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.notifIconAvatar, { backgroundColor: getIconBg(item.type) }]}>
                                    {getIcon(item.type)}
                                </View>

                                <View style={styles.notifContent}>
                                    <View style={styles.notifCardTop}>
                                        <Text style={styles.notifTitle}>{item.title}</Text>
                                        <Text style={styles.notifTime}>{item.time}</Text>
                                    </View>
                                    <Text style={styles.notifMessage}>{item.message}</Text>

                                    {item.actionText && (
                                        <TouchableOpacity
                                            style={styles.notifCardActionBtn}
                                            onPress={() => {
                                                if (onMarkAsRead) onMarkAsRead(item.id);
                                                if (onNotificationAction) {
                                                    onNotificationAction(item.actionTarget || 'live_tracking', item.orderData || null);
                                                } else if (onNavigate) {
                                                    onNavigate(item.actionTarget || 'live_tracking', item.orderData || null);
                                                }
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.notifCardActionBtnText}>{item.actionText}</Text>
                                            <ChevronRight size={14} color="#2D7B38" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {isUnread && <View style={styles.unreadDotBadge} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F5',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    bottomSpacer: {
        height: 24,
    },

    // Header matching Image 3
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    headerTitleGroup: {
        flex: 1,
        flexDirection: 'column',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 12,
    },
    clearBtnText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },

    // Tabs Row
    tabsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 18,
    },
    tabChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tabChipActive: {
        backgroundColor: '#2D7B38',
        borderColor: '#2D7B38',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 2,
    },
    tabChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    tabChipTextActive: {
        color: '#FFFFFF',
    },
    tabCountBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    tabCountBadgeActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    tabCountText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#64748B',
    },
    tabCountTextActive: {
        color: '#FFFFFF',
    },

    // List & Cards
    listContainer: {
        flexDirection: 'column',
        gap: 12,
    },
    notifCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
        position: 'relative',
    },
    notifCardUnread: {
        borderColor: '#C8E6C9',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 2,
    },
    notifIconAvatar: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    notifContent: {
        flex: 1,
        flexDirection: 'column',
    },
    notifCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
        lineHeight: 18,
    },
    notifTime: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    notifMessage: {
        fontSize: 12.5,
        color: '#475569',
        lineHeight: 18,
        marginBottom: 8,
    },
    notifCardActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECF6EE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    notifCardActionBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#2D7B38',
    },
    unreadDotBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 18,
        marginBottom: 20,
    },
    btnEmptyShop: {
        backgroundColor: '#2D7B38',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
    },
    btnEmptyShopText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
