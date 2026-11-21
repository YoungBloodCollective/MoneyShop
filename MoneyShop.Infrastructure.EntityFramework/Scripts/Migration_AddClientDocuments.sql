-- Client folder in the CRM: documents the broker uploads to a client, filed by folder
-- (ACORD, VENITURI, BC, BANCA + bank name, ALTELE). The file content is stored in the row.
-- Each row belongs to a broker (BrokerProfileId), like the client's tasks and bank files.
--
-- Run BEFORE deploying the API that reads ClientDocuments. Only a new table. Idempotent.

IF OBJECT_ID('dbo.ClientDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientDocuments (
        Id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ClientDocuments PRIMARY KEY,
        BrokerProfileId  INT NULL CONSTRAINT FK_ClientDocuments_BrokerProfiles REFERENCES dbo.BrokerProfiles (Id),
        UserId           INT NOT NULL,
        Folder           NVARCHAR(20) NOT NULL,
        BankName         NVARCHAR(100) NULL,
        FileName         NVARCHAR(255) NOT NULL,
        MimeType         NVARCHAR(100) NOT NULL,
        FileSize         BIGINT NOT NULL,
        Content          VARBINARY(MAX) NOT NULL,
        UploadedByUserId INT NULL,
        CreatedAt        DATETIME2 NOT NULL
    );
    CREATE INDEX IX_ClientDocuments_BrokerProfileId ON dbo.ClientDocuments (BrokerProfileId);
    CREATE INDEX IX_ClientDocuments_UserId ON dbo.ClientDocuments (UserId);
    PRINT 'ClientDocuments created';
END
GO
