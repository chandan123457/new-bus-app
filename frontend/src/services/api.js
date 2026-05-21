/**
 * API Service
 * Centralized API calls using axios
 */

import axios from 'axios';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (optional - for adding auth tokens, etc.)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // const token = AsyncStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (optional - for handling common errors)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      return Promise.reject(error);
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error details:', {
        message: error.message,
        code: error.code,
        baseURL: API_BASE_URL,
        endpoint: error.config?.url,
      });
      
      // Provide more specific error messages
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('Request timeout. Please check your connection and try again.'));
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return Promise.reject(new Error('Cannot connect to server. Please check your network connection.'));
      } else {
        return Promise.reject(new Error('Network error. Please check your connection and ensure the server is running.'));
      }
    } else {
      // Something else happened
      console.error('Request setup error:', error.message);
      return Promise.reject(error);
    }
  }
);

/**
 * User API functions
 */
export const userAPI = {
  /**
   * Sign up a new user
   * @param {Object} userData - { name, email, password }
   * @returns {Promise} API response
   */
  signup: async (userData) => {
    try {
      console.log('Sending signup request to:', API_BASE_URL + API_ENDPOINTS.SIGNUP);
      console.log('Signup data:', { name: userData.name, email: userData.email, password: '***' });
      
      const response = await api.post(API_ENDPOINTS.SIGNUP, userData);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Sign up successful',
      };
    } catch (error) {
      console.error('Signup error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      });
      
      // Handle network errors specifically
      if (!error.response && error.message) {
        return {
          success: false,
          error: error.message || 'Network error. Please check your connection and ensure the server is running.',
          status: null,
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Sign up failed',
        status: error.response?.status,
      };
    }
  },

  /**
   * Sign in user
   * @param {Object} credentials - { email, password }
   * @returns {Promise} API response
   */
  signin: async (credentials) => {
    try {
      const signinUrl = API_BASE_URL + API_ENDPOINTS.SIGNIN;
      console.log('Sending signin request to:', signinUrl);
      console.log('Signin data:', { 
        email: credentials.email, 
        password: '***',
        emailLength: credentials.email?.length,
        passwordLength: credentials.password?.length,
      });
      
      const response = await api.post(API_ENDPOINTS.SIGNIN, credentials);
      console.log('Signin success:', {
        status: response.status,
        message: response.data?.message,
        hasToken: !!response.data?.token,
        user: response.data?.user?.email,
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Sign in successful',
      };
    } catch (error) {
      console.error('Signin error details:', {
        message: error.message,
        status: error.response?.status,
        errorMessage: error.response?.data?.errorMessage,
        code: error.code,
        requestUrl: error.config?.url,
        baseURL: API_BASE_URL,
        requestData: {
          email: credentials.email,
          passwordLength: credentials.password?.length,
        },
      });
      
      // Handle network errors specifically (no response from server)
      if (!error.response) {
        console.error('Network error - Server may not be accessible:', {
          apiUrl: API_BASE_URL,
          errorCode: error.code,
          errorMessage: error.message,
          endpoint: API_ENDPOINTS.SIGNIN,
        });
        
        return {
          success: false,
          error: 'Server is down. Please try again later.',
          status: null,
        };
      }
      
      // Extract error message - backend returns "Invalid credentials" for wrong email/password
      const errorMessage = error.response?.data?.errorMessage || error.message || 'Sign in failed';
      
      return {
        success: false,
        error: errorMessage,
        status: error.response?.status,
      };
    }
  },

  /**
   * Verify email with OTP
   * @param {Object} data - { email, otp }
   * @returns {Promise} API response
   */
  verifyEmail: async (data) => {
    try {
      console.log('Sending verify email request to:', API_BASE_URL + API_ENDPOINTS.VERIFY_EMAIL);
      console.log('Verify email data:', { email: data.email, otp: '***' });
      
      const response = await api.post(API_ENDPOINTS.VERIFY_EMAIL, data);
      console.log('Email verification success:', response.status);
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Email verified successfully',
      };
    } catch (error) {
      console.error('Email verification error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Email verification failed',
        status: error.response?.status,
      };
    }
  },

  /**
   * Forgot password (send OTP)
   * @param {string} email
   */
  forgotPassword: async (email) => {
    try {
      const response = await api.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'If an account exists, an OTP has been sent.',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to request password reset',
        status: error.response?.status,
      };
    }
  },

  /**
   * Reset password using OTP
   * @param {{ email: string, otp: string, newPassword: string }} payload
   */
  resetPassword: async (payload) => {
    try {
      const response = await api.post(API_ENDPOINTS.RESET_PASSWORD, payload);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Password reset successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to reset password',
        status: error.response?.status,
      };
    }
  },

  /**
   * Get user profile
   * @param {string} token - JWT token
   * @returns {Promise} API response
   */
  getProfile: async (token) => {
    try {
      console.log('Fetching user profile');
      
      const response = await api.get(API_ENDPOINTS.PROFILE, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Profile fetched successfully',
      };
    } catch (error) {
      console.error('Get profile error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to fetch profile',
        status: error.response?.status,
      };
    }
  },

  /**
   * Update user profile
   * Backend: PATCH /user/profile accepts { name?, phone? }
   */
  updateProfile: async (data, token) => {
    if (!token) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401,
      };
    }

    try {
      const response = await api.patch(API_ENDPOINTS.PROFILE, data, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Profile updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to update profile',
        status: error.response?.status,
      };
    }
  },

  /**
   * Notifications
   */
  getNotifications: async (token, { unreadOnly = false, limit = 50 } = {}) => {
    if (!token) {
      return { success: false, error: 'Authentication required', status: 401 };
    }

    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS, {
        headers: { Authorization: `Bearer ${token}` },
        params: { unreadOnly, limit },
      });

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Notifications fetched successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to fetch notifications',
        status: error.response?.status,
      };
    }
  },

  getUnreadNotificationCount: async (token) => {
    if (!token) {
      return { success: false, error: 'Authentication required', status: 401 };
    }

    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        success: true,
        data: response.data,
        message: 'Unread count fetched successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to fetch unread count',
        status: error.response?.status,
      };
    }
  },

  markNotificationAsRead: async (notificationId, token) => {
    if (!token) {
      return { success: false, error: 'Authentication required', status: 401 };
    }

    try {
      const response = await api.patch(`${API_ENDPOINTS.NOTIFICATION_READ}/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Notification updated',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to update notification',
        status: error.response?.status,
      };
    }
  },

  markAllNotificationsRead: async (token) => {
    if (!token) {
      return { success: false, error: 'Authentication required', status: 401 };
    }

    try {
      const response = await api.patch(API_ENDPOINTS.NOTIFICATION_READ_ALL, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'All notifications marked as read',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to update notifications',
        status: error.response?.status,
      };
    }
  },

  /**
   * Fetch bookings for the current user
   * @param {Object} filters - { status, upcoming, page, limit }
   * @param {string} token - JWT token
   * @returns {Promise} API response
   */
  getBookings: async (filters = {}, token) => {
    if (!token) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401,
      };
    }

    const params = {
      page: filters.page ?? 1,
      limit: filters.limit ?? 25,
    };

    if (filters.status) {
      params.status = filters.status;
    }

    if (typeof filters.upcoming !== 'undefined') {
      params.upcoming = String(filters.upcoming);
    }

    try {
      const response = await api.get(API_ENDPOINTS.MY_BOOKINGS, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Bookings fetched successfully',
      };
    } catch (error) {
      console.error('My bookings fetch error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to fetch bookings',
        status: error.response?.status,
      };
    }
  },

  /**
   * Cancel a booking group
   * @param {string} bookingGroupId
   * @param {string} token
   */
  cancelTicket: async (bookingGroupId, token) => {
    if (!token) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401,
      };
    }

    try {
      const response = await api.post(
        API_ENDPOINTS.CANCEL_TICKET,
        { bookingGroupId },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Booking cancelled successfully',
      };
    } catch (error) {
      console.error('Cancel ticket error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to cancel booking',
        status: error.response?.status,
      };
    }
  },
};

/**
 * Bus API functions
 */
export const busAPI = {
  /**
   * Search buses for a route and date
   * @param {Object} searchData - { startLocation, endLocation, date }
   * @returns {Promise} API response with bus search results
   */
  searchBuses: async (searchData) => {
    try {
      console.log('Sending bus search request to:', API_BASE_URL + API_ENDPOINTS.SHOW_BUS);
      console.log('Search data:', searchData);
      
      const response = await api.post(API_ENDPOINTS.SHOW_BUS, searchData);
      console.log('Bus search success:', {
        status: response.status,
        resultCount: response.data?.trips?.length || 0,
        fullResponse: response.data
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Bus search successful',
      };
    } catch (error) {
      console.error('Bus search error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      });
      
      // Handle network errors specifically
      if (!error.response && error.message) {
        return {
          success: false,
          error: error.message || 'Network error. Please check your connection and ensure the server is running.',
          status: null,
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Bus search failed',
        status: error.response?.status,
      };
    }
  },

  /**
   * Get detailed bus information for seat selection
   * @param {string} tripId - Trip ID
   * @param {string} fromStopId - From stop ID
   * @param {string} toStopId - To stop ID
   * @param {string} token - JWT token (optional)
   * @returns {Promise} API response with bus details
   */
  getBusInfo: async (tripId, fromStopId, toStopId, token = null) => {
    try {
      console.log('🚌 API Call Debug - Fetching bus info for trip:', tripId);
      console.log('🚌 API Call Debug - Stop IDs:', { fromStopId, toStopId });
      console.log('🚌 API Call Debug - Trip ID type:', typeof tripId);
      console.log('🚌 API Call Debug - Trip ID length:', tripId?.length);
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const endpoint = `${API_ENDPOINTS.BUS_INFO}/${tripId}`;
      const queryParams = `?fromStopId=${fromStopId}&toStopId=${toStopId}`;
      const fullUrl = endpoint + queryParams;
      
      console.log('🚌 API Call Debug - Full URL:', fullUrl);
      console.log('🚌 API Call Debug - Base URL:', API_BASE_URL);
      
      const response = await api.get(fullUrl, {
        headers,
      });
      
      console.log('Bus info success:', {
        status: response.status,
        hasSeats: !!response.data?.seats,
        hasBoardingPoints: !!response.data?.boardingPoints,
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Bus info fetched successfully',
      };
    } catch (error) {
      console.error('Bus info error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      });
      
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to fetch bus info',
        status: error.response?.status,
      };
    }
  },

  /**
   * Get seat availability including holds/bookings for a trip segment
   * @param {string} tripId
   * @param {number} fromStopIndex
   * @param {number} toStopIndex
   * @param {boolean} isReturnTrip
   * @param {string} token
   * @returns {Promise}
   */
  getSeatAvailability: async (tripId, fromStopIndex, toStopIndex, isReturnTrip = false, token = null) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const endpoint = API_ENDPOINTS.SEAT_AVAILABILITY(tripId);
      const queryParams = `?fromStopIndex=${fromStopIndex}&toStopIndex=${toStopIndex}&isReturnTrip=${isReturnTrip}`;

      const response = await api.get(`${endpoint}${queryParams}`, { headers });

      return {
        success: true,
        data: response.data,
        message: response.data?.message || 'Seat availability fetched successfully',
      };
    } catch (error) {
      console.error('Seat availability error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to fetch seat availability',
        status: error.response?.status,
      };
    }
  },
};

/**
 * Payment and Coupon API functions
 */
api.applyCoupon = async (couponData, token) => {
  try {
    console.log('Applying coupon:', { code: couponData.code, tripId: couponData.tripId });
    
    const response = await api.post(API_ENDPOINTS.APPLY_COUPON, couponData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log('Coupon application success:', {
      status: response.status,
      discountAmount: response.data?.discountAmount,
      finalAmount: response.data?.finalAmount,
    });
    
    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Coupon applied successfully',
    };
  } catch (error) {
    console.error('Coupon application error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message || 'Failed to apply coupon',
      status: error.response?.status,
    };
  }
};

api.getOffers = async (token) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await api.get(API_ENDPOINTS.OFFERS, { headers });

    return {
      success: true,
      data: response.data,
      message: response.data?.message || 'Offers fetched successfully',
    };
  } catch (error) {
    console.error('Offers fetch error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message || 'Failed to load offers',
      status: error.response?.status,
    };
  }
};

api.initiatePayment = async (paymentData, token) => {
  try {
    console.log('Initiating payment:', { 
      method: paymentData.paymentMethod,
      tripId: paymentData.tripId,
      seatCount: paymentData.seatIds?.length 
    });
    
    const response = await api.post(API_ENDPOINTS.PAYMENT_INITIATE, paymentData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log('Payment initiation success:', {
      status: response.status,
      paymentId: response.data?.paymentId,
      method: response.data?.method,
    });
    
    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Payment initiated successfully',
    };
  } catch (error) {
    console.error('Payment initiation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      requestData: paymentData,
    });
    
    // Log detailed validation errors if available
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
    
    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message || 'Failed to initiate payment',
      status: error.response?.status,
      validationErrors: error.response?.data?.errors || null,
    };
  }
};

api.verifyPayment = async (verificationData, token) => {
  try {
    console.log('Verifying payment:', { paymentId: verificationData.paymentId });
    
    const response = await api.post(API_ENDPOINTS.PAYMENT_VERIFY, verificationData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log('Payment verification success:', {
      status: response.status,
      bookingId: response.data?.booking?.id,
    });
    
    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Payment verified successfully',
    };
  } catch (error) {
    console.error('Payment verification error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message || 'Failed to verify payment',
      status: error.response?.status,
    };
  }
};

api.confirmPayment = async (confirmData, token) => {
  try {
    console.log('Confirming booking for payment:', { paymentId: confirmData.paymentId });

    const response = await api.post(API_ENDPOINTS.PAYMENT_CONFIRM, confirmData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('Payment confirmation success:', {
      status: response.status,
      bookingGroupId: response.data?.bookingGroupId,
    });

    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Booking confirmed successfully',
    };
  } catch (error) {
    console.error('Payment confirmation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message || 'Failed to confirm booking',
      status: error.response?.status,
    };
  }
};

export default api;
