import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AlertsProvider } from './contexts/AlertsContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Restaurants from './pages/Restaurants';
import Support from './pages/Support';
import Finances from './pages/Finances';
import TestCharts from './pages/TestCharts';
import OrderDetails from './pages/OrderDetails';
import UserDetails from './pages/UserDetails';
import TicketDetails from './pages/TicketDetails';
import Analytics from './pages/Analytics';
import ValidateRestaurant from './pages/ValidateRestaurant';
import RestaurantPerformance from './pages/RestaurantPerformance';
import DeliveryPerformance from './pages/DeliveryPerformance';
import FunnelConversion from './pages/FunnelConversion';
import TemporalAnalysis from './pages/TemporalAnalysis';
import GeographicHeatmap from './pages/GeographicHeatmap';
import PlatformSettings from './pages/PlatformSettings';
import CommissionSettings from './pages/CommissionSettings';
import DeliveryZones from './pages/DeliveryZones';
import PromoCodes from './pages/PromoCodes';
import NotificationTemplates from './pages/NotificationTemplates';
import SendNotification from './pages/SendNotification';
import PromotionalBanners from './pages/PromotionalBanners';
import BadgesRewards from './pages/BadgesRewards';
import FinancialDashboard from './pages/FinancialDashboard';
import PaymentAnalysis from './pages/PaymentAnalysis';
import CohortAnalysis from './pages/CohortAnalysis';
import Refunds from './pages/Refunds';
import KnowledgeBase from './pages/KnowledgeBase';
import KnowledgeBaseAdmin from './pages/KnowledgeBaseAdmin';
import TransactionHistory from './pages/TransactionHistory';
import FinancialReports from './pages/FinancialReports';
import ValidationHistory from './pages/ValidationHistory';
import PayoutsHistory from './pages/PayoutsHistory';
import PaymentDetails from './pages/PaymentDetails';
import BulkUserActions from './pages/BulkUserActions';
import CustomReports from './pages/CustomReports';
import Drivers from './pages/Drivers';
import BulkClientActions from './pages/BulkClientActions';
import SuspendedRestaurants from './pages/SuspendedRestaurants';
import OfflineDrivers from './pages/OfflineDrivers';
import ProblematicOrders from './pages/ProblematicOrders';
import RestaurantStatistics from './pages/RestaurantStatistics';
import RealTimeDriverTracking from './pages/RealTimeDriverTracking';
import ValidateDriver from './pages/ValidateDriver';
import OrderIntervention from './pages/OrderIntervention';
import DriverLeaderboard from './pages/DriverLeaderboard';
import PaymentMethodDetails from './pages/PaymentMethodDetails';
import KnowledgeBaseArticle from './pages/KnowledgeBaseArticle';
import AnalyticsOverview from './pages/AnalyticsOverview';
import CohortRetentionAnalysis from './pages/CohortRetentionAnalysis';
import AnalyticsErrorState from './pages/AnalyticsErrorState';
import TicketDetailsErrorState from './pages/TicketDetailsErrorState';
import DesignSystem from './pages/DesignSystem';
import PendingDriverPayments from './pages/PendingDriverPayments';
import PendingRestaurantPayments from './pages/PendingRestaurantPayments';
import AccountSettings from './pages/AccountSettings';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordFromEmail from './pages/ResetPasswordFromEmail';
import ForgotPassword from './pages/ForgotPassword';
import RestaurantDetails from './pages/RestaurantDetails';
import DriverDetails from './pages/DriverDetails';

