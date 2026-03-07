using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Kyc;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using KycSessionEntity = MoneyShop.DomainModel.Entities.KycSession;
using KycFileEntity = MoneyShop.DomainModel.Entities.KycFile;

namespace MoneyShop.ServiceAdapters.Services.Kyc;

public class KycService : IKycService
{
    private readonly IKycSessionRepository _kycSessionRepository;
    private readonly IKycFileRepository _kycFileRepository;
    private readonly IUserRepository _userRepository;
    private readonly MoneyShopDbContext _context;
    private const int KYC_EXPIRY_DAYS = 30;

    public KycService(
        IKycSessionRepository kycSessionRepository,
        IKycFileRepository kycFileRepository,
        IUserRepository userRepository,
        MoneyShopDbContext context)
    {
        _kycSessionRepository = kycSessionRepository;
        _kycFileRepository = kycFileRepository;
        _userRepository = userRepository;
        _context = context;
    }

    /// <summary>
    /// Starts a new KYC session for a user
    /// </summary>
    public KycSessionResult StartKycSession(int userId, string kycType = "USER_KYC")
    {
        // Check if user has an active KYC session
        var existingSession = _kycSessionRepository.Get()
            .FirstOrDefault(k => k.UserId == userId &&
                                 k.KycType == kycType &&
                                 k.Status == "pending" &&
                                 k.ExpiresAt > DateTime.UtcNow);

        if (existingSession != null)
        {
            return new KycSessionResult
            {
                KycId = existingSession.KycId,
                Status = existingSession.Status,
                CreatedAt = existingSession.CreatedAt,
                ExpiresAt = existingSession.ExpiresAt ?? DateTime.UtcNow.AddDays(KYC_EXPIRY_DAYS)
            };
        }

        // Create new KYC session
        var session = new KycSessionEntity
        {
            KycId = Guid.NewGuid(),
            UserId = userId,
            KycType = kycType,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(KYC_EXPIRY_DAYS)
        };

        _kycSessionRepository.Insert(session);
        _context.SaveChanges();

        return new KycSessionResult
        {
            KycId = session.KycId,
            Status = session.Status,
            CreatedAt = session.CreatedAt,
            ExpiresAt = session.ExpiresAt ?? DateTime.UtcNow.AddDays(KYC_EXPIRY_DAYS)
        };
    }

    /// <summary>
    /// Adds a file to a KYC session
    /// </summary>
    public KycFileResult AddKycFile(
        Guid kycId,
        int userId,
        string fileType,
        string? blobPath,
        string fileName,
        string mimeType,
        long fileSize,
        byte[] fileContent)
    {
        // Verify session belongs to user
        var session = _kycSessionRepository.Get()
            .FirstOrDefault(k => k.KycId == kycId && k.UserId == userId);

        if (session == null)
        {
            throw new UnauthorizedAccessException("KYC session not found or access denied");
        }

        if (session.Status != "pending")
        {
            throw new InvalidOperationException("Cannot add files to a KYC session that is not pending");
        }

        // Compute SHA-256 hash
        byte[] sha256Hash;
        using (var sha256 = SHA256.Create())
        {
            sha256Hash = sha256.ComputeHash(fileContent);
        }

        // Convert file content to base64
        string fileContentBase64 = Convert.ToBase64String(fileContent);

        // Create file record
        var file = new KycFileEntity
        {
            FileId = Guid.NewGuid(),
            KycId = kycId,
            FileType = fileType,
            BlobPath = blobPath,
            FileName = fileName,
            MimeType = mimeType,
            FileSize = fileSize,
            Sha256Hash = sha256Hash,
            FileContentBase64 = fileContentBase64,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(KYC_EXPIRY_DAYS)
        };

        try
        {
            System.Diagnostics.Debug.WriteLine($"[AddKycFile] Inserting file - FileId: {file.FileId}, KycId: {file.KycId}, FileType: {file.FileType}, FileSize: {file.FileSize}, Base64Length: {file.FileContentBase64?.Length ?? 0}");
            _kycFileRepository.Insert(file);
            System.Diagnostics.Debug.WriteLine($"[AddKycFile] File inserted, calling SaveChanges...");
            _context.SaveChanges();
            System.Diagnostics.Debug.WriteLine($"[AddKycFile] SaveChanges completed successfully");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[AddKycFile] SaveChanges error: {ex.Message}");
            System.Diagnostics.Debug.WriteLine($"[AddKycFile] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                System.Diagnostics.Debug.WriteLine($"[AddKycFile] Inner exception: {ex.InnerException.Message}");
                System.Diagnostics.Debug.WriteLine($"[AddKycFile] Inner stack trace: {ex.InnerException.StackTrace}");
            }
            throw new InvalidOperationException($"Failed to save KYC file to database: {ex.Message}", ex);
        }

        return new KycFileResult
        {
            FileId = file.FileId,
            FileType = file.FileType,
            BlobPath = file.BlobPath,
            CreatedAt = file.CreatedAt,
            ExpiresAt = file.ExpiresAt
        };
    }

