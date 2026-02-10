"use client";

import { CompanyDetail } from "./company-detail";

type Props = {
  companyKey: string;
};

export function CompanyDetailProvider({ companyKey }: Props) {
  return <CompanyDetail companyKey={companyKey} />;
}
