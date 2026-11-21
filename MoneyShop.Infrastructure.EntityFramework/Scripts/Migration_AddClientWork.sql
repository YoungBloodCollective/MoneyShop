-- Broker follow-up on a client, from the client page in the CRM:
--   ClientTasks  - to-dos with a reminder email at DueAt ("sună-l joi la 10")
--   BankFiles    - loan files submitted to a bank, with the bank's stages and the amount
--   ClientTags   - labels to filter clients by (Probleme BC, De revenit, DTI)
-- Each row belongs to a broker (BrokerProfileId), like appointments and acords.
--
-- Run BEFORE deploying the API that reads these tables. Only new tables; nothing existing changes.
-- Idempotent.

IF OBJECT_ID('dbo.ClientTasks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientTasks (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ClientTasks PRIMARY KEY,
        BrokerProfileId INT NULL CONSTRAINT FK_ClientTasks_BrokerProfiles REFERENCES dbo.BrokerProfiles (Id),
        UserId          INT NOT NULL,
        Title           NVARCHAR(200) NOT NULL,
        DueAt           DATETIME2 NOT NULL,
        DoneAt          DATETIME2 NULL,
        ReminderSentAt  DATETIME2 NULL,
        CreatedAt       DATETIME2 NOT NULL
    );
    CREATE INDEX IX_ClientTasks_BrokerProfileId ON dbo.ClientTasks (BrokerProfileId);
    CREATE INDEX IX_ClientTasks_UserId ON dbo.ClientTasks (UserId);
    CREATE INDEX IX_ClientTasks_DueAt ON dbo.ClientTasks (DueAt);
    PRINT 'ClientTasks created';
END
GO

IF OBJECT_ID('dbo.BankFiles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankFiles (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BankFiles PRIMARY KEY,
        BrokerProfileId INT NULL CONSTRAINT FK_BankFiles_BrokerProfiles REFERENCES dbo.BrokerProfiles (Id),
        UserId          INT NOT NULL,
        BankName        NVARCHAR(100) NOT NULL,
        Amount          DECIMAL(18,2) NOT NULL,
        Status          NVARCHAR(30) NOT NULL,
        StatusChangedAt DATETIME2 NOT NULL,
        Notes           NVARCHAR(1000) NULL,
        CreatedAt       DATETIME2 NOT NULL,
        UpdatedAt       DATETIME2 NOT NULL
    );
    CREATE INDEX IX_BankFiles_BrokerProfileId ON dbo.BankFiles (BrokerProfileId);
    CREATE INDEX IX_BankFiles_UserId ON dbo.BankFiles (UserId);
    PRINT 'BankFiles created';
END
GO

IF OBJECT_ID('dbo.ClientTags', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientTags (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ClientTags PRIMARY KEY,
        BrokerProfileId INT NULL CONSTRAINT FK_ClientTags_BrokerProfiles REFERENCES dbo.BrokerProfiles (Id),
        UserId          INT NOT NULL,
        Tag             NVARCHAR(30) NOT NULL,
        CreatedAt       DATETIME2 NOT NULL
    );
    CREATE INDEX IX_ClientTags_BrokerProfileId ON dbo.ClientTags (BrokerProfileId);
    CREATE INDEX IX_ClientTags_UserId ON dbo.ClientTags (UserId);
    PRINT 'ClientTags created';
END
GO
