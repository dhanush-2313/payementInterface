// src/paymentHandler.js
/**
 * Enhanced payment handler for Razorpay payments
 * Adapted to work with the existing backend APIs
 */

import axios from 'axios';

/**
 * Handles Razorpay payment verification
 * @param {Object} paymentData - Data returned from Razorpay
 * @param {String} apiBaseUrl - API base URL
 * @param {String} authToken - Authentication token
 * @returns {Promise<Object>} - API response
 */
export const handlePaymentSuccess = async (paymentData, apiBaseUrl, authToken) => {
  try {
    const response = await axios.post(
      `${apiBaseUrl}/payment/verify`,
      {
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

/**
 * Initiates a Razorpay checkout
 * @param {String} razorpayOrderId - Razorpay order ID
 * @param {Number} amount - Amount in smallest currency unit (paise for INR)
 * @param {String} description - Payment description
 * @param {String} razorpayKeyId - Razorpay API key ID
 * @param {Function} successCallback - Function to call on successful payment
 * @param {Object} prefillData - Customer information for prefill
 */
export const initiateRazorpayCheckout = (
  razorpayOrderId, 
  amount, 
  description, 
  razorpayKeyId, 
  successCallback,
  prefillData = {
    name: "Test User",
    email: "test@example.com",
    contact: "9999999999"
  }
) => {
  const options = {
    key: razorpayKeyId,
    amount: amount,
    currency: "INR",
    name: "Roll2Bowl",
    description: description,
    order_id: razorpayOrderId,
    handler: successCallback,
    prefill: prefillData,
    theme: {
      color: "#F37254"
    }
  };
  
  const razorpay = new window.Razorpay(options);
  razorpay.open();
};