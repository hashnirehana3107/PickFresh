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
import {
    ArrowLeft,
    Eye,
    EyeOff,
    User,
    Store,
    Truck,
    AlertCircle,
    Check,
    Plus,
    X,
    MapPin,
    Globe,
    ChevronDown,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import GoogleAuthModal from '../../components/auth/GoogleAuthModal';
import AppleAuthModal from '../../components/auth/AppleAuthModal';
import { loadGoogleSdk, triggerGoogleAuth } from '../../utils/googleAuth';
import { CITIES_LIST } from '../../utils/cities';
import { SUPPLY_CATEGORIES } from '../../utils/categories';
import { API_BASE_URL } from '../../config/api';

export default function SignUpScreen({ onNavigate, selectedRole = 'customer' }) {
    const { register, loginWithGoogle } = useAuth();
    const role = selectedRole || 'customer';

    // State fields for all role types
    const [fullName, setFullName] = useState('');
    const [shopName, setShopName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [selectedSupplyCategories, setSelectedSupplyCategories] = useState([]);
    const [selectedSupplyRegions, setSelectedSupplyRegions] = useState(["Colombo 03 (Colpetty)"]);
    const [citySearch, setCitySearch] = useState('');
    const [location, setLocation] = useState('Colombo 03');

    // Dropdown visibility states
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [showSupplierCityDropdown, setShowSupplierCityDropdown] = useState(false);

    // Dynamic categories from backend or fallback to SUPPLY_CATEGORIES
    const [categoriesList, setCategoriesList] = useState(SUPPLY_CATEGORIES);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/product-inventory/categories`);
                const data = await res.json();
                if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
                    const dynamicNames = data.categories.map((c) => c.name).filter(Boolean);
                    if (dynamicNames.length > 0) {
                        setCategoriesList(dynamicNames);
                    }
                }
            } catch (err) {
                console.log('Using default SUPPLY_CATEGORIES:', err.message);
            }
        };
        fetchCategories();
    }, []);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [focusedField, setFocusedField] = useState(null);

    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [showAppleModal, setShowAppleModal] = useState(false);

    useEffect(() => {
        loadGoogleSdk();
    }, []);

    const handleGoogleSignUpPress = async () => {
        setIsLoading(true);
        setErrorMsg('');
        await triggerGoogleAuth({
            role,
            isSignUp: true,
            onSuccess: async (googleUser) => {
                try {
                    await loginWithGoogle({ ...googleUser, role, isSignUp: true });
                    setIsLoading(false);
                    if (onNavigate) {
                        if (role === 'shop_owner') onNavigate('shop_owner');
                        else if (role === 'supplier') onNavigate('supplier');
                        else {
                            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                window.location.hash = '#/home';
                            }
                            onNavigate('home');
                        }
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

    const validateSignUpForm = () => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;

        // Role specific validations
        if (role === 'customer') {
            if (!fullName.trim()) {
                errors.fullName = 'Full name is required';
            } else if (fullName.trim().length < 2) {
                errors.fullName = 'Name must be at least 2 characters';
            }
        } else if (role === 'shop_owner') {
            if (!shopName.trim()) errors.shopName = 'Shop name is required';
            if (!ownerName.trim()) errors.ownerName = 'Owner name is required';
            if (!storeAddress.trim()) errors.storeAddress = 'Store address is required';
        } else if (role === 'supplier') {
            if (!supplierName.trim()) errors.supplierName = 'Supplier business name is required';
            if (!contactPerson.trim()) errors.contactPerson = 'Contact person name is required';
            if (selectedSupplyCategories.length === 0) errors.supplyCategory = 'At least one supply category is required';
        }

        // Common validations
        if (!email.trim()) {
            errors.email = 'Email address is required';
        } else if (!emailRegex.test(email.trim())) {
            errors.email = 'Enter a valid email address (e.g. name@domain.com)';
        }

        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters long';
        }

        if (!phone.trim()) {
            errors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(phone.trim().replace(/\s+/g, ''))) {
            errors.phone = 'Enter a valid 10-digit phone number (e.g. 07XXXXXXXX)';
        }

        if (!agreedTerms) {
            errors.agreedTerms = 'You must agree to the Terms of Service & Privacy Policy';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleBlur = (field) => {
        setFocusedField(null);
        setTouched((prev) => ({ ...prev, [field]: true }));
        validateSignUpForm();
    };

    const handleFocus = (field) => {
        setFocusedField(field);
    };

    const handleSignUp = async () => {
        setErrorMsg('');
        setTouched({
            fullName: true,
            shopName: true,
            ownerName: true,
            storeAddress: true,
            supplierName: true,
            contactPerson: true,
            supplyCategory: true,
            email: true,
            password: true,
            phone: true,
            agreedTerms: true,
        });

        const isValid = validateSignUpForm();
        if (!isValid) return;

        if (!agreedTerms) {
            setErrorMsg('You must agree to the Terms of Service and Privacy Policy to create an account.');
            return;
        }

        setIsLoading(true);
        try {
            const regionStr = selectedSupplyRegions.join(', ') || 'Colombo 03 (Colpetty)';
            const categoryStr = selectedSupplyCategories.join(', ') || 'Fresh Produce (Vegetables & Fruits)';
            const payload = {
                role,
                email: email.trim(),
                password,
                phone: phone.trim(),
                fullName: fullName.trim(),
                location: role === 'supplier' ? regionStr : (location.trim() || 'Colombo 03'),
                shopName: shopName.trim(),
                ownerName: ownerName.trim(),
                storeAddress: storeAddress.trim(),
                supplierName: supplierName.trim(),
                contactPerson: contactPerson.trim(),
                supplyCategory: categoryStr,
                supplyCategories: selectedSupplyCategories,
                supplyRegions: selectedSupplyRegions,
                supplyRegion: regionStr,
            };

            await register(payload);
            setIsLoading(false);
            if (onNavigate) {
                if (role === 'shop_owner') onNavigate('shop_owner');
                else if (role === 'supplier') onNavigate('supplier');
                else {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        window.location.hash = '#/home';
                    }
                    onNavigate('home');
                }
            }
        } catch (error) {
            setIsLoading(false);
            setErrorMsg(error.message || 'Registration failed. Please try again.');
        }
    };

    const getRoleTitle = () => {
        if (role === 'shop_owner') return 'Shop Owner Registration';
        if (role === 'supplier') return 'Supplier Registration';
        return 'Create account';
    };

    const getRoleSubtitle = () => {
        if (role === 'shop_owner') return 'Register your store & start receiving customer pre-orders';
        if (role === 'supplier') return 'Register your supply business & manage restock requests';
        return 'Get started with your 14-day free trial';
    };

    // Filter cities dynamically in real-time as user types letters/spellings (Exact Match with Image 1 & 2)
    const filteredCities = CITIES_LIST.filter((c) =>
        c.toLowerCase().includes((location || '').trim().toLowerCase())
    );

    const filteredSupplierCities = CITIES_LIST
        .filter((c) => !selectedSupplyRegions.includes(c))
        .filter((c) => c.toLowerCase().includes((citySearch || '').trim().toLowerCase()));

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {/* Top Navigation */}
            <View style={styles.topNav}>
                <TouchableOpacity
                    onPress={() => onNavigate('roleselect')}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={22} color="#0F172A" />
                </TouchableOpacity>

                {/* Role Badge Indicator */}
                <View style={styles.roleBadge}>
                    {role === 'customer' && (
                        <>
                            <User size={12} color="#2E7D32" />
                            <Text style={styles.roleBadgeText}>Customer</Text>
                        </>
                    )}
                    {role === 'shop_owner' && (
                        <>
                            <Store size={12} color="#2E7D32" />
                            <Text style={styles.roleBadgeText}>Shop Owner</Text>
                        </>
                    )}
                    {role === 'supplier' && (
                        <>
                            <Truck size={12} color="#2E7D32" />
                            <Text style={styles.roleBadgeText}>Supplier</Text>
                        </>
                    )}
                </View>
            </View>

            {/* Centered Top Logo Card */}
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
                <Text style={styles.title}>{getRoleTitle()}</Text>
                <Text style={styles.subtitle}>{getRoleSubtitle()}</Text>
            </View>

            {/* Error Alert Box */}
            {errorMsg ? (
                <View style={styles.errorCard}>
                    <View style={styles.errorIconWrap}>
                        <AlertCircle size={18} color="#DC2626" />
                    </View>
                    <View style={styles.errorTextWrap}>
                        <Text style={styles.errorTitle}>Registration Error</Text>
                        <Text style={styles.errorDesc}>{errorMsg}</Text>
                    </View>
                </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.form}>
                {/* 1. CUSTOMER: Full Name */}
                {role === 'customer' && (
                    <>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View
                                style={[
                                    styles.inputWrap,
                                    focusedField === 'fullName' && styles.inputWrapFocused,
                                    fieldErrors.fullName && touched.fullName && styles.inputWrapError,
                                ]}
                            >
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === 'fullName' && styles.inputFocusedBg,
                                        fieldErrors.fullName && touched.fullName && styles.inputErrorBg,
                                    ]}
                                    placeholder="Jane Doe"
                                    placeholderTextColor="#94A3B8"
                                    value={fullName}
                                    onFocus={() => handleFocus('fullName')}
                                    onChangeText={(val) => {
                                        setFullName(val);
                                        if (fieldErrors.fullName) validateSignUpForm();
                                    }}
                                    onBlur={() => handleBlur('fullName')}
                                />
                            </View>
                            {fieldErrors.fullName && touched.fullName ? (
                                <View style={styles.inlineFieldError}>
                                    <AlertCircle size={12} color="#DC2626" />
                                    <Text style={styles.inlineErrorText}>{fieldErrors.fullName}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Preferred Pickup Location / City for Customer */}
                        <View style={[styles.fieldGroup, { zIndex: showCityDropdown ? 400 : 1 }]}>
                            <Text style={styles.label}>Preferred Pickup Location / City</Text>
                            <View
                                style={[
                                    styles.inputWrap,
                                    (focusedField === 'location' || showCityDropdown) && styles.inputWrapFocused,
                                    fieldErrors.location && touched.location && styles.inputWrapError,
                                ]}
                            >
                                <TextInput
                                    style={[
                                        styles.input,
                                        { paddingRight: 42 },
                                        (focusedField === 'location' || showCityDropdown) && styles.inputFocusedBg,
                                        fieldErrors.location && touched.location && styles.inputErrorBg,
                                    ]}
                                    placeholder="Search and select city..."
                                    placeholderTextColor="#94A3B8"
                                    value={location}
                                    onFocus={() => {
                                        handleFocus('location');
                                        setShowCityDropdown(true);
                                    }}
                                    onChangeText={(val) => {
                                        setLocation(val);
                                        setShowCityDropdown(true);
                                    }}
                                    onBlur={() => {
                                        handleBlur('location');
                                        setTimeout(() => setShowCityDropdown(false), 250);
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.chevronIconBtn}
                                    onPress={() => setShowCityDropdown((prev) => !prev)}
                                    activeOpacity={0.7}
                                >
                                    <ChevronDown size={18} color="#64748B" />
                                </TouchableOpacity>

                                {showCityDropdown && (
                                    <View style={styles.cityDropdownMenu}>
                                        <ScrollView
                                            nestedScrollEnabled={true}
                                            keyboardShouldPersistTaps="always"
                                            showsVerticalScrollIndicator={true}
                                            style={styles.cityDropdownScroll}
                                        >
                                            {filteredCities.length > 0 ? (
                                                filteredCities.map((city) => (
                                                    <TouchableOpacity
                                                        key={city}
                                                        style={styles.cityDropdownItem}
                                                        onPress={() => {
                                                            setLocation(city);
                                                            setShowCityDropdown(false);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={styles.cityDropdownItemText}>{city}</Text>
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <View style={styles.cityDropdownEmpty}>
                                                    <Text style={styles.cityDropdownEmptyText}>No cities found</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </View>
                    </>
                )}

                {/* 2. SHOP OWNER ROLE FIELDS (100% Match Image 1 & 2) */}
                {role === 'shop_owner' && (
                    <>
                        {/* Shop Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Shop Name</Text>
                            <View
                                style={[
                                    styles.inputWrap,
                                    focusedField === 'shopName' && styles.inputWrapFocused,
                                    fieldErrors.shopName && touched.shopName && styles.inputWrapError,
                                ]}
                            >
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === 'shopName' && styles.inputFocusedBg,
                                        fieldErrors.shopName && touched.shopName && styles.inputErrorBg,
                                    ]}
                                    placeholder="e.g. Green Basket Grocery"
                                    placeholderTextColor="#94A3B8"
                                    value={shopName}
                                    onFocus={() => handleFocus('shopName')}
                                    onChangeText={(val) => {
                                        setShopName(val);
                                        if (fieldErrors.shopName) validateSignUpForm();
                                    }}
                                    onBlur={() => handleBlur('shopName')}
                                />
                            </View>
                            {fieldErrors.shopName && touched.shopName ? (
                                <View style={styles.inlineFieldError}>
                                    <AlertCircle size={12} color="#DC2626" />
                                    <Text style={styles.inlineErrorText}>{fieldErrors.shopName}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Owner / Manager Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Owner / Manager Name</Text>
                            <View
                                style={[
                                    styles.inputWrap,
                                    focusedField === 'ownerName' && styles.inputWrapFocused,
                                    fieldErrors.ownerName && touched.ownerName && styles.inputWrapError,
                                ]}
                            >
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === 'ownerName' && styles.inputFocusedBg,
                                        fieldErrors.ownerName && touched.ownerName && styles.inputErrorBg,
                                    ]}
                                    placeholder="e.g. Kamal Perera"
                                    placeholderTextColor="#94A3B8"
                                    value={ownerName}
                                    onFocus={() => handleFocus('ownerName')}
                                    onChangeText={(val) => {
                                        setOwnerName(val);
                                        if (fieldErrors.ownerName) validateSignUpForm();
                                    }}
                                    onBlur={() => handleBlur('ownerName')}
                                />
                            </View>
                            {fieldErrors.ownerName && touched.ownerName ? (
                                <View style={styles.inlineFieldError}>
                                    <AlertCircle size={12} color="#DC2626" />
                                    <Text style={styles.inlineErrorText}>{fieldErrors.ownerName}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Store Location / City */}
                        <View style={[styles.fieldGroup, { zIndex: showCityDropdown ? 400 : 1 }]}>
                            <Text style={styles.label}>Store Location / City</Text>
                            <View
                                style={[
                                    styles.inputWrap,
                                    (focusedField === 'location' || showCityDropdown) && styles.inputWrapFocused,
                                ]}
                            >
                                <TextInput
                                    style={[
                                        styles.input,
                                        { paddingRight: 42 },
                                        (focusedField === 'location' || showCityDropdown) && styles.inputFocusedBg,
                                    ]}
                                    placeholder="Search and select city..."
                                    placeholderTextColor="#94A3B8"
                                    value={location}
                                    onFocus={() => {
                                        handleFocus('location');
                                        setShowCityDropdown(true);
                                    }}
                                    onChangeText={(val) => {
                                        setLocation(val);
                                        setShowCityDropdown(true);
                                    }}
                                    onBlur={() => {
                                        handleBlur('location');
                                        setTimeout(() => setShowCityDropdown(false), 250);
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.chevronIconBtn}
                                    onPress={() => setShowCityDropdown((prev) => !prev)}
                                    activeOpacity={0.7}
                                >
                                    <ChevronDown size={18} color="#64748B" />
                                </TouchableOpacity>

                                {showCityDropdown && (
                                    <View style={styles.cityDropdownMenu}>
                                        <ScrollView
                                            nestedScrollEnabled={true}
                                            keyboardShouldPersistTaps="always"
                                            showsVerticalScrollIndicator={true}
                                            style={styles.cityDropdownScroll}
                                        >
                                            {filteredCities.length > 0 ? (
                                                filteredCities.map((city) => (
                                                    <TouchableOpacity
                                                        key={city}
                                                        style={styles.cityDropdownItem}
                                                        onPress={() => {
                                                            setLocation(city);
                                                            setShowCityDropdown(false);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={styles.cityDropdownItemText}>{city}</Text>
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <View style={styles.cityDropdownEmpty}>
                                                    <Text style={styles.cityDropdownEmptyText}>No cities found</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Store Street Address */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Store Street Address</Text>
                            <View
                                style={[
                                    styles.inputWrap,
                                    focusedField === 'storeAddress' && styles.inputWrapFocused,
                                    fieldErrors.storeAddress && touched.storeAddress && styles.inputWrapError,
                                ]}
                            >
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === 'storeAddress' && styles.inputFocusedBg,
                                        fieldErrors.storeAddress && touched.storeAddress && styles.inputErrorBg,
                                    ]}
                                    placeholder="e.g. No. 45, Main Street"
                                    placeholderTextColor="#94A3B8"
                                    value={storeAddress}
                                    onFocus={() => handleFocus('storeAddress')}
                                    onChangeText={(val) => {
                                        setStoreAddress(val);
                                        if (fieldErrors.storeAddress) validateSignUpForm();
                                    }}
                                    onBlur={() => handleBlur('storeAddress')}
                                />
                            </View>
                            {fieldErrors.storeAddress && touched.storeAddress ? (
                                <View style={styles.inlineFieldError}>
                                    <AlertCircle size={12} color="#DC2626" />
                                    <Text style={styles.inlineErrorText}>{fieldErrors.storeAddress}</Text>
                                </View>
                            ) : null}
                        </View>
                    </>
                )}

                {/* 3. SUPPLIER ROLE FIELDS (100% Match Image 3 & 4) */}
                {role === 'supplier' && (
                    <>
                        {/* Supplier / Business Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Supplier / Business Name</Text>
                            <View
                                style={[
                                    styles.inputWrap,
                                    focusedField === 'supplierName' && styles.inputWrapFocused,
                                    fieldErrors.supplierName && touched.supplierName && styles.inputWrapError,
                                ]}
                            >
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === 'supplierName' && styles.inputFocusedBg,
                                        fieldErrors.supplierName && touched.supplierName && styles.inputErrorBg,
                                    ]}
                                    placeholder="e.g. Nuwara Eliya Organic Farms"
                                    placeholderTextColor="#94A3B8"
                                    value={supplierName}
                                    onFocus={() => handleFocus('supplierName')}
                                    onChangeText={(val) => {
                                        setSupplierName(val);
                                        if (fieldErrors.supplierName) validateSignUpForm();
                                    }}
                                    onBlur={() => handleBlur('supplierName')}
                                />
                            </View>
                            {fieldErrors.supplierName && touched.supplierName ? (
                                <View style={styles.inlineFieldError}>
                                    <AlertCircle size={12} color="#DC2626" />
                                    <Text style={styles.inlineErrorText}>{fieldErrors.supplierName}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Contact Person Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Contact Person Name</Text>
                            <View
                                style={[
                                    styles.inputWrap,
                                    focusedField === 'contactPerson' && styles.inputWrapFocused,
                                    fieldErrors.contactPerson && touched.contactPerson && styles.inputWrapError,
                                ]}
                            >
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === 'contactPerson' && styles.inputFocusedBg,
                                        fieldErrors.contactPerson && touched.contactPerson && styles.inputErrorBg,
                                    ]}
                                    placeholder="e.g. Sunith Silva"
                                    placeholderTextColor="#94A3B8"
                                    value={contactPerson}
                                    onFocus={() => handleFocus('contactPerson')}
                                    onChangeText={(val) => {
                                        setContactPerson(val);
                                        if (fieldErrors.contactPerson) validateSignUpForm();
                                    }}
                                    onBlur={() => handleBlur('contactPerson')}
                                />
                            </View>
                            {fieldErrors.contactPerson && touched.contactPerson ? (
                                <View style={styles.inlineFieldError}>
                                    <AlertCircle size={12} color="#DC2626" />
                                    <Text style={styles.inlineErrorText}>{fieldErrors.contactPerson}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Multi-Select Supply Categories Section - Interactive Tag Pill Grid */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>
                                    Supply Categories / Product Lines ({selectedSupplyCategories.length})
                                </Text>
                                <Text style={styles.tapToSelectText}>Tap to select</Text>
                            </View>

                            <View
                                style={[
                                    styles.categoriesContainer,
                                    fieldErrors.supplyCategory && styles.categoriesContainerError,
                                ]}
                            >
                                {categoriesList.map((cat) => {
                                    const isSelected = selectedSupplyCategories.includes(cat);
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            onPress={() => {
                                                if (isSelected) {
                                                    setSelectedSupplyCategories(selectedSupplyCategories.filter((c) => c !== cat));
                                                } else {
                                                    setSelectedSupplyCategories([...selectedSupplyCategories, cat]);
                                                }
                                                if (fieldErrors.supplyCategory) validateSignUpForm();
                                            }}
                                            activeOpacity={0.8}
                                            style={[
                                                styles.categoryChip,
                                                isSelected ? styles.categoryChipSelected : styles.categoryChipUnselected,
                                            ]}
                                        >
                                            {isSelected ? (
                                                <Check size={14} color="#15803D" strokeWidth={2.5} />
                                            ) : (
                                                <Plus size={14} color="#64748B" strokeWidth={2} />
                                            )}
                                            <Text
                                                style={[
                                                    styles.categoryChipText,
                                                    isSelected ? styles.categoryChipTextSelected : styles.categoryChipTextUnselected,
                                                ]}
                                            >
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {fieldErrors.supplyCategory ? (
                                <View style={styles.inlineFieldError}>
                                    <AlertCircle size={12} color="#DC2626" />
                                    <Text style={styles.inlineErrorText}>{fieldErrors.supplyCategory}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Multi-Select Cities Section */}
                        <View style={[styles.fieldGroup, { zIndex: showSupplierCityDropdown ? 300 : 1 }]}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>
                                    Supply Regions / Cities ({selectedSupplyRegions.length})
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        const islandwideStr = 'Islandwide';
                                        if (selectedSupplyRegions.includes(islandwideStr)) {
                                            setSelectedSupplyRegions(selectedSupplyRegions.filter((c) => c !== islandwideStr));
                                        } else {
                                            setSelectedSupplyRegions([islandwideStr, ...selectedSupplyRegions]);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.islandwideBtn,
                                        selectedSupplyRegions.includes('Islandwide') && styles.islandwideBtnSelected,
                                    ]}
                                >
                                    <Globe
                                        size={12}
                                        color={selectedSupplyRegions.includes('Islandwide') ? '#15803D' : '#475569'}
                                    />
                                    <Text
                                        style={[
                                            styles.islandwideBtnText,
                                            selectedSupplyRegions.includes('Islandwide') && styles.islandwideBtnTextSelected,
                                        ]}
                                    >
                                        {selectedSupplyRegions.includes('Islandwide')
                                            ? '✓ Islandwide Selected'
                                            : '+ Select Islandwide'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Selected City Chips Box */}
                            <View style={styles.selectedCitiesBox}>
                                {selectedSupplyRegions.length === 0 ? (
                                    <Text style={styles.noCitiesSelectedText}>
                                        No cities selected. Search and add cities below or pick Islandwide.
                                    </Text>
                                ) : (
                                    selectedSupplyRegions.map((city) => {
                                        const isIslandwide = city.includes('Islandwide');
                                        return (
                                            <View
                                                key={city}
                                                style={[
                                                    styles.cityChip,
                                                    isIslandwide ? styles.cityChipIslandwide : styles.cityChipNormal,
                                                ]}
                                            >
                                                {isIslandwide ? (
                                                    <Globe size={12} color="#166534" />
                                                ) : (
                                                    <MapPin size={12} color="#0369A1" />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.cityChipText,
                                                        isIslandwide
                                                            ? styles.cityChipTextIslandwide
                                                            : styles.cityChipTextNormal,
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
                                                    activeOpacity={0.7}
                                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                >
                                                    <X
                                                        size={12}
                                                        color={isIslandwide ? '#166534' : '#0369A1'}
                                                        strokeWidth={2.5}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })
                                )}
                            </View>

                            {/* Search & Add City Input Dropdown */}
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={[styles.input, { paddingRight: 42 }]}
                                    placeholder="+ Search and add more cities (e.g. Gampola, Weligama, Kandy)..."
                                    placeholderTextColor="#94A3B8"
                                    value={citySearch}
                                    onFocus={() => setShowSupplierCityDropdown(true)}
                                    onChangeText={(val) => {
                                        setCitySearch(val);
                                        setShowSupplierCityDropdown(true);
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setShowSupplierCityDropdown(false), 250);
                                    }}
                                />
                                <View style={styles.searchPlusIconWrap} pointerEvents="none">
                                    <Plus size={16} color="#64748B" />
                                </View>

                                {showSupplierCityDropdown && (
                                    <View style={styles.cityDropdownMenu}>
                                        <ScrollView
                                            nestedScrollEnabled={true}
                                            keyboardShouldPersistTaps="always"
                                            showsVerticalScrollIndicator={true}
                                            style={styles.cityDropdownScroll}
                                        >
                                            {filteredSupplierCities.length > 0 ? (
                                                filteredSupplierCities.map((city) => (
                                                    <TouchableOpacity
                                                        key={city}
                                                        style={styles.supplierCityDropdownItem}
                                                        onPress={() => {
                                                            setSelectedSupplyRegions([...selectedSupplyRegions, city]);
                                                            setCitySearch('');
                                                            setShowSupplierCityDropdown(false);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.supplierCityDropdownItemLeft}>
                                                            {city.includes('Islandwide') ? (
                                                                <Globe size={14} color="#15803D" />
                                                            ) : (
                                                                <MapPin size={14} color="#64748B" />
                                                            )}
                                                            <Text style={styles.cityDropdownItemText}>{city}</Text>
                                                        </View>
                                                        <Plus size={14} color="#15803D" strokeWidth={2.5} />
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <View style={styles.cityDropdownEmpty}>
                                                    <Text style={styles.cityDropdownEmptyText}>
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
                    </>
                )}

                {/* 4. COMMON FIELDS ACROSS ALL ROLES */}

                {/* Email Address */}
                <View style={[styles.fieldGroup, { zIndex: 1 }]}>
                    <Text style={styles.label}>Email Address</Text>
                    <View
                        style={[
                            styles.inputWrap,
                            (focusedField === 'email' || email.length > 0) && styles.inputWrapActive,
                            fieldErrors.email && touched.email && styles.inputWrapError,
                        ]}
                    >
                        <TextInput
                            style={[
                                styles.input,
                                (focusedField === 'email' || email.length > 0) && styles.inputActiveBg,
                                fieldErrors.email && touched.email && styles.inputErrorBg,
                            ]}
                            placeholder="name@company.com"
                            placeholderTextColor="#94A3B8"
                            value={email}
                            onFocus={() => handleFocus('email')}
                            onChangeText={(val) => {
                                setEmail(val);
                                if (fieldErrors.email) validateSignUpForm();
                            }}
                            onBlur={() => handleBlur('email')}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                    {fieldErrors.email && touched.email ? (
                        <View style={styles.inlineFieldError}>
                            <AlertCircle size={12} color="#DC2626" />
                            <Text style={styles.inlineErrorText}>{fieldErrors.email}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Password with Eye Toggle */}
                <View style={[styles.fieldGroup, { zIndex: 1 }]}>
                    <Text style={styles.label}>Password</Text>
                    <View
                        style={[
                            styles.inputWrap,
                            (focusedField === 'password' || password.length > 0) && styles.inputWrapActive,
                            fieldErrors.password && touched.password && styles.inputWrapError,
                        ]}
                    >
                        <TextInput
                            style={[
                                styles.input,
                                { paddingRight: 45 },
                                (focusedField === 'password' || password.length > 0) && styles.inputActiveBg,
                                fieldErrors.password && touched.password && styles.inputErrorBg,
                            ]}
                            placeholder="Minimum 8 characters"
                            placeholderTextColor="#94A3B8"
                            value={password}
                            onFocus={() => handleFocus('password')}
                            onChangeText={(val) => {
                                setPassword(val);
                                if (fieldErrors.password) validateSignUpForm();
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
                </View>

                {/* Phone Number */}
                <View style={[styles.fieldGroup, { zIndex: 1 }]}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View
                        style={[
                            styles.inputWrap,
                            focusedField === 'phone' && styles.inputWrapFocused,
                            fieldErrors.phone && touched.phone && styles.inputWrapError,
                        ]}
                    >
                        <TextInput
                            style={[
                                styles.input,
                                focusedField === 'phone' && styles.inputFocusedBg,
                                fieldErrors.phone && touched.phone && styles.inputErrorBg,
                            ]}
                            placeholder="07XXXXXXXX"
                            placeholderTextColor="#94A3B8"
                            value={phone}
                            onFocus={() => handleFocus('phone')}
                            onChangeText={(val) => {
                                setPhone(val);
                                if (fieldErrors.phone) validateSignUpForm();
                            }}
                            onBlur={() => handleBlur('phone')}
                            keyboardType="phone-pad"
                        />
                    </View>
                    {fieldErrors.phone && touched.phone ? (
                        <View style={styles.inlineFieldError}>
                            <AlertCircle size={12} color="#DC2626" />
                            <Text style={styles.inlineErrorText}>{fieldErrors.phone}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Terms and Privacy Checkbox */}
                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setAgreedTerms(!agreedTerms)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, agreedTerms && styles.checkboxActive]}>
                        {agreedTerms && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text style={styles.checkboxLabel}>
                        I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </TouchableOpacity>

                {/* Submit Create Account Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                    onPress={handleSignUp}
                    disabled={isLoading}
                    activeOpacity={0.85}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.submitBtnText}>Create Account</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Divider: ── or ── */}
            <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
            </View>

            {/* Social Logins */}
            <View style={styles.socialGroup}>
                <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={handleGoogleSignUpPress}
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

            {/* Bottom Sign In Link */}
            <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Already have an account? </Text>
                <TouchableOpacity onPress={() => onNavigate('login')} activeOpacity={0.7}>
                    <Text style={styles.footerLink}>Sign in</Text>
                </TouchableOpacity>
            </View>

            {/* Google Mobile Auth Modal */}
            <GoogleAuthModal
                isOpen={showGoogleModal}
                onClose={() => setShowGoogleModal(false)}
                onSuccess={async (googleUser) => {
                    await loginWithGoogle({ ...googleUser, role });
                    if (onNavigate) {
                        if (role === 'shop_owner') onNavigate('shop_owner');
                        else if (role === 'supplier') onNavigate('supplier');
                        else {
                            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                window.location.hash = '#/home';
                            }
                            onNavigate('home');
                        }
                    }
                }}
                role={role}
                isSignUp={true}
            />

            {/* Apple Mobile Auth Modal */}
            <AppleAuthModal
                isOpen={showAppleModal}
                onClose={() => setShowAppleModal(false)}
                onSuccess={async (appleUser) => {
                    await loginWithGoogle({ ...appleUser, role });
                    if (onNavigate) {
                        if (role === 'shop_owner') onNavigate('shop_owner');
                        else if (role === 'supplier') onNavigate('supplier');
                        else {
                            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                window.location.hash = '#/home';
                            }
                            onNavigate('home');
                        }
                    }
                }}
                role={role}
                isSignUp={true}
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
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 28,
        alignItems: 'center',
    },
    topNav: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    roleBadge: {
        backgroundColor: '#E8F5E9',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    roleBadgeText: {
        color: '#2E7D32',
        fontSize: 11,
        fontWeight: '700',
    },
    logoWrapper: {
        alignItems: 'center',
        marginBottom: 18,
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
        marginBottom: 22,
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
        zIndex: 50,
    },
    fieldGroup: {
        width: '100%',
        gap: 6,
        position: 'relative',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        textAlign: 'left',
    },
    tapToSelectText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
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
    inputWrapFocused: {
        borderColor: '#2E7D32',
    },
    inputWrapActive: {
        borderColor: '#D0E1FD',
        backgroundColor: '#EFF6FF',
    },
    inputWrapError: {
        borderColor: '#EF4444',
    },
    inputFocusedBg: {
        backgroundColor: '#FFFFFF',
    },
    inputActiveBg: {
        backgroundColor: '#EFF6FF',
    },
    inputErrorBg: {
        backgroundColor: '#FFF5F5',
    },
    input: {
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 14,
        color: '#0F172A',
        borderRadius: 14,
    },
    chevronIconBtn: {
        position: 'absolute',
        right: 14,
        top: 15,
        padding: 4,
        zIndex: 2,
    },
    searchPlusIconWrap: {
        position: 'absolute',
        right: 14,
        top: 15,
        zIndex: 2,
    },
    cityDropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        maxHeight: 210,
        zIndex: 9999,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        overflow: 'hidden',
    },
    cityDropdownScroll: {
        maxHeight: 210,
    },
    cityDropdownItem: {
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    cityDropdownItemText: {
        fontSize: 13.5,
        color: '#1E293B',
        fontWeight: '500',
    },
    cityDropdownEmpty: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    cityDropdownEmptyText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    supplierCityDropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    supplierCityDropdownItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
        marginBottom: 4,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    checkboxActive: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32',
    },
    checkboxLabel: {
        fontSize: 13,
        color: '#64748B',
        flex: 1,
        lineHeight: 18,
    },
    termsLink: {
        color: '#2E7D32',
        fontWeight: '700',
    },
    submitBtn: {
        width: '100%',
        backgroundColor: '#2E7D32',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 4,
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
        paddingVertical: 14,
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
        marginTop: 26,
        paddingBottom: 16,
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

    // Multi-Select Category Chips (100% Match with React Web)
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
    },
    categoriesContainerError: {
        borderColor: '#EF4444',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    categoryChipUnselected: {
        backgroundColor: '#FFFFFF',
        borderColor: '#CBD5E1',
    },
    categoryChipSelected: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
        shadowColor: '#166534',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 2,
    },
    categoryChipText: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    categoryChipTextUnselected: {
        color: '#334155',
    },
    categoryChipTextSelected: {
        color: '#15803D',
    },

    // Multi-Select Regions Section (100% Match with React Web)
    islandwideBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    islandwideBtnSelected: {
        backgroundColor: '#DCFCE7',
    },
    islandwideBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    islandwideBtnTextSelected: {
        color: '#15803D',
    },
    selectedCitiesBox: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
        minHeight: 36,
        padding: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
    },
    noCitiesSelectedText: {
        fontSize: 12,
        color: '#94A3B8',
        paddingVertical: 2,
        paddingHorizontal: 4,
    },
    cityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: 1,
    },
    cityChipNormal: {
        backgroundColor: '#E0F2FE',
        borderColor: '#7DD3FC',
    },
    cityChipIslandwide: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    cityChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    cityChipTextNormal: {
        color: '#0369A1',
    },
    cityChipTextIslandwide: {
        color: '#166534',
    },
    cityChipCloseBtn: {
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
