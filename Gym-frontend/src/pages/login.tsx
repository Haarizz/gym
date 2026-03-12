import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Separator } from "../components/ui/separator";
import {
  Eye,
  EyeOff,
  Dumbbell,
  Mail,
  Lock,
  AlertCircle,
  Chrome,
  Apple,
  ArrowRight,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface LoginProps {
  onLogin: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
}

export function Login({ onLogin }: LoginProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle input changes with validation
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear errors when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
        general: "",
      }));
    }
  };



  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setErrors({ email: "", password: "", general: "" });

    // Validation
    let hasErrors = false;
    const newErrors = { email: "", password: "", general: "" };

    if (!formData.email) {
      newErrors.email = "Email address is required";
      hasErrors = true;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      hasErrors = true;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      hasErrors = true;
    } else if (formData.password.length < 6) {
      newErrors.password =
        "Password must be at least 6 characters";
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Call the authentication service
      const result = await onLogin(
        formData.email,
        formData.password,
        formData.rememberMe,
      );

      if (result.success) {
        toast.success("Welcome back to GymBios!", {
          description:
            "Login successful. Redirecting to dashboard...",
          duration: 3000,
        });
      } else {
        setErrors({
          email: "",
          password: "",
          general: result.error || "Invalid email or password. Please try again.",
        });

        toast.error("Login failed", {
          description: result.error || "Invalid email or password. Please check your credentials and try again.",
          duration: 4000,
        });
      }
    } catch (error) {
      setErrors({
        email: "",
        password: "",
        general:
          "An error occurred during login. Please try again.",
      });

      toast.error("Login error", {
        description:
          "An unexpected error occurred. Please try again.",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle social login
  const handleSocialLogin = (provider: "google" | "apple") => {
    toast.info(
      `${provider === "google" ? "Google" : "Apple"} Login`,
      {
        description: "Social login integration coming soon!",
        duration: 3000,
      },
    );
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    toast.info("Forgot Password", {
      description: "Password reset functionality coming soon!",
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-primary relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:50px_50px]"></div>
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/10 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-24 h-24 rounded-full bg-white/15 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full bg-white/20 animate-pulse delay-500"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 py-12 text-white">
          <div className="max-w-md">
            {/* Logo */}
            <div className="flex items-center space-x-4 mb-8">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                <Dumbbell className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">GymBios</h1>
                <p className="text-xl text-white/80">
                  Business Operating System
                </p>
              </div>
            </div>

            {/* Welcome Message */}
            <h2 className="text-3xl font-bold mb-4">
              Welcome back to the future of wellness services
              industry
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Streamline your fitness business with our
              comprehensive management platform designed for
              modern wellness services.
            </p>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-lg">
                  Secure & reliable platform
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <span className="text-lg">
                  Complete business management
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-2">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <span className="text-lg">
                  Real-time analytics & insights
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gymbios-main-bg px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="bg-gradient-primary rounded-2xl p-3 shadow-lg">
              <Dumbbell className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                GymBios
              </h1>
              <p className="text-sm text-muted-foreground">
                Business Operating System
              </p>
            </div>
          </div>

          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl text-center text-gray-900">
                Welcome back!
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                Please login to continue to your dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* General Error Alert */}
              {errors.general && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {errors.general}
                  </AlertDescription>
                </Alert>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Email Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-gray-700"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange(
                          "email",
                          e.target.value,
                        )
                      }
                      className={`pl-12 h-12 bg-white border-gray-200 focus:border-transparent focus:ring-2 focus:ring-primary transition-all ${
                        errors.email
                          ? "border-red-300 focus:border-red-500"
                          : ""
                      }`}
                      disabled={isLoading}
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-gray-700"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange(
                          "password",
                          e.target.value,
                        )
                      }
                      className={`pl-12 pr-12 h-12 bg-white border-gray-200 focus:border-transparent focus:ring-2 focus:ring-primary transition-all ${
                        errors.password
                          ? "border-red-300 focus:border-red-500"
                          : ""
                      }`}
                      disabled={isLoading}
                    />
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          rememberMe: checked as boolean,
                        }))
                      }
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm text-gray-600 cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleForgotPassword}
                    className="text-primary hover:text-primary/80 p-0 h-auto"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full h-12 btn-primary font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Social Login */}
              <div className="space-y-4">
                <div className="relative">
                  <Separator />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-4 text-sm text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin("google")}
                    className="h-11 border-gray-200 hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    <Chrome className="h-5 w-5 mr-2" />
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin("apple")}
                    className="h-11 border-gray-200 hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    <Apple className="h-5 w-5 mr-2" />
                    Apple
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0">
              <p className="text-center text-sm text-gray-600 w-full">
                New to GymBios?{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                >
                  Request a demo
                </Button>
              </p>
            </CardFooter>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>© 2024 GymBios. All rights reserved.</p>
            <div className="flex justify-center space-x-4 mt-2">
              <Button
                variant="link"
                size="sm"
                className="text-gray-500 hover:text-gray-700 p-0 h-auto"
              >
                Privacy Policy
              </Button>
              <Button
                variant="link"
                size="sm"
                className="text-gray-500 hover:text-gray-700 p-0 h-auto"
              >
                Terms of Service
              </Button>
              <Button
                variant="link"
                size="sm"
                className="text-gray-500 hover:text-gray-700 p-0 h-auto"
              >
                Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

