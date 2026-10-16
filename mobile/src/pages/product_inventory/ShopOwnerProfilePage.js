import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    Image,
    Platform,
    ActivityIndicator,
} from 'react-native';
import {
    ArrowLeft,
    LogOut,
    Camera,
    Store,
    ShieldCheck,
    AlertTriangle,
    X,
    CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function ShopOwnerProfilePage({ onNavigate, onBack }) {
    const { user, logout, updateUser, deactivateAccount } = useAuth();

    const defaultAvatar =
        user?.picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user?.shopName || user?.storeName || user?.name || 'GroceryMart'
        )}&background=27672D&color=fff&size=150`;

    const [profileImage, setProfileImage] = useState(defaultAvatar);
    const [shopName, setShopName] = useState(user?.shopName || user?.storeName || 'GroceryMart');
    const [ownerName, setOwnerName] = useState(user?.ownerName || user?.name || 'Kamal Bandara');
    const [phone, setPhone] = useState(user?.phone || '0778523697');
    const [email, setEmail] = useState(user?.email || 'grocerymart@gmail.com');
    const [address, setAddress] = useState(user?.storeAddress || user?.address || 'No, 39/A, Main Road, Kandy');
    const [location, setLocation] = useState(user?.location || 'Kandy');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [isOpen, setIsOpen] = useState(user?.storeStatus !== 'closed');
    const [saveToast, setSaveToast] = useState('');
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setShopName(user.shopName || user.storeName || 'GroceryMart');
            setOwnerName(user.ownerName || user.name || 'Kamal Bandara');
            setPhone(user.phone || '0778523697');
            setEmail(user.email || 'grocerymart@gmail.com');
            setLocation(user.location || 'Kandy');
            setAddress(user.storeAddress || user.address || 'No, 39/A, Main Road, Kandy');
            setIsOpen(user.storeStatus !== 'closed');
            if (user.picture) setProfileImage(user.picture);
        }
    }, [user]);

    const citiesList = [
        'Colombo 01', 'Colombo 02', 'Colombo 03 (Colpetty)', 'Colombo 04 (Bambalapitiya)',
        'Colombo 05 (Havelock Town)', 'Colombo 06 (Wellawatte)', 'Colombo 07 (Cinnamon Gardens)',
        'Colombo 08 (Borella)', 'Dehiwala', 'Mount Lavinia', 'Moratuwa', 'Nugegoda',
        'Maharagama', 'Kotte', 'Battaramulla', 'Malabe', 'Homagama', 'Panadura',
        'Kandy', 'Galle', 'Matara', 'Kurunegala', 'Negombo', 'Gampaha', 'Anuradhapura',
        'Polonnaruwa', 'Trincomalee', 'Batticaloa', 'Jaffna', 'Ratnapura', 'Kegalle',
        'Badulla', 'Nuwara Eliya', 'Hambantota', 'Ampara'
    ];

    const handlePickImage = () => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        setProfileImage(reader.result);
                        if (updateUser) {
                            await updateUser({ picture: reader.result });
                        }
                        setSaveToast('Store logo updated successfully!');
                        setTimeout(() => setSaveToast(''), 3000);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = !isOpen;
        setIsOpen(newStatus);
        if (updateUser) {
            await updateUser({ storeStatus: newStatus ? 'open' : 'closed' });
            setSaveToast(`Store marked as ${newStatus ? 'OPEN' : 'CLOSED'}`);
            setTimeout(() => setSaveToast(''), 3000);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (updateUser) {
                await updateUser({
                    shopName,
                    storeName: shopName,
                    ownerName,
                    name: ownerName,
                    phone,
                    storeAddress: address,
                    address,
                    location,
                    storeStatus: isOpen ? 'open' : 'closed',
                    picture: profileImage,
                });
            }
            setSaveToast('Store profile updated successfully in MongoDB Atlas!');
            setTimeout(() => setSaveToast(''), 3000);
        } catch (err) {
            console.warn('Profile save err:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDeactivate = async () => {
        setIsDeactivating(true);
        try {
            if (deactivateAccount) {
                await deactivateAccount();
            }
        } catch (err) {
            console.warn('Deactivation failed:', err);
        } finally {
            setIsDeactivating(false);
            setShowDeactivateModal(false);
            if (onNavigate) onNavigate('login');
        }
    };

    const handleConfirmLogout = () => {
        setShowLogoutModal(false);
        if (logout) logout();
        if (onNavigate) onNavigate('login');
    };

    const filteredCities = citiesList.filter((c) =>
        c.toLowerCase().includes((location || '').toLowerCase())
    );

    return (
        <View style={styles.container}>
            {/* Top Navigation matching Image 1 & 2 */}
            <View style={styles.topNav}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => (onBack ? onBack() : onNavigate ? onNavigate('dashboard') : null)}
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>

                <Text style={styles.topNavTitle}>Store Profile</Text>

                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={() => setShowLogoutModal(true)}
                    activeOpacity={0.8}
                >
                    <LogOut size={15} color="#DC2626" />
                    <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Save Confirmation Toast */}
                {!!saveToast && (
                    <View style={styles.saveToastBox}>
                        <CheckCircle2 size={15} color="#166534" />
                        <Text style={styles.saveToastText}>{saveToast}</Text>
                    </View>
                )}

                {/* Avatar & Store Info Header */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity
                        style={styles.avatarWrap}
                        onPress={handlePickImage}
                        activeOpacity={0.85}
                    >
                        <Image
                            source={{ uri: profileImage }}
                            style={styles.avatarImg}
                            resizeMode="cover"
                        />
                        <View style={styles.cameraBtn}>
                            <Camera size={13} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.storeName}>{shopName || 'GroceryMart'}</Text>

                    <View style={styles.verifiedBadge}>
                        <ShieldCheck size={14} color="#166534" />
                        <Text style={styles.verifiedBadgeText}>Verified Store Manager</Text>
                    </View>
                </View>

                {/* Store Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusLeft}>
                        <Text style={styles.statusTitle}>Store Status</Text>
                        <Text style={styles.statusSub}>Receiving customer pre-orders</Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.statusPill,
                            isOpen ? styles.statusPillOpen : styles.statusPillClosed,
                        ]}
                        onPress={handleToggleStatus}
                        activeOpacity={0.8}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                isOpen ? styles.statusDotOpen : styles.statusDotClosed,
                            ]}
                        />
                        <Text
                            style={[
                                styles.statusPillText,
                                isOpen ? styles.statusTextOpen : styles.statusTextClosed,
                            ]}
                        >
                            {isOpen ? 'STORE OPEN' : 'STORE CLOSED'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Form Fields matching Image 1 & 2 */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Shop / Business Name</Text>
                    <TextInput
                        style={styles.input}
                        value={shopName}
                        onChangeText={setShopName}
                        placeholder="Enter shop name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Owner / Manager Name</Text>
                    <TextInput
                        style={styles.input}
                        value={ownerName}
                        onChangeText={setOwnerName}
                        placeholder="Owner full name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Contact Phone</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholder="Contact phone number"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={[styles.input, styles.inputDisabled]}
                        value={email}
                        editable={false}
                    />
                </View>

                <View style={[styles.formGroup, { zIndex: 10 }]}>
                    <Text style={styles.label}>Store Location / City</Text>
                    <TextInput
                        style={styles.input}
                        value={location}
                        onChangeText={(t) => {
                            setLocation(t);
                            setShowCityDropdown(true);
                        }}
                        onFocus={() => setShowCityDropdown(true)}
                        placeholder="Search city (e.g. Kandy, Colombo 03)..."
                        placeholderTextColor="#94A3B8"
                    />
                    {showCityDropdown && filteredCities.length > 0 && (
                        <View style={styles.cityDropdown}>
                            <ScrollView
                                nestedScrollEnabled={true}
                                style={{ maxHeight: 150 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                {filteredCities.slice(0, 8).map((city) => (
                                    <TouchableOpacity
                                        key={city}
                                        style={styles.cityDropdownItem}
                                        onPress={() => {
                                            setLocation(city);
                                            setShowCityDropdown(false);
                                        }}
                                    >
                                        <Text style={styles.cityDropdownText}>{city}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Store Street Address</Text>
                    <TextInput
                        style={styles.input}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="No, 39/A, Main Road, Kandy"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

            </ScrollView>

            {/* 🔒 Fixed Bottom Action Bar directly above bottom nav matching Image 1 */}
            <View style={styles.fixedBottomActionBar}>
                <TouchableOpacity
                    style={styles.updateBtn}
                    onPress={handleSave}
                    disabled={isSaving}
                    activeOpacity={0.88}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.updateBtnText}>Update Store Profile</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deactivateBtn}
                    onPress={() => setShowDeactivateModal(true)}
                    activeOpacity={0.88}
                >
                    <Text style={styles.deactivateBtnText}>Deactivate Store Account</Text>
                </TouchableOpacity>
            </View>

            {/* Deactivate Confirmation Modal */}
            <Modal visible={showDeactivateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBox}>
                                <AlertTriangle size={20} color="#DC2626" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Deactivate Store Account?</Text>
                                <Text style={styles.modalSub}>Permanent deletion warning</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => !isDeactivating && setShowDeactivateModal(false)}
                                disabled={isDeactivating}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginVertical: 12 }}>
                            <Text style={styles.modalBodyText}>
                                Are you sure you want to deactivate your store account?
                            </Text>
                            <Text style={styles.modalWarningText}>
                                ⚠️ All store products, inventory records, and restock purchase orders will be permanently deleted from the database.
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.confirmDeactivateBtn}
                                onPress={handleConfirmDeactivate}
                                disabled={isDeactivating}
                            >
                                <Text style={styles.confirmDeactivateText}>
                                    {isDeactivating ? 'Deactivating Store...' : 'Yes, Deactivate & Delete Everything'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.keepAccountBtn}
                                onPress={() => setShowDeactivateModal(false)}
                                disabled={isDeactivating}
                            >
                                <Text style={styles.keepAccountText}>Keep Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Logout Modal */}
            <Modal visible={showLogoutModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBox}>
                                <AlertTriangle size={20} color="#DC2626" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Confirm Logout?</Text>
                                <Text style={styles.modalSub}>Are you sure you want to log out of PickFresh?</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowLogoutModal(false)}>
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.confirmDeactivateBtn} onPress={handleConfirmLogout}>
                                <Text style={styles.confirmDeactivateText}>Yes, Log Out</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.keepAccountBtn} onPress={() => setShowLogoutModal(false)}>
                                <Text style={styles.keepAccountText}>Stay Logged In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topNavTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFF5F5',
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    logoutBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#DC2626',
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'android' ? 60 : 40,
    },
    saveToastBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    saveToastText: {
        color: '#166534',
        fontSize: 13,
        fontWeight: '700',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarWrap: {
        position: 'relative',
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: '#166534',
        padding: 3,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 45,
    },
    cameraBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#166534',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeName: {
        fontSize: 19,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 10,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 6,
    },
    verifiedBadgeText: {
        color: '#166534',
        fontSize: 12,
        fontWeight: '700',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
    },
    statusLeft: {
        flex: 1,
        marginRight: 10,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    statusSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusPillOpen: {
        backgroundColor: '#E8F5E9',
    },
    statusPillClosed: {
        backgroundColor: '#FEE2E2',
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusDotOpen: {
        backgroundColor: '#2E7D32',
    },
    statusDotClosed: {
        backgroundColor: '#B91C1C',
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: '800',
    },
    statusTextOpen: {
        color: '#2E7D32',
    },
    statusTextClosed: {
        color: '#B91C1C',
    },
    formGroup: {
        marginBottom: 14,
        position: 'relative',
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 6,
    },
    input: {
        height: 44,
        paddingHorizontal: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    inputDisabled: {
        backgroundColor: '#F8FAFC',
        color: '#64748B',
    },
    cityDropdown: {
        position: 'absolute',
        top: 72,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 50,
    },
    cityDropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    cityDropdownText: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '600',
    },
    fixedBottomActionBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'android' ? 24 : 14,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 4,
    },
    updateBtn: {
        backgroundColor: '#27672D',
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    updateBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    deactivateBtn: {
        backgroundColor: '#FFF1F2',
        borderWidth: 1,
        borderColor: '#FECDD3',
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deactivateBtnText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 20,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } : {}),
    },
    modalSheet: {
        width: '100%',
        maxWidth: 335,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    modalSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    modalBodyText: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18,
    },
    modalWarningText: {
        fontSize: 12,
        color: '#DC2626',
        fontWeight: '600',
        lineHeight: 16,
        marginTop: 8,
    },
    modalActions: {
        gap: 10,
        marginTop: 8,
    },
    confirmDeactivateBtn: {
        backgroundColor: '#DC2626',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmDeactivateText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    keepAccountBtn: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keepAccountText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '700',
    },
});
