// backend/controllers/listings.controller.js
'use strict';

const db = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');
const { requireFields } = require('../utils/validate');

const normalizePhotoUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw || raw.startsWith('data:image/')) return raw || null;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);

    if (parsed.hostname.includes('drive.google.com')) {
      const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const id = parsed.searchParams.get('id') || fileMatch?.[1];
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    }

    if (parsed.hostname.includes('dropbox.com')) {
      parsed.searchParams.set('raw', '1');
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    throw new AppError('Listing photo must be a valid image URL.', 400);
  }
};

// ─── Public: search/filter listings ─────────────────────────────────────────

const search = asyncHandler(async (req, res) => {
  const { category_id, keyword, campus_zone } = req.query;

  let sql = `
    SELECT l.id, l.title, l.description, l.price, l.photo_url, l.contact_phone, l.offers_delivery, l.delivery_fee, l.campus_zone, l.view_count, l.created_at,
           c.name AS category_name,
           u.name AS seller_name,
           u.phone_number AS seller_phone_number,
           u.profile_picture_url AS seller_profile_picture_url
    FROM listings l
    JOIN categories c ON l.category_id = c.id
    JOIN users u      ON l.seller_id   = u.id
    WHERE 1=1
  `;
  const params = [];

  if (category_id) {
    params.push(parseInt(category_id, 10));
    sql += ` AND l.category_id = $${params.length}`;
  }

  if (keyword) {
    params.push(`%${keyword}%`);
    // Reuse the same param index for both columns
    sql += ` AND (l.title ILIKE $${params.length} OR l.description ILIKE $${params.length})`;
  }

  if (campus_zone) {
    params.push(campus_zone);
    sql += ` AND l.campus_zone = $${params.length}`;
  }

  sql += ' ORDER BY l.created_at DESC';

  const result = await db.query(sql, params);
  res.status(200).json({ success: true, listings: result.rows });
});

// ─── Public: single listing detail ──────────────────────────────────────────

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await db.transaction(async (client) => {
    await client.query('UPDATE listings SET view_count = view_count + 1 WHERE id = $1', [id]);
    return client.query(
    `SELECT l.*, c.name AS category_name, u.name AS seller_name, u.email AS seller_email,
            u.phone_number AS seller_phone_number, u.profile_picture_url AS seller_profile_picture_url
     FROM listings l
     LEFT JOIN categories c ON l.category_id = c.id
     JOIN users u ON l.seller_id = u.id
     WHERE l.id = $1`,
      [id]
    );
  });

  if (result.rows.length === 0) {
    throw new AppError('Listing not found.', 404);
  }

  res.status(200).json({ success: true, listing: result.rows[0] });
});

// ─── Protected: seller dashboard metrics ────────────────────────────────────

const getDashboardMetrics = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;

  const [listingsRes, metricsRes, ordersRes] = await Promise.all([
    db.query(
      `SELECT l.*, c.name AS category_name
       FROM listings l
       LEFT JOIN categories c ON l.category_id = c.id
       WHERE l.seller_id = $1
       ORDER BY l.created_at DESC`,
      [sellerId]
    ),
    db.query(
      `SELECT
         (SELECT COUNT(*)::int
          FROM bookings b
          JOIN listings l ON b.listing_id = l.id
          WHERE l.seller_id = $1) AS total_requests,
         (SELECT COALESCE(SUM(l.price), 0)
          FROM bookings b
          JOIN listings l ON b.listing_id = l.id
          WHERE l.seller_id = $1 AND b.status = 'completed') AS total_earnings,
         (SELECT COALESCE(SUM(view_count), 0)::int
          FROM listings
          WHERE seller_id = $1) AS total_views,
         (SELECT COUNT(*)::int
          FROM messages m
          JOIN listings l ON m.listing_id = l.id
          WHERE l.seller_id = $1 AND m.receiver_id = l.seller_id) AS total_offers`,
      [sellerId]
    ),
    db.query(
      `SELECT b.id, b.status, b.scheduled_date, b.delivery_required, b.delivery_address, b.delivery_notes,
              l.title, u.name AS buyer_name
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users    u ON b.buyer_id   = u.id
       WHERE l.seller_id = $1 AND b.status IN ('pending', 'confirmed', 'received')
       ORDER BY b.scheduled_date ASC`,
      [sellerId]
    ),
  ]);

  const { total_requests, total_earnings, total_views, total_offers } = metricsRes.rows[0];

  res.status(200).json({
    success: true,
    listings: listingsRes.rows,
    summary: {
      totalRequests: total_requests,
      totalEarnings: parseFloat(total_earnings),
      totalViews: total_views,
      totalOffers: total_offers,
    },
    activeOrders: ordersRes.rows,
  });
});

// ─── Protected: create listing ───────────────────────────────────────────────

const create = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    category_id,
    campus_zone,
    photo_url,
    contact_phone,
    offers_delivery,
    delivery_fee,
  } = req.body;

  const missing = requireFields(req.body, ['title', 'description', 'price', 'category_id', 'campus_zone']);
  if (missing) throw new AppError(missing, 400);

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    throw new AppError('Price must be a non-negative number.', 400);
  }

  const parsedDeliveryFee = parseFloat(delivery_fee || 0);
  if (isNaN(parsedDeliveryFee) || parsedDeliveryFee < 0) {
    throw new AppError('Delivery fee must be a non-negative number.', 400);
  }

  const result = await db.query(
    `INSERT INTO listings (seller_id, category_id, title, description, price, photo_url, contact_phone, offers_delivery, delivery_fee, campus_zone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      req.user.id,
      parseInt(category_id, 10),
      title.trim(),
      description.trim(),
      parsedPrice,
      normalizePhotoUrl(photo_url),
      contact_phone?.trim() || null,
      Boolean(offers_delivery),
      parsedDeliveryFee,
      campus_zone,
    ]
  );

  res.status(201).json({ success: true, listing: result.rows[0] });
});

const topHustlers = asyncHandler(async (_req, res) => {
  const result = await db.query(
    `SELECT
       u.id,
       u.name,
       u.profile_picture_url,
       COUNT(r.id)::int AS review_count,
       ROUND(AVG(r.rating)::numeric, 2) AS average_rating
     FROM users u
     JOIN listings l ON l.seller_id = u.id
     JOIN bookings b ON b.listing_id = l.id
     JOIN reviews r ON r.booking_id = b.id
     GROUP BY u.id, u.name, u.profile_picture_url
     HAVING COUNT(r.id) > 0
     ORDER BY average_rating DESC, review_count DESC, u.name ASC
     LIMIT 5`
  );

  res.status(200).json({ success: true, hustlers: result.rows });
});

module.exports = { search, getById, getDashboardMetrics, create, topHustlers };
