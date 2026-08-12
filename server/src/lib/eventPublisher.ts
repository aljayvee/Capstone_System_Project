import { io } from "./socket.js";

// Observer (real-time push) wrapped behind an Adapter interface so services depend
// on this abstraction rather than the concrete Socket.IO singleton directly (DIP).
// A future alternate transport (e.g. Redis pub/sub for multi-instance scale-out —
// see AGENTS.md server section 5) is a one-file swap of the implementation below.
export interface IEventPublisher {
  emit(event: string, payload: unknown): void;
}

class SocketIOEventPublisher implements IEventPublisher {
  emit(event: string, payload: unknown): void {
    io.emit(event, payload);
  }
}

export const eventPublisher: IEventPublisher = new SocketIOEventPublisher();
