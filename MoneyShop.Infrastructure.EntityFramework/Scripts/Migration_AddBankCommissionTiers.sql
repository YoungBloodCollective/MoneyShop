-- Tiered commissions per bank and credit type, set by the Super Admin:
--   BankCommissionTiers - (BankId, CreditType 'NP' | 'IP', FromAmount, ToAmount NULL = no upper limit, Percent).
--   The monthly disbursed volume of the MoneyShop network at that bank and type picks the tier;
--   its percent applies to the whole amount of every MoneyShop broker's disbursed file.
--
-- RUN IN PRODUCTION BEFORE DEPLOYING the API that reads this table.
-- Existing rows and tables are not modified. Idempotent.

IF OBJECT_ID('dbo.BankCommissionTiers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankCommissionTiers (
        Id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BankCommissionTiers PRIMARY KEY,
        BankId     INT NOT NULL CONSTRAINT FK_BankCommissionTiers_Banks REFERENCES dbo.Banks (Id),
        CreditType NVARCHAR(2) NOT NULL CONSTRAINT CK_BankCommissionTiers_CreditType CHECK (CreditType IN (N'NP', N'IP')),
        FromAmount DECIMAL(18,2) NOT NULL,
        ToAmount   DECIMAL(18,2) NULL,
        [Percent]  DECIMAL(5,2) NOT NULL
    );
    CREATE INDEX IX_BankCommissionTiers_Bank_Type ON dbo.BankCommissionTiers (BankId, CreditType);
    PRINT 'BankCommissionTiers created';
END
GO
