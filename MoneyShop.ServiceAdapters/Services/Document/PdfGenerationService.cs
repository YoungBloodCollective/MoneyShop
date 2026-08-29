using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using iText.IO.Image;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Document;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;
using MoneyShop.DomainServices.RepositoryInterfaces.Subject;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace MoneyShop.ServiceAdapters.Services.Document;

public class PdfGenerationService : IPdfGenerationService
{
    private readonly IUserRepository _userRepository;
    private readonly ISubjectMapRepository _subjectMapRepository;
    private readonly MoneyShopDbContext _context;
    private readonly IHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public PdfGenerationService(
        IUserRepository userRepository,
        ISubjectMapRepository subjectMapRepository,
        MoneyShopDbContext context,
        IHostEnvironment environment,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _subjectMapRepository = subjectMapRepository;
        _context = context;
        _environment = environment;
        _configuration = configuration;
    }

    /// <summary>
    /// Generates a mandate PDF with hash, timestamp, and audit trail
    /// </summary>
    public MandatePdfResult GenerateMandatePdf(
        Guid mandateId,
        int userId,
        string mandateType,
        string? consentTextSnapshot,
        string? consentEventId,
        string? ip,
        string? userAgent,
        DateTime grantedAt,
        DateTime expiresAt)
    {
        var user = _userRepository.Get()
            .FirstOrDefault(u => u.IdUtilizator == userId);

        if (user == null)
        {
            throw new ArgumentException("User not found", nameof(userId));
        }

        var subjectMap = _subjectMapRepository.Get()
            .FirstOrDefault(s => s.UserId == userId);

        var subjectId = subjectMap?.SubjectId ?? "N/A";
        var cnpMasked = subjectMap != null && !string.IsNullOrEmpty(subjectMap.CnpLast4)
            ? $"******{subjectMap.CnpLast4}"
            : "******";

        var phoneMasked = MaskPhone(user.NumarTelefon);

        // Generate PDF
        byte[] pdfBytes;
        using (var memoryStream = new MemoryStream())
        {
            var writer = new PdfWriter(memoryStream);
            var pdf = new PdfDocument(writer);
            var document = new iText.Layout.Document(pdf);

            document.Add(new Paragraph("MANDAT ANAF SI BIROUL DE CREDIT")
                .SetFontSize(18)
                .SetBold()
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginBottom(20));

            document.Add(new Paragraph("POPIX BROKERAGE CONSULTING S.R.L.")
                .SetFontSize(14)
                .SetBold()
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginBottom(30));

            var table = new Table(2).UseAllAvailableWidth();
            table.AddCell(new Cell().Add(new Paragraph("ID Mandat:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(mandateId.ToString())));

            table.AddCell(new Cell().Add(new Paragraph("Subject ID:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(subjectId)));

            table.AddCell(new Cell().Add(new Paragraph("Nume complet:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph($"{user.Nume} {user.Prenume}")));

            table.AddCell(new Cell().Add(new Paragraph("CNP (mascat):").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(cnpMasked)));

            table.AddCell(new Cell().Add(new Paragraph("Telefon (mascat):").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(phoneMasked)));

            table.AddCell(new Cell().Add(new Paragraph("Tip mandat:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(mandateType)));

            table.AddCell(new Cell().Add(new Paragraph("Acordat la:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(grantedAt.ToString("dd.MM.yyyy HH:mm:ss UTC"))));

            table.AddCell(new Cell().Add(new Paragraph("Expira la:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(expiresAt.ToString("dd.MM.yyyy HH:mm:ss UTC"))));

            document.Add(table);
            document.Add(new Paragraph().SetMarginBottom(20));

            if (!string.IsNullOrEmpty(ip) || !string.IsNullOrEmpty(userAgent))
            {
                document.Add(new Paragraph("Informatii tehnice:")
                    .SetBold()
                    .SetMarginTop(20));

                if (!string.IsNullOrEmpty(ip))
                {
                    document.Add(new Paragraph($"IP: {ip}"));
                }
                if (!string.IsNullOrEmpty(userAgent))
                {
                    document.Add(new Paragraph($"User-Agent: {userAgent}"));
                }
                document.Add(new Paragraph().SetMarginBottom(20));
            }

            if (!string.IsNullOrEmpty(consentTextSnapshot))
            {
                document.Add(new Paragraph("Text consimtamant (snapshot):")
                    .SetBold()
                    .SetMarginTop(20));
                document.Add(new Paragraph(consentTextSnapshot)
                    .SetFontSize(10)
                    .SetItalic()
                    .SetMarginBottom(20));
            }

            document.Add(new Paragraph().SetMarginTop(30));
            var footerTable = new Table(1).UseAllAvailableWidth();
            footerTable.AddCell(new Cell()
                .Add(new Paragraph("--- Metadata audit ---")
                    .SetFontSize(8)
                    .SetItalic()));

            if (!string.IsNullOrEmpty(consentEventId))
            {
                footerTable.AddCell(new Cell()
                    .Add(new Paragraph($"Consent Event ID: {consentEventId}")
                        .SetFontSize(8)));
            }

            footerTable.AddCell(new Cell()
                .Add(new Paragraph($"Generat la: {DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss.fffZ}")
                    .SetFontSize(8)));

            document.Add(footerTable);

            document.Close();

            pdfBytes = memoryStream.ToArray();
        }

        // Compute SHA-256 hash
        byte[] sha256Hash;
        using (var sha256 = SHA256.Create())
        {
            sha256Hash = sha256.ComputeHash(pdfBytes);
        }

        // Add hash to PDF footer (re-generate with hash)
        byte[] finalPdfBytes;
        using (var memoryStream = new MemoryStream())
        {
            var writer = new PdfWriter(memoryStream);
            var pdf = new PdfDocument(new PdfReader(new MemoryStream(pdfBytes)), writer);
            var document = new iText.Layout.Document(pdf);

            var hashBase64 = Convert.ToBase64String(sha256Hash);
            var hashParagraph = new Paragraph($"SHA-256: {hashBase64}")
                .SetFontSize(8)
                .SetFixedPosition(1, 50, 50, 500)
                .SetTextAlignment(TextAlignment.LEFT);

            document.Add(hashParagraph);
            document.Close();

            finalPdfBytes = memoryStream.ToArray();
        }

        // Generate storage path
        var year = grantedAt.Year;
        var month = grantedAt.Month.ToString("D2");
        var blobPath = $"ms-docs/mandates/{year}/{month}/{mandateId}.pdf";
        var localPath = Path.Combine(_environment.ContentRootPath, "wwwroot", blobPath);

        var directory = Path.GetDirectoryName(localPath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        File.WriteAllBytes(localPath, finalPdfBytes);

        return new MandatePdfResult
        {
            BlobPath = blobPath,
            Sha256Hash = sha256Hash,
            Sha256Base64 = Convert.ToBase64String(sha256Hash),
            FileSize = finalPdfBytes.Length,
            GeneratedAt = DateTime.UtcNow
        };
    }

    public byte[] GenerateAcordAgreementPdf(AcordAgreementPdfInput input)
    {
        byte[] pdfBytes;
        using (var memoryStream = new MemoryStream())
        {
            var writer = new PdfWriter(memoryStream);
            var pdf = new PdfDocument(writer);
            var document = new iText.Layout.Document(pdf);

            document.Add(new Paragraph("ACORD DE INTERMEDIERE SI PRELUCRARE DATE")
                .SetFontSize(18)
                .SetBold()
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginBottom(20));

            document.Add(new Paragraph("POPIX BROKERAGE CONSULTING S.R.L.")
                .SetFontSize(14)
                .SetBold()
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginBottom(30));

            var table = new Table(2).UseAllAvailableWidth();
            table.AddCell(new Cell().Add(new Paragraph("ID Acord:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(input.AcordId.ToString())));

            table.AddCell(new Cell().Add(new Paragraph("Nume complet:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph($"{input.Nume} {input.Prenume}")));

            table.AddCell(new Cell().Add(new Paragraph("Telefon:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(input.Telefon)));

            if (!string.IsNullOrEmpty(input.Email))
            {
                table.AddCell(new Cell().Add(new Paragraph("Email:").SetBold()));
                table.AddCell(new Cell().Add(new Paragraph(input.Email)));
            }

            table.AddCell(new Cell().Add(new Paragraph("Versiune acord:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(input.ConsentVersion)));

            table.AddCell(new Cell().Add(new Paragraph("Semnat la:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(input.SignedAt.ToString("dd.MM.yyyy HH:mm:ss UTC"))));

            table.AddCell(new Cell().Add(new Paragraph("Acord intermediere:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph("DA")));

            table.AddCell(new Cell().Add(new Paragraph("Acord marketing:").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(input.MarketingAccepted ? "DA" : "NU")));

            table.AddCell(new Cell().Add(new Paragraph("Renuntare perioada asteptare (OUG 52/2016):").SetBold()));
            table.AddCell(new Cell().Add(new Paragraph(input.Oug52Waived ? "DA" : "NU")));

            document.Add(table);

            document.Add(new Paragraph("Text acord (snapshot):")
                .SetBold()
                .SetMarginTop(20));
            document.Add(new Paragraph(input.ConsentTextSnapshot)
                .SetFontSize(10)
                .SetItalic()
                .SetMarginBottom(20));

            document.Add(new Paragraph("Semnatura client:")
                .SetBold()
                .SetMarginTop(10));
            var signature = new Image(ImageDataFactory.Create(input.SignaturePng))
                .SetAutoScale(false)
                .ScaleToFit(240, 100)
                .SetMarginBottom(20);
            document.Add(signature);

            if (!string.IsNullOrEmpty(input.Ip) || !string.IsNullOrEmpty(input.UserAgent))
            {
                document.Add(new Paragraph("Informatii tehnice:")
                    .SetBold()
                    .SetMarginTop(10));

                if (!string.IsNullOrEmpty(input.Ip))
                {
                    document.Add(new Paragraph($"IP: {input.Ip}"));
                }
                if (!string.IsNullOrEmpty(input.UserAgent))
                {
                    document.Add(new Paragraph($"User-Agent: {input.UserAgent}"));
                }
            }

            document.Add(new Paragraph().SetMarginTop(30));
            var footerTable = new Table(1).UseAllAvailableWidth();
            footerTable.AddCell(new Cell()
                .Add(new Paragraph("--- Metadata audit ---")
                    .SetFontSize(8)
                    .SetItalic()));
            footerTable.AddCell(new Cell()
                .Add(new Paragraph($"Generat la: {DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss.fffZ}")
                    .SetFontSize(8)));
            document.Add(footerTable);

            document.Close();

            pdfBytes = memoryStream.ToArray();
        }

        byte[] sha256Hash;
        using (var sha256 = SHA256.Create())
        {
            sha256Hash = sha256.ComputeHash(pdfBytes);
        }

        using (var memoryStream = new MemoryStream())
        {
            var writer = new PdfWriter(memoryStream);
            var pdf = new PdfDocument(new PdfReader(new MemoryStream(pdfBytes)), writer);
            var document = new iText.Layout.Document(pdf);

            var hashBase64 = Convert.ToBase64String(sha256Hash);
            var lastPage = pdf.GetNumberOfPages();
            var hashParagraph = new Paragraph($"SHA-256: {hashBase64}")
                .SetFontSize(8)
                .SetFixedPosition(lastPage, 50, 30, 500)
                .SetTextAlignment(TextAlignment.LEFT);

            document.Add(hashParagraph);
            document.Close();

            return memoryStream.ToArray();
        }
    }

    private string MaskPhone(string? phone)
    {
        if (string.IsNullOrEmpty(phone) || phone.Length < 4)
        {
            return "******";
        }

        var last4 = phone.Substring(phone.Length - 4);
        return $"******{last4}";
    }
}
