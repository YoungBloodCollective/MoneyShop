-- Colaborare / Transfer: a broker hands a client to another broker, with the client's consent.
--   ClientReferrals - one row per referral (only the SHA-256 hash of the client's consent token is stored,
--                     plus the time, IP and user agent of the client's answer; LeadId is the lead created
--                     in the receiving broker's scope when the client says yes)
--
-- RUN IN PRODUCTION BEFORE DEPLOYING the API that reads this table. Idempotent.
-- Needs Migration_AddBrokerOnboarding.sql (BrokerProfiles.Oras / Judet) to have been run.

IF OBJECT_ID('dbo.ClientReferrals', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientReferrals
    (
        Id                   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ClientReferrals PRIMARY KEY,
        FromBrokerProfileId  INT               NOT NULL,
        ToBrokerProfileId    INT               NOT NULL,
        ClientUserId         INT               NOT NULL,
        [Mode]               NVARCHAR(20)      NOT NULL,
        SharePercent         INT               NOT NULL CONSTRAINT DF_ClientReferrals_SharePercent DEFAULT 0,
        Note                 NVARCHAR(500)     NULL,
        [Status]             NVARCHAR(20)      NOT NULL,
        ConsentTokenHash     NVARCHAR(64)      NOT NULL,
        ConsentExpiresAt     DATETIME2         NOT NULL,
        ConsentAt            DATETIME2         NULL,
        ConsentIp            NVARCHAR(64)      NULL,
        ConsentUserAgent     NVARCHAR(500)     NULL,
        LeadId               INT               NULL,
        CreatedAt            DATETIME2         NOT NULL,
        UpdatedAt            DATETIME2         NOT NULL,
        CONSTRAINT FK_ClientReferrals_FromBroker FOREIGN KEY (FromBrokerProfileId) REFERENCES dbo.BrokerProfiles (Id),
        CONSTRAINT FK_ClientReferrals_ToBroker FOREIGN KEY (ToBrokerProfileId) REFERENCES dbo.BrokerProfiles (Id),
        CONSTRAINT FK_ClientReferrals_Client FOREIGN KEY (ClientUserId) REFERENCES dbo.Utilizatori (IdUtilizator),
        CONSTRAINT FK_ClientReferrals_Lead FOREIGN KEY (LeadId) REFERENCES dbo.LeadCaptures (Id)
    );
    PRINT 'ClientReferrals created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientReferrals_ConsentTokenHash' AND object_id = OBJECT_ID('dbo.ClientReferrals'))
BEGIN
    CREATE UNIQUE INDEX IX_ClientReferrals_ConsentTokenHash ON dbo.ClientReferrals (ConsentTokenHash);
    PRINT 'IX_ClientReferrals_ConsentTokenHash created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientReferrals_FromBrokerProfileId_CreatedAt' AND object_id = OBJECT_ID('dbo.ClientReferrals'))
BEGIN
    CREATE INDEX IX_ClientReferrals_FromBrokerProfileId_CreatedAt ON dbo.ClientReferrals (FromBrokerProfileId, CreatedAt);
    PRINT 'IX_ClientReferrals_FromBrokerProfileId_CreatedAt created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientReferrals_ToBrokerProfileId_CreatedAt' AND object_id = OBJECT_ID('dbo.ClientReferrals'))
BEGIN
    CREATE INDEX IX_ClientReferrals_ToBrokerProfileId_CreatedAt ON dbo.ClientReferrals (ToBrokerProfileId, CreatedAt);
    PRINT 'IX_ClientReferrals_ToBrokerProfileId_CreatedAt created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientReferrals_ClientUserId' AND object_id = OBJECT_ID('dbo.ClientReferrals'))
BEGIN
    CREATE INDEX IX_ClientReferrals_ClientUserId ON dbo.ClientReferrals (ClientUserId);
    PRINT 'IX_ClientReferrals_ClientUserId created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientReferrals_LeadId' AND object_id = OBJECT_ID('dbo.ClientReferrals'))
BEGIN
    CREATE INDEX IX_ClientReferrals_LeadId ON dbo.ClientReferrals (LeadId);
    PRINT 'IX_ClientReferrals_LeadId created';
END
GO
