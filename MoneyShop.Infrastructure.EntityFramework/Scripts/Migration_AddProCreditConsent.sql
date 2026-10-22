-- ProCredit Bank GDPR consent (Anexa nr. 1): per-broker switch. When on, every signed
-- acord also produces the bank's consent form, filled and signed, under KycFiles
-- FileType 'procredit_consent'. Idempotent; run before deploying the API.

IF COL_LENGTH('dbo.BrokerProfiles', 'ProCreditConsentEnabled') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD ProCreditConsentEnabled BIT NOT NULL
        CONSTRAINT DF_BrokerProfiles_ProCredit DEFAULT (0);
    PRINT 'BrokerProfiles.ProCreditConsentEnabled added';
END
GO

UPDATE dbo.BrokerProfiles SET ProCreditConsentEnabled = 1 WHERE Slug = N'alex' AND ProCreditConsentEnabled = 0;
PRINT 'ProCredit consent enabled for alex: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
GO
