import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GuestLayout } from '@/components/layout/GuestLayout';
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

const SimulatorPage = lazy(() => import('@/pages/simulator/SimulatorPage'));
const SimulatorFormPage = lazy(() => import('@/pages/simulator/SimulatorFormPage'));
const SimulatorResultPage = lazy(() => import('@/pages/simulator/SimulatorResultPage'));

const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));

const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const FinancialDataPage = lazy(() => import('@/pages/profile/FinancialDataPage'));

const KycFormPage = lazy(() => import('@/pages/kyc/KycFormPage'));
const KycAdminPage = lazy(() => import('@/pages/kyc/KycAdminPage'));

const LegalMenuPage = lazy(() => import('@/pages/legal/LegalMenuPage'));
const TermsPage = lazy(() => import('@/pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage'));
const MandatePage = lazy(() => import('@/pages/legal/MandatePage'));
const CompliancePage = lazy(() => import('@/pages/legal/CompliancePage'));
const DataTransferPage = lazy(() => import('@/pages/legal/DataTransferPage'));

const ConsentManagementPage = lazy(() => import('@/pages/management/ConsentManagementPage'));
const MandateManagementPage = lazy(() => import('@/pages/management/MandateManagementPage'));

const BrokerDirectoryPage = lazy(() => import('@/pages/broker/BrokerDirectoryPage'));
const InvoicingPage = lazy(() => import('@/pages/invoicing/InvoicingPage'));

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

          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/simulator/form" element={<SimulatorFormPage />} />
          <Route path="/simulator/result" element={<SimulatorResultPage />} />

          <Route path="/chat" element={<ChatPage />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/financial" element={<FinancialDataPage />} />
          <Route path="/profile/kyc" element={<KycFormPage />} />
          <Route path="/profile/kyc-admin" element={<ProtectedRoute adminOnly><KycAdminPage /></ProtectedRoute>} />

          <Route path="/profile/legal" element={<LegalMenuPage />} />
          <Route path="/profile/legal/terms" element={<TermsPage />} />
          <Route path="/profile/legal/privacy" element={<PrivacyPage />} />
          <Route path="/profile/legal/mandate" element={<MandatePage />} />
          <Route path="/profile/legal/compliance" element={<CompliancePage />} />
          <Route path="/profile/legal/data-transfer" element={<DataTransferPage />} />

          <Route path="/profile/consents" element={<ConsentManagementPage />} />
          <Route path="/profile/mandates" element={<MandateManagementPage />} />
          <Route path="/profile/brokers" element={<BrokerDirectoryPage />} />
          <Route path="/profile/invoicing" element={<InvoicingPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
