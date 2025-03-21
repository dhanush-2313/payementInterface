// src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, Tab, Container, Row, Col, Form, Button, Card, Alert, Spinner, Badge, ListGroup } from 'react-bootstrap';
import { handlePaymentSuccess, initiateRazorpayCheckout } from './paymentHandler';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  // State for API endpoint configuration
  const [apiBaseUrl, setApiBaseUrl] = useState('http://192.168.1.103:4000/api');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [authToken, setAuthToken] = useState('');
  
  // State for managing UI and workflow
  const [activeTab, setActiveTab] = useState('orders');
  const [activeSubscriptionTab, setActiveSubscriptionTab] = useState('purchase');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for order creation and payment
  const [customerId, setCustomerId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: '123 Test Street, Bengaluru',
    coordinates: [12.9716, 77.5946],
    pincode: 560001
  });
  
  // State for items in the order
  const [foodItems, setFoodItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // State for Razorpay response data
  const [razorpayOrderId, setRazorpayOrderId] = useState(null);
  const [razorpayPaymentId, setRazorpayPaymentId] = useState(null);
  const [razorpaySignature, setRazorpaySignature] = useState(null);
  
  // State for subscription operations
  const [subscriptionId, setSubscriptionId] = useState('');
  const [amount, setAmount] = useState(999);
  const [additionalOrders, setAdditionalOrders] = useState(10);
  const [newSubscriptionId, setNewSubscriptionId] = useState('');
  const [upgradeAmount, setUpgradeAmount] = useState(499);
  const [renewalAmount, setRenewalAmount] = useState(999);
  
  // State for created order
  const [createdOrder, setCreatedOrder] = useState(null);
  const [userData, setUserData] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Add this with your other functions
const fetchUserData = async () => {
  try {
    setLoading(true);
    const response = await axios.get(`${apiBaseUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    setUserData(response.data.user._doc);
    setLoading(false);
  } catch (err) {
    console.error("Error fetching user data:", err.response || err);
    setError(err.response?.data?.error || err.response?.data?.message || err.message || "An unknown error occurred");
    setLoading(false);
  }
};

  // Add this with your other useEffect hooks
useEffect(() => {
  if (authToken) {
    fetchUserData();
  }
}, [authToken]);
  
  // Load saved configuration from localStorage on component mount
  useEffect(() => {
    const savedBaseUrl = localStorage.getItem('apiBaseUrl');
    const savedKeyId = localStorage.getItem('razorpayKeyId');
    const savedToken = localStorage.getItem('authToken');
    
    if (savedBaseUrl) setApiBaseUrl(savedBaseUrl);
    if (savedKeyId) setRazorpayKeyId(savedKeyId);
    if (savedToken) setAuthToken(savedToken);
    
    // Load Razorpay SDK
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  // Save configuration to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('apiBaseUrl', apiBaseUrl);
    localStorage.setItem('razorpayKeyId', razorpayKeyId);
    localStorage.setItem('authToken', authToken);
  }, [apiBaseUrl, razorpayKeyId, authToken]);
  
  // Fetch available food items when branch ID changes
  useEffect(() => {
    if (branchId && activeTab === 'orders') {
      fetchFoodItems();
    }
  }, [branchId, activeTab]);
  
  // Generic function to handle Razorpay payment success
  const onPaymentSuccess = async (paymentType) => {
    return async (response) => {
      try {
        setLoading(true);
        
        // Store Razorpay response data
        setRazorpayOrderId(response.razorpay_order_id);
        setRazorpayPaymentId(response.razorpay_payment_id);
        setRazorpaySignature(response.razorpay_signature);
        
        // Call the appropriate verification endpoint
        const result = await handlePaymentSuccess(
          response, 
          paymentType, 
          apiBaseUrl, 
          authToken
        );
        
        setSuccess(`Payment verified successfully! ${result.message || ''}`);
        setLoading(false);
      } catch (err) {
        console.error(`Error verifying ${paymentType} payment:`, err);
        setError(err.message || "An unknown error occurred during payment verification");
        setLoading(false);
      }
    };
  };
  
  // Function to fetch available food items for a branch
  const fetchFoodItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiBaseUrl}/food-items/${branchId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      // Flatten the categories into a single array of items
      const items = [];
      Object.entries(response.data).forEach(([category, categoryItems]) => {
        categoryItems.forEach(item => {
          items.push({
            ...item,
            category
          });
        });
      });
      
      setFoodItems(items);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching food items:", err.response || err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "An unknown error occurred");
      setLoading(false);
    }
  };
  
  // Order management functions
  const addItemToOrder = (item) => {
    const newItem = {
      _id: item._id,
      foodItem: item._id,
      name: item.name,
      price: item.price || 100, // Default price if not available
      quantity: 1,
      taxSlab: item.taxSlab || 5, // Default tax slab if not available
      variant: null,
      addOns: []
    };
    
    setSelectedItems([...selectedItems, newItem]);
  };
  
  const removeItemFromOrder = (index) => {
    const updatedItems = [...selectedItems];
    updatedItems.splice(index, 1);
    setSelectedItems(updatedItems);
  };
  
  const updateItemQuantity = (index, quantity) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = parseInt(quantity);
    setSelectedItems(updatedItems);
  };
  
  // Order creation function
  const createOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!branchId) {
        setError("Branch ID is required");
        setLoading(false);
        return;
      }
      
      if (selectedItems.length === 0) {
        setError("Please add at least one item to the order");
        setLoading(false);
        return;
      }
      
      // Prepare the order payload
      const orderPayload = {
        branch: branchId,
        items: selectedItems.map(item => ({
          _id: item._id,
          quantity: item.quantity,
          price: item.price,
          taxSlab: item.taxSlab,
          variant: item.variant,
          addOns: item.addOns
        })),
        orderType: "Delivery",
        paymentMethod: "Online",
        deliveryAddress,
        customer: userData ? {
          phoneNumber: userData.phoneNumber,
          name: userData.name
        } : null
      };
      
      // First, calculate the order total
      const calculationResponse = await axios.post(
        `${apiBaseUrl}/order/calculate`, 
        orderPayload,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      // Add the calculation details to the order payload
      const fullOrderPayload = {
        ...orderPayload,
        subTotal: calculationResponse.data.subTotal,
        grandTotal: calculationResponse.data.grandTotal,
        packagingCharges: calculationResponse.data.packagingCharges,
        packagingChargesTax: calculationResponse.data.packagingChargesTax,
        platformFee: calculationResponse.data.platformFee,
        platformFeeTax: calculationResponse.data.platformFeeTax,
        deliveryCharge: calculationResponse.data.deliveryCharge,
        deliveryTax: calculationResponse.data.deliveryTax
      };
      
      // Create the order
      const orderResponse = await axios.post(
        `${apiBaseUrl}/order/create`, 
        fullOrderPayload,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      setCreatedOrder(orderResponse.data.order);
      setSuccess(`Order created successfully with ID: ${orderResponse.data.order._id}`);
      setLoading(false);
      
      // Automatically initiate payment if order created successfully
      if (orderResponse.data.paymentInitData && orderResponse.data.paymentInitData.razorpayOrderId) {
        initiateRazorpayCheckout(
          orderResponse.data.paymentInitData.razorpayOrderId,
          orderResponse.data.paymentInitData.amount,
          `Payment for Order #${orderResponse.data.order._id}`,
          razorpayKeyId,
          onPaymentSuccess('order')
        );
      }
      
    } catch (err) {
      console.error("Error creating order:", err.response || err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "An unknown error occurred");
      setLoading(false);
    }
  };
  
  // Subscription purchase function
  const initiateSubscriptionPurchase = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!branchId || !subscriptionId) {
        setError("Branch ID and Subscription ID are required");
        setLoading(false);
        return;
      }
      
      const response = await axios.post(
        `${apiBaseUrl}/subscription/purchase`,
        {
          branchId,
          subscriptionId,
          amount: Number(amount)
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (response.data.razorpayOrderId) {
        initiateRazorpayCheckout(
          response.data.razorpayOrderId,
          Number(amount) * 100,
          `Subscription purchase for branch ${branchId}`,
          razorpayKeyId,
          onPaymentSuccess('subscription')
        );
      } else {
        setError("Failed to get Razorpay Order ID");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error initiating subscription purchase:", err.response || err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "An unknown error occurred");
      setLoading(false);
    }
  };
  
  // Subscription top-up function
  const initiateSubscriptionTopUp = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!branchId) {
        setError("Branch ID is required");
        setLoading(false);
        return;
      }
      
      const response = await axios.post(
        `${apiBaseUrl}/subscription-topup`,
        {
          branchId,
          additionalOrders: Number(additionalOrders)
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (response.data.razorpayOrderId) {
        initiateRazorpayCheckout(
          response.data.razorpayOrderId,
          Number(additionalOrders) * 10 * 100, // Example calculation: ₹10 per order
          `Top-up ${additionalOrders} orders for branch ${branchId}`,
          razorpayKeyId,
          onPaymentSuccess('topup')
        );
      } else {
        setError("Failed to get Razorpay Order ID");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error initiating subscription top-up:", err.response || err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "An unknown error occurred");
      setLoading(false);
    }
  };
  
  // Subscription upgrade function
  const initiateSubscriptionUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!branchId || !newSubscriptionId) {
        setError("Branch ID and New Subscription ID are required");
        setLoading(false);
        return;
      }
      
      const response = await axios.post(
        `${apiBaseUrl}/subscription/upgrade`,
        {
          branchId,
          newSubscriptionId,
          amount: Number(upgradeAmount)
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (response.data.razorpayOrderId) {
        initiateRazorpayCheckout(
          response.data.razorpayOrderId,
          Number(upgradeAmount) * 100,
          `Subscription upgrade for branch ${branchId}`,
          razorpayKeyId,
          onPaymentSuccess('upgrade')
        );
      } else {
        setError("Failed to get Razorpay Order ID");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error initiating subscription upgrade:", err.response || err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "An unknown error occurred");
      setLoading(false);
    }
  };
  
  // Subscription renewal function
  const initiateSubscriptionRenewal = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!branchId) {
        setError("Branch ID is required");
        setLoading(false);
        return;
      }
      
      const response = await axios.post(
        `${apiBaseUrl}/renew`,
        {
          branchId,
          amount: Number(renewalAmount)
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (response.data.razorpayOrderId) {
        initiateRazorpayCheckout(
          response.data.razorpayOrderId,
          Number(renewalAmount) * 100,
          `Subscription renewal for branch ${branchId}`,
          razorpayKeyId,
          onPaymentSuccess('renewal')
        );
      } else {
        setError("Failed to get Razorpay Order ID");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error initiating subscription renewal:", err.response || err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "An unknown error occurred");
      setLoading(false);
    }
  };
  
  // Reset form function
  const resetForm = () => {
    setSelectedItems([]);
    setCreatedOrder(null);
    setRazorpayOrderId(null);
    setRazorpayPaymentId(null);
    setRazorpaySignature(null);
    setError(null);
    setSuccess(null);
  };
  
  return (
    <Container className="py-4">
      <h1 className="text-center mb-4">Razorpay Payment Testing Interface</h1>
      
      {/* User Info Section */}
      {userData && (
        <Card className="mb-4">
          <Card.Header>Logged In User</Card.Header>
          <Card.Body>
            <p><strong>User ID:</strong> {userData._id}</p>
            <p><strong>Name:</strong> {userData.name}</p>
            <p><strong>Phone:</strong> {userData.phoneNumber}</p>
          </Card.Body>
        </Card>
      )}

      {/* Configuration Section */}
      <Card className="mb-4">
        <Card.Header>API Configuration</Card.Header>
        <Card.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>API Base URL</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={apiBaseUrl} 
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="http://localhost:8080/api" 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Razorpay Key ID</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={razorpayKeyId} 
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    placeholder="rzp_test_..." 
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Authentication Token (JWT)</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={authToken} 
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="eyJhbGciOiJIU..." 
                  />
                  <Form.Text className="text-muted">
                    Enter your JWT token for API authentication
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      
      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onSelect={(key) => {
          setActiveTab(key);
          resetForm();
        }}
        className="mb-3"
      >
        {/* Orders Tab */}
        <Tab eventKey="orders" title="Orders">
          <Card>
            <Card.Header>Create & Pay for an Order</Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Branch ID</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={branchId} 
                        onChange={(e) => setBranchId(e.target.value)}
                        placeholder="Enter branch ID" 
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Delivery Address</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={deliveryAddress.address} 
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, address: e.target.value})}
                    placeholder="Enter delivery address" 
                  />
                </Form.Group>
                
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Latitude</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={deliveryAddress.coordinates[0]} 
                        onChange={(e) => setDeliveryAddress({
                          ...deliveryAddress, 
                          coordinates: [parseFloat(e.target.value), deliveryAddress.coordinates[1]]
                        })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Longitude</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={deliveryAddress.coordinates[1]} 
                        onChange={(e) => setDeliveryAddress({
                          ...deliveryAddress, 
                          coordinates: [deliveryAddress.coordinates[0], parseFloat(e.target.value)]
                        })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pincode</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={deliveryAddress.pincode} 
                        onChange={(e) => setDeliveryAddress({
                          ...deliveryAddress, 
                          pincode: parseInt(e.target.value)
                        })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                {branchId && (
                  <div className="mt-4">
                    <h5>Available Food Items</h5>
                    {loading ? (
                      <div className="text-center">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </Spinner>
                      </div>
                    ) : foodItems.length > 0 ? (
                      <Row>
                        {foodItems.slice(0, 8).map((item) => (
                          <Col md={6} key={item._id} className="mb-2">
                            <Card>
                              <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <h6>{item.name}</h6>
                                    <small className="text-muted">{item.category} - ₹{item.price}</small>
                                  </div>
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={() => addItemToOrder(item)}
                                  >
                                    Add
                                  </Button>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <Alert variant="info">
                        No food items found. Make sure you've entered a valid Branch ID.
                      </Alert>
                    )}
                  </div>
                )}
                
                {selectedItems.length > 0 && (
                  <div className="mt-4">
                    <h5>Selected Items</h5>
                    <ListGroup>
                      {selectedItems.map((item, index) => (
                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{item.name}</strong> - ₹{item.price}
                          </div>
                          <div className="d-flex align-items-center">
                            <Form.Control
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, e.target.value)}
                              style={{ width: '70px', marginRight: '10px' }}
                            />
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => removeItemFromOrder(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                    
                    <div className="mt-3 text-end">
                      <strong>Total Items:</strong> {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </div>
                    
                    <Button 
                      variant="primary" 
                      className="mt-3"
                      onClick={createOrder}
                      disabled={loading}
                    >
                      {loading && <Spinner animation="border" size="sm" className="me-2" />}
                      Create & Pay for Order
                    </Button>
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        
        {/* Subscriptions Tab */}
        <Tab eventKey="subscriptions" title="Subscriptions">
          <Card>
            <Card.Header>Subscription Management</Card.Header>
            <Card.Body>
              <Tabs
                activeKey={activeSubscriptionTab}
                onSelect={(key) => {
                  setActiveSubscriptionTab(key);
                  resetForm();
                }}
                className="mb-3"
              >
                <Tab eventKey="purchase" title="Purchase Subscription">
                  <Form className="mt-3">
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Branch ID</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={branchId} 
                            onChange={(e) => setBranchId(e.target.value)}
                            placeholder="Enter branch ID" 
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Subscription ID</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={subscriptionId} 
                            onChange={(e) => setSubscriptionId(e.target.value)}
                            placeholder="Enter subscription plan ID" 
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Amount (₹)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </Form.Group>
                    
                    <Button 
                      variant="primary" 
                      onClick={initiateSubscriptionPurchase}
                      disabled={loading}
                    >
                      {loading && <Spinner animation="border" size="sm" className="me-2" />}
                      Purchase Subscription
                    </Button>
                  </Form>
                </Tab>
                
                <Tab eventKey="topup" title="Top-up Orders">
                  <Form className="mt-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Branch ID</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={branchId} 
                        onChange={(e) => setBranchId(e.target.value)}
                        placeholder="Enter branch ID" 
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Additional Orders</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={additionalOrders} 
                        onChange={(e) => setAdditionalOrders(e.target.value)}
                      />
                    </Form.Group>
                    
                    <Button 
                      variant="primary" 
                      onClick={initiateSubscriptionTopUp}
                      disabled={loading}
                    >
                      {loading && <Spinner animation="border" size="sm" className="me-2" />}
                      Top-up Order Count
                    </Button>
                  </Form>
                </Tab>
                
                <Tab eventKey="upgrade" title="Upgrade Subscription">
                  <Form className="mt-3">
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Branch ID</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={branchId} 
                            onChange={(e) => setBranchId(e.target.value)}
                            placeholder="Enter branch ID" 
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>New Subscription ID</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={newSubscriptionId} 
                            onChange={(e) => setNewSubscriptionId(e.target.value)}
                            placeholder="Enter new subscription plan ID" 
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Upgrade Amount (₹)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={upgradeAmount} 
                        onChange={(e) => setUpgradeAmount(e.target.value)}
                      />
                    </Form.Group>
                    
                    <Button 
                      variant="primary" 
                      onClick={initiateSubscriptionUpgrade}
                      disabled={loading}
                    >
                      {loading && <Spinner animation="border" size="sm" className="me-2" />}
                      Upgrade Subscription
                    </Button>
                  </Form>
                </Tab>
                
                <Tab eventKey="renew" title="Renew Subscription">
                  <Form className="mt-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Branch ID</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={branchId} 
                        onChange={(e) => setBranchId(e.target.value)}
                        placeholder="Enter branch ID" 
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Renewal Amount (₹)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={renewalAmount} 
                        onChange={(e) => setRenewalAmount(e.target.value)}
                      />
                    </Form.Group>
                    
                    <Button 
                      variant="primary" 
                      onClick={initiateSubscriptionRenewal}
                      disabled={loading}
                    >
                      {loading && <Spinner animation="border" size="sm" className="me-2" />}
                      Renew Subscription
                    </Button>
                  </Form>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      
      {/* Results Section */}
      {error && (
        <Alert variant="danger" className="mt-3">
          <strong>Error:</strong> {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="mt-3">
          <strong>Success:</strong> {success}
        </Alert>
      )}
      
      {createdOrder && (
        <Card className="mt-3">
          <Card.Header>Created Order Details</Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <p><strong>Order ID:</strong> {createdOrder._id}</p>
                <p><strong>Branch ID:</strong> {createdOrder.branch}</p>
                <p><strong>Customer:</strong> {createdOrder.customer ? 
                  (typeof createdOrder.customer === 'string' ? 
                    createdOrder.customer : 
                    `${createdOrder.customer.name} (${createdOrder.customer.phoneNumber})`) : 
                  'No customer linked'}
                </p>
                <p><strong>Items:</strong> {createdOrder.items.length}</p>
                <p><strong>Order Type:</strong> {createdOrder.orderType}</p>
              </Col>
              <Col md={6}>
                <p><strong>Sub Total:</strong> ₹{createdOrder.subTotal}</p>
                <p><strong>Delivery Charge:</strong> ₹{createdOrder.deliveryCharge}</p>
                <p><strong>Platform Fee:</strong> ₹{createdOrder.platformFee}</p>
                <p><strong>Grand Total:</strong> ₹{createdOrder.grandTotal}</p>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
      
      {(razorpayOrderId || razorpayPaymentId || razorpaySignature) && (
        <Card className="mt-3">
          <Card.Header>Razorpay Payment Details</Card.Header>
          <Card.Body>
            {razorpayOrderId && (
              <p><strong>Order ID:</strong> {razorpayOrderId}</p>
            )}
            {razorpayPaymentId && (
              <p><strong>Payment ID:</strong> {razorpayPaymentId}</p>
            )}
            {razorpaySignature && (
              <p><strong>Signature:</strong> {razorpaySignature}</p>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default App;