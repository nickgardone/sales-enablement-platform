export type ContentAssetRow = {
  id: string;
  title: string;
  assetType: string;
  personaTags: string[];
  productTags: string[];
  programTags: string[];
  lastVerifiedAt: string;
  isStale: boolean;
};

export type PlaybookRow = {
  id: string;
  title: string;
  contactPersona: string;
  productType: string;
  steps: string[];
};

export type CertificationRow = {
  id: string;
  name: string;
  programName: string | null;
  description: string | null;
};
