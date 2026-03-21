-- Migration: Add salary history and credits JSON fields to UserFinancialData
-- Run this on the Azure SQL database

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserFinancialData') AND name = 'Salariu1')
    ALTER TABLE UserFinancialData ADD Salariu1 DECIMAL(18,2) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserFinancialData') AND name = 'Salariu2')
    ALTER TABLE UserFinancialData ADD Salariu2 DECIMAL(18,2) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserFinancialData') AND name = 'Salariu3')
    ALTER TABLE UserFinancialData ADD Salariu3 DECIMAL(18,2) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserFinancialData') AND name = 'CreditsJson')
    ALTER TABLE UserFinancialData ADD CreditsJson NVARCHAR(MAX) NULL;

PRINT 'Migration completed: Added Salariu1, Salariu2, Salariu3, CreditsJson to UserFinancialData';
