-- Add ParsedDataJson column to BcReports table
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BcReports') AND name = 'ParsedDataJson')
BEGIN
    ALTER TABLE BcReports ADD ParsedDataJson NVARCHAR(MAX) NULL;
END
