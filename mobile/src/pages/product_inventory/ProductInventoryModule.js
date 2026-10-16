import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ProductListPage from './ProductListPage';
import AddProductPage from './AddProductPage';
import EditProductPage from './EditProductPage';
import SupplierListPage from './SupplierList';
import AddSupplierPage from './AddSupplierPage';
import RestockRequestPage from './RestockRequestPage';
import LowStockAdvancedPage from './LowStockAdvancedPage';
import DeleteProductPage from './DeleteProductPage';

export default function ProductInventoryModule({ initialPage = 'product_list', onNavigate: topLevelNavigate }) {
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [subParams, setSubParams] = useState(null);

    const handleNavigate = (page, data = null) => {
        setSubParams(data || null);
        if (page === 'product_list' || page === 'list') {
            setCurrentPage('product_list');
        } else if (page === 'add_product' || page === 'add') {
            setCurrentPage('add_product');
        } else if (page === 'edit_product' || page === 'edit') {
            setCurrentPage('edit_product');
        } else if (page === 'delete_product' || page === 'delete') {
            setCurrentPage('delete_product');
        } else if (page === 'supplier_list' || page === 'suppliers') {
            setCurrentPage('supplier_list');
        } else if (page === 'add_supplier') {
            setCurrentPage('add_supplier');
        } else if (page === 'restock_request' || page === 'restock') {
            setCurrentPage('restock_request');
        } else if (page === 'low_stock') {
            setCurrentPage('low_stock');
        } else if (topLevelNavigate) {
            topLevelNavigate(page, data);
        }
    };

    return (
        <View style={styles.container}>
            {currentPage === 'product_list' && (
                <ProductListPage onNavigate={handleNavigate} />
            )}

            {currentPage === 'add_product' && (
                <AddProductPage onNavigate={handleNavigate} />
            )}

            {currentPage === 'edit_product' && (
                <EditProductPage
                    product={subParams?.product}
                    onNavigate={handleNavigate}
                />
            )}

            {currentPage === 'delete_product' && (
                <DeleteProductPage
                    product={subParams?.product}
                    onNavigate={handleNavigate}
                />
            )}

            {currentPage === 'supplier_list' && (
                <SupplierListPage onNavigate={handleNavigate} />
            )}

            {currentPage === 'add_supplier' && (
                <AddSupplierPage onNavigate={handleNavigate} />
            )}

            {currentPage === 'restock_request' && (
                <RestockRequestPage
                    initialData={subParams}
                    onNavigate={handleNavigate}
                />
            )}

            {currentPage === 'low_stock' && (
                <LowStockAdvancedPage onNavigate={handleNavigate} />
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
