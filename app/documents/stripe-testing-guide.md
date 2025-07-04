# Stripe Integration Testing Guide

This guide covers how to test the Stripe subscription system locally, including all the recent fixes and simplifications.

## Prerequisites

- Node.js development server running
- Stripe test account with test API keys
- Stripe CLI installed for webhook testing

## 1. Environment Setup

### Stripe Test Keys
Ensure your `.env.local` contains test keys (not production):

```bash
# Test keys start with pk_test_ and sk_test_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # Set after Stripe CLI setup
```

### Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Other platforms: https://stripe.com/docs/stripe-cli
```

### Setup Webhook Forwarding
```bash
# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret from the CLI output and add to `.env.local`.

## 2. Stripe Dashboard Setup

Create test products in [Stripe Dashboard > Products](https://dashboard.stripe.com/test/products):

### Required Products
- **Monthly Plan**: `lookup_key = "standard_monthly"`
- **Quarterly Plan**: `lookup_key = "standard_quarterly"`
- **Annual Plan**: `lookup_key = "standard_annual"`

### Product Configuration
- Product Type: Recurring
- Billing Period: Monthly/Quarterly/Annual
- Currency: USD (or your preferred currency)
- Add lookup keys exactly as shown above

## 3. Test Scenarios

### A. Basic Subscription Flow

#### Test Case 1: Unauthenticated User
1. Visit `http://localhost:3000/pricing`
2. Click any subscription plan
3. **Expected**: Redirect to `/login?redirectedFrom=/pricing`
4. Login with test user
5. **Expected**: Redirect back to pricing page

#### Test Case 2: Authenticated Subscription
1. On pricing page, click a monthly plan
2. **Expected**: Redirect to Stripe checkout
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. **Expected**: Redirect to `/pricing?checkout=success`
6. **Expected**: Success message appears, page refreshes after 5 seconds
7. **Expected**: User profile shows active subscription

### B. Duplicate Subscription Prevention

#### Test Case 3: Existing Active Subscription
1. With an active subscription, visit `/pricing`
2. Try to click another plan
3. **Expected**: Error message "You already have an active subscription..."
4. **Expected**: Button disabled or error displayed

### C. Subscription Management

#### Test Case 4: Profile Page Management
1. Navigate to `/profile` with active subscription
2. **Expected**: Shows current plan and status
3. **Expected**: "Manage Subscription" button visible
4. Click "Cancel Subscription"
5. **Expected**: Confirmation modal appears
6. Confirm cancellation
7. **Expected**: Subscription marked as "Ending Soon"
8. **Expected**: "Resume Subscription" button appears

#### Test Case 5: Subscription Resumption
1. With canceled subscription, click "Resume Subscription"
2. **Expected**: Confirmation modal appears
3. Confirm resumption
4. **Expected**: Subscription restored to active status
5. **Expected**: "Cancel Subscription" button returns

### D. Billing Portal Integration

#### Test Case 6: External Billing Management
1. On profile page, click "Manage Subscription" or "Change Plan"
2. **Expected**: Redirect to Stripe billing portal
3. Make changes in portal (e.g., update payment method)
4. Return to site
5. **Expected**: Changes reflected in profile

### E. Trial Logic Testing

#### Test Case 7: Trial Limitations
1. Set user to trial status in database:
   ```sql
   UPDATE profiles 
   SET subscription_status = 'trialing', 
       generations_remaining = 2 
   WHERE id = 'user_id';
   ```
2. Visit `/pricing`
3. **Expected**: Shows trial status and remaining generations
4. Set `generations_remaining = 0`
5. **Expected**: Upgrade buttons disabled
6. **Expected**: Clear messaging about trial limitations

## 4. Webhook Testing

### Manual Webhook Triggers
With Stripe CLI running, test these events:

```bash
# Subscription events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.paid
stripe trigger invoice.payment_failed

# Check webhook processing in server logs
```

### Webhook Event Verification
Monitor your development server logs for:
- Successful webhook receipt
- Database updates
- Error handling and retries
- Proper event processing

## 5. Error Scenarios

### A. Network/API Errors

#### Test Case 8: Stripe API Failures
1. Temporarily block internet access
2. Try to create subscription
3. **Expected**: User-friendly error message
4. **Expected**: No partial/broken state

#### Test Case 9: Webhook Failures
1. Temporarily break database connection
2. Complete a subscription
3. **Expected**: Webhook retries up to 3 times
4. **Expected**: Proper error logging
5. Restore connection
6. **Expected**: Eventual consistency

### B. Invalid States

#### Test Case 10: Corrupted Subscription Data
1. Manually set invalid subscription status in database
2. Visit profile page
3. **Expected**: Graceful fallback to Stripe data
4. **Expected**: No application crashes

## 6. Test Cards

Use these Stripe test cards for different scenarios:

```bash
# Successful payments
4242 4242 4242 4242    # Visa
5555 5555 5555 4444    # Mastercard

# Declined payments
4000 0000 0000 0002    # Generic decline
4000 0000 0000 9995    # Insufficient funds

# Authentication required
4000 0025 0000 3155    # 3D Secure authentication

# Specific error types
4000 0000 0000 0069    # Expired card
4000 0000 0000 0127    # Incorrect CVC
```

## 7. Monitoring Commands

### Real-time Monitoring
```bash
# Development server (Terminal 1)
npm run dev

# Stripe webhook forwarding (Terminal 2)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Stripe CLI commands (Terminal 3)
stripe events list
stripe customers list
stripe subscriptions list
```

### Database Monitoring
Check the `profiles` table for these fields:
- `subscription_status`
- `subscription_plan`
- `stripe_customer_id`
- `stripe_subscription_id`
- `current_period_end`
- `generations_remaining`

## 8. Common Issues & Solutions

### Issue 1: Webhook Secret Mismatch
**Symptoms**: 400 errors on webhook endpoint
**Solution**: Ensure `STRIPE_WEBHOOK_SECRET` matches CLI output

### Issue 2: Product Lookup Key Mismatch
**Symptoms**: Plan not recognized in webhook
**Solution**: Verify lookup keys match exactly in Stripe dashboard

### Issue 3: Database Connection Issues
**Symptoms**: Webhook retries failing
**Solution**: Check Supabase connection and service role key

### Issue 4: Authentication Errors
**Symptoms**: 401 errors on API calls
**Solution**: Verify Supabase auth setup and user sessions

## 9. Test Checklist

Before deploying to production, verify:

- [ ] All subscription flows work end-to-end
- [ ] Duplicate subscription prevention works
- [ ] Cancellation and resumption work
- [ ] Billing portal integration works
- [ ] Trial logic correctly limits access
- [ ] Webhooks process successfully
- [ ] Error scenarios handle gracefully
- [ ] Database updates occur correctly
- [ ] User experience is smooth throughout

## 10. Production Deployment Notes

When moving to production:

1. Replace test keys with live keys
2. Update webhook endpoint to production URL
3. Configure production webhook signing secret
4. Verify live products have correct lookup keys
5. Test with small live transactions first
6. Monitor webhook processing carefully

## Support

- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)