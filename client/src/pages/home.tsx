import { useState } from "react";
import { useLocation } from "wouter";
import { Crown, Users, UserPlus, ClipboardPen, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [hostForm, setHostForm] = useState({
    pin: "",
    hostName: "",
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { pin: string; hostName: string }) => {
      const response = await apiRequest("POST", "/api/sessions", {
        pin: data.pin,
        hostId: "",
        isActive: true,
        hostName: data.hostName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Session Created",
        description: "Your Scrum Poker session is ready!",
      });
      navigate(`/session/${data.session.id}?participantId=${data.hostId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    },
  });

  const joinSessionMutation = useMutation({
    mutationFn: async (pin: string) => {
      const response = await apiRequest("POST", "/api/sessions/join", { pin });
      return response.json();
    },
    onSuccess: (data) => {
      navigate(`/session/${data.sessionId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Session Code",
        description: "The entered 4-digit code is invalid or the session doesn't exist. Please check the code and try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSession = () => {
    if (!hostForm.pin || hostForm.pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN",
        variant: "destructive",
      });
      return;
    }
    if (!hostForm.hostName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    createSessionMutation.mutate(hostForm);
  };

  const handleJoinSession = () => {
    if (!joinCode || joinCode.length !== 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 4-digit session code",
        variant: "destructive",
      });
      return;
    }

    joinSessionMutation.mutate(joinCode);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Crown className="h-8 w-8 text-primary mr-3" />
                <h1 className="text-xl font-bold text-primary">Scrum Poker</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Agile Estimation Made Simple
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Facilitate your sprint planning with interactive Scrum Poker sessions.
            Get your team aligned on story point estimates quickly and efficiently.
          </p>
        </div>

        {/* How it Works Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
          <h3 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
            How Scrum Poker Works
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="text-white text-lg" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">1. Create or Join</h4>
              <p className="text-slate-600">
                Host a new session or join existing one with a 4-digit code
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardPen className="text-white text-lg" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">2. Vote Privately</h4>
              <p className="text-slate-600">
                Select your estimation cards without seeing others' votes
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="text-white text-lg" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">3. Reveal Together</h4>
              <p className="text-slate-600">
                Reveal all votes simultaneously and discuss the results
              </p>
            </div>
          </div>
        </div>

        {/* Main CTAs */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Host Session Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Host a Session</h3>
              <p className="text-slate-600">
                Create a new estimation session for your team
              </p>
            </div>
            <Button 
              onClick={() => setIsHostModalOpen(true)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6"
              size="lg"
            >
              Start New Session
            </Button>
          </div>

          {/* Join Session Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Join a Session</h3>
              <p className="text-slate-600">
                Enter a 4-digit session code to participate
              </p>
            </div>
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Enter 4-digit code"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="text-center text-lg font-mono tracking-widest"
              />
              <Button 
                onClick={handleJoinSession}
                disabled={joinSessionMutation.isPending}
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6"
                size="lg"
              >
                {joinSessionMutation.isPending ? "Joining..." : "Join Session"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Host Setup Modal */}
      <Modal
        isOpen={isHostModalOpen}
        onClose={() => setIsHostModalOpen(false)}
        title="Create New Session"
        description="Set up your Scrum Poker session"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="pin" className="block text-sm font-medium text-slate-700 mb-2">
              Session PIN (4 digits)
            </Label>
            <Input
              id="pin"
              type="text"
              placeholder="1234"
              maxLength={4}
              value={hostForm.pin}
              onChange={(e) => setHostForm(prev => ({ 
                ...prev, 
                pin: e.target.value.replace(/\D/g, "").slice(0, 4) 
              }))}
              className="text-center text-lg font-mono tracking-widest"
            />
          </div>
          <div>
            <Label htmlFor="hostName" className="block text-sm font-medium text-slate-700 mb-2">
              Your Name
            </Label>
            <Input
              id="hostName"
              type="text"
              placeholder="Enter your name"
              value={hostForm.hostName}
              onChange={(e) => setHostForm(prev => ({ ...prev, hostName: e.target.value }))}
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsHostModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {createSessionMutation.isPending ? "Creating..." : "Create Session"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
