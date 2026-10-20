-- =============================================
-- Migration: broker profiles (multi-broker CRM)
-- 1. BrokerProfiles table (one row per broker account, Utilizatori.IdRol = 3).
-- 2. BrokerProfileId on the records a broker owns: AcordClients, Applications,
--    Appointments, LeadCaptures.
-- 3. Alex Moore as the first broker (slug "alex"), and every existing record
--    tagged to him: until now the platform served only his clients.
-- Idempotent: safe to run more than once.
-- =============================================

IF OBJECT_ID('dbo.BrokerProfiles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerProfiles (
        Id                   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BrokerProfiles PRIMARY KEY,
        UserId               INT            NOT NULL,
        Slug                 NVARCHAR(63)   NOT NULL,
        DisplayName          NVARCHAR(150)  NOT NULL,
        PublicPhone          NVARCHAR(30)   NULL,
        PublicEmail          NVARCHAR(255)  NULL,
        NotificationEmail    NVARCHAR(255)  NULL,
        Bio                  NVARCHAR(500)  NULL,
        Status               NVARCHAR(20)   NOT NULL CONSTRAINT DF_BrokerProfiles_Status DEFAULT ('Active'),
        [Plan]               NVARCHAR(30)   NOT NULL CONSTRAINT DF_BrokerProfiles_Plan DEFAULT ('Partener'),
        FirmaNume            NVARCHAR(255)  NULL,
        FirmaSediu           NVARCHAR(500)  NULL,
        FirmaCui             NVARCHAR(20)   NULL,
        FirmaRegCom          NVARCHAR(50)   NULL,
        FirmaEuid            NVARCHAR(50)   NULL,
        FirmaDataInfiintarii NVARCHAR(20)   NULL,
        ReprezentantNume     NVARCHAR(150)  NULL,
        ReprezentantTelefon  NVARCHAR(30)   NULL,
        MangoAgreementEnabled BIT           NOT NULL CONSTRAINT DF_BrokerProfiles_Mango DEFAULT (0),
        MangoEmail           NVARCHAR(255)  NULL,
        CreatedAt            DATETIME2      NOT NULL CONSTRAINT DF_BrokerProfiles_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt            DATETIME2      NOT NULL CONSTRAINT DF_BrokerProfiles_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_BrokerProfiles_Utilizatori FOREIGN KEY (UserId) REFERENCES dbo.Utilizatori (IdUtilizator)
    );
    CREATE UNIQUE INDEX IX_BrokerProfiles_Slug ON dbo.BrokerProfiles (Slug);
    CREATE UNIQUE INDEX IX_BrokerProfiles_UserId ON dbo.BrokerProfiles (UserId);
    PRINT 'BrokerProfiles created';
END
GO

IF COL_LENGTH('dbo.AcordClients', 'BrokerProfileId') IS NULL
BEGIN
    ALTER TABLE dbo.AcordClients ADD BrokerProfileId INT NULL
        CONSTRAINT FK_AcordClients_BrokerProfiles FOREIGN KEY REFERENCES dbo.BrokerProfiles (Id);
    PRINT 'AcordClients.BrokerProfileId added';
END
GO
IF COL_LENGTH('dbo.Applications', 'BrokerProfileId') IS NULL
BEGIN
    ALTER TABLE dbo.Applications ADD BrokerProfileId INT NULL
        CONSTRAINT FK_Applications_BrokerProfiles FOREIGN KEY REFERENCES dbo.BrokerProfiles (Id);
    PRINT 'Applications.BrokerProfileId added';
END
GO
IF COL_LENGTH('dbo.Appointments', 'BrokerProfileId') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD BrokerProfileId INT NULL
        CONSTRAINT FK_Appointments_BrokerProfiles FOREIGN KEY REFERENCES dbo.BrokerProfiles (Id);
    PRINT 'Appointments.BrokerProfileId added';
