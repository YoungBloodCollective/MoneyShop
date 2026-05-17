-- Migration: Add PartnerApplications table
-- Date: 2026-05-17

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PartnerApplications' AND xtype='U')
BEGIN
    CREATE TABLE PartnerApplications (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        Nume        NVARCHAR(200)  NOT NULL,
        Prenume     NVARCHAR(200)  NOT NULL DEFAULT '',
        Telefon     NVARCHAR(50)   NOT NULL,
        Email       NVARCHAR(200)  NOT NULL DEFAULT '',
        Judet       NVARCHAR(100)  NOT NULL DEFAULT '',
        Descriere   NVARCHAR(2000) NOT NULL DEFAULT '',
        Status      NVARCHAR(50)   NOT NULL DEFAULT 'Nou',
        Notes       NVARCHAR(1000) NULL,
        CreatedAt   DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt   DATETIME2      NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX IX_PartnerApplications_Status   ON PartnerApplications (Status);
    CREATE INDEX IX_PartnerApplications_CreatedAt ON PartnerApplications (CreatedAt DESC);

    PRINT 'PartnerApplications table created.';
END
ELSE
    PRINT 'PartnerApplications table already exists — skipped.';
