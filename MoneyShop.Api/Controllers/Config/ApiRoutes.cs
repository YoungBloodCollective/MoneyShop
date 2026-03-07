namespace MoneyShop.Api.Controllers.Config;

/// <summary>
/// Centralized route constants for all API endpoints.
/// </summary>
public static class ApiRoutes
{
    private const string Base = "api";

    public static class Auth
    {
        public const string Controller = $"{Base}/auth";
        public const string Register = "register";
        public const string Login = "login";
        public const string Me = "me";
        public const string SendEmailVerification = "send-email-verification";
        public const string SendPhoneVerification = "send-phone-verification";
        public const string VerifyEmail = "verify-email";
        public const string VerifyPhone = "verify-phone";
    }

    public static class Admin
    {
        public const string Controller = $"{Base}/admin";
        public const string Applications = "applications";
        public const string UpdateStatus = "applications/{{id}}/status";
        public const string UpdateDisbursement = "applications/{{id}}/disbursement";
        public const string MonthlyReport = "reports/monthly";
        public const string ExportReport = "reports/export";
    }

    public static class Applications
    {
        public const string Controller = $"{Base}/applications";
        public const string GetById = "{{id}}";
        public const string Status = "{{id}}/status";
    }

    public static class Agreements
    {
        public const string Controller = $"{Base}/agreements";
        public const string Generate = "generate";
        public const string Sign = "{{id}}/sign";
        public const string ByApplication = "application/{{applicationId}}";
        public const string GetById = "{{id}}";
    }

    public static class Banks
    {
        public const string Controller = $"{Base}/banks";
        public const string GetById = "{{id}}";
    }

    public static class Broker
    {
        public const string Controller = $"{Base}/broker";
        public const string UploadExcel = "upload-excel";
        public const string LatestDirectory = "directory/latest";
        public const string Search = "search";
    }

    public static class Chat
    {
        public const string Controller = $"{Base}/chat";
        public const string Initial = "initial";
    }

    public static class Consent
    {
        public const string Controller = $"{Base}/consent";
        public const string Grant = "grant";
        public const string List = "list";
        public const string Revoke = "revoke/{{consentId}}";
    }

    public static class Documents
    {
        public const string Controller = $"{Base}/documents";
        public const string Upload = "upload";
        public const string ByApplication = "application/{{applicationId}}";
        public const string GetById = "{{id}}";
    }

    public static class Document
    {
        public const string Controller = $"{Base}/document";
        public const string GenerateMandatePdf = "mandate/{{mandateId}}/generate-pdf";
        public const string DownloadMandatePdf = "mandate/{{mandateId}}/download";
    }

    public static class Eligibility
    {
        public const string Controller = $"{Base}/eligibility";
        public const string Simple = "simple";
        public const string Verified = "verified";
        public const string Config = "config";
    }

    public static class Health
    {
        public const string Controller = $"{Base}/health";
        public const string Ping = "ping";
    }

    public static class Kyc
    {
        public const string Controller = $"{Base}/kyc";
        public const string Start = "start";
        public const string Upload = "upload";
        public const string Status = "status";
        public const string Pending = "pending";
        public const string Details = "details/{{kycId}}";
        public const string File = "file/{{fileId}}";
        public const string UpdateFormData = "update-form-data";
        public const string UpdateStatus = "update-status";
    }

    public static class Lead
    {
        public const string Controller = $"{Base}/lead";
        public const string Capture = "capture";
        public const string Next = "next";
    }

    public static class Leads
    {
        public const string Controller = $"{Base}/leads";
        public const string GetById = "{{id}}";
        public const string Convert = "{{id}}/convert";
    }

    public static class Mandate
    {
        public const string Controller = $"{Base}/mandate";
        public const string ListByUser = "list/{{userId}}";
        public const string GetById = "{{mandateId}}";
        public const string Revoke = "{{mandateId}}/revoke";
        public const string GeneratePdf = "{{mandateId}}/generate-pdf";
        public const string Download = "{{mandateId}}/download";
        public const string Create = "create";
    }

    public static class Oblio
    {
        public const string Controller = $"{Base}/oblio";
        public const string Companies = "companies";
        public const string VatRates = "vat-rates";
        public const string Clients = "clients";
        public const string Products = "products";
        public const string Invoice = "invoice";
        public const string Proforma = "proforma";
        public const string GetDocument = "document";
        public const string CancelDocument = "document";
        public const string RestoreDocument = "document/restore";
        public const string DeleteDocument = "document/delete";
    }

    public static class Ocr
    {
        public const string Controller = $"{Base}/ocr";
        public const string ProcessId = "process-id";
    }

    public static class OpenAIPlugin
    {
        public const string Controller = $"{Base}/openai-plugin";
        public const string Info = "info";
        public const string Prompt = "prompt";
    }

    public static class Otp
    {
        public const string Controller = $"{Base}/otp";
        public const string Request = "request";
        public const string Verify = "verify";
    }

    public static class Simulator
    {
        public const string Controller = $"{Base}/simulator";
        public const string Calculate = "calculate";
    }

    public static class Subject
    {
        public const string Controller = $"{Base}/subject";
        public const string Create = "create";
        public const string Me = "me";
        public const string GetById = "{{subjectId}}";
    }

    public static class Telemetry
    {
        public const string Controller = $"{Base}/telemetry";
        public const string TrackEvent = "track-event";
        public const string TrackException = "track-exception";
    }

    public static class TestConnection
    {
        public const string Controller = $"{Base}/testconnection";
    }

    public static class DatabaseTest
    {
        public const string Controller = $"{Base}/databasetest";
        public const string Test = "test";
    }

    public static class UserFinancialData
    {
        public const string Controller = $"{Base}/userfinancialdata";
        public const string MyData = "my-data";
    }

    public static class Go2Credit
    {
        public const string Controller = $"{Base}/go2credit";
        public const string Inrolari = "inrolari";
        public const string InrolariWithDocumentsJson = "inrolari/with-documents-json";
        public const string Liveness = "inrolari/{{id}}/liveness";
        public const string AcordAnaf = "inrolari/{{id}}/acord-anaf";
        public const string SignAnaf = "inrolari/{{id}}/sign-anaf";
        public const string GetInrolare = "inrolari/{{id}}";
        public const string GetAnaf = "inrolari/{{id}}/anaf";
        public const string UploadDocuments = "inrolari/{{id}}/documents";
        public const string Webhooks = "webhooks";
    }
}
