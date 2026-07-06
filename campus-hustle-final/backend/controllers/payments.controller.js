'use strict';

const env = require('../config/env');
const { AppError, asyncHandler } = require('../utils/errors');
const { requireFields } = require('../utils/validate');

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254(7|1)\d{8}$/.test(digits)) return digits;
  throw new AppError('Enter a valid Safaricom number, for example 0712 345 678.', 400);
};

const getDarajaBaseUrl = () =>
  env.mpesa.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

const getMissingDarajaConfig = () =>
  [
    ['MPESA_CONSUMER_KEY', env.mpesa.consumerKey],
    ['MPESA_CONSUMER_SECRET', env.mpesa.consumerSecret],
    ['MPESA_SHORTCODE', env.mpesa.shortcode],
    ['MPESA_PASSKEY', env.mpesa.passkey],
    ['MPESA_CALLBACK_URL', env.mpesa.callbackUrl],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

const isUsingDefaultSandboxPasskey = () =>
  Boolean(env.mpesa.usingDefaultSandboxPasskey);

const readDarajaResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const getDarajaMessage = (data, fallback) =>
  data.errorMessage ||
  data.error_description ||
  data.ResponseDescription ||
  data.CustomerMessage ||
  data.raw ||
  fallback;

const getDarajaToken = async () => {
  const auth = Buffer
    .from(`${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`)
    .toString('base64');

  const response = await fetch(`${getDarajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const data = await readDarajaResponse(response);
  if (!response.ok || !data.access_token) {
    const darajaMessage = getDarajaMessage(data, 'Could not authenticate with M-PESA Daraja.');
    throw new AppError(
      `M-PESA Daraja authentication failed (${env.mpesa.environment}). ${darajaMessage}`,
      response.status === 401 ? 401 : 502
    );
  }

  return data.access_token;
};

const initiateMpesa = asyncHandler(async (req, res) => {
  const missing = requireFields(req.body, ['phone', 'amount']);
  if (missing) throw new AppError(missing, 400);

  const phone = normalizePhone(req.body.phone);
  const amount = Math.max(1, Math.round(Number(req.body.amount)));
  if (!Number.isFinite(amount)) throw new AppError('Amount must be a valid number.', 400);

  const missingConfig = getMissingDarajaConfig();
  if (missingConfig.length > 0) {
    throw new AppError(
      `M-PESA is not configured. Missing: ${missingConfig.join(', ')}. STK Push requires a Lipa Na M-PESA Online passkey.`,
      500
    );
  }

  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const password = Buffer
    .from(`${env.mpesa.shortcode}${env.mpesa.passkey}${timestamp}`)
    .toString('base64');
  const token = await getDarajaToken();

  const response = await fetch(`${getDarajaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: env.mpesa.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: env.mpesa.shortcode,
      PhoneNumber: phone,
      CallBackURL: env.mpesa.callbackUrl,
      AccountReference: req.body.accountReference || 'HustleGrad',
      TransactionDesc: req.body.description || 'HustleGrad marketplace payment',
    }),
  });

  const data = await readDarajaResponse(response);
  if (!response.ok || data.ResponseCode !== '0') {
    throw new AppError(getDarajaMessage(data, 'M-PESA STK Push failed.'), 502);
  }

  res.status(200).json({
    success: true,
    mode: 'daraja',
    message: data.CustomerMessage || 'STK Push sent. Check your phone.',
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    usingDefaultSandboxPasskey: isUsingDefaultSandboxPasskey(),
  });
});

const mpesaCallback = asyncHandler(async (req, res) => {
  const callbackData = req.body?.Body?.stkCallback;

  if (!callbackData) {
    console.log('[MPESA CALLBACK] Received callback without stkCallback payload.');
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  console.log('[MPESA CALLBACK]', JSON.stringify(callbackData, null, 2));

  if (callbackData.ResultCode === 0) {
    const metaData = callbackData.CallbackMetadata?.Item || [];
    const mpesaReceiptNumber = metaData.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
    const amount = metaData.find(item => item.Name === 'Amount')?.Value;

    // Use this logic to update your database
    console.log(`Payment Successful! Receipt: ${mpesaReceiptNumber}, Amount: ${amount}`);
  } else {
    console.log('Payment Failed:', callbackData.ResultDesc);
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
});

module.exports = { initiateMpesa, mpesaCallback };
