export const parseStringify = (value: any) =>
  JSON.parse(JSON.stringify(value));

export const extractCustomerIdFromUrl = (url: string) => {
  const parts = url.split("/");
  const customerId = parts[parts.length - 1];
  return customerId;
};

export const encryptId = (id: string) => btoa(id);

export const decryptId = (id: string) => atob(id);
