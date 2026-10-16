import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Vibration,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Package,
    Truck,
    AlertTriangle,
    BellRing,
    Check,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export default function SupplierNotificationsScreen({ onNavigate }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('All');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const defaultNotifs = [
        {
            id: 'n1',
            type: 'po',
            title: 'New Restock Request #PO-892',
            message: 'Green Basket Grocery requested 40L Highland Milk & 25kg Carrots.',
            time: '10 mins ago',
            read: false,
        },
        {
            id: 'n2',
            type: 'delivery',
            title: 'Shipment Dispatched',
            message: 'Driver Kamal Wijekoon departed for Colombo 03 route.',
            time: '45 mins ago',
            read: false,
        },
        {
            id: 'n3',
            type: 'alert',
            title: 'Low Wholesale Inventory Warning',
            message: 'Highland Fresh Milk 1L batch is running low on stock.',
            time: '2 hours ago',
            read: true,
        },
    ];

    const fetchNotifications = async () => {
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `${API_BASE_URL}/supplier-replenishment/notifications?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.notifications) && data.notifications.length > 0) {
                setNotifications(
                    data.notifications.map((n) => ({
                        id: n._id || n.id,
                        type: n.type || 'po',
                        title: n.title,
                        message: n.message,
                        time: n.createdAt
                            ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Recently',
                        read: Boolean(n.read),
                    }))
                );
            } else {
                setNotifications(defaultNotifs);
            }
        } catch (err) {
            setNotifications(defaultNotifs);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user?.email]);

    const handleAddTestNotification = async () => {

        const title = `⚡ Live Restock PO #${Math.floor(800 + Math.random() * 100)}`;
        const message = 'Fresh Super Store requested 30 units Anchor Milk 400g.';

        const newNotif = {
            id: String(Date.now()),
            type: 'po',
            title,
            message,
            time: 'Just now',
            read: false,
        };

        setNotifications((prev) => [newNotif, ...prev]);

        try {
            await fetch(`${API_BASE_URL}/supplier-replenishment/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'po',
                    title,
                    message,
                    supplierName: user?.supplierName || user?.name || '',
                    supplierEmail: user?.email || '',
                }),
            });
        } catch (e) { }
    };

    const handleMarkAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            await fetch(`${API_BASE_URL}/supplier-replenishment/notifications/mark-read`, { method: 'PUT' });
        } catch (e) { }
    };

    const filteredNotifs = notifications.filter((n) => {
        if (activeTab === 'Unread') return !n.read;
        if (activeTab === 'POs') return n.type === 'po';
        if (activeTab === 'Deliveries') return n.type === 'delivery';
        return true;
    });

    const getIconWrap = (type) => {
        switch (type) {
            case 'po':
                return (
                    <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                        <Package size={18} color="#2563EB" />
                    </View>
                );
            case 'delivery':
                return (
                    <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                        <Truck size={18} color="#15803D" />
                    </View>
                );
            default:
                return (
                    <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                        <AlertTriangle size={18} color="#B45309" />
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Supplier Notifications</Text>

                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.readAllBtn} onPress={handleMarkAllRead}>
                        <Text style={styles.readAllText}>Read all</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => onNavigate && onNavigate('home')}
                    >
                        <ArrowLeft size={18} color="#1E293B" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabRow}>
                {['All', 'Unread', 'POs', 'Deliveries'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabChipText, activeTab === tab && styles.tabChipTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Notifications List Body */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#15803D" />
                    <Text style={styles.centerText}>Loading notifications...</Text>
                </View>
            ) : filteredNotifs.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>No notifications found in {activeTab}.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                    {filteredNotifs.map((n) => (
                        <View key={n.id} style={[styles.card, !n.read && styles.cardUnread]}>
                            {getIconWrap(n.type)}
                            <View style={styles.contentWrap}>
                                <Text style={styles.cardTitle}>{n.title}</Text>
                                <Text style={styles.cardMsg}>{n.message}</Text>
                                <Text style={styles.cardTime}>{n.time}</Text>
                            </View>
                            {!n.read && <View style={styles.unreadDot} />}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Simulate Test Alert Button with Vibration */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.simulateBtn} onPress={handleAddTestNotification}>
                    <BellRing size={18} color="#15803D" />
                    <Text style={styles.simulateBtnText}>Simulate New Alert (Vibrate 📳)</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    subtitle: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    readAllBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    readAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    tabChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    tabChipActive: {
        backgroundColor: '#15803D',
    },
    tabChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    tabChipTextActive: {
        color: '#FFFFFF',
    },
    listContainer: {
        padding: 16,
        gap: 10,
        paddingBottom: Platform.OS === 'android' ? 104 : 80,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    cardUnread: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentWrap: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 2,
    },
    cardMsg: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 16,
        marginBottom: 4,
    },
    cardTime: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#15803D',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'android' ? 24 : 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    simulateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 8,
    },
    simulateBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#15803D',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    centerText: {
        marginTop: 10,
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600',
    },
});
