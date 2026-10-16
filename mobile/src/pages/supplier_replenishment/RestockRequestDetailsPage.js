import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Modal,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Check,
    AlertCircle,
    Truck,
    Trash2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export default function RestockRequestDetailsScreen({ onNavigate, onBack, po }) {
    const { user } = useAuth();
    const [statusMessage, setStatusMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const reqData = po || {
        id: 'SR-208',
        store: 'Lanka Mart',
        storeName: 'Lanka Mart',
        supplierName: 'ABC Distributors',
        product: 'Coca-Cola 1.5L',
        unitsLeft: 4,
        threshold: 10,
        reorderUnits: 20,
        deliveryTarget: 'Tomorrow 10.30 AM',
    };

    const [status, setStatus] = useState(reqData.status || 'Pending');

    useEffect(() => {
        if (po && po.status) {
            setStatus(po.status);
        }
        const targetId = reqData._id || reqData.id || reqData.poId;
        if (targetId) {
            fetch(`${API_BASE_URL}/supplier-replenishment/requests/${targetId}`)
                .then((res) => res.json())
                .then((data) => {
                    const fetchedPo = data.po || data.request;
                    if (data.success && fetchedPo && fetchedPo.status) {
                        setStatus(fetchedPo.status);
                    }
                })
                .catch((err) => console.warn('Status fetch error:', err.message));
        }
    }, [po, reqData]);

    const poIdDisplay = reqData.id || reqData.poId || reqData._id || 'SR-208';
    const cleanPo = poIdDisplay.startsWith('#') ? poIdDisplay : `#${poIdDisplay}`;
    const storeDisplayName = reqData.store || reqData.storeName || 'Lanka Mart';
    const supplierDisplayName = reqData.supplierName || reqData.supplier || user?.supplierName || user?.name || 'Wholesale Supplier';
    const unitsLeftDisplay = reqData.unitsLeft !== undefined ? reqData.unitsLeft : 4;
    const thresholdDisplay = reqData.threshold || 10;
    const reorderQtyDisplay = reqData.reorderUnits ? `${reqData.reorderUnits} Units` : (reqData.reorderQty || '20 Units');
    const rawDeliveryDate = reqData.deliveryTarget || reqData.deliveryDate;
    let deliveryDateDisplay = 'Tomorrow 10.30 AM';
    if (rawDeliveryDate) {
        if (/^\d{4}-\d{2}-\d{2}/.test(rawDeliveryDate)) {
            const d = new Date(rawDeliveryDate);
            if (!isNaN(d.getTime())) {
                deliveryDateDisplay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } else {
                deliveryDateDisplay = rawDeliveryDate;
            }
        } else {
            deliveryDateDisplay = rawDeliveryDate;
        }
    }

    const [supplierCatalog, setSupplierCatalog] = useState([]);

    useEffect(() => {
        if (supplierDisplayName) {
            fetch(`${API_BASE_URL}/supplier-replenishment/catalog?supplierName=${encodeURIComponent(supplierDisplayName)}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && Array.isArray(data.products)) {
                        setSupplierCatalog(data.products);
                    }
                })
                .catch((err) => console.warn('Catalog fetch error:', err.message));
        }
    }, [supplierDisplayName]);

    const updateStatus = async (newStatus) => {
        setIsUpdating(true);
        try {
            const targetId = reqData._id || reqData.id || reqData.poId;
            if (targetId) {
                await fetch(`${API_BASE_URL}/supplier-replenishment/requests/${targetId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });
            }
            setStatus(newStatus);
            setStatusMessage(
                ['Accepted', 'Confirmed', 'In Transit', 'Dispatched', 'Packed'].includes(newStatus)
                    ? 'Order Confirmed! Shipment scheduled.'
                    : 'Request Declined.'
            );
        } catch (err) {
            console.error('Failed to update status:', err);
            setStatus(newStatus);
            setStatusMessage(`Status updated to ${newStatus}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAccept = () => {
        updateStatus('Confirmed');
    };

    const handleDecline = () => {
        updateStatus('Rejected');
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (onNavigate) {
            onNavigate('requests');
        }
    };

    const itemsArray = (Array.isArray(reqData.items) && reqData.items.length > 0)
        ? reqData.items
        : [
            {
                name: 'Anchor Butter Salted 100g',
                produce: 'Anchor Butter Salted 100g',
                qty: 20,
                unit: 'pack',
                currentStock: 4,
                minOrder: 10,
            },
            {
                name: 'Munchee Super Cream Cracker',
                produce: 'Munchee Super Cream Cracker',
                qty: 20,
                unit: 'pack',
                currentStock: 6,
                minOrder: 10,
            },
        ];

    const statusLower = (status || '').toString().toLowerCase().trim();
    const isDeliveredState = ['delivered', 'completed', 'fulfilled'].includes(statusLower);
    const isActiveState = ['accepted', 'confirmed', 'packed', 'dispatched', 'in transit', 'approved'].includes(statusLower);
    const isDeclinedState = ['rejected', 'declined'].includes(statusLower);

    return (
        <View style={styles.container}>
            {/* 🔝 Top Fixed Header Section */}
            <View style={styles.headerSection}>
                <View style={styles.titleRow}>
                    <Text style={styles.pageTitle}>
                        Restock Request Details{'\n'}({cleanPo})
                    </Text>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={handleBack}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={18} color="#1E293B" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 📜 Scrollable Content Area */}
            <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {statusMessage ? (
                    <View style={styles.successBanner}>
                        <Check size={18} color="#15803D" />
                        <Text style={styles.successBannerText}>{statusMessage}</Text>
                    </View>
                ) : null}

                {/* General Request Overview Table Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Store Name:</Text>
                        <Text style={styles.infoValBold}>{storeDisplayName}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Supplier:</Text>
                        <Text style={styles.infoValBold}>{supplierDisplayName}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Suggested Reorder Quantity:</Text>
                        <Text style={styles.infoValGreen}>{reorderQtyDisplay}</Text>
                    </View>

                    <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.infoLabel}>Required Delivery Date:</Text>
                        <Text style={styles.infoValBold}>{deliveryDateDisplay}</Text>
                    </View>
                </View>

                {/* Products to Reorder Breakdown List */}
                <Text style={styles.sectionTitle}>
                    Products to Reorder ({itemsArray.length})
                </Text>

                <View style={styles.productsList}>
                    {itemsArray.map((item, index) => {
                        const name = item.produce || item.name || `Product #${index + 1}`;
                        const qty = item.qty || 1;
                        const unit = item.unit || 'pack';
                        const currentStock = item.currentStock !== undefined ? item.currentStock : (unitsLeftDisplay || 4);
                        const minOrder = item.minOrder || (thresholdDisplay || 5);

                        const catalogMatch = supplierCatalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
                        const itemImage = item.image || item.imageUrl || item.img || catalogMatch?.image || catalogMatch?.imageUrl;

                        return (
                            <View key={index} style={styles.productCard}>
                                <View style={styles.prodLeft}>
                                    <View style={styles.prodThumb}>
                                        {itemImage ? (
                                            <Image source={{ uri: itemImage }} style={styles.prodImg} />
                                        ) : (
                                            <Text style={{ fontSize: 24 }}>📦</Text>
                                        )}
                                    </View>

                                    <View style={styles.prodDetails}>
                                        <Text style={styles.prodName} numberOfLines={2}>
                                            {name}
                                        </Text>
                                        <View style={styles.stockTagsRow}>
                                            <View
                                                style={[
                                                    styles.lowStockPill,
                                                    isDeliveredState && styles.inStockPill,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.lowStockText,
                                                        isDeliveredState && styles.inStockText,
                                                    ]}
                                                >
                                                    {isDeliveredState ? '✓ IN STOCK' : '⚠️ LOW STOCK'}
                                                </Text>
                                            </View>
                                            <Text style={styles.stockUnitsText}>
                                                {currentStock} {unit} left • min {minOrder}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.reorderQtyBox}>
                                    <Text style={styles.reorderLabel}>REORDER QTY</Text>
                                    <View style={styles.reorderPill}>
                                        <Text style={styles.reorderPillText}>
                                            {qty} {unit}s
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* 🔒 Fixed Bottom Action Bar */}
            <View style={styles.bottomActionBar}>
                {isDeliveredState ? (
                    <View style={styles.actionGroup}>
                        <View style={styles.deliveredInfoBox}>
                            <Check size={16} color="#15803D" />
                            <Text style={styles.deliveredInfoText}>Order Delivered & Inventory Restocked</Text>
                        </View>
                        <View style={styles.actionBtnsRow}>
                            <TouchableOpacity
                                style={styles.trackingBtn}
                                onPress={() => {
                                    if (onNavigate) {
                                        onNavigate('delivery_tracking', { po: { ...reqData, status: 'Delivered' } });
                                    }
                                }}
                            >
                                <Truck size={16} color="#FFFFFF" />
                                <Text style={styles.trackingBtnText}>Tracking</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => setDeleteConfirm(true)}
                            >
                                <Trash2 size={16} color="#DC2626" />
                                <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : isActiveState ? (
                    <View style={styles.actionGroup}>
                        <View style={styles.confirmedInfoBox}>
                            <Check size={16} color="#166534" />
                            <Text style={styles.confirmedInfoText}>Order Confirmed & Active ({status})</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.liveTrackingBtn}
                            onPress={() => {
                                if (onNavigate) {
                                    onNavigate('delivery_tracking', { po: { ...reqData, status } });
                                }
                            }}
                        >
                            <Truck size={18} color="#FFFFFF" />
                            <Text style={styles.liveTrackingBtnText}>View Live Timeline & Tracking</Text>
                        </TouchableOpacity>
                    </View>
                ) : isDeclinedState ? (
                    <View style={styles.declinedBox}>
                        <AlertCircle size={18} color="#991B1B" />
                        <Text style={styles.declinedText}>Request Declined</Text>
                    </View>
                ) : (
                    <View style={styles.pendingActionGroup}>
                        <TouchableOpacity
                            style={styles.acceptBtn}
                            onPress={handleAccept}
                            disabled={isUpdating}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.acceptBtnText}>
                                {isUpdating ? 'Updating...' : 'Accept & Confirm Order'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.declineBtn}
                            onPress={handleDecline}
                            disabled={isUpdating}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.declineBtnText}>Decline Request</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Custom Delete Modal */}
            <Modal visible={deleteConfirm} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <Trash2 size={26} color="#DC2626" />
                        </View>
                        <Text style={styles.modalTitle}>Delete Order Record?</Text>
                        <Text style={styles.modalDesc}>
                            This will permanently remove <Text style={{ fontWeight: '800', color: '#0F172A' }}>{cleanPo}</Text> from the database. This cannot be undone.
                        </Text>
                        <View style={styles.modalBtnGroup}>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={async () => {
                                    setDeleteConfirm(false);
                                    const targetId = reqData._id || reqData.id || reqData.poId;
                                    try {
                                        const res = await fetch(`${API_BASE_URL}/supplier-replenishment/requests/${targetId}`, { method: 'DELETE' });
                                        const data = await res.json();
                                        if (data.success && onNavigate) {
                                            onNavigate('requests');
                                        }
                                    } catch (err) { }
                                }}
                            >
                                <Trash2 size={16} color="#FFFFFF" />
                                <Text style={styles.confirmDeleteBtnText}>Yes, Delete Permanently</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelDeleteBtn}
                                onPress={() => setDeleteConfirm(false)}
                            >
                                <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
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
    headerSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.4,
        lineHeight: 28,
        flex: 1,
        marginRight: 10,
    },
    backBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    successBannerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#15803D',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    infoLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    infoValBold: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    infoValGreen: {
        fontSize: 14,
        fontWeight: '800',
        color: '#166534',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    productsList: {
        gap: 12,
    },
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
        gap: 12,
    },
    prodLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    prodThumb: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    prodImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    prodDetails: {
        flex: 1,
        gap: 4,
    },
    prodName: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 18,
    },
    stockTagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    lowStockPill: {
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    lowStockText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#B45309',
    },
    inStockPill: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    inStockText: {
        color: '#15803D',
    },
    stockUnitsText: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '600',
    },
    reorderQtyBox: {
        alignItems: 'flex-end',
        gap: 4,
    },
    reorderLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    reorderPill: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5,
        borderColor: '#86EFAC',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    reorderPillText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#166534',
    },
    bottomActionBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    actionGroup: {
        gap: 8,
        width: '100%',
    },
    deliveredInfoBox: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#86EFAC',
        padding: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deliveredInfoText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#15803D',
    },
    actionBtnsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    trackingBtn: {
        flex: 1,
        backgroundColor: '#15803D',
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    trackingBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    deleteBtn: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    deleteBtnText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '800',
    },
    confirmedInfoBox: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#86EFAC',
        padding: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    confirmedInfoText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#166534',
    },
    liveTrackingBtn: {
        backgroundColor: '#166534',
        paddingVertical: 14,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    liveTrackingBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    declinedBox: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        padding: 14,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    declinedText: {
        color: '#991B1B',
        fontSize: 14,
        fontWeight: '700',
    },
    pendingActionGroup: {
        gap: 12,
        width: '100%',
    },
    acceptBtn: {
        backgroundColor: '#27672D',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#27672D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 2,
    },
    acceptBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    declineBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#27672D',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    declineBtnText: {
        color: '#27672D',
        fontSize: 15,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 24,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FEF2F2',
        borderWidth: 2,
        borderColor: '#FCA5A5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    modalDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    modalBtnGroup: {
        width: '100%',
        gap: 10,
    },
    confirmDeleteBtn: {
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    confirmDeleteBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    cancelDeleteBtn: {
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelDeleteBtnText: {
        color: '#334155',
        fontSize: 15,
        fontWeight: '700',
    },
});
