 import { useState, useRef } from "react";
 import { useNavigate } from "react-router-dom";
 import { useAuth } from "@/hooks/useAuth";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { Label } from "@/components/ui/label";
 import { toast } from "@/components/ui/sonner";
 import { 
   Camera, 
   Upload, 
   ArrowLeft, 
   Sparkles, 
   Leaf,
   Clock,
   Trash2,
   Palette
 } from "lucide-react";
 
 type Intent = "tidy" | "declutter" | "redesign";
 
 const Capture = () => {
   const navigate = useNavigate();
   const { user, loading: authLoading } = useAuth();
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const [intent, setIntent] = useState<Intent>("tidy");
   const [analyzing, setAnalyzing] = useState(false);
 
   if (authLoading) return null;
   if (!user) {
     navigate("/auth");
     return null;
   }
 
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onload = (e) => {
         setImagePreview(e.target?.result as string);
       };
       reader.readAsDataURL(file);
     }
   };
 
   const handleAnalyze = async () => {
     if (!imagePreview) {
       toast.error("Please capture or upload an image first");
       return;
     }
 
     setAnalyzing(true);
     
     try {
       // Call AI to analyze the room
       const response = await supabase.functions.invoke("analyze-room", {
         body: { imageUrl: imagePreview, intent }
       });
 
       if (response.error) {
         throw new Error(response.error.message || "Failed to analyze room");
       }
 
       const analysisResult = response.data;
 
       // Create room in database
       const { data: room, error: roomError } = await supabase
         .from("rooms")
         .insert({
           user_id: user.id,
           name: analysisResult.roomName || "My Space",
           before_image_url: imagePreview,
           intent,
           total_challenges: analysisResult.challenges?.length || 0,
         })
         .select()
         .single();
 
       if (roomError) throw roomError;
 
       // Create challenges
       if (analysisResult.challenges?.length > 0) {
         const challenges = analysisResult.challenges.map((challenge: any, index: number) => ({
           room_id: room.id,
           user_id: user.id,
           title: challenge.title,
           description: challenge.description,
           time_estimate_minutes: challenge.timeEstimate || 5,
           points: challenge.points || 10,
           sort_order: index,
         }));
 
         const { error: challengesError } = await supabase
           .from("challenges")
           .insert(challenges);
 
         if (challengesError) throw challengesError;
       }
 
       toast.success("Room analyzed! Let's start your challenges!");
       navigate(`/challenge/${room.id}`);
     } catch (error: any) {
       console.error("Analysis error:", error);
       toast.error(error.message || "Failed to analyze room. Please try again.");
     } finally {
       setAnalyzing(false);
     }
   };
 
   const intentOptions = [
     {
       value: "tidy" as Intent,
       label: "Tidy Up",
       description: "Put things back in their places",
       icon: Sparkles,
     },
     {
       value: "declutter" as Intent,
       label: "Declutter",
       description: "Remove items you don't need",
       icon: Trash2,
     },
     {
       value: "redesign" as Intent,
       label: "Redesign",
       description: "Reorganize for better flow",
       icon: Palette,
     },
   ];
 
   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
         <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
             <ArrowLeft className="w-5 h-5" />
           </Button>
           <div className="flex items-center gap-2">
             <Leaf className="w-5 h-5 text-primary" />
             <span className="font-semibold">Capture Space</span>
           </div>
         </div>
       </header>
 
       <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
         {/* Image Capture */}
         <Card className="border-0 shadow-sm overflow-hidden animate-fade-in">
           <CardContent className="p-0">
             {imagePreview ? (
               <div className="relative">
                 <img 
                   src={imagePreview} 
                   alt="Room preview" 
                   className="w-full aspect-[4/3] object-cover"
                 />
                 <Button
                   variant="secondary"
                   size="sm"
                   className="absolute bottom-4 right-4"
                   onClick={() => {
                     setImagePreview(null);
                     if (fileInputRef.current) fileInputRef.current.value = "";
                   }}
                 >
                   Retake
                 </Button>
               </div>
             ) : (
               <div 
                 className="w-full aspect-[4/3] bg-muted flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/80 transition-colors"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                   <Camera className="w-8 h-8 text-primary" />
                 </div>
                 <div className="text-center">
                   <p className="font-medium">Tap to capture</p>
                   <p className="text-sm text-muted-foreground">or upload a photo</p>
                 </div>
               </div>
             )}
             <input
               ref={fileInputRef}
               type="file"
               accept="image/*"
               capture="environment"
               className="hidden"
               onChange={handleFileChange}
             />
           </CardContent>
         </Card>
 
         {/* Intent Selection */}
         <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
           <h2 className="font-semibold">What would you like to do?</h2>
           <RadioGroup value={intent} onValueChange={(v) => setIntent(v as Intent)}>
             <div className="grid gap-3">
               {intentOptions.map((option) => (
                 <Card 
                   key={option.value}
                   className={`border-2 cursor-pointer transition-all ${
                     intent === option.value 
                       ? "border-primary bg-primary/5" 
                       : "border-transparent hover:border-border"
                   }`}
                   onClick={() => setIntent(option.value)}
                 >
                   <CardContent className="p-4 flex items-center gap-4">
                     <RadioGroupItem value={option.value} id={option.value} />
                     <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                       <option.icon className="w-5 h-5 text-primary" />
                     </div>
                     <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                       <p className="font-medium">{option.label}</p>
                       <p className="text-sm text-muted-foreground">{option.description}</p>
                     </Label>
                   </CardContent>
                 </Card>
               ))}
             </div>
           </RadioGroup>
         </div>
 
         {/* Analyze Button */}
         <Button
           className="w-full h-14 text-base font-medium animate-fade-in"
           style={{ animationDelay: "0.2s" }}
           disabled={!imagePreview || analyzing}
           onClick={handleAnalyze}
         >
           {analyzing ? (
             <span className="flex items-center gap-2">
               <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
               AI is analyzing your space...
             </span>
           ) : (
             <span className="flex items-center gap-2">
               <Sparkles className="w-5 h-5" />
               Create My Challenges
             </span>
           )}
         </Button>
 
         {/* Tip */}
         <Card className="border-0 shadow-sm bg-accent/20 animate-fade-in" style={{ animationDelay: "0.3s" }}>
           <CardContent className="p-4 flex items-center gap-3">
             <Clock className="w-5 h-5 text-accent-foreground shrink-0" />
             <p className="text-sm text-accent-foreground">
               <strong>Tip:</strong> Capture the whole space for better challenge suggestions!
             </p>
           </CardContent>
         </Card>
       </main>
     </div>
   );
 };
 
 export default Capture;