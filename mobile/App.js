import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';

WebBrowser.maybeCompleteAuthSession();

// Header & Navigation Components
import Header from './src/components/Header';
import BottomNavBar from './src/components/BottomNavBar';

// Auth Screens
import SplashScreen from './src/pages/auth/LogoPage';
import GetStartedScreen from './src/pages/auth/GetStartedPage';
import LoginScreen from './src/pages/auth/LoginPage';
import RoleSelectScreen from './src/pages/auth/RoleSelectPage';
import SignUpScreen from './src/pages/auth/SignUpPage';
import ForgotPasswordScreen from './src/pages/auth/ForgotPasswordPage';

// Customer Shopping Module (Unified sub-routing matching web)
import CustomerShoppingModule from './src/pages/customer_shopping/CustomerShoppingModule';
import ProfileScreen from './src/pages/customer_shopping/ProfilePage';

// Merchant Screens
import ShopOwnerScreen from './src/pages/product_inventory/ShopOwnerDashboard';
import SupplierScreen from './src/pages/supplier_replenishment/SupplierDashboard';
import { FAVICON_DATA_URI } from './src/utils/faviconData';

function MainApp() {
  const { user, isLoading } = useAuth();

  const [currentScreen, setCurrentScreen] = useState('splash');
  const [screenStack, setScreenStack] = useState(['splash']);
  const [selectedRegRole, setSelectedRegRole] = useState('customer');
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemToReplace, setItemToReplace] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [readyPickupAlert, setReadyPickupAlert] = useState(null);

  // Set web browser tab title & PickFresh favicon dynamically
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'PickFresh';
      try {
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          document.head.appendChild(link);
        }
        link.type = 'image/png';
        link.rel = 'shortcut icon';
        link.href = FAVICON_DATA_URI;

        let appleLink = document.querySelector("link[rel='apple-touch-icon']");
        if (!appleLink) {
          appleLink = document.createElement('link');
          appleLink.rel = 'apple-touch-icon';
          document.head.appendChild(appleLink);
        }
        appleLink.href = FAVICON_DATA_URI;
      } catch (e) {
        console.warn('Favicon update error:', e);
      }
    }
  }, []);

  // Sync initial screen when user logs in, signs up, or refreshes
  useEffect(() => {
    if (user) {
      if (user.role === 'shop_owner') {
        setCurrentScreen('shop_owner');
      } else if (user.role === 'supplier') {
        setCurrentScreen('supplier');
      } else {
        const authScreens = ['splash', 'logo', 'welcome', 'getstarted', 'login', 'forgot_password', 'roleselect', 'signup'];
        // If coming from auth screens (login or signup), customer MUST always land on home page
        if (authScreens.includes(currentScreen)) {
          setCurrentScreen('home');
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.hash = '#/home';
          }
          return;
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const rawHash = (window.location.hash || '').replace('#/', '').replace('#', '').trim();
          const validSubPages = ['home', 'stores', 'search', 'cart', 'profile', 'notifications', 'history', 'live_tracking', 'track', 'smart_replacement', 'product_details'];
          // If hash is valid and not ephemeral checkout state, respect it on refresh
          if (rawHash && validSubPages.includes(rawHash)) {
            setCurrentScreen(rawHash);
            return;
          }
        }
        setCurrentScreen('home');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.hash = '#/home';
        }
      }
    } else {
      const authScreens = ['splash', 'logo', 'welcome', 'getstarted', 'login', 'forgot_password', 'roleselect', 'signup'];
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const rawHash = (window.location.hash || '').replace('#/', '').replace('#', '').trim();
        const [baseHash, query] = rawHash.split('?');
        if (baseHash && authScreens.includes(baseHash)) {
          setCurrentScreen(baseHash);
          if (query?.includes('role=shop_owner') || rawHash.includes('role=shop_owner')) setSelectedRegRole('shop_owner');
          else if (query?.includes('role=supplier') || rawHash.includes('role=supplier')) setSelectedRegRole('supplier');
          else if (query?.includes('role=customer') || rawHash.includes('role=customer')) setSelectedRegRole('customer');
          return;
        }
      }
      if (!authScreens.includes(currentScreen)) {
        setCurrentScreen('welcome');
      }
    }
  }, [user]);

  // Sync hash changes on web for seamless navigation
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleHashChange = () => {
        const rawHash = (window.location.hash || '').replace('#/', '').replace('#', '').trim();
        const [baseHash, query] = rawHash.split('?');
        const authScreens = ['splash', 'logo', 'welcome', 'getstarted', 'login', 'forgot_password', 'roleselect', 'signup'];
        if (!user && authScreens.includes(baseHash)) {
          setCurrentScreen(baseHash);
          if (query?.includes('role=shop_owner') || rawHash.includes('role=shop_owner')) setSelectedRegRole('shop_owner');
          else if (query?.includes('role=supplier') || rawHash.includes('role=supplier')) setSelectedRegRole('supplier');
          else if (query?.includes('role=customer') || rawHash.includes('role=customer')) setSelectedRegRole('customer');
        }
      };
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, [user]);

  // Handle hardware Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (screenStack.length > 1) {
          const newStack = [...screenStack];
          newStack.pop();
          const prevScreen = newStack[newStack.length - 1];
          setScreenStack(newStack);
          setCurrentScreen(prevScreen);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [screenStack]);

  const navigate = (screenName, params) => {
    if (params) {
      if (params.role) {
        setSelectedRegRole(params.role);
      }
      if (screenName === 'order_confirm' || screenName === 'live_tracking') {
        setCurrentOrder(params);
      } else if (screenName === 'product_details') {
        setSelectedProduct(params);
      } else if (screenName === 'smart_replacement') {
        setItemToReplace(params);
      }
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const authScreens = ['splash', 'logo', 'welcome', 'getstarted', 'login', 'forgot_password', 'roleselect', 'signup'];
      if (!user && authScreens.includes(screenName)) {
        const roleQuery = (screenName === 'signup' && selectedRegRole) ? `?role=${selectedRegRole}` : '';
        window.location.hash = `#/${screenName}${roleQuery}`;
      }
    }
    setScreenStack((prev) => [...prev, screenName]);
    setCurrentScreen(screenName);
  };

  const SafeContainer = Platform.OS === 'web' ? View : SafeAreaView;

  if (isLoading) {
    return (
      <SafeContainer style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
        <SplashScreen onNavigate={navigate} />
      </SafeContainer>
    );
  }

  // --- UN-AUTHENTICATED FLOWS ---
  if (!user) {
    const isKnownAuthScreen = ['splash', 'logo', 'welcome', 'getstarted', 'login', 'forgot_password', 'roleselect', 'signup'].includes(currentScreen);
    return (
      <SafeContainer style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
        {(currentScreen === 'splash' || currentScreen === 'logo') && <SplashScreen onNavigate={navigate} />}
        {(currentScreen === 'welcome' || currentScreen === 'getstarted' || !isKnownAuthScreen) && <GetStartedScreen onNavigate={navigate} />}
        {currentScreen === 'login' && <LoginScreen onNavigate={navigate} />}
        {currentScreen === 'forgot_password' && <ForgotPasswordScreen onNavigate={navigate} />}
        {currentScreen === 'roleselect' && (
          <RoleSelectScreen
            onNavigate={navigate}
            selectedRole={selectedRegRole}
            onSelectRole={setSelectedRegRole}
          />
        )}
        {currentScreen === 'signup' && (
          <SignUpScreen onNavigate={navigate} selectedRole={selectedRegRole} />
        )}
      </SafeContainer>
    );
  }

  // --- SHOP OWNER FLOW ---
  if (user.role === 'shop_owner') {
    return (
      <SafeContainer style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ShopOwnerScreen onNavigate={navigate} />
      </SafeContainer>
    );
  }

  // --- SUPPLIER FLOW ---
  if (user.role === 'supplier') {
    return (
      <SafeContainer style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SupplierScreen onNavigate={navigate} initialTab={currentScreen === 'profile' ? 'profile' : 'home'} />
      </SafeContainer>
    );
  }

  // --- CUSTOMER FLOW ---
  return (
    <SafeContainer style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <CustomerShoppingModule
        key={user?.id || user?._id || user?.email || 'customer'}
        initialPage="home"
        onNavigate={navigate}
      />
    </SafeContainer>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width > 480;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // 1. Inject Google Fonts for Plus Jakarta Sans
      if (!document.getElementById('pickfresh-google-font')) {
        const link = document.createElement('link');
        link.id = 'pickfresh-google-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
      }

      // 2. Inject global font and scrollbar normalization styles
      if (!document.getElementById('pickfresh-global-styles')) {
        const style = document.createElement('style');
        style.id = 'pickfresh-global-styles';
        style.textContent = `
          * {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          input, textarea, button, select {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          ::-webkit-scrollbar {
            width: 0px !important;
            height: 0px !important;
            display: none !important;
          }
          ::-webkit-scrollbar-track,
          ::-webkit-scrollbar-thumb,
          ::-webkit-scrollbar-button {
            display: none !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          @keyframes bellShake {
            0%, 75%, 100% { transform: rotate(0deg); }
            80% { transform: rotate(14deg); }
            85% { transform: rotate(-14deg); }
            90% { transform: rotate(10deg); }
            95% { transform: rotate(-10deg); }
          }
          .has-unread-ringing {
            animation: bellShake 2.5s ease-in-out infinite !important;
          }
        `;
        document.head.appendChild(style);
      }

      document.body.style.backgroundColor = isDesktopWeb ? '#0F172A' : '#FFFFFF';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.display = 'flex';
      document.body.style.justifyContent = 'center';
      document.body.style.alignItems = 'center';
      document.body.style.minHeight = '100vh';
      document.body.style.overflow = isDesktopWeb ? 'hidden' : 'auto';
    }
  }, [isDesktopWeb]);

  const appContent = (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );

  if (isDesktopWeb) {
    return (
      <View style={styles.webDesktopBackground}>
        <View style={styles.mobileDeviceShell}>
          {/* Top Phone Status Bar (Exact match to web prototype) */}
          <View style={styles.phoneNotchBar} />
          <View style={styles.shellViewport}>
            {appContent}
          </View>
        </View>
      </View>
    );
  }

  return appContent;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBF8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBF8',
  },
  screenBody: {
    flex: 1,
  },
  webDesktopBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDeviceShell: {
    width: 390,
    maxWidth: '95vw',
    height: 844,
    maxHeight: '92vh',
    backgroundColor: '#FAFBF8',
    borderRadius: 44,
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 12px #1E293B',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  phoneNotchBar: {
    height: 26,
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  shellViewport: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
