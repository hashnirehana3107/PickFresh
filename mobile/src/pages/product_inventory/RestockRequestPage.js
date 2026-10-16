import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Image,
    Modal,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Check,
    Send,
    AlertTriangle,
    Package,
    Calendar,
    Minus,
    Plus,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const formatStockUnit = (unit) => {
    if (!unit) return 'pack';
    const clean = String(unit).trim();
    const stripped = clean.replace(/^1\s*/, '').trim();
    return stripped || clean;
};

export default function RestockRequestPage({ onNavigate, initialData }) {
    const { user } = useAuth();

    // Support either single item or array of items
    const items = initialData?.items || (initialData?.item ? [initialData.item] : [
        { id: '1', name: 'Fresh Milk 1L', currentStock: 3, threshold: 10, image: '', unit: 'pack' },
        { id: '2', name: 'Anchor Butter 200g', currentStock: 2, threshold: 8, image: '', unit: 'pack' },
    ]);

    const initialQuantities = items.reduce((acc, item) => {
        acc[item.id || item.name] = item.threshold ? item.threshold * 2 : 20;
        return acc;
    }, {});

    const [reorderQuantities, setReorderQuantities] = useState(initialQuantities);
    const [suppliersFullList, setSuppliersFullList] = useState([]);
    const [suppliersList, setSuppliersList] = useState([]);
    const [supplier, setSupplier] = useState(initialData?.supplierName || initialData?.supplier?.name || '');
    const [supplierEmail, setSupplierEmail] = useState(initialData?.supplier?.email || '');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowFormatted = `${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${String(tomorrow.getDate()).padStart(2, '0')}/${tomorrow.getFullYear()}`;
    const [deliveryDate, setDeliveryDate] = useState(tomorrowFormatted);

    // Interactive Calendar Modal State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [viewMonth, setViewMonth] = useState(tomorrow.getMonth());
    const [viewYear, setViewYear] = useState(tomorrow.getFullYear());
    const [selectedDate, setSelectedDate] = useState(tomorrow);

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const parseDateString = (str) => {
        if (!str) return new Date();
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                const m = parseInt(parts[0], 10) - 1;
                const d = parseInt(parts[1], 10);
                const y = parseInt(parts[2], 10);
                const parsed = new Date(y, m, d);
                if (!isNaN(parsed.getTime())) return parsed;
            }
        } else if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const parsed = new Date(y, m, d);
                if (!isNaN(parsed.getTime())) return parsed;
            }
        }
        return new Date();
    };

    const formatDateToString = (d) => {
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const openCalendarModal = () => {
        const current = parseDateString(deliveryDate);
        setSelectedDate(current);
        setViewMonth(current.getMonth());
        setViewYear(current.getFullYear());
        setShowDatePicker(true);
    };

    const handleSelectDay = (dayNum) => {
        const picked = new Date(viewYear, viewMonth, dayNum);
        setSelectedDate(picked);
        setDeliveryDate(formatDateToString(picked));
    };

    const handleConfirmDate = () => {
        if (selectedDate) {
            setDeliveryDate(formatDateToString(selectedDate));
        }
        setShowDatePicker(false);
    };

    const handleQuickPreset = (daysToAdd) => {
        const base = new Date();
        base.setDate(base.getDate() + daysToAdd);
        setSelectedDate(base);
        setViewMonth(base.getMonth());
        setViewYear(base.getFullYear());
        setDeliveryDate(formatDateToString(base));
        setShowDatePicker(false);
    };

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((y) => y - 1);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((y) => y + 1);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

    const isToday = (day) => {
        const now = new Date();
        return now.getDate() === day && now.getMonth() === viewMonth && now.getFullYear() === viewYear;
    };

    const isSelected = (day) => {
        if (!selectedDate) return false;
        return selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear;
    };

    const isPast = (day) => {
        const dayDate = new Date(viewYear, viewMonth, day);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return dayDate < todayStart;
    };

    const [isSent, setIsSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [supplierCatalog, setSupplierCatalog] = useState([]);

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const storeEmail = user?.email || '';
                const emailParam = storeEmail ? `?storeEmail=${encodeURIComponent(storeEmail)}&onlyLinked=true` : '?onlyLinked=true';
                const res = await fetch(`${API_BASE_URL}/product-inventory/suppliers${emailParam}`);
                const data = await res.json();
                if (data.success && Array.isArray(data.suppliers)) {
                    const linkedSuppliers = data.suppliers.filter((s) => s.isLinkedToCurrentStore !== false);
                    if (linkedSuppliers.length > 0) {
                        setSuppliersFullList(linkedSuppliers);
                        const names = linkedSuppliers.map((s) => s.name);
                        setSuppliersList(names);

                        if (!initialData?.supplierName && !initialData?.supplier?.name) {
                            const firstItem = items[0];
                            const matched = linkedSuppliers.find((s) =>
                                s.suppliedProducts && s.suppliedProducts.some((p) => p.toLowerCase().includes(firstItem.name.toLowerCase()))
                            );
                            const selected = matched || linkedSuppliers[0];
                            setSupplier(selected.name);
                            setSupplierEmail(selected.email || '');
                        } else {
                            const foundSupplierStr = initialData?.supplierName || initialData?.supplier?.name;
                            const matched = linkedSuppliers.find((s) => s.name === foundSupplierStr);
                            if (matched) setSupplierEmail(matched.email || '');
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to load suppliers:', err);
            }
        };

        if (items.length > 0) {
            fetchSuppliers();
        }
    }, [items, initialData]);

    useEffect(() => {
        if (supplier) {
            fetch(`http://localhost:5000/api/supplier-replenishment/catalog?supplierName=${encodeURIComponent(supplier)}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && Array.isArray(data.products)) {
                        setSupplierCatalog(data.products);
                    }
                })
                .catch((err) => console.warn('Failed to fetch supplier catalog:', err));
        }
    }, [supplier]);

    const handleSupplierChange = (selectedName) => {
        setSupplier(selectedName);
        const found = suppliersFullList.find((s) => s.name === selectedName);
        setSupplierEmail(found?.email || '');
        setIsSupplierDropdownOpen(false);
    };

    const handleQtyChange = (itemId, delta) => {
        setReorderQuantities((prev) => {
            const current = prev[itemId] || 1;
            const updated = Math.max(1, current + delta);
            return { ...prev, [itemId]: updated };
        });
    };

    const handleQtyInput = (itemId, val) => {
        const num = parseInt(val, 10);
        setReorderQuantities((prev) => ({
            ...prev,
            [itemId]: isNaN(num) || num < 1 ? 1 : num,
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const restockItems = items.map((item) => {
            const key = item.id || item._id || item.name;
            const chosenQty = Number(
                reorderQuantities[key] !== undefined
                    ? reorderQuantities[key]
                    : (reorderQuantities[item.name] !== undefined
                        ? reorderQuantities[item.name]
                        : (reorderQuantities[item.id] !== undefined
                            ? reorderQuantities[item.id]
                            : (item.threshold ? item.threshold * 2 : 20)))
            ) || 20;

            const catalogMatch = supplierCatalog.find(
                (c) => (c.name || '').toLowerCase() === (item.name || '').toLowerCase()
            );
            const itemPrice = Number(
                catalogMatch?.wholesalePrice || catalogMatch?.price || item.wholesalePrice || item.costPrice || item.price || 0
            );

            return {
                id: item.id || item._id,
                _id: item.id || item._id,
                name: item.name,
                produce: item.name,
                qty: chosenQty,
                quantity: chosenQty,
                unit: item.unit || 'pack',
                currentStock: item.currentStock !== undefined ? item.currentStock : 0,
                threshold: item.threshold || 10,
                image: item.image || item.imageUrl || catalogMatch?.image || '',
                imageUrl: item.image || item.imageUrl || catalogMatch?.image || '',
                wholesalePrice: itemPrice,
                wholesaleRate: itemPrice,
                price: itemPrice,
                subtotal: chosenQty * (itemPrice || 150)
            };
        });

        const totalEstimate = restockItems.reduce((acc, it) => acc + (it.subtotal || 0), 0);

        const poPayload = {
            supplierName: supplier,
            supplierEmail,
            storeName: user?.shopName || user?.storeName || user?.name || 'Lanka Mart',
            storeEmail: user?.email || '',
            deliveryDate,
            status: 'Pending',
            items: restockItems,
            totalEstimate,
            notes: 'Combined replenishment purchase order from inventory dashboard.',
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        try {
            await fetch(`${API_BASE_URL}/product-inventory/restock-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(poPayload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
        } catch (err) {
            console.warn('Restock PO save notice:', err.message || err);
        } finally {
            clearTimeout(timeoutId);
            setIsSubmitting(false);
            setIsSent(true);
            if (initialData?.onRequestSent) initialData.onRequestSent();
            setTimeout(() => {
                if (onNavigate) onNavigate('low_stock');
            }, 1200);
        }
    };

    const handleBackToLowStock = () => {
        if (onNavigate) onNavigate('low_stock');
    };

    return (
        <View style={styles.container}>
            {/* 🔝 Top Navigation Bar — උඩ කොටස */}
            <View style={styles.topNavBar}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.pageTitle}>Restock Request</Text>
                    <Text style={styles.subTitle}>Combined Purchase Order</Text>
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleBackToLowStock}
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
            </View>

            {/* 📜 Scrollable Content Area — details විතරක් scroll වෙනවා */}
            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Success Banner */}
            {isSent && (
                <View style={styles.successBanner}>
                    <Check size={18} color="#27672D" />
                    <Text style={styles.successText}>
                        Replenishment request sent to {supplier}! Redirecting...
                    </Text>
                </View>
            )}

            {/* Global Info Box */}
            <View style={styles.globalInfoCard}>
                {/* Supplier selection */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Supplier</Text>
                    <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.selectBtnText}>{supplier || 'Select Supplier'}</Text>
                        <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>

                    {isSupplierDropdownOpen && (
                        <View style={styles.dropdownMenu}>
                            {suppliersList.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.dropdownItem, supplier === s && styles.dropdownItemActive]}
                                    onPress={() => handleSupplierChange(s)}
                                >
                                    <Text style={[styles.dropdownItemText, supplier === s && styles.dropdownItemTextActive]}>
                                        {s}
                                    </Text>
                                    {supplier === s && <Check size={16} color="#166534" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Required Delivery Date */}
                <View style={[styles.fieldGroup, { marginTop: 12 }]}>
                    <Text style={styles.label}>Required Delivery Date</Text>
                    <View style={styles.dateInputRow}>
                        <TextInput
                            style={styles.dateInput}
                            value={deliveryDate}
                            onChangeText={setDeliveryDate}
                            placeholder="MM/DD/YYYY"
                            placeholderTextColor="#94A3B8"
                        />
                        <TouchableOpacity
                            style={styles.calendarIconBtn}
                            onPress={openCalendarModal}
                            activeOpacity={0.7}
                            accessibilityLabel="Select Delivery Date"
                        >
                            <Calendar size={18} color="#166534" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Products to Reorder List */}
            <View style={{ marginBottom: 24 }}>
                <Text style={styles.sectionHeaderTitle}>
                    Products to Reorder ({items.length})
                </Text>

                <View style={styles.productsList}>
                    {items.map((item) => {
                        const itemId = item.id || item.name;
                        const qty = reorderQuantities[itemId] || 1;
                        const catalogMatch = supplierCatalog.find(
                            (c) => (c.name || '').toLowerCase() === (item.name || '').toLowerCase()
                        );
                        const itemImage = catalogMatch?.image || item.image || item.imageUrl;

                        return (
                            <View key={itemId} style={styles.productCard}>
                                {/* Row 1: Image + Product Name */}
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.productAvatarBox}>
                                        {itemImage ? (
                                            <Image source={{ uri: itemImage }} style={styles.productAvatarImg} />
                                        ) : (
                                            <Package size={22} color="#D97706" />
                                        )}
                                    </View>
                                    <Text style={styles.productCardTitle}>{item.name}</Text>
                                </View>

                                {/* Row 2: Low stock badge + Qty Stepper */}
                                <View style={styles.cardFooterRow}>
                                    <View style={styles.badgeInfoRow}>
                                        <View style={styles.lowStockBadge}>
                                            <AlertTriangle size={11} color="#D97706" />
                                            <Text style={styles.lowStockBadgeText}>LOW STOCK</Text>
                                        </View>
                                        <Text style={styles.stockInfoText}>
                                            {item.currentStock !== undefined ? item.currentStock : 0} {formatStockUnit(item.unit)} left · min {item.threshold || 10}
                                        </Text>
                                    </View>

                                    <View style={styles.stepperContainer}>
                                        <Text style={styles.stepperLabel}>REORDER QTY</Text>
                                        <View style={styles.stepperRow}>
                                            <TouchableOpacity
                                                style={styles.stepperBtn}
                                                onPress={() => handleQtyChange(itemId, -1)}
                                                activeOpacity={0.7}
                                            >
                                                <Minus size={13} color="#EA580C" />
                                            </TouchableOpacity>
                                            <TextInput
                                                style={styles.stepperInput}
                                                keyboardType="numeric"
                                                value={String(qty)}
                                                onChangeText={(txt) => handleQtyInput(itemId, txt)}
                                            />
                                            <TouchableOpacity
                                                style={styles.stepperBtn}
                                                onPress={() => handleQtyChange(itemId, 1)}
                                                activeOpacity={0.7}
                                            >
                                                <Plus size={13} color="#EA580C" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            </ScrollView>

            {/* 🔒 Fixed Bottom Action Bar with Scrollable Content */}
            <View style={styles.fixedBottomActionBar}>
                <TouchableOpacity
                    style={[
                        styles.sendOrderBtn,
                        isSent && { backgroundColor: '#16A34A' },
                        isSubmitting && { opacity: 0.85 }
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || isSent}
                    activeOpacity={0.85}
                >
                    {isSent ? (
                        <View style={styles.btnRow}>
                            <Check size={18} color="#FFFFFF" />
                            <Text style={styles.sendOrderBtnText}>Request Sent Successfully!</Text>
                        </View>
                    ) : isSubmitting ? (
                        <View style={styles.btnRow}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.sendOrderBtnText}>Sending Request...</Text>
                        </View>
                    ) : (
                        <View style={styles.btnRow}>
                            <Send size={16} color="#FFFFFF" />
                            <Text style={styles.sendOrderBtnText}>Send combined replenishment request</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleBackToLowStock}
                    disabled={isSubmitting || isSent}
                    activeOpacity={0.8}
                >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            {/* Interactive Calendar Modal */}
            <Modal
                visible={showDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <View style={styles.calOverlay}>
                    <View style={styles.calCard}>
                        {/* Header */}
                        <View style={styles.calHeaderRow}>
                            <View style={styles.calHeaderTitleBox}>
                                <View style={styles.calIconPill}>
                                    <Calendar size={16} color="#166534" />
                                </View>
                                <Text style={styles.calHeaderTitle}>Delivery Date</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowDatePicker(false)}
                                style={styles.calCloseBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Quick Presets */}
                        <View style={styles.presetRow}>
                            <TouchableOpacity
                                style={styles.presetChip}
                                onPress={() => handleQuickPreset(0)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.presetChipText}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.presetChip, styles.presetChipActive]}
                                onPress={() => handleQuickPreset(1)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.presetChipText, styles.presetChipTextActive]}>Tomorrow</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.presetChip}
                                onPress={() => handleQuickPreset(3)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.presetChipText}>In 3 Days</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.presetChip}
                                onPress={() => handleQuickPreset(7)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.presetChipText}>Next Week</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Month Navigation */}
                        <View style={styles.calNavRow}>
                            <TouchableOpacity
                                onPress={handlePrevMonth}
                                style={styles.calNavBtn}
                                activeOpacity={0.7}
                            >
                                <ChevronLeft size={18} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.calMonthText}>
                                {MONTH_NAMES[viewMonth]} {viewYear}
                            </Text>
                            <TouchableOpacity
                                onPress={handleNextMonth}
                                style={styles.calNavBtn}
                                activeOpacity={0.7}
                            >
                                <ChevronRight size={18} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        {/* Days of Week Header */}
                        <View style={styles.calWeekRow}>
                            {DAYS_OF_WEEK.map((d, idx) => (
                                <Text key={idx} style={styles.calWeekDayText}>
                                    {d}
                                </Text>
                            ))}
                        </View>

                        {/* Days Grid */}
                        <View style={styles.calGrid}>
                            {Array.from({ length: firstDayIndex }).map((_, i) => (
                                <View key={`empty-${i}`} style={styles.calDayCell} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const dayNum = i + 1;
                                const selected = isSelected(dayNum);
                                const todayCell = isToday(dayNum);
                                const past = isPast(dayNum);

                                return (
                                    <TouchableOpacity
                                        key={`day-${dayNum}`}
                                        style={[
                                            styles.calDayCell,
                                            selected && styles.calDayCellSelected,
                                            todayCell && !selected && styles.calDayCellToday,
                                        ]}
                                        disabled={past}
                                        onPress={() => handleSelectDay(dayNum)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[
                                                styles.calDayText,
                                                past && styles.calDayTextDisabled,
                                                selected && styles.calDayTextSelected,
                                                todayCell && !selected && styles.calDayTextToday,
                                            ]}
                                        >
                                            {dayNum}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Selected Preview & Confirm */}
                        <View style={styles.calFooter}>
                            <View style={styles.calSelectedBadge}>
                                <Text style={styles.calSelectedLabel}>Selected:</Text>
                                <Text style={styles.calSelectedVal}>
                                    {selectedDate ? formatDateToString(selectedDate) : deliveryDate}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.calConfirmBtn}
                                onPress={handleConfirmDate}
                                activeOpacity={0.8}
                            >
                                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                                <Text style={styles.calConfirmBtnText}>Apply Date</Text>
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
    topNavBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 14,
        backgroundColor: '#FAFBF8',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        zIndex: 10,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 18,
        paddingBottom: 24,
    },
    fixedBottomActionBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
        elevation: 6,
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
    subTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
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
        marginBottom: 16,
    },
    successText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#27672D',
        flex: 1,
    },
    globalInfoCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
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
        maxHeight: 200,
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
    dateInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 14,
    },
    dateInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
    },
    calendarIconBtn: {
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 8,
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } : {}),
    },
    calCard: {
        width: '100%',
        maxWidth: 335,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 10,
    },
    calHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    calHeaderTitleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    calIconPill: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    calHeaderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    calCloseBtn: {
        padding: 4,
    },
    presetRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
    },
    presetChip: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetChipActive: {
        backgroundColor: '#DCFCE7',
    },
    presetChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    presetChipTextActive: {
        color: '#166534',
    },
    calNavRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        marginBottom: 8,
    },
    calNavBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
    },
    calMonthText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    calWeekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 6,
    },
    calWeekDayText: {
        width: 36,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
    },
    calGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    calDayCell: {
        width: `${100 / 7}%`,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 19,
        marginVertical: 2,
    },
    calDayCellSelected: {
        backgroundColor: '#166534',
    },
    calDayCellToday: {
        borderWidth: 1.5,
        borderColor: '#166534',
    },
    calDayText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
    },
    calDayTextSelected: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    calDayTextToday: {
        color: '#166534',
        fontWeight: '800',
    },
    calDayTextDisabled: {
        color: '#CBD5E1',
    },
    calFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 10,
    },
    calSelectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    calSelectedLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    calSelectedVal: {
        fontSize: 13,
        color: '#166534',
        fontWeight: '800',
    },
    calConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#166534',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    calConfirmBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    sectionHeaderTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    productsList: {
        flexDirection: 'column',
        gap: 12,
    },
    productCard: {
        backgroundColor: '#FFFFFF',
        padding: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    productAvatarBox: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    productAvatarImg: {
        width: '100%',
        height: '100%',
    },
    productCardTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
    },
    cardFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    badgeInfoRow: {
        flex: 1,
        flexDirection: 'column',
        gap: 4,
    },
    lowStockBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    lowStockBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#B45309',
    },
    stockInfoText: {
        fontSize: 12.5,
        color: '#64748B',
        fontWeight: '600',
    },
    stepperContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    stepperLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 2,
    },
    stepperBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    stepperInput: {
        width: 36,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        paddingVertical: 2,
    },
    actionsStack: {
        flexDirection: 'column',
        gap: 12,
        marginTop: 8,
        marginBottom: 20,
    },
    sendOrderBtn: {
        width: '100%',
        backgroundColor: '#F97316',
        paddingVertical: 15,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    sendOrderBtnText: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cancelBtn: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F97316',
        paddingVertical: 14,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#F97316',
    },
});
