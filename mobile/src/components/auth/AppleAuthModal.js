import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { X, Check, ShieldCheck, User } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

export default function AppleAuthModal({
    isOpen,
    onClose,
    onSuccess,
    role = 'customer',
    isSignUp = false,
}) {
    const [selectedEmail, setSelectedEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const appleAccounts = [
        {
            name: 'Hashni Rehana',
            email: 'hashni.rehana@icloud.com',
            avatar: 'H',
            bg: '#1C1C1E',
        },
        {
            name: 'H. Rehana',
            email: 'rehanahashni@me.com',
            avatar: 'H',
            bg: '#3A3A3C',
        },
        {
            name: 'Nishadhi Samarakoon',
            email: 'nishadhi.fresh@icloud.com',
            avatar: 'N',
            bg: '#636366',
        },
    ];

    const handleSelectAccount = (acc) => {
        setSelectedEmail(acc.email);
        setIsLoading(true);
        setErrorMsg('');

        setTimeout(async () => {
            try {
                const appleUserData = {
                    id: 'apple_' + Date.now(),
                    name: acc.name,
                    email: acc.email,
                    picture: '',
                    role: role,
                    provider: 'apple',
                    isSignUp: isSignUp,
                };
                await onSuccess(appleUserData);
                setIsLoading(false);
                onClose();
            } catch (err) {
                setIsLoading(false);
                setErrorMsg(err.message || 'Failed to authenticate with Apple.');
            }
        }, 800);
    };

    if (!isOpen) return null;

    return (
        <Modal
            visible={isOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    {/* Close Button */}
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                        <X size={18} color="#8E8E93" />
                    </TouchableOpacity>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollInside}
                        bounces={false}
                    >
                        {/* Apple Logo Header */}
                        <View style={styles.appleLogoWrap}>
                            <Svg width={36} height={36} viewBox="0 0 24 24" fill="#000000">
                                <Path
                                    fill="#000000"
                                    d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.81 1.13-1.94 1-3.07-.98.04-2.18.65-2.88 1.47-.63.73-1.18 1.89-1.03 3.01 1.1.09 2.23-.55 2.91-1.41z"
                                />
                            </Svg>
                        </View>

                        <Text style={styles.modalTitle}>
                            {isSignUp ? 'Sign up with Apple' : 'Sign in with Apple'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            Choose an account to continue to <Text style={styles.boldPickFresh}>PickFresh</Text>
                        </Text>

                        {errorMsg ? (
                            <View style={{ width: '100%', backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 14 }}>
                                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{errorMsg}</Text>
                            </View>
                        ) : null}

                        {/* Account List */}
                        <View style={styles.accountList}>
                            {appleAccounts.map((acc, index) => {
                                const isThisSelected = selectedEmail === acc.email;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.accountItem,
                                            isThisSelected && styles.accountItemSelected,
                                        ]}
                                        onPress={() => handleSelectAccount(acc)}
                                        disabled={isLoading}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.avatar, { backgroundColor: acc.bg }]}>
                                            {isLoading && isThisSelected ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.avatarText}>{acc.avatar}</Text>
                                            )}
                                        </View>
                                        <View style={styles.accountInfo}>
                                            <Text style={styles.accountName}>{acc.name}</Text>
                                            <Text style={styles.accountEmail}>{acc.email}</Text>
                                        </View>
                                        {isThisSelected && !isLoading && (
                                            <View style={styles.checkBadge}>
                                                <Check size={13} color="#FFFFFF" strokeWidth={3} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Use Another Apple ID */}
                            <TouchableOpacity
                                style={styles.accountItem}
                                onPress={() => handleSelectAccount(appleAccounts[0])}
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.avatar, styles.addAvatar]}>
                                    <User size={18} color="#8E8E93" />
                                </View>
                                <View style={styles.accountInfo}>
                                    <Text style={[styles.accountName, { color: '#007AFF' }]}>
                                        Use another Apple ID
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Footer Privacy Badge */}
                        <View style={styles.footerNote}>
                            <ShieldCheck size={14} color="#8E8E93" style={{ marginTop: 1 }} />
                            <Text style={styles.footerNoteText}>
                                Apple will share your name and email address with PickFresh. Your data is protected by Apple's privacy policy.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 24,
        paddingBottom: 20,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
        elevation: 12,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    scrollInside: {
        alignItems: 'center',
    },
    appleLogoWrap: {
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000000',
        textAlign: 'center',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 18,
    },
    boldPickFresh: {
        fontWeight: '700',
        color: '#000000',
    },
    accountList: {
        width: '100%',
        gap: 10,
        marginBottom: 16,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F2F2F7',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    accountItemSelected: {
        borderColor: '#007AFF',
        backgroundColor: '#F0F7FF',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    addAvatar: {
        backgroundColor: '#E5E5EA',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    accountInfo: {
        flex: 1,
    },
    accountName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 2,
    },
    accountEmail: {
        fontSize: 12,
        color: '#8E8E93',
    },
    checkBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingHorizontal: 4,
    },
    footerNoteText: {
        flex: 1,
        fontSize: 11,
        color: '#8E8E93',
        lineHeight: 15,
    },
});
