export const formatPhoneNumber = (phoneNumber: string) =>
  phoneNumber.startsWith("00") ? phoneNumber.slice(2) : phoneNumber;
