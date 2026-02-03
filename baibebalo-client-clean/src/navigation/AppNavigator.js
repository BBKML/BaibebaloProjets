import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { useNotifications, useBackgroundNotifications } from '../hooks/useNotifications';

// Écrans d'authentification
import SplashScreen from '../screens/auth/SplashScreen';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';

// Écrans principaux
import HomeScreen from '../screens/home/HomeScreen';
import RestaurantDetailScreen from '../screens/restaurant/RestaurantDetailScreen';
import ShoppingCartScreen from '../screens/cart/ShoppingCartScreen';
import CheckoutScreen from '../screens/checkout/CheckoutScreen';
import AddressSelectionScreen from '../screens/checkout/AddressSelectionScreen';
import PaymentMethodScreen from '../screens/checkout/PaymentMethodScreen';
import OrderTrackingScreen from '../screens/orders/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/orders/OrderHistoryScreen';
import OrderConfirmationScreen from '../screens/orders/OrderConfirmationScreen';
import OrderDetailsScreen from '../screens/orders/OrderDetailsScreen';
import OrderReviewScreen from '../screens/orders/OrderReviewScreen';
import OrderChatScreen from '../screens/orders/OrderChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ManageAddressesScreen from '../screens/addresses/ManageAddressesScreen';
import AddAddressScreen from '../screens/addresses/AddAddressScreen';
import SearchScreen from '../screens/search/SearchScreen';
import FavoritesScreen from '../screens/favorites/FavoritesScreen';
import OnboardingWelcomeScreen from '../screens/onboarding/OnboardingWelcomeScreen';
import ProfileCreationScreen from '../screens/onboarding/ProfileCreationScreen';
import CustomizeDishScreen from '../screens/restaurant/CustomizeDishScreen';
import DishInformationScreen from '../screens/restaurant/DishInformationScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationPreferencesScreen from '../screens/settings/NotificationPreferencesScreen';
import LanguageSettingsScreen from '../screens/settings/LanguageSettingsScreen';
import HelpCenterScreen from '../screens/support/HelpCenterScreen';
import ContactSupportScreen from '../screens/support/ContactSupportScreen';
import LoyaltyDashboardScreen from '../screens/loyalty/LoyaltyDashboardScreen';
import ReferralProgramScreen from '../screens/loyalty/ReferralProgramScreen';
import PointsHistoryScreen from '../screens/loyalty/PointsHistoryScreen';
import CategoryResultsScreen from '../screens/search/CategoryResultsScreen';
import AccountSecurityScreen from '../screens/settings/AccountSecurityScreen';
import LiveChatSupportScreen from '../screens/support/LiveChatSupportScreen';
import ReportProblemScreen from '../screens/support/ReportProblemScreen';
import TrackingDriverAssignedScreen from '../screens/orders/TrackingDriverAssignedScreen';
import TrackingOutForDeliveryScreen from '../screens/orders/TrackingOutForDeliveryScreen';
import TrackingPreparingScreen from '../screens/orders/TrackingPreparingScreen';
import DeliveryArrivalScreen from '../screens/orders/DeliveryArrivalScreen';
import NetworkErrorScreen from '../screens/errors/NetworkErrorScreen';
import ServerErrorScreen from '../screens/errors/ServerErrorScreen';
import EmptyCartScreen from '../screens/errors/EmptyCartScreen';
import AboutBaibebaloScreen from '../screens/info/AboutBaibebaloScreen';
import PrivacyPolicyScreen from '../screens/info/PrivacyPolicyScreen';
import DataStorageScreen from '../screens/settings/DataStorageScreen';
import MapLocationSelectorScreen from '../screens/location/MapLocationSelectorScreen';
import LocationAccessPermissionScreen from '../screens/location/LocationAccessPermissionScreen';
import OrderReceiptScreen from '../screens/orders/OrderReceiptScreen';
import MyClaimsTrackingScreen from '../screens/support/MyClaimsTrackingScreen';
import ClaimTicketDetailsScreen from '../screens/support/ClaimTicketDetailsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import DeleteAccountConfirmationScreen from '../screens/profile/DeleteAccountConfirmationScreen';
import ReferralHistoryScreen from '../screens/loyalty/ReferralHistoryScreen';
import ItemOutOfStockScreen from '../screens/errors/ItemOutOfStockScreen';
import EmptyOrderHistoryScreen from '../screens/errors/EmptyOrderHistoryScreen';
import SupportFeedbackSuccessScreen from '../screens/support/SupportFeedbackSuccessScreen';
import AppMaintenanceScreen from '../screens/system/AppMaintenanceScreen';
import UpdateRequiredScreen from '../screens/system/UpdateRequiredScreen';
import SettingsUpdateSuccessScreen from '../screens/settings/SettingsUpdateSuccessScreen';
import RestaurantClosedScreen from '../screens/restaurant/RestaurantClosedScreen';
import SafetySecurityTipsScreen from '../screens/settings/SafetySecurityTipsScreen';
import ManagePaymentMethodsScreen from '../screens/payments/ManagePaymentMethodsScreen';

