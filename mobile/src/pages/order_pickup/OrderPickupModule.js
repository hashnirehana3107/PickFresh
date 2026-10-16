import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import OrderDashboard from './OrderDashboard';
import OrderDetailsPage from './OrderDetailsPage';
import PickupSchedulePage from './PickupSchedulePage';
import StatusUpdatePage from './StatusUpdatePage';
import ShopPastOrdersPage from './ShopPastOrdersPage';

export default function OrderPickupModule({
    initialPage = 'dashboard',
    initialParams = null,
    onNavigate: topLevelNavigate,
}) {
    const [currentScreen, setCurrentScreen] = useState(initialPage);
    const [screenParams, setScreenParams] = useState(initialParams);

    useEffect(() => {
        if (initialPage) {
            setCurrentScreen(initialPage);
        }
        if (initialParams) {
            setScreenParams(initialParams);
        }
    }, [initialPage, initialParams]);

    const handleNavigate = (screen, params = null) => {
        if ((screen === 'home' || screen === 'merchant_home') && topLevelNavigate) {
            topLevelNavigate('home');
            return;
        }

        if (screen === 'dashboard' || screen === 'order_dashboard' || screen === 'orders') {
            setCurrentScreen('dashboard');
            setScreenParams(null);
            return;
        }

        if (screen === 'details' || screen === 'order_details') {
            setCurrentScreen('order_details');
            setScreenParams(params);
            return;
        }

        if (screen === 'status' || screen === 'status_update') {
            setCurrentScreen('status_update');
            setScreenParams(params);
            return;
        }

        if (screen === 'schedule' || screen === 'pickup_schedule') {
            setCurrentScreen('pickup_schedule');
            setScreenParams(params);
            return;
        }

        if (screen === 'past_orders') {
            setCurrentScreen('past_orders');
            setScreenParams(params);
            return;
        }

        if (topLevelNavigate) {
            topLevelNavigate(screen, params);
        }
    };

    return (
        <View style={styles.container}>
            {currentScreen === 'dashboard' && (
                <OrderDashboard onNavigate={handleNavigate} />
            )}

            {currentScreen === 'order_details' && (
                <OrderDetailsPage
                    order={screenParams?.order}
                    onNavigate={handleNavigate}
                />
            )}

            {currentScreen === 'status_update' && (
                <StatusUpdatePage
                    order={screenParams?.order}
                    onNavigate={handleNavigate}
                />
            )}

            {currentScreen === 'pickup_schedule' && (
                <PickupSchedulePage onNavigate={handleNavigate} />
            )}

            {currentScreen === 'past_orders' && (
                <ShopPastOrdersPage onNavigate={handleNavigate} />
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
