import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GuestLayout } from '@/components/layout/GuestLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const OtpLoginPage = lazy(() => import('@/pages/auth/OtpLoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const KycScanPage = lazy(() => import('@/pages/kyc/KycScanPage'));

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ApplicationListPage = lazy(() => import('@/pages/dashboard/ApplicationListPage'));
const ApplicationWizardPage = lazy(() => import('@/pages/dashboard/ApplicationWizardPage'));
const ApplicationSuccessPage = lazy(() => import('@/pages/dashboard/ApplicationSuccessPage'));
const SalaryDetailPage = lazy(() => import('@/pages/dashboard/SalaryDetailPage'));
const PaymentDetailPage = lazy(() => import('@/pages/dashboard/PaymentDetailPage'));
const CreditsDetailPage = lazy(() => import('@/pages/dashboard/CreditsDetailPage'));

const SimulatorPage = lazy(() => import('@/pages/simulator/SimulatorPage'));
const SimulatorFormPage = lazy(() => import('@/pages/simulator/SimulatorFormPage'));
const SimulatorResultPage = lazy(() => import('@/pages/simulator/SimulatorResultPage'));
const AdvancedCalculatorPage = lazy(() => import('@/pages/simulator/AdvancedCalculatorPage'));

const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const FinancialDataPage = lazy(() => import('@/pages/profile/FinancialDataPage'));
const NotificationSettingsPage = lazy(() => import('@/pages/profile/NotificationSettingsPage'));
const BcReportPage = lazy(() => import('@/pages/profile/BcReportPage'));

const KycFormPage = lazy(() => import('@/pages/kyc/KycFormPage'));
const KycAdminPage = lazy(() => import('@/pages/kyc/KycAdminPage'));

const ConsentManagementPage = lazy(() => import('@/pages/management/ConsentManagementPage'));
const MandateManagementPage = lazy(() => import('@/pages/management/MandateManagementPage'));

const BrokerDirectoryPage = lazy(() => import('@/pages/broker/BrokerDirectoryPage'));
const ScheduleCallPage = lazy(() => import('@/pages/broker/ScheduleCallPage'));
const InvoicingPage = lazy(() => import('@/pages/invoicing/InvoicingPage'));

// Public pages (no auth required)
const AboutPage = lazy(() => import('@/pages/about/AboutPage'));
const LegalAllPage = lazy(() => import('@/pages/legal/LegalAllPage'));
const LegalMenuPage = lazy(() => import('@/pages/legal/LegalMenuPage'));
const PublicBrokerSearchPage = lazy(() => import('@/pages/broker/PublicBrokerSearchPage'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminApplicationsPage = lazy(() => import('@/pages/admin/AdminApplicationsPage'));
const AdminKycPage = lazy(() => import('@/pages/admin/AdminKycPage'));
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'));
const AdminBrokersPage = lazy(() => import('@/pages/admin/AdminBrokersPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Public KYC scan page (phone browser, no layout) */}
        <Route path="/kyc/scan/:token" element={<KycScanPage />} />

        {/* Public pages (accessible to everyone, with PublicLayout) */}
        <Route element={<PublicLayout />}>
          <Route path="/despre" element={<AboutPage />} />
          <Route path="/verifica-broker" element={<PublicBrokerSearchPage />} />
          <Route path="/legal" element={<LegalAllPage />} />
        </Route>

        {/* Guest routes */}
        <Route element={<GuestLayout />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/otp-login" element={<OtpLoginPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Onboarding (protected but no AppLayout) */}
        <Route path="/onboarding" element={<ProtectedRoute skipOnboardingCheck><OnboardingPage /></ProtectedRoute>} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/applications" element={<ApplicationListPage />} />
          <Route path="/dashboard/apply" element={<ApplicationWizardPage />} />
          <Route path="/dashboard/success" element={<ApplicationSuccessPage />} />
          <Route path="/dashboard/salary-detail" element={<SalaryDetailPage />} />
          <Route path="/dashboard/payment-detail" element={<PaymentDetailPage />} />
          <Route path="/dashboard/credits-detail" element={<CreditsDetailPage />} />

          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/simulator/form" element={<SimulatorFormPage />} />
          <Route path="/simulator/result" element={<SimulatorResultPage />} />
          <Route path="/simulator/advanced" element={<AdvancedCalculatorPage />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/financial" element={<FinancialDataPage />} />
          <Route path="/profile/notifications" element={<NotificationSettingsPage />} />
          <Route path="/profile/kyc" element={<KycFormPage />} />
          <Route path="/profile/bc-report" element={<BcReportPage />} />
          <Route path="/profile/kyc-admin" element={<ProtectedRoute adminOnly><KycAdminPage /></ProtectedRoute>} />

          <Route path="/profile/legal" element={<LegalMenuPage />} />

          <Route path="/profile/consents" element={<ConsentManagementPage />} />
          <Route path="/profile/mandates" element={<MandateManagementPage />} />
          <Route path="/profile/brokers" element={<BrokerDirectoryPage />} />
          <Route path="/profile/schedule-call" element={<ScheduleCallPage />} />
          <Route path="/profile/invoicing" element={<InvoicingPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/applications" element={<ProtectedRoute adminOnly><AdminApplicationsPage /></ProtectedRoute>} />
          <Route path="/admin/kyc" element={<ProtectedRoute adminOnly><AdminKycPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AdminReportsPage /></ProtectedRoute>} />
          <Route path="/admin/brokers" element={<ProtectedRoute adminOnly><AdminBrokersPage /></ProtectedRoute>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
