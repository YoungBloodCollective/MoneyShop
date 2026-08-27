-- =============================================
-- Migration: Acord Clienti
-- Description:
--   Creates the AcordClients table backing the public client-consent flow
--   (link -> identify -> upload ID -> sign GDPR / intermediation consent).
--   Documents themselves live in the existing KycFiles table, linked through KycId.
-- =============================================

IF OBJECT_ID('dbo.AcordClients', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AcordClients (
        AcordId               UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId                INT NOT NULL,
        KycId                 UNIQUEIDENTIFIER NULL,
        Token                 NVARCHAR(64) NOT NULL,

        Nume                  NVARCHAR(255) NOT NULL,
        Prenume               NVARCHAR(255) NOT NULL,
        Telefon               NVARCHAR(20) NOT NULL,
        Email                 NVARCHAR(255) NULL,
        AgentCode             NVARCHAR(50) NULL,
        CreatedIp             NVARCHAR(64) NULL,

        Status                NVARCHAR(30) NOT NULL DEFAULT 'started',

        IdIsNewFormat         BIT NULL,
        RequiresProofOfAddress BIT NOT NULL DEFAULT 0,
        HasIdFront            BIT NOT NULL DEFAULT 0,
        HasIdBack             BIT NOT NULL DEFAULT 0,
        HasProofOfAddress     BIT NOT NULL DEFAULT 0,
        HasSelfie             BIT NOT NULL DEFAULT 0,

        LivenessPassed        BIT NULL,
        LivenessConfidence    DECIMAL(5,4) NULL,
        FaceMatchPassed       BIT NULL,
        FaceMatchConfidence   DECIMAL(5,4) NULL,
        ReviewNote            NVARCHAR(1000) NULL,

        ConsentId             UNIQUEIDENTIFIER NULL,
        ConsentVersion        NVARCHAR(50) NULL,
        SignedAt              DATETIME2 NULL,
        MarketingAccepted     BIT NULL,
        Oug52Waived           BIT NULL,

        CreatedAt             DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt             DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        ExpiresAt             DATETIME2 NOT NULL,
        CompletedAt           DATETIME2 NULL,

        CONSTRAINT FK_AcordClients_Utilizatori FOREIGN KEY (UserId)
            REFERENCES dbo.Utilizatori (IdUtilizator) ON DELETE CASCADE,
        CONSTRAINT FK_AcordClients_KycSessions FOREIGN KEY (KycId)
            REFERENCES dbo.KycSessions (KycId)
    );

    CREATE UNIQUE INDEX UX_AcordClients_Token ON dbo.AcordClients (Token);
    CREATE INDEX IX_AcordClients_Status      ON dbo.AcordClients (Status);
    CREATE INDEX IX_AcordClients_CreatedAt   ON dbo.AcordClients (CreatedAt);
    CREATE INDEX IX_AcordClients_ExpiresAt   ON dbo.AcordClients (ExpiresAt);

    PRINT 'Created table AcordClients';
END
ELSE
    PRINT 'AcordClients already exists - skipped';

-- Idempotent column top-up, for databases where AcordClients was created
-- before this column was introduced.
IF OBJECT_ID('dbo.AcordClients','U') IS NOT NULL
   AND COL_LENGTH('dbo.AcordClients','RequiresProofOfAddress') IS NULL
BEGIN
    ALTER TABLE dbo.AcordClients
        ADD RequiresProofOfAddress BIT NOT NULL CONSTRAINT DF_AcordClients_RequiresProofOfAddress DEFAULT 0;
    PRINT 'Added column AcordClients.RequiresProofOfAddress';
END
GO
