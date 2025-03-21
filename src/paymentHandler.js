// src/services/paymentHandler.js
/**
 * Generic payment handler for Razorpay payments
 * This can be used for orders, subscriptions, upgrades, renewals and top-ups
 */

const verifyRazorpayPayment = async (apiBaseUrl, authToken, paymentData, verifyEndpoint) => {
    try {
      const response = await fetch(`${apiBaseUrl}${verifyEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          razorpayOrderId: paymentData.razorpay_order_id,
          razorpayPaymentId: paymentData.razorpay_payment_id,
          razorpaySignature: paymentData.razorpay_signature
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment verification failed');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  };
  
  /**
   * Handles different types of payments based on the payment type
   * @param {Object} paymentData - Razorpay payment response
   * @param {String} paymentType - Type of payment (order, subscription, upgrade, renewal, topup)
   * @param {String} apiBaseUrl - API base URL
   * @param {String} authToken - JWT auth token
   */
  export const handlePaymentSuccess = async (paymentData, paymentType, apiBaseUrl, authToken) => {
    let verifyEndpoint;
  
    // Define the appropriate verification endpoint based on payment type
    switch (paymentType) {
      case 'order':
        verifyEndpoint = '/payment/verify';
        break;
      case 'subscription':
        verifyEndpoint = '/subscription/purchase-verify';
        break;
      case 'upgrade':
        verifyEndpoint = '/subscription/upgrade-verify';
        break;
      case 'renewal':
        verifyEndpoint = '/subscription/renew-verify';
        break;
      case 'topup':
        verifyEndpoint = '/subscription-topup-verify';
        break;
      default:
        throw new Error(`Invalid payment type: ${paymentType}`);
    }
  
    return await verifyRazorpayPayment(apiBaseUrl, authToken, paymentData, verifyEndpoint);
  };
  
  /**
   * Initiates a Razorpay checkout for any payment type
   * @param {String} razorpayOrderId - Order ID from Razorpay
   * @param {Number} amount - Amount in smallest currency unit (paise for INR)
   * @param {String} description - Payment description
   * @param {String} razorpayKeyId - Razorpay API key ID
   * @param {Function} successCallback - Function to call on successful payment
   */
  export const initiateRazorpayCheckout = (razorpayOrderId, amount, description, razorpayKeyId, successCallback) => {
    const options = {
      key: razorpayKeyId,
      amount: amount,
      currency: "INR",
      name: "Roll2Bowl",
      description: description,
      order_id: razorpayOrderId,
      handler: successCallback,
      prefill: {
        name: "Test User",
        email: "test@example.com",
        contact: "9999999999"
      },
      theme: {
        color: "#F37254"
      }
    };
    
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };