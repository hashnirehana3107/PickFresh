import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    Clock,
    Store,
    Phone,
    MapPin,
    Package,
    ShoppingBag,
    AlertTriangle,
    X,
    XCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const STEPS = [
    {
        id: 1,
        statusKey: 'Pending',
        title: 'Order received',
        subtitle: 'We got your pre-order!',
        time: 'Just now',
        icon: ShoppingBag,
    },
    {
        id: 2,
        statusKey: 'Accepted',
        title: 'Accepted by shop',
        subtitle: 'Shop confirmed your order',
        time: 'In progress',
        icon: Store,
    },
    {
        id: 3,
        statusKey: 'Preparing',
        title: 'Packing your items',
        subtitle: 'Your items are being packed by shop',
        time: 'In progress',
        icon: Package,
    },
    {
        id: 4,
        statusKey: 'Ready for Pickup',
        title: 'Ready for pickup',
        subtitle: 'Head to the store counter now!',
        time: 'Ready',
        icon: Check,
    },
    {
        id: 5,
        statusKey: 'Collected',
        title: 'Order collected',
        subtitle: 'Thank you for shopping with PickFresh!',
        time: 'Completed',
        icon: CheckCircle2,
    },
];

export default function LiveTrackingPage({ onNavigate, orderDetails, onOrderCancelled }) {
    const { user } = useAuth && typeof useAuth === 'function' ? useAuth() : { user: null };
    const [liveOrder, setLiveOrder] = useState(orderDetails || null);
    const [isLoading, setIsLoading] = useState(!orderDetails);

    const [completedUpTo, setCompletedUpTo] = useState(2);
    const [orderStatus, setOrderStatus] = useState(orderDetails?.status || 'Pending');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showCallStoreModal, setShowCallStoreModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('Ordered by mistake');
    const [isCancelling, setIsCancelling] = useState(false);
    const [storePicture, setStorePicture] = useState('');

    const targetOrderId = liveOrder?._id || liveOrder?.id;

    const updateStepsFromStatus = (statusStr) => {
        const normalized = (statusStr || '').toLowerCase().trim();
        setOrderStatus(statusStr);

        if (normalized === 'cancelled') {
            setCompletedUpTo(0);
        } else if (normalized === 'pending' || normalized === 'placed') {
            setCompletedUpTo(1);
        } else if (normalized === 'accepted' || normalized === 'confirmed') {
            setCompletedUpTo(2);
        } else if (normalized === 'preparing' || normalized === 'processing' || normalized === 'packing') {
            setCompletedUpTo(3);
        } else if (normalized === 'ready for pickup' || normalized === 'ready') {
            setCompletedUpTo(4);
        } else if (normalized === 'collected' || normalized === 'completed') {
            setCompletedUpTo(5);
        } else {
            setCompletedUpTo(2);
        }
    };

    useEffect(() => {
        if (orderDetails) {
            setLiveOrder(orderDetails);
            if (orderDetails.status) {
                updateStepsFromStatus(orderDetails.status);
            }
        }
    }, [orderDetails]);

    // Real-time backend MongoDB sync: Polling every 3s
    useEffect(() => {
        let isMounted = true;

        const fetchLatestOrderStatus = async () => {
            try {
                if (targetOrderId) {
                    const cleanTargetId = encodeURIComponent(String(targetOrderId).replace('#', '').trim());
                    const res = await fetch(`${API_BASE_URL}/orders/${cleanTargetId}`);
                    const data = await res.json();
                    if (res.ok && data.success && data.order && isMounted) {
                        setLiveOrder(data.order);
                        updateStepsFromStatus(data.order.status);
                    }
                } else {
                    const queryParams = new URLSearchParams();
                    if (user?.email) queryParams.append('customerEmail', user.email);
                    if (user?._id || user?.id) queryParams.append('customerId', user._id || user.id);
                    if (user?.name || user?.fullName) queryParams.append('customerName', user.name || user.fullName);
                    const fallbackUrl = `${API_BASE_URL}/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
                    const res = await fetch(fallbackUrl);
                    const data = await res.json();
                    if (res.ok && data.success && Array.isArray(data.orders) && data.orders.length > 0 && isMounted) {
                        const sorted = [...data.orders].sort(
                            (a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
                        );
                        const latest = sorted[0];
                        setLiveOrder(latest);
                        updateStepsFromStatus(latest.status);
                    }
                }
            } catch (err) {
                console.warn('Live tracking polling error:', err?.message || err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchLatestOrderStatus();
        const interval = setInterval(fetchLatestOrderStatus, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [targetOrderId]);

    const normStatus = (orderStatus || '').toLowerCase();
    const isCancelled = normStatus === 'cancelled';
    const isAllDone = completedUpTo >= STEPS.length && !isCancelled;
    const canSelfCancel = ['pending', 'accepted', 'placed', 'confirmed'].includes(normStatus);
    const isPreparingOrReady = ['preparing', 'processing', 'packing', 'ready for pickup', 'ready'].includes(normStatus);

    const handleConfirmCancel = async () => {
        if (!liveOrder) return;
        setIsCancelling(true);
        const rawId = liveOrder._id || liveOrder.id || liveOrder.orderNumber;
        const orderId = encodeURIComponent(String(rawId).replace('#', '').trim());

        try {
            const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelled', cancellationReason: cancelReason, isCustomer: true }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setOrderStatus('Cancelled');
                if (data.order) {
                    setLiveOrder(data.order);
                } else {
                    setLiveOrder((prev) => (prev ? { ...prev, status: 'Cancelled' } : null));
                }
                updateStepsFromStatus('Cancelled');
                AsyncStorage.removeItem('pickfresh_active_order').catch(() => {});
                if (onOrderCancelled) onOrderCancelled(liveOrder);
                setShowCancelModal(false);
                if (onNavigate) {
                    onNavigate('history', { filter: 'cancelled' });
                }
            } else {
                Alert.alert('Notice', data.message || 'Cannot cancel this order at the current stage.');
                setShowCancelModal(false);
            }
        } catch (err) {
            setOrderStatus('Cancelled');
            setLiveOrder((prev) => (prev ? { ...prev, status: 'Cancelled' } : null));
            updateStepsFromStatus('Cancelled');
            AsyncStorage.removeItem('pickfresh_active_order').catch(() => {});
            if (onOrderCancelled) onOrderCancelled(liveOrder);
            setShowCancelModal(false);
            if (onNavigate) {
                onNavigate('history', { filter: 'cancelled' });
            }
        } finally {
            setIsCancelling(false);
        }
    };

    const orderNumberDisplay = liveOrder?.orderNumber
        ? liveOrder.orderNumber.replace('#', '')
        : liveOrder?._id
            ? String(liveOrder._id).slice(-4).toUpperCase()
            : 'PF-0016';
    const pickupStoreDisplay = liveOrder?.pickupStore || liveOrder?.storeName || 'GroceryMart';
    const rawPickupTime = liveOrder?.pickupTimeSlot || liveOrder?.pickupSlot || '4:00 PM - 4:30 PM';
    const pickupTimeDisplay = rawPickupTime.replace(/^pickup:\s*/i, '');

    // Store picture resolution
    useEffect(() => {
        let isMounted = true;
        const fetchStorePic = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/customer-shopping/stores`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.stores) && isMounted) {
                    const storeNameClean = (pickupStoreDisplay || '').toLowerCase();
                    const matched = data.stores.find((s) => {
                        const sName = (s.name || '').toLowerCase();
                        return storeNameClean.includes(sName) || sName.includes(storeNameClean.split('•')[0].trim());
                    });
                    if (matched && matched.picture) {
                        setStorePicture(matched.picture);
                    }
                }
            } catch (err) {
                // Ignore
            }
        };
        fetchStorePic();
        return () => {
            isMounted = false;
        };
    }, [pickupStoreDisplay]);

    const getStoreAvatarSource = () => {
        if (storePicture && (storePicture.startsWith('http') || storePicture.startsWith('data:'))) {
            return { uri: storePicture };
        }
        if (liveOrder?.storeImage && (liveOrder.storeImage.startsWith('http') || liveOrder.storeImage.startsWith('data:'))) {
            return { uri: liveOrder.storeImage };
        }
        const s = (pickupStoreDisplay || '').toLowerCase();
        if (s.includes('grocery') || s.includes('mart')) {
            return require('../../../assets/GroceryMart.jpg');
        }
        if (s.includes('pickfresh')) {
            return require('../../../assets/logo.jpg');
        }
        return require('../../../assets/GroceryMart.jpg');
    };

    // Loading State
    if (isLoading && !liveOrder) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2D7B38" />
                <View style={{ alignItems: 'center', marginTop: 14 }}>
                    <Text style={styles.loadingTitle}>Loading live order status...</Text>
                    <Text style={styles.loadingSub}>Syncing with MongoDB database</Text>
                </View>
            </View>
        );
    }

    // Empty State
    if (!isLoading && !liveOrder) {
        return (
            <View style={styles.emptyContainer}>
                <ShoppingBag size={48} color="#94A3B8" />
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                    <Text style={styles.emptyTitle}>No Active Order Found</Text>
                    <Text style={styles.emptySub}>Place a pre-order from cart to start live tracking.</Text>
                </View>
                <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => onNavigate && onNavigate('home')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.emptyBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const progressPct = isCancelled
        ? 100
        : Math.min(100, Math.max(0, Math.round((completedUpTo / STEPS.length) * 100)));

    return (
        <View style={styles.container}>
            {/* 🔝 Fixed Top Navigation Bar */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Live tracking</Text>
                    {!isAllDone && !isCancelled && (
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveBadgeText}>LIVE SYNC</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('home')}
                    activeOpacity={0.7}
                    accessibilityLabel="Go back"
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* 📜 Scrollable Content Area */}
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={true}
            >

                {/* Top Order Summary Card */}
                <View style={[styles.orderCard, isCancelled && styles.orderCardCancelled]}>
                    <View style={styles.orderTopRow}>
                        <View style={styles.storeAvatarWrapper}>
                            <Image source={getStoreAvatarSource()} style={styles.storeAvatarImg} />
                        </View>

                        <View style={styles.orderDetailsCol}>
                            <View style={styles.orderIdRow}>
                                <Text style={styles.orderId} numberOfLines={1}>
                                    Order #{orderNumberDisplay}
                                </Text>
                                <View
                                    style={[
                                        styles.statusPill,
                                        isCancelled
                                            ? styles.statusPillCancelled
                                            : isAllDone
                                                ? styles.statusPillDone
                                                : styles.statusPillProcessing,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusPillText,
                                            isCancelled
                                                ? styles.statusPillTextCancelled
                                                : isAllDone
                                                    ? styles.statusPillTextDone
                                                    : styles.statusPillTextProcessing,
                                        ]}
                                    >
                                        {isCancelled
                                            ? '✕ Cancelled'
                                            : isAllDone
                                                ? '✓ Ready'
                                                : `● ${orderStatus || 'Pending'}`}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.storeNameLine}>
                                <MapPin size={13} color="#2D7B38" style={{ flexShrink: 0 }} />
                                <Text style={styles.storeName} numberOfLines={1}>
                                    {pickupStoreDisplay}
                                </Text>
                            </View>

                            <View style={styles.pickupTimeLine}>
                                <Clock size={13} color="#64748B" style={{ flexShrink: 0 }} />
                                <Text style={styles.pickupTimeText} numberOfLines={1}>
                                    Pickup: {pickupTimeDisplay}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Progress Bar Track */}
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                isCancelled && styles.progressFillCancelled,
                                { width: `${progressPct}%` },
                            ]}
                        />
                    </View>

                    {/* Progress Labels */}
                    <View style={styles.progressLabels}>
                        <Text style={styles.progressLabelText}>
                            {isCancelled
                                ? 'Order reservation cancelled'
                                : `${completedUpTo} of ${STEPS.length} steps completed`}
                        </Text>
                        <Text style={styles.progressLabelText}>
                            {isCancelled ? 'Cancelled' : `${progressPct}%`}
                        </Text>
                    </View>
                </View>

                {/* Stepper Timeline Card */}
                {!isCancelled && (
                    <View style={styles.stepperCard}>
                        {STEPS.map((step, index) => {
                            const isDone = index < completedUpTo;
                            const isCurrent = index === completedUpTo - 1 && !isAllDone;
                            const isPending = index >= completedUpTo;
                            const isConnectorDone = completedUpTo > index + 1;
                            const IconComponent = step.icon;

                            return (
                                <View key={step.id} style={styles.stepRow}>
                                    {/* Left Node & Connector */}
                                    <View style={styles.stepLeft}>
                                        <View style={styles.nodeWrapper}>
                                            {isCurrent && <View style={styles.pulseRing} />}
                                            <View
                                                style={[
                                                    styles.node,
                                                    isDone && styles.nodeDone,
                                                    isCurrent && styles.nodeCurrent,
                                                    isPending && styles.nodePending,
                                                ]}
                                            >
                                                {isDone ? (
                                                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                                                ) : (
                                                    <IconComponent
                                                        size={15}
                                                        color={isCurrent ? '#FFFFFF' : '#94A3B8'}
                                                    />
                                                )}
                                            </View>
                                        </View>
                                        {index < STEPS.length - 1 && (
                                            <View
                                                style={[
                                                    styles.connector,
                                                    isConnectorDone && styles.connectorDone,
                                                ]}
                                            />
                                        )}
                                    </View>

                                    {/* Right Content */}
                                    <View style={styles.stepRight}>
                                        <View style={styles.stepInfoRow}>
                                            <View style={styles.stepTextCol}>
                                                <Text
                                                    style={[
                                                        styles.stepTitle,
                                                        isDone && styles.stepTitleDone,
                                                        isCurrent && styles.stepTitleCurrent,
                                                        isPending && styles.stepTitlePending,
                                                    ]}
                                                >
                                                    {step.title}
                                                </Text>
                                                {isCurrent ? (
                                                    <View style={styles.stepCurrentSubRow}>
                                                        <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                                                        <Text style={styles.stepCurrentSubText}>
                                                            Shop is processing this step...
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text
                                                        style={[
                                                            styles.stepSub,
                                                            isPending && styles.stepSubMuted,
                                                        ]}
                                                    >
                                                        {step.subtitle}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Right Badges */}
                                            <View style={styles.stepBadgesRow}>
                                                {isDone && (
                                                    <View style={styles.stepTimeBadge}>
                                                        <Clock size={10} color="#2D7B38" style={{ marginRight: 3 }} />
                                                        <Text style={styles.stepTimeText}>Updated</Text>
                                                    </View>
                                                )}
                                                {isCurrent && (
                                                    <View style={styles.stepNowBadge}>
                                                        <Text style={styles.stepNowText}>Now</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Status Updated Live Box */}
                {isCancelled ? (
                    <View style={[styles.etaBox, styles.etaBoxCancelled]}>
                        <View style={[styles.etaIconContainer, styles.etaIconCancelled]}>
                            <XCircle size={22} color="#DC2626" />
                        </View>
                        <View style={styles.etaTextCol}>
                            <Text style={[styles.etaLabel, { color: '#991B1B' }]}>
                                ORDER HAS BEEN CANCELLED
                            </Text>
                            <Text style={[styles.etaValue, { color: '#7F1D1D' }]}>
                                Reservation released in MongoDB Atlas database.
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.etaBox, isAllDone && styles.etaBoxReady]}>
                        <View style={[styles.etaIconContainer, isAllDone && styles.etaIconContainerReady]}>
                            {isAllDone ? (
                                <CheckCircle2 size={22} color="#166534" />
                            ) : (
                                <Clock size={22} color="#2D7B38" />
                            )}
                        </View>
                        <View style={styles.etaTextCol}>
                            <Text style={[styles.etaLabel, isAllDone && styles.etaLabelReady]}>
                                {isAllDone ? 'ORDER IS READY FOR PICKUP!' : 'STATUS UPDATED LIVE'}
                            </Text>
                            <Text style={styles.etaValue}>
                                {isAllDone
                                    ? `Head to ${pickupStoreDisplay} pickup counter`
                                    : `Estimated pickup: ${pickupTimeDisplay}`}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Compact bottom breathing space above bottom action bar */}
                <View style={{ height: 12 }} />
            </ScrollView>

            {/* 🔒 Fixed Bottom Action Bar (Identical to ProfilePage's Bottom Action Bar in Image 2) */}
            <View style={styles.bottomBar}>
                {!isCancelled ? (
                    <>
                        <TouchableOpacity
                            style={styles.ctaBtn}
                            onPress={() => onNavigate && onNavigate('home')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.ctaBtnText}>Back to Home</Text>
                        </TouchableOpacity>

                        {!isAllDone && canSelfCancel && (
                            <TouchableOpacity
                                style={styles.cancelActionBtn}
                                onPress={() => setShowCancelModal(true)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cancelActionBtnText}>Cancel Order</Text>
                            </TouchableOpacity>
                        )}

                        {!isAllDone && !canSelfCancel && isPreparingOrReady && (
                            <TouchableOpacity
                                style={styles.callStoreBtn}
                                onPress={() => setShowCallStoreModal(true)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.callStoreBtnText}>Call Store to Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </>
                ) : (
                    <>
                        <TouchableOpacity
                            style={styles.ctaBtn}
                            onPress={() => onNavigate && onNavigate('history', { filter: 'cancelled' })}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.ctaBtnText}>View in Past Orders</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => onNavigate && onNavigate('home')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.secondaryBtnText}>Back to Home</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Cancellation Modal Sheet */}
            {showCancelModal && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowCancelModal(false)}
                    />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBox}>
                                <AlertTriangle size={22} color="#DC2626" />
                            </View>
                            <View style={styles.modalTitles}>
                                <Text style={styles.modalTitle}>Cancel Order #{orderNumberDisplay}?</Text>
                                <Text style={styles.modalSub}>
                                    Are you sure you want to cancel this order in database?
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseIcon}
                                onPress={() => setShowCancelModal(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.cancelReasonLabel}>Select reason for cancellation:</Text>
                            <View style={styles.cancelReasonsList}>
                                {[
                                    'Ordered by mistake',
                                    'Selected wrong pickup slot/time',
                                    'Changed my mind',
                                    'Other reason',
                                ].map((reason) => {
                                    const isSelected = cancelReason === reason;
                                    return (
                                        <TouchableOpacity
                                            key={reason}
                                            style={[
                                                styles.cancelReasonOption,
                                                isSelected && styles.cancelReasonOptionSelected,
                                            ]}
                                            onPress={() => setCancelReason(reason)}
                                            activeOpacity={0.7}
                                        >
                                            <View
                                                style={[
                                                    styles.radioCircle,
                                                    isSelected && styles.radioCircleSelected,
                                                ]}
                                            >
                                                {isSelected && <View style={styles.radioInner} />}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.cancelReasonText,
                                                    isSelected && styles.cancelReasonTextSelected,
                                                ]}
                                            >
                                                {reason}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.btnConfirmCancel}
                                onPress={handleConfirmCancel}
                                disabled={isCancelling}
                                activeOpacity={0.8}
                            >
                                {isCancelling ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.btnConfirmCancelText}>Yes, Cancel Order</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnKeepOrder}
                                onPress={() => setShowCancelModal(false)}
                                disabled={isCancelling}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnKeepOrderText}>Keep Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Call Store Modal Sheet */}
            {showCallStoreModal && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowCallStoreModal(false)}
                    />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.modalIconBox, { backgroundColor: '#FEF3C7' }]}>
                                <Phone size={22} color="#D97706" />
                            </View>
                            <View style={styles.modalTitles}>
                                <Text style={styles.modalTitle}>Order Items Being Packed</Text>
                                <Text style={styles.modalSub}>
                                    Order #{orderNumberDisplay} in progress at store
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseIcon}
                                onPress={() => setShowCallStoreModal(false)}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ paddingVertical: 14 }}>
                            <View style={styles.callStoreNoticeBox}>
                                <Text style={styles.callStoreNoticeText}>
                                    <Text style={{ fontWeight: '800' }}>Items Packing Notice: </Text>
                                    Store staff has already started picking and packing your items for pickup.
                                    To request a cancellation or change, please contact the store counter directly.
                                </Text>
                            </View>

                            <View style={styles.storeContactRow}>
                                <View>
                                    <Text style={styles.storeContactLabel}>Store Counter Contact</Text>
                                    <Text style={styles.storeContactName}>{pickupStoreDisplay}</Text>
                                </View>
                                <Text style={styles.storeContactPhone}>
                                    {liveOrder?.storePhone || '077 123 4567'}
                                </Text>
                            </View>
                        </View>

                        <View style={{ gap: 10 }}>
                            <TouchableOpacity
                                style={styles.btnCallStore}
                                onPress={() => {
                                    Linking.openURL(`tel:${liveOrder?.storePhone || '0771234567'}`).catch(() => {});
                                }}
                                activeOpacity={0.8}
                            >
                                <Phone size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={styles.btnCallStoreText}>
                                    Call Store Counter ({liveOrder?.storePhone || '077 123 4567'})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnKeepOrder}
                                onPress={() => setShowCallStoreModal(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnKeepOrderText}>Dismiss</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
        position: 'relative',
        overflow: 'hidden',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 6,
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 14,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#F8F9FB',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    loadingTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    loadingSub: {
        fontSize: 13,
        color: '#64748B',
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: '#F8F9FB',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
    },
    emptyBtn: {
        marginTop: 16,
        backgroundColor: '#2D7B38',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 14,
    },
    emptyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // ── Header Row ──
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
        backgroundColor: '#F8F9FB',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#DCFCE7',
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#16A34A',
    },
    liveBadgeText: {
        color: '#166534',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },

    // ── Top Order Card ──
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        paddingBottom: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 20,
        elevation: 2,
    },
    orderCardCancelled: {
        borderColor: '#FECACA',
        backgroundColor: '#FFF5F5',
    },
    orderTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    storeAvatarWrapper: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        borderWidth: 1.5,
        borderColor: '#C8E6C9',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeAvatarImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    orderDetailsCol: {
        flex: 1,
        gap: 3,
    },
    orderIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    orderId: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
    },
    statusPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'center',
    },
    statusPillProcessing: {
        backgroundColor: '#FFF7ED',
    },
    statusPillDone: {
        backgroundColor: '#DCFCE7',
    },
    statusPillCancelled: {
        backgroundColor: '#FEE2E2',
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    statusPillTextProcessing: {
        color: '#C2410C',
    },
    statusPillTextDone: {
        color: '#166534',
    },
    statusPillTextCancelled: {
        color: '#991B1B',
    },
    storeNameLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 1,
    },
    storeName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    pickupTimeLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    pickupTimeText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 7,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2D7B38',
        borderRadius: 6,
    },
    progressFillCancelled: {
        backgroundColor: '#EF4444',
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressLabelText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },

    // ── Stepper Card ──
    stepperCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        paddingBottom: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 16,
        elevation: 2,
    },
    stepRow: {
        flexDirection: 'row',
        gap: 14,
    },
    stepLeft: {
        alignItems: 'center',
        width: 36,
    },
    nodeWrapper: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    pulseRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 22,
        borderWidth: 2.5,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
    },
    node: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    nodeDone: {
        backgroundColor: '#2D7B38',
        shadowColor: '#2D7B38',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 2,
    },
    nodeCurrent: {
        backgroundColor: '#1E6B30',
        shadowColor: '#2D7B38',
        shadowOpacity: 0.45,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 14,
        elevation: 3,
    },
    nodePending: {
        backgroundColor: '#F1F5F9',
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    connector: {
        width: 2,
        flex: 1,
        minHeight: 34,
        marginVertical: 3,
        borderRadius: 2,
        backgroundColor: '#E2E8F0',
    },
    connectorDone: {
        backgroundColor: '#2D7B38',
    },
    stepRight: {
        flex: 1,
        paddingBottom: 22,
    },
    stepInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: 6,
    },
    stepTextCol: {
        flex: 1,
        paddingRight: 8,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    stepTitleDone: {
        color: '#1E293B',
    },
    stepTitleCurrent: {
        color: '#2D7B38',
    },
    stepTitlePending: {
        color: '#94A3B8',
        fontWeight: '500',
    },
    stepSub: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
    },
    stepSubMuted: {
        color: '#CBD5E1',
    },
    stepCurrentSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    stepCurrentSubText: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
    },
    stepBadgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 4,
    },
    stepTimeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    stepTimeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#2D7B38',
    },
    stepNowBadge: {
        backgroundColor: '#FFF7ED',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    stepNowText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#C2410C',
    },

    // ── ETA Box ──
    etaBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#ECF6EE',
        borderWidth: 1.5,
        borderColor: '#C8E6C9',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 18,
        shadowColor: '#2D7B38',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 1,
    },
    etaBoxReady: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    etaBoxCancelled: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    etaIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#A5D6A7',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2D7B38',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 1,
    },
    etaIconContainerReady: {
        borderColor: '#86EFAC',
    },
    etaIconCancelled: {
        borderColor: '#FCA5A5',
    },
    etaTextCol: {
        flex: 1,
    },
    etaLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2D7B38',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    etaLabelReady: {
        color: '#166534',
    },
    etaValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },

    // ── Fixed Bottom Action Bar (Identical to ProfilePage) ──
    bottomBar: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : (Platform.OS === 'android' ? 22 : 14),
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 6,
        gap: 8,
    },
    ctaBtn: {
        width: '100%',
        backgroundColor: '#2D7B38',
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2D7B38',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
    },
    ctaBtnText: {
        color: '#FFFFFF',
        fontSize: 15.5,
        fontWeight: '700',
    },
    cancelActionBtn: {
        width: '100%',
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelActionBtnText: {
        color: '#DC2626',
        fontSize: 15,
        fontWeight: '700',
    },
    callStoreBtn: {
        width: '100%',
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callStoreBtnText: {
        color: '#DC2626',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryBtn: {
        width: '100%',
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnText: {
        color: '#DC2626',
        fontSize: 15,
        fontWeight: '700',
    },

    // ── Bottom Sheet Modals ──
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: -12 },
        shadowRadius: 35,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    modalIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitles: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    modalSub: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    modalCloseIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        paddingVertical: 8,
    },
    cancelReasonLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 10,
    },
    cancelReasonsList: {
        gap: 8,
        marginBottom: 16,
    },
    cancelReasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    cancelReasonOptionSelected: {
        borderColor: '#2D7B38',
        backgroundColor: '#F0FDF4',
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleSelected: {
        borderColor: '#2D7B38',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2D7B38',
    },
    cancelReasonText: {
        fontSize: 13.5,
        color: '#334155',
        fontWeight: '500',
    },
    cancelReasonTextSelected: {
        color: '#166534',
        fontWeight: '700',
    },
    modalActions: {
        gap: 10,
        marginTop: 6,
    },
    btnConfirmCancel: {
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnConfirmCancelText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    btnKeepOrder: {
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnKeepOrderText: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '700',
    },

    // Call store modal styles
    callStoreNoticeBox: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 14,
        padding: 14,
    },
    callStoreNoticeText: {
        color: '#92400E',
        fontSize: 13,
        lineHeight: 18,
    },
    storeContactRow: {
        marginTop: 12,
        padding: 14,
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    storeContactLabel: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
    },
    storeContactName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 2,
    },
    storeContactPhone: {
        fontSize: 14,
        fontWeight: '800',
        color: '#2D7B38',
    },
    btnCallStore: {
        backgroundColor: '#2D7B38',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnCallStoreText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
