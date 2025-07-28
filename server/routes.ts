import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertSessionSchema, insertParticipantSchema, insertVoteSchema, wsMessageSchema, type WSMessage, type Vote } from "@shared/schema";
import { z } from "zod";

interface ExtendedWebSocket extends WebSocket {
  sessionId?: string;
  participantId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, ExtendedWebSocket>();

  // REST API routes
  app.post("/api/sessions", async (req, res) => {
    try {
      const data = insertSessionSchema.parse(req.body);
      
      // Check if PIN already exists
      const existingSession = await storage.getSessionByPin(data.pin);
      if (existingSession) {
        return res.status(400).json({ message: "Session PIN already exists" });
      }
      
      const session = await storage.createSession(data);
      
      // Add host as participant
      const host = await storage.addParticipant({
        sessionId: session.id,
        name: req.body.hostName || "Host",
        isHost: true,
        isConnected: false,
      });
      
      res.json({ session, hostId: host.id });
    } catch (error) {
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const participants = await storage.getParticipantsBySession(session.id);
      const voteHistory = await storage.getVoteHistory(session.id);
      
      let votes: Vote[] = [];
      if (session.currentVote) {
        votes = await storage.getVotesBySession(session.id, session.currentVote.label);
      }
      
      res.json({ session, participants, votes, voteHistory });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/sessions/join", async (req, res) => {
    try {
      const { pin } = req.body;
      const session = await storage.getSessionByPin(pin);
      
      if (!session || !session.isActive) {
        return res.status(404).json({ message: "Session not found or inactive" });
      }
      
      res.json({ sessionId: session.id });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // WebSocket connection handling
  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('New WebSocket connection');

    ws.on('message', async (message: Buffer) => {
      try {
        const parsedMessage = JSON.parse(message.toString()) as WSMessage;
        const validatedMessage = wsMessageSchema.parse(parsedMessage);

        switch (validatedMessage.type) {
          case 'join_session': {
            const { sessionId, participantName, participantId } = validatedMessage.data;
            
            // Verify session exists
            const session = await storage.getSession(sessionId);
            if (!session) {
              ws.send(JSON.stringify({ error: 'Session not found' }));
              return;
            }

            // Check if participant already exists by ID or name
            let participant;
            
            if (participantId) {
              // Host reconnecting with existing participant ID
              participant = await storage.getParticipant(participantId);
              if (participant) {
                await storage.updateParticipant(participantId, { isConnected: true });
              }
            } else {
              // Check by name for existing participant
              const existingParticipants = await storage.getParticipantsBySession(sessionId);
              participant = existingParticipants.find(p => p.name === participantName);
              
              if (participant) {
                // Update existing participant connection status
                await storage.updateParticipant(participant.id, { isConnected: true });
              } else {
                // Add new participant
                participant = await storage.addParticipant({
                  sessionId,
                  name: participantName,
                  isHost: false,
                  isConnected: true,
                });
              }
            }

            if (participant) {
              ws.sessionId = sessionId;
              ws.participantId = participant.id;
              clients.set(participant.id, ws);
            }

            await broadcastSessionUpdate(sessionId);
            break;
          }

          case 'start_vote': {
            const { sessionId, label } = validatedMessage.data;
            
            await storage.updateSession(sessionId, {
              currentVote: {
                label,
                isRevealed: false,
                startedAt: new Date(),
              }
            });

            await broadcastSessionUpdate(sessionId);
            break;
          }

          case 'submit_vote': {
            const { sessionId, participantId, voteValue } = validatedMessage.data;
            
            const session = await storage.getSession(sessionId);
            if (!session?.currentVote) {
              ws.send(JSON.stringify({ error: 'No active vote' }));
              return;
            }

            await storage.submitVote({
              sessionId,
              participantId,
              voteValue,
              voteLabel: session.currentVote.label,
            });

            await broadcastSessionUpdate(sessionId);
            break;
          }

          case 'reveal_votes': {
            const { sessionId } = validatedMessage.data;
            
            const session = await storage.getSession(sessionId);
            if (!session?.currentVote) {
              ws.send(JSON.stringify({ error: 'No active vote' }));
              return;
            }

            await storage.updateSession(sessionId, {
              currentVote: {
                ...session.currentVote,
                isRevealed: true,
              }
            });

            await broadcastSessionUpdate(sessionId);
            break;
          }

          case 'reset_votes': {
            const { sessionId } = validatedMessage.data;
            
            const session = await storage.getSession(sessionId);
            if (!session?.currentVote) {
              ws.send(JSON.stringify({ error: 'No active vote' }));
              return;
            }

            // Save to history if votes were revealed
            if (session.currentVote.isRevealed) {
              const votes = await storage.getVotesBySession(sessionId, session.currentVote.label);
              const numericVotes = votes.filter(v => typeof v.voteValue === 'number').map(v => v.voteValue as number);
              const average = numericVotes.length > 0 ? numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length : undefined;

              await storage.saveVoteHistory({
                sessionId,
                label: session.currentVote.label,
                votes,
                average,
              });
            }

            // Clear current vote and votes
            await storage.clearVotes(sessionId, session.currentVote.label);
            await storage.updateSession(sessionId, {
              currentVote: undefined,
            });

            await broadcastSessionUpdate(sessionId);
            break;
          }

          case 'leave_session': {
            const { sessionId, participantId } = validatedMessage.data;
            
            // Check if this is the host leaving (which ends the session)
            const leavingParticipant = await storage.getParticipant(participantId);
            const isHostLeaving = leavingParticipant?.isHost;
            
            await storage.removeParticipant(participantId);
            clients.delete(participantId);
            
            if (isHostLeaving) {
              // Host is leaving - end the entire session
              await storage.updateSession(sessionId, { isActive: false });
              
              // Disconnect all participants
              const allParticipants = await storage.getParticipantsBySession(sessionId);
              for (const participant of allParticipants) {
                const client = clients.get(participant.id);
                if (client) {
                  client.send(JSON.stringify({ 
                    type: 'session_ended',
                    message: 'Host ended the session' 
                  }));
                  client.close();
                  clients.delete(participant.id);
                }
                await storage.removeParticipant(participant.id);
              }
            } else {
              // Regular participant leaving
              ws.close();
              await broadcastSessionUpdate(sessionId);
            }
            break;
          }

          case 'remove_participant': {
            const { sessionId, participantId } = validatedMessage.data;
            
            // Only allow hosts to remove participants
            const session = await storage.getSession(sessionId);
            const requesterParticipant = await storage.getParticipant(ws.participantId || '');
            
            if (!session || !requesterParticipant?.isHost) {
              ws.send(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }

            await storage.removeParticipant(participantId);
            
            // Close the WebSocket connection for the removed participant
            const removedClient = clients.get(participantId);
            if (removedClient) {
              removedClient.close();
              clients.delete(participantId);
            }

            await broadcastSessionUpdate(sessionId);
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', async () => {
      if (ws.participantId && ws.sessionId) {
        // Mark participant as disconnected instead of removing them immediately
        await storage.updateParticipant(ws.participantId, { isConnected: false });
        clients.delete(ws.participantId);
        await broadcastSessionUpdate(ws.sessionId);
      }
    });
  });

  async function broadcastSessionUpdate(sessionId: string) {
    const session = await storage.getSession(sessionId);
    if (!session) return;

    const participants = await storage.getParticipantsBySession(sessionId);
    const voteHistory = await storage.getVoteHistory(sessionId);
    
    let votes: Vote[] = [];
    if (session.currentVote) {
      votes = await storage.getVotesBySession(sessionId, session.currentVote.label);
    }

    const updateMessage = {
      type: 'session_update',
      data: {
        session,
        participants,
        votes,
        voteHistory,
      }
    };

    // Send to all connected participants in this session
    participants.forEach(participant => {
      const client = clients.get(participant.id);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(updateMessage));
      }
    });
  }

  return httpServer;
}
