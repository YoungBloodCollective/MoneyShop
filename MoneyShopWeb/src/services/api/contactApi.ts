import { apiClient } from './apiClient';

export interface ContactBrokerRequest {
  name: string;
  gender: 'M' | 'F';
  salary: number;
  dateOfBirth: string;
  email: string;
  phone: string;
  simulationDetails?: string;
}

export const contactApi = {
  async contactBroker(data: ContactBrokerRequest): Promise<void> {
    await apiClient.post('/contact/broker', data);
  },
};
