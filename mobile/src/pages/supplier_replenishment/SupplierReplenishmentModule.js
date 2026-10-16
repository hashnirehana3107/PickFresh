import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

// Shop Owner Supplier Management Views
import SupplierListPage from '../product_inventory/SupplierList';
import AddSupplierPage from '../product_inventory/AddSupplierPage';
import RestockRequestPage from '../product_inventory/RestockRequestPage';

// Supplier Portal Subviews
import SupplierDashboard from './SupplierDashboard';
import ReplenishmentRequestsPage from './ReplenishmentRequestsPage';
import RestockRequestDetailsPage from './RestockRequestDetailsPage';
import StoreListPage from './StoreListPage';
import DeliveryTrackingPage from './DeliveryTrackingPage';
import SupplierCatalogPage from './SupplierCatalogPage';
import SupplierNotificationsPage from './SupplierNotificationsPage';
import SupplierProfilePage from './SupplierProfilePage';

export default function SupplierReplenishmentModule({
    initialPage = 'supplier_list',
    onNavigate: topLevelNavigate,
}) {
    // Default directly to 'supplier_list' page for Shop Owner (matching React Web)
    const [currentScreen, setCurrentScreen] = useState(initialPage);
    const [screenParams, setScreenParams] = useState(null);

    const handleNavigate = (screen, params = null) => {
        if ((screen === 'dashboard' || screen === 'home') && currentScreen === 'supplier_list' && topLevelNavigate) {
            topLevelNavigate('home');
            return;
        }

        // Support aliases
        if (screen === 'dashboard' || screen === 'supplier_portal' || screen === 'home') {
            setCurrentScreen('supplier_portal');
        } else if (screen === 'requests' || screen === 'requests_list') {
            setCurrentScreen('requests_list');
        } else if (screen === 'request_details' || screen === 'requests_details') {
            setCurrentScreen('request_details');
        } else if (screen === 'delivery' || screen === 'deliveries' || screen === 'delivery_tracking' || screen === 'tracking') {
            setCurrentScreen('delivery_tracking');
        } else if (screen === 'stores' || screen === 'store_list') {
            setCurrentScreen('store_list');
        } else if (screen === 'catalog') {
            setCurrentScreen('catalog');
        } else if (screen === 'notifications') {
            setCurrentScreen('notifications');
        } else if (screen === 'profile') {
            setCurrentScreen('profile');
        } else if (screen === 'supplier_list') {
            setCurrentScreen('supplier_list');
        } else if (screen === 'add_supplier') {
            setCurrentScreen('add_supplier');
        } else if (screen === 'restock_request') {
            setCurrentScreen('restock_request');
        } else if (topLevelNavigate) {
            topLevelNavigate(screen, params);
            return;
        }

        setScreenParams(params);
    };

    return (
        <View style={styles.container}>
            {/* Shop Owner Supplier Management Views */}
            {currentScreen === 'supplier_list' && (
                <SupplierListPage onNavigate={handleNavigate} />
            )}

            {currentScreen === 'add_supplier' && (
                <AddSupplierPage
                    initialData={screenParams}
                    onNavigate={(screen) => handleNavigate(screen || 'supplier_list')}
                />
            )}

            {currentScreen === 'restock_request' && (
                <RestockRequestPage
                    initialData={screenParams}
                    onNavigate={(screen) => handleNavigate(screen || 'supplier_list')}
                />
            )}

            {/* Supplier Portal Subviews */}
            {currentScreen === 'supplier_portal' && (
                <SupplierDashboard onNavigate={handleNavigate} />
            )}

            {currentScreen === 'requests_list' && (
                <ReplenishmentRequestsPage onNavigate={handleNavigate} />
            )}

            {currentScreen === 'request_details' && (
                <RestockRequestDetailsPage
                    po={screenParams?.po || screenParams}
                    onNavigate={handleNavigate}
                    onBack={() => handleNavigate('requests_list')}
                />
            )}

            {currentScreen === 'store_list' && (
                <StoreListPage onNavigate={handleNavigate} />
            )}

            {currentScreen === 'delivery_tracking' && (
                <DeliveryTrackingPage
                    po={screenParams?.po || screenParams}
                    onNavigate={handleNavigate}
                />
            )}

            {currentScreen === 'catalog' && (
                <SupplierCatalogPage onNavigate={handleNavigate} />
            )}

            {currentScreen === 'notifications' && (
                <SupplierNotificationsPage onNavigate={handleNavigate} />
            )}

            {currentScreen === 'profile' && (
                <SupplierProfilePage onNavigate={handleNavigate} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF8',
    },
});
