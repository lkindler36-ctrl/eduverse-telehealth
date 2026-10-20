import { requireStaff } from "@/lib/staff-page";
import { StaffShell } from "@/components/staff-shell";
import { SearchPanel } from "@/components/search-panel";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const user = await requireStaff();
  return (
    <StaffShell user={user} pathname="/search">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-care">Search</p>
        <h1 className="mt-2 font-display text-4xl">Find a chart, visit, or note</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Search stays on your assigned caseload (admins and auditors see all active records).
        </p>
        <div className="mt-8">
          <SearchPanel />
        </div>
      </main>
    </StaffShell>
  );
}
