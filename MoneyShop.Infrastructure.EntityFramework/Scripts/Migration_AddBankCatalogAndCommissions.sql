-- Bank catalog with monthly thresholds, credit type on bank files, and per-broker commissions:
--   Banks                  - + MonthlyThresholdAmount (prag lunar, RON), + SortOrder; the 14 common banks are seeded
--   BankFiles              - + BankId (FK Banks, backfilled by exact name), + CreditType ('NP' | 'IP')
--   BrokerBankCommissions  - the percent each broker negotiated with each bank (overrides Banks.CommissionPercent)
--
-- RUN IN PRODUCTION BEFORE DEPLOYING the API that reads these columns/tables.
-- Existing Banks rows are not modified or deleted. Idempotent.

IF COL_LENGTH('dbo.Banks', 'MonthlyThresholdAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Banks ADD MonthlyThresholdAmount DECIMAL(18,2) NULL;
    PRINT 'Banks.MonthlyThresholdAmount added';
END
GO

IF COL_LENGTH('dbo.Banks', 'SortOrder') IS NULL
BEGIN
    ALTER TABLE dbo.Banks ADD SortOrder INT NOT NULL CONSTRAINT DF_Banks_SortOrder DEFAULT 0;
    PRINT 'Banks.SortOrder added';
END
GO

INSERT INTO dbo.Banks (Name, CommissionPercent, Active, SortOrder)
SELECT v.Name, 0, 1, v.SortOrder
FROM (VALUES
    (N'Banca Transilvania', 1), (N'BCR', 2), (N'BRD', 3), (N'ING Bank', 4), (N'Raiffeisen Bank', 5),
    (N'UniCredit Bank', 6), (N'CEC Bank', 7), (N'ProCredit Bank', 8), (N'Libra Bank', 9), (N'Exim Bank', 10),
    (N'Patria Bank', 11), (N'Garanti BBVA', 12), (N'OTP Bank', 13), (N'Alpha Bank', 14)
) AS v (Name, SortOrder)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Banks b WHERE b.Name = v.Name);
GO

IF COL_LENGTH('dbo.BankFiles', 'BankId') IS NULL
BEGIN
    ALTER TABLE dbo.BankFiles ADD BankId INT NULL CONSTRAINT FK_BankFiles_Banks REFERENCES dbo.Banks (Id);
    PRINT 'BankFiles.BankId added';
END
GO

IF COL_LENGTH('dbo.BankFiles', 'CreditType') IS NULL
BEGIN
    ALTER TABLE dbo.BankFiles ADD CreditType NVARCHAR(10) NULL;
    PRINT 'BankFiles.CreditType added';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BankFiles_BankId' AND object_id = OBJECT_ID('dbo.BankFiles'))
BEGIN
    CREATE INDEX IX_BankFiles_BankId ON dbo.BankFiles (BankId);
    PRINT 'IX_BankFiles_BankId created';
END
GO

UPDATE f SET f.BankId = (SELECT TOP 1 b.Id FROM dbo.Banks b WHERE b.Name = f.BankName ORDER BY b.Id)
FROM dbo.BankFiles f
WHERE f.BankId IS NULL;
GO

IF OBJECT_ID('dbo.BrokerBankCommissions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BrokerBankCommissions (
        Id                INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BrokerBankCommissions PRIMARY KEY,
        BrokerProfileId   INT NOT NULL CONSTRAINT FK_BrokerBankCommissions_BrokerProfiles REFERENCES dbo.BrokerProfiles (Id),
        BankId            INT NOT NULL CONSTRAINT FK_BrokerBankCommissions_Banks REFERENCES dbo.Banks (Id),
        CommissionPercent DECIMAL(5,2) NOT NULL,
        UpdatedAt         DATETIME2 NOT NULL
    );
    CREATE UNIQUE INDEX UX_BrokerBankCommissions_Broker_Bank ON dbo.BrokerBankCommissions (BrokerProfileId, BankId);
    PRINT 'BrokerBankCommissions created';
END
GO
