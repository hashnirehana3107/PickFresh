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
    KeyboardAvoidingView,
} from 'react-native';
import {
    Package,
    Plus,
    Edit2,
    Trash2,
    X,
    Check,
    AlertCircle,
    RefreshCw,
    Tag,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Settings,
    Upload,
    ChevronDown,
    ImageIcon,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const autoExtractBrand = (productName) => {
    if (!productName || typeof productName !== 'string') return '';
    const knownBrands = [
        'Anchor', 'Highland', 'Maliban', 'Munchee', 'Keells', 'Ratthi', 'Elephant House',
        'Coca-Cola', 'Coke', 'Sunquick', 'Kist', 'Astra', 'Maggi', 'MD', 'Surf Excel',
        'Vim', 'Sunlight', 'Signal', 'Kotmale', 'Bairaha', 'Prima', 'Nestle', 'Milo',
        'Pelwatte', 'Harischandra', 'Dilmah', 'Zesta', 'Watawala', 'Knorr', 'Heinz', 'Lays', 'Ambewela', 'Lux'
    ];
    for (const b of knownBrands) {
        const regex = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(productName)) return b;
    }
    return '';
};

export default function SupplierCatalogScreen({ onNavigate }) {
    const { user, updateUser } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Scroll Ref
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState(['All', 'Dairy & Eggs', 'Soft Drinks', 'Snacks', 'Health & Beauty', 'Vegetables', 'Fruits']);
    const catScrollRef = useRef(null);
    const [catScrollX, setCatScrollX] = useState(0);

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showCatManager, setShowCatManager] = useState(false);
    const [newCatInput, setNewCatInput] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // Form Dropdown helpers
    const [catDropdownOpen, setCatDropdownOpen] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [isAddingNewCat, setIsAddingNewCat] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: 'Dairy & Eggs',
        price: '',
        minOrderQty: '10',
        unit: 'bottle',
        image: '',
        status: 'Available',
    });

    const [mySupplyCategories, setMySupplyCategories] = useState([]);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/product-inventory/categories`);
            const data = await res.json();
            if (data.success && Array.isArray(data.categories)) {
                const master = data.categories.map((c) => c.name).filter(Boolean);
                setCategories(['All', ...new Set(master)]);
            }
        } catch (err) {
            console.log('Categories load notice:', err.message);
        }
    };

    const fetchSupplierProfile = async () => {
        const reqEmail = user?.email || '';
        if (!reqEmail) return;
        try {
            const res = await fetch(`${API_BASE_URL}/auth/user-details?email=${encodeURIComponent(reqEmail)}`);
            const data = await res.json();
            if (data.success && data.user?.supplyCategories) {
                setMySupplyCategories(data.user.supplyCategories);
            }
        } catch (err) {
            console.log('Profile categories notice:', err.message);
        }
    };

    const fetchCatalog = async () => {
        setLoading(true);
        setError(null);
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `${API_BASE_URL}/supplier-replenishment/catalog?supplierEmail=${encodeURIComponent(supplierEmail)}&supplierName=${encodeURIComponent(supplierName)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.products)) {
                setProducts(data.products);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error('Fetch catalog error:', err);
            setError('Failed to load catalog products. Check server connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchSupplierProfile();
        fetchCatalog();
    }, [user?.email, user?.supplierName]);

    const handleScrollCat = (direction) => {
        const offset = direction === 'left' ? Math.max(0, catScrollX - 160) : catScrollX + 160;
        catScrollRef.current?.scrollTo({ x: offset, animated: true });
        setCatScrollX(offset);
    };

    const handleToggleSupplierCategory = async (catName) => {
        const isIncluded = mySupplyCategories.includes(catName);
        const updated = isIncluded
            ? mySupplyCategories.filter((c) => c !== catName)
            : [...mySupplyCategories, catName];

        setMySupplyCategories(updated);
        const reqEmail = user?.email || '';
        if (!reqEmail) return;

        try {
            await fetch(`${API_BASE_URL}/auth/update-profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: reqEmail,
                    supplyCategories: updated,
                }),
            });
            if (updateUser) {
                updateUser({ supplyCategories: updated });
            }
        } catch (err) {
            console.error('Failed to save updated supply categories:', err);
        }
    };

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        const defaultCat = categories.find((c) => c !== 'All') || 'Dairy & Eggs';
        setFormData({
            name: '',
            brand: '',
            category: defaultCat,
            price: '',
            minOrderQty: '10',
            unit: '1kg pack',
            image: '',
            status: 'Available',
        });
        setCatDropdownOpen(false);
        setStatusDropdownOpen(false);
        setIsAddingNewCat(false);
        setShowModal(true);
    };

    const handleOpenEditModal = (prod) => {
        setEditingProduct(prod);
        const resolvedBrand = (prod.brand || '').trim() || autoExtractBrand(prod.name || '');
        setFormData({
            name: prod.name || '',
            brand: resolvedBrand,
            category: prod.category || 'Dairy & Eggs',
            price: prod.price !== undefined ? String(prod.price) : '',
            minOrderQty: prod.minOrderQty !== undefined ? String(prod.minOrderQty) : '10',
            unit: prod.unit || '1kg pack',
            image: prod.image || '',
            status: prod.status || 'Available',
        });
        setCatDropdownOpen(false);
        setStatusDropdownOpen(false);
        setIsAddingNewCat(false);
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Required', 'Please enter a product name');
            return;
        }

        setSubmitting(true);
        try {
            const supplierEmail = user?.email || '';
            const supplierName = user?.supplierName || user?.name || 'Supplier';
            let finalBrand = formData.brand.trim() || autoExtractBrand(formData.name);

            const payload = {
                supplierEmail,
                supplierName,
                name: formData.name.trim(),
                brand: finalBrand,
                category: formData.category,
                price: Number(formData.price) || 0,
                wholesalePrice: Number(formData.price) || 0,
                wholesaleRate: Number(formData.price) || 0,
                minOrderQty: Number(formData.minOrderQty) || 1,
                unit: formData.unit || '1kg pack',
                image: formData.image || '',
                status: formData.status || 'Available',
            };

            let endpoint = `${API_BASE_URL}/supplier-replenishment/catalog`;
            let method = 'POST';

            if (editingProduct) {
                endpoint = `${API_BASE_URL}/supplier-replenishment/catalog/${editingProduct._id || editingProduct.id}`;
                method = 'PUT';
            }

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                if (editingProduct) {
                    const targetId = editingProduct._id || editingProduct.id;
                    setProducts((prev) => prev.map((p) => ((p._id || p.id) === targetId ? (data.product || { ...p, ...payload }) : p)));
                } else if (data.product) {
                    setProducts((prev) => [data.product, ...prev]);
                }
                setShowModal(false);
                fetchCatalog();
            } else {
                Alert.alert('Error', data.message || 'Operation failed');
            }
        } catch (err) {
            Alert.alert('Error', 'Network error while saving product');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        try {
            setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
            setDeletingId(null);
            const res = await fetch(`${API_BASE_URL}/supplier-replenishment/catalog/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                fetchCatalog();
            } else {
                fetchCatalog();
                Alert.alert('Error', data.message || 'Failed to delete product');
            }
        } catch (err) {
            fetchCatalog();
            Alert.alert('Error', 'Network error while deleting product');
        }
    };

    const handleAddNewCategory = async () => {
        const trimmed = newCatInput.trim();
        if (!trimmed) {
            Alert.alert('Required', 'Please enter a category name');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/product-inventory/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            });
            const data = await res.json();
            if (data.success || res.ok) {
                setCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
                const current = mySupplyCategories.length > 0 ? mySupplyCategories : categories.filter((c) => c !== 'All');
                const updated = current.includes(trimmed) ? current : [...current, trimmed];
                setMySupplyCategories(updated);

                const reqEmail = user?.email || '';
                if (reqEmail) {
                    await fetch(`${API_BASE_URL}/auth/update-profile`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: reqEmail,
                            supplyCategories: updated,
                        }),
                    });
                }
                if (updateUser) {
                    updateUser({ supplyCategories: updated });
                }

                setFormData((prev) => ({ ...prev, category: trimmed }));
                setNewCatInput('');
                setIsAddingNewCat(false);
                Alert.alert('Success', `Category "${trimmed}" added successfully!`);
            } else {
                Alert.alert('Notice', data.message || 'Could not add category');
            }
        } catch (err) {
            console.log('Add category notice:', err.message);
            Alert.alert('Error', 'Network error while adding category');
        }
    };

    const handleRemoveCategory = async (catName) => {
        try {
            setCategories((prev) => prev.filter((c) => c !== catName));
            const current = mySupplyCategories.length > 0 ? mySupplyCategories : categories.filter((c) => c !== 'All');
            const updated = current.filter((c) => c !== catName);
            setMySupplyCategories(updated);

            const reqEmail = user?.email || '';
            if (reqEmail) {
                await fetch(`${API_BASE_URL}/auth/update-profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: reqEmail,
                        supplyCategories: updated,
                    }),
                });
            }
            if (updateUser) {
                updateUser({ supplyCategories: updated });
            }

            await fetch(`${API_BASE_URL}/product-inventory/categories/${encodeURIComponent(catName)}`, {
                method: 'DELETE',
            });

            Alert.alert('Removed', `Category "${catName}" removed successfully.`);
        } catch (err) {
            console.error('Failed to remove category:', err);
        }
    };

    const filteredProducts = products.filter((p) => {
        const matchesCat = selectedCategory === 'All' ? true : p.category === selectedCategory;
        const matchesSearch = p.name ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        return matchesCat && matchesSearch;
    });

    return (
        <View style={styles.container}>
            {/* Header Section matching Image 1 */}
            <View style={styles.header}>
                <Text style={styles.title}>My Products Catalog</Text>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('home')}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={18} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={styles.searchWrap}>
                <Search size={18} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholderTextColor="#94A3B8"
                />
            </View>

            {/* Actions Row */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => setShowCatManager(true)}
                    activeOpacity={0.8}
                >
                    <Settings size={15} color="#0F172A" />
                    <Text style={styles.manageBtnText}>Manage</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handleOpenAddModal}
                    activeOpacity={0.8}
                >
                    <Plus size={15} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>Add Product</Text>
                </TouchableOpacity>
            </View>

            {/* Category Filter Chips with Scroll Arrows on both sides matching Image 1 */}
            <View style={styles.catChipsWrapper}>
                <TouchableOpacity
                    style={styles.catScrollArrow}
                    onPress={() => handleScrollCat('left')}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={16} color="#64748B" />
                </TouchableOpacity>

                <ScrollView
                    ref={catScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.catScroll}
                    onScroll={(e) => setCatScrollX(e.nativeEvent.contentOffset.x)}
                    scrollEventThrottle={16}
                >
                    {categories.map((cat) => {
                        const count = cat === 'All'
                            ? products.length
                            : products.filter((p) => p.category === cat).length;
                        const isSelected = selectedCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catChip, isSelected && styles.catChipActive]}
                                onPress={() => setSelectedCategory(cat)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>{cat}</Text>
                                <View style={[styles.chipCountBadge, isSelected && styles.chipCountBadgeActive]}>
                                    <Text style={[styles.chipCountText, isSelected && styles.chipCountTextActive]}>{count}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <TouchableOpacity
                    style={styles.catScrollArrow}
                    onPress={() => handleScrollCat('right')}
                    activeOpacity={0.7}
                >
                    <ChevronRight size={16} color="#64748B" />
                </TouchableOpacity>
            </View>

            {/* Products List Body matching Image 1 */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#166534" />
                    <Text style={styles.centerText}>Loading catalog items...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <AlertCircle size={32} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchCatalog}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : filteredProducts.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Package size={48} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>No Products Found</Text>
                    <Text style={styles.emptySub}>
                        {selectedCategory === 'All'
                            ? 'Add products to make them available for store replenishment.'
                            : `No products listed under "${selectedCategory}".`}
                    </Text>
                    <TouchableOpacity style={styles.addBtnLarge} onPress={handleOpenAddModal}>
                        <Plus size={16} color="#FFFFFF" />
                        <Text style={styles.addBtnLargeText}>Add New Product</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                    {filteredProducts.map((item) => {
                        const id = item._id || item.id;
                        const brand = item.brand || autoExtractBrand(item.name);
                        return (
                            <View key={id} style={styles.card}>
                                {/* Top Pills */}
                                <View style={styles.cardTopRow}>
                                    <View style={styles.cardPillsLeft}>
                                        <View style={styles.catPill}>
                                            <Tag size={12} color="#475569" />
                                            <Text style={styles.catPillText}>{item.category}</Text>
                                        </View>
                                        {brand ? (
                                            <View style={styles.brandPill}>
                                                <Text style={styles.brandPillText}>{brand}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View style={[styles.statusPill, item.status === 'Available' ? styles.statusAvail : styles.statusOutOfStock]}>
                                        <Text style={[styles.statusPillText, item.status === 'Available' ? styles.statusAvailText : styles.statusOutOfStockText]}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>

                                {/* Content Row */}
                                <View style={styles.cardContentRow}>
                                    {item.image ? (
                                        <Image source={{ uri: item.image }} style={styles.productImg} />
                                    ) : (
                                        <View style={styles.productImgFallback}>
                                            <Package size={26} color="#166534" />
                                        </View>
                                    )}
                                    <View style={styles.cardTitleBox}>
                                        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                                    </View>
                                </View>

                                {/* Wholesale Price & Min Order Qty box */}
                                <View style={styles.detailsRow}>
                                    <View style={styles.detailBox}>
                                        <Text style={styles.detailLabel}>WHOLESALE PRICE</Text>
                                        <Text style={styles.detailValPrice}>
                                            Rs. {Number(item.price || item.wholesalePrice || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.detailBoxRight}>
                                        <Text style={styles.detailLabel}>MIN ORDER QTY</Text>
                                        <Text style={styles.detailValQty}>
                                            {item.minOrderQty || 1} {item.unit || 'unit'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Action Buttons: Edit & Delete matching Image 1 */}
                                <View style={styles.cardActionsRow}>
                                    <TouchableOpacity
                                        style={styles.cardEditBtn}
                                        onPress={() => handleOpenEditModal(item)}
                                        activeOpacity={0.8}
                                    >
                                        <Edit2 size={14} color="#334155" />
                                        <Text style={styles.cardEditBtnText}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.cardDeleteBtn}
                                        onPress={() => setDeletingId(id)}
                                        activeOpacity={0.8}
                                    >
                                        <Trash2 size={14} color="#DC2626" />
                                        <Text style={styles.cardDeleteBtnText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* Add / Edit Product Modal matching Image 1 and 3 (Narrow dialog, compact layout, no screen overflow) */}
            <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalDialog}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingProduct ? 'Edit Catalog Product' : 'Add Product to Catalog'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.7}>
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            bounces={false}
                        >
                            {/* Product Image section matching Image 1 & 3 */}
                            <Text style={styles.formLabel}>Product Image</Text>
                            <View style={styles.imgPickerBox}>
                                <View style={styles.imgThumbCol}>
                                    {formData.image ? (
                                        <View style={styles.imgThumbWrap}>
                                            <Image source={{ uri: formData.image }} style={styles.imgThumb} />
                                            <TouchableOpacity
                                                style={styles.removeImgBtn}
                                                onPress={() => setFormData({ ...formData, image: '' })}
                                                activeOpacity={0.8}
                                            >
                                                <X size={10} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.imgEmptyThumb}>
                                            <ImageIcon size={20} color="#94A3B8" />
                                            <Text style={styles.noImageText}>No Image</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.imgInputsCol}>
                                    <TextInput
                                        style={styles.imgUrlInput}
                                        placeholder="Paste image URL here..."
                                        placeholderTextColor="#94A3B8"
                                        value={formData.image}
                                        onChangeText={(val) => setFormData({ ...formData, image: val })}
                                        numberOfLines={1}
                                    />
                                    <TouchableOpacity
                                        style={styles.uploadImgBtn}
                                        onPress={() => {
                                            if (Platform.OS === 'web' && typeof document !== 'undefined') {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e) => {
                                                    const file = e.target.files && e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setFormData((prev) => ({ ...prev, image: reader.result }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                };
                                                input.click();
                                            } else {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    image: prev.image || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop',
                                                }));
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Upload size={12} color="#334155" />
                                        <Text style={styles.uploadImgBtnText}>Upload Image File</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Product Name */}
                            <Text style={styles.formLabel}>Product Name *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. Nuwara Eliya Carrots 1kg"
                                placeholderTextColor="#94A3B8"
                                value={formData.name}
                                onChangeText={(val) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        name: val,
                                        brand: prev.brand || autoExtractBrand(val),
                                    }));
                                }}
                            />

                            {/* Brand (Optional) */}
                            <Text style={styles.formLabel}>Brand (Optional)</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. Highland, Anchor, Maliban"
                                placeholderTextColor="#94A3B8"
                                value={formData.brand}
                                onChangeText={(val) => setFormData({ ...formData, brand: val })}
                            />

                            {/* Supply Category Section matching Image 1 & 3 */}
                            <View style={styles.catHeaderRow}>
                                <Text style={styles.formLabel}>Supply Category *</Text>
                                <View style={styles.catHeaderLinks}>
                                    <TouchableOpacity
                                        onPress={() => setIsAddingNewCat(!isAddingNewCat)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.addCatLink}>{isAddingNewCat ? 'Cancel' : '+ Add New'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setShowCatManager(true)}
                                        activeOpacity={0.7}
                                        style={styles.manageCatLinkWrap}
                                    >
                                        <Settings size={12} color="#64748B" />
                                        <Text style={styles.manageCatLink}>Manage</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {isAddingNewCat ? (
                                <View style={styles.newCatInlineRow}>
                                    <TextInput
                                        style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                                        placeholder="Category name..."
                                        placeholderTextColor="#94A3B8"
                                        value={newCatInput}
                                        onChangeText={setNewCatInput}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={styles.newCatInlineAddBtn}
                                        onPress={handleAddNewCategory}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.newCatInlineAddBtnText}>Add</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.dropdownSelector}
                                    onPress={() => {
                                        setCatDropdownOpen(!catDropdownOpen);
                                        setStatusDropdownOpen(false);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.dropdownVal}>{formData.category}</Text>
                                    <ChevronDown size={16} color="#0F172A" />
                                </TouchableOpacity>
                            )}

                            {catDropdownOpen && !isAddingNewCat && (
                                <View style={styles.dropdownMenu}>
                                    {categories.filter((c) => c !== 'All').map((cat) => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.dropdownMenuItem, formData.category === cat && styles.dropdownMenuItemActive]}
                                            onPress={() => {
                                                setFormData({ ...formData, category: cat });
                                                setCatDropdownOpen(false);
                                            }}
                                        >
                                            <Text style={[styles.dropdownMenuText, formData.category === cat && styles.dropdownMenuTextActive]}>
                                                {cat}
                                            </Text>
                                            {formData.category === cat && <Check size={13} color="#166534" />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Wholesale Price & Min Order Qty in 2 columns matching Image 1 & 3 */}
                            <View style={styles.formRow}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.formLabel}>Wholesale Price (Rs.) *</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="e.g. 350"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={formData.price}
                                        onChangeText={(val) => setFormData({ ...formData, price: val })}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.formLabel}>Min Order Quantity</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="10"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={formData.minOrderQty}
                                        onChangeText={(val) => setFormData({ ...formData, minOrderQty: val })}
                                    />
                                </View>
                            </View>

                            {/* Packaging Unit & Availability Status in 2 columns matching Image 1 & 3 */}
                            <View style={styles.formRow}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.formLabel}>Packaging Unit</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="1kg pack"
                                        placeholderTextColor="#94A3B8"
                                        value={formData.unit}
                                        onChangeText={(val) => setFormData({ ...formData, unit: val })}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.formLabel}>Availability Status</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownSelector}
                                        onPress={() => {
                                            setStatusDropdownOpen(!statusDropdownOpen);
                                            setCatDropdownOpen(false);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.dropdownVal}>{formData.status || 'Available'}</Text>
                                        <ChevronDown size={16} color="#0F172A" />
                                    </TouchableOpacity>
                                    {statusDropdownOpen && (
                                        <View style={styles.dropdownMenu}>
                                            {['Available', 'Out of Stock'].map((st) => (
                                                <TouchableOpacity
                                                    key={st}
                                                    style={[styles.dropdownMenuItem, formData.status === st && styles.dropdownMenuItemActive]}
                                                    onPress={() => {
                                                        setFormData({ ...formData, status: st });
                                                        setStatusDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownMenuText, formData.status === st && styles.dropdownMenuTextActive]}>
                                                        {st}
                                                    </Text>
                                                    {formData.status === st && <Check size={13} color="#166534" />}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal Footer Buttons matching Image 1 & 3 */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowModal(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleSubmit}
                                disabled={submitting}
                                activeOpacity={0.8}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalSaveBtnText}>
                                        {editingProduct ? 'Save Changes' : 'Add to Catalog'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Delete Confirmation Modal matching Image 4 (Centered dialog, no screen overflow) */}
            <Modal visible={!!deletingId} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmDialog}>
                        <Text style={styles.confirmTitle}>Confirm Deletion</Text>
                        <Text style={styles.confirmDesc}>
                            Are you sure you want to remove this product from your catalog? Store owners will no longer see it under your product list.
                        </Text>
                        <View style={styles.confirmBtnGroup}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setDeletingId(null)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={() => handleDeleteProduct(deletingId)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.confirmDeleteBtnText}>Delete Product</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Manage Supply Categories Modal matching Image 4 (Centered dialog, no screen overflow) */}
            <Modal visible={showCatManager} transparent animationType="fade" onRequestClose={() => setShowCatManager(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalDialog}>
                        <View style={styles.modalHeader}>
                            <View style={styles.catHeaderTitleWrap}>
                                <Tag size={18} color="#166534" />
                                <Text style={styles.modalTitle}>Manage Supply Categories</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowCatManager(false)} activeOpacity={0.7}>
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Add new category input row matching Image 4 */}
                        <View style={styles.catManagerAddRow}>
                            <TextInput
                                style={styles.catManagerInput}
                                placeholder="Add new category name..."
                                value={newCatInput}
                                onChangeText={setNewCatInput}
                                placeholderTextColor="#94A3B8"
                            />
                            <TouchableOpacity
                                style={styles.catManagerAddBtn}
                                onPress={handleAddNewCategory}
                                activeOpacity={0.8}
                            >
                                <Plus size={15} color="#FFFFFF" />
                                <Text style={styles.catManagerAddBtnText}>Add</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Category List with green borders & red Remove buttons matching Image 4 */}
                        <ScrollView
                            style={styles.catManagerScroll}
                            contentContainerStyle={styles.catManagerScrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {categories.filter((c) => c !== 'All').map((catName) => (
                                <View key={catName} style={styles.catManageCard}>
                                    <View style={styles.catManageCardLeft}>
                                        <Tag size={15} color="#166534" />
                                        <Text style={styles.catManageCardName}>{catName}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.catRemoveBtn}
                                        onPress={() => handleRemoveCategory(catName)}
                                        activeOpacity={0.7}
                                    >
                                        <Trash2 size={13} color="#991B1B" />
                                        <Text style={styles.catRemoveBtnText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Done button matching Image 4 */}
                        <TouchableOpacity
                            style={styles.catManagerDoneBtn}
                            onPress={() => setShowCatManager(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.catManagerDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.4,
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
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 12,
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.2,
        borderColor: '#CBD5E1',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 14,
        gap: 6,
    },
    manageBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#0F172A',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#166534',
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 14,
        gap: 6,
        shadowColor: '#166534',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    catChipsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        gap: 8,
    },
    catScrollArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    catScroll: {
        gap: 8,
        alignItems: 'center',
    },
    catChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 7,
        gap: 6,
    },
    catChipActive: {
        backgroundColor: '#166534',
        borderColor: '#166534',
        shadowColor: '#166534',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
    },
    catChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    catChipTextActive: {
        color: '#FFFFFF',
    },
    chipCountBadge: {
        backgroundColor: 'rgba(15, 23, 42, 0.08)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    chipCountBadgeActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
    },
    chipCountText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
    },
    chipCountTextActive: {
        color: '#FFFFFF',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardPillsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    catPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    catPillText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#475569',
    },
    brandPill: {
        backgroundColor: '#E0F2FE',
        borderWidth: 1,
        borderColor: '#BAE6FD',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    brandPillText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#0284C7',
    },
    statusPill: {
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusAvail: {
        backgroundColor: '#DCFCE7',
    },
    statusOutOfStock: {
        backgroundColor: '#FEE2E2',
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '800',
    },
    statusAvailText: {
        color: '#15803D',
    },
    statusOutOfStockText: {
        color: '#DC2626',
    },
    cardContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    productImg: {
        width: 56,
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    productImgFallback: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#86EFAC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitleBox: {
        flex: 1,
    },
    productName: {
        fontSize: 15.5,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 20,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    detailBox: {
        flex: 1,
    },
    detailBoxRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    detailLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    detailValPrice: {
        fontSize: 15,
        fontWeight: '900',
        color: '#166534',
        marginTop: 3,
    },
    detailValQty: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#334155',
        marginTop: 3,
    },
    cardActionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    cardEditBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        gap: 6,
    },
    cardEditBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    cardDeleteBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#FFF5F5',
        borderWidth: 1,
        borderColor: '#FECACA',
        gap: 6,
    },
    cardDeleteBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#DC2626',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    centerText: {
        marginTop: 10,
        fontSize: 13.5,
        color: '#64748B',
        fontWeight: '600',
    },
    errorText: {
        marginTop: 8,
        fontSize: 13,
        color: '#DC2626',
        textAlign: 'center',
        fontWeight: '600',
    },
    retryBtn: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#166534',
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 12,
    },
    emptySub: {
        fontSize: 12.5,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 16,
        lineHeight: 18,
    },
    addBtnLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#166534',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    addBtnLargeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* 🛡 Centered Modals matching Images 1 and 3 with backdrop */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 14,
    },
    modalDialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        width: '100%',
        maxWidth: 342,
        maxHeight: '94%',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        flexShrink: 0,
    },
    modalTitle: {
        fontSize: 16.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    modalScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    modalScrollContent: {
        paddingBottom: 4,
    },
    formLabel: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 3,
        marginTop: 5,
    },
    formInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 9,
        paddingHorizontal: 10,
        height: 36,
        fontSize: 12,
        color: '#0F172A',
        marginBottom: 0,
    },
    formRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 0,
        marginBottom: 1,
    },

    /* Image Picker Box matching Image 1 & 3 */
    imgPickerBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    imgThumbCol: {
        flexShrink: 0,
    },
    imgThumbWrap: {
        width: 52,
        height: 52,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imgThumb: {
        width: 48,
        height: 48,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    imgEmptyThumb: {
        width: 52,
        height: 52,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noImageText: {
        fontSize: 8.5,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 2,
    },
    removeImgBtn: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#DC2626',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    imgInputsCol: {
        flex: 1,
        gap: 5,
    },
    imgUrlInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        paddingHorizontal: 8,
        height: 30,
        fontSize: 11.5,
        color: '#0F172A',
    },
    uploadImgBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: '#E2E8F0',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        height: 28,
        paddingHorizontal: 8,
    },
    uploadImgBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },

    /* Category header row & Dropdown */
    catHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 3,
    },
    catHeaderLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addCatLink: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#166534',
    },
    manageCatLinkWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    manageCatLink: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#475569',
    },
    newCatInlineRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 4,
    },
    newCatInlineAddBtn: {
        backgroundColor: '#166534',
        borderRadius: 9,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newCatInlineAddBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    dropdownSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 9,
        paddingHorizontal: 10,
        height: 36,
        marginBottom: 0,
    },
    dropdownVal: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F172A',
    },
    dropdownMenu: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 9,
        marginTop: 2,
        marginBottom: 4,
        overflow: 'hidden',
    },
    dropdownMenuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dropdownMenuItemActive: {
        backgroundColor: '#F0FDF4',
    },
    dropdownMenuText: {
        fontSize: 12,
        color: '#334155',
        fontWeight: '600',
    },
    dropdownMenuTextActive: {
        color: '#166534',
        fontWeight: '800',
    },

    /* Modal Footer Buttons matching Image 1 & 3 */
    modalFooter: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
        flexShrink: 0,
    },
    modalCancelBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    modalSaveBtn: {
        flex: 1.2,
        backgroundColor: '#166534',
        borderRadius: 12,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSaveBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* Confirm Deletion Dialog matching Image 1 */
    confirmDialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 20,
        width: '100%',
        maxWidth: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    confirmTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    confirmDesc: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
        marginTop: 8,
        marginBottom: 18,
    },
    confirmBtnGroup: {
        flexDirection: 'row',
        gap: 10,
    },
    confirmCancelBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmCancelBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#334155',
    },
    confirmDeleteBtn: {
        flex: 1.2,
        backgroundColor: '#DC2626',
        borderRadius: 12,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmDeleteBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* Manage Supply Categories Modal matching Image 4 */
    catHeaderTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    catManagerAddRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        flexShrink: 0,
    },
    catManagerInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        fontSize: 13.5,
        color: '#0F172A',
    },
    catManagerAddBtn: {
        backgroundColor: '#166534',
        borderRadius: 12,
        paddingHorizontal: 18,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    catManagerAddBtnText: {
        color: '#FFFFFF',
        fontSize: 13.5,
        fontWeight: '700',
    },
    catManagerScroll: {
        flexGrow: 0,
        flexShrink: 1,
        maxHeight: 290,
    },
    catManagerScrollContent: {
        paddingVertical: 4,
    },
    catManageCard: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5,
        borderColor: '#86EFAC',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    catManageCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    catManageCardName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#14532D',
    },
    catRemoveBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    catRemoveBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#991B1B',
    },
    catManagerDoneBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        flexShrink: 0,
    },
    catManagerDoneBtnText: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#334155',
    },
});
