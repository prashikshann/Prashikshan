import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Use the same fix here to avoid red lines!
      const { data } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (data) {
        setRole(data.role);
      }
    } catch (error) {
      console.error("Role check failed", error);
    } finally {
      setLoading(false);
    }
  };

  return { 
    role, 
    isTeacher: role === 'faculty', 
    isStudent: role === 'student' || role === null, // Default to student
    loading 
  };
};