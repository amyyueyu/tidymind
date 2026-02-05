 import { useState, useEffect, useCallback } from "react";
 import { useNavigate, useParams } from "react-router-dom";
 import { useAuth } from "@/hooks/useAuth";
 import { useProfile } from "@/hooks/useProfile";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Progress } from "@/components/ui/progress";
 import { Badge } from "@/components/ui/badge";
 import { toast } from "@/components/ui/sonner";
 import { 
   ArrowLeft, 
   Leaf,
   Play,
   Pause,
   Check,
   SkipForward,
   Star,
   Clock,
   Trophy,
   Sparkles,
  Eye,
  CheckCircle2,
  Circle,
  FastForward
 } from "lucide-react";
 import VisionComparison from "@/components/VisionComparison";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
 
 interface Challenge {
   id: string;
   title: string;
   description: string | null;
   time_estimate_minutes: number;
   points: number;
   status: string;
   sort_order: number;
 }
 
 interface Room {
   id: string;
   name: string;
   before_image_url: string;
   after_image_url: string | null;
   intent: string;
   total_challenges: number;
   completed_challenges: number;
   status: string;
 }
 
 const ChallengePage = () => {
   const { roomId } = useParams<{ roomId: string }>();
   const navigate = useNavigate();
   const { user, loading: authLoading } = useAuth();
   const { addPoints } = useProfile();
   
   const [room, setRoom] = useState<Room | null>(null);
   const [challenges, setChallenges] = useState<Challenge[]>([]);
   const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
   const [timerActive, setTimerActive] = useState(false);
   const [timeRemaining, setTimeRemaining] = useState(0);
   const [loading, setLoading] = useState(true);
   const [showVision, setShowVision] = useState(false);
 
   useEffect(() => {
     if (!authLoading && !user) {
       navigate("/auth");
     }
   }, [user, authLoading, navigate]);
 
   useEffect(() => {
     if (roomId && user) {
       fetchRoomData();
     }
   }, [roomId, user]);
 
   // Timer effect
   useEffect(() => {
     let interval: NodeJS.Timeout;
     if (timerActive && timeRemaining > 0) {
       interval = setInterval(() => {
         setTimeRemaining((prev) => prev - 1);
       }, 1000);
     } else if (timeRemaining === 0 && timerActive) {
       setTimerActive(false);
       toast("⏰ Time's up! How did it go?");
     }
     return () => clearInterval(interval);
   }, [timerActive, timeRemaining]);
 
   const fetchRoomData = async () => {
     setLoading(true);
     
     const { data: roomData, error: roomError } = await supabase
       .from("rooms")
       .select("*")
       .eq("id", roomId)
       .single();
 
     if (roomError) {
       toast.error("Room not found");
       navigate("/");
       return;
     }
 
     setRoom(roomData);
 
     const { data: challengeData } = await supabase
       .from("challenges")
       .select("*")
       .eq("room_id", roomId)
       .order("sort_order", { ascending: true });
 
     if (challengeData) {
       setChallenges(challengeData);
       // Find first incomplete challenge
       const firstIncomplete = challengeData.findIndex(c => c.status !== "completed");
        const initialIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
        setCurrentChallengeIndex(initialIndex);
       
       // Set timer for current challenge
        if (challengeData[initialIndex]) {
          setTimeRemaining(challengeData[initialIndex].time_estimate_minutes * 60);
       }
     }
 
     setLoading(false);
   };
 
   const currentChallenge = challenges[currentChallengeIndex];
   const completedCount = challenges.filter(c => c.status === "completed").length;
   const progressPercent = (completedCount / challenges.length) * 100;
 
   const formatTime = (seconds: number) => {
     const mins = Math.floor(seconds / 60);
     const secs = seconds % 60;
     return `${mins}:${secs.toString().padStart(2, "0")}`;
   };
 
   const startTimer = () => {
     if (currentChallenge) {
       setTimeRemaining(currentChallenge.time_estimate_minutes * 60);
       setTimerActive(true);
     }
   };
 
   const completeChallenge = async () => {
     if (!currentChallenge || !room) return;
 
     setTimerActive(false);
 
     // Update challenge status
     await supabase
       .from("challenges")
       .update({ status: "completed", completed_at: new Date().toISOString() })
       .eq("id", currentChallenge.id);
 
     // Add points
     await addPoints(currentChallenge.points);
 
     // Update room completed count
     const newCompletedCount = completedCount + 1;
     await supabase
       .from("rooms")
       .update({ 
         completed_challenges: newCompletedCount,
         ...(newCompletedCount === challenges.length ? { 
           status: "completed",
           completed_at: new Date().toISOString()
         } : {})
       })
       .eq("id", room.id);
 
     toast.success(`+${currentChallenge.points} points! 🎉`);
 
     // Move to next challenge or show completion
     if (currentChallengeIndex < challenges.length - 1) {
       const nextIndex = currentChallengeIndex + 1;
       setCurrentChallengeIndex(nextIndex);
       setTimeRemaining(challenges[nextIndex].time_estimate_minutes * 60);
       
       setChallenges(prev => 
         prev.map((c, i) => i === currentChallengeIndex ? { ...c, status: "completed" } : c)
       );
     } else {
       // All challenges complete!
       toast.success("🏆 Amazing! You've completed all challenges!");
       setChallenges(prev => 
         prev.map((c, i) => i === currentChallengeIndex ? { ...c, status: "completed" } : c)
       );
     }
   };
 
   const skipChallenge = async () => {
     if (!currentChallenge) return;
 
     setTimerActive(false);
 
     await supabase
       .from("challenges")
       .update({ status: "skipped" })
       .eq("id", currentChallenge.id);
 
     if (currentChallengeIndex < challenges.length - 1) {
       const nextIndex = currentChallengeIndex + 1;
       setCurrentChallengeIndex(nextIndex);
       setTimeRemaining(challenges[nextIndex].time_estimate_minutes * 60);
       
       setChallenges(prev => 
         prev.map((c, i) => i === currentChallengeIndex ? { ...c, status: "skipped" } : c)
       );
     }
 
     toast("Challenge skipped. No worries, you can come back to it!");
   };
 
  const selectChallenge = (index: number) => {
    const challenge = challenges[index];
    if (challenge.status === "completed") return; // Don't allow selecting completed challenges
    
    setTimerActive(false);
    setCurrentChallengeIndex(index);
    setTimeRemaining(challenge.time_estimate_minutes * 60);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case "skipped":
        return <FastForward className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

   if (loading || authLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="text-center">
           <Leaf className="w-12 h-12 text-primary mx-auto animate-gentle-bounce" />
           <p className="mt-4 text-muted-foreground">Loading challenges...</p>
         </div>
       </div>
     );
   }
 
   if (!room || !currentChallenge) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="text-center">
           <Trophy className="w-16 h-16 text-accent mx-auto mb-4" />
           <h2 className="text-2xl font-bold mb-2">All Done! 🎉</h2>
           <p className="text-muted-foreground mb-6">You've completed all challenges for this space!</p>
           <Button onClick={() => navigate("/")}>Back to Home</Button>
         </div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Header */}
       <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
         <div className="container max-w-2xl mx-auto px-4 py-4">
           <div className="flex items-center gap-3 mb-3">
             <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
               <ArrowLeft className="w-5 h-5" />
             </Button>
             <div className="flex-1">
               <p className="font-semibold truncate">{room.name}</p>
               <p className="text-xs text-muted-foreground">
                 Challenge {currentChallengeIndex + 1} of {challenges.length}
               </p>
             </div>
             <Badge variant="secondary" className="shrink-0">
               <Star className="w-3 h-3 mr-1" />
               {currentChallenge.points} pts
             </Badge>
           </div>
           <Progress value={progressPercent} className="h-2" />
         </div>
       </header>
 
       {/* Main Content */}
       <main className="flex-1 container max-w-2xl mx-auto px-4 py-6 flex flex-col">
         {/* Vision Toggle */}
         {room.after_image_url && (
           <Button
             variant="outline"
             className="mb-4 gap-2 animate-fade-in"
             onClick={() => setShowVision(!showVision)}
           >
             <Eye className="w-4 h-4" />
             {showVision ? "Hide Vision" : "See Your Vision"}
           </Button>
         )}
 
         {/* Vision Comparison */}
         {showVision && room.after_image_url && (
           <div className="mb-6 animate-scale-in">
             <VisionComparison
               beforeImage={room.before_image_url}
               afterImage={room.after_image_url}
             />
           </div>
         )}
 
          {/* Challenge List */}
          <Card className="border-0 shadow-sm mb-4 animate-fade-in">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-2 px-1">Select a task to work on:</p>
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {challenges.map((challenge, index) => (
                    <button
                      key={challenge.id}
                      onClick={() => selectChallenge(index)}
                      disabled={challenge.status === "completed"}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        index === currentChallengeIndex && challenge.status !== "completed"
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50",
                        challenge.status === "completed" && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {getStatusIcon(challenge.status)}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          challenge.status === "completed" && "line-through"
                        )}>
                          {challenge.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ~{challenge.time_estimate_minutes} min · {challenge.points} pts
                        </p>
                      </div>
                      {index === currentChallengeIndex && challenge.status !== "completed" && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          Active
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
 
          {/* Selected Challenge Details + Timer */}
          {currentChallenge && currentChallenge.status !== "completed" && (
            <>
              <Card className="border-0 shadow-lg mb-4 animate-scale-in">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold mb-2">{currentChallenge.title}</h2>
                      {currentChallenge.description && (
                        <p className="text-sm text-muted-foreground">{currentChallenge.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <Star className="w-3 h-3 mr-1" />
                      {currentChallenge.points} pts
                    </Badge>
                  </div>
                  
                  {/* Timer */}
                  <div className="text-center pt-4 border-t border-border">
                    <div className={cn(
                      "text-5xl font-bold mb-3",
                      timerActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {formatTime(timeRemaining)}
                    </div>
                    <div className="flex justify-center gap-3">
                      {!timerActive ? (
                        <Button onClick={startTimer} size="lg" className="gap-2">
                          <Play className="w-5 h-5" />
                          Start Timer
                        </Button>
                      ) : (
                        <Button onClick={() => setTimerActive(false)} variant="outline" size="lg" className="gap-2">
                          <Pause className="w-5 h-5" />
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
 
              {/* Encouragement */}
              <Card className="border-0 shadow-sm bg-accent/20 mb-4 animate-fade-in">
                <CardContent className="p-4 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-accent-foreground shrink-0" />
                  <p className="text-sm text-accent-foreground">
                    Focus on this one thing. You've got this! 💪
                  </p>
                </CardContent>
              </Card>
 
              {/* Action Buttons */}
              <div className="flex gap-3 animate-fade-in">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14"
                  onClick={skipChallenge}
                >
                  <SkipForward className="w-5 h-5 mr-2" />
                  Skip
                </Button>
                <Button 
                  className="flex-[2] h-14 text-base"
                  onClick={completeChallenge}
                >
                  <Check className="w-5 h-5 mr-2" />
                  Done!
                </Button>
              </div>
            </>
          )}
       </main>
     </div>
   );
 };
 
 export default ChallengePage;