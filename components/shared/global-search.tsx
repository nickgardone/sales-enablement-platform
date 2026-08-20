"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Building2, FileWarning, Handshake, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { search } from "@/lib/platform/search-actions";
import type { SearchResult, SearchResultKind } from "@/lib/platform/search";

const KIND_ICON: Record<SearchResultKind, React.ComponentType<{ className?: string }>> = {
  ROOFTOP: Building2,
  CONTACT: User,
  OPPORTUNITY: Handshake,
  EXCEPTION_REQUEST: FileWarning,
  CONTENT_ASSET: BookOpen,
};

const KIND_LABEL: Record<SearchResultKind, string> = {
  ROOFTOP: "Accounts",
  CONTACT: "Contacts",
  OPPORTUNITY: "Opportunities",
  EXCEPTION_REQUEST: "Pricing Exceptions",
  CONTENT_ASSET: "Content",
};

/**
 * Cross-module ⌘K search (spec Section 7): rooftops, contacts, opportunities,
 * exceptions, content in one ranked list — "the single most visceral one
 * system, not six demonstration."
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const res = await search(query);
      if (requestIdRef.current === requestId) {
        setResults(res);
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const select = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const grouped = new Map<SearchResultKind, SearchResult[]>();
  for (const r of results) {
    const arr = grouped.get(r.kind) ?? [];
    arr.push(r);
    grouped.set(r.kind, arr);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-56 justify-start gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search everything</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Global search" description="Search rooftops, contacts, opportunities, exceptions, and content">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search rooftops, contacts, opportunities, exceptions, content..." value={query} onValueChange={setQuery} />
          <CommandList>
            {query.trim().length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            ) : isSearching ? (
              <CommandEmpty>Searching...</CommandEmpty>
            ) : results.length === 0 ? (
              <CommandEmpty>No results for &quot;{query}&quot;.</CommandEmpty>
            ) : (
              Array.from(grouped.entries()).map(([kind, items]) => {
                const Icon = KIND_ICON[kind];
                return (
                  <CommandGroup key={kind} heading={KIND_LABEL[kind]}>
                    {items.map((item) => (
                      <CommandItem key={`${item.kind}-${item.id}`} value={`${item.kind}-${item.id}`} onSelect={() => select(item.href)}>
                        <Icon className="size-4" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{item.title}</span>
                          <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
