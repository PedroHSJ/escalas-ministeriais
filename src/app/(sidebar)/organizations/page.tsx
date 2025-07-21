"use client";
import { OrganizationWizard } from "@/components/wizard/OrganizationWizard";
import { supabase } from "@/lib/supabaseClient";
import { redirect, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

export default function Page(){

  const [userId, setUserId] = useState("");
      const fetchSession = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setUserId(data.session.user.id);
        } 
        // else {
        //  setUserId("d7e39c07-f7e4-4065-8e3a-aac5ccb02f1b"); // For testing purposes, using a static user ID    
        // }
      };
    
      useEffect(() => {
        fetchSession();
      }, []);

      const handleWizardComplete = () =>{

        toast.success("Organization created successfully!");
        redirect("/organizations/list");
      
    }

    return(
        <Suspense fallback={
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="bg-muted/50 aspect-video rounded-xl" />
                <div className="bg-muted/50 aspect-video rounded-xl" />
                <div className="bg-muted/50 aspect-video rounded-xl" />
                </div>
                <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
            </div>
            }>
        <OrganizationWizard 
         userId={userId} 
         onComplete={handleWizardComplete}
       />
        </Suspense>
    )
}