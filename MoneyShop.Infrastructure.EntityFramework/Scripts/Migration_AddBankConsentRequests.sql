-- Bank consent links: a broker sends a client a link to sign a bank's own consent
-- form (ProCredit first). Run BEFORE deploying the API that reads this table.
-- Idempotent.

IF OBJECT_ID('dbo.BankConsentRequests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankConsentRequests (
        Id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BankConsentRequests PRIMARY KEY,
        AcordId          UNIQUEIDENTIFIER NOT NULL,
        BrokerProfileId  INT              NULL,
        BankCode         NVARCHAR(30)     NOT NULL,
        TokenHash        NVARCHAR(64)     NOT NULL,
        FullName         NVARCHAR(255)    NOT NULL,
        Telefon          NVARCHAR(20)     NOT NULL,
        Email            NVARCHAR(255)    NULL,
        Status           NVARCHAR(20)     NOT NULL,
        CreatedByUserId  INT              NULL,
        CreatedAt        DATETIME2        NOT NULL,
        ExpiresAt        DATETIME2        NOT NULL,
        SignedAt         DATETIME2        NULL,
        SignedIp         NVARCHAR(64)     NULL,
        SignedUserAgent  NVARCHAR(500)    NULL,
        FileId           UNIQUEIDENTIFIER NULL,
        CONSTRAINT FK_BankConsentRequests_AcordClients FOREIGN KEY (AcordId) REFERENCES dbo.AcordClients (AcordId),
        CONSTRAINT FK_BankConsentRequests_BrokerProfiles FOREIGN KEY (BrokerProfileId) REFERENCES dbo.BrokerProfiles (Id)
    );
    CREATE UNIQUE INDEX IX_BankConsentRequests_TokenHash ON dbo.BankConsentRequests (TokenHash);
    CREATE INDEX IX_BankConsentRequests_AcordId ON dbo.BankConsentRequests (AcordId);
    CREATE INDEX IX_BankConsentRequests_BrokerProfileId ON dbo.BankConsentRequests (BrokerProfileId);
    PRINT 'BankConsentRequests created';
END
GO
