"use client";

import { CreditCard, Calendar, Pause, RefreshCw, Gift, CheckCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

export default function MemberMembership() {
  const membership = {
    type: 'Premium Annual',
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-12-25',
    daysRemaining: 245,
    autoRenew: true,
    benefits: [
      'Unlimited gym access',
      '24/7 facility access',
      '12 PT sessions included',
      'All group classes',
      'Locker facility',
      'Nutrition consultation',
    ],
    price: '₹24,999/year',
    freezeAvailable: true,
    freezeDaysLeft: 14,
  };

  const paymentHistory = [
    { date: '2026-01-01', amount: '₹24,999', method: 'Card', status: 'paid' },
    { date: '2025-01-01', amount: '₹22,999', method: 'Online', status: 'paid' },
  ];

  const addOns = [
    { name: 'Extra PT Sessions', price: '₹500/session', available: true },
    { name: 'Guest Pass (Day)', price: '₹300', available: true },
    { name: 'Locker Rental', price: '₹200/month', available: true },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Membership Card */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-5 shadow-xl text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[12px] text-white/80 mb-1">Current Plan</div>
            <h2 className="text-[20px] font-bold">{membership.type}</h2>
            <div className="text-[14px] text-white/90 mt-1">{membership.price}</div>
          </div>
          <div className="bg-green-500 px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            ACTIVE
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[12px] mb-2">
            <span className="text-white/80">Membership Progress</span>
            <span className="font-semibold">{membership.daysRemaining} days left</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: '30%' }}></div>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between pt-4 border-t border-white/20 text-[13px]">
          <div>
            <div className="text-white/80 text-[11px]">Started</div>
            <div className="font-semibold">{new Date(membership.startDate).toLocaleDateString()}</div>
          </div>
          <div className="text-center">
            <div className="text-white/80 text-[11px]">Auto Renew</div>
            <div className="font-semibold">{membership.autoRenew ? 'ON' : 'OFF'}</div>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-[11px]">Expires</div>
            <div className="font-semibold">{new Date(membership.endDate).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-white border-2 border-[#F5C742] text-[#F5C742] rounded-xl p-4 shadow-sm hover:bg-[#F5C742] hover:text-white transition-colors">
          <RefreshCw className="w-6 h-6 mx-auto mb-2" />
          <div className="text-[13px] font-semibold">Renew Now</div>
        </button>
        <button className="bg-white border-2 border-[#F59E0B] text-[#F59E0B] rounded-xl p-4 shadow-sm hover:bg-[#F59E0B] hover:text-white transition-colors">
          <Pause className="w-6 h-6 mx-auto mb-2" />
          <div className="text-[13px] font-semibold">Freeze</div>
        </button>
      </div>

      {/* Tabs for membership sections */}
      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
        </TabsList>

        {/* Benefits Tab */}
        <TabsContent value="benefits" className="space-y-4 mt-4">
          {/* Membership Benefits */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Your Benefits</h3>
            <div className="grid grid-cols-2 gap-3">
              {membership.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#327f74] mt-0.5 flex-shrink-0" />
                  <span className="text-[13px] text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Freeze Info */}
          {membership.freezeAvailable && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Pause className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-[14px] font-semibold text-blue-900 mb-1">Freeze Available</h4>
                  <p className="text-[12px] text-blue-700">
                    You have {membership.freezeDaysLeft} freeze days remaining. Pause your membership temporarily without losing benefits.
                  </p>
                  <button className="mt-2 text-[12px] text-blue-600 font-medium hover:underline">
                    Learn More →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Renewal Offer */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg text-white">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5" />
              <h3 className="text-[15px] font-bold">Early Renewal Offer!</h3>
            </div>
            <p className="text-[13px] text-white/90 mb-3">
              Renew now and get 15% off + 1 month free PT sessions worth ₹6,000
            </p>
            <button className="bg-white text-purple-600 rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-white/90 transition-colors">
              Claim Offer →
            </button>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          {/* Payment History */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Payment History</h3>
            <div className="space-y-3">
              {paymentHistory.map((payment, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="text-[14px] font-semibold text-gray-900">{payment.amount}</div>
                    <div className="text-[12px] text-gray-600">
                      {new Date(payment.date).toLocaleDateString()} • {payment.method}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[11px] font-medium">
                    Paid
                  </span>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-[#327f74] text-[13px] font-medium hover:underline">
              View All Transactions
            </button>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Payment Method</h3>
            <div className="border-2 border-[#F5C742] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-[#F5C742]" />
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-gray-900">•••• •••• •••• 4532</div>
                  <div className="text-[12px] text-gray-600">Expires 12/27</div>
                </div>
                <button className="text-[#327f74] text-[12px] font-medium hover:underline">
                  Edit
                </button>
              </div>
            </div>
            <button className="w-full mt-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-200 transition-colors">
              + Add New Card
            </button>
          </div>
        </TabsContent>

        {/* Add-ons Tab */}
        <TabsContent value="addons" className="space-y-4 mt-4">
          {/* Add-ons */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-gray-900">Available Add-ons</h3>
              <Gift className="w-5 h-5 text-[#F5C742]" />
            </div>
            <div className="space-y-3">
              {addOns.map((addon, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <h4 className="text-[14px] font-semibold text-gray-900">{addon.name}</h4>
                    <p className="text-[12px] text-gray-600">{addon.price}</p>
                  </div>
                  <button className="px-4 py-2 bg-[#F5C742] text-white rounded-lg text-[12px] font-medium hover:bg-[#F59E0B] transition-colors">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Add-ons */}
          <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-4 shadow-sm text-white">
            <h3 className="text-[15px] font-semibold mb-3">Your Active Add-ons</h3>
            <div className="space-y-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px]">Locker Rental</span>
                  <span className="text-[12px] font-semibold">₹200/month</span>
                </div>
              </div>
              <p className="text-[12px] text-white/80 text-center mt-3">
                Add more services to enhance your membership
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}