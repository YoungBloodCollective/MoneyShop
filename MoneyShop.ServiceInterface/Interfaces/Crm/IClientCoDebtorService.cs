using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// Links a client who already signed the acord to another client of the same broker as co-debtor,
    /// with the relationship. Everything is limited to the signed-in broker's own clients; the Super
    /// Admin (no broker scope) can link two clients only when they belong to the same broker.
    /// </summary>
    public interface IClientCoDebtorService
    {
        CoDebtorsView Get(int clientUserId);

        List<CoDebtorCandidate> SearchCandidates(int clientUserId, string? q);

        Task<CoDebtorCreateResult> AddAsync(int clientUserId, CoDebtorCreateInput input);

        Task<bool> RemoveAsync(int clientUserId, int id);
    }

    public class CoDebtorCreateInput
    {
        public int CoDebtorUserId { get; set; }
        public string? Relation { get; set; }
    }

    public class CoDebtorItem
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; } = null!;
        public string? Phone { get; set; }
        public string Relation { get; set; } = null!;
        public string RelationLabel { get; set; } = null!;
        public string? AcordStatus { get; set; }
        public DateTime? AcordSignedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CoDebtorsView
    {
        public List<CoDebtorItem> CoDebtors { get; set; } = new();
        public List<CoDebtorItem> CoDebtorFor { get; set; } = new();
    }

    public class CoDebtorCandidate
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = null!;
        public string? Phone { get; set; }
        public DateTime? AcordSignedAt { get; set; }
    }

    public enum CoDebtorError
    {
        None,
        ClientNotVisible,
        InvalidRelation,
        Self,
        NoAcord,
        DifferentBroker,
        Duplicate,
    }

    public class CoDebtorCreateResult
    {
        public CoDebtorError Error { get; set; }
        public CoDebtorItem? Item { get; set; }
    }
}
