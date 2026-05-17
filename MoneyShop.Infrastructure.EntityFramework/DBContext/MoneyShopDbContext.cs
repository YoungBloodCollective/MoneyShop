using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;

namespace MoneyShop.Infrastructure.EntityFramework.DBContext;

public class MoneyShopDbContext : DbContext
{
    public MoneyShopDbContext()
    {
    }

    public MoneyShopDbContext(DbContextOptions<MoneyShopDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Roluri> Roluris { get; set; }

    public virtual DbSet<Utilizatori> Utilizatoris { get; set; }

    // MoneyShop Entities
    public virtual DbSet<Application> Applications { get; set; }
    public virtual DbSet<Document> Documents { get; set; }
    public virtual DbSet<Bank> Banks { get; set; }
    public virtual DbSet<ApplicationBank> ApplicationBanks { get; set; }
    public virtual DbSet<Agreement> Agreements { get; set; }

    // OTP & Session Entities
    public virtual DbSet<OtpChallenge> OtpChallenges { get; set; }
    public virtual DbSet<Session> Sessions { get; set; }

    // Consent & Mandate Entities
    public virtual DbSet<LegalDoc> LegalDocs { get; set; }
    public virtual DbSet<Consent> Consents { get; set; }
    public virtual DbSet<Mandate> Mandates { get; set; }

    // Subject Map Entity (CNP Pseudonymization)
    public virtual DbSet<SubjectMap> SubjectMaps { get; set; }

    // KYC Entities
    public virtual DbSet<KycSession> KycSessions { get; set; }
    public virtual DbSet<KycFile> KycFiles { get; set; }

    // Broker Directory Entity
    public virtual DbSet<BrokerDirectory> BrokerDirectories { get; set; }

    // User Financial Data Entity
    public virtual DbSet<UserFinancialData> UserFinancialData { get; set; }

    // Eligibility Entities
    public virtual DbSet<RatesRulesConfig> RatesRulesConfigs { get; set; }
    public virtual DbSet<AnafReport> AnafReports { get; set; }
    public virtual DbSet<BcReport> BcReports { get; set; }

    // Chat Entities
    public virtual DbSet<ChatRateLimit> ChatRateLimits { get; set; }
    public virtual DbSet<ChatUsage> ChatUsages { get; set; }
    public virtual DbSet<FaqItem> FaqItems { get; set; }

    // Lead Capture Entities
    public virtual DbSet<LeadCapture> LeadCaptures { get; set; }
    public virtual DbSet<LeadSession> LeadSessions { get; set; }

    // Appointments
    public virtual DbSet<Appointment> Appointments { get; set; }
    public virtual DbSet<PartnerApplication> PartnerApplications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Roluri>(entity =>
        {
            entity.HasKey(e => e.IdRol).HasName("PK__Roluri__2A49584C65FE7A4A");

            entity.ToTable("Roluri");

            entity.Property(e => e.NumeRol).HasMaxLength(50);
        });

        modelBuilder.Entity<Utilizatori>(entity =>
        {
            entity.HasKey(e => e.IdUtilizator).HasName("PK__Utilizat__99101D6D31235E34");

            entity.ToTable("Utilizatori");

            entity.HasIndex(e => e.Username, "UQ__Utilizat__536C85E4B4BA6916").IsUnique();

            entity.Property(e => e.DataNastere).HasColumnType("datetime");
            entity.Property(e => e.IsDeleted).HasDefaultValueSql("((0))");
            entity.Property(e => e.Mail).HasMaxLength(255);
            entity.Property(e => e.NumarTelefon).HasMaxLength(20);
            entity.Property(e => e.Nume).HasMaxLength(255);
            entity.Property(e => e.Parola).HasMaxLength(255);
            entity.Property(e => e.Prenume).HasMaxLength(255);
            entity.Property(e => e.Username).HasMaxLength(255);
            entity.Property(e => e.EmailVerified).HasDefaultValueSql("((0))");
            entity.Property(e => e.PhoneVerified).HasDefaultValueSql("((0))");
            entity.Property(e => e.FirebaseUid).HasMaxLength(128);
        });

        // MoneyShop Entities Configuration
        modelBuilder.Entity<Application>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Applications");

            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("INREGISTRAT");
            entity.Property(e => e.TypeCredit).HasMaxLength(50);
            entity.Property(e => e.TipOperatiune).HasMaxLength(50);
            entity.Property(e => e.RequestedAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Purpose).HasMaxLength(500);
            entity.Property(e => e.RecommendedLevel).HasMaxLength(50);
            entity.Property(e => e.SalariuNet).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SumaBonuriMasa).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SoldTotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Scoring).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Dti).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SumaAprobata).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Comision).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.DataDisbursare).HasColumnType("datetime");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Documents");

            entity.Property(e => e.DocType).HasMaxLength(100);
            entity.Property(e => e.AzureBlobPath).HasMaxLength(500);
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.MimeType).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");

            entity.HasOne(d => d.Application)
                .WithMany(p => p.Documents)
                .HasForeignKey(d => d.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Bank>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Banks");

            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.CommissionPercent).HasColumnType("decimal(5,2)");
        });

        modelBuilder.Entity<ApplicationBank>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ApplicationBanks");

            entity.Property(e => e.CommissionPercent).HasColumnType("decimal(5,2)");

            entity.HasOne(d => d.Application)
                .WithMany(p => p.ApplicationBanks)
                .HasForeignKey(d => d.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Bank)
                .WithMany(p => p.ApplicationBanks)
                .HasForeignKey(d => d.BankId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Agreement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Agreements");

            entity.Property(e => e.AgreementType).HasMaxLength(100);
            entity.Property(e => e.PdfBlobPath).HasMaxLength(500);
            entity.Property(e => e.Version).HasMaxLength(20).HasDefaultValue("1.0");
            entity.Property(e => e.SignatureImagePath).HasMaxLength(500);
            entity.Property(e => e.SignedAt).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");

            entity.HasOne(d => d.Application)
                .WithMany(p => p.Agreements)
                .HasForeignKey(d => d.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // OTP & Session Configuration
        modelBuilder.Entity<OtpChallenge>(entity =>
        {
            entity.HasKey(e => e.OtpId);
            entity.ToTable("OtpChallenges");

            entity.Property(e => e.Phone).HasMaxLength(30).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(320);
            entity.Property(e => e.Purpose).HasMaxLength(30).IsRequired();
            entity.Property(e => e.OtpHash).IsRequired();
            entity.Property(e => e.Ip).HasMaxLength(64);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime2");
            entity.Property(e => e.UsedAt).HasColumnType("datetime2");

            entity.HasIndex(e => new { e.Phone, e.Purpose, e.CreatedAt });
            entity.HasIndex(e => e.ExpiresAt);

            entity.HasOne(d => d.User)
                .WithMany(p => p.OtpChallenges)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasKey(e => e.SessionId);
            entity.ToTable("Sessions");

            entity.Property(e => e.SourceChannel).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Ip).HasMaxLength(64);
            entity.Property(e => e.UserAgent).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime2");
            entity.Property(e => e.RevokedAt).HasColumnType("datetime2");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
            entity.HasIndex(e => e.ExpiresAt);

            entity.HasOne(d => d.User)
                .WithMany(p => p.Sessions)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Consent & Mandate Configuration
        modelBuilder.Entity<LegalDoc>(entity =>
        {
            entity.HasKey(e => e.DocId);
            entity.ToTable("LegalDocs");

            entity.Property(e => e.DocType).HasMaxLength(30).IsRequired();
            entity.Property(e => e.Version).HasMaxLength(20).IsRequired();
            entity.Property(e => e.ContentHash).IsRequired();

            entity.HasIndex(e => new { e.DocType, e.Version }).IsUnique();
            entity.HasIndex(e => new { e.DocType, e.IsActive });
        });

        modelBuilder.Entity<Consent>(entity =>
        {
            entity.HasKey(e => e.ConsentId);
            entity.ToTable("Consents");

            entity.Property(e => e.ConsentType).HasMaxLength(60).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("granted");
            entity.Property(e => e.ConsentTextSnapshot).IsRequired();
            entity.Property(e => e.SourceChannel).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Ip).HasMaxLength(64);
            entity.Property(e => e.UserAgent).HasMaxLength(1000);

            entity.HasOne(d => d.User)
                .WithMany(p => p.Consents)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Doc)
                .WithMany(p => p.Consents)
                .HasForeignKey(d => d.DocId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.Session)
                .WithMany()
                .HasForeignKey(d => d.SessionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.UserId, e.ConsentType, e.GrantedAt });
        });

        modelBuilder.Entity<Mandate>(entity =>
        {
            entity.HasKey(e => e.MandateId);
            entity.ToTable("Mandates");

            entity.Property(e => e.MandateType).HasMaxLength(30).IsRequired();
            entity.Property(e => e.Scope).HasMaxLength(100).HasDefaultValue("credit_eligibility_only");
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.RevokedReason).HasMaxLength(200);
            entity.Property(e => e.ConsentEventId).HasMaxLength(64);

            entity.HasOne(d => d.User)
                .WithMany(p => p.Mandates)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UserId, e.Status, e.GrantedAt });
            entity.HasIndex(e => e.ExpiresAt);
        });

        // Subject Map Configuration
        modelBuilder.Entity<SubjectMap>(entity =>
        {
            entity.HasKey(e => e.SubjectId);
            entity.ToTable("SubjectMaps");

            entity.Property(e => e.SubjectId).HasMaxLength(19).IsRequired(); // "MS-" + 16 chars
            entity.Property(e => e.CnpHash).IsRequired();
            entity.Property(e => e.CnpLast4).HasMaxLength(4);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.CnpHash).IsUnique();
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        // KYC Configuration
        modelBuilder.Entity<KycSession>(entity =>
        {
            entity.HasKey(e => e.KycId);
            entity.ToTable("KycSessions");

            entity.Property(e => e.KycType).HasMaxLength(30).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.ProviderTransactionId).HasMaxLength(200);
            entity.Property(e => e.RejectionReason).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.Property(e => e.VerifiedAt).HasColumnType("datetime2");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime2");

            // KYC Form Data
            entity.Property(e => e.Cnp).HasMaxLength(500); // Hashed CNP
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.County).HasMaxLength(100);
            entity.Property(e => e.PostalCode).HasMaxLength(10);

            entity.HasOne(d => d.User)
                .WithMany(p => p.KycSessions)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.ExpiresAt);
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
        });

        modelBuilder.Entity<KycFile>(entity =>
        {
            entity.HasKey(e => e.FileId);
            entity.ToTable("KycFiles");

            entity.Property(e => e.FileType).HasMaxLength(30).IsRequired();
            entity.Property(e => e.BlobPath).HasMaxLength(1000); // Made nullable, deprecated
            entity.Property(e => e.FileName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.MimeType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.FileContentBase64).HasColumnType("nvarchar(max)"); // Store base64 as nvarchar(max)
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime2");
            entity.Property(e => e.DeletedAt).HasColumnType("datetime2");

            entity.HasOne(d => d.KycSession)
                .WithMany(p => p.KycFiles)
                .HasForeignKey(d => d.KycId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.ExpiresAt);
            entity.HasIndex(e => e.KycId);
        });

        // Broker Directory Configuration
        modelBuilder.Entity<BrokerDirectory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("BrokerDirectories");

            entity.Property(e => e.ExcelFileName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.BlobPath).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.UploadedAt).HasColumnType("datetime2");

            entity.HasOne(d => d.UploadedByUser)
                .WithMany()
                .HasForeignKey(d => d.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.UploadedAt);
        });

        // User Financial Data Configuration
        modelBuilder.Entity<UserFinancialData>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("UserFinancialData");

            entity.Property(e => e.SalariuNet).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SumaBonuriMasa).HasColumnType("decimal(18,2)");
            entity.Property(e => e.VenitTotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SoldTotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.RataTotalaLunara).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Dti).HasColumnType("decimal(5,4)");
            entity.Property(e => e.ScoringLevel).HasMaxLength(50);
            entity.Property(e => e.RecommendedLevel).HasMaxLength(50);
            entity.Property(e => e.LastUpdated).HasColumnType("datetime2");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.LastUpdated);
        });

        // Eligibility Entities Configuration
        modelBuilder.Entity<RatesRulesConfig>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("RatesRulesConfigs");

            entity.Property(e => e.Version).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ConfigJson).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");

            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.Version);
        });

        modelBuilder.Entity<AnafReport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("AnafReports");

            entity.Property(e => e.ReportId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.BlobPath).HasMaxLength(1000);
            entity.Property(e => e.FileContentBase64).HasColumnType("nvarchar(max)");
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.AvgNet6Months).HasColumnType("decimal(18,2)");
            entity.Property(e => e.AvgMeal6Months).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ParseWarnings).HasMaxLength(2000);
            entity.Property(e => e.ParserVersion).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.Property(e => e.ParsedAt).HasColumnType("datetime2");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.ReportId).IsUnique();
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<BcReport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("BcReports");

            entity.Property(e => e.ReportId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.BlobPath).HasMaxLength(1000);
            entity.Property(e => e.FileContentBase64).HasColumnType("nvarchar(max)");
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.FicoScore).HasColumnType("int");
            entity.Property(e => e.ExistingMonthlyObligations).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ParseWarnings).HasMaxLength(2000);
            entity.Property(e => e.ParserVersion).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.Property(e => e.ParsedAt).HasColumnType("datetime2");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.ReportId).IsUnique();
            entity.HasIndex(e => e.UserId);
        });

        // Chat Rate Limiting Configuration
        modelBuilder.Entity<ChatRateLimit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ChatRateLimits");
            entity.Property(e => e.RateLimitKey).HasMaxLength(255).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime2");
            entity.HasIndex(e => e.RateLimitKey).IsUnique();
            entity.HasIndex(e => e.ExpiresAt);
        });

        // Chat Usage / Cost Control Configuration
        modelBuilder.Entity<ChatUsage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ChatUsages");
            entity.Property(e => e.MonthKey).HasMaxLength(10).IsRequired(); // YYYY-MM
            entity.Property(e => e.UsdSpent).HasColumnType("decimal(10,4)").HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.MetaLast).HasMaxLength(1000);
            entity.HasIndex(e => e.MonthKey).IsUnique();
        });

        // FAQ Cache Configuration
        modelBuilder.Entity<FaqItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("FaqItems");
            entity.Property(e => e.Question).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Answer).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.AliasesJson).HasColumnType("nvarchar(max)");
            entity.Property(e => e.TagsJson).HasColumnType("nvarchar(max)");
            entity.Property(e => e.Priority).HasDefaultValue(0);
            entity.Property(e => e.Enabled).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(e => e.Enabled);
            entity.HasIndex(e => e.Question);
        });

        // Lead Capture Configuration
        modelBuilder.Entity<LeadCapture>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("LeadCaptures");
            entity.Property(e => e.NumePrenume).HasMaxLength(120).IsRequired();
            entity.Property(e => e.Telefon).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Oras).HasMaxLength(80).IsRequired();
            entity.Property(e => e.SoldTotalAprox).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TipCreditor).HasMaxLength(20);
            entity.Property(e => e.VenitNetLunar).HasColumnType("decimal(18,2)").IsRequired();
            entity.Property(e => e.BonuriMasaAprox).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Source).HasMaxLength(50).HasDefaultValue("api");
            entity.Property(e => e.AdminNotes).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
        });

        // Lead Session Configuration
        modelBuilder.Entity<LeadSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("LeadSessions");
            entity.Property(e => e.SessionKey).HasMaxLength(255).IsRequired();
            entity.Property(e => e.ConversationId).HasMaxLength(100);
            entity.Property(e => e.SessionDataJson).HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime2");
            entity.HasIndex(e => e.SessionKey).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ExpiresAt);
        });
    }
}
