import { apiClient } from './api';

export interface PaystackInitResponse {
  authorizationUrl: string;
  reference: string;
}

export const paystackService = {
  async initialize(amount: number, metadata: any, callbackUrl?: string): Promise<PaystackInitResponse> {
    const { data } = await apiClient.post('/paystack/initialize', { 
      amount, 
      metadata,
      callback_url: callbackUrl 
    });
    return data.data;
  },

  async verify(reference: string): Promise<any> {
    const { data } = await apiClient.post('/paystack/verify', { reference });
    return data;
  }
};
