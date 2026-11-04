-- The full CNP, kept encrypted on the subject, plus the sex and birth date derived from
-- it, plus the log of every time the full number is read back.
--
-- Run BEFORE deploying the API that reads these columns. Every column is nullable and no
-- existing column changes, so the running API carries on untouched until the deploy.
--
-- Before the deploy also set Subject:EncryptionKey (32 random bytes, base64) as an app
-- setting / Key Vault reference - NOT in appsettings.json. Without it the API still runs,
-- still matches and masks, and simply stores no CNP.
-- Idempotent.

IF COL_LENGTH('dbo.SubjectMaps', 'CnpEncrypted') IS NULL
BEGIN
    ALTER TABLE dbo.SubjectMaps ADD CnpEncrypted VARBINARY(256) NULL;
    PRINT 'SubjectMaps.CnpEncrypted added';
END
GO

IF COL_LENGTH('dbo.SubjectMaps', 'Sex') IS NULL
BEGIN
    ALTER TABLE dbo.SubjectMaps ADD Sex NVARCHAR(1) NULL;
    PRINT 'SubjectMaps.Sex added';
END
GO

IF COL_LENGTH('dbo.SubjectMaps', 'BirthDate') IS NULL
BEGIN
    ALTER TABLE dbo.SubjectMaps ADD BirthDate DATE NULL;
    PRINT 'SubjectMaps.BirthDate added';
END
GO

-- Existing rows stay empty on purpose: the plaintext CNP was never kept, so there is
-- nothing to backfill from. Each subject fills itself in the next time its CNP passes
-- through the system, and until then the bank forms keep asking the client to type it.

IF OBJECT_ID('dbo.CnpAccessLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CnpAccessLogs (
        Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_CnpAccessLogs PRIMARY KEY,
        SubjectId    NVARCHAR(19)     NOT NULL,
        ActorUserId  INT              NULL,
        ActorRole    NVARCHAR(50)     NULL,
        Reason       NVARCHAR(100)    NOT NULL,
        AcordId      UNIQUEIDENTIFIER NULL,
        Ip           NVARCHAR(64)     NULL,
        UserAgent    NVARCHAR(500)    NULL,
        AccessedAt   DATETIME2        NOT NULL
    );
    CREATE INDEX IX_CnpAccessLogs_SubjectId_AccessedAt ON dbo.CnpAccessLogs (SubjectId, AccessedAt);
    CREATE INDEX IX_CnpAccessLogs_ActorUserId ON dbo.CnpAccessLogs (ActorUserId);
    PRINT 'CnpAccessLogs created';
END
GO
