-- =============================================
-- Migration: AcordClients profile fields
-- Personal and employment details the client declares on the acord form.
-- All columns are nullable: acords signed before this change have no values.
-- =============================================

IF OBJECT_ID('dbo.AcordClients', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.AcordClients', 'StareCivila') IS NULL
        ALTER TABLE dbo.AcordClients ADD StareCivila NVARCHAR(30) NULL;

    IF COL_LENGTH('dbo.AcordClients', 'StareLocativa') IS NULL
        ALTER TABLE dbo.AcordClients ADD StareLocativa NVARCHAR(30) NULL;

    IF COL_LENGTH('dbo.AcordClients', 'FunctieActuala') IS NULL
        ALTER TABLE dbo.AcordClients ADD FunctieActuala NVARCHAR(150) NULL;

    IF COL_LENGTH('dbo.AcordClients', 'Studii') IS NULL
        ALTER TABLE dbo.AcordClients ADD Studii NVARCHAR(30) NULL;

    IF COL_LENGTH('dbo.AcordClients', 'NumeFirma') IS NULL
        ALTER TABLE dbo.AcordClients ADD NumeFirma NVARCHAR(200) NULL;

    IF COL_LENGTH('dbo.AcordClients', 'VechimeTotalaAni') IS NULL
        ALTER TABLE dbo.AcordClients ADD VechimeTotalaAni DECIMAL(4,1) NULL;

    IF COL_LENGTH('dbo.AcordClients', 'VechimeLocActualAni') IS NULL
        ALTER TABLE dbo.AcordClients ADD VechimeLocActualAni DECIMAL(4,1) NULL;

    PRINT 'AcordClients profile fields ready';
END
GO
