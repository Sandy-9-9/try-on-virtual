import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/";

  // Redirect if already logged in
  if (user) {
    navigate(from);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        toast.error(emailResult.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Validate password
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        toast.error(passwordResult.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created successfully!");
          navigate(from);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password. Please try again.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back!");
          navigate(from);
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-4xl bg-background rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Form Section */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>

          {/* Social Login */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              f
            </button>
            <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              G
            </button>
            <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              in
            </button>
          </div>

          <p className="text-center text-muted-foreground text-sm mb-6">
            or use your account
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12 bg-muted border-0 rounded-lg"
              />
            )}
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-muted border-0 rounded-lg"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-muted border-0 rounded-lg"
              required
            />

            {!isSignUp && (
              <Link
                to="#"
                className="block text-center text-sm text-purple hover:underline"
              >
                Forgot your password?
              </Link>
            )}

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-purple hover:bg-purple/90 text-primary-foreground rounded-full font-semibold"
            >
              {loading ? "Please wait..." : isSignUp ? "SIGN UP" : "SIGN IN"}
            </Button>
          </form>
        </div>

        {/* Purple Panel */}
        <div className="flex-1 bg-gradient-purple p-8 md:p-12 flex flex-col items-center justify-center text-center text-primary-foreground">
          <h3 className="text-3xl font-bold mb-4">
            {isSignUp ? "Welcome Back!" : "Hey There!"}
          </h3>
          <p className="mb-8 text-primary-foreground/90 max-w-xs">
            {isSignUp
              ? "Stay connected by logging in with your credentials and continue your experience"
              : "Begin your amazing journey by creating an account with us today"}
          </p>
          <Button
            variant="outline"
            onClick={() => setIsSignUp(!isSignUp)}
            className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-purple rounded-full px-8"
          >
            {isSignUp ? "SIGN IN" : "SIGN UP"}
          </Button>
        </div>
      </div>

      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-4 left-4 text-foreground hover:text-primary transition-colors"
      >
        ← Back to Home
      </Link>
    </div>
  );
};

export default Login;
