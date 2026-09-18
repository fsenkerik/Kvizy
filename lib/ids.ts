import { customAlphabet } from "nanoid";

/** Krátká ID bez zaměnitelných znaků – používají se i v URL. */
export const newId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 12);

/** 4místný PIN pro studenty. */
export function newPin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}
