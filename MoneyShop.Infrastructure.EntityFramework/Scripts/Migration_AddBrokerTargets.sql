-- Personal monthly targets on BrokerProfiles (set once by the broker in Setari, valid for every month):
--   TargetNpAmount / TargetIpAmount - disbursed NP / IP volume goal (lei), default 5 000 000
--   TargetCommissionAmount          - estimated commission goal (lei), default 150 000
--
-- RUN IN PRODUCTION BEFORE DEPLOYING the API that reads these columns. Idempotent.

IF COL_LENGTH('dbo.BrokerProfiles', 'TargetNpAmount') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD TargetNpAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_BrokerProfiles_TargetNpAmount DEFAULT (5000000);
    PRINT 'BrokerProfiles.TargetNpAmount added';
END
GO

IF COL_LENGTH('dbo.BrokerProfiles', 'TargetIpAmount') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD TargetIpAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_BrokerProfiles_TargetIpAmount DEFAULT (5000000);
    PRINT 'BrokerProfiles.TargetIpAmount added';
END
GO

IF COL_LENGTH('dbo.BrokerProfiles', 'TargetCommissionAmount') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD TargetCommissionAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_BrokerProfiles_TargetCommissionAmount DEFAULT (150000);
    PRINT 'BrokerProfiles.TargetCommissionAmount added';
END
GO
