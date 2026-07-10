import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { eur, STATUS_COLORS } from '@/lib/admin/format';
import { LocalTime } from '@/components/admin/LocalTime';
import type { Lead, Appointment } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  const [leadsRes, apptsRes, countRes] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(8),
    supabase
      .from('appointments')
      .select('*')
      .eq('status', 'scheduled')
      .gte('start_time', new Date().toISOString())
      .order('start_time')
      .limit(5),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
  ]);

  const leads = (leadsRes.data ?? []) as Lead[];
  const appts = (apptsRes.data ?? []) as Appointment[];
  const total = countRes.count ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Dashboard</h1>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Total leads</div>
          <div className="mt-1 text-3xl font-extrabold" data-testid="stat-total-leads">
            {total}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">New leads</div>
          <div className="mt-1 text-3xl font-extrabold">
            {leads.filter((l) => l.status === 'new').length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Upcoming appointments
          </div>
          <div className="mt-1 text-3xl font-extrabold">{appts.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Recent leads</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {leads.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No leads yet.</div>
            ) : (
              leads.map((l) => (
                <Link
                  key={l.id}
                  href={`/admin/leads/${l.id}`}
                  className="flex items-center gap-4 border-b border-slate-100 px-5 py-3 text-sm transition last:border-0 hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {[l.vorname, l.nachname].filter(Boolean).join(' ') || l.email}
                    {l.firma ? <span className="font-normal text-slate-500"> · {l.firma}</span> : null}
                  </span>
                  <span className="text-slate-500">{l.config?.bundleName}</span>
                  <span className="font-semibold">{eur(l.total_one_time)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[l.status]}`}
                  >
                    {l.status}
                  </span>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    <LocalTime iso={l.created_at} />
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold">Next appointments</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {appts.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">Nothing scheduled.</div>
            ) : (
              appts.map((a) => (
                <div key={a.id} className="border-b border-slate-100 px-5 py-3 text-sm last:border-0">
                  <div className="font-semibold">{a.invitee_name ?? a.invitee_email}</div>
                  <div className="text-xs text-slate-500"><LocalTime iso={a.start_time} /></div>
                  {a.lead_id && (
                    <Link href={`/admin/leads/${a.lead_id}`} className="text-xs font-semibold text-blue-600">
                      View lead →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
