// frontend/src/components/dashboard/StudentDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsApi, listingsApi, profilesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { GlobalNav, Spinner, Alert, Card, Button, EmptyState, Badge } from '../shared';
import { normalizePhotoUrl, resolveMediaUrl } from '../../utils/media';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const emptyListingForm = { title:'', description:'', price:'', category_id:'', campus_zone:'', photo_url:'', contact_phone:'', offers_delivery:false, delivery_fee:'' };
  const [form, setForm]       = useState(emptyListingForm);
  const [formBusy, setFormBusy] = useState(false);
  const [formMsg, setFormMsg]  = useState('');
  const [formErr, setFormErr]  = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [orderBusyId, setOrderBusyId] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const campusZones = [
    'Student Centre (STC)',
    'Phase 2',
    'The Library Gates',
    'The Cafeteria/Gazebos',
  ];

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await listingsApi.getDashboard();
      setData(res.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setAvatarError(false); }, [user?.profile_picture_url]);

  const handleCreate = async (e) => {
    e.preventDefault(); setFormBusy(true); setFormMsg(''); setFormErr('');
    try {
      await listingsApi.create({ ...form, photo_url: normalizePhotoUrl(form.photo_url) });
      setFormMsg('Listing published!');
      setForm(emptyListingForm);
      load();
      setTimeout(() => setShowForm(false), 1500);
    } catch (err) { setFormErr(err.message); }
    finally { setFormBusy(false); }
  };

  const handleListingPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoBusy(true); setFormErr('');
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
      if (file.size > 2 * 1024 * 1024) throw new Error('Listing photo must be smaller than 2MB.');

      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that image.'));
        reader.readAsDataURL(file);
      });

      setForm((prev) => ({ ...prev, photo_url: imageDataUrl }));
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setPhotoBusy(false);
      event.target.value = '';
    }
  };

  const handleMarkDone = async (bookingId) => {
    setOrderBusyId(bookingId); setError('');
    try {
      await bookingsApi.markComplete(bookingId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setOrderBusyId(null);
    }
  };

  const handleProfilePicture = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadBusy(true); setUploadMsg(''); setUploadErr('');
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
      if (file.size > 2 * 1024 * 1024) throw new Error('Profile picture must be smaller than 2MB.');

      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that image.'));
        reader.readAsDataURL(file);
      });

      const res = await profilesApi.updateProfilePicture(imageDataUrl);
      updateUser(res.data.user);
      setUploadMsg('Profile picture updated.');
    } catch (err) {
      setUploadErr(err.message);
    } finally {
      setUploadBusy(false);
      event.target.value = '';
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <GlobalNav />
      <div className="dashboard-page page-enter">
        <div className="dashboard-topbar">
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            {user?.profile_picture_url && !avatarError ? (
              <img
                src={resolveMediaUrl(user.profile_picture_url)}
                alt=""
                className="profile-avatar"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">
                {(user?.name || 'HG').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 style={{ margin:0, fontSize:'1.5rem' }}>Welcome back, {user?.name?.split(' ')[0]}</h2>
              <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:'0.85rem' }}>{user?.email}</p>
              {user?.admission_number && (
                <p style={{ margin:'2px 0 0', color:'var(--text-muted)', fontSize:'0.8rem' }}>Admission: {user.admission_number}</p>
              )}
              <div style={{ marginTop:8 }}>
                <label className="btn btn-neutral btn-sm" style={{ cursor: uploadBusy ? 'not-allowed' : 'pointer' }}>
                  {uploadBusy ? 'Uploading...' : 'Upload photo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProfilePicture} disabled={uploadBusy} className="sr-only" />
                </label>
              </div>
            </div>
          </div>
          <div className="dashboard-topbar-actions">
            <Button variant="neutral" size="sm" onClick={() => navigate('/messages')}>💬 Messages</Button>
            <Button variant="neutral" size="sm" onClick={() => navigate('/marketplace')}>🏪 Browse</Button>
          </div>
        </div>

        <Alert type="error" message={error} />
        <Alert type="success" message={uploadMsg} />
        <Alert type="error" message={uploadErr} />

        {loading ? <Spinner /> : (
          <>
            {/* Stats */}
            <div className="stats-grid reveal">
              {[
                { icon:'📦', label:'My Listings',    value: data?.listings?.length ?? 0 },
                { icon:'📬', label:'Total Requests',  value: data?.summary?.totalRequests ?? 0 },
                { icon:'👀', label:'Listing Views',   value: data?.summary?.totalViews ?? 0 },
                { icon:'🤝', label:'Offers',          value: data?.summary?.totalOffers ?? 0 },
                { icon:'💰', label:'Total Earned',    value: `KES ${(data?.summary?.totalEarnings ?? 0).toLocaleString()}` },
                { icon:'⏳', label:'Pending Orders',  value: data?.activeOrders?.length ?? 0 },
              ].map(({ icon, label, value }) => (
                <div key={label} className="stat-card">
                  <div className="stat-icon">{icon}</div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Listings header */}
            <div className="flex justify-between items-center mb-4 reveal" style={{ marginTop: 8 }}>
              <h3 style={{ margin:0 }}>My Listings</h3>
              <Button size="sm" onClick={() => setShowForm(!showForm)}>
                {showForm ? '✕ Cancel' : '+ New Listing'}
              </Button>
            </div>

            {/* Create form */}
            {showForm && (
              <Card className="reveal" style={{ marginBottom:24 }}>
                <h4 style={{ margin:'0 0 16px', color:'var(--text-dark)' }}>Create a New Listing</h4>
                <Alert type="success" message={formMsg} />
                <Alert type="error"   message={formErr} />
                <form onSubmit={handleCreate} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Title</label>
                    <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="What are you offering?" required />
                  </div>
                  <div>
                    <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Price (KES)</label>
                    <input type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))} placeholder="0.00" min="0" step="0.01" required />
                  </div>
                  <div>
                    <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Category</label>
                    <select value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))} required>
                      <option value="">Select category…</option>
                      <option value="1">🎨 Graphics & Design</option>
                      <option value="2">💻 Tech & Repairs</option>
                      <option value="3">🍰 Food & Baking</option>
                      <option value="4">👗 Apparel & Tailoring</option>
                      <option value="5">📷 Photography</option>
                      <option value="6">📚 Tutoring</option>
                      <option value="7">📖 Textbooks</option>
                      <option value="8">🔌 Electronics</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Campus Zone</label>
                    <select value={form.campus_zone} onChange={e=>setForm(p=>({...p,campus_zone:e.target.value}))} required>
                      <option value="">Select pickup zone...</option>
                      {campusZones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Listing Photo URL</label>
                    <div className="listing-photo-input-row">
                      <input type="url" value={form.photo_url.startsWith('data:') ? '' : form.photo_url} onChange={e=>setForm(p=>({...p,photo_url:e.target.value}))} onBlur={e=>setForm(p=>({...p,photo_url:normalizePhotoUrl(e.target.value)}))} placeholder="https://..." />
                      <label className="btn btn-neutral" style={{ cursor: photoBusy ? 'not-allowed' : 'pointer' }}>
                        {photoBusy ? 'Reading...' : 'Browse'}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleListingPhoto} disabled={photoBusy} className="sr-only" />
                      </label>
                    </div>
                    {form.photo_url && (
                      <img src={resolveMediaUrl(form.photo_url)} alt="" className="listing-photo-preview" />
                    )}
                  </div>
                  <div>
                    <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Contact Number</label>
                    <input type="tel" value={form.contact_phone} onChange={e=>setForm(p=>({...p,contact_phone:e.target.value}))} placeholder={user?.phone_number || '0712 345 678'} />
                  </div>
                  <div>
                    <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Delivery</label>
                    <label className="checkbox-row">
                      <input type="checkbox" checked={form.offers_delivery} onChange={e=>setForm(p=>({...p,offers_delivery:e.target.checked}))} />
                      I offer delivery
                    </label>
                  </div>
                  {form.offers_delivery && (
                    <div>
                      <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Delivery Fee (KES)</label>
                      <input type="number" min="0" step="0.01" value={form.delivery_fee} onChange={e=>setForm(p=>({...p,delivery_fee:e.target.value}))} placeholder="0.00" />
                    </div>
                  )}
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.82rem', color:'var(--text-muted)' }}>Description</label>
                    <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} required style={{ resize:'vertical' }} />
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <Button type="submit" disabled={formBusy}>{formBusy ? 'Publishing…' : 'Publish Listing'}</Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Listings table */}
            {!data?.listings?.length ? (
              <EmptyState icon="📦" title="No listings yet" subtitle="Create your first listing to start earning." action={<Button size="sm" onClick={() => setShowForm(true)}>+ Create Listing</Button>} />
            ) : (
              <Card className="reveal">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {['Title','Price','Category','Campus Zone','Contact','Views','Posted',''].map(h=><th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.listings.map(l=>(
                      <tr key={l.id}>
                          <td style={{ fontWeight:600 }}>{l.title}</td>
                          <td style={{ color:'var(--primary)', fontWeight:700 }}>KES {parseFloat(l.price).toLocaleString()}</td>
                          <td>{l.category_name || '—'}</td>
                          <td>{l.campus_zone || '-'}</td>
                          <td>{l.contact_phone || user?.phone_number || '-'}</td>
                          <td>{l.view_count ?? 0}</td>
                          <td style={{ color:'var(--text-muted)' }}>{new Date(l.created_at).toLocaleDateString()}</td>
                          <td><Button variant="ghost" size="sm" onClick={() => navigate(`/listing/${l.id}`)}>View →</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Pending orders */}
            {data?.activeOrders?.length > 0 && (
              <>
                <h3 className="reveal" style={{ marginTop:32, marginBottom:16 }}>📋 Active Orders</h3>
                <div className="stats-grid">
                  {data.activeOrders.map(o=>(
                    <Card key={o.id} className="reveal">
                      <div style={{ fontWeight:700, marginBottom:6, color:'var(--text-dark)' }}>{o.title}</div>
                      <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:10 }}>
                        👤 {o.buyer_name} · 📅 {new Date(o.scheduled_date).toLocaleDateString()}
                      </div>
                      {o.delivery_required && (
                        <div style={{ fontSize:'0.82rem', color:'var(--text-base)', marginBottom:10 }}>
                          Delivery: {o.delivery_address}
                        </div>
                      )}
                      <Badge variant="accent">{o.status}</Badge>
                      <Button
                        size="sm"
                        onClick={() => handleMarkDone(o.id)}
                        disabled={orderBusyId === o.id || o.status !== 'received'}
                        style={{ width:'100%', marginTop:12 }}
                      >
                        {orderBusyId === o.id ? 'Updating...' : o.status === 'received' ? 'Mark Done' : 'Waiting for Buyer'}
                      </Button>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
