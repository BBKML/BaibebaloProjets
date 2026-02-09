import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import { COLORS } from '../constants/colors';
import { useNotifications } from '../hooks/useNotifications';
import { checkMaintenanceMode, invalidateSettingsCache } from '../services/settingsService';

// Écrans d'authentification
import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PhoneInputScreen from '../screens/auth/PhoneInputScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';

// Écrans d'onboarding
import PersonalInfoStep1Screen from '../screens/onboarding/PersonalInfoStep1Screen';
import PersonalInfoStep2Screen from '../screens/onboarding/PersonalInfoStep2Screen';
import VehicleSelectionScreen from '../screens/onboarding/VehicleSelectionScreen';
import DocumentUploadMotoScreen from '../screens/onboarding/DocumentUploadMotoScreen';
import DocumentUploadVeloScreen from '../screens/onboarding/DocumentUploadVeloScreen';
import MobileMoneySetupScreen from '../screens/onboarding/MobileMoneySetupScreen';
import AvailabilityScheduleScreen from '../screens/onboarding/AvailabilityScheduleScreen';

// Écrans de validation/formation
import PendingValidationScreen from '../screens/training/PendingValidationScreen';
import TrainingModulesScreen from '../screens/training/TrainingModulesScreen';
import TrainingModuleDetailScreen from '../screens/training/TrainingModuleDetailScreen';
import CertificationQuizScreen from '../screens/training/CertificationQuizScreen';
import QuizResultScreen from '../screens/training/QuizResultScreen';
import ContractSigningScreen from '../screens/training/ContractSigningScreen';
import StarterKitScreen from '../screens/training/StarterKitScreen';
import WelcomeActivatedScreen from '../screens/training/WelcomeActivatedScreen';

// Écrans principaux (tabs)
import DeliveryHomeScreen from '../screens/home/DeliveryHomeScreen';
import DeliveriesScreen from '../screens/deliveries/DeliveriesScreen';
import EarningsScreen from '../screens/earnings/EarningsScreen';
import StatsScreen from '../screens/stats/StatsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Écrans de course
import NewDeliveryAlertScreen from '../screens/deliveries/NewDeliveryAlertScreen';
import DeliveryDetailsScreen from '../screens/deliveries/DeliveryDetailsScreen';
import NavigationToRestaurantScreen from '../screens/deliveries/NavigationToRestaurantScreen';
import OrderVerificationScreen from '../screens/deliveries/OrderVerificationScreen';
import NavigationToCustomerScreen from '../screens/deliveries/NavigationToCustomerScreen';
import CashPaymentScreen from '../screens/deliveries/CashPaymentScreen';
import ConfirmationCodeScreen from '../screens/deliveries/ConfirmationCodeScreen';
import DeliverySuccessScreen from '../screens/deliveries/DeliverySuccessScreen';
import DeliveryProofPhotoScreen from '../screens/deliveries/DeliveryProofPhotoScreen';

// Écrans de gains
import EarningsDashboardScreen from '../screens/earnings/EarningsDashboardScreen';
import WeeklyEarningsScreen from '../screens/earnings/WeeklyEarningsScreen';
import MonthlyEarningsScreen from '../screens/earnings/MonthlyEarningsScreen';
import WithdrawRequestScreen from '../screens/earnings/WithdrawRequestScreen';
import PaymentHistoryScreen from '../screens/earnings/PaymentHistoryScreen';
import CashRemittanceScreen from '../screens/earnings/CashRemittanceScreen';
import CashRemittanceHistoryScreen from '../screens/earnings/CashRemittanceHistoryScreen';

// Écrans de statistiques
import PerformanceDashboardScreen from '../screens/stats/PerformanceDashboardScreen';
import RankingsScreen from '../screens/stats/RankingsScreen';
import BadgesScreen from '../screens/stats/BadgesScreen';
import CustomerRatingsScreen from '../screens/stats/CustomerRatingsScreen';
import PersonalGoalsScreen from '../screens/stats/PersonalGoalsScreen';

