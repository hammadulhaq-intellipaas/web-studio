import { getExchangeRate } from '@/lib/exchange-rate';

export async function ExchangeRateDisplay() {
  const rate = await getExchangeRate();
  const timestamp = new Date().toLocaleString('de-DE');

  return (
    <div
      style={{
        background: '#f0f4f8',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>
          Live Dollar Rate
        </div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
          €1 = ${rate.toFixed(2)}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {timestamp}
      </div>
    </div>
  );
}
