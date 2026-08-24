import { getExchangeRate } from '@/lib/exchange-rate';

export async function ExchangeRateDisplay() {
  const rate = await getExchangeRate();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div
      style={{
        background: '#f0f4f8',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '14px 16px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>
          Live Dollar Rate
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>
          €1 = ${rate.toFixed(2)}
        </div>
      </div>
      <div style={{ textAlign: 'right', borderLeft: '1px solid #cbd5e1', paddingLeft: '24px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Updated at
        </div>
        <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>
          {dateStr}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
          {timeStr}
        </div>
      </div>
    </div>
  );
}
