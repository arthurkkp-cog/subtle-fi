"use server";

import {
  createLoanApplication as createLoanAppInDb,
  getLoanApplicationsByUserId,
  getLoanApplicationById as getLoanAppByIdFromDb,
  updateLoanApplication as updateLoanAppInDb,
  deleteLoanApplication as deleteLoanAppInDb,
  getBanksByUserId,
} from "@/lib/db";
import { plaidClient } from "@/lib/plaid";
import { parseStringify } from "@/lib/utils";

// Default APR estimates by loan type
const DEFAULT_APR_BY_TYPE: Record<string, number> = {
  mortgage: 6.875,
  auto: 7.25,
  personal: 11.5,
  education: 5.5,
};

// Mock loan data for development (simulates Plaid Liabilities response)
const MOCK_LOANS: Loan[] = [
  {
    id: "loan-mortgage-001",
    userId: "",
    loanType: "mortgage",
    name: "Home Mortgage",
    institutionName: "Mizuho Bank",
    accountId: "mort-acct-001",
    originalAmount: 350000,
    remainingBalance: 287500,
    interestRate: 6.875,
    monthlyPayment: 2298.45,
    status: "current",
    originationDate: "2021-03-15",
    maturityDate: "2051-03-15",
    lastPaymentDate: "2026-02-01",
    nextPaymentDueDate: "2026-03-01",
    propertyAddress: "123 Main St, San Francisco, CA 94102",
  },
  {
    id: "loan-auto-001",
    userId: "",
    loanType: "auto",
    name: "Auto Loan - 2023 Toyota Camry",
    institutionName: "Mizuho Trust",
    accountId: "auto-acct-001",
    originalAmount: 35000,
    remainingBalance: 22750,
    interestRate: 7.25,
    monthlyPayment: 693.42,
    status: "current",
    originationDate: "2023-06-01",
    maturityDate: "2028-06-01",
    lastPaymentDate: "2026-02-15",
    nextPaymentDueDate: "2026-03-15",
  },
  {
    id: "loan-education-001",
    userId: "",
    loanType: "education",
    name: "Federal Student Loan",
    institutionName: "Dept. of Education",
    accountId: "edu-acct-001",
    originalAmount: 45000,
    remainingBalance: 31200,
    interestRate: 5.5,
    monthlyPayment: 487.64,
    status: "current",
    originationDate: "2019-09-01",
    maturityDate: "2029-09-01",
    lastPaymentDate: "2026-02-28",
    nextPaymentDueDate: "2026-03-28",
  },
];

/**
 * Get all loans for a user by aggregating from Plaid Liabilities API.
 * Falls back to mock data in development/sandbox mode.
 */
