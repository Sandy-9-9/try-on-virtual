import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);

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
          <form className="space-y-4">
            {isSignUp && (
              <Input
                type="text"
                placeholder="Full Name"
                className="h-12 bg-muted border-0 rounded-lg"
              />
            )}
            <Input
              type="email"
              placeholder="Email Address"
              className="h-12 bg-muted border-0 rounded-lg"
            />
            <Input
              type="password"
              placeholder="Password"
              className="h-12 bg-muted border-0 rounded-lg"
            />

            {!isSignUp && (
              <Link
                to="#"
                className="block text-center text-sm text-purple hover:underline"
              >
                Forgot your password?
              </Link>
            )}

            <Button className="w-full h-12 bg-purple hover:bg-purple/90 text-primary-foreground rounded-full font-semibold">
              {isSignUp ? "SIGN UP" : "SIGN IN"}
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
