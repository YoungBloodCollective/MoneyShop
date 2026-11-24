-- Broker type on BrokerProfiles:
--   BrokerProfiles.Type - 'MoneyShop' (the head broker's own network) | 'Afiliat' (affiliate partners), default 'Afiliat'
-- The only MoneyShop broker today is the profile with Slug = 'alex'; every other broker stays Afiliat.
--
-- RUN IN PRODUCTION BEFORE DEPLOYING the API that reads this column. Idempotent.

IF COL_LENGTH('dbo.BrokerProfiles', 'Type') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD [Type] NVARCHAR(20) NOT NULL CONSTRAINT DF_BrokerProfiles_Type DEFAULT ('Afiliat');
    PRINT 'BrokerProfiles.Type added';
END
GO

UPDATE dbo.BrokerProfiles SET [Type] = 'MoneyShop' WHERE Slug = 'alex' AND [Type] <> 'MoneyShop';
GO
