export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