    /// <summary>
    /// Gets KYC status for a user
    /// </summary>
    public KycStatusResult? GetKycStatus(int userId, string kycType = "USER_KYC")
    {
        var session = _kycSessionRepository.Get()
            .Where(k => k.UserId == userId && k.KycType == kycType)
            .OrderByDescending(k => k.CreatedAt)
            .FirstOrDefault();

        if (session == null)
        {
            return null;
        }

        var files = _kycFileRepository.Get()
            .Where(f => f.KycId == session.KycId && f.DeletedAt == null)
            .Select(f => new KycFileInfo
            {
                FileId = f.FileId,
                FileType = f.FileType,
                FileName = f.FileName,
                CreatedAt = f.CreatedAt
            })
            .ToList();

        return new KycStatusResult
        {
            KycId = session.KycId,
            Status = session.Status,
            CreatedAt = session.CreatedAt,
            VerifiedAt = session.VerifiedAt,
            ExpiresAt = session.ExpiresAt ?? DateTime.UtcNow.AddDays(KYC_EXPIRY_DAYS),
            RejectionReason = session.RejectionReason,
            Files = files
        };
    }

    /// <summary>
    /// Updates KYC form data (CNP, address, etc.)
    /// </summary>
    public bool UpdateKycFormData(Guid kycId, int userId, string? cnp, string? address, string? city, string? county, string? postalCode)
    {
        var session = _kycSessionRepository.Get()
            .FirstOrDefault(k => k.KycId == kycId && k.UserId == userId);

        if (session == null)
        {
            return false;
        }

        if (session.Status != "pending" && session.Status != "rejected")
        {
            throw new InvalidOperationException("Cannot update form data for a KYC session that is not pending");
        }

        // Store CNP hash (if provided)
        if (!string.IsNullOrWhiteSpace(cnp))
        {
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(cnp));
                session.Cnp = Convert.ToBase64String(hashBytes);
            }
        }

        session.Address = address;
        session.City = city;
        session.County = county;
        session.PostalCode = postalCode;
        session.Status = "pending";

        _kycSessionRepository.Update(session);
        _context.SaveChanges();

        return true;
    }

    /// <summary>
    /// Updates KYC status (for admin/manual verification)
    /// </summary>
    public bool UpdateKycStatus(Guid kycId, string status, string? rejectionReason = null, string? providerTransactionId = null)
    {
        var session = _kycSessionRepository.Get()
            .FirstOrDefault(k => k.KycId == kycId);

        if (session == null)
        {
            return false;
        }

        session.Status = status;
        session.RejectionReason = rejectionReason;
        session.ProviderTransactionId = providerTransactionId;

        if (status == "verified")
        {
            session.VerifiedAt = DateTime.UtcNow;

            // Hard delete all KYC files immediately upon approval
            var files = _kycFileRepository.Get()
                .Where(f => f.KycId == kycId && f.DeletedAt == null)
                .ToList();

            foreach (var file in files)
            {
                if (!string.IsNullOrEmpty(file.BlobPath))
                {
                    try
                    {
                        var filePath = Path.Combine(
                            System.IO.Directory.GetCurrentDirectory(),
                            "wwwroot",
                            file.BlobPath
                        );

                        if (System.IO.File.Exists(filePath))
                        {
                            System.IO.File.Delete(filePath);
                        }
                    }
                    catch
                    {
                        // Log error but continue with database deletion
                    }
                }

                // Hard delete from database
                _kycFileRepository.Delete(file);
            }
        }

        _kycSessionRepository.Update(session);
        _context.SaveChanges();

        return true;
    }

    /// <summary>
    /// Gets all pending KYC sessions for admin review
    /// </summary>
    public List<KycPendingResult> GetAllPendingKyc()
    {
        var sessions = (from k in _kycSessionRepository.Get()
                       join u in _userRepository.Get() on k.UserId equals u.IdUtilizator
                       where k.Status == "pending" && k.ExpiresAt > DateTime.UtcNow
                       orderby k.CreatedAt descending
                       select new
                       {
                           k.KycId,
                           k.UserId,
                           UserName = u.Nume + " " + u.Prenume,
                           UserEmail = u.Mail ?? "",
                           k.KycType,
                           k.CreatedAt,
                           k.ExpiresAt,
                           FileCount = _kycFileRepository.Get()
                               .Count(f => f.KycId == k.KycId && f.DeletedAt == null)
                       })
                       .ToList()
                       .Select(x => new KycPendingResult
                       {
                           KycId = x.KycId,
                           UserId = x.UserId,
                           UserName = x.UserName,
                           UserEmail = x.UserEmail,
                           KycType = x.KycType,
                           CreatedAt = x.CreatedAt,
                           ExpiresAt = x.ExpiresAt ?? DateTime.UtcNow.AddDays(30),
                           FileCount = x.FileCount
                       })
                       .ToList();

        return sessions;
    }

    /// <summary>
    /// Gets KYC details for admin review
    /// </summary>
    public KycDetailsResult? GetKycDetails(Guid kycId)
    {
        var sessionData = (from k in _kycSessionRepository.Get()
                          join u in _userRepository.Get() on k.UserId equals u.IdUtilizator
                          where k.KycId == kycId
                          select new
                          {
                              k.KycId,
                              k.UserId,
                              UserName = u.Nume + " " + u.Prenume,
                              UserEmail = u.Mail ?? "",
                              k.Status,
                              k.CreatedAt,
                              k.ExpiresAt,
                              k.RejectionReason,
                              k.Cnp,
                              k.Address,
                              k.City,
                              k.County,
                              k.PostalCode
                          })
                          .FirstOrDefault();

        if (sessionData == null)
        {
            return null;
        }

        var files = _kycFileRepository.Get()
            .Where(f => f.KycId == kycId && f.DeletedAt == null)
            .Select(f => new KycFileDetail
            {
                FileId = f.FileId,
                FileType = f.FileType,
                FileName = f.FileName,
                BlobPath = f.BlobPath,
                FileContentBase64 = f.FileContentBase64,
                MimeType = f.MimeType,
                CreatedAt = f.CreatedAt
            })
            .ToList();

        return new KycDetailsResult
        {
            KycId = sessionData.KycId,
            UserId = sessionData.UserId,
            UserName = sessionData.UserName,
            UserEmail = sessionData.UserEmail,
            Status = sessionData.Status,
            CreatedAt = sessionData.CreatedAt,
            ExpiresAt = sessionData.ExpiresAt ?? DateTime.UtcNow.AddDays(30),
            RejectionReason = sessionData.RejectionReason,
            Files = files,
            Cnp = sessionData.Cnp,
            Address = sessionData.Address,
            City = sessionData.City,
            County = sessionData.County,
            PostalCode = sessionData.PostalCode
        };
    }

    /// <summary>
    /// Gets KYC file for admin review
    /// </summary>
    public KycFileDetail? GetKycFile(Guid fileId)
    {
        var file = _kycFileRepository.Get()
            .FirstOrDefault(f => f.FileId == fileId && f.DeletedAt == null);

        if (file == null)
        {
            return null;
        }

        return new KycFileDetail
        {
            FileId = file.FileId,
            FileType = file.FileType,
            FileName = file.FileName,
            BlobPath = file.BlobPath,
            FileContentBase64 = file.FileContentBase64,
            MimeType = file.MimeType,
            CreatedAt = file.CreatedAt
        };
    }

    /// <summary>
    /// Marks expired KYC files for deletion (called by Azure Function)
    /// </summary>
    public int MarkExpiredFilesForDeletion()
    {
        var expiredFiles = _kycFileRepository.Get()
            .Where(f => f.ExpiresAt < DateTime.UtcNow && f.DeletedAt == null)
            .ToList();

        foreach (var file in expiredFiles)
        {
            file.DeletedAt = DateTime.UtcNow;
            _kycFileRepository.Update(file);
        }

        _context.SaveChanges();
        return expiredFiles.Count;
    }
}
