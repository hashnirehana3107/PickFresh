import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import GoogleAuthModal from '../../components/auth/GoogleAuthModal';
import AppleAuthModal from '../../components/auth/AppleAuthModal';
import { loadGoogleSdk, triggerGoogleAuth } from '../../utils/googleAuth';

export default function LoginPage({ onNavigate }) {
    const { login, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [showAppleModal, setShowAppleModal] = useState(false);

    useEffect(() => {
        loadGoogleSdk();
    }, []);

    const handleGoogleLoginPress = async () => {
        setIsLoading(true);
        setErrorMsg('');
        await triggerGoogleAuth({
            role: 'customer',
            isSignUp: false,
            onSuccess: async (googleUser) => {
                try {
                    const loggedInUser = await loginWithGoogle({ ...googleUser, isSignUp: false });
                    setIsLoading(false);
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        if (loggedInUser?.role === 'shop_owner') window.location.hash = '#/shop_owner';
                        else if (loggedInUser?.role === 'supplier') window.location.hash = '#/supplier';
                        else window.location.hash = '#/home';
                    }
                    if (onNavigate) {
                        if (loggedInUser?.role === 'shop_owner') onNavigate('shop_owner');
                        else if (loggedInUser?.role === 'supplier') onNavigate('supplier');
                        else onNavigate('home');
                    }
                } catch (err) {
                    setIsLoading(false);
                    setErrorMsg(err.message || 'Failed to authenticate user.');
                }
            },
            onError: (err) => {
                setIsLoading(false);
                if (err && !err.includes('cancelled')) {
                    setErrorMsg(err);
                }
            }
        });
    };

    const validateForm = () => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) {
            errors.email = 'Email address is required';
        } else if (!emailRegex.test(email.trim())) {
            errors.email = 'Enter a valid email (e.g. name@domain.com)';
        }

        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validateForm();
    };

    const handleLogin = async () => {
        setErrorMsg('');
        setTouched({ email: true, password: true });

        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) {
            errors.email = 'Email address is required';
        } else if (!emailRegex.test(email.trim())) {
            errors.email = 'Enter a valid email (e.g. name@company.com)';
        }

        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setIsLoading(true);
        try {
            await login(email.trim(), password);
            setIsLoading(false);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.location.hash = '#/home';
            }
            if (onNavigate) onNavigate('home');
        } catch (err) {
            setIsLoading(false);
            setErrorMsg(err.message || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.mainContent}>
                {/* Top Centered Logo Box */}
                <View style={styles.logoWrapper}>
                    <View style={styles.logoCard}>
                        <Image
                            source={require('../../../assets/logo.jpg')}
                            style={styles.logoImg}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Title & Subtitle */}
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>Enter your credentials to access your account</Text>
                </View>

                {/* Error Alert Box */}
                {errorMsg ? (
                    <View style={styles.errorCard}>
                        <View style={styles.errorIconWrap}>
                            <AlertCircle size={18} color="#DC2626" />
                        </View>
                        <View style={styles.errorTextWrap}>
                            <Text style={styles.errorTitle}>Unable to Sign In</Text>
                            <Text style={styles.errorDesc}>{errorMsg}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Form Fields */}
                <View style={styles.form}>
                    {/* Email Field */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <View
                            style={[
                                styles.inputWrap,
                                fieldErrors.email && touched.email && styles.inputWrapError,
                            ]}
                        >
                            <Mail
                                size={18}
                                color={fieldErrors.email && touched.email ? '#EF4444' : '#94A3B8'}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={[
                                    styles.input,
                                    fieldErrors.email && touched.email && styles.inputErrorBg,
                                ]}
                                placeholder="name@company.com"
                                placeholderTextColor="#94A3B8"
                                value={email}
                                onChangeText={(val) => {
                                    setEmail(val);
                                    if (fieldErrors.email) validateForm();
                                }}
                                onBlur={() => handleBlur('email')}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        {fieldErrors.email && touched.email ? (
                            <View style={styles.inlineFieldError}>
                                <AlertCircle size={12} color="#DC2626" />
                                <Text style={styles.inlineErrorText}>{fieldErrors.email}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Password Field */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View
                            style={[
                                styles.inputWrap,
                                fieldErrors.password && touched.password && styles.inputWrapError,
                            ]}
                        >
                            <Lock
                                size={18}
                                color={fieldErrors.password && touched.password ? '#EF4444' : '#94A3B8'}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={[
                                    styles.input,
                                    { paddingRight: 45 },
                                    fieldErrors.password && touched.password && styles.inputErrorBg,
                                ]}
                                placeholder="••••••••"
                                placeholderTextColor="#94A3B8"
                                value={password}
                                onChangeText={(val) => {
                                    setPassword(val);
                                    if (fieldErrors.password) validateForm();
                                }}
                                onBlur={() => handleBlur('password')}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowPassword(!showPassword)}
                                activeOpacity={0.7}
                            >
                                {showPassword ? (
                                    <EyeOff size={18} color="#64748B" />
                                ) : (
                                    <Eye size={18} color="#64748B" />
                                )}
                            </TouchableOpacity>
                        </View>
                        {fieldErrors.password && touched.password ? (
                            <View style={styles.inlineFieldError}>
                                <AlertCircle size={12} color="#DC2626" />
                                <Text style={styles.inlineErrorText}>{fieldErrors.password}</Text>
                            </View>
                        ) : null}

                        {/* Forgot Password Link */}
                        <TouchableOpacity
                            style={styles.forgotBtn}
                            onPress={() => onNavigate('forgot_password')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.forgotText}>Forgot password?</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Submit Sign In Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.submitBtnText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Social Logins */}
                <View style={styles.socialGroup}>
                    {/* Continue with Google */}
                    <TouchableOpacity
                        style={styles.socialBtn}
                        onPress={handleGoogleLoginPress}
                        activeOpacity={0.75}
                    >
                        <Svg width={20} height={20} viewBox="0 0 24 24">
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
                        <Text style={styles.socialBtnText}>Continue with Google</Text>
                    </TouchableOpacity>

                    {/* Continue with Apple */}
                    <TouchableOpacity
                        style={styles.socialBtn}
                        onPress={() => setShowAppleModal(true)}
                        activeOpacity={0.75}
                    >
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
                            <Path
                                fill="#000000"
                                d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.81 1.13-1.94 1-3.07-.98.04-2.18.65-2.88 1.47-.63.73-1.18 1.89-1.03 3.01 1.1.09 2.23-.55 2.91-1.41z"
                            />
                        </Svg>
                        <Text style={styles.socialBtnText}>Continue with Apple</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Footer - Generously spaced matching Image 1 */}
            <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => onNavigate('roleselect')} activeOpacity={0.7}>
                    <Text style={styles.footerLink}>Sign up</Text>
                </TouchableOpacity>
            </View>

            {/* Authentic Google Auth Modal */}
            <GoogleAuthModal
                isOpen={showGoogleModal}
                onClose={() => setShowGoogleModal(false)}
                onSuccess={async (googleUser) => {
                    const loggedInUser = await loginWithGoogle({ ...googleUser, isSignUp: false });
                    setShowGoogleModal(false);
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        if (loggedInUser?.role === 'shop_owner') window.location.hash = '#/shop_owner';
                        else if (loggedInUser?.role === 'supplier') window.location.hash = '#/supplier';
                        else window.location.hash = '#/home';
                    }
                    if (onNavigate) {
                        if (loggedInUser?.role === 'shop_owner') onNavigate('shop_owner');
                        else if (loggedInUser?.role === 'supplier') onNavigate('supplier');
                        else onNavigate('home');
                    }
                }}
                role="customer"
                isSignUp={false}
            />

            {/* Authentic Apple Auth Modal */}
            <AppleAuthModal
                isOpen={showAppleModal}
                onClose={() => setShowAppleModal(false)}
                onSuccess={async (appleUser) => {
                    const loggedInUser = await loginWithGoogle({ ...appleUser, isSignUp: false });
                    setShowAppleModal(false);
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        if (loggedInUser?.role === 'shop_owner') window.location.hash = '#/shop_owner';
                        else if (loggedInUser?.role === 'supplier') window.location.hash = '#/supplier';
                        else window.location.hash = '#/home';
                    }
                    if (onNavigate) {
                        if (loggedInUser?.role === 'shop_owner') onNavigate('shop_owner');
                        else if (loggedInUser?.role === 'supplier') onNavigate('supplier');
                        else onNavigate('home');
                    }
                }}
                role="customer"
                isSignUp={false}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 10 : 16,
        paddingBottom: Platform.OS === 'android' ? 95 : 28,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    mainContent: {
        width: '100%',
        alignItems: 'center',
    },
    logoWrapper: {
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 20,
    },
    logoCard: {
        width: 135,
        height: 135,
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 30,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.04)',
    },
    logoImg: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        textAlign: 'center',
    },
    errorCard: {
        width: '100%',
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FEE2E2',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    errorIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorTextWrap: {
        flex: 1,
    },
    errorTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#991B1B',
    },
    errorDesc: {
        fontSize: 12,
        fontWeight: '500',
        color: '#B91C1C',
        marginTop: 2,
        lineHeight: 16,
    },
    form: {
        width: '100%',
        gap: 16,
    },
    fieldGroup: {
        width: '100%',
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        textAlign: 'left',
    },
    inputWrap: {
        position: 'relative',
        width: '100%',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
    },
    inputWrapError: {
        borderColor: '#EF4444',
    },
    inputErrorBg: {
        backgroundColor: '#FFF5F5',
    },
    inputIcon: {
        position: 'absolute',
        left: 14,
        zIndex: 2,
    },
    input: {
        width: '100%',
        paddingVertical: 13,
        paddingLeft: 42,
        paddingRight: 16,
        fontSize: 14,
        color: '#0F172A',
        borderRadius: 14,
    },
    inlineFieldError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    inlineErrorText: {
        color: '#DC2626',
        fontSize: 11.5,
        fontWeight: '600',
    },
    eyeBtn: {
        position: 'absolute',
        right: 14,
        padding: 4,
        zIndex: 2,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: 2,
    },
    forgotText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2E7D32',
    },
    submitBtn: {
        width: '100%',
        backgroundColor: '#2E7D32',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
        elevation: 4,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginVertical: 18,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        paddingHorizontal: 12,
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    socialGroup: {
        width: '100%',
        gap: 12,
    },
    socialBtn: {
        width: '100%',
        paddingVertical: 13,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    socialBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 36,
        paddingBottom: 8,
    },
    footerLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    footerLink: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2E7D32',
    },
});