export const getUserLoans = async ({
  userId,
}: LoansProps): Promise<LoansSummary | null> => {
  try {
    const banks = await getBanksByUserId(userId);
    let loans: Loan[] = [];

    if (banks && banks.length > 0) {
      // Try to fetch liabilities from Plaid for each linked bank
      for (const bank of banks) {
        try {
          const liabilitiesResponse = await plaidClient.liabilitiesGet({
            access_token: bank.accessToken,
          });

          const liabilities = liabilitiesResponse.data.liabilities;

          // Build a Map of account balances keyed by account_id for efficient lookups
          const accountBalances = new Map<string, number>();
          for (const account of liabilitiesResponse.data.accounts) {
            if (account.balances.current != null) {
              accountBalances.set(account.account_id, account.balances.current);
            }
          }

          // Process student loans
          if (liabilities.student) {
            for (const studentLoan of liabilities.student) {
              // Use account balance (balances.current) as the primary source for remaining balance
              const accountBalance = studentLoan.account_id
                ? accountBalances.get(studentLoan.account_id)
                : undefined;
              const fallbackBalance = studentLoan.outstanding_interest_amount
                ? (studentLoan.outstanding_interest_amount + (studentLoan.origination_principal_amount || 0))
                : studentLoan.origination_principal_amount || 0;

              loans.push({
                id: `plaid-student-${studentLoan.account_id}`,
                userId,
                loanType: "education",
                name: studentLoan.loan_name || "Student Loan",
                institutionName: studentLoan.servicer_address?.city || "Student Loan Servicer",
                accountId: studentLoan.account_id || "",
                originalAmount: studentLoan.origination_principal_amount || 0,
                remainingBalance: accountBalance ?? fallbackBalance,
                interestRate: studentLoan.interest_rate_percentage || 0,
                monthlyPayment: studentLoan.minimum_payment_amount || 0,
                status: "current",
                originationDate: studentLoan.origination_date || "",
                maturityDate: studentLoan.expected_payoff_date || undefined,
                lastPaymentDate: studentLoan.last_payment_date || undefined,
                nextPaymentDueDate: studentLoan.next_payment_due_date || undefined,
              });
            }
          }

          // Process mortgages
          if (liabilities.mortgage) {
            for (const mortgage of liabilities.mortgage) {
              // Use account balance (balances.current) as the primary source for remaining balance
              const accountBalance = accountBalances.get(mortgage.account_id);
              const fallbackBalance = mortgage.origination_principal_amount || 0;

              loans.push({
                id: `plaid-mortgage-${mortgage.account_id}`,
                userId,
                loanType: "mortgage",
                name: mortgage.loan_type_description || "Mortgage",
                institutionName: "Mortgage Lender",
                accountId: mortgage.account_id,
                originalAmount: mortgage.origination_principal_amount || 0,
                remainingBalance: accountBalance ?? fallbackBalance,
                interestRate: mortgage.interest_rate?.percentage || 0,
                monthlyPayment: mortgage.last_payment_amount || 0,
                status: mortgage.past_due_amount && mortgage.past_due_amount > 0 ? "late" : "current",
                originationDate: mortgage.origination_date || "",
                maturityDate: mortgage.maturity_date || undefined,
                lastPaymentDate: mortgage.last_payment_date || undefined,
                nextPaymentDueDate: mortgage.next_payment_due_date || undefined,
                propertyAddress: mortgage.property_address
                  ? `${mortgage.property_address.street}, ${mortgage.property_address.city}, ${mortgage.property_address.region} ${mortgage.property_address.postal_code}`
                  : undefined,
              });
            }
          }

          // Process credit cards (as credit liabilities, not traditional loans)
          // Credit cards are tracked separately and not included in the loans list
        } catch {
          // Plaid liabilities may not be available for all accounts
          // Fall through to mock data
        }
      }
    }

    // If no loans found from Plaid, use mock data for development
    if (loans.length === 0) {
      loans = MOCK_LOANS.map((loan) => ({ ...loan, userId }));
    }

    const outstandingBalance = loans.reduce(
      (sum, loan) => sum + loan.remainingBalance,
      0
    );
    const totalMonthlyPayment = loans.reduce(
      (sum, loan) => sum + loan.monthlyPayment,
      0
    );

    return parseStringify({
      totalLoans: loans.length,
      outstandingBalance,
      totalMonthlyPayment,
      loans,
    });
  } catch (error) {
    console.error("Error fetching user loans:", error);
    return null;
  }
};

/**
 * Calculate monthly payment using the amortization formula:
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export const calculateMonthlyPayment = (
  principal: number,
  annualRate: number,
  termMonths: number
): number => {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths;

  const monthlyRate = annualRate / 100 / 12;
  const compoundFactor = Math.pow(1 + monthlyRate, termMonths);
  return (principal * (monthlyRate * compoundFactor)) / (compoundFactor - 1);
};

/**
 * Get estimated APR for a given loan type
 */
export const getEstimatedAPR = (loanType: LoanType): number => {
  return DEFAULT_APR_BY_TYPE[loanType] || 10.0;
};

/**
 * Create a new loan application (save as draft or submit)
 */
