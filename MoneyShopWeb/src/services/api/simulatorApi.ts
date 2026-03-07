import { apiClient } from './apiClient';
import type { ScoringRequest, ScoringResult } from '@/types/application.types';

export const simulatorApi = {
  async calculateScoring(request: ScoringRequest): Promise<ScoringResult> {
    const response = await apiClient.post<ScoringResult>('/simulator/calculate', request);
    return response.data;
  },
};
