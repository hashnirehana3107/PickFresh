import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Modal,
    Platform,
} from 'react-native';
import {
    LogOut,
    User,
    Camera,
    MapPin,
    Package,
    Clock,
    ChevronRight,
    AlertTriangle,
    X,
    CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { pickImageFromDevice } from '../../utils/imagePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CITIES_LIST = [
    'Colombo 01', 'Colombo 02', 'Colombo 03 (Colpetty)', 'Colombo 04 (Bambalapitiya)',
    'Colombo 05 (Havelock Town)', 'Colombo 06 (Wellawatte)', 'Colombo 07 (Cinnamon Gardens)',
    'Colombo 08 (Borella)', 'Dehiwala', 'Mount Lavinia', 'Moratuwa', 'Nugegoda',
    'Maharagama', 'Kotte', 'Battaramulla', 'Malabe', 'Homagama', 'Panadura',
    'Kandy', 'Galle', 'Matara', 'Kurunegala', 'Negombo', 'Gampaha', 'Anuradhapura',
    'Polonnaruwa', 'Trincomalee', 'Batticaloa', 'Jaffna', 'Ratnapura', 'Kegalle',
    'Badulla', 'Nuwara Eliya', 'Hambantota', 'Ampara',
];

let profileActiveOrderCache = null;

const isOrderActive = (ord) => {
    if (!ord) return false;
    const st = (ord.status || '').toLowerCase().trim();
    if (!st) return false;
    return !['collected', 'completed', 'cancelled', 'canceled'].includes(st);
};

const isOrderBelongsToUser = (ord, u) => {
    if (!ord || !u) return false;
    const ordEmail = (ord.customerEmail || '').toLowerCase().trim();
    const uEmail = (u.email || '').toLowerCase().trim();
    if (ordEmail && uEmail && ordEmail === uEmail) return true;
    const ordCustId = ord.customer ? String(ord.customer._id || ord.customer) : '';
    const uId = String(u._id || u.id || '');
    if (ordCustId && uId && ordCustId === uId) return true;
    return false;
};

