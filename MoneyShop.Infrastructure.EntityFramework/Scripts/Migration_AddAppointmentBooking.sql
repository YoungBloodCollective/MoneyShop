-- Public call booking (Etapa 3): the client picks a time on moneyshop.ro, gets an email with a
-- private link to confirm / reschedule / cancel, and receives reminders 24 h and 30 min before.
--
-- Run BEFORE deploying the API that contains Etapa 3: the API reads these columns on every
-- appointment query. Only adds nullable columns and one index; existing rows are unchanged. Idempotent.

IF COL_LENGTH('dbo.Appointments', 'ConfirmationTokenHash') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD ConfirmationTokenHash NVARCHAR(64) NULL;
    PRINT 'Appointments.ConfirmationTokenHash added';
END
GO

IF COL_LENGTH('dbo.Appointments', 'ConfirmedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD ConfirmedAt DATETIME2 NULL;
    PRINT 'Appointments.ConfirmedAt added';
END
GO

IF COL_LENGTH('dbo.Appointments', 'CancelledAt') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD CancelledAt DATETIME2 NULL;
    PRINT 'Appointments.CancelledAt added';
END
GO

IF COL_LENGTH('dbo.Appointments', 'Reminder24hSentAt') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD Reminder24hSentAt DATETIME2 NULL;
    PRINT 'Appointments.Reminder24hSentAt added';
END
GO

IF COL_LENGTH('dbo.Appointments', 'Reminder30mSentAt') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD Reminder30mSentAt DATETIME2 NULL;
    PRINT 'Appointments.Reminder30mSentAt added';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Appointments_ConfirmationTokenHash' AND object_id = OBJECT_ID('dbo.Appointments'))
BEGIN
    CREATE INDEX IX_Appointments_ConfirmationTokenHash ON dbo.Appointments (ConfirmationTokenHash)
        WHERE ConfirmationTokenHash IS NOT NULL;
    PRINT 'IX_Appointments_ConfirmationTokenHash created';
END
GO