END
GO
IF COL_LENGTH('dbo.LeadCaptures', 'BrokerProfileId') IS NULL
BEGIN
    ALTER TABLE dbo.LeadCaptures ADD BrokerProfileId INT NULL
        CONSTRAINT FK_LeadCaptures_BrokerProfiles FOREIGN KEY REFERENCES dbo.BrokerProfiles (Id);
    PRINT 'LeadCaptures.BrokerProfileId added';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AcordClients_BrokerProfileId')
    CREATE INDEX IX_AcordClients_BrokerProfileId ON dbo.AcordClients (BrokerProfileId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Applications_BrokerProfileId')
    CREATE INDEX IX_Applications_BrokerProfileId ON dbo.Applications (BrokerProfileId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Appointments_BrokerProfileId')
    CREATE INDEX IX_Appointments_BrokerProfileId ON dbo.Appointments (BrokerProfileId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LeadCaptures_BrokerProfileId')
    CREATE INDEX IX_LeadCaptures_BrokerProfileId ON dbo.LeadCaptures (BrokerProfileId);
GO

-- ── Alex Moore: first broker ──
IF NOT EXISTS (SELECT 1 FROM dbo.BrokerProfiles WHERE Slug = 'alex')
BEGIN
    DECLARE @alexUserId INT = (
        SELECT TOP 1 IdUtilizator FROM dbo.Utilizatori
        WHERE Mail = 'alex.moore@moneyshop.ro' AND ISNULL(IsDeleted, 0) = 0 AND IdRol = 3
        ORDER BY IdUtilizator);

    IF @alexUserId IS NULL AND EXISTS (
        SELECT 1 FROM dbo.Utilizatori WHERE Mail = 'alex.moore@moneyshop.ro' AND ISNULL(IsDeleted, 0) = 0)
    BEGIN
        RAISERROR('alex.moore@moneyshop.ro already belongs to a non-broker account; resolve it before running this migration.', 16, 1);
        RETURN;
    END

    IF @alexUserId IS NULL
    BEGIN
        DECLARE @phone NVARCHAR(20) = CASE
            WHEN EXISTS (SELECT 1 FROM dbo.Utilizatori WHERE NumarTelefon = '0744686946' AND ISNULL(IsDeleted, 0) = 0) THEN NULL
            ELSE '0744686946' END;

        INSERT INTO dbo.Utilizatori (Nume, Prenume, Mail, Username, NumarTelefon, Parola, IdRol, IsDeleted, EmailVerified, PhoneVerified)
        VALUES (N'Moore', N'Alex', N'alex.moore@moneyshop.ro', N'alex.moore@moneyshop.ro', @phone, NULL, 3, 0, 0, 0);
        SET @alexUserId = SCOPE_IDENTITY();
    END

    INSERT INTO dbo.BrokerProfiles (
        UserId, Slug, DisplayName, PublicPhone, PublicEmail, NotificationEmail, Status, [Plan],
        FirmaNume, FirmaSediu, FirmaCui, FirmaRegCom, FirmaEuid, FirmaDataInfiintarii,
        ReprezentantNume, ReprezentantTelefon, MangoAgreementEnabled, MangoEmail)
    VALUES (
        @alexUserId, N'alex', N'Alex Moore', N'0770548447', N'alex.moore@moneyshop.ro', N'alex.moore@moneyshop.ro', N'Active', N'Fondator',
        N'POPIX BROKERAGE CONSULTING SRL',
        N'Municipiul Râmnicu Vâlcea, Str. Constantin Brâncuși nr. 8, județul Vâlcea',
        N'50477260', N'J2024018340008', N'ROONRC.J2024018340008', N'27.08.2024',
        N'Alex Moore', N'0744 686 946', 1, N'alex.moore@mangobroker.ro');

    PRINT 'Broker "alex" created for user ' + CAST(@alexUserId AS NVARCHAR(10));
END
GO

-- ── Existing records belong to Alex ──
DECLARE @alexId INT = (SELECT Id FROM dbo.BrokerProfiles WHERE Slug = 'alex');
IF @alexId IS NOT NULL
BEGIN
    UPDATE dbo.AcordClients SET BrokerProfileId = @alexId WHERE BrokerProfileId IS NULL;
    PRINT '  AcordClients tagged: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
    UPDATE dbo.Applications SET BrokerProfileId = @alexId WHERE BrokerProfileId IS NULL;
    PRINT '  Applications tagged: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
    UPDATE dbo.Appointments SET BrokerProfileId = @alexId WHERE BrokerProfileId IS NULL;
    PRINT '  Appointments tagged: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
    UPDATE dbo.LeadCaptures SET BrokerProfileId = @alexId WHERE BrokerProfileId IS NULL;
    PRINT '  LeadCaptures tagged: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
END
GO