export default function ProfilePage({ onNavigate, lastOrder, onOrderCancelled }) {
    const { user, logout, updateUser, deactivateAccount } = useAuth();

    const [name, setName] = useState(user?.name || user?.fullName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [location, setLocation] = useState(user?.location || 'Colombo');
    const [profileImage, setProfileImage] = useState(user?.picture || '');
    const [imageLoadError, setImageLoadError] = useState(false);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Live Orders State (strictly active order belonging to this customer)
    const [activeOrder, setActiveOrder] = useState(
        lastOrder && isOrderActive(lastOrder) && isOrderBelongsToUser(lastOrder, user)
            ? lastOrder
            : (profileActiveOrderCache && isOrderActive(profileActiveOrderCache) && isOrderBelongsToUser(profileActiveOrderCache, user) ? profileActiveOrderCache : null)
    );
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);

    // Modals
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const fileInputRef = useRef(null);

    // Instant rehydration strictly for the current logged-in user
    useEffect(() => {
        if (!user || (!user.email && !user._id && !user.id)) {
            profileActiveOrderCache = null;
            setActiveOrder(null);
            setIsLoadingOrders(false);
            return;
        }

        if (lastOrder) {
            if (isOrderActive(lastOrder) && isOrderBelongsToUser(lastOrder, user)) {
                profileActiveOrderCache = lastOrder;
                setActiveOrder(lastOrder);
                setIsLoadingOrders(false);
            } else {
                profileActiveOrderCache = null;
                setActiveOrder(null);
                AsyncStorage.removeItem('pickfresh_active_order').catch(() => {});
            }
        } else {
            AsyncStorage.getItem('pickfresh_active_order').then((cached) => {
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (parsed && isOrderActive(parsed) && isOrderBelongsToUser(parsed, user)) {
                            profileActiveOrderCache = parsed;
                            setActiveOrder(parsed);
                            setIsLoadingOrders(false);
                        } else {
                            AsyncStorage.removeItem('pickfresh_active_order').catch(() => {});
                            setActiveOrder(null);
                        }
                    } catch (e) {
                        setActiveOrder(null);
                    }
                } else {
                    setActiveOrder(null);
                }
            }).catch(() => {});
        }
    }, [lastOrder, user?.email, user?._id, user?.id]);

    // Sync profile state with user auth context
    useEffect(() => {
        if (user) {
            if (user.name || user.fullName) setName(user.name || user.fullName);
            if (user.email) setEmail(user.email);
            if (user.phone) setPhone(user.phone);
            if (user.location) setLocation(user.location);
            if (user.picture) {
                setProfileImage(user.picture);
                setImageLoadError(false);
            }
        }
    }, [user]);

    // Live sync user profile & picture directly from MongoDB Atlas backend
    useEffect(() => {
        const fetchFreshUserDetails = async () => {
            const reqEmail = user?.email;
            if (!reqEmail) return;
            try {
                const res = await fetch(`${API_BASE_URL}/auth/user-details?email=${encodeURIComponent(reqEmail)}`);
                const data = await res.json();
                if (res.ok && data.success && data.user) {
                    if (data.user.name) setName(data.user.name);
                    if (data.user.email) setEmail(data.user.email);
                    if (data.user.phone) setPhone(data.user.phone);
                    if (data.user.location) setLocation(data.user.location);
                    if (data.user.picture) {
                        setProfileImage(data.user.picture);
                        setImageLoadError(false);
                    }
                }
            } catch (err) {}
        };
        fetchFreshUserDetails();
    }, [user?.email]);

    // Fetch live customer orders strictly for the logged-in customer
    useEffect(() => {
        let isMounted = true;
        const fetchBackendOrders = async () => {
            if (!user || (!user.email && !user._id && !user.id)) {
                if (isMounted) {
                    profileActiveOrderCache = null;
                    setActiveOrder(null);
                    setIsLoadingOrders(false);
                }
                return;
            }

            try {
                const queryParams = new URLSearchParams();
                if (user.email) queryParams.append('customerEmail', user.email.trim());
                if (user._id || user.id) queryParams.append('customerId', user._id || user.id);

                const res = await fetch(`${API_BASE_URL}/orders?${queryParams.toString()}`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.orders) && isMounted) {
                    // Strict filtering to ONLY this customer's orders
                    const userOrders = data.orders.filter(o => isOrderBelongsToUser(o, user));
                    if (userOrders.length > 0) {
                        const sorted = [...userOrders].sort(
                            (a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
                        );
                        const firstActive = sorted.find((o) => isOrderActive(o));
                        if (firstActive) {
                            profileActiveOrderCache = firstActive;
                            setActiveOrder(firstActive);
                            AsyncStorage.setItem('pickfresh_active_order', JSON.stringify(firstActive)).catch(() => {});
                        } else {
                            profileActiveOrderCache = null;
                            setActiveOrder(null);
                            AsyncStorage.removeItem('pickfresh_active_order').catch(() => {});
                        }
                    } else {
                        profileActiveOrderCache = null;
                        setActiveOrder(null);
                        AsyncStorage.removeItem('pickfresh_active_order').catch(() => {});
                    }
                }
            } catch (err) {
                // Keep fallback
            } finally {
                if (isMounted) setIsLoadingOrders(false);
            }
        };

        fetchBackendOrders();

        const interval = setInterval(fetchBackendOrders, 10000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user?.email, user?._id, user?.id]);

    const handleConfirmLogout = () => {
        setShowLogoutModal(false);
        if (logout) logout();
        if (onNavigate) onNavigate('login');
    };

    const handleUpdateProfile = async () => {
        setIsUpdating(true);
        try {
            const reqEmail = email || user?.email;
            if (updateUser) {
                await updateUser({ name, email, phone, location, picture: profileImage });
            }
            if (reqEmail) {
                await fetch(`${API_BASE_URL}/auth/update-profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: reqEmail,
                        id: user?.id || user?._id,
                        name,
                        phone,
                        location,
                        picture: profileImage
                    })
                });
            }
            setSaveMessage('Profile details updated successfully in database!');
            setTimeout(() => setSaveMessage(''), 3500);
        } catch (err) {
            setSaveMessage('Failed to update profile details.');
            setTimeout(() => setSaveMessage(''), 3500);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleConfirmCancel = async () => {
        if (!activeOrder) return;
        setIsCancelling(true);
        try {
            const rawId = activeOrder._id || activeOrder.id || activeOrder.orderNumber;
            const orderId = encodeURIComponent(String(rawId).replace('#', '').trim());
            const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelled', cancellationReason: 'Ordered by mistake', isCustomer: true }),
            });
            const data = await res.json();
            setActiveOrder(null);
            AsyncStorage.removeItem('pickfresh_active_order').catch(() => {});
            if (onOrderCancelled) onOrderCancelled();
            setShowCancelModal(false);
            if (onNavigate) {
                onNavigate('history', { filter: 'cancelled' });
            }
        } catch (err) {
            setActiveOrder(null);
            AsyncStorage.removeItem('pickfresh_active_order').catch(() => {});
            if (onOrderCancelled) onOrderCancelled();
            setShowCancelModal(false);
            if (onNavigate) {
                onNavigate('history', { filter: 'cancelled' });
            }
        } finally {
            setIsCancelling(false);
        }
    };

    const handleConfirmDeactivate = async () => {
        setShowDeactivateModal(false);
        if (deactivateAccount) {
            await deactivateAccount();
        }
        if (onNavigate) {
            onNavigate('login');
        }
    };

    // Universal image picker (works on Android APK, iOS, Web)
    const triggerImagePicker = async () => {
        if (Platform.OS !== 'web') {
            const uri = await pickImageFromDevice({ aspect: [1, 1], quality: 0.6 });
            if (uri) {
                setImageLoadError(false);
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
                            body: JSON.stringify({
                                email: reqEmail,
                                id: user?.id || user?._id,
                                picture: uri
                            })
                        });
                    } catch (e) {
                        console.warn('Direct image save err:', e);
                    }
                }
                setSaveMessage('Profile picture updated & synced with database!');
                setTimeout(() => setSaveMessage(''), 3000);
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
                        setImageLoadError(false);
                        const newPic = reader.result;
                        setProfileImage(newPic);
                        if (updateUser) {
                            await updateUser({ picture: newPic });
                        }
                        const reqEmail = email || user?.email;
                        if (reqEmail) {
                            try {
                                await fetch(`${API_BASE_URL}/auth/update-profile`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        email: reqEmail,
                                        id: user?.id || user?._id,
                                        picture: newPic
                                    })
                                });
                            } catch (e) {
                                console.warn('Direct image save err:', e);
                            }
                        }
                        setSaveMessage('Profile picture updated & synced with database!');
                        setTimeout(() => setSaveMessage(''), 3000);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }
    };

    const getInitials = (fullName) => {
        if (!fullName || typeof fullName !== 'string') return 'KF';
        const clean = fullName.trim();
        if (!clean) return 'KF';
        const parts = clean.split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    };

    const filteredCities = CITIES_LIST.filter((c) =>
        c.toLowerCase().includes((location || '').toLowerCase())
    );

    return (
        <View style={styles.container}>
            {/* Header matching Image 1 */}
            <View style={styles.header}>
                <Text style={styles.title}>My profile</Text>
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={() => setShowLogoutModal(true)}
                    activeOpacity={0.7}
                    accessibilityLabel="Log out"
                >
                    <LogOut size={24} color="#EF4444" strokeWidth={2} />
                </TouchableOpacity>
            </View>

            {/* Scrollable Body */}
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Toast Message */}
                {saveMessage ? (
                    <View style={styles.toastBox}>
                        <CheckCircle size={16} color="#15803D" />
                        <Text style={styles.toastText}>{saveMessage}</Text>
                    </View>
                ) : null}

                {/* Profile Picture with Camera Badge */}
                <View style={styles.picContainer}>
                    <TouchableOpacity
                        style={styles.picWrapper}
                        onPress={triggerImagePicker}
                        activeOpacity={0.85}
                    >
                        <View style={styles.picCircle}>
                            {profileImage && !imageLoadError ? (
                                <Image
                                    source={{ uri: profileImage }}
                                    style={styles.avatarImg}
                                    resizeMode="cover"
                                    onError={() => setImageLoadError(true)}
                                />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitials}>
                                        {getInitials(name)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.cameraBadge}>
                            <Camera size={18} color="#FFFFFF" strokeWidth={2.2} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={triggerImagePicker} activeOpacity={0.7}>
                        <Text style={styles.changePhotoText}>Tap photo to change</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Elements */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Full name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your full name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email address</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="Your email address"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone number</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholder="0719876502"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Preferred Pickup Location / City</Text>
                    <View style={styles.locationInputBox}>
                        <TextInput
                            style={styles.locationInput}
                            value={location}
                            onChangeText={(val) => {
                                setLocation(val);
                                setShowCityDropdown(true);
                            }}
                            onFocus={() => setShowCityDropdown(true)}
                            placeholder="Select pickup city..."
                            placeholderTextColor="#94A3B8"
                        />
                        <View style={styles.locationIconWrap}>
                            <MapPin size={16} color="#2D7B38" />
                        </View>
                    </View>

                    {/* City Dropdown Menu */}
                    {showCityDropdown && (
                        <View style={styles.cityDropdown}>
                            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                                {filteredCities.length > 0 ? (
                                    filteredCities.map((city) => (
                                        <TouchableOpacity
                                            key={city}
                                            style={styles.cityItem}
                                            onPress={() => {
                                                setLocation(city);
                                                setShowCityDropdown(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.cityItemText}>{city}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.cityItem}>
                                        <Text style={styles.cityItemNone}>No matching cities found</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* Orders Section Synced with Live MongoDB Atlas Database (Image 2) */}
                <View style={styles.ordersSection}>
                    <Text style={styles.ordersSectionTitle}>My Orders</Text>

                    {/* Loading State matching React Web */}
                    {isLoadingOrders && !activeOrder ? (
                        <View style={styles.loadingOrdersBox}>
                            <ActivityIndicator size="small" color="#2D7B38" />
                            <Text style={styles.loadingOrdersText}>Loading live orders from database...</Text>
                        </View>
                    ) : (activeOrder && isOrderActive(activeOrder)) ? (
                        <View style={styles.activeOrderCard}>
                            <View style={styles.aoHeader}>
                                <View style={styles.aoStatusBadge}>
                                    <View style={styles.aoDot} />
                                    <Text style={styles.aoStatusText}>{activeOrder.status || 'Pending'}</Text>
                                </View>
                                <Text style={styles.aoOrderNum}>
                                    #{activeOrder.orderNumber ? (activeOrder.orderNumber.startsWith('#') ? activeOrder.orderNumber.slice(1) : activeOrder.orderNumber) : 'PF-0013'}
                                </Text>
                            </View>

                            <View style={styles.aoBody}>
                                <View style={styles.aoInfo}>
                                    <Text style={styles.aoStore}>{activeOrder.pickupStore || 'GroceryMart'}</Text>
                                    <Text style={styles.aoTime}>
                                        Pickup: {activeOrder.pickupDate || 'Today'}, {activeOrder.pickupTimeSlot || '5:00 PM - 5:30 PM'}
                                    </Text>
                                </View>
                                <Package size={28} color="#CC7A00" />
                            </View>

                            <View style={styles.aoActionsRow}>
                                <TouchableOpacity
                                    style={styles.aoTrackBtn}
                                    onPress={() => onNavigate && onNavigate('live_tracking', activeOrder)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.aoTrackBtnText}>Track Order</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.aoCancelBtn}
                                    onPress={() => setShowCancelModal(true)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.aoCancelBtnText}>Cancel Order</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}

                    {/* Past Orders List Item */}
                    <TouchableOpacity
                        style={styles.pastOrdersItem}
                        onPress={() => onNavigate && onNavigate('history')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.poIconBg}>
                            <Clock size={20} color="#347D39" />
                        </View>
                        <View style={styles.poTextCol}>
                            <Text style={styles.poTitle}>My Orders</Text>
                            <Text style={styles.poSub}>View your order history</Text>
                        </View>
                        <ChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                {/* Bottom padding for fixed buttons */}
                <View style={{ height: 145 }} />
            </ScrollView>

            {/* Fixed Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.updateProfileBtn}
                    onPress={handleUpdateProfile}
                    disabled={isUpdating}
                    activeOpacity={0.85}
                >
                    {isUpdating ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.updateProfileBtnText}>Update profile</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deactivateBtn}
                    onPress={() => setShowDeactivateModal(true)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.deactivateBtnText}>Deactivate account</Text>
                </TouchableOpacity>
            </View>

            {/* Deactivate Account Confirmation Modal */}
            <Modal
                visible={showDeactivateModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeactivateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBoxRed}>
                                <AlertTriangle size={22} color="#DC2626" />
                            </View>
                            <View style={styles.modalTitles}>
                                <Text style={styles.modalTitle}>Deactivate Account?</Text>
                                <Text style={styles.modalSub}>
                                    This will permanently remove your PickFresh customer account from the database.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowDeactivateModal(false)}
                                style={styles.modalClose}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.btnConfirmDeactivate}
                                onPress={handleConfirmDeactivate}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.btnConfirmDeactivateText}>
                                    Yes, Deactivate Account
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnKeepAccount}
                                onPress={() => setShowDeactivateModal(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnKeepAccountText}>Keep My Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Cancel Order Confirmation Modal (In-Shell) */}
            {showCancelModal && (
                <View style={styles.shellModalOverlay}>
                    <TouchableOpacity
                        style={styles.shellModalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowCancelModal(false)}
                    />
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBoxRed}>
                                <AlertTriangle size={22} color="#DC2626" />
                            </View>
                            <View style={styles.modalTitles}>
                                <Text style={styles.modalTitle}>Cancel Order?</Text>
                                <Text style={styles.modalSub}>
                                    Are you sure you want to cancel order #{activeOrder?.orderNumber ? activeOrder.orderNumber.replace('#', '') : 'PF-0016'}?
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowCancelModal(false)}
                                style={styles.modalClose}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.btnConfirmDeactivate}
                                onPress={handleConfirmCancel}
                                disabled={isCancelling}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.btnConfirmDeactivateText}>
                                    {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnKeepAccount}
                                onPress={() => setShowCancelModal(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnKeepAccountText}>Keep Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Customer Logout Confirmation Modal */}
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
        backgroundColor: '#FAF9F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 22,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
    },
    logoutBtn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 1,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: Platform.OS === 'android' ? 160 : 130,
    },
    toastBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    toastText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#166534',
        flex: 1,
    },
    picContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    picWrapper: {
        position: 'relative',
    },
    picCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#DCFCE7',
        borderWidth: 3.5,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
        elevation: 4,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2D7B38',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 38,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#347D39',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 3,
    },
    changePhotoText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#347D39',
        marginTop: 8,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        fontSize: 15,
        fontWeight: '600',
        color: '#112A46',
    },
    locationInputBox: {
        position: 'relative',
        justifyContent: 'center',
    },
    locationInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingLeft: 16,
        paddingRight: 40,
        height: 50,
        fontSize: 15,
        fontWeight: '600',
        color: '#112A46',
    },
    locationIconWrap: {
        position: 'absolute',
        right: 14,
        top: 17,
        pointerEvents: 'none',
    },
    cityDropdown: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        marginTop: 6,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
        zIndex: 20,
    },
    cityItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    cityItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    cityItemNone: {
        fontSize: 14,
        color: '#64748B',
    },
    ordersSection: {
        marginTop: 8,
        marginBottom: 24,
    },
    ordersSectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#112A46',
        marginBottom: 16,
        marginLeft: 4,
    },
    loadingOrdersBox: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    loadingOrdersText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    activeOrderCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FED7AA',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 1,
    },
    aoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    aoStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFF5E6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    aoDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#CC7A00',
    },
    aoStatusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#CC7A00',
    },
    aoOrderNum: {
        fontSize: 13,
        fontWeight: '800',
        color: '#475569',
    },
    aoBody: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    aoInfo: {
        flex: 1,
        gap: 4,
    },
    aoStore: {
        fontSize: 15,
        fontWeight: '800',
        color: '#112A46',
    },
    aoTime: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 4,
    },
    aoActionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    aoTrackBtn: {
        flex: 1,
        backgroundColor: '#FFF5E6',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aoTrackBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#CC7A00',
    },
    aoCancelBtn: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aoCancelBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#DC2626',
    },
    pastOrdersItem: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    poIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E6F4EA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    poTextCol: {
        flex: 1,
        marginLeft: 12,
    },
    poTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#112A46',
    },
    poSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'android' ? 22 : 14,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 6,
    },
    updateProfileBtn: {
        backgroundColor: '#2D7B38',
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
    },
    updateProfileBtnText: {
        color: '#FFFFFF',
        fontSize: 15.5,
        fontWeight: '700',
    },
    deactivateBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deactivateBtnText: {
        color: '#DC2626',
        fontSize: 15,
        fontWeight: '700',
    },
    shellModalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 20,
        zIndex: 9999,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } : {}),
    },
    shellModalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
    modalCard: {
        width: '100%',
        maxWidth: 335,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 22,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        position: 'relative',
    },
    modalIconBoxRed: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalTitles: {
        flex: 1,
        paddingRight: 20,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    modalSub: {
        fontSize: 12.5,
        color: '#64748B',
        lineHeight: 18,
    },
    modalClose: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 4,
    },
    modalActions: {
        marginTop: 18,
        gap: 8,
    },
    btnConfirmDeactivate: {
        backgroundColor: '#DC2626',
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnConfirmDeactivateText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    btnKeepAccount: {
        backgroundColor: '#F1F5F9',
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnKeepAccountText: {
        color: '#475569',
        fontSize: 13,
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
