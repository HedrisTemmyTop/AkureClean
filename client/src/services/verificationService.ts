import { apiClient } from "./api";

export type VerificationStatus =
  | "None"
  | "AwaitingResident"
  | "ResidentConfirmed"
  | "Disputed"
  | "Approved"
  | "Rejected";

export interface VerificationItem {
  kind: "stop" | "pickup";
  id: string;
  assignmentId: string | null;
  assignmentTitle: string;
  address: string;
  ward?: string;
  pollingUnit?: string;
  wasteType?: string;
  collectedAt: string;
  collectionDate: string;
  driver: { name: string; phone?: string } | null;
  resident: { name: string; phone?: string; address?: string } | null;
  verificationStatus: VerificationStatus;
  residentConfirmedAt?: string | null;
  residentNote?: string | null;
  residentImage?: string | null;
  adminNote?: string | null;
  noResponse: boolean;
  canReview: boolean;
}

const base = (item: Pick<VerificationItem, "kind" | "id" | "assignmentId">) =>
  item.kind === "stop"
    ? `/verification/stop/${item.assignmentId}/${item.id}`
    : `/verification/pickup/${item.id}`;

export const verificationService = {
  async getResidentPending(): Promise<VerificationItem[]> {
    const { data } = await apiClient.get("/verification/resident/pending");
    return data.data;
  },

  async confirm(item: VerificationItem): Promise<void> {
    await apiClient.post(`${base(item)}/confirm`, {});
  },

  async dispute(
    item: VerificationItem,
    note: string,
    image?: string | null,
  ): Promise<void> {
    await apiClient.post(`${base(item)}/dispute`, { note, image });
  },

  async getAdminPending(): Promise<VerificationItem[]> {
    const { data } = await apiClient.get("/verification/admin/pending");
    return data.data;
  },

  async review(
    item: VerificationItem,
    decision: "approve" | "reject",
    note?: string,
  ): Promise<void> {
    await apiClient.post(`${base(item)}/review`, { decision, note });
  },
};
