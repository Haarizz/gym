import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { motion } from "motion/react";
import {
  CreditCard,
  Check,
  Star,
  Zap,
  Crown,
  Users,
  BarChart3,
  Shield,
  Headphones,
  Globe,
  Smartphone,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Target,
  Activity,
  Award,
  CheckCircle,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  Dumbbell,
  Heart,
  Brain,
  Gauge
} from "lucide-react";

const plans = [
  {
    name: "Essentials",
    price: "AED 960 / Yr.",
    tagline: "💵 Affordable / entry-level",
    focus: "🎯 Basic automation & member engagement",
    features: [
      "Member management",
      "Scheduling and booking",
      "Billing and payments",
      "POS & Inventory",
      "Financial Management",
      "Marketing and CRM",
      "BNPL services",
      "Multi-Branch & Franchise Management",
      "Access control",
      "Reporting and analytics",
    ],
    cta: "Get Started",
    icon: Zap,
    color: "from-blue-500 to-blue-600",
  },
  {
    name: "Standard",
    price: "AED 1,840 / Yr.",
    tagline: "💵 Mid-tier / upsell",
    focus: "🎯 Retention & revenue optimization",
    features: [
      "Everything in Essentials, +",
      "White labelled application",
      "Workforce Management",
      "Equipment Management",
    ],
    cta: "Upgrade Now",
    popular: true,
    icon: Target,
    color: "from-green-500 to-green-600",
  },
  {
    name: "Professional",
    price: "AED 3,670 / Yr. (+ AED 330 add-ons)",
    tagline: "💵 Advanced / Growth-focused",
    focus: "🎯 Member retention, revenue optimization & advanced analytics",
    features: [
      "Everything in Standard, +",
      "Revenue-Optimized Payment System",
      "Advanced BI & Intelligence",
      "Marketing & Sales Growth Tools",
      "Premium Add-ons (Upsell Potential)",
      "Operations Automation",
      "Member Retention & Personalization",
    ],
    cta: "Choose Professional",
    icon: Award,
    color: "from-purple-500 to-purple-600",
  },
  {
    name: "Enterprise",
    price: "Flexible enterprise pricing",
    tagline: "💵 Premium / enterprise contract pricing",
    focus: "🎯 Multi-branch intelligence, scalability & business growth",
    features: [
      "Everything in Professional, +",
      "AI-driven Revenue Growth",
      "Seamless Integrations (wearables, biometrics, e-commerce)",
      "Computer Vision & Biometric AI",
      "Smart Workforce & Trainer AI",
      "Executive AI Assistant",
      "Advanced Member Intelligence",
      "Multi-Branch Intelligence",
    ],
    cta: "Contact Sales",
    premium: true,
    icon: Crown,
    color: "from-amber-500 to-amber-600",
  },
];

const features = [
  {
    icon: Users,
    title: "Complete Member Management",
    description: "Comprehensive tools for member onboarding, tracking, and engagement across all touchpoints.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time insights and reporting to optimize your business performance and drive growth.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level security with data encryption and compliance standards for peace of mind.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    description: "Access your gym management system anywhere, anytime with our responsive mobile platform.",
  },
  {
    icon: Globe,
    title: "Multi-Location Support",
    description: "Seamlessly manage multiple gym locations from a single, unified dashboard interface.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Get help when you need it with our dedicated customer success and technical support teams.",
  },
];

const trustIndicators = [
  { label: "No Setup Fees", icon: CheckCircle },
  { label: "30-Day Money Back Guarantee", icon: CheckCircle },
  { label: "Cancel Anytime", icon: CheckCircle },
  { label: "Free Data Migration", icon: CheckCircle },
];

