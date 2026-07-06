// frontend/src/components/marketplace/MarketplaceHome.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsApi } from '../../api';
import { GlobalNav, Spinner, Alert, EmptyState, Button } from '../shared';
import { resolveMediaUrl } from '../../utils/media';

const CATEGORIES = [
  { id: '',  name: '🌐 All',          color: '#0288d1' },
  { id: 1,   name: '🎨 Graphics',     color: '#7c3aed' },
  { id: 2,   name: '💻 Tech',         color: '#0891b2' },
  { id: 3,   name: '🍰 Food',         color: '#d97706' },
  { id: 4,   name: '👗 Apparel',      color: '#db2777' },
];

const CAMPUS_ZONES = [
  '',
  'Student Centre (STC)',
  'Phase 2',
  'The Library Gates',
  'The Cafeteria/Gazebos',
];

const ListingCard = ({ listing, onClick }) => (
  <button className="listing-card reveal" onClick={onClick}>
    {listing.photo_url && (
      <img src={resolveMediaUrl(listing.photo_url)} alt="" className="listing-photo" loading="lazy" />
    )}
    <div className="card-category">{listing.category_name}</div>
    <h3>{listing.title}</h3>
    <p className="card-desc">
      {listing.description?.length > 100
        ? listing.description.substring(0, 100) + '…'
        : listing.description}
    </p>
    <div className="card-footer">
      <span className="card-price">KES {parseFloat(listing.price).toLocaleString()}</span>
      <span className="card-seller">by {listing.seller_name}</span>
    </div>
    {(listing.contact_phone || listing.seller_phone_number) && (
      <div className="listing-contact">Call: {listing.contact_phone || listing.seller_phone_number}</div>
    )}
    {listing.campus_zone && <div className="campus-zone-tag">{listing.campus_zone}</div>}
    {listing.offers_delivery && (
      <div className="delivery-tag">Delivery KES {Number(listing.delivery_fee || 0).toLocaleString()}</div>
    )}
  </button>
);

const MarketplaceHome = () => {
  const navigate = useNavigate();
  const [listings,   setListings]   = useState([]);
  const [keyword,    setKeyword]    = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [campusZone, setCampusZone] = useState('');
  const [topHustlers, setTopHustlers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const fetchListings = useCallback(async (kw, cat, zone) => {
    setLoading(true); setError('');
    try {
      const res = await listingsApi.search({
        keyword: kw || undefined,
        category_id: cat || undefined,
        campus_zone: zone || undefined,
      });
      setListings(res.data.listings || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchListings('', '', '');
    listingsApi.topHustlers()
      .then((res) => setTopHustlers(res.data.hustlers || []))
      .catch(() => setTopHustlers([]));
  }, [fetchListings]);

  const handleSearch = (e) => { e.preventDefault(); fetchListings(keyword, categoryId, campusZone); };
  const handleCategory = (id) => { setCategoryId(id); fetchListings(keyword, id, campusZone); };
  const handleCampusZone = (zone) => { setCampusZone(zone); fetchListings(keyword, categoryId, zone); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <GlobalNav />

      {/* ── Page header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        padding: '48px 24px 36px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <h1 className="reveal" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', color: '#fff', marginBottom: 10 }}>
          🏪 HustleGrad Marketplace
        </h1>
        <p className="reveal" style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 28 }}>
          Discover services from your fellow Strathmore students
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="reveal" style={{ maxWidth: 560, margin: '0 auto', display:'flex', gap:10 }}>
          <div className="search-bar" style={{ flex:1, position:'relative' }}>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Search listings…"
              style={{ borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.95)', width:'100%' }}
            />
          </div>
          <Button type="submit" style={{ borderRadius: 'var(--radius-md)', whiteSpace:'nowrap' }}>Search</Button>
        </form>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {/* Category pills */}
        <div className="category-pills reveal" style={{ marginBottom: 24 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`category-pill ${categoryId === c.id ? 'active' : ''}`}
              onClick={() => handleCategory(c.id)}
              style={categoryId === c.id ? { background: c.color, borderColor: c.color } : {}}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="marketplace-filter-row reveal">
          <label htmlFor="campus-zone-filter">Campus Zone</label>
          <select id="campus-zone-filter" value={campusZone} onChange={(event) => handleCampusZone(event.target.value)}>
            {CAMPUS_ZONES.map((zone) => (
              <option key={zone || 'all'} value={zone}>{zone || 'All campus zones'}</option>
            ))}
          </select>
        </div>

        <Alert type="error" message={error} />

        {topHustlers.length > 0 && (
          <section className="top-hustlers reveal" aria-label="Top hustlers by rating">
            <div>
              <h2>Top Hustlers</h2>
              <p>Ranked by average rating from completed service reviews.</p>
            </div>
            <div className="top-hustlers-list">
              {topHustlers.map((hustler, index) => (
                <div key={hustler.id} className="top-hustler">
                  {hustler.profile_picture_url ? (
                    <img src={resolveMediaUrl(hustler.profile_picture_url)} alt="" />
                  ) : (
                    <span>{hustler.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</span>
                  )}
                  <div>
                    <strong>#{index + 1} {hustler.name}</strong>
                    <small>{Number(hustler.average_rating).toFixed(2)} stars · {hustler.review_count} review{hustler.review_count !== 1 ? 's' : ''}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <Spinner label="Loading listings…" />
        ) : listings.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No listings found"
            subtitle="Try a different keyword or category."
            action={<Button variant="ghost" onClick={() => { setKeyword(''); setCampusZone(''); fetchListings('', categoryId, ''); }}>Clear filters</Button>}
          />
        ) : (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              {listings.length} listing{listings.length !== 1 ? 's' : ''} found
            </p>
            <div className="listings-grid">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} onClick={() => navigate(`/listing/${l.id}`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarketplaceHome;
