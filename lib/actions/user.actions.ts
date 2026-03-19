"use server";

import {
  addFundingSource,
  createDwollaCustomer,
} from "@/lib/actions/dwolla.actions";
import {
  createUser,
  createSession,
  deleteSession,
  getSession,
  getUserById,
  verifyPassword,
  updateUser,
  User,
} from "@/lib/db";
import {
  createBank as createBankRecord,
  getBanksByUserId,
  getBankById as getBankByIdFromDb,
  getBankByAccountId as getBankByAccountIdFromDb,
} from "@/lib/db";
import { plaidClient } from "@/lib/plaid";
import {
  encryptId,
  extractCustomerIdFromUrl,
  parseStringify,
} from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  CountryCode,
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum,
  Products,
} from "plaid";

export const getUserInfo = async ({ userId }: UserInfoProps) => {
  try {
    const user = await getUserById(userId);
    return parseStringify(user);
  } catch (error) {
    console.error("Error", error);
  }
};

export const signInUser = async ({ email, password }: SignInProps) => {
  try {
    const user = await verifyPassword(email, password);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const session = await createSession(user.id);

    cookies().set("session-token", session.id, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
    });

    return parseStringify(user);
  } catch (error) {
    console.error("Error", error);
  }
};

export const createNewUser = async ({
  password,
  ...userData
}: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  try {
    const newUser = await createUser({
      email,
      password,
      firstName,
      lastName,
      address1: userData.address1,
      city: userData.city,
      state: userData.state,
      postalCode: userData.postalCode,
      dateOfBirth: userData.dateOfBirth,
      ssn: userData.ssn,
    });

    if (!newUser) throw new Error("Error creating user");

    // Try to create Dwolla customer (optional)
    try {
      const dwollaResult = await createDwollaCustomer({
        ...userData,
        type: "personal",
      });
      if (dwollaResult) {
        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaResult);
        await updateUser(newUser.id, { dwollaCustomerId, dwollaCustomerUrl: dwollaResult });
      }
    } catch (dwollaError) {
      console.warn("Dwolla customer creation skipped:", dwollaError);
    }

    const session = await createSession(newUser.id);

    cookies().set("session-token", session.id, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
    });

    return parseStringify(newUser);
  } catch (error) {
    console.error("Error", error);
  }
};

export async function getCurrentUser() {
  try {
    const sessionToken = cookies().get("session-token");
    if (!sessionToken?.value) {
      return null;
    }

    const session = await getSession(sessionToken.value);
    if (!session) {
      return null;
    }

    const user = await getUserById(session.userId);
    return parseStringify(user);
  } catch (error) {
    console.log(error);
    return null;
  }
}

export const signOutUser = async () => {
  try {
    const sessionToken = cookies().get("session-token");
    if (sessionToken?.value) {
      await deleteSession(sessionToken.value);
    }
    cookies().delete("session-token");
  } catch (error) {
    console.error("Error", error);
  }
};

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.id || user.$id!,
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ["auth"] as Products[],
      language: "en",
      country_codes: ["US"] as CountryCode[],
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);
    return parseStringify({
      linkToken: response.data.link_token,
    });
  } catch (error) {
    console.error("Error", error);
  }
};

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: CreateBankAccountProps) => {
  try {
    const bankAccount = await createBankRecord({
      userId,
      bankId,
      accountId,
      accessToken,
      fundingSourceUrl,
      shareableId,
    });
    return parseStringify(bankAccount);
  } catch (error) {
    console.log(error);
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: ExchangePublicTokenProps) => {
  try {
    // Exchange the public token for an access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse =
      await plaidClient.processorTokenCreate(request);

    const processorToken = processorTokenResponse.data.processor_token;

    // Create a new funding source URL for the account using the Dwolla customer ID, processor token, and bank name
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId!,
      processorToken,
      bankName: accountData.name,
    });

    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) throw Error;

    // Create a bank account using the user ID, item ID, and account ID, access token, funding source URL, and sharable ID
    await createBankAccount({
      userId: user.id || user.$id!,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    // Revalidate the path to reflect the changes
    revalidatePath("/");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error("An error occurred while exchanging public token", error);
  }
};

// get user bank accounts
export const getBanks = async ({ userId }: BanksProps) => {
  try {
    const banks = await getBanksByUserId(userId);
    return parseStringify(banks);
  } catch (error) {
    console.error("Error:", error);
  }
};

// get specific bank from bank collection by document id
export const getBank = async ({ documentId }: BankProps) => {
  try {
    const bank = await getBankByIdFromDb(documentId);
    return parseStringify(bank);
  } catch (error) {
    console.error("Error", error);
  }
};

// get specific bank from bank collection by account id
export const getBankByAccountId = async ({
  accountId,
}: BankByAccountIdProps) => {
  try {
    const bank = await getBankByAccountIdFromDb(accountId);
    return parseStringify(bank);
  } catch (error) {
    console.error("Error", error);
    return null;
  }
};
