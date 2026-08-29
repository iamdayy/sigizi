import { AuditModel } from './audit';
import { User } from './iam';

export type BankCode = 'BRI' | 'MANDIRI' | 'BNI' | 'BCA' | 'SIPGN_BGN';

export interface VirtualAccount extends AuditModel {
  account_number: string;
  bank_code: BankCode;
  bank_name: string;
  account_holder: string;
  current_balance: number;
  api_integration_enabled: boolean;
  api_client_id?: string;
  api_endpoint?: string;
  is_active: boolean;
}

export interface CreateVirtualAccountRequest {
  account_number: string;
  bank_code: BankCode;
  bank_name: string;
  account_holder: string;
  initial_balance?: number;
  api_integration_enabled?: boolean;
  api_client_id?: string;
  api_endpoint?: string;
}

export type VATransactionChannel = 'MANUAL' | 'API_WEBHOOK' | 'SIPGN_AUTO_TOPUP';

export interface VATransaction extends AuditModel {
  virtual_account_id: string;
  virtual_account?: VirtualAccount;
  transaction_type: 'TOP_UP' | 'DISBURSEMENT' | 'RECONCILIATION';
  channel: VATransactionChannel;
  amount: number;
  balance_after: number;
  reference_number?: string;
  description?: string;
  transaction_date: string;
  verified_by_id?: string;
  verified_by?: User;
}

export interface RecordVATransactionRequest {
  transaction_type: 'TOP_UP' | 'DISBURSEMENT';
  channel?: VATransactionChannel;
  amount: number;
  reference_number?: string;
  description: string;
  transaction_date?: string;
}

export type ReportType =
  | 'DAILY_FUND_USAGE'
  | 'BIWEEKLY_LPA'
  | 'MONTHLY'
  | 'CASH_BOOK'
  | 'PETTY_CASH_BOOK'
  | 'FOOD_SUPPLY_BOOK';

export interface GeneratedReport extends AuditModel {
  report_type: ReportType;
  report_number: string;
  period_start: string;
  period_end: string;
  total_portions: number;
  total_amount: number;
  file_url: string;
  file_size_bytes?: number;
  generated_by_id: string;
  generated_by?: User;
  notes?: string;
}

export interface GenerateReportRequest {
  report_type: ReportType;
  period_start: string;
  period_end: string;
  head_name?: string;
  notes?: string;
}
