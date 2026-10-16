import React from 'react';
import CustomerShoppingModule from './CustomerShoppingModule';

export default function CustomerDashboard({ onNavigate }) {
    return <CustomerShoppingModule initialPage="home" onNavigate={onNavigate} />;
}
