# Quick Start Guide: Promotional Access Days

## 🚀 How to Create a Promotional Access Days Campaign (5 Steps)

### Step 1: Navigate to Promotions
1. Open GymBios application
2. Click **"Marketing & Engagement"** in sidebar
3. Select **"Promotions & Campaigns"**
4. Click **"Create Promotion"** button

---

### Step 2: Select Promotion Type
In the **"Basic Info"** tab:
1. **Promotion Type**: Select **"Promotional Access Days"**
2. Fill in:
   - Promotion Name (e.g., "Loyalty Bonus Days")
   - Description (e.g., "Extra days for our valued members")
   - Start Date & End Date
   - Category
   - Promotion Code (optional)

> ⚡ **Auto-sync**: Selecting this type automatically sets the Discount Type

---

### Step 3: Configure Rules (Discount Tab)
Click on **"Discount"** tab, then scroll down to see:

#### ✅ Policy Rule Builder Section

**Add Your First Rule:**
1. Click **"+ Add Rule"** button
2. Configure the rule:

**Example Rule 1: Reward Long-term Members**
```
Condition Type: Package Duration
Minimum Months: 6
Reward Days: 15
```
→ This gives 15 extra days to members with 6+ month plans

**Example Rule 2: Reward Family Memberships**
```
Condition Type: Membership Type
Select Type: Family
Reward Days: 10
```
→ This gives 10 extra days to all family members

**Example Rule 3: First 50 Buyers**
```
Condition Type: First X Members
Member Limit: 50
Reward Days: 20
```
→ First 50 members to purchase get 20 days

**Example Rule 4: Loyal Members**
```
Condition Type: Renewal Count
Minimum Renewal Count: 3
Reward Days: 30
```
→ Members who renewed 3+ times get 30 days

---

### Step 4: Preview Eligibility
Scroll down to see **"Eligibility Preview"** section:

**Analytics Cards Show:**
- 📊 **Eligible Members**: Total count matching your rules
- 📅 **Total Days**: Cumulative days to be added
- 📈 **Eligibility Rate**: Percentage of total members
- ✨ **Active Rules**: Number of configured rules

**Rule Breakdown:**
- Visual cards showing each rule's impact
- Number of members matched per rule
- Condition details and reward days

**Sample Member Table:**
- Preview which members will receive days
- See member details (name, email, type, plan)
- View exact days to be added per member

---

### Step 5: Apply Promotion
1. Review the preview analytics
2. Click **"Apply Promotion"** button
3. Confirm the action
4. ✅ Success! Members receive extra days

> 🔔 **Notification**: Toast message shows how many members affected

---

## 🎯 Common Use Cases

### Use Case 1: New Year Bonus
**Goal:** Reward all annual membership buyers
```
Rule 1: Package Duration ≥ 12 months → +30 days
Rule 2: Membership Type = Individual → +15 days
```
**Result:** Annual individual members get 30 days (max strategy)

---

### Use Case 2: Family Appreciation Week
**Goal:** Bonus days for family memberships
```
Rule 1: Membership Type = Family → +20 days
Rule 2: Renewal Count ≥ 1 → +10 days
```
**Result:** Returning families get 20 days (max strategy)

---

### Use Case 3: Limited Time Flash Promo
**Goal:** First 100 sign-ups get bonus
```
Rule 1: First X Members = 100 → +25 days
Rule 2: Package Duration ≥ 3 months → +10 days
```
**Result:** First 100 with 3+ month plans get 25 days

---

### Use Case 4: Tenure Appreciation
**Goal:** Reward long-time members
```
Rule 1: Member Tenure Days ≥ 180 → +45 days
Rule 2: Renewal Count ≥ 2 → +30 days
```
**Result:** 180+ day members get 45 days

---

## 🔧 Rule Condition Types Reference

| Condition Type | When to Use | Example Value |
|---|---|---|
| **Membership Type** | Target specific membership categories | "individual", "family", "corporate" |
| **Package Duration** | Reward longer commitments | 3, 6, 12 (months) |
| **Renewal Count** | Reward loyalty | 1, 2, 3+ (renewals) |
| **First X Members** | Limited quantity promo | 50, 100, 200 (members) |
| **Member Tenure** | Reward long-time members | 30, 90, 180 (days since joining) |

---

## 💡 Pro Tips

### ✅ Best Practices
1. **Start Simple**: Begin with 1-2 rules, add more as needed
2. **Preview First**: Always check eligibility before applying
3. **Test Rules**: Use sample data to validate logic
4. **Clear Naming**: Use descriptive promotion names
5. **Set Limits**: Use "First X Members" to control costs

