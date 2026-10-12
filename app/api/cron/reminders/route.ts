import { createAdminClient } from "@/lib/supabase/admin";
import { createId, mutateStore } from "@/lib/demo/store";
import { supabaseEnabled } from "@/lib/env";
import { commitSupabaseStore, loadSupabaseStore } from "@/lib/supabase/store";
import type { Store } from "@/types/crm";

function jakartaDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));
}

function remind(store: Store) {
  const today = jakartaDate(new Date().toISOString());
  const messages: { email: string; name: string; overdue: number; today: number }[] = [];
  for (const membership of store.memberships) {
    if (membership.disabled_at) continue;
    const profile = store.profiles.find((item) => item.id === membership.user_id);
    if (!profile?.email) continue;
    const open = store.activities.filter((item) => item.organization_id === membership.organization_id && item.assigned_to === membership.user_id && !item.done_at);
    const overdue = open.filter((item) => jakartaDate(item.due_at) < today).length;
    const dueToday = open.filter((item) => jakartaDate(item.due_at) === today).length;
    if (overdue + dueToday === 0) continue;
    const already = store.notifications.some((item) => item.user_id === membership.user_id && item.type === "activity_due" && jakartaDate(item.created_at) === today);
    if (!already) {
      store.notifications.unshift({
        id: createId(),
        organization_id: membership.organization_id,
        user_id: membership.user_id,
        type: "activity_due",
        payload: { title: `${overdue} terlambat, ${dueToday} hari ini`, href: "/activities" },
        read_at: null,
        created_at: new Date().toISOString(),
      });
    }
    messages.push({ email: profile.email, name: profile.full_name, overdue, today: dueToday });
  }
  return { messages };
}

async function sendDigest(messages: { email: string; name: string; overdue: number; today: number }[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 0;
  let sent = 0;
  for (const message of messages) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Airtek CRM <noreply@airtek.my.id>",
        to: message.email,
        subject: "Pengingat aktivitas Airtek CRM",
        html: `<p>Halo ${message.name},</p><p>Aktivitas terlambat: <strong>${message.overdue}</strong>. Aktivitas hari ini: <strong>${message.today}</strong>.</p><p><a href="https://airtek.my.id/id/activities">Buka aktivitas</a></p>`,
      }),
    });
    if (response.ok) sent += 1;
  }
  return sent;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!supabaseEnabled) {
    const result = mutateStore((store) => remind(store));
    const sent = await sendDigest(result.messages);
    return Response.json({ ok: true, notified: result.messages.length, emailed: sent });
  }
  const admin = createAdminClient();
  const before = await loadSupabaseStore(admin);
  const after = structuredClone(before);
  const result = remind(after);
  const orgs = [...new Set(after.memberships.map((item) => item.organization_id))];
  await commitSupabaseStore(before, after, { organizations: orgs, profiles: [] });
  const sent = await sendDigest(result.messages);
  return Response.json({ ok: true, notified: result.messages.length, emailed: sent });
}