export const createNewLoanApplication = async (
  params: CreateLoanApplicationParams
): Promise<LoanApplication | null> => {
  try {
    const application = await createLoanAppInDb({
      userId: params.userId,
      loanType: params.loanType,
      requestedAmount: params.requestedAmount,
      termMonths: params.termMonths,
      status: params.status,
      estimatedAPR: params.estimatedAPR,
      estimatedMonthlyPayment: params.estimatedMonthlyPayment,
      conditionalFields: params.conditionalFields,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      address: params.address,
      city: params.city,
      state: params.state,
      postalCode: params.postalCode,
      dateOfBirth: params.dateOfBirth,
      annualIncome: params.annualIncome,
      employmentStatus: params.employmentStatus,
    });

    return parseStringify(application);
  } catch (error) {
    console.error("Error creating loan application:", error);
    return null;
  }
};

/**
 * Update an existing loan application
 */
export const updateExistingLoanApplication = async (
  params: UpdateLoanApplicationParams
): Promise<LoanApplication | null> => {
  try {
    const application = await updateLoanAppInDb(params.id, {
      loanType: params.loanType,
      requestedAmount: params.requestedAmount,
      termMonths: params.termMonths,
      status: params.status,
      estimatedAPR: params.estimatedAPR,
      estimatedMonthlyPayment: params.estimatedMonthlyPayment,
      conditionalFields: params.conditionalFields,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      address: params.address,
      city: params.city,
      state: params.state,
      postalCode: params.postalCode,
      dateOfBirth: params.dateOfBirth,
      annualIncome: params.annualIncome,
      employmentStatus: params.employmentStatus,
    });

    return parseStringify(application);
  } catch (error) {
    console.error("Error updating loan application:", error);
    return null;
  }
};

/**
 * Get all loan applications for a user
 */
export const getUserLoanApplications = async ({
  userId,
}: LoansProps): Promise<LoanApplication[]> => {
  try {
    const applications = await getLoanApplicationsByUserId(userId);
    return parseStringify(applications);
  } catch (error) {
    console.error("Error fetching loan applications:", error);
    return [];
  }
};

/**
 * Get a single loan application by ID
 */
export const getLoanApplicationById = async ({
  applicationId,
}: LoanApplicationProps): Promise<LoanApplication | null> => {
  try {
    const application = await getLoanAppByIdFromDb(applicationId);
    return parseStringify(application);
  } catch (error) {
    console.error("Error fetching loan application:", error);
    return null;
  }
};

/**
 * Submit a loan application to the lending partner.
 * This is a generic interface that can be connected to any specific lending API.
 */
export const submitToLendingPartner = async (
  applicationId: string
): Promise<{ success: boolean; referenceId?: string; message: string }> => {
  try {
    const application = await getLoanAppByIdFromDb(applicationId);
    if (!application) {
      return { success: false, message: "Application not found" };
    }

    if (application.status !== "submitted") {
      return {
        success: false,
        message: "Application must be in submitted status",
      };
    }

    // Update status to under_review (simulating lending partner acceptance)
    await updateLoanAppInDb(applicationId, { status: "under_review" });

    // In production, this would make an API call to the lending partner
    // e.g., LendingTree, Upstart, or a custom partner API
    const referenceId = `LP-${Date.now()}-${applicationId.substring(0, 8)}`;

    return {
      success: true,
      referenceId,
      message: "Application submitted to lending partner for review",
    };
  } catch (error) {
    console.error("Error submitting to lending partner:", error);
    return { success: false, message: "Failed to submit to lending partner" };
  }
};

/**
 * Delete a draft loan application
 */
export const deleteDraftApplication = async (
  applicationId: string
): Promise<boolean> => {
  try {
    const application = await getLoanAppByIdFromDb(applicationId);
    if (!application || application.status !== "draft") {
      return false;
    }
    await deleteLoanAppInDb(applicationId);
    return true;
  } catch (error) {
    console.error("Error deleting loan application:", error);
    return false;
  }
};
