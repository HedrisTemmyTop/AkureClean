import { apiClient } from './api';
import { VerificationItem } from '../types';

const getReviewPath = (item: Pick<VerificationItem, 'kind' | 'id' | 'assignmentId'>) =>
  item.kind === 'pickup'
    ? `/verification/pickup/${item.id}/review`
    : `/verification/stop/${item.assignmentId}/${item.id}/review`;

export const verificationService = {
  async getAdminPending(): Promise<VerificationItem[]> {
    const { data } = await apiClient.get('/verification/admin/pending');
    return (data.data || []) as VerificationItem[];
  },

  async getPendingVerifications(): Promise<VerificationItem[]> {
    return verificationService.getAdminPending();
  },

  async review(
    item: Pick<VerificationItem, 'kind' | 'id' | 'assignmentId'>,
    decision: 'approve' | 'reject',
    note?: string
  ): Promise<void> {
    await apiClient.post(getReviewPath(item), { decision, note });
  },

  async reviewStop(
    assignmentId: string,
    stopId: string,
    action: 'Approve' | 'Reject' | 'approve' | 'reject',
    note?: string
  ): Promise<void> {
    const decision = action.toLowerCase() as 'approve' | 'reject';
    await apiClient.post(`/verification/stop/${assignmentId}/${stopId}/review`, { decision, note });
  },
};

export default verificationService;