export function GymBiosPricing() {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Hero Banner Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(0, 71, 171, 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(0, 150, 136, 0.1) 0%, transparent 50%)`
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center space-y-8">
            {/* Brand Header */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex items-center justify-center gap-3 mb-6"
            >
              <div className="bg-primary text-white rounded-2xl p-3 shadow-lg">
                <Dumbbell className="h-8 w-8" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-primary">GymBios</h1>
                <p className="text-sm text-gray-600">Business Operating System</p>
              </div>
            </motion.div>

            {/* Hero Title */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="space-y-4"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                GymBios <span className="text-primary">Pricing</span>
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Choose the plan that fits your <span className="text-primary font-semibold">growth journey</span>
              </p>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap justify-center gap-6 text-sm text-gray-600"
            >
              {trustIndicators.map((indicator, index) => {
                const IconComponent = indicator.icon;
                return (
                  <div key={index} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                    <IconComponent className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{indicator.label}</span>
                  </div>
                );
              })}
            </motion.div>

            {/* CTA Preview */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300">
                <Sparkles className="h-5 w-5 mr-2" />
                Start Free Trial
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg font-medium border-2 hover:bg-gray-50 transition-all duration-300">
                <Phone className="h-5 w-5 mr-2" />
                Schedule Demo
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Floating Elements */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 2, 0]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{ 
            y: [0, 15, 0],
            rotate: [0, -2, 0]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-xl"
        />
      </motion.div>

      {/* Pricing Cards Section */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {plans.map((plan, index) => {
              const IconComponent = plan.icon;
              const isHovered = hoveredPlan === plan.name;
              
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + index * 0.1, duration: 0.6 }}
                  onMouseEnter={() => setHoveredPlan(plan.name)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  whileHover={{ 
                    y: -8,
                    transition: { duration: 0.2 }
                  }}
                  className="relative"
                >
                  <Card 
                    className={`h-full border-2 transition-all duration-300 ${
                      plan.popular 
                        ? 'border-primary shadow-lg ring-4 ring-primary/20' 
                        : plan.premium 
                        ? 'border-amber-400 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 ring-4 ring-amber-400/20' 
                        : 'border-gray-200 hover:border-primary/50 hover:shadow-lg'
                    } ${isHovered ? 'shadow-2xl scale-105' : ''}`}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <Badge className="bg-primary text-white px-4 py-2 font-medium text-sm shadow-lg">
                          <Star className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    {/* Premium Badge */}
                    {plan.premium && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Premium
                        </div>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4 relative">
                      {/* Plan Icon */}
                      <motion.div 
                        animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg ${
                          plan.premium ? 'shadow-xl' : ''
                        }`}
                      >
                        <IconComponent className="h-8 w-8 text-white" />
                      </motion.div>

                      {/* Plan Details */}
                      <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                      <div className="text-2xl font-bold text-primary mb-2">{plan.price}</div>
                      <p className="text-sm font-medium text-gray-600 mb-2">{plan.tagline}</p>
                      <p className="text-sm text-muted-foreground">{plan.focus}</p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Features List */}
                      <div className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <motion.div
                            key={featureIndex}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.4 + index * 0.1 + featureIndex * 0.05, duration: 0.4 }}
                            className="flex items-start gap-3"
                          >
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="pt-4"
                      >
                        <Button 
                          className={`w-full py-6 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl ${
                            plan.popular 
                              ? 'bg-primary hover:bg-primary/90 text-white' 
                              : plan.premium
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                              : 'bg-gray-900 hover:bg-gray-800 text-white hover:bg-primary'
                          }`}
                        >
                          {plan.cta}
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="mt-32"
        >
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-6">Why Choose GymBios?</h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to run a successful fitness business, powered by cutting-edge technology and industry expertise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 + index * 0.1, duration: 0.6 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group"
                >
                  <Card className="h-full p-6 text-center border-2 border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                      className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${
                        index % 3 === 0 ? 'from-blue-500 to-blue-600' :
                        index % 3 === 1 ? 'from-green-500 to-green-600' :
                        'from-purple-500 to-purple-600'
                      } flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                    >
                      <IconComponent className="h-8 w-8 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">{feature.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.8 }}
          className="mt-24 text-center bg-gradient-to-r from-primary/5 to-accent/5 rounded-3xl p-12"
        >
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Questions? We're here to help</h3>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Our team of experts is ready to help you choose the right plan and get started with GymBios.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Button variant="outline" size="lg" className="flex items-center gap-2 px-6 py-3 border-2 hover:bg-white hover:shadow-md transition-all duration-300">
              <Phone className="h-5 w-5" />
              Call Sales: +971 525 135 865
            </Button>
            <Button variant="outline" size="lg" className="flex items-center gap-2 px-6 py-3 border-2 hover:bg-white hover:shadow-md transition-all duration-300">
              <Mail className="h-5 w-5" />
              sales@gymbios.com
            </Button>
            <Button variant="outline" size="lg" className="flex items-center gap-2 px-6 py-3 border-2 hover:bg-white hover:shadow-md transition-all duration-300">
              <MessageSquare className="h-5 w-5" />
              Live Chat
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

