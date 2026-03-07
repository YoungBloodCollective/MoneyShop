using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using OfficeOpenXml;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.DomainServices.RepositoryInterfaces.Broker;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using BrokerDirectoryEntity = MoneyShop.DomainModel.Entities.BrokerDirectory;
using Microsoft.Extensions.Hosting;

namespace MoneyShop.ServiceAdapters.Services.Broker;

public class BrokerDirectoryService : IBrokerDirectoryService
{
    private readonly IBrokerDirectoryRepository _brokerDirectoryRepository;
    private readonly MoneyShopDbContext _context;
    private readonly IHostEnvironment _environment;

    public BrokerDirectoryService(
        IBrokerDirectoryRepository brokerDirectoryRepository,
        MoneyShopDbContext context,
        IHostEnvironment environment)
    {
        _brokerDirectoryRepository = brokerDirectoryRepository;
        _context = context;
        _environment = environment;
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    /// <summary>
    /// Uploads Excel file and saves metadata
    /// </summary>
    public BrokerDirectoryUploadResult UploadExcelFile(
        int userId,
        string fileName,
        byte[] fileContent,
        string? notes = null)
    {
        // Validate file extension
        var extension = Path.GetExtension(fileName).ToLower();
        if (extension != ".xlsx" && extension != ".xls")
        {
            throw new ArgumentException("Only Excel files (.xlsx, .xls) are allowed");
        }

        // Generate storage path
        var year = DateTime.UtcNow.Year;
        var month = DateTime.UtcNow.Month.ToString("D2");
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var blobPath = $"brokers/excel/{year}/{month}/{uniqueFileName}";
        var localPath = Path.Combine(_environment.ContentRootPath, "wwwroot", blobPath);

        // Ensure directory exists
        var directory = Path.GetDirectoryName(localPath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        // Save file locally (in production, upload to Azure Blob Storage)
        File.WriteAllBytes(localPath, fileContent);

        // Save metadata
        var directoryEntry = new BrokerDirectoryEntity
        {
            ExcelFileName = fileName,
            BlobPath = blobPath,
            FileSize = fileContent.Length,
            UploadedAt = DateTime.UtcNow,
            UploadedByUserId = userId,
            Notes = notes
        };

        _brokerDirectoryRepository.Insert(directoryEntry);
        _context.SaveChanges();

        return new BrokerDirectoryUploadResult
        {
            DirectoryId = directoryEntry.Id,
            ExcelFileName = directoryEntry.ExcelFileName,
            BlobPath = directoryEntry.BlobPath,
            UploadedAt = directoryEntry.UploadedAt
        };
    }

    /// <summary>
    /// Gets the latest uploaded Excel file
    /// </summary>
    public BrokerDirectoryInfo? GetLatestDirectory()
    {
        var directory = _brokerDirectoryRepository.Get()
            .OrderByDescending(d => d.UploadedAt)
            .FirstOrDefault();

        if (directory == null)
            return null;

        return new BrokerDirectoryInfo
        {
            DirectoryId = directory.Id,
            ExcelFileName = directory.ExcelFileName,
            BlobPath = directory.BlobPath,
            FileSize = directory.FileSize,
            UploadedAt = directory.UploadedAt,
            UploadedByUserId = directory.UploadedByUserId,
            Notes = directory.Notes
        };
    }

    /// <summary>
    /// Reads brokers from Excel file and searches
    /// </summary>
    public List<BrokerInfo> SearchBrokers(string? searchTerm = null, int? limit = null)
    {
        var directory = GetLatestDirectory();
        if (directory == null)
        {
            return new List<BrokerInfo>();
        }

        var localPath = Path.Combine(_environment.ContentRootPath, "wwwroot", directory.BlobPath);
        if (!File.Exists(localPath))
        {
            throw new FileNotFoundException("Excel file not found");
        }

        var brokers = new List<BrokerInfo>();

        using (var package = new ExcelPackage(new FileInfo(localPath)))
        {
            var worksheet = package.Workbook.Worksheets[0];
            if (worksheet == null)
            {
                return brokers;
            }

            var startRow = 2;
            var endRow = worksheet.Dimension?.End.Row ?? startRow;

            var denumireCol = FindColumn(worksheet, new[] { "Denumire", "Nume", "Name", "Nume complet", "Full Name", "Denumirea" });
            var tipCol = FindColumn(worksheet, new[] { "Tip", "Tip intermediar", "Type" });
            var creditorCol = FindColumn(worksheet, new[] { "Creditorul", "Creditor", "Creditorul/intermediarul", "Creditorul/intermediarul in numele caruia actioneaza" });
            var numeConducereCol = FindColumn(worksheet, new[] { "Nume conducere", "Nume conducere / persoane responsabile", "Persoane responsabile", "Conducere", "Responsabile", "Nume conducere / persoane responsabile cu activitatea de intermediere credite" });
            var statMembruCol = FindColumn(worksheet, new[] { "Statul membru", "Stat Membru", "STATUL MEMBRU", "Member State", "STATUL MEMBRU IN CARE INTERMEDIARUL DE CREDITE ISI DESFASOARA ACTIVITATEA" });

            var cuiCol = FindColumn(worksheet, new[] { "CUI", "CIF", "Tax ID", "Cod fiscal" });
            var emailCol = FindColumn(worksheet, new[] { "Email", "E-mail", "Mail" });
            var phoneCol = FindColumn(worksheet, new[] { "Telefon", "Phone", "Tel" });
            var statusCol = FindColumn(worksheet, new[] { "Status", "Stare" });

            if (worksheet.Dimension != null)
            {
                if (!denumireCol.HasValue && worksheet.Dimension.End.Column >= 2)
                {
                    denumireCol = 2;
                }
                if (!numeConducereCol.HasValue && worksheet.Dimension.End.Column >= 5)
                {
                    numeConducereCol = 5;
                }
            }

            for (int row = startRow; row <= endRow; row++)
            {
                var denumire = GetCellValue(worksheet, row, denumireCol);
                var numeConducere = GetCellValue(worksheet, row, numeConducereCol);

                var name = !string.IsNullOrWhiteSpace(denumire) ? denumire : numeConducere;

                if (string.IsNullOrWhiteSpace(name))
                    continue;

                var personName = ExtractPersonName(numeConducere);
                var fullName = !string.IsNullOrWhiteSpace(personName) ? personName : name;

                var cui = GetCellValue(worksheet, row, cuiCol);
                if (string.IsNullOrWhiteSpace(cui) && !string.IsNullOrWhiteSpace(denumire))
                {
                    cui = ExtractCuiFromText(denumire);
                }

                var broker = new BrokerInfo
                {
                    BrokerId = Guid.NewGuid(),
                    FullName = fullName,
                    FirmName = !string.IsNullOrWhiteSpace(denumire) && denumire != fullName ? denumire : null,
                    FirmCui = cui,
                    PublicEmail = GetCellValue(worksheet, row, emailCol),
                    PublicPhone = GetCellValue(worksheet, row, phoneCol),
                    Status = GetCellValue(worksheet, row, statusCol) ?? "pending"
                };

                if (string.IsNullOrEmpty(searchTerm) ||
                    MatchesSearch(broker, searchTerm))
                {
                    brokers.Add(broker);
                }

                if (limit.HasValue && brokers.Count >= limit.Value)
                {
                    break;
                }
            }
        }

        return brokers;
    }

    private int? FindColumn(ExcelWorksheet worksheet, string[] possibleNames)
    {
        if (worksheet.Dimension == null)
            return null;

        for (int col = 1; col <= worksheet.Dimension.End.Column; col++)
        {
            var headerValue = GetCellValue(worksheet, 1, col);
            if (string.IsNullOrWhiteSpace(headerValue))
                continue;

            var headerLower = headerValue.ToLower().Trim();

            foreach (var name in possibleNames)
            {
                var nameLower = name.ToLower().Trim();

                if (headerLower == nameLower)
                    return col;

                if (headerLower.Contains(nameLower) || nameLower.Contains(headerLower))
                    return col;

                var headerNormalized = System.Text.RegularExpressions.Regex.Replace(headerLower, @"[^\w]", "");
                var nameNormalized = System.Text.RegularExpressions.Regex.Replace(nameLower, @"[^\w]", "");
                if (headerNormalized.Contains(nameNormalized) || nameNormalized.Contains(headerNormalized))
                    return col;
            }
        }

        return null;
    }

    private string? GetCellValue(ExcelWorksheet worksheet, int row, int? col)
    {
        if (!col.HasValue)
            return null;

        var cell = worksheet.Cells[row, col.Value];
        if (cell.Value == null)
            return null;

        return cell.Value.ToString()?.Trim();
    }

    private bool MatchesSearch(BrokerInfo broker, string searchTerm)
    {
        if (string.IsNullOrEmpty(searchTerm))
            return true;

        var term = searchTerm.ToLower();
        return
            (broker.FullName?.ToLower().Contains(term) ?? false) ||
            (broker.FirmName?.ToLower().Contains(term) ?? false) ||
            (broker.FirmCui?.ToLower().Contains(term) ?? false) ||
            (broker.PublicEmail?.ToLower().Contains(term) ?? false) ||
            (broker.PublicPhone?.ToLower().Contains(term) ?? false);
    }

    private string? ExtractPersonName(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var cleaned = text
            .Replace("administrator", "", StringComparison.OrdinalIgnoreCase)
            .Replace("admin", "", StringComparison.OrdinalIgnoreCase)
            .Trim();

        var parts = cleaned.Split(new[] { ' ', '-', ',', ';' }, StringSplitOptions.RemoveEmptyEntries);

        if (parts.Length >= 2)
        {
            return $"{parts[0]} {parts[1]}";
        }
        else if (parts.Length == 1)
        {
            return parts[0];
        }

        return cleaned;
    }

    private string? ExtractCuiFromText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var cuiPattern = System.Text.RegularExpressions.Regex.Match(
            text,
            @"(?:CUI[:\s]*)?(?:RO)?(\d{8,13})",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        );

        if (cuiPattern.Success)
        {
            return cuiPattern.Groups[1].Value;
        }

        return null;
    }
}
