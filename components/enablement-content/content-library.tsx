"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { ContentAssetRow } from "@/lib/modules/enablement-content/types";

const PERSONA_ITEMS: Record<string, string> = {
  ALL: "All personas",
  DEALER_PRINCIPAL: "Dealer Principal",
  GENERAL_MANAGER: "General Manager",
  SALES_DESK_MANAGER: "Sales Desk Manager",
  FI_MANAGER: "F&I Manager",
  BDC_MANAGER: "BDC Manager",
  INTERNET_MANAGER: "Internet Manager",
};
const PRODUCT_ITEMS: Record<string, string> = { ALL: "All products", FINANCING: "Financing", SOFTWARE: "Software" };

export function ContentLibrary({ assets }: { assets: ContentAssetRow[] }) {
  const [query, setQuery] = useState("");
  const [persona, setPersona] = useState("ALL");
  const [product, setProduct] = useState("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter(
      (a) =>
        (!q || a.title.toLowerCase().includes(q)) &&
        (persona === "ALL" || a.personaTags.includes(persona)) &&
        (product === "ALL" || a.productTags.includes(product))
    );
  }, [assets, query, persona, product]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search content..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-64" />
        <Select items={PERSONA_ITEMS} value={persona} onValueChange={(v) => typeof v === "string" && setPersona(v)}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERSONA_ITEMS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={PRODUCT_ITEMS} value={product} onValueChange={(v) => typeof v === "string" && setProduct(v)}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRODUCT_ITEMS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {assets.length}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{a.title}</p>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {a.assetType.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {a.personaTags.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px]">
                    {PERSONA_ITEMS[p] ?? p}
                  </Badge>
                ))}
              </div>
              <p className={`text-xs ${a.isStale ? "text-destructive" : "text-muted-foreground"}`}>
                {a.isStale ? "Needs re-verification — " : "Last verified "}
                {formatDistanceToNow(new Date(a.lastVerifiedAt), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No content matches this filter.</p>}
      </div>
    </div>
  );
}