// Écrans de paramètres
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import UpdateDocumentsScreen from '../screens/settings/UpdateDocumentsScreen';
import AvailabilitySettingsScreen from '../screens/settings/AvailabilitySettingsScreen';
import WorkZonesScreen from '../screens/settings/WorkZonesScreen';
import DeliveryPreferencesScreen from '../screens/settings/DeliveryPreferencesScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import SecuritySettingsScreen from '../screens/settings/SecuritySettingsScreen';
import HelpCenterScreen from '../screens/settings/HelpCenterScreen';
import SupportChatScreen from '../screens/settings/SupportChatScreen';

// Écrans de problèmes
import ClientAbsentScreen from '../screens/problems/ClientAbsentScreen';
import EmergencyScreen from '../screens/problems/EmergencyScreen';
import IncidentReportScreen from '../screens/problems/IncidentReportScreen';

// Notification Center
import NotificationCenterScreen from '../screens/notifications/NotificationCenterScreen';

// Écran de maintenance
import AppMaintenanceScreen from '../screens/system/AppMaintenanceScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Pont pour les notifications : doit être rendu *dans* NavigationContainer pour que useNavigation() ne plante pas (build EAS)
function NotificationBridge() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isActivated = useAuthStore((s) => s.isActivated);
  useNotifications(isAuthenticated && isActivated);
  return null;
}

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
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DeliveryHomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Deliveries"
        component={DeliveriesScreen}
        options={{
          tabBarLabel: 'Courses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarLabel: 'Gains',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Paramètres',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { 
    isAuthenticated, 
    isLoading, 
    loadStoredAuth, 
    isActivated, 
    validationStatus, 
    trainingCompleted, 
    quizPassed, 
    contractSigned,
    pendingRegistration 
  } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const navigationRef = useRef(null);
  const [previousAuth, setPreviousAuth] = useState(false);
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
      try {
        await loadStoredAuth();
      } catch (e) {
        console.warn('[AppNavigator] loadStoredAuth error:', e?.message || e);
      }
      setIsReady(true);
      setTimeout(() => setShowSplash(false), 2000);
    };
    init();
  }, []);

  // Effet pour naviguer automatiquement quand l'authentification change
  useEffect(() => {
    if (isReady && !showSplash && navigationRef.current) {
      // Si l'utilisateur vient de se connecter (était non authentifié, maintenant authentifié)
      if (isAuthenticated && !previousAuth) {
        const targetRoute = getTargetRoute();
        console.log('Auth changed! Navigating to:', targetRoute);
        
        // Petit délai pour laisser le navigator se re-rendre
        setTimeout(() => {
          navigationRef.current?.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: targetRoute }],
            })
          );
        }, 50);
      }
      setPreviousAuth(isAuthenticated);
    }
  }, [isAuthenticated, isReady, showSplash]);

  if (!isReady || isLoading || showSplash || isCheckingMaintenance) {
    return <SplashScreen />;
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
  
  // Déterminer la route cible selon l'état
  const getTargetRoute = () => {
    if (validationStatus === 'pending') return 'PendingValidation';
    if (validationStatus === 'rejected') return 'PendingValidation';
    if (!trainingCompleted) return 'TrainingModules';
    if (!quizPassed) return 'CertificationQuiz';
    if (!contractSigned) return 'ContractSigning';
    if (!isActivated) return 'WelcomeActivated';
    return 'Main';
  };
  
  // Déterminer où envoyer l'utilisateur selon son état (pour initialRouteName)
  const getInitialRoute = () => {
    // Si inscription soumise mais pas encore validée (pas de token)
    if (pendingRegistration && !isAuthenticated) return 'PendingValidation';
    if (!isAuthenticated) return 'Welcome';
    return getTargetRoute();
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <NotificationBridge />
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={getInitialRoute()}
      >
        {!isAuthenticated ? (
          // Écrans non authentifiés
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="PersonalInfoStep1" component={PersonalInfoStep1Screen} />
            <Stack.Screen name="PersonalInfoStep2" component={PersonalInfoStep2Screen} />
            <Stack.Screen name="VehicleSelection" component={VehicleSelectionScreen} />
            <Stack.Screen name="DocumentUploadMoto" component={DocumentUploadMotoScreen} />
            <Stack.Screen name="DocumentUploadVelo" component={DocumentUploadVeloScreen} />
            <Stack.Screen name="MobileMoneySetup" component={MobileMoneySetupScreen} />
            <Stack.Screen name="AvailabilitySchedule" component={AvailabilityScheduleScreen} />
            {/* Écran de validation en attente (accessible sans token) */}
            <Stack.Screen name="PendingValidation" component={PendingValidationScreen} />
          </>
        ) : (
          // Écrans authentifiés
          <>
            {/* Écrans de validation/formation */}
            <Stack.Screen name="PendingValidation" component={PendingValidationScreen} />
            <Stack.Screen name="TrainingModules" component={TrainingModulesScreen} />
            <Stack.Screen name="TrainingModuleDetail" component={TrainingModuleDetailScreen} />
            <Stack.Screen name="CertificationQuiz" component={CertificationQuizScreen} />
            <Stack.Screen name="QuizResult" component={QuizResultScreen} />
            <Stack.Screen name="ContractSigning" component={ContractSigningScreen} />
            <Stack.Screen name="StarterKit" component={StarterKitScreen} />
            <Stack.Screen name="WelcomeActivated" component={WelcomeActivatedScreen} />
            
            {/* Écran principal avec tabs */}
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* Écrans de course */}
            <Stack.Screen 
              name="NewDeliveryAlert" 
              component={NewDeliveryAlertScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
            <Stack.Screen name="NavigationToRestaurant" component={NavigationToRestaurantScreen} />
            <Stack.Screen name="OrderVerification" component={OrderVerificationScreen} />
            <Stack.Screen name="NavigationToCustomer" component={NavigationToCustomerScreen} />
            <Stack.Screen name="CashPayment" component={CashPaymentScreen} />
            <Stack.Screen name="ConfirmationCode" component={ConfirmationCodeScreen} />
            <Stack.Screen name="DeliveryProofPhoto" component={DeliveryProofPhotoScreen} />
            <Stack.Screen 
              name="DeliverySuccess" 
              component={DeliverySuccessScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
            
            {/* Écrans de gains */}
            <Stack.Screen name="EarningsDashboard" component={EarningsDashboardScreen} />
            <Stack.Screen name="WeeklyEarnings" component={WeeklyEarningsScreen} />
            <Stack.Screen name="MonthlyEarnings" component={MonthlyEarningsScreen} />
            <Stack.Screen name="WithdrawRequest" component={WithdrawRequestScreen} />
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
            <Stack.Screen name="CashRemittance" component={CashRemittanceScreen} />
            <Stack.Screen name="CashRemittanceHistory" component={CashRemittanceHistoryScreen} />
            
            {/* Écrans de statistiques */}
            <Stack.Screen name="PerformanceDashboard" component={PerformanceDashboardScreen} />
            <Stack.Screen name="Rankings" component={RankingsScreen} />
            <Stack.Screen name="Badges" component={BadgesScreen} />
            <Stack.Screen name="CustomerRatings" component={CustomerRatingsScreen} />
            <Stack.Screen name="PersonalGoals" component={PersonalGoalsScreen} />
            
            {/* Écrans de paramètres */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="UpdateDocuments" component={UpdateDocumentsScreen} />
            <Stack.Screen name="AvailabilitySettings" component={AvailabilitySettingsScreen} />
            <Stack.Screen name="WorkZones" component={WorkZonesScreen} />
            <Stack.Screen name="DeliveryPreferences" component={DeliveryPreferencesScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
            <Stack.Screen name="SupportChat" component={SupportChatScreen} />
            
            {/* Écrans de problèmes */}
            <Stack.Screen 
              name="ClientAbsent" 
              component={ClientAbsentScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="Emergency" 
              component={EmergencyScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
            
            {/* Notifications */}
            <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
