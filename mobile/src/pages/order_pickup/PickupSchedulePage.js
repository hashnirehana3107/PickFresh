import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    ActivityIndicator,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Clock,
    Plus,
    Trash2,
    Settings,
    Store,
    X,
    Check,
    AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export default function PickupSchedulePage({ onNavigate, storeName: initialStoreName, onBack }) {
    const { user } = useAuth();
    const currentStoreName =
        user?.shopName || user?.storeName || initialStoreName || user?.name || 'PickFresh Super • Main Counter';

    const [slots, setSlots] = useState([
        { id: 'slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', booked: 0, capacity: 10, status: '10 LEFT', isFull: false },
        { id: 'slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', booked: 0, capacity: 10, status: '10 LEFT', isFull: false },
        { id: 'slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', booked: 0, capacity: 10, status: '10 LEFT', isFull: false },
        { id: 'slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', booked: 0, capacity: 10, status: '10 LEFT', isFull: false },
    ]);

    const [activeModalSlot, setActiveModalSlot] = useState(null);
    const [editTime, setEditTime] = useState('');
    const [editCap, setEditCap] = useState('10');
    const [editBlocked, setEditBlocked] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newTime, setNewTime] = useState('6:00 PM');
    const [newCap, setNewCap] = useState('10');

    // In-App Delete Confirmation Modal State
    const [slotToDelete, setSlotToDelete] = useState(null);

    const getSlotId = (slot) => slot?.id || slot?._id || null;

    const fetchSchedule = async (store) => {
        const storeToFetch = store || currentStoreName;
        try {
            const res = await fetch(
                `${API_BASE_URL}/order-pickup/schedule?storeName=${encodeURIComponent(storeToFetch)}&_t=${Date.now()}`
            );
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.slots) && data.slots.length > 0) {
                setSlots(data.slots);
            }
        } catch (err) {
            console.warn('Schedule fetch error:', err.message);
        }
    };

    useEffect(() => {
        fetchSchedule(currentStoreName);
        const pollTimer = setInterval(() => {
            fetchSchedule(currentStoreName);
        }, 5000);
        return () => clearInterval(pollTimer);
    }, [currentStoreName]);

    const handleOpenEditModal = (slot) => {
        setActiveModalSlot(slot);
        setEditTime(slot.time || '4:00 PM');
        setEditCap(String(slot.capacity || 10));
        setEditBlocked(Boolean(slot.isBlocked));
    };

    const handleSaveSlotEdit = async () => {
        if (!activeModalSlot) return;
        const targetSlotId = getSlotId(activeModalSlot);
        if (!targetSlotId) {
            setActiveModalSlot(null);
            return;
        }

        const updatedList = slots.map((s) => {
            if (getSlotId(s) === targetSlotId) {
                return {
                    ...s,
                    time: editTime || s.time,
                    capacity: parseInt(editCap, 10) || 10,
                    isBlocked: editBlocked,
                };
            }
            return s;
        });

        setSlots(updatedList);
        setActiveModalSlot(null);

        try {
            const res = await fetch(`${API_BASE_URL}/order-pickup/slots/capacity`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeName: currentStoreName,
                    slotId: targetSlotId,
                    time: editTime,
                    duration: `${editTime} - Next Slot`,
                    capacity: parseInt(editCap, 10) || 10,
                    isBlocked: editBlocked,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success && (data.updatedSlots || data.slots)) {
                setSlots(data.updatedSlots || data.slots);
            }
        } catch (err) {
            console.warn('Failed to update slot backend:', err);
        }
    };

    const handleRequestDelete = (slot) => {
        setSlotToDelete(slot);
    };

    const handleConfirmDeleteSlot = async () => {
        if (!slotToDelete) return;
        const targetSlotId = getSlotId(slotToDelete);
        if (!targetSlotId) {
            setSlotToDelete(null);
            return;
        }

        setSlotToDelete(null);
        setActiveModalSlot(null);

        const updatedList = slots.filter((s) => getSlotId(s) !== targetSlotId);
        setSlots(updatedList);

        try {
            const res = await fetch(`${API_BASE_URL}/order-pickup/slots/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeName: currentStoreName, slotId: targetSlotId }),
            });
            const data = await res.json();
            if (res.ok && data.success && (data.updatedSlots || data.slots)) {
                setSlots(data.updatedSlots || data.slots);
            }
        } catch (err) {
            console.warn('Failed to delete slot backend:', err);
        }
    };

    const handleAddNewSlot = async () => {
        if (!newTime) return;

        const generatedId = `slot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newSlotObj = {
            id: generatedId,
            time: newTime,
            duration: `${newTime} - Next Slot`,
            booked: 0,
            capacity: parseInt(newCap, 10) || 10,
            status: `${newCap} LEFT`,
            isFull: false,
            isBlocked: false,
        };

        const updatedList = [...slots, newSlotObj];
        setSlots(updatedList);
        setShowAddModal(false);

        try {
            const res = await fetch(`${API_BASE_URL}/order-pickup/slots/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeName: currentStoreName,
                    time: newTime,
                    duration: `${newTime} - Next Slot`,
                    capacity: parseInt(newCap, 10) || 10,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success && (data.updatedSlots || data.slots)) {
                setSlots(data.updatedSlots || data.slots);
            }
        } catch (err) {
            console.warn('Failed to add slot backend:', err);
        } finally {
            setNewTime('6:00 PM');
            setNewCap('10');
        }
    };

    const getTrafficBadge = (slot) => {
        if (slot.isBlocked) {
            return {
                text: 'Closed',
                bg: '#F1F5F9',
                color: '#64748B',
                border: '#CBD5E1',
                isBlocked: true,
            };
        }
        const booked = slot.booked || 0;
        const cap = slot.capacity || 10;
        const isFull = Boolean(
            slot.isFull ||
            slot.full ||
            (booked >= cap && cap > 0) ||
            (slot.remainingSlots !== undefined && slot.remainingSlots <= 0)
        );

        if (isFull) {
            return {
                text: 'Unavailable (Full)',
                bg: '#FEE2E2',
                color: '#B91C1C',
                border: '#FCA5A5',
                isFull: true,
            };
        }
        const fillRatio = booked / (cap || 1);
        if (fillRatio >= 0.7) {
            return {
                text: 'Peak Traffic',
                bg: '#FEF3C7',
                color: '#B45309',
                border: '#FCD34D',
            };
        }
        return {
            text: 'Low Traffic',
            bg: '#DCFCE7',
            color: '#166534',
            border: '#86EFAC',
        };
    };

    const handleBackToOrders = () => {
        if (onNavigate) {
            onNavigate('dashboard');
        } else if (onBack) {
            onBack();
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.mainScroll}
                contentContainerStyle={styles.mainScrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section matching React Web */}
                <View style={styles.titleRow}>
                    <View>
                        <Text style={styles.pageTitle}>Pickup schedule</Text>
                        <Text style={styles.subtitleText}>Manage capacity & busy times</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={handleBackToOrders}
                        activeOpacity={0.7}
                        accessibilityLabel="Back to orders"
                    >
                        <ArrowLeft size={22} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                {/* Store Context Badge Card */}
                <View style={styles.storeSelectorCard}>
                    <View style={styles.storeSelLeft}>
                        <Store size={18} color="#27672D" />
                        <Text style={styles.storeSelLabel}>Managing Store:</Text>
                    </View>
                    <View style={styles.storeSelBadge}>
                        <Text style={styles.storeSelBadgeName} numberOfLines={1}>
                            {currentStoreName}
                        </Text>
                    </View>
                </View>

                {/* Add Slot Action Header Bar */}
                <View style={styles.actionHeaderBar}>
                    <Text style={styles.slotsHeading}>Active Pickup Slots ({slots.length})</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setShowAddModal(true)}
                        activeOpacity={0.85}
                    >
                        <Plus size={14} color="#166534" />
                        <Text style={styles.addBtnText}>Add Slot</Text>
                    </TouchableOpacity>
                </View>

                {/* Time Slots Cards List */}
                <View style={styles.slotsList}>
                    {slots.map((slot) => {
                        const traffic = getTrafficBadge(slot);
                        const slotTimeLabel = slot.time || '4:00 PM';
                        const bookedCount = slot.booked || 0;
                        const capCount = slot.capacity || 10;
                        const fillPercent = Math.min(100, Math.round((bookedCount / capCount) * 100));
                        const currentId = getSlotId(slot) || `slot_fallback_${Math.random()}`;
                        const isSlotFull = Boolean(traffic.isFull || slot.isFull || slot.full || (bookedCount >= capCount && capCount > 0));

                        return (
                            <View
                                key={currentId}
                                style={[
                                    styles.slotCardItem,
                                    isSlotFull && styles.slotCardItemFull,
                                    slot.isBlocked && styles.slotCardItemBlocked,
                                ]}
                            >
                                <View style={styles.slotCardLeft}>
                                    <View
                                        style={[
                                            styles.slotClockIconWrapper,
                                            isSlotFull && styles.slotClockIconWrapperFull,
                                            slot.isBlocked && styles.slotClockIconWrapperBlocked,
                                        ]}
                                    >
                                        <Clock
                                            size={18}
                                            color={isSlotFull ? '#DC2626' : (slot.isBlocked ? '#64748B' : '#166534')}
                                        />
                                    </View>
                                    <View style={styles.slotDetailsColumn}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={[styles.slotTimeTitle, isSlotFull && styles.slotTimeTitleFull]}>
                                                {slotTimeLabel}
                                            </Text>
                                            {isSlotFull && (
                                                <View style={styles.unavailablePill}>
                                                    <Text style={styles.unavailablePillText}>Unavailable</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.slotBookingsSub}>
                                            <Text style={[styles.boldText, isSlotFull && { color: '#DC2626' }]}>
                                                {bookedCount}
                                            </Text> / {capCount} bookings {isSlotFull ? '(Capacity Full)' : ''}
                                        </Text>

                                        {/* Progress Fill Line */}
                                        <View style={[styles.slotProgressBarBg, isSlotFull && { backgroundColor: '#FECACA' }]}>
                                            <View
                                                style={[
                                                    styles.slotProgressBarFill,
                                                    {
                                                        width: `${fillPercent}%`,
                                                        backgroundColor:
                                                            isSlotFull || fillPercent >= 100
                                                                ? '#EF4444'
                                                                : fillPercent >= 70
                                                                ? '#F59E0B'
                                                                : '#10B981',
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.slotCardRight}>
                                    <View
                                        style={[
                                            styles.trafficBadge,
                                            {
                                                backgroundColor: traffic.bg,
                                                borderColor: traffic.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.trafficBadgeText, { color: traffic.color }]}>
                                            {traffic.text}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.slotEditSettingsBtn}
                                        onPress={() => handleOpenEditModal(slot)}
                                        activeOpacity={0.8}
                                    >
                                        <Settings size={13} color="#475569" />
                                        <Text style={styles.slotEditText}>Edit</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Bottom Back Button */}
                <View style={styles.bottomActionGroup}>
                    <TouchableOpacity
                        style={styles.backOrdersBtn}
                        onPress={handleBackToOrders}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.backOrdersBtnText}>Back to Orders</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* EDIT SLOT MODAL DIALOG matching React Web */}
            <Modal
                visible={Boolean(activeModalSlot && !slotToDelete)}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Pickup Time Slot</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setActiveModalSlot(null)}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Time Slot Label (e.g. 4:00 PM):</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editTime}
                                    onChangeText={setEditTime}
                                    placeholder="e.g. 4:30 PM"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Maximum Capacity Limit (Orders):</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editCap}
                                    onChangeText={setEditCap}
                                    placeholder="e.g. 10"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => setEditBlocked(!editBlocked)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkboxBox, editBlocked && styles.checkboxBoxActive]}>
                                    {editBlocked ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                                </View>
                                <Text style={styles.checkboxLabel}>Temporarily Close/Block this slot</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleRequestDelete(activeModalSlot)}
                                activeOpacity={0.85}
                            >
                                <Trash2 size={16} color="#DC2626" />
                                <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>

                            <View style={styles.rightBtnsRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setActiveModalSlot(null)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.saveBtn}
                                    onPress={handleSaveSlotEdit}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* CUSTOM IN-APP DELETE CONFIRMATION MODAL */}
            <Modal visible={Boolean(slotToDelete)} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, styles.deleteConfirmCard]}>
                        <View style={styles.deleteIconWrapper}>
                            <AlertTriangle size={32} color="#DC2626" />
                        </View>
                        <Text style={styles.deleteConfirmTitle}>Delete Time Slot?</Text>
                        <Text style={styles.deleteConfirmMsg}>
                            Are you sure you want to delete the{' '}
                            <Text style={styles.boldText}>{slotToDelete?.time || 'selected'}</Text> pickup
                            slot? This action cannot be undone.
                        </Text>
                        <View style={styles.deleteConfirmActions}>
                            <TouchableOpacity
                                style={styles.deleteConfirmCancelBtn}
                                onPress={() => setSlotToDelete(null)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteConfirmYesBtn}
                                onPress={handleConfirmDeleteSlot}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.deleteConfirmYesText}>Delete Slot</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ADD SLOT MODAL DIALOG matching React Web */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Pickup Slot</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowAddModal(false)}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Slot Pickup Time (e.g. 6:00 PM):</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newTime}
                                    onChangeText={setNewTime}
                                    placeholder="e.g. 6:30 PM"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Max Order Capacity:</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newCap}
                                    onChangeText={setNewCap}
                                    placeholder="10"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.modalFooterSingle}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setShowAddModal(false)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleAddNewSlot}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.saveBtnText}>Add Slot</Text>
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
    mainScroll: {
        flex: 1,
    },
    mainScrollContent: {
        padding: 18,
        paddingBottom: 36,
        gap: 16,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    subtitleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
    },
    backBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeSelectorCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 1,
    },
    storeSelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    storeSelLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    storeSelBadge: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        maxWidth: 180,
    },
    storeSelBadgeName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    actionHeaderBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    slotsHeading: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    addBtn: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    addBtnText: {
        color: '#166534',
        fontSize: 13,
        fontWeight: '700',
    },
    slotsList: {
        gap: 12,
    },
    slotCardItem: {
        backgroundColor: '#E8F8EE',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#C8EEDB',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    slotCardItemFull: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    slotCardItemBlocked: {
        backgroundColor: '#F8FAFC',
        borderColor: '#CBD5E1',
        opacity: 0.8,
    },
    slotCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    slotClockIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    slotClockIconWrapperFull: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FECACA',
    },
    slotClockIconWrapperBlocked: {
        backgroundColor: '#F1F5F9',
        borderColor: '#E2E8F0',
    },
    slotDetailsColumn: {
        flex: 1,
        gap: 4,
    },
    slotTimeTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    slotTimeTitleFull: {
        color: '#991B1B',
    },
    unavailablePill: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    unavailablePillText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#DC2626',
        textTransform: 'uppercase',
        letterSpacing: 0.2,
    },
    slotBookingsSub: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
    },
    boldText: {
        fontWeight: '800',
        color: '#1E293B',
    },
    slotProgressBarBg: {
        height: 3,
        backgroundColor: '#C8EEDB',
        borderRadius: 3,
        overflow: 'hidden',
        width: '90%',
        marginTop: 2,
    },
    slotProgressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    slotCardRight: {
        alignItems: 'flex-end',
        gap: 8,
    },
    trafficBadge: {
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    trafficBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
    },
    slotEditSettingsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    slotEditText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    bottomActionGroup: {
        marginTop: 8,
    },
    backOrdersBtn: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#166534',
        borderRadius: 22,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backOrdersBtnText: {
        color: '#166534',
        fontSize: 15,
        fontWeight: '700',
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 20,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)' } : {}),
    },
    modalCard: {
        width: '100%',
        maxWidth: 335,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
        gap: 14,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 12,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalBody: {
        gap: 14,
    },
    fieldGroup: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1E293B',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
    checkboxBox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxBoxActive: {
        backgroundColor: '#27672D',
        borderColor: '#27672D',
    },
    checkboxLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
        gap: 6,
    },
    modalFooterSingle: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    deleteBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DC2626',
    },
    rightBtnsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
    },
    cancelBtn: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    cancelBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    saveBtn: {
        backgroundColor: '#27672D',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    saveBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Delete Confirmation
    deleteConfirmCard: {
        alignItems: 'center',
        textAlign: 'center',
        padding: 24,
    },
    deleteIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    deleteConfirmTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    deleteConfirmMsg: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 19,
        marginVertical: 8,
    },
    deleteConfirmActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 8,
    },
    deleteConfirmCancelBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: 'center',
    },
    deleteConfirmCancelText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    deleteConfirmYesBtn: {
        flex: 1,
        backgroundColor: '#DC2626',
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: 'center',
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 2,
    },
    deleteConfirmYesText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
