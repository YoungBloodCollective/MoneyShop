-- Google Ads offline conversions: keep the Google click id (gclid) of the visit that sent a call
-- request, so qualified leads from the CRM can be reported back to Google Ads. The site sends it only
-- when the visitor accepted marketing cookies.
--
-- Run BEFORE deploying the API that reads Appointments.Gclid. One nullable column and a filtered
-- index; existing rows are unchanged. Idempotent.

IF COL_LENGTH('dbo.Appointments', 'Gclid') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD Gclid NVARCHAR(200) NULL;
    PRINT 'Appointments.Gclid added';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Appointments_Gclid' AND object_id = OBJECT_ID('dbo.Appointments'))
BEGIN
    CREATE INDEX IX_Appointments_Gclid ON dbo.Appointments (CreatedAt) INCLUDE (Gclid, Status) WHERE Gclid IS NOT NULL;
    PRINT 'IX_Appointments_Gclid created';
END
GO
