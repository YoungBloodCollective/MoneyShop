const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  return 'http://localhost:5260/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'moneyshop:auth_token',
  USER_DATA: 'moneyshop:user_data',
};

export const APPLICATION_STATUS = {
  INREGISTRAT: 'INREGISTRAT',
  IN_ANALIZA: 'IN_ANALIZA',
  NEVOIE_DOCUMENTE: 'NEVOIE_DOCUMENTE',
  PREAPROBAT: 'PREAPROBAT',
  RESPINS: 'RESPINS',
  OFERTA_TRANSMISA: 'OFERTA_TRANSMISA',
  ACCEPTAT_CLIENT: 'ACCEPTAT_CLIENT',
  TRIMIS_LA_BANCA: 'TRIMIS_LA_BANCA',
  APROBAT_BANCA: 'APROBAT_BANCA',
  DISBURSAT: 'DISBURSAT',
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  INREGISTRAT: 'Inregistrat',
  IN_ANALIZA: 'In analiza',
  NEVOIE_DOCUMENTE: 'Nevoie documente',
  PREAPROBAT: 'Pre-aprobat',
  RESPINS: 'Respins',
  OFERTA_TRANSMISA: 'Oferta transmisa',
  ACCEPTAT_CLIENT: 'Acceptat de client',
  TRIMIS_LA_BANCA: 'Trimis la banca',
  APROBAT_BANCA: 'Aprobat de banca',
  DISBURSAT: 'Disbursat',
};

export const CREDIT_TYPES = {
  IPOTECAR: 'ipotecar',
  NEVOI_PERSONALE: 'nevoi_personale',
};

export const OPERATION_TYPES = {
  NOU: 'nou',
  REFINANTARE: 'refinantare',
};
