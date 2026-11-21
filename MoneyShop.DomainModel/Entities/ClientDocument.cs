using System;

namespace MoneyShop.DomainModel.Entities
{
    /// <summary>
    /// A document the broker added to a client's folder (income certificate, bank form, statement…),
    /// filed under a folder: ACORD, VENITURI, BC, BANCA (with <see cref="BankName"/>) or ALTELE.
    /// Kept until the broker deletes it.
    /// </summary>
    public class ClientDocument : IEntity, IBrokerOwned
    {
        public int Id { get; set; }
        public int? BrokerProfileId { get; set; }
        public int UserId { get; set; }
        public string Folder { get; set; } = null!;
        public string? BankName { get; set; }
        public string FileName { get; set; } = null!;
        public string MimeType { get; set; } = null!;
        public long FileSize { get; set; }
        public byte[] Content { get; set; } = null!;
        public int? UploadedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
