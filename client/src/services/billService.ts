/**
 * billService.ts — Bill & Payment API service
 * Maps to /api/bills endpoints.
 */
import { apiClient } from "./api";

export interface Bill {
  id: string;
  amount: number;
  year: number;
  month: number;
  status: "unpaid" | "paid";
  paystackReference?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface PaymentInit {
  authorizationUrl: string;
  reference: string;
}

function normaliseBill(raw: any): Bill {
  return {
    id: raw._id ?? raw.id,
    amount: raw.amount,
    year: raw.year,
    month: raw.month,
    status: raw.status,
    paystackReference: raw.paystackReference,
    paidAt: raw.paidAt,
    createdAt: raw.createdAt,
  };
}

export const billService = {
  async getMyBills(): Promise<Bill[]> {
    const { data } = await apiClient.get("/bills/mine");
    return (data.data as any[]).map(normaliseBill);
  },

  /** Initiates a Paystack transaction. Returns the authorization URL to open in a WebView/browser. */
  async payBill(billId: string): Promise<PaymentInit> {
    const { data } = await apiClient.post("/bills/pay", { billId });
    return data.data as PaymentInit;
  },
};
