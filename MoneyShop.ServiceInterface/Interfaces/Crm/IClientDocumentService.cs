using System;
using System.Collections.Generic;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// Documents the broker files in a client's folder. Read and written in the broker's own scope;
    /// the list never carries file content, only the download does.
    /// </summary>
    public interface IClientDocumentService
    {
        List<ClientDocumentInfo> List(int userId);
        ClientDocumentInfo Add(int userId, string folder, string? bankName, string fileName, string mimeType, byte[] content, int? uploadedByUserId);
        /// <summary>The file, when it is in the broker's scope; null otherwise.</summary>
        ClientDocumentFile? Get(int documentId);
        bool Delete(int documentId);
    }

    public static class ClientDocumentFolders
    {
        public const string Acord = "ACORD";
        public const string Venituri = "VENITURI";
        public const string Bc = "BC";
        public const string Banca = "BANCA";
        public const string Altele = "ALTELE";

        public static readonly string[] All = { Acord, Venituri, Bc, Banca, Altele };
    }

    public class ClientDocumentInfo
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Folder { get; set; } = null!;
        public string? BankName { get; set; }
        public string FileName { get; set; } = null!;
        public string MimeType { get; set; } = null!;
        public long FileSize { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ClientDocumentFile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FileName { get; set; } = null!;
        public string MimeType { get; set; } = null!;
        public byte[] Content { get; set; } = null!;
    }
}
