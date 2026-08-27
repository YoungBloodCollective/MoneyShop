-- =============================================
-- Migration: Broker CRM v2
-- Date: 2026-04-23
-- Description:
--   Creates 6 new tables for the Broker CRM module:
--   BrokerProfiles, BrokerLeads, BrokerDosare,
--   BrokerDocuments, BrokerNotifications, BrokerStatusHistory
--   Role 3 (Broker) already exists in Roluri table.
-- =============================================

-- ────────────────────────────────────────────
-- 1. BrokerProfiles (1:1 with Utilizatori where IdRol=3)
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.BrokerProfiles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerProfiles (
        Id                  INT IDENTITY(1,1) PRIMARY KEY,
        UserId              INT NOT NULL,
        Slug                NVARCHAR(100) NOT NULL,
        Bio                 NVARCHAR(500) NULL,
        PhotoUrl            NVARCHAR(255) NULL,
        Plan                NVARCHAR(50) NOT NULL DEFAULT 'Trial',
        Status              NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        IsActive            BIT NOT NULL DEFAULT 0,
        TrialEndsAt         DATETIME2 NULL,
        SubscriptionEndsAt  DATETIME2 NULL,
        AnafQueriesUsed     INT NOT NULL DEFAULT 0,
        BcQueriesUsed       INT NOT NULL DEFAULT 0,
        AnafQueriesLimit    INT NOT NULL DEFAULT 3,
        BcQueriesLimit      INT NOT NULL DEFAULT 2,
        Firma               NVARCHAR(255) NULL,
        Cui                 NVARCHAR(20) NULL,
        Website             NVARCHAR(255) NULL,
        Judet               NVARCHAR(100) NULL,
        Oras                NVARCHAR(200) NULL,
        CreatedAt           DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt           DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT FK_BrokerProfiles_Utilizatori FOREIGN KEY (UserId)
            REFERENCES dbo.Utilizatori (IdUtilizator) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX UX_BrokerProfiles_Slug   ON dbo.BrokerProfiles (Slug);
    CREATE UNIQUE INDEX UX_BrokerProfiles_UserId ON dbo.BrokerProfiles (UserId);
    CREATE INDEX IX_BrokerProfiles_Status        ON dbo.BrokerProfiles (Status);

    PRINT 'Created table BrokerProfiles';
END
ELSE
    PRINT 'BrokerProfiles already exists — skipped';

-- ────────────────────────────────────────────
-- 2. BrokerLeads (leads via broker unique link)
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.BrokerLeads', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerLeads (
        Id                INT IDENTITY(1,1) PRIMARY KEY,
        BrokerProfileId   INT NOT NULL,
        Nume              NVARCHAR(255) NOT NULL,
        Prenume           NVARCHAR(255) NULL,
        Telefon           NVARCHAR(20) NOT NULL,
        Email             NVARCHAR(255) NULL,
        Judet             NVARCHAR(100) NULL,
        Oras              NVARCHAR(200) NULL,
        TipCredit         NVARCHAR(100) NULL,
        SalariuNet        DECIMAL(18,2) NULL,
        SumaDorita        DECIMAL(18,2) NULL,
        Status            NVARCHAR(50) NOT NULL DEFAULT 'Nou',
        Note              NVARCHAR(1000) NULL,
        UtmSource         NVARCHAR(100) NULL,
        UtmMedium         NVARCHAR(100) NULL,
        UtmCampaign       NVARCHAR(100) NULL,
        CreatedAt         DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt         DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT FK_BrokerLeads_BrokerProfiles FOREIGN KEY (BrokerProfileId)
            REFERENCES dbo.BrokerProfiles (Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_BrokerLeads_BrokerProfileId ON dbo.BrokerLeads (BrokerProfileId);
    CREATE INDEX IX_BrokerLeads_Status          ON dbo.BrokerLeads (Status);
    CREATE INDEX IX_BrokerLeads_CreatedAt        ON dbo.BrokerLeads (CreatedAt);

    PRINT 'Created table BrokerLeads';
END
ELSE
    PRINT 'BrokerLeads already exists — skipped';

-- ────────────────────────────────────────────
-- 3. BrokerDosare (credit file pipeline)
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.BrokerDosare', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerDosare (
        Id                      INT IDENTITY(1,1) PRIMARY KEY,
        BrokerProfileId         INT NOT NULL,
        BrokerLeadId            INT NULL,
        NumeClient              NVARCHAR(255) NOT NULL,
        TelefonClient           NVARCHAR(20) NOT NULL,
        EmailClient             NVARCHAR(255) NULL,
        TipCredit               NVARCHAR(100) NOT NULL DEFAULT 'Personal',
        BancaTinta              NVARCHAR(255) NULL,
        SumaSolicitata          DECIMAL(18,2) NULL,
        DurataMasuri            INT NULL,
        RataLunaraEstimata      DECIMAL(18,2) NULL,
        Status                  NVARCHAR(50) NOT NULL DEFAULT 'Nou',
        Note                    NVARCHAR(2000) NULL,
        TermenLimita            DATETIME2 NULL,
        RezultatBanca           NVARCHAR(500) NULL,
        SumaAprobata            DECIMAL(18,2) NULL,
        CreatedAt               DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt               DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT FK_BrokerDosare_BrokerProfiles FOREIGN KEY (BrokerProfileId)
            REFERENCES dbo.BrokerProfiles (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_BrokerDosare_BrokerLeads FOREIGN KEY (BrokerLeadId)
            REFERENCES dbo.BrokerLeads (Id) ON DELETE SET NULL
    );

    CREATE INDEX IX_BrokerDosare_BrokerProfileId ON dbo.BrokerDosare (BrokerProfileId);
    CREATE INDEX IX_BrokerDosare_Status           ON dbo.BrokerDosare (Status);
    CREATE INDEX IX_BrokerDosare_CreatedAt         ON dbo.BrokerDosare (CreatedAt);

    PRINT 'Created table BrokerDosare';
END
ELSE
    PRINT 'BrokerDosare already exists — skipped';

-- ────────────────────────────────────────────
-- 4. BrokerDocuments
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.BrokerDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerDocuments (
        Id                  INT IDENTITY(1,1) PRIMARY KEY,
        BrokerDosarId       INT NOT NULL,
        Categorie           NVARCHAR(100) NOT NULL DEFAULT 'Altele',
        FileName            NVARCHAR(255) NOT NULL,
        MimeType            NVARCHAR(100) NOT NULL,
        AzureBlobPath       NVARCHAR(1000) NULL,
        Note                NVARCHAR(500) NULL,
        FileSizeBytes       BIGINT NOT NULL DEFAULT 0,
        UploadedByUserId    INT NOT NULL,
        CreatedAt           DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT FK_BrokerDocuments_BrokerDosare FOREIGN KEY (BrokerDosarId)
            REFERENCES dbo.BrokerDosare (Id) ON DELETE CASCADE,
        CONSTRAINT FK_BrokerDocuments_Utilizatori FOREIGN KEY (UploadedByUserId)
            REFERENCES dbo.Utilizatori (IdUtilizator) ON DELETE NO ACTION
    );

    CREATE INDEX IX_BrokerDocuments_BrokerDosarId ON dbo.BrokerDocuments (BrokerDosarId);

    PRINT 'Created table BrokerDocuments';
END
ELSE
    PRINT 'BrokerDocuments already exists — skipped';

-- ────────────────────────────────────────────
-- 5. BrokerNotifications
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.BrokerNotifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerNotifications (
        Id                  INT IDENTITY(1,1) PRIMARY KEY,
        BrokerProfileId     INT NOT NULL,
        Type                NVARCHAR(50) NOT NULL DEFAULT 'Info',
        Title               NVARCHAR(255) NOT NULL,
        Message             NVARCHAR(1000) NOT NULL,
        IsRead              BIT NOT NULL DEFAULT 0,
        RelatedEntityId     INT NULL,
        RelatedEntityType   NVARCHAR(50) NULL,
        CreatedAt           DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT FK_BrokerNotifications_BrokerProfiles FOREIGN KEY (BrokerProfileId)
            REFERENCES dbo.BrokerProfiles (Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_BrokerNotifications_ProfileRead ON dbo.BrokerNotifications (BrokerProfileId, IsRead);
    CREATE INDEX IX_BrokerNotifications_CreatedAt    ON dbo.BrokerNotifications (CreatedAt);

    PRINT 'Created table BrokerNotifications';
END
ELSE
    PRINT 'BrokerNotifications already exists — skipped';

-- ────────────────────────────────────────────
-- 6. BrokerStatusHistory (audit log for dosar status changes)
-- ────────────────────────────────────────────
IF OBJECT_ID('dbo.BrokerStatusHistory', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerStatusHistory (
        Id                  INT IDENTITY(1,1) PRIMARY KEY,
        BrokerDosarId       INT NOT NULL,
        StatusVechi         NVARCHAR(50) NOT NULL,
        StatusNou           NVARCHAR(50) NOT NULL,
        Comentariu          NVARCHAR(500) NULL,
        ChangedByUserId     INT NOT NULL,
        CreatedAt           DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT FK_BrokerStatusHistory_BrokerDosare FOREIGN KEY (BrokerDosarId)
            REFERENCES dbo.BrokerDosare (Id) ON DELETE CASCADE,
        CONSTRAINT FK_BrokerStatusHistory_Utilizatori FOREIGN KEY (ChangedByUserId)
            REFERENCES dbo.Utilizatori (IdUtilizator) ON DELETE NO ACTION
    );

    CREATE INDEX IX_BrokerStatusHistory_DosarId ON dbo.BrokerStatusHistory (BrokerDosarId);

    PRINT 'Created table BrokerStatusHistory';
END
ELSE
    PRINT 'BrokerStatusHistory already exists — skipped';

PRINT '=== Migration_AddBrokerCRM_v2 completed successfully ===';
