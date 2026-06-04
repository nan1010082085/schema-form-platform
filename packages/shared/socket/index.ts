export {
  SOCKET_EVENTS,
  editorRoom,
  flowRoom,
  type AiApplyEvent,
  type AiPublishedEvent,
  type HostContextEvent,
  type CollabAiSyncEvent,
  type CollabMessageStatusEvent,
  type CollabGenerationStartEvent,
  type CollabGenerationEndEvent,
  type CollabParticipantEvent,
  type CollabMessageEvent,
  type MessageStatus,
} from './events.js'

export {
  connect,
  disconnect,
  getSocket,
  joinRoom,
  leaveRoom,
  identify,
  emitAiApply,
  emitAiPublished,
  onAiApply,
  onAiPublished,
  onConnect,
  onDisconnect,
  // Notification
  onFlowNotification,
  // Collaboration
  joinCollaboration,
  leaveCollaboration,
  sendCollabMessage,
  onCollabAiSync,
  onCollabMessageStatus,
  onCollabGenerationStart,
  onCollabGenerationEnd,
  onCollabUserJoined,
  onCollabUserLeft,
  onCollabParticipants,
} from './client.js'

export type { FlowNotificationEvent } from './client.js'
