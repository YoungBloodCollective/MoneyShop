import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GuestLayout } from '@/components/layout/GuestLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { CrmLayout } from '@/components/crm/CrmLayout';
import { LegacyAdminPanel } from '@/components/crm/LegacyAdminPanel';
import { ProtectedRoute } from './ProtectedRoute';
import { useBroker } from '@/context/brokerContextValue';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'));
const BrokerHomePage = lazy(() => import('@/pages/broker-home/BrokerHomePage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const OtpLoginPage = lazy(() => import('@/pages/auth/OtpLoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const KycScanPage = lazy(() => import('@/pages/kyc/KycScanPage'));
const FullKycPage = lazy(() => import('@/pages/kyc/FullKycPage'));

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
const ThankYouPage = lazy(() => import('@/pages/public/ThankYouPage'));
const BookingManagePage = lazy(() => import('@/pages/public/BookingManagePage'));
const LegalMenuPage = lazy(() => import('@/pages/legal/LegalMenuPage'));
const PublicBrokerSearchPage = lazy(() => import('@/pages/broker/PublicBrokerSearchPage'));
const AcordClientPage = lazy(() => import('@/pages/acord/AcordClientPage'));
const BankConsentPage = lazy(() => import('@/pages/bank-consent/BankConsentPage'));
const BrokerInvitePage = lazy(() => import('@/pages/broker-invite/BrokerInvitePage'));

const SuperAdminInboxPage = lazy(() => import('@/pages/admin/SuperAdminInboxPage'));
const AdminApplicationsPage = lazy(() => import('@/pages/admin/AdminApplicationsPage'));
const AdminKycPage = lazy(() => import('@/pages/admin/AdminKycPage'));
const AdminBrokersPage = lazy(() => import('@/pages/admin/AdminBrokersPage'));
const AdminPartnersPage = lazy(() => import('@/pages/admin/AdminPartnersPage'));
const AdminBrokerAccountsPage = lazy(() => import('@/pages/admin/AdminBrokerAccountsPage'));

const AdminDashboardPage = lazy(() => import('@/pages/crm/AdminDashboardPage'));
const CrmDashboardPage = lazy(() => import('@/pages/crm/CrmDashboardPage'));
const CrmClientsPage = lazy(() => import('@/pages/crm/CrmClientsPage'));
const CrmClientDetailPage = lazy(() => import('@/pages/crm/CrmClientDetailPage'));
const CrmDosarePage = lazy(() => import('@/pages/crm/CrmDosarePage'));
const CrmLeadsPage = lazy(() => import('@/pages/crm/CrmLeadsPage'));
const AcordToClientRedirect = lazy(() => import('@/pages/crm/AcordToClientRedirect'));
const CrmProgramariPage = lazy(() => import('@/pages/crm/CrmProgramariPage'));
const CrmRapoartePage = lazy(() => import('@/pages/crm/CrmRapoartePage'));
const CrmBanciPage = lazy(() => import('@/pages/crm/CrmBanciPage'));
const CrmSetariPage = lazy(() => import('@/pages/crm/CrmSetariPage'));
const CrmProfilPage = lazy(() => import('@/pages/crm/CrmProfilPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function HomeRoute() {
  const { profile } = useBroker();
  return profile ? <BrokerHomePage /> : <LandingPage />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<HomeRoute />} />
        {/* Pagini de destinație din Google Ads: aceeași pagină principală, cu tipul de credit preselectat */}
        <Route path="/nevoi-personale/credit" element={<HomeRoute />} />
        <Route path="/credit/ipotecar" element={<HomeRoute />} />
        <Route path="/refinantare/credit" element={<HomeRoute />} />

        {/* Public KYC scan page (phone browser, no layout) */}
        <Route path="/kyc/scan/:token" element={<KycScanPage />} />
        <Route path="/kyc/verify" element={<ProtectedRoute skipOnboardingCheck><FullKycPage /></ProtectedRoute>} />

        {/* Public client consent + document upload (shared link, no layout) */}
        <Route path="/acord" element={<AcordClientPage />} />
        <Route path="/consimtamant/:token" element={<BankConsentPage />} />

        {/* Private invitation link for a new broker (token in ?t=, removed from the URL on load) */}
        <Route path="/broker/invitatie" element={<BrokerInvitePage />} />

        {/* Thank you page for Google Ads conversion tracking */}
        <Route path="/multumim" element={<ThankYouPage />} />

        {/* Private link from the booking email: confirm / move / cancel a call */}
        <Route path="/programare/:token" element={<BookingManagePage />} />

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
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
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
          <Route path="/profile/kyc-admin" element={<ProtectedRoute superAdminOnly><KycAdminPage /></ProtectedRoute>} />

          <Route path="/profile/legal" element={<LegalMenuPage />} />

          <Route path="/profile/consents" element={<ConsentManagementPage />} />
          <Route path="/profile/mandates" element={<MandateManagementPage />} />
          <Route path="/profile/brokers" element={<BrokerDirectoryPage />} />
          <Route path="/profile/schedule-call" element={<ScheduleCallPage />} />
          <Route path="/profile/invoicing" element={<ProtectedRoute adminOnly><InvoicingPage /></ProtectedRoute>} />

        </Route>

        {/* Super Admin — the whole network, in its own workspace (same pages as the CRM, its own
            menu). Brokers who open any /admin URL are sent to their CRM by ProtectedRoute. */}
        <Route element={<ProtectedRoute superAdminOnly><CrmLayout variant="admin" /></ProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/de-atribuit" element={<SuperAdminInboxPage />} />
          <Route path="/admin/clienti" element={<CrmClientsPage />} />
          <Route path="/admin/clienti/:userId" element={<CrmClientDetailPage />} />
          <Route path="/admin/acorduri" element={<Navigate to="/admin/clienti?seg=acord" replace />} />
          <Route path="/admin/acorduri/:acordId" element={<AcordToClientRedirect />} />
          <Route path="/admin/dosare" element={<CrmDosarePage />} />
          <Route path="/admin/banci" element={<CrmBanciPage />} />
          <Route path="/admin/setari" element={<CrmSetariPage />} />
          <Route path="/admin/leaduri" element={<CrmLeadsPage />} />
          <Route path="/admin/programari" element={<CrmProgramariPage />} />
          <Route path="/admin/rapoarte" element={<CrmRapoartePage />} />
          <Route path="/admin/brokeri" element={<LegacyAdminPanel><AdminBrokerAccountsPage /></LegacyAdminPanel>} />
          <Route path="/admin/brokers" element={<LegacyAdminPanel><AdminBrokersPage /></LegacyAdminPanel>} />
          <Route path="/admin/kyc" element={<LegacyAdminPanel><AdminKycPage /></LegacyAdminPanel>} />
          <Route path="/admin/partners" element={<LegacyAdminPanel><AdminPartnersPage /></LegacyAdminPanel>} />
          <Route path="/admin/applications" element={<LegacyAdminPanel><AdminApplicationsPage /></LegacyAdminPanel>} />
          {/* Old addresses (bookmarks, emails) */}
          <Route path="/admin/leads" element={<Navigate to="/admin/leaduri" replace />} />
          <Route path="/admin/appointments" element={<Navigate to="/admin/programari" replace />} />
          <Route path="/admin/acord" element={<Navigate to="/admin/acorduri" replace />} />
          <Route path="/admin/reports" element={<Navigate to="/admin/rapoarte" replace />} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* CRM — per-broker, own light-theme shell (outside AppLayout) */}
        <Route element={<ProtectedRoute adminOnly><CrmLayout /></ProtectedRoute>}>
          <Route path="/crm" element={<CrmDashboardPage />} />
          <Route path="/crm/clienti" element={<CrmClientsPage />} />
          <Route path="/crm/clienti/:userId" element={<CrmClientDetailPage />} />
          <Route path="/crm/acorduri" element={<Navigate to="/crm/clienti?seg=acord" replace />} />
          <Route path="/crm/acorduri/:acordId" element={<AcordToClientRedirect />} />
          <Route path="/crm/programari" element={<CrmProgramariPage />} />
          <Route path="/crm/rapoarte" element={<CrmRapoartePage />} />
          <Route path="/crm/profil" element={<ProtectedRoute brokerOnly><CrmProfilPage /></ProtectedRoute>} />
          <Route path="/crm/dosare" element={<CrmDosarePage />} />
          <Route path="/crm/banci" element={<CrmBanciPage />} />
          <Route path="/crm/setari" element={<CrmSetariPage />} />
          <Route path="/crm/oferte" element={<Navigate to="/crm" replace />} />
          <Route path="/crm/leaduri" element={<CrmLeadsPage />} />
          <Route path="/crm/automatizari" element={<Navigate to="/crm" replace />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
