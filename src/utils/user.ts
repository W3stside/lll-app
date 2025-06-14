export const formatPhoneNumber = (phoneNumber?: string) =>
  phoneNumber !== undefined
    ? phoneNumber.startsWith("00")
      ? phoneNumber.slice(2)
      : phoneNumber
    : undefined;
