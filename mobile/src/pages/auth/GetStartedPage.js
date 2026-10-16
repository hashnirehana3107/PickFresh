import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
} from 'react-native';
import { Leaf, Clock, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function GetStartedPage({ onNavigate }) {
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
        >
            {/* Top Produce Banner with Rich Colors & Soft Natural Mask */}
            <View style={styles.heroWrap}>
                <Image
                    source={require('../../../assets/fresh_produce_hero.png')}
                    style={styles.heroImg}
                    resizeMode="cover"
                />

                {/* Soft Top-Left Corner Glow (Delicate, Does Not Wash Out Center Produce) */}
                <LinearGradient
                    colors={[
                        'rgba(250, 251, 248, 0.90)',
                        'rgba(250, 251, 248, 0.55)',
                        'rgba(250, 251, 248, 0.20)',
                        'rgba(250, 251, 248, 0)',
                    ]}
                    locations={[0, 0.20, 0.38, 0.56]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                />

                {/* Soft Bottom Fade (Starts only at 62%, preserving rich wooden box & limes) */}
                <LinearGradient
                    colors={[
                        'rgba(250, 251, 248, 0)',
                        'rgba(250, 251, 248, 0.25)',
                        'rgba(250, 251, 248, 0.75)',
                        '#FAFBF8',
                    ]}
                    locations={[0.62, 0.76, 0.90, 1.0]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                />

                {/* Micro bleed to prevent any sub-pixel seam */}
                <View style={styles.heroBottomBleed} />
            </View>

            {/* Overlapping Centered Logo Box */}
            <View style={styles.logoWrapper}>
                <View style={styles.logoCard}>
                    <Image
                        source={require('../../../assets/logo.jpg')}
                        style={styles.logoImg}
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Brand Title & Tagline */}
            <View style={styles.titleSection}>
                <Text style={styles.title}>PickFresh</Text>
                <Text style={styles.subtitle}>Order Fresh. Pick Up Fast.</Text>
            </View>

            {/* 3 Key Feature Cards */}
            <View style={styles.featuresList}>
                <View style={styles.featureCard}>
                    <View style={styles.featureIconBadge}>
                        <Leaf size={20} color="#2E7D32" />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Picked at Peak Ripeness</Text>
                        <Text style={styles.featureDesc}>
                            Sourced daily from local organic farms straight to your basket.
                        </Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={styles.featureIconBadge}>
                        <Clock size={20} color="#2E7D32" />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Ready in 15 Minutes</Text>
                        <Text style={styles.featureDesc}>
                            Skip the busy checkout lines. Grab your order and head home.
                        </Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={styles.featureIconBadge}>
                        <Sparkles size={20} color="#2E7D32" />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Smart Swap Alternatives</Text>
                        <Text style={styles.featureDesc}>
                            Item running low? Get instant, delicious alternatives recommended.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Bottom Primary Button & Sign In Link */}
            <View style={styles.actionsSection}>
                <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => onNavigate('roleselect')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.btnPrimaryText}>Get Started</Text>
                </TouchableOpacity>

                <View style={styles.signInRow}>
                    <Text style={styles.signInLabel}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => onNavigate('login')} activeOpacity={0.7}>
                        <Text style={styles.signInLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    contentContainer: {
        paddingBottom: Platform.OS === 'android' ? 95 : 32,
    },
    heroWrap: {
        width: '100%',
        height: 310,
        position: 'relative',
        backgroundColor: '#FAFBF8',
        overflow: 'hidden',
    },
    heroImg: {
        width: '100%',
        height: '100%',
    },
    heroBottomBleed: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#FAFBF8',
    },
    logoWrapper: {
        alignItems: 'center',
        marginTop: -70,
        zIndex: 10,
    },
    logoCard: {
        width: 140,
        height: 140,
        backgroundColor: '#FFFFFF',
        borderRadius: 34,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.08,
        shadowRadius: 34,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.04)',
    },
    logoImg: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    titleSection: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#2E7D32',
        letterSpacing: -0.6,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    featuresList: {
        paddingHorizontal: 20,
        gap: 14,
        marginBottom: 28,
    },
    featureCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1.5,
        borderColor: '#F0F4EF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    featureIconBadge: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        flex: 1,
        gap: 3,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
    },
    featureDesc: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    actionsSection: {
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 16,
        marginTop: 4,
    },
    btnPrimary: {
        width: '100%',
        backgroundColor: '#2E7D32',
        paddingVertical: 17,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
        elevation: 5,
    },
    btnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    signInRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    signInLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    signInLink: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2E7D32',
    },
});
