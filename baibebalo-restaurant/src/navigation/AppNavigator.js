import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import useRestaurantStore from '../store/restaurantStore';
import { COLORS } from '../constants/colors';
import { useNotifications, useBackgroundNotifications } from '../hooks/useNotifications';
import { checkMaintenanceMode, invalidateSettingsCache } from '../services/settingsService';

// Écrans d'authentification
import RestaurantLoginScreen from '../screens/auth/RestaurantLoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Écrans d'onboarding (4 étapes)
import RegisterStep1Screen from '../screens/onboarding/RegisterStep1Screen';
import RegisterStep2Screen from '../screens/onboarding/RegisterStep2Screen';
import RegisterStep3Screen from '../screens/onboarding/RegisterStep3Screen';
import RegisterStep4Screen from '../screens/onboarding/RegisterStep4Screen';
import PendingValidationScreen from '../screens/onboarding/PendingValidationScreen';
import PartnerTrainingScreen from '../screens/onboarding/PartnerTrainingScreen';
import QualificationQuizScreen from '../screens/onboarding/QualificationQuizScreen';
import AccountActivationScreen from '../screens/onboarding/AccountActivationScreen';

// Écrans principaux
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';
import UrgentOrdersViewScreen from '../screens/orders/UrgentOrdersViewScreen';
import OrderDetailsScreen from '../screens/orders/OrderDetailsScreen';
import RefuseOrderModal from '../screens/orders/RefuseOrderModal';
import PreparationTrackerScreen from '../screens/orders/PreparationTrackerScreen';
import OrderHistoryScreen from '../screens/orders/OrderHistoryScreen';
import CustomerChatScreen from '../screens/orders/CustomerChatScreen';
import MenuScreen from '../screens/menu/MenuScreen';
import AddCategoryModal from '../screens/menu/AddCategoryModal';
import AddMenuItemScreen from '../screens/menu/AddMenuItemScreen';
import EditMenuItemScreen from '../screens/menu/EditMenuItemScreen';
import ItemVariationsOptionsScreen from '../screens/menu/ItemVariationsOptionsScreen';
import DishPromotionsScreen from '../screens/menu/DishPromotionsScreen';
import BulkMenuEditScreen from '../screens/menu/BulkMenuEditScreen';
import StatisticsScreen from '../screens/statistics/StatisticsScreen';
import FinancialDashboardScreen from '../screens/finance/FinancialDashboardScreen';
import TransactionHistoryScreen from '../screens/finance/TransactionHistoryScreen';
import WithdrawalRequestScreen from '../screens/finance/WithdrawalRequestScreen';
import InvoicesReceiptsScreen from '../screens/finance/InvoicesReceiptsScreen';
import CustomerReviewsDashboardScreen from '../screens/reviews/CustomerReviewsDashboardScreen';
import ReviewsListScreen from '../screens/reviews/ReviewsListScreen';
import ReviewResponseModal from '../screens/reviews/ReviewResponseModal';
import CreateAdvancedPromotionScreen from '../screens/promotions/CreateAdvancedPromotionScreen';
import MarketingOverviewScreen from '../screens/promotions/MarketingOverviewScreen';
import DetailedStatisticsScreen from '../screens/statistics/DetailedStatisticsScreen';
import PerformanceGraphsScreen from '../screens/statistics/PerformanceGraphsScreen';
import EditRestaurantProfileScreen from '../screens/settings/EditRestaurantProfileScreen';
import PaymentInfoScreen from '../screens/settings/PaymentInfoScreen';
import NotificationPreferencesScreen from '../screens/settings/NotificationPreferencesScreen';

