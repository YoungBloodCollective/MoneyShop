-- The per-broker automatic ProCredit consent (Migration_AddProCreditConsent.sql) was
-- replaced by bank consent links. Run AFTER deploying the API that no longer maps
-- BrokerProfiles.ProCreditConsentEnabled. Idempotent.

IF COL_LENGTH('dbo.BrokerProfiles', 'ProCreditConsentEnabled') IS NOT NULL
BEGIN
    IF OBJECT_ID('DF_BrokerProfiles_ProCredit', 'D') IS NOT NULL
        ALTER TABLE dbo.BrokerProfiles DROP CONSTRAINT DF_BrokerProfiles_ProCredit;
    ALTER TABLE dbo.BrokerProfiles DROP COLUMN ProCreditConsentEnabled;
    PRINT 'BrokerProfiles.ProCreditConsentEnabled dropped';
END
GO
