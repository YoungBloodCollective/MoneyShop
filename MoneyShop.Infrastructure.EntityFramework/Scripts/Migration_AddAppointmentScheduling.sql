-- Appointment scheduling (Etapa 1B): a call/meeting can have a start time and a duration, so the
-- CRM can show a calendar and refuse overlapping bookings for the same broker.
--
-- Run BEFORE deploying the API that contains Etapa 1B: the API reads these columns on every
-- appointment query. Only adds nullable / defaulted columns and one index; existing rows are kept
-- as they are (they stay "callback requests" with no time until someone schedules them). Idempotent.

IF COL_LENGTH('dbo.Appointments', 'ScheduledAt') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD ScheduledAt DATETIME2 NULL;
    PRINT 'Appointments.ScheduledAt added';
END
GO

IF COL_LENGTH('dbo.Appointments', 'DurationMinutes') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD DurationMinutes INT NOT NULL
        CONSTRAINT DF_Appointments_DurationMinutes DEFAULT (15);
    PRINT 'Appointments.DurationMinutes added';
END
GO

IF COL_LENGTH('dbo.Appointments', 'Source') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD Source NVARCHAR(30) NULL;
    PRINT 'Appointments.Source added';
END
GO

IF COL_LENGTH('dbo.Appointments', 'CreatedByUserId') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD CreatedByUserId INT NULL;
    PRINT 'Appointments.CreatedByUserId added';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Appointments_Broker_ScheduledAt' AND object_id = OBJECT_ID('dbo.Appointments'))
BEGIN
    CREATE INDEX IX_Appointments_Broker_ScheduledAt ON dbo.Appointments (BrokerProfileId, ScheduledAt)
        INCLUDE (DurationMinutes, Status);
    PRINT 'IX_Appointments_Broker_ScheduledAt created';
END
GO
