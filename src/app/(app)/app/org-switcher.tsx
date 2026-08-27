"use client";

import { useTransition } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronsUpDown } from "lucide-react";
import { switchOrgAction } from "@/lib/auth/actions";
import type { OrgSummary } from "@/lib/auth/session";

/**
 * Org switcher. Selecting an org submits switchOrgAction (which verifies membership
 * server-side and redirects), wrapped in a transition so the trigger shows a pending
 * state. A single-org user still sees the current org name; the menu just lists one.
 */
export function OrgSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: OrgSummary[];
  activeOrgId: string;
}) {
  const [pending, startTransition] = useTransition();
  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];

  function select(id: string) {
    if (id === activeOrgId) return;
    const fd = new FormData();
    fd.set("orgId", id);
    startTransition(() => {
      void switchOrgAction(fd);
    });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={pending}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-foreground transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
      >
        <span className="max-w-[10rem] truncate font-medium">
          {active?.name ?? "Select organization"}
        </span>
        <ChevronsUpDown
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[15rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-elev-2"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Switch organization
          </DropdownMenu.Label>
          {orgs.map((o) => (
            <DropdownMenu.Item
              key={o.id}
              onSelect={() => select(o.id)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-surface-sunken"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-foreground">
                  {o.name}
                </span>
                <span className="text-xs capitalize text-muted-foreground">
                  {o.role}
                </span>
              </span>
              {o.id === activeOrgId ? (
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              ) : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
