import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
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
  OpeningHoursScreenSafe = function OpeningHoursPlaceholder() { return null; };
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

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
          tabBarBadge: null, // Sera géré dynamiquement
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
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
        invalidateSettingsCache(); // Forcer une requête fraîche
        const maintenanceMode = await checkMaintenanceMode();
        console.log('[AppNavigator] Mode maintenance:', maintenanceMode);
        setIsMaintenanceMode(maintenanceMode);
      } catch (error) {
        console.error('[AppNavigator] Erreur vérification maintenance:', error);
        setIsMaintenanceMode(false);
      } finally {
        setIsCheckingMaintenance(false);
      }
    };

    checkMaintenance();

    // Polling toutes les 30 secondes pour détecter les changements de mode maintenance
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