// Créer le client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Route protégée
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AlertsProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPasswordFromEmail />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <UserDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants"
            element={
              <ProtectedRoute>
                <Restaurants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id"
            element={
              <ProtectedRoute>
                <RestaurantDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id/validate"
            element={
              <ProtectedRoute>
                <ValidateRestaurant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support/:id"
            element={
              <ProtectedRoute>
                <TicketDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support/:id/error"
            element={
              <ProtectedRoute>
                <TicketDetailsErrorState />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances"
            element={
              <ProtectedRoute>
                <Finances />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-charts"
            element={
              <ProtectedRoute>
                <TestCharts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/restaurants"
            element={
              <ProtectedRoute>
                <RestaurantPerformance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/delivery"
            element={
              <ProtectedRoute>
                <DeliveryPerformance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/funnel"
            element={
              <ProtectedRoute>
                <FunnelConversion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/temporal"
            element={
              <ProtectedRoute>
                <TemporalAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/heatmap"
            element={
              <ProtectedRoute>
                <GeographicHeatmap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/platform"
            element={
              <ProtectedRoute>
                <PlatformSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/commissions"
            element={
              <ProtectedRoute>
                <CommissionSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/delivery-zones"
            element={
              <ProtectedRoute>
                <DeliveryZones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/promo-codes"
            element={
              <ProtectedRoute>
                <PromoCodes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/notifications"
            element={
              <ProtectedRoute>
                <NotificationTemplates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications/send"
            element={
              <ProtectedRoute>
                <SendNotification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/banners"
            element={
              <ProtectedRoute>
                <PromotionalBanners />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/badges"
            element={
              <ProtectedRoute>
                <BadgesRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/dashboard"
            element={
              <ProtectedRoute>
                <FinancialDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/analysis"
            element={
              <ProtectedRoute>
                <PaymentAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/cohort"
            element={
              <ProtectedRoute>
                <CohortAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/refunds"
            element={
              <ProtectedRoute>
                <Refunds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support/knowledge-base"
            element={
              <ProtectedRoute>
                <KnowledgeBaseAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/transactions"
            element={
              <ProtectedRoute>
                <TransactionHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/payouts-history"
            element={
              <ProtectedRoute>
                <PayoutsHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/reports"
            element={
              <ProtectedRoute>
                <FinancialReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/validations/history"
            element={
              <ProtectedRoute>
                <ValidationHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/payments/details"
            element={
              <ProtectedRoute>
                <PaymentDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/payments/drivers/pending"
            element={
              <ProtectedRoute>
                <PendingDriverPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/payments/restaurants/pending"
            element={
              <ProtectedRoute>
                <PendingRestaurantPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/bulk-actions"
            element={
              <ProtectedRoute>
                <BulkUserActions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/custom"
            element={
              <ProtectedRoute>
                <CustomReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers"
            element={
              <ProtectedRoute>
                <Drivers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers/:id"
            element={
              <ProtectedRoute>
                <DriverDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/bulk-actions"
            element={
              <ProtectedRoute>
                <BulkClientActions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/suspended"
            element={
              <ProtectedRoute>
                <SuspendedRestaurants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers/offline"
            element={
              <ProtectedRoute>
                <OfflineDrivers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/problematic"
            element={
              <ProtectedRoute>
                <ProblematicOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id/statistics"
            element={
              <ProtectedRoute>
                <RestaurantStatistics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers/tracking"
            element={
              <ProtectedRoute>
                <RealTimeDriverTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers/validate"
            element={
              <ProtectedRoute>
                <ValidateDriver />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id/intervention"
            element={
              <ProtectedRoute>
                <OrderIntervention />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers/leaderboard"
            element={
              <ProtectedRoute>
                <DriverLeaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances/payments/:method"
            element={
              <ProtectedRoute>
                <PaymentMethodDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support/knowledge-base/:articleId"
            element={
              <ProtectedRoute>
                <KnowledgeBaseArticle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/overview"
            element={
              <ProtectedRoute>
                <AnalyticsOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/cohort-retention"
            element={
              <ProtectedRoute>
                <CohortRetentionAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/error"
            element={
              <ProtectedRoute>
                <AnalyticsErrorState />
              </ProtectedRoute>
            }
          />
          <Route
            path="/design-system"
            element={
              <ProtectedRoute>
                <DesignSystem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/account"
            element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/account/reset-password"
            element={
              <ProtectedRoute>
                <ResetPassword />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AlertsProvider>
    </QueryClientProvider>
  );
}

export default App;
