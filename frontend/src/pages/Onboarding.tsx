import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from "@/integrations/supabase/client"; 
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_URL = 'https://prashikshan-f.onrender.com/api';
//const API_URL = 'http://127.0.0.1:5000/api'; 

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    college: '',
    branch: '',
    graduation_year: '',
    skills: ''
  });

  // Get current user ID on load
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      else navigate('/login'); // Kick them out if not logged in
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send to Python Backend
      await axios.post(`${API_URL}/profile`, {
        user_id: userId,
        ...formData
      });
      
      // Success -> Go Home
      navigate('/');
    } catch (error) {
      console.error(error);
      alert("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold">Complete your Profile</h1>
          <p className="text-muted-foreground">Tell us about your academic journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input 
              placeholder="e.g. Rahul Sharma" 
              value={formData.full_name}
              onChange={e => setFormData({...formData, full_name: e.target.value})} 
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>College</Label>
              <Input 
                placeholder="e.g. IIT Bombay" 
                value={formData.college}
                onChange={e => setFormData({...formData, college: e.target.value})} 
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Graduation Year</Label>
              <Input 
                placeholder="e.g. 2026" 
                value={formData.graduation_year}
                onChange={e => setFormData({...formData, graduation_year: e.target.value})} 
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Branch / Stream</Label>
            <Input 
              placeholder="e.g. Computer Science" 
              value={formData.branch}
              onChange={e => setFormData({...formData, branch: e.target.value})} 
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Skills (Comma separated)</Label>
            <Input 
              placeholder="e.g. React, Python, Java" 
              value={formData.skills}
              onChange={e => setFormData({...formData, skills: e.target.value})} 
            />
          </div>

          <Button className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Get Started"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;