const PHONE_REGEX = /^(03|05|07|08|09)[0-9]{8}$/;

export const validateVietnamesePhone = (phone: string): boolean =>
  PHONE_REGEX.test(phone);
