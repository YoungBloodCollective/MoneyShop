using System;
using System.Collections.Generic;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// The broker's own follow-up on a client: tasks with a reminder, the files submitted to banks
    /// (with the bank's stages) and labels to filter clients by. Everything is read and written in
    /// the signed-in broker's scope.
    /// </summary>
    public interface ICrmWorkService
    {
        CrmClientWork GetClientWork(int userId);

        CrmTaskItem AddTask(int userId, string title, DateTime dueAtUtc);
        /// <summary>Marks the task done or open again. Null when it is not in the broker's scope.</summary>
        CrmTaskItem? SetTaskDone(int taskId, bool done);
        bool DeleteTask(int taskId);

        /// <summary>Throws <see cref="InvalidOperationException"/> when the bank is not an active catalog bank (an update may keep the file's current bank even if deactivated) or the credit type is missing/invalid.</summary>
        CrmBankFileItem AddBankFile(int userId, CrmBankFileInput input);
        CrmBankFileItem? UpdateBankFile(int bankFileId, CrmBankFileInput input);
        bool DeleteBankFile(int bankFileId);

        /// <summary>Replaces the client's labels with the given ones (unknown labels are ignored).</summary>
        List<string> SetTags(int userId, IEnumerable<string> tags);

        /// <summary>Tags per client, for the client list filters.</summary>
        Dictionary<int, List<string>> GetTagsByClient();

        /// <summary>For the dashboard: every bank file and every open task, with the client's name.</summary>
        CrmWorkBoard GetBoard();

        /// <summary>Open tasks whose time has come and whose reminder was not sent yet (runs unscoped).</summary>
        List<CrmDueTaskReminder> GetDueReminders(DateTime nowUtc);
        void MarkReminderSent(int taskId, DateTime nowUtc);
    }

    public static class BankFileStatuses
    {
        public const string Trimis = "TRIMIS";
        public const string Verificari = "VERIFICARI";
        public const string Analiza = "ANALIZA";
        public const string Completari = "COMPLETARI";
        public const string AprobatFinanciar = "APROBAT_FINANCIAR";
        public const string AprobatFinal = "APROBAT_FINAL";
        public const string Disbursat = "DISBURSAT";
        public const string Respins = "RESPINS";

        /// <summary>In the order a file moves through the bank.</summary>
        public static readonly string[] All =
            { Trimis, Verificari, Analiza, Completari, AprobatFinanciar, AprobatFinal, Disbursat, Respins };

        public static bool IsValid(string? status) => status != null && Array.IndexOf(All, status) >= 0;
    }

    public static class ClientTagKeys
    {
        public const string ProblemeBc = "PROBLEME_BC";
        public const string DeRevenit = "DE_REVENIT";
        public const string Dti = "DTI";

        public static readonly string[] All = { ProblemeBc, DeRevenit, Dti };
    }

    public class CrmClientWork
    {
        public List<CrmTaskItem> Tasks { get; set; } = new();
        public List<CrmBankFileItem> BankFiles { get; set; } = new();
        public List<string> Tags { get; set; } = new();
    }

    public class CrmTaskItem
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? ClientName { get; set; }
        public string Title { get; set; } = null!;
        public DateTime DueAt { get; set; }
        public DateTime? DoneAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CrmBankFileInput
    {
        public int? BankId { get; set; }
        public string? CreditType { get; set; }
        public decimal Amount { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class CrmBankFileItem
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? ClientName { get; set; }
        public int? BankId { get; set; }
        public string BankName { get; set; } = null!;
        public string? CreditType { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = null!;
        public DateTime StatusChangedAt { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CrmWorkBoard
    {
        public List<CrmBankFileItem> BankFiles { get; set; } = new();
        public List<CrmTaskItem> OpenTasks { get; set; } = new();
    }

    /// <summary>A task whose reminder is due, for the reminder email to the broker.</summary>
    public class CrmDueTaskReminder
    {
        public int TaskId { get; set; }
        public int? BrokerProfileId { get; set; }
        public int UserId { get; set; }
        public string ClientName { get; set; } = null!;
        public string? ClientPhone { get; set; }
        public string Title { get; set; } = null!;
        public DateTime DueAt { get; set; }
    }
}
