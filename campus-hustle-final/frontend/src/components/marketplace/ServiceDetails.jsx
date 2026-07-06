// frontend/src/components/marketplace/ServiceDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsApi, bookingsApi, messagesApi, paymentsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Alert, Card, Button } from '../shared';
import ReviewSystem from './ReviewSystem';
import { resolveMediaUrl } from '../../utils/media';

const ServiceDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing,  setListing]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Booking state
  const [date,         setDate]        = useState('');
  const [bookingMsg,   setBookingMsg]  = useState('');
  const [bookingErr,   setBookingErr]  = useState('');
  const [bookingBusy,  setBookingBusy] = useState(false);
  const [latestBookingId, setLatestBookingId] = useState(null);
  const [receivedBusy, setReceivedBusy] = useState(false);

  // Message state
  const [msgContent, setMsgContent] = useState('');
  const [msgStatus,  setMsgStatus]  = useState('');
  const [paymentState, setPaymentState] = useState('idle');
  const [paymentMsg, setPaymentMsg] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [requestDelivery, setRequestDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [checkoutId, setCheckoutId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await listingsApi.getById(id);
        setListing(res.data.listing);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();
    setBookingErr('');
    setBookingBusy(true);
    try {
      const res = await bookingsApi.create({
        listingId: id,
        scheduledDate: date,
        deliveryRequired: requestDelivery,
        deliveryAddress,
        deliveryNotes,
      });
      setBookingMsg(res.data.message);
      setLatestBookingId(res.data.booking?.id || null);
    } catch (err) {
      setBookingErr(err.message);
    } finally {
      setBookingBusy(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!latestBookingId) return;

    setReceivedBusy(true); setBookingErr('');
    try {
      const res = await bookingsApi.markReceived(latestBookingId);
      setBookingMsg(res.data.message);
      setLatestBookingId(null);
    } catch (err) {
      setBookingErr(err.message);
    } finally {
      setReceivedBusy(false);
    }
  };

  const handleMessage = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    try {
      await messagesApi.send({ receiverId: listing.seller_id, listingId: id, content: msgContent });
      setMsgStatus('Message sent!');
      setMsgContent('');
    } catch (err) {
      setMsgStatus(`Error: ${err.message}`);
    }
  };

  const handleBuyNow = async () => {
    if (!user) return navigate('/login');
    const cleanPhone = mpesaPhone.replace(/\s/g, '');
    const isValidPhone = /^(?:\+254|254|0)(7|1)\d{8}$/.test(cleanPhone);

    if (!isValidPhone) {
      setPaymentError('Enter a valid Safaricom number, for example 0712 345 678.');
      return;
    }
    if (requestDelivery && !deliveryAddress.trim()) {
      setPaymentError('Add your delivery location before paying.');
      return;
    }

    setPaymentError('');
    setPaymentMsg('');
    setPaymentState('sending');
    try {
      const total = Number(listing.price) + (requestDelivery ? Number(listing.delivery_fee || 0) : 0);
      const res = await paymentsApi.initiateMpesa({
        phone: mpesaPhone,
        amount: total,
        accountReference: `HustleGrad-${listing.id}`,
        description: `Payment for ${listing.title}`,
      });
      setCheckoutId(res.data.checkoutRequestId || '');
      setPaymentMsg(res.data.message || 'STK Push sent. Check your phone.');
      setPaymentState('sent');
    } catch (err) {
      setPaymentError(err.message);
      setPaymentState('idle');
    }
  };

  if (loading) return <Spinner />;
  if (error)   return <Alert type="error" message={error} />;
  if (!listing) return null;

  const isOwner = user && user.id === listing.seller_id;
  const deliveryFee = Number(listing.delivery_fee || 0);
  const checkoutTotal = Number(listing.price) + (requestDelivery ? deliveryFee : 0);

  return (
    <div style={styles.page}>
      <Button variant="ghost" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        ← Back
      </Button>

      <div style={styles.grid}>
        {/* ── Listing info ── */}
        <Card>
          {listing.photo_url && (
            <img src={resolveMediaUrl(listing.photo_url)} alt="" style={styles.listingPhoto} />
          )}
          <span style={styles.categoryTag}>{listing.category_name}</span>
          <h1 style={styles.title}>{listing.title}</h1>
          <p style={styles.seller}>Offered by <strong>{listing.seller_name}</strong></p>
          {(listing.contact_phone || listing.seller_phone_number) && (
            <p style={styles.contact}>Contact: {listing.contact_phone || listing.seller_phone_number}</p>
          )}
          {listing.campus_zone && <span style={styles.zoneTag}>{listing.campus_zone}</span>}
          {listing.offers_delivery && (
            <span style={styles.deliveryTag}>Delivery available · KES {deliveryFee.toLocaleString()}</span>
          )}
          <hr style={styles.divider} />
          <p style={styles.desc}>{listing.description}</p>
          <div style={styles.priceRow}>
            <span style={styles.price}>KES {parseFloat(listing.price).toLocaleString()}</span>
          </div>
        </Card>

        {/* ── Actions ── */}
        <div>
          {!isOwner && user && (
            <>
              <Card style={{ marginBottom: 20 }}>
                <h3 style={styles.sectionTitle}>Buy with M-PESA Escrow</h3>
                {paymentState === 'idle' && (
                  <>
                    <p style={styles.paymentCopy}>Pay now, then release funds only after you confirm pickup or service delivery.</p>
                    <label style={styles.label} htmlFor="mpesa-phone">M-PESA Phone Number</label>
                    <input
                      id="mpesa-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={mpesaPhone}
                      onChange={(event) => setMpesaPhone(event.target.value)}
                      placeholder="0712 345 678"
                      aria-describedby={paymentError ? 'mpesa-phone-error' : undefined}
                      style={{ ...styles.input, marginBottom: 10 }}
                    />
                    {listing.offers_delivery && (
                      <div style={styles.deliveryPanel}>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={requestDelivery}
                            onChange={(event) => setRequestDelivery(event.target.checked)}
                          />
                          I need delivery
                        </label>
                        {requestDelivery && (
                          <>
                            <label style={styles.label} htmlFor="delivery-address">Delivery Location</label>
                            <input
                              id="delivery-address"
                              value={deliveryAddress}
                              onChange={(event) => setDeliveryAddress(event.target.value)}
                              placeholder="Hostel, gate, class block, or nearby landmark"
                              style={{ ...styles.input, marginBottom: 10 }}
                            />
                            <label style={styles.label} htmlFor="delivery-notes">Delivery Notes</label>
                            <textarea
                              id="delivery-notes"
                              value={deliveryNotes}
                              onChange={(event) => setDeliveryNotes(event.target.value)}
                              placeholder="Best time, directions, or special instructions"
                              rows={2}
                              style={{ ...styles.input, resize: 'vertical' }}
                            />
                          </>
                        )}
                      </div>
                    )}
                    {paymentError && (
                      <div id="mpesa-phone-error" className="field-error" role="alert">
                        {paymentError}
                      </div>
                    )}
                    <Button type="button" onClick={handleBuyNow} style={{ width: '100%' }}>
                      Buy Now - KES {checkoutTotal.toLocaleString()}
                    </Button>
                    {requestDelivery && (
                      <p style={styles.feeNote}>Includes KES {deliveryFee.toLocaleString()} delivery fee.</p>
                    )}
                  </>
                )}
                {paymentState === 'sending' && (
                  <div className="mpesa-panel" role="status" aria-live="polite">
                    <div className="mpesa-loader" />
                    <strong>Sending M-PESA STK Push prompt to your phone...</strong>
                    <span>Check {mpesaPhone} and enter your M-PESA PIN to continue.</span>
                  </div>
                )}
                {paymentState === 'sent' && (
                  <div className="mpesa-success" role="status" aria-live="polite">
                    <div className="mpesa-check">✓</div>
                    <h4>M-PESA STK Push Sent</h4>
                    <p>{paymentMsg}</p>
                    <p>Approve the prompt on {mpesaPhone}. After payment, use booking and messaging to coordinate {requestDelivery ? 'delivery' : `pickup at ${listing.campus_zone || 'the agreed campus zone'}`}.</p>
                    {checkoutId && <small>Checkout ID: {checkoutId}</small>}
                    <div className="escrow-steps">
                      <span>1. STK Push sent</span>
                      <span>2. Approve on phone</span>
                      <span>3. Confirm order received</span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Book */}
              <Card style={{ marginBottom: 20 }}>
                <h3 style={styles.sectionTitle}>📅 Book this Service</h3>
                <Alert type="success" message={bookingMsg} />
                <Alert type="error"   message={bookingErr} />
                <form onSubmit={handleBook}>
                  <label style={styles.label}>Preferred Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={styles.input} />
                  {requestDelivery && (
                    <p style={styles.feeNote}>This booking will include your delivery location from checkout.</p>
                  )}
                  <Button type="submit" disabled={bookingBusy || !!bookingMsg} style={{ width: '100%', marginTop: 10 }}>
                    {bookingBusy ? 'Sending…' : 'Request Booking'}
                  </Button>
                  {latestBookingId && (
                    <Button
                      type="button"
                      variant="neutral"
                      disabled={receivedBusy}
                      onClick={handleMarkReceived}
                      style={{ width: '100%', marginTop: 10 }}
                    >
                      {receivedBusy ? 'Updating...' : 'Mark Order Received'}
                    </Button>
                  )}
                </form>
              </Card>

              {/* Message */}
              <Card>
                <h3 style={styles.sectionTitle}>💬 Message Vendor</h3>
                {msgStatus && <Alert type={msgStatus.startsWith('Error') ? 'error' : 'success'} message={msgStatus} />}
                <form onSubmit={handleMessage}>
                  <textarea
                    value={msgContent}
                    onChange={(e) => setMsgContent(e.target.value)}
                    placeholder="Ask about the service…"
                    rows={3}
                    required
                    style={{ ...styles.input, resize: 'vertical' }}
                  />
                  <Button type="submit" variant="ghost" style={{ width: '100%', marginTop: 10 }}>
                    Send Message
                  </Button>
                </form>
              </Card>
            </>
          )}

          {!user && (
            <Card>
              <p style={{ textAlign: 'center', color: '#718096' }}>
                <Button onClick={() => navigate('/login')}>Sign in to book or message</Button>
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ── Reviews ── */}
      <ReviewSystem listingId={id} />
    </div>
  );
};

const styles = {
  page:        { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  grid:        { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' },
  categoryTag: { display: 'inline-block', background: '#e0f2fe', color: '#0288d1', borderRadius: 12, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700, marginBottom: 10 },
  listingPhoto:{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 8, marginBottom: 16, background: '#f1f5f9' },
  zoneTag:     { display: 'inline-block', background: '#fef3c7', color: '#92400e', borderRadius: 12, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 },
  deliveryTag: { display: 'inline-block', background: '#dcfce7', color: '#166534', borderRadius: 12, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, marginLeft: 8, marginBottom: 8 },
  title:       { margin: '8px 0 4px', fontSize: '1.5rem', color: '#1a202c' },
  seller:      { color: '#718096', fontSize: '0.9rem', margin: '0 0 16px' },
  contact:     { color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, margin: '-8px 0 14px' },
  divider:     { border: 0, borderTop: '1px solid #edf2f7', margin: '16px 0' },
  desc:        { color: '#4a5568', lineHeight: 1.7 },
  priceRow:    { marginTop: 20 },
  price:       { fontSize: '1.4rem', fontWeight: 800, color: '#0288d1' },
  sectionTitle:{ margin: '0 0 14px', fontSize: '1rem', color: '#2d3748' },
  paymentCopy: { color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 14 },
  deliveryPanel: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, background: '#f8fafc' },
  feeNote:     { color: '#64748b', fontSize: '0.8rem', lineHeight: 1.5, marginTop: 8 },
  label:       { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.87rem', color: '#4a5568' },
  input:       { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' },
};

export default ServiceDetails;
