import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Animated, Vibration, Platform } from 'react-native';
import { Bell } from 'lucide-react-native';

export default function Header({ roleTitle = 'Customer view', unreadCount = 0, onNotificationPress }) {
    const bellShakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let loopAnim = null;
        let vibInterval = null;

        if (unreadCount > 0) {
            const shake = Animated.sequence([
                Animated.timing(bellShakeAnim, { toValue: 14, duration: 100, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: -14, duration: 100, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
                Animated.timing(bellShakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
                Animated.delay(2000),
            ]);

            loopAnim = Animated.loop(shake);
            loopAnim.start();

            const triggerVib = () => {
                try {
                    Vibration.vibrate([0, 300, 150, 300], false);
                    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
                        navigator.vibrate([300, 150, 300]);
                    }
                } catch (e) {}
            };
            triggerVib();
            vibInterval = setInterval(triggerVib, 2600);

            return () => {
                if (loopAnim) loopAnim.stop();
                bellShakeAnim.setValue(0);
                if (vibInterval) clearInterval(vibInterval);
                try {
                    Vibration.cancel();
                    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
                        navigator.vibrate(0);
                    }
                } catch (e) {}
            };
        } else {
            bellShakeAnim.setValue(0);
            try {
                Vibration.cancel();
                if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(0);
                }
            } catch (e) {}
        }
    }, [unreadCount]);

    return (
        <View style={styles.header}>
            <View style={styles.brandRow}>
                <View style={styles.logoCircle}>
                    <Image
                        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3724/3724720.png' }}
                        style={styles.logoImg}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.brandInfo}>
                    <Text style={styles.brandTitle}>PickFresh</Text>
                    <Text style={styles.brandSubtitle}>{roleTitle}</Text>
                </View>
            </View>

            <Animated.View
                style={{
                    transform: [
                        {
                            rotate: bellShakeAnim.interpolate({
                                inputRange: [-20, 20],
                                outputRange: ['-20deg', '20deg'],
                            }),
                        },
                    ],
                }}
            >
                <TouchableOpacity
                    style={styles.notifBtn}
                    onPress={onNotificationPress}
                    activeOpacity={0.7}
                >
                    <Bell size={20} color="#2D7B38" />
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        height: 60,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoImg: {
        width: 28,
        height: 28,
    },
    brandInfo: {
        justifyContent: 'center',
    },
    brandTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    brandSubtitle: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        marginTop: -1,
    },
    notifBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
    },
});
