-- Append-only audit trail: field-level changes on personal-data tables, document reads,
-- CNP reveals and data transfers to third parties (who, what, when, from which IP).
--
-- Run BEFORE deploying the API: the API writes a row here on every audited change and
-- fails the change if the table is missing. Nothing existing is altered.
-- Idempotent.

IF OBJECT_ID('dbo.AuditEvents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditEvents (
        Id              BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditEvents PRIMARY KEY,
        OccurredAt      DATETIME2 NOT NULL,
        ActorUserId     INT NULL,
        ActorRole       NVARCHAR(20) NULL,
        ActorIp         NVARCHAR(45) NULL,
        BrokerProfileId INT NULL,
        EntityType      NVARCHAR(40) NOT NULL,
        EntityId        NVARCHAR(64) NOT NULL,
        Action          NVARCHAR(40) NOT NULL,
        OldValueJson    NVARCHAR(MAX) NULL,
        NewValueJson    NVARCHAR(MAX) NULL,
        Reason          NVARCHAR(500) NULL
    );
    PRINT 'AuditEvents created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditEvents_EntityType_EntityId_OccurredAt' AND object_id = OBJECT_ID('dbo.AuditEvents'))
BEGIN
    CREATE INDEX IX_AuditEvents_EntityType_EntityId_OccurredAt
        ON dbo.AuditEvents (EntityType, EntityId, OccurredAt);
    PRINT 'IX_AuditEvents_EntityType_EntityId_OccurredAt created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditEvents_ActorUserId_OccurredAt' AND object_id = OBJECT_ID('dbo.AuditEvents'))
BEGIN
    CREATE INDEX IX_AuditEvents_ActorUserId_OccurredAt
        ON dbo.AuditEvents (ActorUserId, OccurredAt);
    PRINT 'IX_AuditEvents_ActorUserId_OccurredAt created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditEvents_OccurredAt' AND object_id = OBJECT_ID('dbo.AuditEvents'))
BEGIN
    CREATE INDEX IX_AuditEvents_OccurredAt
        ON dbo.AuditEvents (OccurredAt);
    PRINT 'IX_AuditEvents_OccurredAt created';
END
GO
