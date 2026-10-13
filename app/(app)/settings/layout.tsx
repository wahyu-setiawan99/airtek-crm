import { SettingsNav } from "@/components/settings-nav";
import { requireSession } from "@/lib/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <SettingsNav canAdmin={session.role === "owner" || session.role === "admin"} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
