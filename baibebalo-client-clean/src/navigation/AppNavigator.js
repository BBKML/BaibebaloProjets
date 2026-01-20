import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';

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

import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation principale avec tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
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

// Navigateur principal
export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadAuth, user } = useAuthStore();
  const navigationRef = useRef(null);

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
        const { setState } = useAuthStore.getState();
        setState({ isLoading: false });
      }
    };
    
    loadAuthWithTimeout();
  }, []);

  // Log pour vérifier les re-renders
  useEffect(() => {
    console.log('🔄 AppNavigator re-render:', { isAuthenticated, isLoading, user: user?.id });
  }, [isAuthenticated, isLoading, user]);

  // Navigation automatique quand l'authentification change
  const prevAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    // Ne naviguer que si on passe de non-authentifié à authentifié
    const wasAuthenticated = prevAuthenticatedRef.current;
    prevAuthenticatedRef.current = isAuthenticated;
    
    if (!isLoading && navigationRef.current && isAuthenticated && !wasAuthenticated) {
      // Vérifier si l'utilisateur a un profil complet
      // Le backend peut utiliser full_name ou first_name/last_name
      const hasFullName = user?.full_name && user.full_name.trim().length > 0;
      const hasFirstLastName = user?.first_name && user?.last_name;
      const hasProfile = hasFullName || hasFirstLastName;
      
      console.log('📱 Vérification profil:', { 
        hasFullName, 
        hasFirstLastName, 
        hasProfile,
        user: user ? { id: user.id, full_name: user.full_name, first_name: user.first_name, last_name: user.last_name } : null
      });
      
      if (hasProfile) {
        console.log('✅ Navigation automatique vers MainTabs (profil complet)');
        setTimeout(() => {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }, 100);
      } else {
        console.log('✅ Navigation automatique vers ProfileCreation (profil incomplet)');
        setTimeout(() => {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'ProfileCreation' }],
          });
        }, 100);
      }
    }
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    return <SplashScreen />;
  }

  // Déterminer la route initiale
  const getInitialRoute = () => {
    if (isAuthenticated) {
      // Le backend peut utiliser full_name ou first_name/last_name
      const hasFullName = user?.full_name && user.full_name.trim().length > 0;
      const hasFirstLastName = user?.first_name && user?.last_name;
      const hasProfile = hasFullName || hasFirstLastName;
      return hasProfile ? 'MainTabs' : 'ProfileCreation';
    }
    return 'PhoneEntry';
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={getInitialRoute()}
      >
        {/* Écrans d'authentification et onboarding */}
        <Stack.Screen 
          name="OnboardingWelcome" 
          component={OnboardingWelcomeScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="PhoneEntry" 
          component={PhoneEntryScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="OTPVerification" 
          component={OTPVerificationScreen}
          options={{ gestureEnabled: true }}
        />
        <Stack.Screen 
          name="ProfileCreation" 
          component={ProfileCreationScreen}
          options={{ headerShown: true, title: 'Création du profil' }}
        />
        
        {/* Écrans principaux */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="RestaurantDetail"
          component={RestaurantDetailScreen}
          options={{ headerShown: true, title: 'Restaurant' }}
        />
        <Stack.Screen
          name="ShoppingCart"
          component={ShoppingCartScreen}
          options={{ headerShown: true, title: 'Panier' }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{ headerShown: true, title: 'Commande' }}
        />
        <Stack.Screen
          name="OrderTracking"
          component={OrderTrackingScreen}
          options={{ headerShown: true, title: 'Suivi de commande' }}
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
          name="EditProfile"
          component={EditProfileScreen}
          options={{ headerShown: true, title: 'Modifier le profil' }}
        />
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
          name="AddressSelection"
          component={AddressSelectionScreen}
          options={{ headerShown: true, title: 'Sélectionner une adresse' }}
        />
        <Stack.Screen
          name="PaymentMethod"
          component={PaymentMethodScreen}
          options={{ headerShown: true, title: 'Méthode de paiement' }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ headerShown: true, title: 'Recherche' }}
        />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ headerShown: true, title: 'Mes favoris' }}
        />
        <Stack.Screen
          name="CustomizeDish"
          component={CustomizeDishScreen}
          options={{ headerShown: true, title: 'Personnaliser' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: 'Paramètres' }}
        />
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
          name="LoyaltyDashboard"
          component={LoyaltyDashboardScreen}
          options={{ headerShown: true, title: 'Fidélité & Récompenses' }}
        />
        <Stack.Screen
          name="DishInformation"
          component={DishInformationScreen}
          options={{ headerShown: true, title: 'Détails du plat' }}
        />
        <Stack.Screen
          name="CategoryResults"
          component={CategoryResultsScreen}
          options={{ headerShown: true }}
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
          name="ReferralProgram"
          component={ReferralProgramScreen}
          options={{ headerShown: true, title: 'Programme de parrainage' }}
        />
        <Stack.Screen
          name="PointsHistory"
          component={PointsHistoryScreen}
          options={{ headerShown: true, title: 'Historique des points' }}
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
          name="TrackingDriverAssigned"
          component={TrackingDriverAssignedScreen}
          options={{ headerShown: true, title: 'Suivi de commande' }}
        />
        <Stack.Screen
          name="TrackingOutForDelivery"
          component={TrackingOutForDeliveryScreen}
          options={{ headerShown: true, title: 'En route' }}
        />
        <Stack.Screen
          name="DeliveryArrival"
          component={DeliveryArrivalScreen}
          options={{ headerShown: true, title: 'Livraison' }}
        />
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
          name="AboutBaibebalo"
          component={AboutBaibebaloScreen}
          options={{ headerShown: true, title: 'À propos' }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ headerShown: true, title: 'Politique de confidentialité' }}
        />
        <Stack.Screen
          name="DataStorage"
          component={DataStorageScreen}
          options={{ headerShown: true, title: 'Données et stockage' }}
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
        <Stack.Screen
          name="OrderReceipt"
          component={OrderReceiptScreen}
          options={{ headerShown: true, title: 'Reçu de commande' }}
        />
        <Stack.Screen
          name="MyClaimsTracking"
          component={MyClaimsTrackingScreen}
          options={{ headerShown: true, title: 'Mes réclamations' }}
        />
        <Stack.Screen
          name="ClaimTicketDetails"
          component={ClaimTicketDetailsScreen}
          options={{ headerShown: true, title: 'Détails du ticket' }}
        />
        <Stack.Screen
          name="DeleteAccountConfirmation"
          component={DeleteAccountConfirmationScreen}
          options={{ headerShown: true, title: 'Supprimer le compte' }}
        />
        <Stack.Screen
          name="ReferralHistory"
          component={ReferralHistoryScreen}
          options={{ headerShown: true, title: 'Historique parrainage' }}
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
        <Stack.Screen
          name="SupportFeedbackSuccess"
          component={SupportFeedbackSuccessScreen}
          options={{ headerShown: false }}
        />
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
        <Stack.Screen
          name="SettingsUpdateSuccess"
          component={SettingsUpdateSuccessScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RestaurantClosed"
          component={RestaurantClosedScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SafetySecurityTips"
          component={SafetySecurityTipsScreen}
          options={{ headerShown: true, title: 'Conseils de sécurité' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
