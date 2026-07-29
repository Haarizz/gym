import { Plus, Tag, Calendar, TrendingUp, Copy, Share2 } from 'lucide-react';

export default function AdminDeals() {
  const activeDeals = [
    {
      title: 'Summer Special',
      discount: '30% OFF',
      code: 'SUMMER30',
      validUntil: '2026-04-30',
      branches: ['All Branches'],
      usageCount: 45,
      usageLimit: 100,
      status: 'active',
    },
    {
      title: 'Student Discount',
      discount: '₹500 OFF',
      code: 'STUDENT500',
      validUntil: '2026-12-31',
      branches: ['Branch 1', 'Branch 2'],
      usageCount: 28,
      usageLimit: 50,
      status: 'active',
    },
  ];

  const referralCodes = [
    {
      code: 'REF2024A',
      owner: 'Rahul Sharma',
      discount: '₹1000',
      uses: 12,
      revenue: '₹24,000',
    },
    {
      code: 'FRIEND10',
      owner: 'Priya Patel',
      discount: '10%',
      uses: 8,
      revenue: '₹16,800',
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Active Offers</div>
          <div className="text-[24px] font-semibold text-[#327f74]">5</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Total Redemptions</div>
          <div className="text-[24px] font-semibold text-[#F5C742]">156</div>
        </div>
      </div>

      {/* Active Deals Section */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-gray-900">Active Offers</h2>
          <button className="text-[#327f74] text-[13px] font-medium">View All</button>
        </div>

        <div className="space-y-3">
          {activeDeals.map((deal, index) => (
            <div
              key={index}
              className="border-2 border-dashed border-[#327f74]/30 rounded-xl p-4 bg-gradient-to-br from-white to-[#327f74]/5"
            >
              {/* Deal Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">{deal.title}</h3>
                  <div className="inline-block px-3 py-1 bg-[#F5C742] text-white rounded-lg text-[14px] font-bold">
                    {deal.discount}
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-medium border border-green-200">
                  ACTIVE
                </span>
              </div>

              {/* Code */}
              <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-gray-600 mb-1">Promo Code</div>
                    <div className="text-[16px] font-mono font-bold text-gray-900">{deal.code}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 bg-[#327f74] rounded-lg hover:bg-[#2a6b62] transition-colors">
                      <Share2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Valid Until:</span>
                  <span className="text-gray-900 font-medium">{new Date(deal.validUntil).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Branches:</span>
                  <span className="text-gray-900 font-medium">{deal.branches.join(', ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Usage:</span>
                  <span className="text-gray-900 font-medium">
                    {deal.usageCount} / {deal.usageLimit}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#327f74] rounded-full"
                    style={{ width: `${(deal.usageCount / deal.usageLimit) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Codes Section */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-gray-900">Referral Codes</h2>
          <button className="text-[#327f74] text-[13px] font-medium">View All</button>
        </div>

        <div className="space-y-3">
          {referralCodes.map((referral, index) => (
            <div key={index} className="bg-gradient-to-r from-[#F5C742]/10 to-[#F59E0B]/10 rounded-xl p-3 border border-[#F5C742]/30">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[14px] font-bold text-gray-900">{referral.code}</div>
                <div className="text-[12px] text-gray-600">{referral.owner}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[12px]">
                <div>
                  <div className="text-gray-600">Discount</div>
                  <div className="font-semibold text-gray-900">{referral.discount}</div>
                </div>
                <div>
                  <div className="text-gray-600">Uses</div>
                  <div className="font-semibold text-gray-900">{referral.uses}</div>
                </div>
                <div>
                  <div className="text-gray-600">Revenue</div>
                  <div className="font-semibold text-green-600">{referral.revenue}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create New Deal */}
      <button className="w-full py-4 bg-gradient-to-r from-[#327f74] to-[#2a6b62] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        Create New Offer
      </button>

      {/* Quick Stats */}
      <div className="bg-gradient-to-br from-[#F5C742] to-[#F59E0B] rounded-2xl p-4 shadow-sm">
        <h3 className="text-white text-[14px] font-semibold mb-3">This Month's Impact</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-white/80 text-[11px] mb-1">Revenue from Deals</div>
            <div className="text-white text-[18px] font-bold">₹3.2L</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-white/80 text-[11px] mb-1">New Members</div>
            <div className="text-white text-[18px] font-bold">87</div>
          </div>
        </div>
      </div>
    </div>
  );
}
