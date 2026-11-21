using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// The broker's uploads to a client's folder. Every read goes through the broker query filter,
    /// so a broker never lists, opens or deletes another broker's document. A document added by the
    /// Super Admin (unscoped) belongs to the client's broker.
    /// </summary>
    public class ClientDocumentService : IClientDocumentService
    {
        private readonly MoneyShopDbContext _context;

        public ClientDocumentService(MoneyShopDbContext context)
        {
            _context = context;
        }

        public List<ClientDocumentInfo> List(int userId) =>
            _context.ClientDocuments.AsNoTracking()
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new ClientDocumentInfo
                {
                    Id = d.Id,
                    UserId = d.UserId,
                    Folder = d.Folder,
                    BankName = d.BankName,
                    FileName = d.FileName,
                    MimeType = d.MimeType,
                    FileSize = d.FileSize,
                    CreatedAt = d.CreatedAt,
                })
                .ToList();

        public ClientDocumentInfo Add(int userId, string folder, string? bankName, string fileName, string mimeType, byte[] content, int? uploadedByUserId)
        {
            var doc = new ClientDocument
            {
                BrokerProfileId = OwnerFor(userId),
                UserId = userId,
                Folder = folder,
                BankName = folder == ClientDocumentFolders.Banca ? Trim(bankName, 100) : null,
                FileName = Trim(fileName, 255) ?? "document",
                MimeType = Trim(mimeType, 100) ?? "application/octet-stream",
                FileSize = content.LongLength,
                Content = content,
                UploadedByUserId = uploadedByUserId,
                CreatedAt = DateTime.UtcNow,
            };
            _context.ClientDocuments.Add(doc);
            _context.SaveChanges();
            return new ClientDocumentInfo
            {
                Id = doc.Id,
                UserId = doc.UserId,
                Folder = doc.Folder,
                BankName = doc.BankName,
                FileName = doc.FileName,
                MimeType = doc.MimeType,
                FileSize = doc.FileSize,
                CreatedAt = doc.CreatedAt,
            };
        }

        public ClientDocumentFile? Get(int documentId) =>
            _context.ClientDocuments.AsNoTracking()
                .Where(d => d.Id == documentId)
                .Select(d => new ClientDocumentFile { Id = d.Id, UserId = d.UserId, FileName = d.FileName, MimeType = d.MimeType, Content = d.Content })
                .FirstOrDefault();

        public bool Delete(int documentId)
        {
            var doc = _context.ClientDocuments.FirstOrDefault(d => d.Id == documentId);
            if (doc == null) return false;
            _context.ClientDocuments.Remove(doc);
            _context.SaveChanges();
            return true;
        }

        private int? OwnerFor(int userId)
        {
            if (_context.BrokerScopeId is > 0) return _context.BrokerScopeId;
            return _context.AcordClients.Where(a => a.UserId == userId && a.BrokerProfileId != null)
                       .OrderByDescending(a => a.CreatedAt).Select(a => a.BrokerProfileId).FirstOrDefault()
                   ?? _context.Applications.Where(a => a.UserId == userId && a.BrokerProfileId != null)
                       .OrderByDescending(a => a.UpdatedAt).Select(a => a.BrokerProfileId).FirstOrDefault();
        }

        private static string? Trim(string? value, int max)
        {
            var v = value?.Trim();
            if (string.IsNullOrEmpty(v)) return null;
            return v.Length > max ? v.Substring(0, max) : v;
        }
    }
}
