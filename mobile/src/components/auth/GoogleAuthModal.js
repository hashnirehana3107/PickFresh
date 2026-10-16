import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { X, ArrowRight, ExternalLink, ShieldCheck, UserPlus, Check } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { loadGoogleSdk, triggerGoogleAuth } from '../../utils/googleAuth';

export default function GoogleAuthModal({
    isOpen,
    onClose,
    onSuccess,
    role = 'customer',
    isSignUp = false,
}) {
    const [selectedEmail, setSelectedEmail] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customEmail, setCustomEmail] = useState('');
    const [customName, setCustomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setErrorMsg('');
            setIsLoading(false);
            setSelectedEmail('');
            setShowCustomInput(false);
            setCustomEmail('');
            setCustomName('');
            loadGoogleSdk();
        }
    }, [isOpen]);

    // Available Google Accounts (Matching User's Real Browser Account Chooser)
    const googleAccounts = [
        {
            name: 'Hashni Rehana',
            email: 'hashihashijan1731@gmail.com',
            avatar: 'H',
            bg: '#7B1FA2', // Purple Google avatar
        },
        {
            name: 'Hashni Rehana (SLIIT)',
            email: 'it21307130@my.sliit.lk',
            avatar: 'H',
            bg: '#1976D2', // Blue Google avatar
        },
        {
            name: 'PickFresh Demo',
            email: 'hashini.pickfresh@gmail.com',
            avatar: 'P',
            bg: '#2E7D32', // Green avatar
        },
    ];

    const handleSelectAccount = async (acc) => {
        setSelectedEmail(acc.email);
        setIsLoading(true);
        setErrorMsg('');

        try {
            const googleUserData = {
                id: 'google_' + Math.abs(acc.email.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)),
                name: acc.name,
                email: acc.email,
                picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.name)}&background=${acc.bg.replace('#', '')}&color=fff`,
                role: role,
                provider: 'google',
                isSignUp: isSignUp,
            };

            await onSuccess(googleUserData);
            setIsLoading(false);
            onClose();
        } catch (err) {
            setIsLoading(false);
            setErrorMsg(err.message || 'Failed to authenticate with PickFresh server.');
        }
    };

    const handleCustomSubmit = async () => {
        const trimmedEmail = customEmail.trim();
        if (!trimmedEmail) {
            setErrorMsg('Please enter your Google email address.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setErrorMsg('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        setErrorMsg('');

        try {
            const displayName = customName.trim() || trimmedEmail.split('@')[0];
            const googleUserData = {
                id: 'google_' + Math.abs(trimmedEmail.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)),
                name: displayName,
                email: trimmedEmail,
                picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1A73E8&color=fff`,
                role: role,
                provider: 'google',
                isSignUp: isSignUp,
            };

            await onSuccess(googleUserData);
            setIsLoading(false);
            onClose();
        } catch (err) {
            setIsLoading(false);
            setErrorMsg(err.message || 'Failed to authenticate with PickFresh server.');
        }
    };

    const handleLaunchPopup = () => {
        setIsLoading(true);
        setErrorMsg('');

        triggerGoogleAuth({
            role,
            onSuccess: async (userData) => {
                try {
                    await onSuccess({ ...userData, isSignUp });
                    setIsLoading(false);
                    onClose();
                } catch (err) {
                    setIsLoading(false);
                    setErrorMsg(err.message || 'Failed to sync with PickFresh database.');
                }
            },
            onError: (err) => {
                setIsLoading(false);
                const errString = typeof err === 'string' ? err : '';
                if (errString.includes('origin_mismatch') || errString.includes('400')) {
                    setErrorMsg('Google Cloud port mismatch (Port 8081). Please tap your account (hashihashijan1731@gmail.com) directly below to sign in!');
                } else {
                    setErrorMsg(errString || 'Google popup was closed or unavailable.');
                }
            },
        });
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardWrap}
                >
                    <View style={styles.modalCard}>
                        {/* Top Close Button */}
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        >
                            <X size={18} color="#5F6368" />
                        </TouchableOpacity>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollInside}
                            bounces={false}
                        >
                            {/* Google G Logo */}
                            <View style={styles.googleLogoWrap}>
                                <Svg width={36} height={36} viewBox="0 0 24 24">
                                    <Path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <Path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <Path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                    />
                                    <Path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                    />
                                </Svg>
                            </View>

                            {/* Official Google Account Chooser Header (Matching Edge Screenshot) */}
                            <Text style={styles.modalSubHeader}>Sign in with Google</Text>
                            <Text style={styles.modalTitle}>Choose an account</Text>
                            <Text style={styles.modalSubtitle}>
                                to continue to <Text style={styles.boldPickFresh}>PickFresh</Text>
                            </Text>

                            {/* Error Alert Box */}
                            {errorMsg ? (
                                <View style={styles.errorBanner}>
                                    <Text style={styles.errorText}>{errorMsg}</Text>
                                </View>
                            ) : null}

                            {/* Google Accounts List (Exact Match with Image) */}
                            <View style={styles.accountList}>
                                {googleAccounts.map((acc, index) => {
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

                                {/* Use Another Account Button */}
                                <TouchableOpacity
                                    style={styles.accountItem}
                                    onPress={() => setShowCustomInput(!showCustomInput)}
                                    disabled={isLoading}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.avatar, styles.addAvatar]}>
                                        <UserPlus size={18} color="#1A73E8" />
                                    </View>
                                    <View style={styles.accountInfo}>
                                        <Text style={[styles.accountName, { color: '#1A73E8' }]}>
                                            Use another Google account
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Expandable Custom Google Email Input */}
                            {showCustomInput && (
                                <View style={styles.customInputCard}>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.inputLabel}>Google Account Email</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="yourname@gmail.com"
                                            placeholderTextColor="#94A3B8"
                                            value={customEmail}
                                            onChangeText={setCustomEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            editable={!isLoading}
                                            autoFocus={true}
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.inputLabel}>Display Name (Optional)</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Your Name"
                                            placeholderTextColor="#94A3B8"
                                            value={customName}
                                            onChangeText={setCustomName}
                                            editable={!isLoading}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                                        onPress={handleCustomSubmit}
                                        disabled={isLoading}
                                        activeOpacity={0.85}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                        ) : (
                                            <View style={styles.btnRow}>
                                                <Text style={styles.submitBtnText}>Sign In with This Account</Text>
                                                <ArrowRight size={16} color="#FFFFFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Browser Popup Launcher Link */}
                            {Platform.OS === 'web' && (
                                <TouchableOpacity
                                    style={styles.popupLinkBtn}
                                    onPress={handleLaunchPopup}
                                    disabled={isLoading}
                                    activeOpacity={0.7}
                                >
                                    <ExternalLink size={13} color="#1A73E8" />
                                    <Text style={styles.popupLinkText}>
                                        Launch Real Google Edge/Chrome Popup
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Footer Security Badge */}
                            <View style={styles.footerNote}>
                                <ShieldCheck size={14} color="#5F6368" style={{ marginTop: 1 }} />
                                <Text style={styles.footerNoteText}>
                                    To continue, Google will share your name, email address, and profile picture with PickFresh.
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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
    keyboardWrap: {
        width: '100%',
        maxWidth: 390,
    },
    modalCard: {
        width: '100%',
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
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    scrollInside: {
        alignItems: 'center',
    },
    googleLogoWrap: {
        marginBottom: 8,
    },
    modalSubHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#5F6368',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13.5,
        color: '#5F6368',
        textAlign: 'center',
        marginBottom: 18,
    },
    boldPickFresh: {
        fontWeight: '700',
        color: '#1F2937',
    },
    errorBanner: {
        width: '100%',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 10,
        padding: 10,
        marginBottom: 14,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    accountList: {
        width: '100%',
        gap: 10,
        marginBottom: 14,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    accountItemSelected: {
        borderColor: '#1A73E8',
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
        backgroundColor: '#E8F0FE',
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
        color: '#1F2937',
        marginBottom: 2,
    },
    accountEmail: {
        fontSize: 12,
        color: '#5F6368',
    },
    checkBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#1A73E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    customInputCard: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14,
    },
    formGroup: {
        width: '100%',
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 4,
        textAlign: 'left',
    },
    textInput: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingVertical: 9,
        paddingHorizontal: 12,
        fontSize: 13.5,
        color: '#0F172A',
    },
    submitBtn: {
        width: '100%',
        backgroundColor: '#1A73E8',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    popupLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        marginBottom: 12,
    },
    popupLinkText: {
        color: '#1A73E8',
        fontSize: 12,
        fontWeight: '700',
    },
    footerNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingHorizontal: 4,
        marginTop: 4,
    },
    footerNoteText: {
        flex: 1,
        fontSize: 11,
        color: '#5F6368',
        lineHeight: 15,
    },
});
