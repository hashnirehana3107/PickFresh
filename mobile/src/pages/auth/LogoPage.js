import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Image,
    TouchableOpacity,
    Platform,
    Animated,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function SplashScreen({ onNavigate }) {
    const { user } = useAuth();
    const navRef = useRef(onNavigate);
    navRef.current = onNavigate;
    const userRef = useRef(user);
    userRef.current = user;

    useEffect(() => {
        const timer = setTimeout(() => {
            const nav = navRef.current;
            const u = userRef.current;
            if (nav) {
                if (u) {
                    if (u.role === 'shop_owner') nav('shop_owner');
                    else if (u.role === 'supplier') nav('supplier');
                    else nav('home');
                } else {
                    nav('welcome');
                }
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handlePress = () => {
        const nav = navRef.current;
        const u = userRef.current;
        if (nav) {
            if (u) {
                if (u.role === 'shop_owner') nav('shop_owner');
                else if (u.role === 'supplier') nav('supplier');
                else nav('home');
            } else {
                nav('welcome');
            }
        }
    };

    const anim1 = useRef(new Animated.Value(0)).current;
    const anim2 = useRef(new Animated.Value(0)).current;
    const anim3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createDotAnimation = (anim) => {
            return Animated.sequence([
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 350,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]);
        };

        const loop = Animated.loop(
            Animated.stagger(180, [
                createDotAnimation(anim1),
                createDotAnimation(anim2),
                createDotAnimation(anim3),
            ])
        );

        loop.start();

        return () => loop.stop();
    }, []);

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={1}
            onPress={handlePress}
        >
            <View style={styles.cardWrapper}>
                <View style={styles.logoCard}>
                    <Image
                        source={require('../../../assets/logo.jpg')}
                        style={styles.logoImg}
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Alternating Sequential Splash Loading Dots */}
            <View style={styles.loaderRow}>
                <Animated.View
                    style={[
                        styles.dot,
                        {
                            opacity: anim1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                            transform: [
                                { scale: anim1.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] }) },
                                { translateY: anim1.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
                            ],
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.dot,
                        {
                            opacity: anim2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                            transform: [
                                { scale: anim2.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] }) },
                                { translateY: anim2.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
                            ],
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.dot,
                        {
                            opacity: anim3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                            transform: [
                                { scale: anim3.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] }) },
                                { translateY: anim3.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
                            ],
                        },
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
        height: '100%',
    },
    cardWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoCard: {
        width: 135,
        height: 135,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.04)',
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.16,
        shadowRadius: 38,
        elevation: 8,
        ...(Platform.OS === 'web'
            ? {
                boxShadow: '0 16px 38px rgba(46, 125, 50, 0.14), 0 4px 10px rgba(0, 0, 0, 0.02)',
            }
            : {}),
    },
    logoImg: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    loaderRow: {
        position: 'absolute',
        bottom: 24,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    dot: {
        width: 7.5,
        height: 7.5,
        borderRadius: 4,
        backgroundColor: '#2E7D32',
    },
    dot1: {
        opacity: 0.35,
    },
    dot2: {
        opacity: 0.55,
    },
    dot3: {
        opacity: 1,
    },
});

