import { motion } from 'motion/react';
import { Dumbbell } from 'lucide-react';

export default function Splash() {
  return (
    <div className="h-screen w-full max-w-[390px] mx-auto bg-gradient-to-br from-[#327f74] to-[#2a6b62] flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl">
          <Dumbbell className="w-12 h-12 text-[#327f74]" strokeWidth={2.5} />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-white text-[32px] font-bold mb-2">GymBios</h1>
        <p className="text-white/90 text-[15px] px-12">
          Your Complete Fitness Business OS
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-12"
      >
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </motion.div>
    </div>
  );
}