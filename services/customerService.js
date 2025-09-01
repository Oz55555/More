const Customer = require('../models/Customer');
const PaymentHistory = require('../models/PaymentHistory');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class CustomerService {
  /**
   * Create or update a customer in both Stripe and local database
   */
  static async createOrUpdateCustomer(customerData) {
    try {
      const { name, email, address, phone, metadata = {} } = customerData;

      // Check if customer already exists in our database
      let existingCustomer = await Customer.findOne({ email });
      
      if (existingCustomer) {
        // Update existing customer
        existingCustomer.name = name || existingCustomer.name;
        existingCustomer.address = { ...existingCustomer.address, ...address };
        existingCustomer.phone = phone || existingCustomer.phone;
        existingCustomer.metadata = new Map([...existingCustomer.metadata, ...Object.entries(metadata)]);
        
        await existingCustomer.save();
        
        // Update Stripe customer
        await stripe.customers.update(existingCustomer.stripeCustomerId, {
          name,
          email,
          address,
          phone,
          metadata
        });
        
        return existingCustomer;
      }

      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        name,
        email,
        address,
        phone,
        metadata
      });

      // Create customer in our database
      const newCustomer = new Customer({
        stripeCustomerId: stripeCustomer.id,
        name,
        email,
        address,
        phone,
        metadata: new Map(Object.entries(metadata))
      });

      await newCustomer.save();
      return newCustomer;

    } catch (error) {
      console.error('Error creating/updating customer:', error);
      throw new Error(`Customer operation failed: ${error.message}`);
    }
  }

  /**
   * Get customer by Stripe customer ID
   */
  static async getCustomerByStripeId(stripeCustomerId) {
    try {
      return await Customer.findOne({ stripeCustomerId });
    } catch (error) {
      console.error('Error fetching customer by Stripe ID:', error);
      throw new Error(`Failed to fetch customer: ${error.message}`);
    }
  }

  /**
   * Get customer by email
   */
  static async getCustomerByEmail(email) {
    try {
      return await Customer.findOne({ email: email.toLowerCase() });
    } catch (error) {
      console.error('Error fetching customer by email:', error);
      throw new Error(`Failed to fetch customer: ${error.message}`);
    }
  }

  /**
   * Get customer payment history
   */
  static async getCustomerPaymentHistory(customerId, limit = 10, offset = 0) {
    try {
      const payments = await PaymentHistory.find({ customerId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate('customerId', 'name email');

      const total = await PaymentHistory.countDocuments({ customerId });

      return {
        payments,
        total,
        hasMore: (offset + limit) < total
      };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }
  }

  /**
   * Record a payment in the database
   */
  static async recordPayment(paymentData) {
    try {
      const {
        stripePaymentIntentId,
        stripeCustomerId,
        amount,
        currency = 'USD',
        status,
        paymentMethod,
        description,
        receiptEmail,
        billingAddress,
        fees = {},
        metadata = {}
      } = paymentData;

      // Find the customer in our database
      const customer = await Customer.findOne({ stripeCustomerId });
      if (!customer) {
        throw new Error('Customer not found in database');
      }

      // Create payment history record
      const paymentHistory = new PaymentHistory({
        stripePaymentIntentId,
        stripeCustomerId,
        customerId: customer._id,
        amount,
        currency: currency.toUpperCase(),
        status,
        paymentMethod,
        description,
        receiptEmail,
        billingAddress,
        fees,
        metadata: new Map(Object.entries(metadata)),
        processedAt: status === 'succeeded' ? new Date() : null
      });

      await paymentHistory.save();
      return paymentHistory;

    } catch (error) {
      console.error('Error recording payment:', error);
      throw new Error(`Failed to record payment: ${error.message}`);
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(stripePaymentIntentId, status, metadata = {}) {
    try {
      const payment = await PaymentHistory.findOne({ stripePaymentIntentId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      payment.status = status;
      payment.metadata = new Map([...payment.metadata, ...Object.entries(metadata)]);
      
      if (status === 'succeeded' && !payment.processedAt) {
        payment.processedAt = new Date();
      }

      await payment.save();
      return payment;

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  }

  /**
   * Add refund to payment history
   */
  static async addRefund(stripePaymentIntentId, refundData) {
    try {
      const { stripeRefundId, amount, reason, status } = refundData;

      const payment = await PaymentHistory.findOne({ stripePaymentIntentId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      payment.refunds.push({
        stripeRefundId,
        amount,
        reason,
        status
      });

      await payment.save();
      return payment;

    } catch (error) {
      console.error('Error adding refund:', error);
      throw new Error(`Failed to add refund: ${error.message}`);
    }
  }

  /**
   * Get customer statistics
   */
  static async getCustomerStats(customerId) {
    try {
      const stats = await PaymentHistory.aggregate([
        { $match: { customerId: customerId } },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] }
            },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]);

      return stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        averageAmount: 0
      };

    } catch (error) {
      console.error('Error getting customer stats:', error);
      throw new Error(`Failed to get customer statistics: ${error.message}`);
    }
  }
}

module.exports = CustomerService;
