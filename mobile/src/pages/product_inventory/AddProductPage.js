import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Image,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Check,
    Store,
    Plus,
    X,
    Trash2,
    Edit2,
    ChevronDown,
    UploadCloud,
    Package,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const DEFAULT_RAW_CATEGORIES = [
    { name: 'Dairy', fallbackEmoji: '🥛', image: '' },
    { name: 'Beverages', fallbackEmoji: '🥤', image: '' },
    { name: 'Grocery', fallbackEmoji: '🛒', image: '' },
    { name: 'Bakery', fallbackEmoji: '🍞', image: '' },
    { name: 'Vegetables', fallbackEmoji: '🥕', image: '' },
    { name: 'Fruits', fallbackEmoji: '🍎', image: '' },
    { name: 'Snacks', fallbackEmoji: '🍿', image: '' },
    { name: 'Grains', fallbackEmoji: '🌾', image: '' },
];

const UNITS_LIST = ['1kg', '500g', '250g', 'pack', 'bottle', 'loaf', 'bag', 'liter', 'item'];

export default function AddProductPage({ onNavigate }) {
    const { user } = useAuth();
    const storeName = user?.shopName || user?.storeName || user?.name || 'Lanka Mart';

    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [categoriesList, setCategoriesList] = useState(DEFAULT_RAW_CATEGORIES.map((c) => c.name));
    const [rawCategories, setRawCategories] = useState(DEFAULT_RAW_CATEGORIES);
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

    const [price, setPrice] = useState('');
    const [unit, setUnit] = useState('1kg');
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

    const [stock, setStock] = useState('0');
    const [minStock, setMinStock] = useState('10');

    const [supplierName, setSupplierName] = useState('');
    const [suppliersList, setSuppliersList] = useState([]);
    const [rawSuppliers, setRawSuppliers] = useState([]);
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const [isNameFocused, setIsNameFocused] = useState(false);

    const [imagePreview, setImagePreview] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Typeahead States
    const [supplierCatalogCache, setSupplierCatalogCache] = useState([]);
    const [existingProducts, setExistingProducts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Category Manager Modal
    const [showAddCatModal, setShowAddCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatEmoji, setNewCatEmoji] = useState('📦');
    const [newCatImage, setNewCatImage] = useState(null);
    const [editingCat, setEditingCat] = useState(null);
    const [isAddingCat, setIsAddingCat] = useState(false);

    const emojiOptions = ['📦', '🥛', '🥤', '🛒', '🍞', '🥕', '🍎', '🍿', '🌾', '🍗', '🐟', '🧀', '☕', '🍯'];

    const getFallbackEmoji = (catName) => {
        const found = rawCategories.find((c) => c.name === catName);
        return found?.fallbackEmoji || '📦';
    };

    // Fetch categories from backend
    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/product-inventory/categories`);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
                setRawCategories(data.categories);
                setCategoriesList(data.categories.map((c) => c.name));
                if (!category) {
                    setCategory(data.categories[0].name);
                }
            } else if (!category && DEFAULT_RAW_CATEGORIES.length > 0) {
                setCategory(DEFAULT_RAW_CATEGORIES[0].name);
            }
        } catch (err) {
            console.warn('Failed to fetch categories:', err);
            if (!category) setCategory(DEFAULT_RAW_CATEGORIES[0].name);
        }
    };

    // Fetch suppliers from backend with full MongoDB Atlas catalog
    const fetchSuppliers = async () => {
        try {
            const storeEmail = user?.email || '';
            const emailParam = storeEmail ? `?storeEmail=${encodeURIComponent(storeEmail)}&onlyLinked=true` : '?onlyLinked=true';
            const res = await fetch(`${API_BASE_URL}/product-inventory/suppliers${emailParam}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.suppliers)) {
                setRawSuppliers(data.suppliers);
                const linked = data.suppliers.filter((s) => s.isLinkedToCurrentStore !== false);
                const targetList = linked.length > 0 ? linked : data.suppliers;
                if (targetList.length > 0) {
                    const names = targetList.map((s) => s.name);
                    setSuppliersList(names);
                    const selected = supplierName && names.includes(supplierName) ? supplierName : names[0];
                    setSupplierName(selected);
                    const foundSupplier = targetList.find((s) => s.name === selected);
                    if (foundSupplier?.suppliedProductsFull?.length > 0) {
                        setSupplierCatalogCache(foundSupplier.suppliedProductsFull);
                    }
                } else {
                    setSuppliersList([]);
                    setSupplierName('');
                }
            }
        } catch (err) {
            console.warn('Failed to fetch suppliers:', err);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchSuppliers();
    }, [user?.email]);

    // Fetch existing shop products
    useEffect(() => {
        if (user?.email) {
            fetch(`${API_BASE_URL}/product-inventory/products?storeEmail=${encodeURIComponent(user.email)}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && Array.isArray(data.products)) {
                        setExistingProducts(data.products);
                    }
                })
                .catch((err) => console.warn('Failed to fetch existing products:', err));
        }
    }, [user?.email]);

    // Fetch Supplier Catalog for Typeahead using Real MongoDB Atlas Catalog
    useEffect(() => {
        if (!supplierName) {
            setSupplierCatalogCache([]);
            return;
        }

        const foundInRaw = rawSuppliers.find(
            (s) => (s.name || '').toLowerCase() === supplierName.toLowerCase()
        );
        if (foundInRaw && Array.isArray(foundInRaw.suppliedProductsFull) && foundInRaw.suppliedProductsFull.length > 0) {
            setSupplierCatalogCache(foundInRaw.suppliedProductsFull);
            return;
        }

        fetch(`${API_BASE_URL}/supplier-replenishment/catalog?supplierName=${encodeURIComponent(supplierName)}`)
            .then((res) => res.json())
            .then((data) => {
                const prods = data.products || data.catalog || [];
                if (Array.isArray(prods) && prods.length > 0) {
                    setSupplierCatalogCache(prods);
                }
            })
            .catch((err) => console.warn('Failed to fetch supplier catalog for auto-suggest:', err));
    }, [supplierName, rawSuppliers]);

    // Helper to compress uploaded images to lightweight data URLs
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

    // Pick image via HTML input in web or base64
    const handlePickImage = () => {
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

    const handlePickCatImage = () => {
        if (typeof document !== 'undefined') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    compressImage(file, (compressedUri) => {
                        setNewCatImage(compressedUri);
                    });
                }
            };
            input.click();
        }
    };

    // Category Manager: Create or Update Category
    const handleSaveCategory = async () => {
        if (!newCatName.trim()) return;
        setIsAddingCat(true);
        try {
            if (editingCat) {
                const res = await fetch(`${API_BASE_URL}/product-inventory/categories/${encodeURIComponent(editingCat.id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newCatName.trim(),
                        fallbackEmoji: newCatEmoji,
                        image: newCatImage || '',
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    await fetchCategories();
                    setCategory(newCatName.trim());
                    handleCancelEditCategory();
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/product-inventory/categories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newCatName.trim(),
                        fallbackEmoji: newCatEmoji,
                        image: newCatImage || '',
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    await fetchCategories();
                    setCategory(newCatName.trim());
                    handleCancelEditCategory();
                }
            }
        } catch (err) {
            console.error('Failed to save category:', err);
        } finally {
            setIsAddingCat(false);
        }
    };

    const handleDeleteCategory = async (catIdOrName) => {
        if (!catIdOrName) return;
        try {
            setRawCategories((prev) => prev.filter((c) => c._id !== catIdOrName && c.name !== catIdOrName));
            setCategoriesList((prev) => prev.filter((n) => n !== catIdOrName));
            await fetch(`${API_BASE_URL}/product-inventory/categories/${encodeURIComponent(catIdOrName)}`, {
                method: 'DELETE',
            });
            await fetchCategories();
        } catch (err) {
            console.error('Failed to delete category:', err);
        }
    };

    const handleStartEditCategory = (c) => {
        setEditingCat({
            id: c._id || c.name,
            originalName: c.name,
        });
        setNewCatName(c.name);
        setNewCatEmoji(c.fallbackEmoji || '📦');
        setNewCatImage(c.image || null);
    };

    const handleCancelEditCategory = () => {
        setEditingCat(null);
        setNewCatName('');
        setNewCatEmoji('📦');
        setNewCatImage(null);
    };

    // Submit Product
    const handleSubmit = async () => {
        setErrorMsg('');
        if (!name.trim()) {
            setErrorMsg('Please enter a product name.');
            return;
        }
        if (!category) {
            setErrorMsg('Please select a valid category.');
            return;
        }
        const numericPrice = Number(price);
        if (!price || isNaN(numericPrice) || numericPrice <= 0) {
            setErrorMsg('Please enter a valid price greater than 0.');
            return;
        }
        const numericStock = Number(stock);
        if (stock === '' || isNaN(numericStock) || numericStock < 0) {
            setErrorMsg('Stock quantity must be 0 or greater.');
            return;
        }
        const numericMinStock = Number(minStock);
        if (minStock === '' || isNaN(numericMinStock) || numericMinStock < 0) {
            setErrorMsg('Low-stock threshold must be 0 or greater.');
            return;
        }

        setIsSubmitting(true);
        const activeSupplierName = supplierName || (suppliersList.length > 0 ? suppliersList[0] : 'Central Food City');
        const foundSupplierObj = rawSuppliers.find(
            (s) => (s.name || '').toLowerCase() === activeSupplierName.toLowerCase()
        );
        const resolvedSupplierEmail = foundSupplierObj?.email || '';

        const newProductPayload = {
            name: name.trim(),
            brand: brand.trim(),
            category,
            price: Number(price) || 0,
            unit,
            stock: Number(stock) || 0,
            minStock: Number(minStock) || 10,
            supplierName: activeSupplierName,
            supplierEmail: resolvedSupplierEmail,
            storeName,
            storeEmail: user?.email || '',
            ownerEmail: user?.email || '',
            storeIcon: user?.picture || '',
            image: imagePreview || '',
            fallbackEmoji: getFallbackEmoji(category),
            bgColor: '#EFF6FF',
        };

        try {
            const res = await fetch(`${API_BASE_URL}/product-inventory/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProductPayload),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setIsSaved(true);
                setTimeout(() => {
                    if (onNavigate) onNavigate('product_list', { newProduct: data.product });
                }, 400);
            } else {
                setErrorMsg(data.message || 'Failed to save product');
            }
        } catch (err) {
            setErrorMsg('Server connection failed. Ensure backend is running.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtered suggestions for typeahead
    const matchedSuggestions = name.trim().length >= 1
        ? supplierCatalogCache.filter((c) => (c.name || '').toLowerCase().includes(name.trim().toLowerCase()))
        : [];

    const selectedCatObj = rawCategories.find((c) => c.name === category);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => setShowSuggestions(false)}
        >
            {/* Success Toast */}
            {isSaved && (
                <View style={styles.successBanner}>
                    <Check size={18} color="#27672D" />
                    <Text style={styles.successText}>Product saved successfully! Redirecting...</Text>
                </View>
            )}

            {/* Error Banner */}
            {errorMsg ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            ) : null}

            {/* Top Navigation Row */}
            <View style={styles.titleRow}>
                <Text style={styles.pageTitle}>Add product</Text>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('product_list')}
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Form Fields Stack */}
            <View style={styles.form}>
                {/* Preferred Supplier Selection */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Preferred Supplier</Text>
                    {suppliersList.length > 0 ? (
                        <TouchableOpacity
                            style={styles.selectBtn}
                            onPress={() => {
                                setIsSupplierDropdownOpen(!isSupplierDropdownOpen);
                                setShowSuggestions(false);
                                setIsCatDropdownOpen(false);
                                setIsUnitDropdownOpen(false);
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.selectBtnText}>{supplierName || 'Select Preferred Supplier'}</Text>
                            <ChevronDown size={18} color="#0F172A" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.noSupplierBox}>
                            <Text style={{ fontSize: 16 }}>🏪</Text>
                            <Text style={styles.noSupplierText}>
                                No suppliers linked to your store yet. Add suppliers from the{' '}
                                <Text style={{ color: '#27672D', fontWeight: '700' }}>Suppliers</Text> tab first.
                            </Text>
                        </View>
                    )}

                    {isSupplierDropdownOpen && (
                        <View style={styles.dropdownMenu}>
                            {suppliersList.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.dropdownItem, supplierName === s && styles.dropdownItemActive]}
                                    onPress={() => {
                                        setSupplierName(s);
                                        setIsSupplierDropdownOpen(false);
                                        setShowSuggestions(false);
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

                {/* Product Name with Smart Typeahead Auto-Suggest (Image 4 - 100% matched) */}
                <View style={styles.productNameFieldGroup}>
                    <Text style={styles.label}>Product name</Text>
                    <TextInput
                        style={[styles.input, isNameFocused && styles.inputFocused]}
                        placeholder="e.g. Fresh Milk 1L"
                        placeholderTextColor="#94A3B8"
                        value={name}
                        onChangeText={(txt) => {
                            setName(txt);
                            setShowSuggestions(true);
                            setIsSupplierDropdownOpen(false);
                            setIsCatDropdownOpen(false);
                            setIsUnitDropdownOpen(false);
                        }}
                        onFocus={() => {
                            setIsNameFocused(true);
                            setShowSuggestions(true);
                            setIsSupplierDropdownOpen(false);
                            setIsCatDropdownOpen(false);
                            setIsUnitDropdownOpen(false);
                        }}
                        onBlur={() => {
                            setIsNameFocused(false);
                        }}
                    />

                    {/* Auto-suggest dropdown container */}
                    {showSuggestions && name.trim().length >= 1 && (
                        <View style={styles.suggestionsBox}>
                            {matchedSuggestions.length === 0 ? (
                                <View style={styles.suggestionEmpty}>
                                    <Text style={styles.suggestionEmptyText}>No matching products from this supplier</Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={{ maxHeight: 216, backgroundColor: '#FFFFFF' }}
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                >
                                    {matchedSuggestions.map((p) => {
                                        const isAdded = existingProducts.some(
                                            (ep) => (ep.name || '').toLowerCase() === (p.name || '').toLowerCase()
                                        );
                                        return (
                                            <TouchableOpacity
                                                key={p._id || p.name}
                                                style={[styles.suggestionItem, { backgroundColor: '#FFFFFF' }, isAdded && { opacity: 0.6 }]}
                                                onPress={() => {
                                                    if (isAdded) return;
                                                    setName(p.name);
                                                    if (p.category) setCategory(p.category);
                                                    if (p.price) setPrice(p.price.toString());
                                                    if (p.unit) setUnit(p.unit);
                                                    if (p.brand) setBrand(p.brand);
                                                    if (p.supplierName) setSupplierName(p.supplierName);
                                                    setShowSuggestions(false);
                                                    setIsNameFocused(false);
                                                }}
                                                activeOpacity={isAdded ? 1 : 0.7}
                                            >
                                                <View style={styles.suggestionRow}>
                                                    <View style={styles.suggestionNameRow}>
                                                        <Text style={styles.suggestionName}>{p.name}</Text>
                                                        {isAdded && (
                                                            <View style={styles.addedBadge}>
                                                                <Text style={styles.addedBadgeText}>ADDED</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    {p.brand && !isAdded && (
                                                        <View style={styles.brandBadge}>
                                                            <Text style={styles.brandBadgeText}>{p.brand}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.suggestionMeta}>
                                                    {p.category} • Rs. {p.price} • {p.unit}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    )}
                </View>

                {/* Category with Inline Add Option */}
                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity
                            onPress={() => {
                                handleCancelEditCategory();
                                setShowAddCatModal(true);
                            }}
                            style={styles.addCatLink}
                        >
                            <Plus size={14} color="#166534" />
                            <Text style={styles.addCatLinkText}>Add new category</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Custom Category Selector with Circular Image Badges */}
                    <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => {
                            setIsCatDropdownOpen(!isCatDropdownOpen);
                            setShowSuggestions(false);
                            setIsSupplierDropdownOpen(false);
                            setIsUnitDropdownOpen(false);
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.selectedCatRow}>
                            {category ? (
                                <>
                                    <View style={styles.catAvatarBox}>
                                        {selectedCatObj?.image ? (
                                            <Image source={{ uri: selectedCatObj.image }} style={styles.catAvatarImg} />
                                        ) : (
                                            <Text style={{ fontSize: 13 }}>{selectedCatObj?.fallbackEmoji || '📦'}</Text>
                                        )}
                                    </View>
                                    <Text style={styles.selectedCatText}>{category}</Text>
                                </>
                            ) : (
                                <Text style={styles.selectBtnPlaceholder}>Select Category</Text>
                            )}
                        </View>
                        <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>

                    {isCatDropdownOpen && (
                        <View style={styles.dropdownMenu}>
                            {(rawCategories.length > 0 ? rawCategories : categoriesList.map((n) => ({ name: n }))).map((c) => {
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

                {/* Price */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Price (Rs.)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor="#94A3B8"
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
                        onPress={() => {
                            setIsUnitDropdownOpen(!isUnitDropdownOpen);
                            setShowSuggestions(false);
                            setIsSupplierDropdownOpen(false);
                            setIsCatDropdownOpen(false);
                        }}
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

                {/* Enhanced Image Upload with Small Thumbnail Preview */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Product Image</Text>
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
                                {imagePreview ? 'Image Selected' : 'Choose Product Image'}
                            </Text>
                            <Text style={styles.imageSubtitle}>
                                {imagePreview ? 'Click to change image file' : 'PNG, JPG, WebP up to 5MB'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Stock quantity */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Stock quantity</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
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
                        placeholder="10"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={minStock}
                        onChangeText={setMinStock}
                    />
                </View>

                {/* Submit Action Button with Spinner */}
                <TouchableOpacity
                    style={[styles.createBtn, isSubmitting && { opacity: 0.85 }]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                >
                    {isSubmitting ? (
                        <View style={styles.btnRow}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.createBtnText}>Saving product...</Text>
                        </View>
                    ) : (
                        <Text style={styles.createBtnText}>Create product</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Modal Popup: Create & Manage Categories */}
            <Modal visible={showAddCatModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Category Manager</Text>
                            <View style={styles.modalHeaderActions}>
                                {editingCat && (
                                    <TouchableOpacity
                                        onPress={handleCancelEditCategory}
                                        style={styles.cancelEditBtn}
                                    >
                                        <Text style={styles.cancelEditBtnText}>Cancel Edit</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setShowAddCatModal(false)}>
                                    <X size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Add/Edit Input form */}
                        <View style={styles.catFormCard}>
                            <Text style={styles.catFormSubtitle}>
                                {editingCat ? `Editing: ${editingCat.originalName}` : 'Add New Category'}
                            </Text>
                            <TextInput
                                style={styles.catInput}
                                placeholder="Category name (e.g. Seafood)"
                                placeholderTextColor="#94A3B8"
                                value={newCatName}
                                onChangeText={setNewCatName}
                            />

                            {/* Emoji selector chips */}
                            <Text style={[styles.label, { marginTop: 8 }]}>Select Emoji Icon</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {emojiOptions.map((em) => (
                                        <TouchableOpacity
                                            key={em}
                                            onPress={() => setNewCatEmoji(em)}
                                            style={[styles.emojiChip, newCatEmoji === em && styles.emojiChipActive]}
                                        >
                                            <Text style={{ fontSize: 16 }}>{em}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* Image upload button */}
                            <TouchableOpacity
                                style={styles.catImagePickerBtn}
                                onPress={handlePickCatImage}
                            >
                                <UploadCloud size={16} color="#64748B" />
                                <Text style={styles.catImagePickerText}>
                                    {newCatImage ? 'Image Selected (Change)' : 'Upload Category Image'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.saveCatBtn, isAddingCat && { opacity: 0.7 }]}
                                onPress={handleSaveCategory}
                                disabled={isAddingCat}
                            >
                                <Text style={styles.saveCatBtnText}>
                                    {isAddingCat ? 'Saving...' : editingCat ? 'Update Category' : '+ Add Category'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Categories List */}
                        <Text style={[styles.label, { marginTop: 14, marginBottom: 8 }]}>Existing Categories</Text>
                        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                            {rawCategories.map((c) => (
                                <View key={c._id || c.name} style={styles.catListItem}>
                                    <View style={styles.catListLeft}>
                                        <View style={styles.catAvatarBox}>
                                            {c.image ? (
                                                <Image source={{ uri: c.image }} style={styles.catAvatarImg} />
                                            ) : (
                                                <Text style={{ fontSize: 13 }}>{c.fallbackEmoji || '📦'}</Text>
                                            )}
                                        </View>
                                        <Text style={styles.catListName}>{c.name}</Text>
                                    </View>
                                    <View style={styles.catListActions}>
                                        <TouchableOpacity
                                            onPress={() => handleStartEditCategory(c)}
                                            style={styles.catIconBtn}
                                        >
                                            <Edit2 size={15} color="#166534" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteCategory(c._id || c.name)}
                                            style={styles.catIconBtn}
                                        >
                                            <Trash2 size={15} color="#DC2626" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
        overflow: 'visible',
    },
    fieldGroup: {
        flexDirection: 'column',
        gap: 6,
        zIndex: 1,
        elevation: 1,
    },
    productNameFieldGroup: {
        flexDirection: 'column',
        gap: 6,
        position: 'relative',
        zIndex: 9999,
        elevation: Platform.OS === 'android' ? 50 : 9999,
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
    addCatLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    addCatLinkText: {
        color: '#166534',
        fontSize: 12,
        fontWeight: '700',
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
    inputFocused: {
        borderColor: '#166534',
        borderWidth: 1.5,
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
    selectBtnPlaceholder: {
        fontSize: 14,
        fontWeight: '500',
        color: '#94A3B8',
    },
    noSupplierBox: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        borderRadius: 14,
        padding: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    noSupplierText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600',
        flex: 1,
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
        width: 26,
        height: 26,
        borderRadius: 13,
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
    suggestionsBox: {
        position: 'absolute',
        top: 72,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        maxHeight: 216,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 80,
        zIndex: 10000,
        overflow: 'hidden',
    },
    suggestionEmpty: {
        padding: 14,
        alignItems: 'center',
    },
    suggestionEmptyText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    suggestionItem: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    suggestionNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        marginRight: 8,
    },
    suggestionName: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#0F172A',
    },
    addedBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    addedBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#15803D',
    },
    brandBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    brandBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#166534',
    },
    suggestionMeta: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '500',
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
    createBtn: {
        width: '100%',
        backgroundColor: '#27672D',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 24,
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    createBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.70)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    modalBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        width: '100%',
        maxWidth: 360,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    modalHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    cancelEditBtn: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    cancelEditBtnText: {
        color: '#166534',
        fontSize: 11,
        fontWeight: '700',
    },
    catFormCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    catFormSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
    },
    catInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: '#0F172A',
    },
    emojiChip: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiChipActive: {
        borderColor: '#166534',
        backgroundColor: '#DCFCE7',
    },
    catImagePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        borderRadius: 10,
        padding: 8,
        justifyContent: 'center',
        marginVertical: 6,
    },
    catImagePickerText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    saveCatBtn: {
        backgroundColor: '#166534',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 6,
    },
    saveCatBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    catListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    catListLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    catListName: {
        fontSize: 13.5,
        fontWeight: '600',
        color: '#1E293B',
    },
    catListActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    catIconBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
});
