using System;

namespace MoneyShop.DomainModel.Entities
{
    public static class CoDebtorRelations
    {
        public const string Sot = "Sot";
        public const string Parinte = "Parinte";
        public const string Copil = "Copil";
        public const string Frate = "Frate";
        public const string Ruda = "Ruda";
        public const string Partener = "Partener";
        public const string Altul = "Altul";

        public static bool IsValid(string? code) => Label(code) != null;

        public static string? Label(string? code) => code switch
        {
            Sot => "Soț/Soție",
            Parinte => "Părinte",
            Copil => "Copil",
            Frate => "Frate/Soră",
            Ruda => "Altă rudă",
            Partener => "Partener/ă",
            Altul => "Fără rudenie",
            _ => null,
        };

        public static string Inverse(string code) => code switch
        {
            Parinte => Copil,
            Copil => Parinte,
            _ => code,
        };
    }

    /// <summary>
    /// Another client of the same broker, one who has signed the acord, linked to a client as co-debtor.
    /// Relation is what the co-debtor is to the client (Parinte = the co-debtor is the client's parent).
    /// </summary>
    public class ClientCoDebtor : IEntity, IBrokerOwned
    {
        public int Id { get; set; }
        public int? BrokerProfileId { get; set; }
        public int ClientUserId { get; set; }
        public int CoDebtorUserId { get; set; }
        public string Relation { get; set; } = CoDebtorRelations.Altul;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int? CreatedByUserId { get; set; }
    }
}
