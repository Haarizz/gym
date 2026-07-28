import { MessageCircle, Phone, Star, Calendar, TrendingUp, Target, Award } from 'lucide-react';

export default function MemberTrainer() {
  const myTrainer = {
    name: 'Rahul Mehta',
    specialization: 'Strength & Conditioning',
    experience: '8 years',
    rating: 4.9,
    reviews: 142,
    bio: 'Certified personal trainer specializing in functional fitness and athletic performance. Passionate about helping clients achieve their fitness goals through personalized training programs.',
  };

  const upcomingSessions = [
    {
      date: '2026-03-27',
      time: '07:00 AM',
      type: 'Personal Training',
      focus: 'Upper Body Strength',
    },
    {
      date: '2026-03-29',
      time: '07:00 AM',
      type: 'Personal Training',
      focus: 'Core & Cardio',
    },
  ];

  const myProgress = {
    sessionsCompleted: 24,
    currentGoal: 'Build Muscle Mass',
    startWeight: '75 kg',
    currentWeight: '78 kg',
    targetWeight: '82 kg',
  };

  return (
    <div className="p-4 space-y-4">
      {/* Trainer Profile Card */}
      <div className="bg-gradient-to-br from-[#F59E0B] to-[#F59E0B]/80 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-[24px] font-bold">
            RM
          </div>
          <div className="flex-1">
            <h2 className="text-[18px] font-bold">{myTrainer.name}</h2>
            <p className="text-[13px] text-white/90">{myTrainer.specialization}</p>
            <div className="flex items-center gap-3 mt-2 text-[12px]">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-white" />
                <span>{myTrainer.rating}</span>
              </div>
              <div>•</div>
              <div>{myTrainer.experience} exp</div>
              <div>•</div>
              <div>{myTrainer.reviews} reviews</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex-1 bg-white text-[#F59E0B] rounded-xl py-3 font-semibold text-[14px] hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Message
          </button>
          <button className="px-4 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-colors">
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-2">About</h3>
        <p className="text-[13px] text-gray-600 leading-relaxed">{myTrainer.bio}</p>
      </div>

      {/* My Progress */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-gray-900">My Progress</h3>
          <Award className="w-5 h-5 text-[#F5C742]" />
        </div>

        <div className="space-y-3">
          <div className="bg-gradient-to-r from-[#327f74]/10 to-[#327f74]/5 rounded-xl p-3">
            <div className="text-[12px] text-gray-600 mb-1">Current Goal</div>
            <div className="text-[15px] font-semibold text-gray-900">{myProgress.currentGoal}</div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-[12px] text-gray-600 mb-1">Start</div>
              <div className="text-[16px] font-semibold text-gray-900">{myProgress.startWeight}</div>
            </div>
            <div className="text-center">
              <div className="text-[12px] text-gray-600 mb-1">Current</div>
              <div className="text-[16px] font-semibold text-[#F5C742]">{myProgress.currentWeight}</div>
            </div>
            <div className="text-center">
              <div className="text-[12px] text-gray-600 mb-1">Target</div>
              <div className="text-[16px] font-semibold text-[#327f74]">{myProgress.targetWeight}</div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-600">Sessions Completed</span>
              <span className="font-semibold text-gray-900">{myProgress.sessionsCompleted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
        <div className="space-y-3">
          {upcomingSessions.map((session, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <div className="bg-[#F5C742]/10 rounded-lg px-3 py-2 text-center min-w-[60px]">
                  <div className="text-[10px] text-gray-600 uppercase">
                    {new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                  <div className="text-[18px] font-bold text-[#F5C742]">
                    {new Date(session.date).getDate()}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-semibold text-gray-900">{session.type}</h4>
                  <p className="text-[12px] text-gray-600 mt-1">{session.focus}</p>
                  <div className="flex items-center gap-2 mt-2 text-[12px] text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>{session.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-3 py-3 bg-[#F5C742] text-white rounded-xl font-semibold text-[14px] hover:bg-[#F59E0B] transition-colors">
          Book Another Session
        </button>
      </div>

      {/* Workout Plans */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-4 shadow-sm text-white">
        <h3 className="text-[15px] font-semibold mb-3">Latest Workout Plan</h3>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
          <h4 className="text-[14px] font-semibold mb-2">4-Week Muscle Building Program</h4>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-white/80">Assigned: Mar 15, 2026</span>
            <span className="text-white/80">Week 2 of 4</span>
          </div>
          <button className="w-full mt-3 py-2 bg-white text-[#327f74] rounded-lg font-semibold text-[13px] hover:bg-white/90 transition-colors">
            View Full Plan
          </button>
        </div>
      </div>

      {/* Request Changes */}
      <button className="w-full py-3 border-2 border-[#F59E0B] text-[#F59E0B] rounded-xl font-semibold hover:bg-[#F59E0B] hover:text-white transition-colors">
        Request Plan Update
      </button>
    </div>
  );
}
