-- Onboarding of new brokers by invitation:
--   BrokerInvites                  - one row per invitation sent by the Super Admin (only the SHA-256 hash of the token is stored)
--   BrokerProfiles.Oras / Judet    - the broker's city and county (county from the fixed list of 41 counties + Bucuresti)
--   BrokerProfiles.TermsVersion / TermsAcceptedAt / TermsAcceptedIp - acceptance of the CRM terms of use
--
-- RUN IN PRODUCTION BEFORE DEPLOYING the API that reads these columns and this table. Idempotent.

IF OBJECT_ID('dbo.BrokerInvites', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerInvites
    (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BrokerInvites PRIMARY KEY,
        Email           NVARCHAR(255)     NOT NULL,
        Name            NVARCHAR(150)     NULL,
        [Type]          NVARCHAR(20)      NOT NULL,
        TokenHash       NVARCHAR(64)      NOT NULL,
        ExpiresAt       DATETIME2         NOT NULL,
        CreatedAt       DATETIME2         NOT NULL,
        CreatedByUserId INT               NOT NULL,
        UsedAt          DATETIME2         NULL,
        UsedByUserId    INT               NULL,
        RevokedAt       DATETIME2         NULL,
        CONSTRAINT FK_BrokerInvites_UsedByUser FOREIGN KEY (UsedByUserId) REFERENCES dbo.Utilizatori (IdUtilizator)
    );
    PRINT 'BrokerInvites created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BrokerInvites_TokenHash' AND object_id = OBJECT_ID('dbo.BrokerInvites'))
BEGIN
    CREATE UNIQUE INDEX IX_BrokerInvites_TokenHash ON dbo.BrokerInvites (TokenHash);
    PRINT 'IX_BrokerInvites_TokenHash created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BrokerInvites_Email' AND object_id = OBJECT_ID('dbo.BrokerInvites'))
BEGIN
    CREATE INDEX IX_BrokerInvites_Email ON dbo.BrokerInvites (Email);
    PRINT 'IX_BrokerInvites_Email created';
END
GO

IF COL_LENGTH('dbo.BrokerProfiles', 'Oras') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD Oras NVARCHAR(100) NULL;
    PRINT 'BrokerProfiles.Oras added';
END
GO

IF COL_LENGTH('dbo.BrokerProfiles', 'Judet') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD Judet NVARCHAR(50) NULL;
    PRINT 'BrokerProfiles.Judet added';
END
GO

IF COL_LENGTH('dbo.BrokerProfiles', 'TermsVersion') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD TermsVersion NVARCHAR(20) NULL;
    PRINT 'BrokerProfiles.TermsVersion added';
END
GO

IF COL_LENGTH('dbo.BrokerProfiles', 'TermsAcceptedAt') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD TermsAcceptedAt DATETIME2 NULL;
    PRINT 'BrokerProfiles.TermsAcceptedAt added';
END
GO

IF COL_LENGTH('dbo.BrokerProfiles', 'TermsAcceptedIp') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD TermsAcceptedIp NVARCHAR(64) NULL;
    PRINT 'BrokerProfiles.TermsAcceptedIp added';
END
GO
