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

export interface BillsResponse {
  bills: Bill[];
  outstandingAmount: number;
  outstandingMonths: number;
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
  async getMyBills(): Promise<BillsResponse> {
    const { data } = await apiClient.get("/bills/mine");
    return {
      bills: (data.data as any[]).map(normaliseBill),
      outstandingAmount: data.outstandingAmount,
      outstandingMonths: data.outstandingMonths,
    };
  },

  async payBill(billId: string): Promise<PaymentInit> {
    const { data } = await apiClient.post("/bills/pay", { billId });
    return data.data as PaymentInit;
  },
};
