IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Utilizatori') AND name = 'FirebaseUid')
BEGIN
    ALTER TABLE Utilizatori ADD FirebaseUid NVARCHAR(128) NULL;
END
