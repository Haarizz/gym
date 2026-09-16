# Button Update Instructions for plans-services-catalog.tsx

## Issue
The "Choose Plan" and "View Details" buttons on lines 659-670 need to be updated with onClick handlers.

## Required Changes

### Current Code (Lines 658-671):
```tsx
                    <div className="space-y-3">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        <Gift className="h-4 w-4 mr-2" />
                        Choose Plan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
```

### Updated Code (Replace lines 658-671 with):
```tsx
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-[#2B7A78] hover:bg-[#236360] text-white"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowChoosePlan(true);
                        }}
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Choose Plan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-primary text-primary hover:bg-primary/10"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowPlanDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
```

## What's Already Implemented
✅ State variables (selectedPlan, showPlanDetails, showChoosePlan) - Lines 275-277
✅ Plan Details Dialog - Lines 1068-1164  
✅ Choose Plan Dialog - Lines 1166-1296

## What's Missing
❌ onClick handlers on the buttons - Lines 659 & 663

## Manual Fix
Open `/components/plans-services-catalog.tsx` and replace lines 659-670 with the updated code above.
