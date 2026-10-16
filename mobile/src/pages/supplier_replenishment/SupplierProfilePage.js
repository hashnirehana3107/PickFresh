import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    Modal,
    ActivityIndicator,
    Alert,
    Platform,
    Animated,
} from 'react-native';
import {
    ArrowLeft,
    Camera,
    LogOut,
    Truck,
    Phone,
    Mail,
    MapPin,
    CheckCircle2,
    ShieldCheck,
    Tag,
    Building,
    Globe,
    X,
    Plus,
    AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { CITIES_LIST } from '../../utils/cities';
import { SUPPLY_CATEGORIES } from '../../utils/categories';
import { API_BASE_URL } from '../../config/api';
import { pickImageFromDevice } from '../../utils/imagePicker';

export default function SupplierProfileScreen({ onNavigate }) {
    const { user, logout, updateUser, deactivateAccount } = useAuth();

    const defaultAvatar =
        user?.picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.supplierName || user?.name || 'Supplier')}&background=15803D&color=fff&size=150`;

    const [profileImage, setProfileImage] = useState(defaultAvatar);
    const [supplierName, setSupplierName] = useState(user?.supplierName || user?.name || '');
    const [contactPerson, setContactPerson] = useState(user?.contactPerson || user?.name || '');
    const [driverName, setDriverName] = useState(user?.driverName || user?.defaultDriverName || '');
    const [vehicleNo, setVehicleNo] = useState(user?.vehicleNo || user?.defaultVehicleNo || '');
    const [driversList, setDriversList] = useState(user?.driversList || []);
    const [selectedSupplyCategories, setSelectedSupplyCategories] = useState([
        'Dairy & Eggs',
        'Soft Drinks',
        'Fruits',
        'Vegetables',
        'Snacks',
        'Health & Beauty',
        'Meat & Seafood',
        'Household & Essentials',
    ]);
    const [selectedSupplyRegions, setSelectedSupplyRegions] = useState(['Islandwide']);
    const [citySearch, setCitySearch] = useState('');
    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [saveToast, setSaveToast] = useState('');
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [categoriesList, setCategoriesList] = useState(SUPPLY_CATEGORIES);

    // Pulse animation for Active Partner status dot
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.35,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    const populateUserData = (userData) => {
        if (!userData) return;
        if (userData.supplierName || userData.name) {
            setSupplierName(userData.supplierName || userData.name);
        }
        if (userData.contactPerson) setContactPerson(userData.contactPerson);
        if (userData.driverName || userData.defaultDriverName) {
            setDriverName(userData.driverName || userData.defaultDriverName);
        }
        if (userData.vehicleNo || userData.defaultVehicleNo) {
            setVehicleNo(userData.vehicleNo || userData.defaultVehicleNo);
        }
        if (userData.driversList && Array.isArray(userData.driversList)) {
            setDriversList(userData.driversList);
        }

        let initialCategories = [];
        if (Array.isArray(userData.supplyCategories) && userData.supplyCategories.length > 0) {
            initialCategories = userData.supplyCategories;
        } else if (userData.supplyCategory) {
            initialCategories = userData.supplyCategory.split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (initialCategories.length > 0) {
            setSelectedSupplyCategories(initialCategories);
        }

        let initialRegions = [];
        if (Array.isArray(userData.supplyRegions) && userData.supplyRegions.length > 0) {
            initialRegions = userData.supplyRegions;
        } else if (userData.supplyRegion) {
            initialRegions = userData.supplyRegion.split(',').map((s) => s.trim()).filter(Boolean);
        } else if (userData.location) {
            initialRegions = [userData.location];
        }
        if (initialRegions.length > 0) {
            setSelectedSupplyRegions(initialRegions);
        }

        if (userData.phone) setPhone(userData.phone);
        if (userData.email) setEmail(userData.email);
        if (userData.picture) setProfileImage(userData.picture);
    };

    // Load initial user state and fetch fresh real-time MongoDB Atlas profile
    useEffect(() => {
        if (user) {
            populateUserData(user);
        }
        const reqEmail = user?.email || '';
        if (!reqEmail) return;
        fetch(`${API_BASE_URL}/auth/user-details?email=${encodeURIComponent(reqEmail)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.user) {
                    populateUserData(data.user);
                }
            })
            .catch((err) => console.warn('Failed to load live user details:', err));
    }, [user]);

    // Live categories from backend
    useEffect(() => {
        fetch(`${API_BASE_URL}/product-inventory/categories`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success && Array.isArray(data.categories)) {
                    const names = data.categories.map((c) => c.name).filter(Boolean);
                    if (names.length > 0) setCategoriesList(names);
                }
            })
            .catch((err) => console.warn('Failed to fetch live categories for profile:', err));
    }, []);

    // Change supplier profile picture
    const handlePickImage = async () => {
        if (Platform.OS !== 'web') {
            const uri = await pickImageFromDevice({ aspect: [1, 1], quality: 0.6 });
            if (uri) {
                setProfileImage(uri);
                if (updateUser) {
                    await updateUser({ picture: uri });
                }
                const reqEmail = email || user?.email;
                if (reqEmail) {
                    try {
                        await fetch(`${API_BASE_URL}/auth/update-profile`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: reqEmail, picture: uri }),
                        });
                    } catch (e) {}
                }
                setSaveToast('Supplier logo updated successfully in database! 🚛');
                setTimeout(() => setSaveToast(''), 3000);
            }
            return;
        }
        if (typeof document !== 'undefined') {
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
                        const reqEmail = email || user?.email;
                        if (reqEmail) {
                            try {
                                await fetch(`${API_BASE_URL}/auth/update-profile`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: reqEmail, picture: reader.result }),
                                });
                            } catch (e) {}
                        }
                        setSaveToast('Supplier logo updated successfully in database! 🚛');
                        setTimeout(() => setSaveToast(''), 3000);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }
    };

    // Save profile to MongoDB Atlas via backend API
    const handleSave = async () => {
        setSaving(true);
        const formattedRegionStr = selectedSupplyRegions.length > 0 ? selectedSupplyRegions.join(', ') : 'Islandwide';
        const formattedCategoryStr = selectedSupplyCategories.length > 0 ? selectedSupplyCategories.join(', ') : 'Dairy & Eggs, Soft Drinks';

        try {
            if (updateUser) {
                await updateUser({
                    supplierName,
                    contactPerson,
                    driverName,
                    defaultDriverName: driverName,
                    vehicleNo,
                    defaultVehicleNo: vehicleNo,
                    driversList,
                    name: supplierName || user?.name,
                    phone,
                    supplyCategories: selectedSupplyCategories,
                    supplyCategory: formattedCategoryStr,
                    supplyRegions: selectedSupplyRegions,
                    supplyRegion: formattedRegionStr,
                    location: formattedRegionStr,
                    picture: profileImage,
                });
            }
            setSaveToast('Supplier profile updated successfully in MongoDB Atlas! 🚛');
            setTimeout(() => setSaveToast(''), 3000);
        } catch (err) {
            Alert.alert('Error', 'Failed to save changes: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmLogout = () => {
        setShowLogoutModal(false);
        if (logout) logout();
        if (onNavigate) onNavigate('login');
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

    const toggleIslandwide = () => {
        const islandwideStr = 'Islandwide';
        if (selectedSupplyRegions.includes(islandwideStr)) {
            setSelectedSupplyRegions(selectedSupplyRegions.filter((c) => c !== islandwideStr));
        } else {
            setSelectedSupplyRegions([islandwideStr, ...selectedSupplyRegions]);
        }
    };

    return (
        <View style={styles.container}>
            {/* 🔝 Top Navigation Bar matching React Web */}
            <View style={styles.topNav}>
                <Text style={styles.topNavTitle}>Supplier Profile</Text>

                <View style={styles.topNavActions}>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={() => setShowLogoutModal(true)}
                        activeOpacity={0.7}
                    >
                        <LogOut size={16} color="#DC2626" />
                        <Text style={styles.logoutBtnText}>Logout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => onNavigate && onNavigate('home')}
                        activeOpacity={0.7}
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={18} color="#1E293B" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 📜 Scrollable Content Area */}
            <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollBodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Save Confirmation Toast */}
                {saveToast ? (
                    <View style={styles.saveToastBox}>
                        <Text style={styles.saveToastText}>{saveToast}</Text>
                    </View>
                ) : null}

                {/* Avatar & Supplier Info Header */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity
                        style={styles.avatarWrap}
                        onPress={handlePickImage}
                        activeOpacity={0.8}
                    >
                        <Image
                            source={{ uri: profileImage }}
                            style={styles.avatarImg}
                            resizeMode="cover"
                        />
                        <View style={styles.cameraBtn}>
                            <Camera size={14} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.businessName}>
                        {supplierName || user?.name || 'Wholesale Supplier'}
                    </Text>
                    <View style={styles.verifiedBadge}>
                        <ShieldCheck size={14} color="#15803D" />
                        <Text style={styles.verifiedText}>Verified Supply Partner</Text>
                    </View>
                </View>

                {/* Premium Supplier Verification Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusLeft}>
                        <CheckCircle2 size={17} color="#059669" />
                        <Text style={styles.statusCardTitle}>Supply Account Active</Text>
                    </View>
                    <View style={styles.statusPill}>
                        <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
                        <Text style={styles.statusPillText}>ACTIVE PARTNER</Text>
                    </View>
                </View>

                {/* Form Field: Supplier / Business Name */}
                <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                        <Building size={14} color="#334155" />
                        <Text style={styles.labelText}>Supplier / Business Name</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        value={supplierName}
                        onChangeText={setSupplierName}
                        placeholder="e.g. Fresh Valley Farms"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {/* Form Field: Contact Person Name */}
                <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                        <Truck size={14} color="#334155" />
                        <Text style={styles.labelText}>Contact Person Name</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        value={contactPerson}
                        onChangeText={setContactPerson}
                        placeholder="Contact person full name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {/* Form Field: Supply Categories */}
                <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                        <Tag size={14} color="#334155" />
                        <Text style={styles.labelText}>
                            Supply Categories ({selectedSupplyCategories.length})
                        </Text>
                    </View>

                    {/* Displayed Selected Categories Badges Box */}
                    <View style={styles.badgesBox}>
                        {selectedSupplyCategories.length === 0 ? (
                            <Text style={styles.emptyBadgesText}>
                                No categories selected. Click below to add supply categories.
                            </Text>
                        ) : (
                            selectedSupplyCategories.map((cat) => (
                                <View key={cat} style={styles.catBadge}>
                                    <Tag size={12} color="#B45309" />
                                    <Text style={styles.catBadgeText}>{cat}</Text>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setSelectedSupplyCategories(
                                                selectedSupplyCategories.filter((c) => c !== cat)
                                            )
                                        }
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    >
                                        <X size={13} color="#B45309" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Add Category Dropdown Button */}
                    <TouchableOpacity
                        style={styles.selectDropdownBtn}
                        onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.selectDropdownText}>
                            + Select and Add Supply Categories...
                        </Text>
                        <Plus size={16} color="#64748B" />
                    </TouchableOpacity>

                    {/* Category Dropdown List */}
                    {showCategoryDropdown && (
                        <View style={styles.dropdownMenu}>
                            {categoriesList.filter((c) => !selectedSupplyCategories.includes(c)).length > 0 ? (
                                categoriesList
                                    .filter((c) => !selectedSupplyCategories.includes(c))
                                    .map((cat) => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={styles.dropdownMenuItem}
                                            onPress={() => {
                                                setSelectedSupplyCategories([...selectedSupplyCategories, cat]);
                                                setShowCategoryDropdown(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownMenuItemText}>{cat}</Text>
                                            <Plus size={14} color="#B45309" />
                                        </TouchableOpacity>
                                    ))
                            ) : (
                                <View style={styles.dropdownEmptyItem}>
                                    <Text style={styles.dropdownEmptyText}>All categories selected</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Form Field: Supply Regions / Cities */}
                <View style={styles.formGroup}>
                    <View style={styles.regionHeaderRow}>
                        <View style={styles.labelRow}>
                            <MapPin size={14} color="#334155" />
                            <Text style={styles.labelText}>
                                Supply Regions / Cities ({selectedSupplyRegions.length})
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.islandwideBtn,
                                selectedSupplyRegions.includes('Islandwide') && styles.islandwideBtnActive,
                            ]}
                            onPress={toggleIslandwide}
                            activeOpacity={0.7}
                        >
                            <Globe
                                size={13}
                                color={selectedSupplyRegions.includes('Islandwide') ? '#15803D' : '#475569'}
                            />
                            <Text
                                style={[
                                    styles.islandwideBtnText,
                                    selectedSupplyRegions.includes('Islandwide') && styles.islandwideBtnTextActive,
                                ]}
                            >
                                {selectedSupplyRegions.includes('Islandwide')
                                    ? '✓ Islandwide Active'
                                    : '+ Islandwide Option'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Displayed Selected Cities Badges Box */}
                    <View style={styles.badgesBox}>
                        {selectedSupplyRegions.length === 0 ? (
                            <Text style={styles.emptyBadgesText}>
                                No cities added. Use the input below to search and add multiple cities or select Islandwide.
                            </Text>
                        ) : (
                            selectedSupplyRegions.map((city) => {
                                const isIslandwide = city.includes('Islandwide');
                                return (
                                    <View
                                        key={city}
                                        style={[
                                            styles.cityBadge,
                                            isIslandwide && styles.cityBadgeIslandwide,
                                        ]}
                                    >
                                        {isIslandwide ? (
                                            <Globe size={13} color="#166534" />
                                        ) : (
                                            <MapPin size={13} color="#15803D" />
                                        )}
                                        <Text
                                            style={[
                                                styles.cityBadgeText,
                                                isIslandwide && styles.cityBadgeTextIslandwide,
                                            ]}
                                        >
                                            {city}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() =>
                                                setSelectedSupplyRegions(
                                                    selectedSupplyRegions.filter((c) => c !== city)
                                                )
                                            }
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                        >
                                            <X
                                                size={13}
                                                color={isIslandwide ? '#166534' : '#15803D'}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    {/* Add City Input & Dropdown */}
                    <View style={{ position: 'relative' }}>
                        <TextInput
                            style={styles.input}
                            value={citySearch}
                            onChangeText={(val) => {
                                setCitySearch(val);
                                setShowCityDropdown(true);
                            }}
                            onFocus={() => setShowCityDropdown(true)}
                            placeholder="+ Add more cities (e.g. Gampola, Weligama, Nuwara Eliya, Kandy)..."
                            placeholderTextColor="#94A3B8"
                        />

                        {showCityDropdown && (
                            <View style={styles.dropdownMenu}>
                                <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                                    {CITIES_LIST
                                        .filter((c) => !selectedSupplyRegions.includes(c))
                                        .filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()))
                                        .slice(0, 15)
                                        .map((city) => (
                                            <TouchableOpacity
                                                key={city}
                                                style={styles.dropdownMenuItem}
                                                onPress={() => {
                                                    setSelectedSupplyRegions([...selectedSupplyRegions, city]);
                                                    setCitySearch('');
                                                    setShowCityDropdown(false);
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    {city.includes('Islandwide') ? (
                                                        <Globe size={14} color="#15803D" />
                                                    ) : (
                                                        <MapPin size={14} color="#64748B" />
                                                    )}
                                                    <Text style={styles.dropdownMenuItemText}>{city}</Text>
                                                </View>
                                                <Plus size={14} color="#15803D" />
                                            </TouchableOpacity>
                                        ))}
                                    {CITIES_LIST
                                        .filter((c) => !selectedSupplyRegions.includes(c))
                                        .filter((c) => c.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                                        <View style={styles.dropdownEmptyItem}>
                                            <Text style={styles.dropdownEmptyText}>
                                                {selectedSupplyRegions.length === CITIES_LIST.length
                                                    ? 'All available cities added'
                                                    : 'No matching cities found'}
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                {/* Form Field: Contact Phone Number */}
                <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                        <Phone size={14} color="#334155" />
                        <Text style={styles.labelText}>Contact Phone Number</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Contact phone (e.g. 0771234567)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Form Field: Email Address (Disabled) */}
                <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                        <Mail size={14} color="#334155" />
                        <Text style={styles.labelText}>Email Address</Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.inputDisabled]}
                        value={email}
                        editable={false}
                        placeholder="Email address"
                        placeholderTextColor="#94A3B8"
                    />
                </View>
            </ScrollView>

            {/* 🔒 Fixed Bottom Action Bar */}
            <View style={styles.bottomActionBar}>
                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save & Update Profile</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deactivateBtn}
                    onPress={() => setShowDeactivateModal(true)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.deactivateBtnText}>Deactivate Supplier Account</Text>
                </TouchableOpacity>
            </View>

            {/* Deactivate Supplier Account Confirmation Modal */}
            <Modal visible={showDeactivateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBox}>
                                <AlertTriangle size={20} color="#DC2626" />
                            </View>
                            <View style={styles.modalTitles}>
                                <Text style={styles.modalTitleText}>Deactivate Supplier Account?</Text>
                                <Text style={styles.modalSubText}>Permanent deletion warning</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => !isDeactivating && setShowDeactivateModal(false)}
                                disabled={isDeactivating}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.modalDescText}>
                                Are you sure you want to deactivate your supplier account?
                            </Text>
                            <Text style={styles.modalWarningText}>
                                ⚠️ Your supplier business, wholesale catalog products, restock delivery records, and alerts will be permanently deleted from the database.
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleConfirmDeactivate}
                                disabled={isDeactivating}
                                activeOpacity={0.8}
                            >
                                {isDeactivating ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalConfirmBtnText}>
                                        Yes, Deactivate & Delete Everything
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalKeepBtn}
                                onPress={() => setShowDeactivateModal(false)}
                                disabled={isDeactivating}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalKeepBtnText}>Keep Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Supplier Logout Confirmation Modal */}
            <Modal visible={showLogoutModal} transparent animationType="fade">
                <View style={styles.logoutModalOverlay}>
                    <View style={styles.logoutModalCard}>
                        <View style={styles.logoutModalHeader}>
                            <View style={styles.logoutIconBox}>
                                <AlertTriangle size={20} color="#DC2626" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.logoutModalTitle}>Confirm Logout?</Text>
                                <Text style={styles.logoutModalSub}>Are you sure you want to log out of PickFresh?</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowLogoutModal(false)}>
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.logoutModalActions}>
                            <TouchableOpacity style={styles.logoutConfirmBtn} onPress={handleConfirmLogout}>
                                <Text style={styles.logoutConfirmText}>Yes, Log Out</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.logoutCancelBtn} onPress={() => setShowLogoutModal(false)}>
                                <Text style={styles.logoutCancelText}>Stay Logged In</Text>
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
        backgroundColor: '#F8FAFC',
    },
    // Top Nav
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        zIndex: 10,
    },
    topNavTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    topNavActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
    },
    logoutBtnText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '700',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    // Scroll Area
    scrollBody: {
        flex: 1,
    },
    scrollBodyContent: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: Platform.OS === 'android' ? 44 : 24,
    },
    saveToastBox: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    saveToastText: {
        color: '#166534',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    // Avatar Section
    avatarSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarWrap: {
        position: 'relative',
        width: 90,
        height: 90,
        marginBottom: 10,
    },
    avatarImg: {
        width: 90,
        height: 90,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        backgroundColor: '#DCFCE7',
    },
    cameraBtn: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#15803D',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    businessName: {
        fontSize: 19,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 6,
        textAlign: 'center',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    verifiedText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#15803D',
    },
    // Status Card
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 18,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    statusCardTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#065F46',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    statusPillText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    // Form Groups
    formGroup: {
        marginBottom: 14,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    labelText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 14,
        color: '#0F172A',
    },
    inputDisabled: {
        backgroundColor: '#F8FAFC',
        color: '#64748B',
    },
    // Badges Box
    badgesBox: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 8,
        minHeight: 38,
        marginBottom: 8,
    },
    emptyBadgesText: {
        fontSize: 12,
        color: '#94A3B8',
        padding: 2,
    },
    catBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 16,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    catBadgeText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#B45309',
    },
    selectDropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    selectDropdownText: {
        fontSize: 14,
        color: '#64748B',
    },
    dropdownMenu: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
        zIndex: 50,
        overflow: 'hidden',
    },
    dropdownMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dropdownMenuItemText: {
        fontSize: 13.5,
        color: '#1E293B',
    },
    dropdownEmptyItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    dropdownEmptyText: {
        fontSize: 13,
        color: '#64748B',
    },
    // Region Row & Badges
    regionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    islandwideBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F1F5F9',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    islandwideBtnActive: {
        backgroundColor: '#DCFCE7',
    },
    islandwideBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#475569',
    },
    islandwideBtnTextActive: {
        color: '#15803D',
    },
    cityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 16,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    cityBadgeIslandwide: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    cityBadgeText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#15803D',
    },
    cityBadgeTextIslandwide: {
        color: '#166534',
    },
    // Bottom Action Bar
    bottomActionBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'android' ? 24 : 14,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 8,
    },
    saveBtn: {
        backgroundColor: '#15803D',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#15803D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 4,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    deactivateBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deactivateBtnText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '700',
    },
    // Deactivate Modal
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
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 335,
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
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    modalIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitles: {
        flex: 1,
    },
    modalTitleText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
    },
    modalSubText: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        marginBottom: 16,
    },
    modalDescText: {
        fontSize: 13.5,
        color: '#475569',
        lineHeight: 20,
    },
    modalWarningText: {
        fontSize: 12.5,
        color: '#DC2626',
        fontWeight: '600',
        lineHeight: 18,
        marginTop: 8,
    },
    modalActions: {
        gap: 10,
    },
    modalConfirmBtn: {
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    modalConfirmBtnText: {
        color: '#FFFFFF',
        fontSize: 14.5,
        fontWeight: '700',
    },
    modalKeepBtn: {
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalKeepBtnText: {
        color: '#475569',
        fontSize: 14.5,
        fontWeight: '700',
    },
    logoutModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 20,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)' } : {}),
    },
    logoutModalCard: {
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
    logoutModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoutIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutModalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    logoutModalSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    logoutModalActions: {
        gap: 10,
        marginTop: 18,
    },
    logoutConfirmBtn: {
        backgroundColor: '#DC2626',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutConfirmText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    logoutCancelBtn: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutCancelText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '700',
    },
});
