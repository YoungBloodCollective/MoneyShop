// API Configuration
// Backend runs on http://localhost:5259 (HTTP) or https://localhost:7093 (HTTPS - avoid in RN: dev cert causes cancelled requests)
// For physical devices, set LOCAL_IP below to your computer's local IP
// Find your IP: Windows: ipconfig | findstr IPv4 | Mac/Linux: ifconfig | grep inet

// Set this to your computer's local IP when testing on physical device
// Leave empty to use localhost (works for web/simulator only)
const LOCAL_IP = ''; // Example: '10.67.144.35' or leave empty for localhost

const getApiBaseUrl = () => {
  // Check for production API URL from environment variable
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Production fallback (if not in dev mode)
  if (!__DEV__) {
    return 'https://moneyshop20260107220205-adbnf8c7a2fec4d4.azurewebsites.net/api';
  }

  // If LOCAL_IP is set, use it (for physical devices)
  if (LOCAL_IP) {
    return `http://${LOCAL_IP}:5259/api`;
  }

  // Local dev: use HTTP so React Native doesn't cancel requests (HTTPS dev cert is untrusted)
  return 'http://localhost:5259/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@moneyshop:auth_token',
  USER_DATA: '@moneyshop:user_data',
};

// Application Statuses
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

// Credit Types
export const CREDIT_TYPES = {
  IPOTECAR: 'ipotecar',
  NEVOI_PERSONALE: 'nevoi_personale',
};

// Operation Types
export const OPERATION_TYPES = {
  NOU: 'nou',
  REFINANTARE: 'refinantare',
};

