-- Login lockout counters on Utilizatori (5 failed attempts -> 15 minute lockout).
--
-- Run BEFORE deploying the API: the API reads and writes these columns on every login.
-- Existing rows get FailedLoginAttempts = 0 and LockoutEndUtc = NULL. Idempotent.

IF COL_LENGTH('dbo.Utilizatori', 'FailedLoginAttempts') IS NULL
    ALTER TABLE dbo.Utilizatori ADD FailedLoginAttempts INT NOT NULL CONSTRAINT DF_Utilizatori_FailedLoginAttempts DEFAULT 0;
GO
IF COL_LENGTH('dbo.Utilizatori', 'LockoutEndUtc') IS NULL
    ALTER TABLE dbo.Utilizatori ADD LockoutEndUtc DATETIME2 NULL;
GO