### ⚠️ Important Notes
- **Conflict Resolution**: When multiple rules match, highest reward wins (max strategy)
- **One-Time Application**: Each member can only receive bonus once per promotion
- **Idempotency**: System prevents double-application
- **Audit Trail**: All applications are logged

---

## 📊 Understanding the Preview

### Eligibility Rate Calculation
```
Eligibility Rate = (Eligible Members / Total Members) × 100
```

**Example:**
- Total Members: 250
- Eligible Members: 75
- Eligibility Rate: **30%**

### Total Days Calculation
```
Total Days = Sum of all reward days for all eligible members
```

**Example:**
- Member A: +15 days
- Member B: +20 days
- Member C: +15 days
- Total Days: **50 days**

---

## 🎨 Visual Guide

### Rule Builder Interface
```
┌─────────────────────────────────────────────┐
│  Configure Access Days Rules                │
│  Create flexible rules to determine...      │
│                                              │
│  ┌────────────────┐                         │
│  │  + Add Rule    │                         │
│  └────────────────┘                         │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  Rule #1                          ❌  │  │
│  │  ┌───────────────────────────────┐   │  │
│  │  │ Condition Type                │   │  │
│  │  │ ▼ Membership Type             │   │  │
│  │  └───────────────────────────────┘   │  │
│  │  ┌───────────────────────────────┐   │  │
│  │  │ Membership Type               │   │  │
│  │  │ ▼ Family                      │   │  │
│  │  └───────────────────────────────┘   │  │
│  │  ────────────────────────────────    │  │
│  │  Reward Days: [10] days              │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Preview Interface
```
┌─────────────────────────────────────────────┐
│  📊 75    📅 225    📈 30%    ✨ 2          │
│  Eligible  Total    Rate      Rules         │
│                                              │
│  Rule Breakdown                              │
│  ┌────────┐ ┌────────┐                      │
│  │ Rule 1 │ │ Rule 2 │                      │
│  │ 50     │ │ 25     │                      │
│  └────────┘ └────────┘                      │
│                                              │
│  Sample Eligible Members                     │
│  ┌──────────────────────────────────────┐  │
│  │ Name        Type    Plan    Days     │  │
│  │ Ahmed       Family  6mo     +10      │  │
│  │ Fatima      Family  12mo    +10      │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌────────────────┐  ┌──────────────────┐  │
│  │  🔄 Refresh    │  │ ✓ Apply Promo    │  │
│  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Problem: No Members Showing as Eligible
**Solutions:**
- ✅ Check rule condition values
- ✅ Verify member data exists
- ✅ Adjust condition to be less restrictive
- ✅ Add alternative rules

### Problem: Too Many Members Eligible
**Solutions:**
- ✅ Make conditions more restrictive
- ✅ Add "First X Members" limit
- ✅ Increase minimum requirements
- ✅ Combine multiple conditions

### Problem: Rules Not Updating Preview
**Solutions:**
- ✅ Click "Refresh" button
- ✅ Check for console errors
- ✅ Verify rule values are filled
- ✅ Ensure numbers are positive

---

## 📞 Quick Reference

### Keyboard Shortcuts
- **Tab**: Navigate between fields
- **Enter**: Add new rule (when focused on Add Rule button)
- **Escape**: Close dialogs

### Required Fields
- ✅ Promotion Type: Must select "Promotional Access Days"
- ✅ At least 1 rule configured
- ✅ Reward Days: Must be positive number
- ✅ Condition Value: Must match condition type requirements

### Optional Fields
- Promotion Code
- Minimum Purchase
- Maximum Discount
- Usage Limits

---

## 🎓 Training Checklist

Before creating your first promotion:
- [ ] Read this guide
- [ ] Understand rule condition types
- [ ] Review sample use cases
- [ ] Test with sample data
- [ ] Preview before applying
- [ ] Monitor results

---

## ✅ Success Checklist

After creating a promotion:
- [ ] Rules configured correctly
- [ ] Preview shows expected results
- [ ] Member count is reasonable
- [ ] Total days align with budget
- [ ] Promotion applied successfully
- [ ] Members notified (if enabled)

---

**Need Help?** 
- 📖 See full documentation: `/PROMOTIONAL_ACCESS_DAYS_IMPLEMENTATION.md`
- 🔧 Check code: `/components/PolicyRuleBuilder.tsx`
- 💻 View logic: `/utils/policyRuleEngine.ts`

---

**Last Updated:** November 2, 2024  
**Version:** 1.0.0  
**Status:** Ready to Use ✅
