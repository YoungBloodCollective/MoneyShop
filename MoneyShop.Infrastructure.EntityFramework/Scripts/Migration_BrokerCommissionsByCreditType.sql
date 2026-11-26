-- Broker commissions per credit type (Nevoi personale / Ipotecar):
--   BrokerBankCommissions - + CreditType ('NP' | 'IP' | NULL); unique per broker, bank and credit type
--
-- Existing rows keep CreditType NULL and keep applying to both NP and IP; the API splits a row the first time
-- the broker changes one of the two. Safe for the API that is live now (it never sees two rows per bank).
-- RUN IN PRODUCTION BEFORE DEPLOYING the API that reads CreditType. Idempotent.

IF COL_LENGTH('dbo.BrokerBankCommissions', 'CreditType') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerBankCommissions ADD CreditType NVARCHAR(2) NULL;
    PRINT 'BrokerBankCommissions.CreditType added';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_BrokerBankCommissions_CreditType')
BEGIN
    ALTER TABLE dbo.BrokerBankCommissions ADD CONSTRAINT CK_BrokerBankCommissions_CreditType CHECK (CreditType IS NULL OR CreditType IN (N'NP', N'IP'));
    PRINT 'CK_BrokerBankCommissions_CreditType added';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_BrokerBankCommissions_Broker_Bank_Type' AND object_id = OBJECT_ID('dbo.BrokerBankCommissions'))
BEGIN
    CREATE UNIQUE INDEX UX_BrokerBankCommissions_Broker_Bank_Type ON dbo.BrokerBankCommissions (BrokerProfileId, BankId, CreditType);
    PRINT 'UX_BrokerBankCommissions_Broker_Bank_Type created';
END
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_BrokerBankCommissions_Broker_Bank' AND object_id = OBJECT_ID('dbo.BrokerBankCommissions'))
BEGIN
    DROP INDEX UX_BrokerBankCommissions_Broker_Bank ON dbo.BrokerBankCommissions;
    PRINT 'UX_BrokerBankCommissions_Broker_Bank dropped';
END
GO
