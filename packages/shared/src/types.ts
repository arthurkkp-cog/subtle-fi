/* eslint-disable no-unused-vars */

export type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// ========================================

export type SignUpParams = {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
  email: string;
  password: string;
};

export type LoginUser = {
  email: string;
  password: string;
};

export type User = {
  $id?: string;
  id?: string;
  email: string;
  userId?: string;
  dwollaCustomerUrl?: string;
  dwollaCustomerId?: string;
  firstName: string;
  lastName: string;
  name?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dateOfBirth?: string;
  ssn?: string;
};

export type NewUserParams = {
  userId: string;
  email: string;
  name: string;
  password: string;
};

export type Account = {
  id: string;
  availableBalance: number;
  currentBalance: number;
  officialName: string;
  mask: string;
  institutionId: string;
  name: string;
  type: string;
  subtype: string;
  appwriteItemId: string;
  shareableId: string;
};

export type Transaction = {
  id: string;
  $id?: string;
  name: string;
  paymentChannel?: string;
  type: string;
  accountId?: string;
  amount: number;
  pending?: boolean;
  category: string;
  date: string;
  image?: string;
  $createdAt?: string;
  channel?: string;
  senderBankId?: string;
  receiverBankId?: string;
};

export type Bank = {
  $id?: string;
  id?: string;
  accountId: string;
  bankId: string;
  accessToken: string;
  fundingSourceUrl?: string;
  userId: string;
  shareableId?: string;
};

export type AccountTypes =
  | "depository"
  | "credit"
  | "loan "
  | "investment"
  | "other";

export type Category = "Food and Drink" | "Travel" | "Transfer";

export type CategoryCount = {
  name: string;
  count: number;
  totalCount: number;
};

export type Receiver = {
  firstName: string;
  lastName: string;
};

export type TransferParams = {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: string;
};

export type AddFundingSourceParams = {
  dwollaCustomerId: string;
  processorToken: string;
  bankName: string;
};

export type NewDwollaCustomerParams = {
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
};

export interface BankCardProps {
  account: Account;
  fullName: string;
  showBalance?: boolean;
}

export interface BankInfoProps {
  account: Account;
  appwriteItemId?: string;
  type: "full" | "card";
}

export interface HeaderBoxProps {
  type?: "title" | "greeting";
  title: string;
  subtext: string;
  userName?: string;
}

export interface MobileNavProps {
  user: User;
}

export interface PageHeaderProps {
  topTitle: string;
  bottomTitle: string;
  topDescription: string;
  bottomDescription: string;
  connectBank?: boolean;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
}

export interface PlaidLinkProps {
  user: User;
  variant?: "primary" | "ghost";
  dwollaCustomerId?: string;
}

export interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

export interface BankDropdownProps {
  accounts: Account[];
  setValue?: any;
  otherStyles?: string;
}

export interface BankTabItemProps {
  account: Account;
  appwriteItemId?: string;
}

export interface TotalBalanceBoxProps {
  accounts: Account[];
  totalBanks: number;
  totalCurrentBalance: number;
}

export interface FooterProps {
  user: User;
  type?: "mobile" | "desktop";
}

export interface RightSidebarProps {
  user: User;
  transactions: Transaction[];
  banks: Bank[] & Account[];
}

export interface SidebarProps {
  user: User;
}

export interface RecentTransactionsProps {
  accounts: Account[];
  transactions: Transaction[];
  appwriteItemId: string;
  page: number;
}

export interface TransactionHistoryTableProps {
  transactions: Transaction[];
  page: number;
}

export interface CategoryBadgeProps {
  category: string;
}

export interface TransactionTableProps {
  transactions: Transaction[];
}

export interface CategoryProps {
  category: CategoryCount;
}

export interface DoughnutChartProps {
  accounts: Account[];
}

export interface PaymentTransferFormProps {
  accounts: Account[];
}

// Actions
export interface AccountsProps {
  userId: string;
}

export interface AccountProps {
  appwriteItemId: string;
}

export interface InstitutionProps {
  institutionId: string;
}

export interface TransactionsProps {
  accessToken: string;
}

export interface CreateFundingSourceOptions {
  customerId: string;
  fundingSourceName: string;
  plaidToken: string;
  _links: object;
}

export interface CreateTransactionProps {
  name: string;
  amount: string;
  senderId: string;
  senderBankId: string;
  receiverId: string;
  receiverBankId: string;
  email: string;
}

export interface TransactionsByBankIdProps {
  bankId: string;
}

export interface SignInProps {
  email: string;
  password: string;
}

export interface UserInfoProps {
  userId: string;
}

export interface ExchangePublicTokenProps {
  publicToken: string;
  user: User;
}

export interface CreateBankAccountProps {
  accessToken: string;
  userId: string;
  accountId: string;
  bankId: string;
  fundingSourceUrl: string;
  shareableId: string;
}

export interface BanksProps {
  userId: string;
}

export interface BankProps {
  documentId: string;
}

export interface BankByAccountIdProps {
  accountId: string;
}

export interface UrlQueryParams {
  params: string;
  key: string;
  value: string;
}

// API Response types
export interface AccountsResponse {
  data: Account[];
  totalBanks: number;
  totalCurrentBalance: number;
  transactions: Transaction[];
}

export interface AccountResponse {
  data: Account | null;
  transactions: Transaction[];
}

export interface LinkTokenResponse {
  linkToken: string;
}

export interface ExchangeTokenResponse {
  publicTokenExchange: string;
}