let OpeningHoursScreenSafe;
try {
  OpeningHoursScreenSafe = require('../screens/settings/OpeningHoursScreen').default;
} catch (_) {
  const { View, Text, StyleSheet } = require('react-native');
  OpeningHoursScreenSafe = function OpeningHoursPlaceholder({ navigation }) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 16, color: '#64748B', textAlign: 'center' }}>
          Écran des horaires temporairement indisponible.{'\n'}Veuillez réessayer plus tard.
        </Text>
        <Text
          style={{ marginTop: 16, color: '#FF6B35', fontWeight: '700' }}
          onPress={() => navigation.goBack()}
        >
          Retour
        </Text>
      </View>
    );
  };
}
import SupportHelpCenterScreen from '../screens/settings/SupportHelpCenterScreen';
import ReportProblemScreen from '../screens/settings/ReportProblemScreen';
import LiveChatSupportScreen from '../screens/settings/LiveChatSupportScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Écran de maintenance
import AppMaintenanceScreen from '../screens/system/AppMaintenanceScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation principale avec tabs
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { orders } = useRestaurantStore();
  const newOrdersCount = orders.filter(o => o.status === 'new' || o.status === 'pending').length;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Commandes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />
          ),
          tabBarBadge: newOrdersCount > 0 ? newOrdersCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.error,
            fontSize: 10,
            fontWeight: '800',
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'fast-food' : 'fast-food-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Paramètres',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
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
  
  // Activer les notifications push si le restaurant est authentifié
  useNotifications(isAuthenticated);
  
  return null; // Ce composant ne rend rien
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(true);

  // Vérifier le mode maintenance au démarrage + polling toutes les 30s
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        invalidateSettingsCache();
        const maintenanceMode = await checkMaintenanceMode();
        setIsMaintenanceMode((prev) => {
          if (__DEV__ && prev !== maintenanceMode) console.log('[AppNavigator] Mode maintenance:', maintenanceMode);
          return maintenanceMode;
        });
      } catch (error) {
        if (__DEV__) console.warn('[AppNavigator] Vérification maintenance:', error?.message);
        setIsMaintenanceMode(false);
      } finally {
        setIsCheckingMaintenance(false);
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadStoredAuth();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady || isLoading || isCheckingMaintenance) {
    return null; // Ou un SplashScreen
  }

  // Si mode maintenance activé, afficher l'écran de maintenance
  if (isMaintenanceMode) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="AppMaintenance"
            component={AppMaintenanceScreen}
            options={{ gestureEnabled: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {/* Wrapper pour les notifications - doit être à l'intérieur du NavigationContainer */}
      <NotificationWrapper isAuthenticated={isAuthenticated} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={RestaurantLoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="RegisterStep1" component={RegisterStep1Screen} />
            <Stack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
            <Stack.Screen name="RegisterStep3" component={RegisterStep3Screen} />
            <Stack.Screen name="RegisterStep4" component={RegisterStep4Screen} />
            <Stack.Screen name="PendingValidation" component={PendingValidationScreen} />
            <Stack.Screen name="PartnerTraining" component={PartnerTrainingScreen} />
            <Stack.Screen name="QualificationQuiz" component={QualificationQuizScreen} />
            <Stack.Screen name="AccountActivation" component={AccountActivationScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="UrgentOrders" component={UrgentOrdersViewScreen} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
            <Stack.Screen name="RefuseOrderModal" component={RefuseOrderModal} />
            <Stack.Screen name="PreparationTracker" component={PreparationTrackerScreen} />
            <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
            <Stack.Screen name="CustomerChat" component={CustomerChatScreen} />
            <Stack.Screen name="AddCategory" component={AddCategoryModal} />
            <Stack.Screen name="AddMenuItem" component={AddMenuItemScreen} />
            <Stack.Screen name="EditMenuItem" component={EditMenuItemScreen} />
            <Stack.Screen name="ItemVariationsOptions" component={ItemVariationsOptionsScreen} />
            <Stack.Screen name="DishPromotions" component={DishPromotionsScreen} />
            <Stack.Screen name="BulkMenuEdit" component={BulkMenuEditScreen} />
            <Stack.Screen name="FinancialDashboard" component={FinancialDashboardScreen} />
            <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
            <Stack.Screen name="WithdrawalRequest" component={WithdrawalRequestScreen} />
            <Stack.Screen name="InvoicesReceipts" component={InvoicesReceiptsScreen} />
            <Stack.Screen name="CustomerReviewsDashboard" component={CustomerReviewsDashboardScreen} />
            <Stack.Screen name="ReviewsList" component={ReviewsListScreen} />
            <Stack.Screen name="ReviewResponseModal" component={ReviewResponseModal} />
            <Stack.Screen name="CreateAdvancedPromotion" component={CreateAdvancedPromotionScreen} />
            <Stack.Screen name="MarketingOverview" component={MarketingOverviewScreen} />
            <Stack.Screen name="DetailedStatistics" component={DetailedStatisticsScreen} />
            <Stack.Screen name="PerformanceGraphs" component={PerformanceGraphsScreen} />
            <Stack.Screen name="EditRestaurantProfile" component={EditRestaurantProfileScreen} />
            <Stack.Screen name="PaymentInfo" component={PaymentInfoScreen} />
            <Stack.Screen name="OpeningHours" component={OpeningHoursScreenSafe} />
            <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
            <Stack.Screen name="SupportHelpCenter" component={SupportHelpCenterScreen} />
            <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
            <Stack.Screen name="LiveChatSupport" component={LiveChatSupportScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
