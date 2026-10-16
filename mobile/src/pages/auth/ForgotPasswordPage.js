import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Mail,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    KeyRound,
    ShieldCheck,
    AlertCircle,
} from 'lucide-react-native';

export default function ForgotPasswordScreen({ onNavigate }) {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSendCode = () => {
        setErrorMsg('');
        if (!email.trim()) {
            setErrorMsg('Please enter your email address');
            return;
        }
        setStep(2);
    };

    const handleVerifyOtp = () => {
        setErrorMsg('');
        const entered = otp.join('');
        if (entered.length < 4) {
            setErrorMsg('Please enter the full 4-digit code');
            return;
        }
        setStep(3);
    };

    const handleResetPassword = () => {
        setErrorMsg('');
        if (!newPassword || newPassword.length < 6) {
            setErrorMsg('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }
        setStep(4);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => {
                        if (step > 1 && step < 4) setStep(step - 1);
                        else onNavigate('login');
                    }}
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>

                <View style={styles.stepsRow}>
                    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                    <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
                </View>
            </View>

            {/* Error Message */}
            {errorMsg ? (
                <View style={styles.errorBanner}>
                    <AlertCircle size={16} color="#DC2626" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            ) : null}

            {/* STEP 1: Enter Email */}
            {step === 1 && (
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <KeyRound size={28} color="#2D7B38" />
                    </View>
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>
                        Enter your registered email address and we will send you a 4-digit verification code.
                    </Text>

                    <View style={styles.inputWrap}>
                        <Mail size={18} color="#94A3B8" />
                        <TextInput
                            style={styles.input}
                            placeholder="name@company.com"
                            placeholderTextColor="#94A3B8"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSendCode}>
                        <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* STEP 2: Enter OTP */}
            {step === 2 && (
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <ShieldCheck size={28} color="#2D7B38" />
                    </View>
                    <Text style={styles.title}>Enter 4-Digit Code</Text>
                    <Text style={styles.subtitle}>
                        We sent a verification code to <Text style={styles.boldText}>{email}</Text>
                    </Text>

                    <View style={styles.otpGrid}>
                        {otp.map((d, i) => (
                            <TextInput
                                key={i}
                                style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                                keyboardType="numeric"
                                maxLength={1}
                                value={d}
                                onChangeText={(val) => {
                                    const newOtp = [...otp];
                                    newOtp[i] = val;
                                    setOtp(newOtp);
                                }}
                            />
                        ))}
                    </View>

                    <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOtp}>
                        <Text style={styles.primaryBtnText}>Verify Code</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* STEP 3: Reset Password */}
            {step === 3 && (
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <Lock size={28} color="#2D7B38" />
                    </View>
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>Create a new secure password for your account.</Text>

                    <View style={styles.inputWrap}>
                        <Lock size={18} color="#94A3B8" />
                        <TextInput
                            style={styles.input}
                            placeholder="New password (min 6 characters)"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry={!showNewPassword}
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                            {showNewPassword ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputWrap}>
                        <Lock size={18} color="#94A3B8" />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm new password"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword}>
                        <Text style={styles.primaryBtnText}>Reset Password</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* STEP 4: Success */}
            {step === 4 && (
                <View style={styles.card}>
                    <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                        <CheckCircle2 size={42} color="#16A34A" />
                    </View>
                    <Text style={styles.title}>Password Reset Complete!</Text>
                    <Text style={styles.subtitle}>
                        Your password has been successfully updated. You can now log in with your new password.
                    </Text>

                    <TouchableOpacity style={styles.primaryBtn} onPress={() => onNavigate('login')}>
                        <Text style={styles.primaryBtnText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    scrollContent: {
        paddingHorizontal: 22,
        paddingTop: Platform.OS === 'android' ? 10 : 16,
        paddingBottom: Platform.OS === 'android' ? 95 : 40,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#CBD5E1',
    },
    stepDotActive: {
        backgroundColor: '#2D7B38',
        width: 18,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 12.5,
        fontWeight: '600',
        flex: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 24,
    },
    boldText: {
        color: '#0F172A',
        fontWeight: '700',
    },
    inputWrap: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
        marginBottom: 14,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#0F172A',
    },
    otpGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    otpBox: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
    },
    otpBoxFilled: {
        borderColor: '#2D7B38',
        backgroundColor: '#F0FDF4',
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: '#2D7B38',
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
