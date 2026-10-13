export const CLIENT_TYPES = ["konsultan", "kontraktor", "owner"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export function isClientType(value: string | null | undefined): value is ClientType {
  return value === "konsultan" || value === "kontraktor" || value === "owner";
}

type PartyDeal = {
  company_id: string | null;
  owner_company_id: string | null;
  consultant_company_id: string | null;
  contractor_company_id: string | null;
};

/** Primary client: contractor, otherwise owner, otherwise consultant. */
export function syncPrimaryCompany(deal: PartyDeal) {
  deal.company_id = deal.contractor_company_id ?? deal.owner_company_id ?? deal.consultant_company_id;
}

/** Put one company into the slot that matches its type, without clearing the other parties. */
export function setParty(deal: PartyDeal, type: ClientType, companyId: string | null) {
  if (type === "owner") deal.owner_company_id = companyId;
  else if (type === "konsultan") deal.consultant_company_id = companyId;
  else deal.contractor_company_id = companyId;
  syncPrimaryCompany(deal);
}

/**
 * The single company picker (quick-add and the deal dialog) fills the matching slot.
 * A previous primary in another slot is released so the picker stays the main client.
 */
export function slotPrimaryCompany(deal: PartyDeal, company: { id: string; client_type: ClientType } | null) {
  if (deal.contractor_company_id === deal.company_id) deal.contractor_company_id = null;
  if (deal.owner_company_id === deal.company_id) deal.owner_company_id = null;
  if (deal.consultant_company_id === deal.company_id) deal.consultant_company_id = null;
  if (company) setParty(deal, company.client_type, company.id);
  else syncPrimaryCompany(deal);
}
