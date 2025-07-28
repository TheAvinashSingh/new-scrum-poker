import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Copy, Play, Eye, RotateCcw, LogOut, Clock, Coffee, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";

const CARD_VALUES = [1, 2, 3, 5, 8, 13, 21, 34, "coffee", "?"] as const;

export default function Session() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isConnected, sessionData, joinSession, startVote, submitVote, revealVotes, resetVotes, removeParticipant, leaveSession: wsLeaveSession } = useWebSocket();
  
  const [sessionId, setSessionId] = useState<string>("");
  const [participantId, setParticipantId] = useState<string>("");
  const [participantName, setParticipantName] = useState("");
  const [voteLabel, setVoteLabel] = useState("");
  const [selectedCard, setSelectedCard] = useState<number | "coffee" | "?" | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Extract session ID from URL
  useEffect(() => {
    const path = window.location.pathname;
    const matches = path.match(/\/session\/([^/?]+)/);
    if (matches) {
      const id = matches[1];
      setSessionId(id);
      
      // Check if participant ID is in URL params
      const urlParams = new URLSearchParams(window.location.search);
      const pId = urlParams.get('participantId');
      if (pId) {
        setParticipantId(pId);
      } else {
        setIsJoinModalOpen(true);
      }
    }
  }, []);

  // Fetch initial session data
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['/api/sessions', sessionId],
    enabled: !!sessionId,
  });

  // Auto-join WebSocket for hosts with participant ID
  useEffect(() => {
    if (sessionId && participantId && isConnected && initialData?.participants) {
      const participant = initialData.participants.find((p: any) => p.id === participantId);
      if (participant && !sessionData) {
        joinSession(sessionId, participant.name, participantId);
      }
    }
  }, [sessionId, participantId, isConnected, initialData, sessionData, joinSession]);

  // Join session when participant name is provided
  const handleJoinSession = () => {
    if (!participantName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join the session",
        variant: "destructive",
      });
      return;
    }

    joinSession(sessionId, participantName);
    setIsJoinModalOpen(false);
  };

  // Update participant ID when session data changes
  useEffect(() => {
    if (sessionData && participantName && !participantId) {
      const participant = sessionData.participants.find(p => p.name === participantName);
      if (participant) {
        setParticipantId(participant.id);
      }
    }
  }, [sessionData, participantName, participantId]);

  const currentSession = sessionData?.session || initialData?.session;
  const participants = sessionData?.participants || initialData?.participants || [];
  const votes = sessionData?.votes || initialData?.votes || [];
  const voteHistory = sessionData?.voteHistory || initialData?.voteHistory || [];

  const currentParticipant = participants.find(p => p.id === participantId);
  const isHost = currentParticipant?.isHost || false;

  const handleStartVote = () => {
    if (!voteLabel.trim()) {
      toast({
        title: "Label Required",
        description: "Please enter a description for this vote",
        variant: "destructive",
      });
      return;
    }
    startVote(sessionId, voteLabel);
  };

  const handleCardSelect = (value: number | "coffee" | "?") => {
    setSelectedCard(value);
    if (participantId) {
      submitVote(sessionId, participantId, value);
    }
  };

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/session/${sessionId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL Copied",
      description: "Session URL has been copied to clipboard",
    });
  };

  const handleLeaveSession = () => {
    if (participantId && sessionId) {
      if (isHost) {
        // Host ending session - show confirmation
        const confirmEnd = window.confirm("Are you sure you want to end this session? All participants will be disconnected.");
        if (!confirmEnd) return;
      }
      wsLeaveSession(sessionId, participantId);
    }
    navigate("/");
  };

  const handleRemoveParticipant = (participantIdToRemove: string) => {
    if (isHost && sessionId) {
      removeParticipant(sessionId, participantIdToRemove);
    }
  };

  const calculateStats = () => {
    if (!votes.length) return { average: 0, voted: 0, total: participants.length, range: "0-0" };

    const numericVotes = votes.filter(v => typeof v.voteValue === 'number').map(v => v.voteValue as number);
    const average = numericVotes.length > 0 ? numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length : 0;
    const range = numericVotes.length > 0 ? `${Math.min(...numericVotes)}-${Math.max(...numericVotes)}` : "0-0";
    const coffeeCount = votes.filter(v => v.voteValue === "coffee").length;

    return {
      average: Math.round(average * 10) / 10,
      voted: votes.length,
      total: participants.length,
      range,
      coffeeCount,
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Session Not Found</h2>
          <Button onClick={() => navigate("/")} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Session Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-slate-100 px-3 py-1 rounded-lg">
                <span className="text-sm text-slate-600">Session URL:</span>
                <span className="font-mono text-sm font-semibold text-primary ml-2">
                  {window.location.origin}/session/{sessionId}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="ml-2 h-auto p-1"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-accent bg-opacity-10 px-3 py-1 rounded-lg">
                <span className="text-sm text-accent font-medium">
                  {participants.length} Participants
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLeaveSession}
              className="text-slate-600 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isHost ? "End Session" : "Leave Session"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Voting Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Voting Controls */}
            {isHost && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Host Controls</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-sm rounded-full ${
                      currentSession.currentVote 
                        ? "bg-green-100 text-green-800" 
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      <div className="w-2 h-2 rounded-full bg-current inline-block mr-1"></div>
                      {currentSession.currentVote ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="voteLabel" className="block text-sm font-medium text-slate-700 mb-2">
                      Story/Task Description
                    </Label>
                    <Input
                      id="voteLabel"
                      type="text"
                      placeholder="e.g., Story #12: User Login Feature"
                      value={voteLabel}
                      onChange={(e) => setVoteLabel(e.target.value)}
                      disabled={!!currentSession.currentVote}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleStartVote}
                      disabled={!!currentSession.currentVote}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Voting
                    </Button>
                    <Button
                      onClick={() => revealVotes(sessionId)}
                      disabled={!currentSession.currentVote || currentSession.currentVote.isRevealed}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Show Votes
                    </Button>
                    <Button
                      onClick={() => resetVotes(sessionId)}
                      disabled={!currentSession.currentVote}
                      variant="secondary"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Votes
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Current Vote Display */}
            {currentSession.currentVote && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Current Vote: {currentSession.currentVote.label}
                </h3>
                
                {/* Voting Results Summary */}
                {currentSession.currentVote.isRevealed && (
                  <div className="mb-6 pt-6 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-3">Voting Results</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.average}</div>
                        <div className="text-sm text-blue-600">Average</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.voted}/{stats.total}</div>
                        <div className="text-sm text-green-600">Voted</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.range}</div>
                        <div className="text-sm text-purple-600">Range</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.coffeeCount}</div>
                        <div className="text-sm text-orange-600">Coffee</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Participants Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Participants</h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {participants.map((participant) => {
                  const participantVote = votes.find(v => v.participantId === participant.id);
                  const hasVoted = !!participantVote;
                  const isRevealed = currentSession.currentVote?.isRevealed || false;

                  return (
                    <div
                      key={participant.id}
                      className="bg-slate-50 rounded-lg p-4 text-center border-2 border-transparent hover:border-accent transition-all relative"
                    >
                      {/* Remove button for hosts */}
                      {isHost && !participant.isHost && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="absolute top-2 right-2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        participant.isHost ? "bg-primary" : "bg-slate-400"
                      }`}>
                        <span className="text-white font-semibold">
                          {participant.name.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="font-medium text-slate-900">{participant.name}</div>
                      <div className="text-sm text-slate-600">
                        {participant.isHost ? "Host" : "Member"}
                      </div>
                      <div className="mt-2">
                        <div className={`w-16 h-20 rounded-lg mx-auto flex items-center justify-center shadow-sm ${
                          hasVoted
                            ? isRevealed
                              ? "bg-accent text-white"
                              : "bg-slate-300"
                            : "bg-slate-200"
                        }`}>
                          {hasVoted ? (
                            isRevealed ? (
                              participantVote.voteValue === "coffee" ? (
                                <Coffee className="text-white text-lg" />
                              ) : (
                                <span className="text-white font-bold text-lg">
                                  {participantVote.voteValue}
                                </span>
                              )
                            ) : (
                              <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                            )
                          ) : (
                            <Clock className="text-slate-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card Selection */}
            {currentSession.currentVote && !currentSession.currentVote.isRevealed && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Your Estimate</h3>
                <div className="flex flex-wrap gap-3">
                  {CARD_VALUES.map((value) => (
                    <Button
                      key={value}
                      onClick={() => handleCardSelect(value)}
                      variant={selectedCard === value ? "default" : "outline"}
                      className={`w-16 h-20 text-lg font-bold ${
                        selectedCard === value
                          ? "bg-accent hover:bg-accent/90 text-white border-accent"
                          : "hover:border-accent hover:bg-accent hover:text-white"
                      }`}
                    >
                      {value === "coffee" ? <Coffee className="h-5 w-5" /> : value}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - History */}
          <div className="lg:col-span-1 space-y-6">
            {/* Vote History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Vote History</h3>
              <div className="space-y-4">
                {voteHistory.length === 0 ? (
                  <p className="text-slate-500 text-sm">No vote history yet</p>
                ) : (
                  voteHistory.map((history) => (
                    <div key={history.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="font-medium text-slate-900 text-sm mb-2">
                        {history.label}
                      </div>
                      <div className="text-xs text-slate-600 mb-2">
                        {new Date(history.completedAt).toLocaleString()}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Average:</span>
                        <span className="font-semibold text-accent">
                          {history.average?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {history.votes.length} participants
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Join Session Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => navigate("/")}
        title="Join Session"
        description="Enter your name to join this Scrum Poker session"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="participantName" className="block text-sm font-medium text-slate-700 mb-2">
              Your Name
            </Label>
            <Input
              id="participantName"
              type="text"
              placeholder="Enter your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoinSession}
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              Join Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
