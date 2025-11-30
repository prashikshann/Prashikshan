import React, { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // 1. SIGN UP
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          // 2. Create the Profile Row immediately
          // (We use Supabase directly here to ensure the row exists before they fill details)
          
         await supabase.from('profiles').insert([{ id: data.user.id, username: email.split('@')[0] }])

          // Redirect to Onboarding to fill details
          navigate('/onboarding');
        }
      } else {
        // 1. SIGN IN
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/'); // Go Home
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">PRASHISKSHAN</h1>
          <p className="text-muted-foreground">{isSignUp ? "Create Account" : "Welcome Back"}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button className="w-full" disabled={loading}>{loading ? "Processing..." : (isSignUp ? "Sign Up" : "Log In")}</Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an ID? " : "New here? "}
          <span className="cursor-pointer text-primary hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Log In" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Auth;