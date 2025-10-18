# How to Receive Payments - Complete Setup Guide

## Overview
You'll use **Stripe** to process payments. Stripe handles everything:
- Credit/debit card payments
- Apple Pay
- Google Pay
- Subscription management
- Automatic billing
- **Money goes directly to your bank account**

---

## Step 1: Create Stripe Account (5 minutes)

### A. Sign Up
1. **Go to:** https://stripe.com
2. **Click "Start now"** or "Sign up"
3. **Fill in:**
   - Your email
   - Your name
   - Password
   - Country (where you live)

### B. Business Information
After signing up, Stripe will ask:
```
Business type: Individual or Company
Business name: SendMyBeat (or your name)
Industry: Software/SaaS
Website: https://tag-genius-4.preview.emergentagent.com
```

### C. Bank Account (To Receive Money)
Stripe will ask you to connect your bank account:
```
- Bank account number
- Routing number
- Account holder name
```

**This is where your money will be deposited!**

---

## Step 2: Get Your API Keys

### A. Test Mode (For Development)
1. **Go to:** https://dashboard.stripe.com/test/apikeys
2. You'll see two keys:
   - **Publishable key:** `pk_test_...` (safe to show in frontend)
   - **Secret key:** `sk_test_...` (NEVER share, backend only)
3. **Copy both keys**

### B. Live Mode (For Real Payments)
Once you're ready to accept real payments:
1. **Activate your account** (Stripe will verify your business)
2. **Go to:** https://dashboard.stripe.com/apikeys
3. Get your **live keys:**
   - **Publishable key:** `pk_live_...`
   - **Secret key:** `sk_live_...`

---

## Step 3: Create Your Subscription Product

### In Stripe Dashboard:
1. **Go to:** https://dashboard.stripe.com/test/products
2. **Click "Add product"**
3. **Fill in:**
   ```
   Name: SendMyBeat Pro
   Description: Unlimited AI tag generation and description refinement
   Pricing model: Standard pricing
   Price: $5.00 USD
   Billing period: Monthly
   ```
4. **Click "Save product"**
5. **Copy the Price ID** (looks like: `price_1ABC...`)

---

## Step 4: How Money Flows

### Payment Flow:
```
User subscribes ($5)
    ↓
Stripe processes payment
    ↓
Stripe takes fee (~3% + $0.30 = $0.45)
    ↓
You receive: $4.55
    ↓
Money deposited to your bank (2-7 days)
```

### Stripe Fees:
- **US cards:** 2.9% + $0.30 per transaction
- **International cards:** 3.9% + $0.30
- **No monthly fees** (pay as you go)

**Example:**
- User pays: $5.00
- Stripe fee: ~$0.45
- You get: ~$4.55

---

## Step 5: View Your Money

### Stripe Dashboard:
1. **Go to:** https://dashboard.stripe.com
2. **Click "Payments"** - See all transactions
3. **Click "Balance"** - See your available balance
4. **Click "Payouts"** - See bank deposits

### Automatic Payouts:
- Stripe automatically deposits to your bank
- **Schedule:** Every 2 days (after first payout)
- **First payout:** 7 days after first sale (security)

---

## Step 6: What I'll Implement

### Backend:
```python
# In your .env file (you'll add these):
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PRICE_ID=price_1ABC...your_price_id
```

### Features I'll Add:
1. ✅ Track AI usage (2 free per day)
2. ✅ Stripe checkout page
3. ✅ Subscription management
4. ✅ Usage reset daily at midnight
5. ✅ Upgrade prompts
6. ✅ Webhook handling (auto-activate subscriptions)

---

## Step 7: Testing Before Going Live

### Test Mode Features:
- Use **test credit cards** (Stripe provides these)
- No real money charged
- Test the full flow
- Make sure everything works

### Test Credit Card Numbers:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires 3D Secure: 4000 0025 0000 3155

Any future expiry date
Any 3-digit CVC
Any billing ZIP code
```

---

## Step 8: Going Live

### When Ready:
1. **Activate Stripe account** (verify business info)
2. **Switch to live API keys** in .env
3. **Test with real card** (charge yourself $5 to test)
4. **Open to users!**

### Checklist:
- ✅ Bank account connected
- ✅ Business verified
- ✅ Live API keys in place
- ✅ Test purchase successful
- ✅ Money appears in Stripe balance

---

## Step 9: Managing Your Business

### Stripe Dashboard Shows:
- **Revenue:** How much you've made
- **Customers:** List of subscribers
- **Subscriptions:** Active/cancelled
- **Failed payments:** Auto-retry for you
- **Refunds:** If needed

### Monthly Revenue Example:
```
Month 1: 10 users × $5 = $50
Month 2: 25 users × $5 = $125
Month 3: 50 users × $5 = $250
```

### After Stripe fees (~10% total):
```
Month 1: ~$45
Month 2: ~$112
Month 3: ~$225
```

---

## Step 10: Taxes & Legal

### Important Notes:
1. **Taxes:** You'll need to report income
2. **Business License:** May be required (depends on location)
3. **Terms of Service:** Should have one
4. **Privacy Policy:** Already created ✅

### Stripe Helps With:
- Sales tax collection (automatic)
- 1099 forms (if US)
- Transaction records

---

## FAQ

### Q: How long until I get my money?
**A:** 
- First payout: 7 days after first sale
- After that: Every 2 days automatically

### Q: What if a user cancels?
**A:** 
- They keep access until end of billing period
- No more charges after cancellation
- Stripe handles everything automatically

### Q: What if payment fails?
**A:**
- Stripe auto-retries 4 times
- Sends email to customer
- If all fail, subscription cancelled

### Q: Can I change the price?
**A:**
- Yes, create new price in Stripe
- Existing subscribers keep old price
- New subscribers get new price

### Q: Do I need a business?
**A:**
- No! Can use as individual
- Just need bank account
- Pay taxes as personal income

### Q: What countries does Stripe support?
**A:**
- 40+ countries
- Check: https://stripe.com/global
- US, Canada, UK, EU, Australia, etc.

---

## Next Steps

1. **Create Stripe account** (5 min)
2. **Get test API keys** (1 min)
3. **Give me the keys** (I'll implement)
4. **Test with test cards** (5 min)
5. **Go live when ready!** 🚀

---

## What You'll Give Me:

```env
# Test Mode (for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...

# Later, for live mode:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...
```

---

**Ready?** Create your Stripe account and I'll implement the complete paywall system! 💰
