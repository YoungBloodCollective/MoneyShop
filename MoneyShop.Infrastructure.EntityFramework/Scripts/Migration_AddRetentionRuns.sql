-- Data-retention sweep log (one row per run) and KycFiles.DeletedReason.
--
-- Run BEFORE deploying the API: the retention sweep writes a row to RetentionRuns on every run,
-- and KYC verification now sets KycFiles.DeletedReason instead of hard-deleting the file rows.
-- Nothing existing is altered besides the new nullable column. Idempotent.

IF OBJECT_ID('dbo.RetentionRuns', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RetentionRuns (
        Id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RetentionRuns PRIMARY KEY,
        StartedAt   DATETIME2 NOT NULL,
        FinishedAt  DATETIME2 NULL,
        Status      NVARCHAR(20) NOT NULL,
        SummaryJson NVARCHAR(MAX) NULL,
        Error       NVARCHAR(2000) NULL
    );
    PRINT 'RetentionRuns created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RetentionRuns_StartedAt' AND object_id = OBJECT_ID('dbo.RetentionRuns'))
BEGIN
    CREATE INDEX IX_RetentionRuns_StartedAt ON dbo.RetentionRuns (StartedAt);
    PRINT 'IX_RetentionRuns_StartedAt created';
END
GO

IF COL_LENGTH('dbo.KycFiles', 'DeletedReason') IS NULL
BEGIN
    ALTER TABLE dbo.KycFiles ADD DeletedReason NVARCHAR(30) NULL;
    PRINT 'KycFiles.DeletedReason added';
END
GO
