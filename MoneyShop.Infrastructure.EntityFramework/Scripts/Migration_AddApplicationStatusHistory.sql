-- Audit trail of every Applications.Status change (who, from, to, when).
--
-- Run BEFORE deploying the API: the API writes a row here on every status change and
-- fails the change if the table is missing. Nothing existing is altered.
-- Idempotent.

IF OBJECT_ID('dbo.ApplicationStatusHistories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ApplicationStatusHistories (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ApplicationStatusHistories PRIMARY KEY,
        ApplicationId   INT NOT NULL,
        FromStatus      NVARCHAR(50) NULL,
        ToStatus        NVARCHAR(50) NOT NULL,
        ChangedByUserId INT NULL,
        ChangedByRole   NVARCHAR(20) NULL,
        Note            NVARCHAR(1000) NULL,
        ChangedAt       DATETIME2 NOT NULL,
        CONSTRAINT FK_ApplicationStatusHistories_Applications FOREIGN KEY (ApplicationId)
            REFERENCES dbo.Applications (Id) ON DELETE CASCADE
    );
    PRINT 'ApplicationStatusHistories created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ApplicationStatusHistories_ApplicationId_ChangedAt' AND object_id = OBJECT_ID('dbo.ApplicationStatusHistories'))
BEGIN
    CREATE INDEX IX_ApplicationStatusHistories_ApplicationId_ChangedAt
        ON dbo.ApplicationStatusHistories (ApplicationId, ChangedAt);
    PRINT 'IX_ApplicationStatusHistories_ApplicationId_ChangedAt created';
END
GO
