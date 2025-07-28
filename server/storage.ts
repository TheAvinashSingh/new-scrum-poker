import { type Session, type Participant, type Vote, type VoteHistory, type InsertSession, type InsertParticipant, type InsertVote, type InsertVoteHistory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getSessionByPin(pin: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // Participant methods
  addParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipant(id: string): Promise<Participant | undefined>;
  getParticipantsBySession(sessionId: string): Promise<Participant[]>;
  updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined>;
  removeParticipant(id: string): Promise<boolean>;

  // Vote methods
  submitVote(vote: InsertVote): Promise<Vote>;
  getVote(participantId: string, sessionId: string, label: string): Promise<Vote | undefined>;
  getVotesBySession(sessionId: string, label: string): Promise<Vote[]>;
  clearVotes(sessionId: string, label: string): Promise<boolean>;

  // Vote history methods
  saveVoteHistory(history: InsertVoteHistory): Promise<VoteHistory>;
  getVoteHistory(sessionId: string): Promise<VoteHistory[]>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;
  private participants: Map<string, Participant>;
  private votes: Map<string, Vote>;
  private voteHistory: Map<string, VoteHistory>;

  constructor() {
    this.sessions = new Map();
    this.participants = new Map();
    this.votes = new Map();
    this.voteHistory = new Map();
  }

  // Session methods
  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      ...insertSession,
      id,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getSessionByPin(pin: string): Promise<Session | undefined> {
    return Array.from(this.sessions.values()).find(session => session.pin === pin);
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // Participant methods
  async addParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = randomUUID();
    const participant: Participant = {
      ...insertParticipant,
      id,
      joinedAt: new Date(),
    };
    this.participants.set(id, participant);
    return participant;
  }

  async getParticipant(id: string): Promise<Participant | undefined> {
    return this.participants.get(id);
  }

  async getParticipantsBySession(sessionId: string): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(p => p.sessionId === sessionId);
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const participant = this.participants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = { ...participant, ...updates };
    this.participants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async removeParticipant(id: string): Promise<boolean> {
    return this.participants.delete(id);
  }

  // Vote methods
  async submitVote(insertVote: InsertVote): Promise<Vote> {
    const id = randomUUID();
    const vote: Vote = {
      ...insertVote,
      id,
      submittedAt: new Date(),
    };
    
    // Remove existing vote for this participant/label combo
    const existingVoteKey = Array.from(this.votes.entries()).find(([_, v]) => 
      v.participantId === vote.participantId && 
      v.sessionId === vote.sessionId && 
      v.voteLabel === vote.voteLabel
    )?.[0];
    
    if (existingVoteKey) {
      this.votes.delete(existingVoteKey);
    }
    
    this.votes.set(id, vote);
    return vote;
  }

  async getVote(participantId: string, sessionId: string, label: string): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(v => 
      v.participantId === participantId && 
      v.sessionId === sessionId && 
      v.voteLabel === label
    );
  }

  async getVotesBySession(sessionId: string, label: string): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(v => 
      v.sessionId === sessionId && v.voteLabel === label
    );
  }

  async clearVotes(sessionId: string, label: string): Promise<boolean> {
    const votesToDelete = Array.from(this.votes.entries()).filter(([_, v]) => 
      v.sessionId === sessionId && v.voteLabel === label
    );
    
    votesToDelete.forEach(([key, _]) => this.votes.delete(key));
    return true;
  }

  // Vote history methods
  async saveVoteHistory(insertHistory: InsertVoteHistory): Promise<VoteHistory> {
    const id = randomUUID();
    const history: VoteHistory = {
      ...insertHistory,
      id,
      completedAt: new Date(),
    };
    this.voteHistory.set(id, history);
    return history;
  }

  async getVoteHistory(sessionId: string): Promise<VoteHistory[]> {
    return Array.from(this.voteHistory.values())
      .filter(h => h.sessionId === sessionId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  }
}

export const storage = new MemStorage();
