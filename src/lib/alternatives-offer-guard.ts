/**
 * DETERMINISTIC GUARD — the agent must never invite the customer to consider
 * alternatives that do not exist.
 *
 * The <available_alternatives> block already tells the model what may be
 * proposed this turn, but a prompt rule is advice, not a guarantee: with a
 * single (or sold-out) product in the catalogue the model still produced
 * "تحب تشوف موديلات تانية؟". That question is a failed reply — the customer
 * says yes and there is nothing behind it.
 *
 * This module removes such sentences from a finished reply whenever the
 * corresponding MAY_OFFER_* fact is false. Pure: no network, no database.
 */

export interface OfferPermissions {
  canOfferOtherModels: boolean;
  canOfferOtherColors: boolean;
  canOfferOtherSizes: boolean;
}

/** "another / other / different" in Egyptian Arabic + English. */
const OTHER = /(تاني|تانيه|تانية|تانيين|أخرى|اخرى|أخر|اخر|غيره|غيرها|مختلف|other|another|different)/i;

const MODEL_WORDS = /(موديل|موديلات|منتج|منتجات|حاج[ةه]|قطع|قطعة|تصميم|تصاميم|شكل|أشكال|اشكال|item|product|model)/i;
const COLOR_WORDS = /(لون|ألوان|الوان|colou?r)/i;
const SIZE_WORDS = /(مقاس|مقاسات|size)/i;

/** Wording that puts an option on the table for the customer. */
const OFFERING =
  /(تحب|حابب|عايز تشوف|عاوز تشوف|ممكن أوريك|ممكن اوريك|أوريك|اوريك|أعرضلك|اعرضلك|أرشحلك|ارشحلك|نجربل?ك|عندنا|فيه|في عندنا|would you like|want to see|we have)/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!؟?\n])/)
    .map((s) => s)
    .filter((s) => s.length > 0);
}

function isForbiddenOffer(sentence: string, perms: OfferPermissions): boolean {
  if (!OTHER.test(sentence)) return false;
  if (!OFFERING.test(sentence)) return false;
  if (!perms.canOfferOtherModels && MODEL_WORDS.test(sentence)) return true;
  if (!perms.canOfferOtherColors && COLOR_WORDS.test(sentence)) return true;
  if (!perms.canOfferOtherSizes && SIZE_WORDS.test(sentence)) return true;
  return false;
}

/**
 * Remove every sentence that offers an alternative the store cannot actually
 * provide right now. Returns the cleaned reply (may be empty when the whole
 * reply was such an offer — the caller then regenerates).
 */
export function stripUnavailableOffers(reply: string, perms: OfferPermissions): string {
  const raw = String(reply ?? "");
  if (!raw.trim()) return "";
  const kept = splitSentences(raw).filter((s) => !isForbiddenOffer(s, perms));
  return kept.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
