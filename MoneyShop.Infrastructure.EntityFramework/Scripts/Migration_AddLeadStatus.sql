-- Lead status (Faza 2): Nou / Contactat / Necalificat / Convertit, and when the lead was first
-- contacted (for the response-time metric and the age timer in the CRM).
--
-- Run BEFORE deploying the API that reads LeadCaptures.Status. Adds one column with a default
-- and one nullable column; existing leads become "Nou", except those that already have notes
-- from the broker, which are marked "Contactat". Idempotent.

IF COL_LENGTH('dbo.LeadCaptures', 'Status') IS NULL
BEGIN
    ALTER TABLE dbo.LeadCaptures ADD Status NVARCHAR(30) NOT NULL
        CONSTRAINT DF_LeadCaptures_Status DEFAULT ('Nou');
    PRINT 'LeadCaptures.Status added';
END
GO

IF COL_LENGTH('dbo.LeadCaptures', 'ContactedAt') IS NULL
BEGIN
    ALTER TABLE dbo.LeadCaptures ADD ContactedAt DATETIME2 NULL;
    PRINT 'LeadCaptures.ContactedAt added';
END
GO

-- Leads the broker already wrote notes on were clearly contacted.
UPDATE dbo.LeadCaptures
SET Status = 'Contactat', ContactedAt = COALESCE(ContactedAt, UpdatedAt)
WHERE Status = 'Nou' AND AdminNotes IS NOT NULL AND LTRIM(RTRIM(AdminNotes)) <> '';
PRINT CONCAT(@@ROWCOUNT, ' leads with notes marked Contactat');
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LeadCaptures_Status_CreatedAt' AND object_id = OBJECT_ID('dbo.LeadCaptures'))
BEGIN
    CREATE INDEX IX_LeadCaptures_Status_CreatedAt ON dbo.LeadCaptures (Status, CreatedAt);
    PRINT 'IX_LeadCaptures_Status_CreatedAt created';
END
GO