import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation principale avec tabs
function MainTabs() {
  const { getItemCount } = useCartStore();
  const cartItemCount = getItemCount();
  const insets = useSafeAreaInsets();

  // Calculer la hauteur et padding dynamiquement
  const tabBarHeight = 60 + insets.bottom;
  const tabBarPaddingBottom = insets.bottom > 0 ? insets.bottom : 10;

  console.log('📱 Safe Area Bottom:', insets.bottom);
  console.log('📏 Tab Bar Height:', tabBarHeight);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          height: tabBarHeight,
          backgroundColor: COLORS.white,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Rechercher',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={ShoppingCartScreen}
        options={{
          tabBarLabel: 'Panier',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
          tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.accent,
            color: COLORS.white,
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrderHistoryScreen}
        options={{
          tabBarLabel: 'Commandes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Composant wrapper pour les notifications (doit être à l'intérieur du NavigationContainer)
function NotificationWrapper({ isAuthenticated }) {
  // Configurer les notifications en arrière-plan
  useBackgroundNotifications();
  
  // Activer les notifications push si l'utilisateur est authentifié
  useNotifications(isAuthenticated);
  
  return null; // Ce composant ne rend rien
}

// Navigateur principal
export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadAuth, user } = useAuthStore();
  const navigationRef = useRef(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  
  const logNavState = (label) => {
    const route = navigationRef.current?.getCurrentRoute?.();
    console.log('🧭 AppNavigator - Navigation state:', {
      label,
      routeName: route?.name,
      routeParams: route?.params,
      isAuthenticated,
      isLoading,
    });
  };

  useEffect(() => {
    // Charger l'auth avec un timeout de sécurité
    const loadAuthWithTimeout = async () => {
      try {
        await Promise.race([
          loadAuth(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
          ),
        ]);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'auth:', error);
        // Forcer isLoading à false même en cas d'erreur
        useAuthStore.setState({ isLoading: false });
      } finally {
        setIsBootstrapping(false);
      }
    };
    
    loadAuthWithTimeout();
  }, []);

  // Log pour vérifier les re-renders
  useEffect(() => {
    console.log('🔄 AppNavigator re-render:', { isAuthenticated, isLoading, user: user?.id });
  }, [isAuthenticated, isLoading, user]);

  // Réinitialiser la navigation vers Home quand l'app démarre avec un utilisateur authentifié
  useEffect(() => {
    if (isAuthenticated && !isBootstrapping && navigationRef.current) {
      // Petit délai pour laisser la navigation se configurer
      const timer = setTimeout(() => {
        const currentRoute = navigationRef.current?.getCurrentRoute?.();
        console.log('🔄 Current route after auth:', currentRoute?.name);
        
        // Si on est sur MainTabs mais pas sur Home, naviguer vers Home
        if (currentRoute?.name === 'Profile' || currentRoute?.name === 'Cart' || 
            currentRoute?.name === 'Orders' || currentRoute?.name === 'Search') {
          console.log('🏠 Resetting to Home tab');
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }] } }],
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isBootstrapping]);

  // 🚫 SUPPRESSION DE LA NAVIGATION AUTOMATIQUE
  // La navigation est maintenant gérée par OTPVerificationScreen
  // et ProfileCreationScreen directement

  if (isBootstrapping) {
    return <SplashScreen />;
  }

  // Déterminer la route initiale
  const getInitialRoute = () => {
    console.log('🏠 getInitialRoute called:', { isAuthenticated, user: user?.id, full_name: user?.full_name, isNewUser: user?.isNewUser });
    if (isAuthenticated) {
      const hasFullName = user?.full_name && user.full_name.trim().length > 0;
      const hasFirstLastName = user?.first_name && user?.last_name;
      const hasProfile = hasFullName || hasFirstLastName;
      // Compte existant (session rechargée) : aller à l'accueil même si getMyProfile a échoué (réseau)
      const isExistingAccount = user?.id && user?.isNewUser !== true;
      const route = hasProfile || isExistingAccount ? 'MainTabs' : 'ProfileCreation';
      console.log('🏠 Route déterminée:', route, { hasProfile, isExistingAccount });
      return route;
    }
    // 🔥 CORRECTION : Commencer par OnboardingWelcome pour les nouveaux utilisateurs
    return 'OnboardingWelcome';
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => logNavState('ready')}
        onStateChange={() => logNavState('state_change')}
      >
      {/* Wrapper pour les notifications - doit être à l'intérieur du NavigationContainer */}
      <NotificationWrapper isAuthenticated={isAuthenticated} />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
        }}
        initialRouteName={getInitialRoute()}
      >
        {/* 🔐 GROUPE AUTHENTIFICATION & ONBOARDING (Non authentifié) */}
        {!isAuthenticated && (
          <Stack.Group screenOptions={{ gestureEnabled: false }}>
            {/* 🔥 1. Écran de bienvenue (première étape) */}
            <Stack.Screen 
              name="OnboardingWelcome" 
              component={OnboardingWelcomeScreen}
            />
            {/* 🔥 2. Entrée du numéro de téléphone */}
            <Stack.Screen 
              name="PhoneEntry" 
              component={PhoneEntryScreen}
            />
            {/* 🔥 3. Vérification OTP */}
            <Stack.Screen 
              name="OTPVerification" 
              component={OTPVerificationScreen}
              options={{ gestureEnabled: true }}
            />
          </Stack.Group>
        )}
        
        {/* 🔥 ÉCRANS AUTHENTIFIÉS */}
        {isAuthenticated && (
          <>
            {/* 🔥 4. Création de profil (après OTP pour nouveaux utilisateurs) */}
            <Stack.Screen 
              name="ProfileCreation" 
              component={ProfileCreationScreen}
              options={{ 
                headerShown: false,
                gestureEnabled: false  // Empêcher le retour arrière
              }}
            />

            {/* 🏠 ÉCRAN PRINCIPAL */}
            <Stack.Screen name="MainTabs" component={MainTabs} />

            {/* 🍽️ GROUPE RESTAURANT & PLATS */}
            <Stack.Group>
              <Stack.Screen
                name="RestaurantDetail"
                component={RestaurantDetailScreen}
                options={{ headerShown: true, title: 'Restaurant' }}
              />
              <Stack.Screen
                name="DishInformation"
                component={DishInformationScreen}
                options={{ headerShown: true, title: 'Détails du plat' }}
              />
              <Stack.Screen
                name="CustomizeDish"
                component={CustomizeDishScreen}
                options={{ headerShown: true, title: 'Personnaliser' }}
              />
              <Stack.Screen
                name="RestaurantClosed"
                component={RestaurantClosedScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>

            {/* 🛒 GROUPE PANIER & CHECKOUT */}
            <Stack.Group>
              <Stack.Screen
                name="Checkout"
                component={CheckoutScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AddressSelection"
                component={AddressSelectionScreen}
                options={{ headerShown: true, title: 'Choisir une adresse' }}
              />
              <Stack.Screen
                name="PaymentMethod"
                component={PaymentMethodScreen}
                options={{ headerShown: true, title: 'Méthode de paiement' }}
              />
            </Stack.Group>

            {/* 📦 GROUPE COMMANDES */}
            <Stack.Group>
              <Stack.Screen
                name="OrderTracking"
                component={OrderTrackingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OrderChat"
                component={OrderChatScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OrderConfirmation"
                component={OrderConfirmationScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OrderDetails"
                component={OrderDetailsScreen}
                options={{ headerShown: true, title: 'Détails de la commande' }}
              />
              <Stack.Screen
                name="OrderReview"
                component={OrderReviewScreen}
                options={{ headerShown: true, title: 'Évaluer la commande' }}
              />
              <Stack.Screen
                name="OrderReceipt"
                component={OrderReceiptScreen}
                options={{ headerShown: true, title: 'Reçu' }}
              />
              <Stack.Screen
                name="TrackingPreparing"
                component={TrackingPreparingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TrackingDriverAssigned"
                component={TrackingDriverAssignedScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TrackingOutForDelivery"
                component={TrackingOutForDeliveryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="DeliveryArrival"
                component={DeliveryArrivalScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>

            {/* 👤 GROUPE PROFIL */}
            <Stack.Group>
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerShown: true, title: 'Modifier le profil' }}
              />
              <Stack.Screen
                name="DeleteAccountConfirmation"
                component={DeleteAccountConfirmationScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>

            {/* 📍 GROUPE ADRESSES */}
            <Stack.Group>
              <Stack.Screen
                name="ManageAddresses"
                component={ManageAddressesScreen}
                options={{ headerShown: true, title: 'Mes adresses' }}
              />
              <Stack.Screen
                name="AddAddress"
                component={AddAddressScreen}
                options={{ headerShown: true, title: 'Ajouter une adresse' }}
              />
              <Stack.Screen
                name="MapLocationSelector"
                component={MapLocationSelectorScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="LocationAccessPermission"
                component={LocationAccessPermissionScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>

            {/* 💳 GROUPE PAIEMENTS */}
            <Stack.Group>
              <Stack.Screen
                name="ManagePaymentMethods"
                component={ManagePaymentMethodsScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>

            {/* 🔍 GROUPE RECHERCHE */}
            <Stack.Group>
              <Stack.Screen
                name="CategoryResults"
                component={CategoryResultsScreen}
                options={{ headerShown: true }}
              />
            </Stack.Group>

            {/* ⭐ GROUPE FAVORIS */}
            <Stack.Group>
              <Stack.Screen
                name="Favorites"
                component={FavoritesScreen}
                options={{ headerShown: true, title: 'Mes favoris' }}
              />
            </Stack.Group>

            {/* ⚙️ GROUPE PARAMÈTRES */}
            <Stack.Group>
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="NotificationPreferences"
                component={NotificationPreferencesScreen}
                options={{ headerShown: true, title: 'Préférences de notifications' }}
              />
              <Stack.Screen
                name="LanguageSettings"
                component={LanguageSettingsScreen}
                options={{ headerShown: true, title: 'Langue' }}
              />
              <Stack.Screen
                name="AccountSecurity"
                component={AccountSecurityScreen}
                options={{ headerShown: true, title: 'Sécurité du compte' }}
              />
              <Stack.Screen
                name="SafetySecurityTips"
                component={SafetySecurityTipsScreen}
                options={{ headerShown: true, title: 'Conseils de sécurité' }}
              />
              <Stack.Screen
                name="DataStorage"
                component={DataStorageScreen}
                options={{ headerShown: true, title: 'Données et stockage' }}
              />
              <Stack.Screen
                name="SettingsUpdateSuccess"
                component={SettingsUpdateSuccessScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>

            {/* 🎁 GROUPE FIDÉLITÉ & RÉCOMPENSES */}
            <Stack.Group>
              <Stack.Screen
                name="LoyaltyDashboard"
                component={LoyaltyDashboardScreen}
                options={{ headerShown: true, title: 'Fidélité & Récompenses' }}
              />
              <Stack.Screen
                name="PointsHistory"
                component={PointsHistoryScreen}
                options={{ headerShown: true, title: 'Historique des points' }}
              />
              <Stack.Screen
                name="ReferralProgram"
                component={ReferralProgramScreen}
                options={{ headerShown: true, title: 'Programme de parrainage' }}
              />
              <Stack.Screen
                name="ReferralHistory"
                component={ReferralHistoryScreen}
                options={{ headerShown: true, title: 'Historique parrainage' }}
              />
            </Stack.Group>

            {/* 🆘 GROUPE SUPPORT & AIDE */}
            <Stack.Group>
              <Stack.Screen
                name="HelpCenter"
                component={HelpCenterScreen}
                options={{ headerShown: true, title: 'Centre d\'aide' }}
              />
              <Stack.Screen
                name="ContactSupport"
                component={ContactSupportScreen}
                options={{ headerShown: true, title: 'Support' }}
              />
              <Stack.Screen
                name="LiveChatSupport"
                component={LiveChatSupportScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ReportProblem"
                component={ReportProblemScreen}
                options={{ headerShown: true, title: 'Signaler un problème' }}
              />
              <Stack.Screen
                name="MyClaimsTracking"
                component={MyClaimsTrackingScreen}
                options={{ headerShown: true, title: 'Mes réclamations' }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ClaimTicketDetails"
                component={ClaimTicketDetailsScreen}
                options={{ headerShown: true, title: 'Détails du ticket' }}
              />
              <Stack.Screen
                name="SupportFeedbackSuccess"
                component={SupportFeedbackSuccessScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>

            {/* ℹ️ GROUPE INFORMATIONS */}
            <Stack.Group>
              <Stack.Screen
                name="AboutBaibebalo"
                component={AboutBaibebaloScreen}
                options={{ headerShown: true, title: 'À propos' }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{ headerShown: true, title: 'Politique de confidentialité' }}
              />
            </Stack.Group>

            {/* ⚠️ GROUPE ERREURS */}
            <Stack.Group>
              <Stack.Screen
                name="NetworkError"
                component={NetworkErrorScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ServerError"
                component={ServerErrorScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EmptyCart"
                component={EmptyCartScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ItemOutOfStock"
                component={ItemOutOfStockScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EmptyOrderHistory"
                component={EmptyOrderHistoryScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>

            {/* 🔧 GROUPE SYSTÈME */}
            <Stack.Group>
              <Stack.Screen
                name="AppMaintenance"
                component={AppMaintenanceScreen}
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="UpdateRequired"
                component={UpdateRequiredScreen}
                options={{ headerShown: false, gestureEnabled: false }}
              />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}