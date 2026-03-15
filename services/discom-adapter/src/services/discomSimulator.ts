import axios from 'axios';
import logger from '../utils/logger';

const SIMULATOR_URL = process.env.DISCOM_SIMULATOR_URL || 'http://localhost:3009';

export interface DiscomApplicationRequest {
  consumerNumber: string;
  applicationType: string;
  loadRequested: number;
  address: string;
  documents: string[];
}

export interface DiscomApplicationResponse {
  success: boolean;
  referenceNumber?: string;
  status?: string;
  message?: string;
  estimatedCompletionDate?: string;
  error?: string;
}

export const submitApplication = async (
  application: DiscomApplicationRequest
): Promise<DiscomApplicationResponse> => {
  try {
    const response = await axios.post(`${SIMULATOR_URL}/api/applications`, application, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    logger.error('DISCOM simulator error:', error);
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'DISCOM service error',
      };
    }
    return {
      success: false,
      error: 'Failed to connect to DISCOM service',
    };
  }
};

export const checkApplicationStatus = async (
  referenceNumber: string
): Promise<DiscomApplicationResponse> => {
  try {
    const response = await axios.get(`${SIMULATOR_URL}/api/applications/${referenceNumber}/status`, {
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    logger.error('DISCOM status check error:', error);
    return {
      success: false,
      error: 'Failed to check application status',
    };
  }
};
