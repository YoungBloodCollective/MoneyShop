IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserFinancialData') AND name = 'FicoScore')
BEGIN
    ALTER TABLE UserFinancialData ADD FicoScore INT NULL;
END
