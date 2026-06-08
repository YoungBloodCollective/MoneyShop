-- Migration: Add CEO qualification fields to Appointments
-- Date: 2026-06-08
-- Fields: IntarzieriBirou (NU / Da-30 zile / Da-60 zile / Da-Peste 90 zile)
--         PopriRecuperare (DA / NU)

IF COL_LENGTH('dbo.Appointments', 'IntarzieriBirou') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD IntarzieriBirou NVARCHAR(50) NULL;
    PRINT 'Added column IntarzieriBirou to Appointments.';
END
ELSE
    PRINT 'Column IntarzieriBirou already exists — skipped.';

IF COL_LENGTH('dbo.Appointments', 'PopriRecuperare') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD PopriRecuperare NVARCHAR(10) NULL;
    PRINT 'Added column PopriRecuperare to Appointments.';
END
ELSE
    PRINT 'Column PopriRecuperare already exists — skipped.';
