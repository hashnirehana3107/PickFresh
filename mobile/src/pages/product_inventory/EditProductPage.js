import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Check,
    Store,
    Trash2,
    ChevronDown,
    UploadCloud,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { pickImageFromDevice } from '../../utils/imagePicker';

const DEFAULT_CATEGORIES = [
    { name: 'Dairy', fallbackEmoji: '🥛', image: '' },
    { name: 'Beverages', fallbackEmoji: '🥤', image: '' },
    { name: 'Grocery', fallbackEmoji: '🛒', image: '' },
    { name: 'Bakery', fallbackEmoji: '🍞', image: '' },
    { name: 'Vegetables', fallbackEmoji: '🥕', image: '' },
    { name: 'Fruits', fallbackEmoji: '🍎', image: '' },
    { name: 'Snacks', fallbackEmoji: '🍿', image: '' },
    { name: 'Grains', fallbackEmoji: '🌾', image: '' },
    { name: 'Soft Drinks', fallbackEmoji: '🥤', image: '' },
];

const UNITS_LIST = ['1kg', '500g', '250g', 'pack', 'bottle', 'loaf', 'bag', 'liter', 'item'];

export default function EditProductPage({ onNavigate, product }) {
    const { user } = useAuth();

    const initialProduct = product || {
        id: '2',
        name: 'Coca-Cola 1.5L',
        storeName: 'Lanka Mart',
        category: 'Soft Drinks',
        price: 520,
        stock: 5,
        minStock: 10,
        unit: '1kg',
        image: '',
        fallbackEmoji: '🥤',
    };

    const storeName = initialProduct.storeName || user?.shopName || user?.name || 'Lanka Mart';

    const [name, setName] = useState(initialProduct.name || '');
    const [brand, setBrand] = useState(initialProduct.brand || '');
    const [category, setCategory] = useState(initialProduct.category || 'Soft Drinks');
    const [rawCategories, setRawCategories] = useState(DEFAULT_CATEGORIES);
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

    const [price, setPrice] = useState(
        typeof initialProduct.price === 'number'
            ? String(initialProduct.price)
            : String(initialProduct.price || '').replace(/[^0-9.]/g, '')
    );
    const [unit, setUnit] = useState(initialProduct.unit || '1kg');
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

    const [stock, setStock] = useState(String(initialProduct.stock ?? '0'));
    const [minStock, setMinStock] = useState(String(initialProduct.minStock ?? '10'));

    const [supplierName, setSupplierName] = useState(initialProduct.supplierName || '');
    const [suppliersList, setSuppliersList] = useState(initialProduct.supplierName ? [initialProduct.supplierName] : []);
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

    const [imagePreview, setImagePreview] = useState(initialProduct.image || null);
    const [bannerStatus, setBannerStatus] = useState(null); // 'saved' | 'removed'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionType, setActionType] = useState(null); // 'saving' | 'removing'
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/product-inventory/categories`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
                    setRawCategories(data.categories);
                }
            } catch (err) {
                console.warn('Failed to fetch categories:', err);
            }
        };

        const fetchSuppliers = async () => {
            try {
                const storeEmail = user?.email || '';
                const emailParam = storeEmail ? `?storeEmail=${encodeURIComponent(storeEmail)}&onlyLinked=true` : '?onlyLinked=true';
                const res = await fetch(`${API_BASE_URL}/product-inventory/suppliers${emailParam}`);
                const data = await res.json();
                if (data.success && Array.isArray(data.suppliers)) {
                    const linked = data.suppliers.filter((s) => s.isLinkedToCurrentStore !== false);
                    let names = linked.map((s) => s.name);
                    if (initialProduct.supplierName && !names.includes(initialProduct.supplierName)) {
                        names = [initialProduct.supplierName, ...names];
                    }
                    if (names.length > 0) {
                        setSuppliersList(names);
                        if (!supplierName || !names.includes(supplierName)) {
                            setSupplierName(names[0]);
                        }
                    } else {
                        setSuppliersList(initialProduct.supplierName ? [initialProduct.supplierName] : []);
                        if (initialProduct.supplierName) setSupplierName(initialProduct.supplierName);
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch suppliers in edit page:', err);
            }
        };

        fetchCategories();
        fetchSuppliers();
    }, [user?.email]);

    const compressImage = (file, callback) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 480;
                const MAX_HEIGHT = 480;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = Math.round(width);
                canvas.height = Math.round(height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                callback(dataUrl);
            };
            img.onerror = () => callback(event.target.result);
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handlePickImage = async () => {
        if (Platform.OS !== 'web') {
            const uri = await pickImageFromDevice({ aspect: [1, 1], quality: 0.7 });
            if (uri) setImagePreview(uri);
            return;
        }
        if (typeof document !== 'undefined') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    compressImage(file, (compressedUri) => {
                        setImagePreview(compressedUri);
                    });
                }
            };
            input.click();
        }
    };

    const handleSave = async () => {
        setErrorMsg('');
        setIsSubmitting(true);
        setActionType('saving');

        const updatedPayload = {
            name: name.trim(),
            brand: brand.trim(),
            category,
            price: Number(price) || 0,
            unit: unit || '1kg',
            stock: Number(stock) || 0,
            minStock: Number(minStock) || 10,
            supplierName: supplierName || (suppliersList.length > 0 ? suppliersList[0] : 'Central Food City'),
            storeName,
            image: imagePreview || '',
        };

        try {
            const productIdToUpdate = initialProduct._id || initialProduct.id;
            const res = await fetch(`${API_BASE_URL}/product-inventory/products/${productIdToUpdate}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPayload),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setBannerStatus('saved');
                setTimeout(() => {
                    const resolvedProduct = data.product || { ...initialProduct, ...updatedPayload, id: productIdToUpdate, _id: productIdToUpdate };
                    if (onNavigate) onNavigate('product_list', { updatedProduct: resolvedProduct });
                }, 1000);
            } else {
                setErrorMsg(data.message || 'Failed to update product');
            }
        } catch (err) {
            setErrorMsg('Failed to update product in database');
        } finally {
            setIsSubmitting(false);
            setActionType(null);
        }
    };

    const handleRemove = async () => {
        setErrorMsg('');
        setIsSubmitting(true);
        setActionType('removing');

        try {
            const productIdToDelete = initialProduct._id || initialProduct.id;
            const res = await fetch(`${API_BASE_URL}/product-inventory/products/${productIdToDelete}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setBannerStatus('removed');
                setTimeout(() => {
                    if (onNavigate) onNavigate('product_list', { deletedProductId: productIdToDelete });
                }, 1000);
            } else {
                setErrorMsg(data.message || 'Failed to delete product');
            }
        } catch (err) {
            setErrorMsg('Failed to delete product');
        } finally {
            setIsSubmitting(false);
            setActionType(null);
        }
    };

    const selectedCatObj = rawCategories.find((c) => c.name === category);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* Header Title Row */}
            <View style={styles.titleRow}>
                <Text style={styles.pageTitle}>Edit product</Text>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('product_list')}
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Banners */}
            {bannerStatus === 'saved' && (
                <View style={styles.successBanner}>
                    <Check size={18} color="#27672D" />
                    <Text style={styles.successText}>
                        Changes saved to Database for {storeName}! Redirecting...
                    </Text>
                </View>
            )}

            {bannerStatus === 'removed' && (
                <View style={styles.dangerBanner}>
                    <Trash2 size={18} color="#DC2626" />
                    <Text style={styles.dangerText}>
                        Product removed from Database. Redirecting...
                    </Text>
                </View>
            )}

            {errorMsg ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            ) : null}

            {/* Form Fields Stack */}
            <View style={styles.form}>
                {/* Store Name Display Box */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Store name</Text>
                    {(() => {
                        const storeAvatarUri =
                            initialProduct.storeIcon ||
                            (initialProduct.ownerEmail === user?.email || !initialProduct.ownerEmail
                                ? user?.storeLogo || user?.picture || user?.avatar || user?.profilePicture
                                : null) ||
                            user?.storeLogo ||
                            user?.picture ||
                            user?.avatar ||
                            user?.profilePicture;

                        return (
                            <View style={styles.storeNameBox}>
                                {storeAvatarUri ? (
                                    <Image
                                        source={{ uri: storeAvatarUri }}
                                        style={styles.storeAvatarBoxImg}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Store size={18} color="#27672D" />
                                )}
                                <Text style={styles.storeNameText}>{storeName}</Text>
                                <View style={styles.storeAutoBadge}>
                                    <Text style={styles.storeAutoBadgeText}>AUTO</Text>
                                </View>
                            </View>
                        );
                    })()}
                </View>

                {/* Product Name */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Product name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Category with Circular Badges */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.selectedCatRow}>
                            <View style={styles.catAvatarBox}>
                                {selectedCatObj?.image ? (
                                    <Image source={{ uri: selectedCatObj.image }} style={styles.catAvatarImg} />
                                ) : (
                                    <Text style={{ fontSize: 13 }}>{selectedCatObj?.fallbackEmoji || '📦'}</Text>
                                )}
                            </View>
                            <Text style={styles.selectedCatText}>{category || 'Select Category'}</Text>
                        </View>
                        <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>

                    {isCatDropdownOpen && (
                        <View style={styles.dropdownMenu}>
                            {rawCategories.map((c) => {
                                const isSel = c.name === category;
                                return (
                                    <TouchableOpacity
                                        key={c._id || c.name}
                                        style={[styles.dropdownCatItem, isSel && styles.dropdownCatItemActive]}
                                        onPress={() => {
                                            setCategory(c.name);
                                            setIsCatDropdownOpen(false);
                                        }}
                                    >
                                        <View style={styles.catAvatarBox}>
                                            {c.image ? (
                                                <Image source={{ uri: c.image }} style={styles.catAvatarImg} />
                                            ) : (
                                                <Text style={{ fontSize: 13 }}>{c.fallbackEmoji || '📦'}</Text>
                                            )}
                                        </View>
                                        <Text style={[styles.dropdownCatText, isSel && styles.dropdownCatTextActive]}>
                                            {c.name}
                                        </Text>
                                        {isSel && <Check size={16} color="#166534" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Brand (Optional) */}
                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Brand</Text>
                        <Text style={styles.optionalText}>Optional</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Highland, Anchor, Keells, Munchee"
                        placeholderTextColor="#94A3B8"
                        value={brand}
                        onChangeText={setBrand}
                    />
                </View>

                {/* Image Field with Thumbnail Box */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Image</Text>
                    <TouchableOpacity
                        style={styles.imageUploadBtn}
                        onPress={handlePickImage}
                        activeOpacity={0.8}
                    >
                        <View style={styles.imageThumbContainer}>
                            {imagePreview ? (
                                <Image source={{ uri: imagePreview }} style={styles.imageThumbPreview} />
                            ) : (
                                <UploadCloud size={20} color="#64748B" />
                            )}
                        </View>
                        <View style={styles.imageMeta}>
                            <Text style={styles.imageTitle}>
                                {imagePreview ? 'Change Image' : 'Upload Image'}
                            </Text>
                            <Text style={styles.imageSubtitle}>
                                {imagePreview ? 'Click to replace product image' : 'Select JPEG, PNG, or WebP'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Price */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Price (Rs.)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={price}
                        onChangeText={setPrice}
                    />
                </View>

                {/* Unit */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Product Unit</Text>
                    <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.selectBtnText}>{unit}</Text>
                        <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>

                    {isUnitDropdownOpen && (
                        <View style={styles.dropdownMenu}>
                            {UNITS_LIST.map((u) => (
                                <TouchableOpacity
                                    key={u}
                                    style={[styles.dropdownItem, unit === u && styles.dropdownItemActive]}
                                    onPress={() => {
                                        setUnit(u);
                                        setIsUnitDropdownOpen(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownItemText, unit === u && styles.dropdownItemTextActive]}>
                                        {u}
                                    </Text>
                                    {unit === u && <Check size={16} color="#166534" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Stock quantity */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Stock quantity</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={stock}
                        onChangeText={setStock}
                    />
                </View>

                {/* Low-stock threshold */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Low-stock threshold</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={minStock}
                        onChangeText={setMinStock}
                    />
                </View>

                {/* Preferred Supplier Selection */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Preferred Supplier</Text>
                    <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.selectBtnText}>{supplierName || 'Select Preferred Supplier'}</Text>
                        <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>

                    {isSupplierDropdownOpen && (
                        <View style={styles.dropdownMenu}>
                            {suppliersList.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.dropdownItem, supplierName === s && styles.dropdownItemActive]}
                                    onPress={() => {
                                        setSupplierName(s);
                                        setIsSupplierDropdownOpen(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownItemText, supplierName === s && styles.dropdownItemTextActive]}>
                                        {s}
                                    </Text>
                                    {supplierName === s && <Check size={16} color="#166534" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Action Buttons Stack */}
                <View style={styles.actionsStack}>
                    <TouchableOpacity
                        style={[styles.saveBtn, isSubmitting && actionType === 'saving' && { opacity: 0.85 }]}
                        onPress={handleSave}
                        disabled={isSubmitting}
                        activeOpacity={0.85}
                    >
                        {isSubmitting && actionType === 'saving' ? (
                            <View style={styles.btnRow}>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                                <Text style={styles.saveBtnText}>Saving changes...</Text>
                            </View>
                        ) : (
                            <Text style={styles.saveBtnText}>Save changes</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.removeBtn, isSubmitting && actionType === 'removing' && { opacity: 0.85 }]}
                        onPress={handleRemove}
                        disabled={isSubmitting}
                        activeOpacity={0.85}
                    >
                        {isSubmitting && actionType === 'removing' ? (
                            <View style={styles.btnRow}>
                                <ActivityIndicator size="small" color="#DC2626" />
                                <Text style={styles.removeBtnText}>Removing...</Text>
                            </View>
                        ) : (
                            <Text style={styles.removeBtnText}>Remove product</Text>
                        )}
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
        padding: 18,
        paddingBottom: Platform.OS === 'android' ? 70 : 40,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    backBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    successBanner: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    successText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#27672D',
    },
    dangerBanner: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    dangerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#DC2626',
    },
    errorBanner: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        paddingHorizontal: 14,
        marginBottom: 14,
    },
    errorText: {
        fontSize: 13,
        color: '#991B1B',
        fontWeight: '600',
    },
    form: {
        flexDirection: 'column',
        gap: 16,
    },
    fieldGroup: {
        flexDirection: 'column',
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionalText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    storeNameBox: {
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    storeAvatarBoxImg: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    storeNameText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
    },
    storeAutoBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    storeAutoBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#27672D',
        letterSpacing: 0.5,
    },
    input: {
        width: '100%',
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontSize: 14,
        fontWeight: '500',
        color: '#1E293B',
        backgroundColor: '#FFFFFF',
    },
    selectBtn: {
        width: '100%',
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    selectedCatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectedCatText: {
        fontWeight: '600',
        color: '#1E293B',
        fontSize: 14,
    },
    catAvatarBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    catAvatarImg: {
        width: '100%',
        height: '100%',
    },
    dropdownMenu: {
        marginTop: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
        maxHeight: 220,
        padding: 6,
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownItemActive: {
        backgroundColor: '#F0FDF4',
    },
    dropdownItemText: {
        fontSize: 13.5,
        color: '#334155',
        fontWeight: '500',
    },
    dropdownItemTextActive: {
        color: '#166534',
        fontWeight: '700',
    },
    dropdownCatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    dropdownCatItemActive: {
        backgroundColor: '#F0FDF4',
    },
    dropdownCatText: {
        fontSize: 13.5,
        color: '#334155',
        fontWeight: '500',
        flex: 1,
    },
    dropdownCatTextActive: {
        color: '#166534',
        fontWeight: '700',
    },
    imageUploadBtn: {
        width: '100%',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        backgroundColor: '#F8FAFC',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    imageThumbContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    imageThumbPreview: {
        width: '100%',
        height: '100%',
    },
    imageMeta: {
        flex: 1,
    },
    imageTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    imageSubtitle: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    actionsStack: {
        flexDirection: 'column',
        gap: 12,
        marginTop: 8,
        marginBottom: 24,
    },
    saveBtn: {
        width: '100%',
        backgroundColor: '#27672D',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    removeBtn: {
        width: '100%',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#DC2626',
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});
