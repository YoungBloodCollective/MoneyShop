-- Pre-documentele bancare semnate odata cu acordul: lista bancilor partenere ale
-- brokerului, ca valori separate prin virgula (procredit,patria,ing,bt). Gol = oprit.
-- Idempotent; de rulat INAINTE de publicarea API-ului.

IF COL_LENGTH('dbo.BrokerProfiles', 'BankPreDocuments') IS NULL
BEGIN
    ALTER TABLE dbo.BrokerProfiles ADD BankPreDocuments NVARCHAR(200) NULL;
    PRINT 'BrokerProfiles.BankPreDocuments added';
END
GO

IF COL_LENGTH('dbo.AcordClients', 'BankDocumentsAccepted') IS NULL
BEGIN
    ALTER TABLE dbo.AcordClients ADD BankDocumentsAccepted BIT NULL;
    PRINT 'AcordClients.BankDocumentsAccepted added';
END
GO

UPDATE dbo.BrokerProfiles
SET BankPreDocuments = N'procredit,patria,ing,bt'
WHERE Slug = N'alex' AND BankPreDocuments IS NULL;
PRINT 'Bank pre-documents enabled for alex: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
GO
