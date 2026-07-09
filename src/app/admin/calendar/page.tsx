import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Appointment } from '@/lib/types';

export const dynamic = 'force-dynamic';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const now = new Date();
  const [year, mon] = (month ?? monthKey(now)).split('-').map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const last = new Date(Date.UTC(year, mon, 0, 23, 59, 59));

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .gte('start_time', first.toISOString())
    .lte('start_time', last.toISOString())
    .order('start_time');
  const appointments = (data ?? []) as Appointment[];

  const byDay = new Map<number, Appointment[]>();
  for (const a of appointments) {
    const day = new Date(a.start_time).getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), a]);
  }

  const daysInMonth = new Date(year, mon, 0).getDate();
  // Monday-first grid offset
  const firstWeekday = (new Date(year, mon - 1, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = new Date(year, mon - 2, 1);
  const next = new Date(year, mon, 1);
  const title = first.toLocaleDateString('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const isToday = (day: number) =>
    now.getFullYear() === year && now.getMonth() === mon - 1 && now.getDate() === day;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Calendar</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/admin/calendar?month=${monthKey(prev)}`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold hover:bg-slate-50"
          >
            ←
          </Link>
          <span className="w-40 text-center text-sm font-bold" data-testid="calendar-month">
            {title}
          </span>
          <Link
            href={`/admin/calendar?month=${monthKey(next)}`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold hover:bg-slate-50"
          >
            →
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div
              key={i}
              className={`min-h-24 border-b border-r border-slate-100 p-1.5 [&:nth-child(7n)]:border-r-0 ${
                day == null ? 'bg-slate-50/50' : ''
              }`}
            >
              {day != null && (
                <>
                  <div
                    className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    {day}
                  </div>
                  {(byDay.get(day) ?? []).map((a) => (
                    <Link
                      key={a.id}
                      href={a.lead_id ? `/admin/leads/${a.lead_id}` : '#'}
                      className={`mb-1 block truncate rounded px-1.5 py-1 text-xs font-semibold ${
                        a.status === 'canceled'
                          ? 'bg-slate-100 text-slate-400 line-through'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                      title={`${a.invitee_name ?? a.invitee_email ?? ''}`}
                    >
                      {new Date(a.start_time).toLocaleTimeString('en-IE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      {a.invitee_name ?? a.invitee_email}
                    </Link>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
