import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Home, Search, ShoppingCart, User } from 'lucide-react-native';

export default function BottomNavBar({ activeTab, onTabPress, cartCount = 0 }) {
    const tabs = [
        { key: 'home', label: 'Home', icon: Home },
        { key: 'search', label: 'Search', icon: Search },
        { key: 'cart', label: 'Cart', icon: ShoppingCart, badge: cartCount },
        { key: 'profile', label: 'Profile', icon: User },
    ];

    return (
        <View style={styles.navBar}>
            {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.key;
                const tintColor = isActive ? '#2D7B38' : '#94A3B8';

                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.tabBtn}
                        onPress={() => onTabPress(tab.key)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconWrap}>
                            <IconComponent size={22} color={tintColor} strokeWidth={isActive ? 2.5 : 2} />
                            {tab.badge > 0 && (
                                <View style={styles.cartBadge}>
                                    <Text style={styles.cartBadgeText}>{tab.badge}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.tabLabel, { color: tintColor, fontWeight: isActive ? '700' : '600' }]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    navBar: {
        height: 65,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
    },
    tabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: 6,
    },
    iconWrap: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: 11,
        marginTop: 4,
    },
    cartBadge: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: '#2D7B38',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    cartBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
    },
});
