"use client";

import { CompanyDetail } from "./company-detail";

type Props = {
  companyKey: string;
};

export function CompanyDetailProvider({ companyKey }: Props) {
  const numericId = /^\d+$/.test(companyKey) ? parseInt(companyKey, 10) : null;
  return numericId
    ? <CompanyDetail companyId={numericId} />
    : <CompanyDetail companyKey={companyKey} />;
}
