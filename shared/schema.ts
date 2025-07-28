import { z } from "zod";

export const sessionSchema = z.object({
  id: z.string(),
  pin: z.string().length(4),
  hostId: z.string(),
  createdAt: z.date(),
  isActive: z.boolean(),
  currentVote: z.object({
    label: z.string(),
    isRevealed: z.boolean(),
    startedAt: z.date(),
  }).optional(),
});

export const participantSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  isHost: z.boolean(),
  joinedAt: z.date(),
  isConnected: z.boolean(),
});

export const voteSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  participantId: z.string(),
  voteValue: z.union([
    z.number(),
    z.literal("coffee"),
    z.literal("?")
  ]),
  voteLabel: z.string(),
  submittedAt: z.date(),
});

export const voteHistorySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  label: z.string(),
  votes: z.array(voteSchema),
  average: z.number().optional(),
  completedAt: z.date(),
});

export const insertSessionSchema = sessionSchema.omit({
  id: true,
  createdAt: true,
});

export const insertParticipantSchema = participantSchema.omit({
  id: true,
  joinedAt: true,
});

export const insertVoteSchema = voteSchema.omit({
  id: true,
  submittedAt: true,
});

export const insertVoteHistorySchema = voteHistorySchema.omit({
  id: true,
  completedAt: true,
});

export type Session = z.infer<typeof sessionSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type Vote = z.infer<typeof voteSchema>;
export type VoteHistory = z.infer<typeof voteHistorySchema>;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type InsertVoteHistory = z.infer<typeof insertVoteHistorySchema>;

// WebSocket message types
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join_session"),
    data: z.object({
      sessionId: z.string(),
      participantName: z.string(),
      participantId: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("leave_session"),
    data: z.object({
      sessionId: z.string(),
      participantId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("remove_participant"),
    data: z.object({
      sessionId: z.string(),
      participantId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("end_session"),
    data: z.object({
      sessionId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("start_vote"),
    data: z.object({
      sessionId: z.string(),
      label: z.string(),
    }),
  }),
  z.object({
    type: z.literal("submit_vote"),
    data: z.object({
      sessionId: z.string(),
      participantId: z.string(),
      voteValue: z.union([z.number(), z.literal("coffee"), z.literal("?")]),
    }),
  }),
  z.object({
    type: z.literal("reveal_votes"),
    data: z.object({
      sessionId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("reset_votes"),
    data: z.object({
      sessionId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("session_update"),
    data: z.object({
      session: sessionSchema,
      participants: z.array(participantSchema),
      votes: z.array(voteSchema),
      voteHistory: z.array(voteHistorySchema),
    }),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;
