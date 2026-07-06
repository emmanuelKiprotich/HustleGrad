import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlobalNav, Button } from './index';

const demoFlow = [
  {
    title: 'Marketplace discovery',
    detail: 'Open Browse, filter by category or campus zone, then point out delivery tags and seller contact details.',
  },
  {
    title: 'Buyer checkout',
    detail: 'Open a listing, request delivery if available, enter a Safaricom number, and trigger the M-PESA checkout panel.',
  },
  {
    title: 'Order handoff',
    detail: 'Create a booking, mark it received as the buyer, then show the vendor dashboard where the seller can mark it done.',
  },
  {
    title: 'Seller tools',
    detail: 'Create a listing with either a photo URL or Browse upload, add delivery availability, and review dashboard metrics.',
  },
  {
    title: 'AI helper',
    detail: 'Open the floating AI assistant and ask about delivery, M-PESA, safe buying, or creating a better listing.',
  },
];

const demoChecks = [
  'Backend is running on port 5000 and connected to the demo database.',
  'Frontend is running on port 3000.',
  'Demo database has been seeded with schema.sql.',
  'Email OTP credentials work, or you have a verified local demo account ready.',
  'Daraja credentials match the selected sandbox or production environment.',
];

const PresentationGuide = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <GlobalNav />
      <main className="presentation-page page-enter">
        <section className="presentation-hero">
          <div>
            <span className="badge badge-primary">Demo mode</span>
            <h1>HustleGrad Presentation Runbook</h1>
            <p>
              A quick path through the story: discover a campus hustle, pay with M-PESA,
              request delivery, confirm receipt, and let the vendor mark the order done.
            </p>
          </div>
          <div className="presentation-actions">
            <Button onClick={() => navigate('/marketplace')}>Start Demo</Button>
            <Button variant="neutral" onClick={() => navigate('/dashboard')}>Vendor Dashboard</Button>
          </div>
        </section>

        <section className="presentation-grid">
          <div className="presentation-panel">
            <h2>Demo Flow</h2>
            <div className="demo-flow-list">
              {demoFlow.map((item, index) => (
                <article key={item.title} className="demo-flow-item">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="presentation-panel">
            <h2>Pre-demo Checks</h2>
            <ul className="demo-check-list">
              {demoChecks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            <div className="demo-note">
              <strong>Tip</strong>
              <p>Keep the AI assistant open near the end as a memorable close: it shows how the marketplace helps students act without hunting for instructions.</p>
            </div>
          </aside>
        </section>

        <section className="presentation-panel presentation-links">
          <h2>Useful Links</h2>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/dashboard">Student Dashboard</Link>
          <Link to="/messages">Messages</Link>
          <Link to="/contact">Contact Page</Link>
        </section>
      </main>
    </div>
  );
};

export default PresentationGuide;
