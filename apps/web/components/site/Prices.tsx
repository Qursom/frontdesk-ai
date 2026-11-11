import { prices } from '@/lib/clinic-content';

export default function Prices() {
  return (
    <section id="prices" className="section section-warm" aria-labelledby="prices-title">
      <div className="container">
        <header className="site-section-head">
          <h2 id="prices-title">Prices</h2>
          <p>Clear &quot;from&quot; prices, so you know where you stand before you visit.</p>
        </header>

        <div className="card site-prices-card">
          <div className="site-table-wrap" role="region" aria-labelledby="prices-caption" tabIndex={0}>
            <table className="site-prices">
              <caption id="prices-caption">Guide prices in GBP</caption>
              <thead>
                <tr>
                  <th scope="col">Treatment</th>
                  <th scope="col">From</th>
                  <th scope="col">What&apos;s included</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.treatment}>
                    <th scope="row">{p.treatment}</th>
                    <td className="site-prices-from">{p.from}</td>
                    <td>{p.included}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="site-prices-note">
            Guide prices. Final price confirmed at your consultation. Written treatment plan before any work.
          </p>
          <p className="site-finance">
            <span className="badge badge-accent">0% finance</span>
            0% finance on treatments over £1,000, over 6 or 12 months, subject to approval (demo).
          </p>
        </div>
      </div>
    </section>
  );
}
