import { useEffect, useRef, useState } from "react";
import { socketManager } from "@/lib/socket";
import { type WSMessage, type Session, type Participant, type Vote, type VoteHistory } from "@shared/schema";

interface SessionData {
  session: Session;
  participants: Participant[];
  votes: Vote[];
  voteHistory: VoteHistory[];
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        await socketManager.connect();
        setIsConnected(true);

        socketManager.on('session_update', (data: SessionData) => {
          setSessionData(data);
        });

        socketManager.on('error', (error: any) => {
          console.error('WebSocket error:', error);
        });

        socketManager.on('session_ended', (message: string) => {
          console.log('Session ended:', message);
          // Show toast and redirect to home page when session ends
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        });

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
      }
    };

    init();

    return () => {
      socketManager.disconnect();
      setIsConnected(false);
    };
  }, []);

  const sendMessage = (message: WSMessage) => {
    if (isConnected) {
      socketManager.send(message);
    }
  };

  const joinSession = (sessionId: string, participantName: string, participantId?: string) => {
    sendMessage({
      type: 'join_session',
      data: { sessionId, participantName, participantId }
    });
  };

  const leaveSession = (sessionId: string, participantId: string) => {
    sendMessage({
      type: 'leave_session',
      data: { sessionId, participantId }
    });
  };

  const startVote = (sessionId: string, label: string) => {
    sendMessage({
      type: 'start_vote',
      data: { sessionId, label }
    });
  };

  const submitVote = (sessionId: string, participantId: string, voteValue: number | "coffee" | "?") => {
    sendMessage({
      type: 'submit_vote',
      data: { sessionId, participantId, voteValue }
    });
  };

  const revealVotes = (sessionId: string) => {
    sendMessage({
      type: 'reveal_votes',
      data: { sessionId }
    });
  };

  const resetVotes = (sessionId: string) => {
    sendMessage({
      type: 'reset_votes',
      data: { sessionId }
    });
  };

  const removeParticipant = (sessionId: string, participantId: string) => {
    sendMessage({
      type: 'remove_participant',
      data: { sessionId, participantId }
    });
  };

  return {
    isConnected,
    sessionData,
    joinSession,
    leaveSession,
    startVote,
    submitVote,
    revealVotes,
    resetVotes,
    removeParticipant,
  };
}
