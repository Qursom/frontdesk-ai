export type ChatAction = 'NONE' | 'SHOW_LEAD_FORM' | 'HANDOFF';

/** Why a HANDOFF happened, so the widget can show the right UI (urgent card vs normal handoff). */
export type HandoffReason = 'EMERGENCY' | 'HUMAN' | 'ERROR';

export interface ChatResponse {
  conversationId: string;
  reply: string;
  /** Tells the widget what UI to show next. New actions (e.g. SHOW_BOOKING_SLOTS) can be added later. */
  action: ChatAction;
  /** Only set when action is HANDOFF. */
  handoffReason?: HandoffReason;
  sources: string[];
}
