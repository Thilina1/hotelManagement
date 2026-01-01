
'use client';

import { EventEmitter } from 'events';
import { FirestorePermissionError } from './errors';

// Type definition for the events that can be emitted.
type AppEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
};

// Extend EventEmitter with our custom event types.
class TypedEventEmitter<T> {
  private emitter = new EventEmitter();

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean {
    return this.emitter.emit(event as string, ...args);
  }

  on<K extends keyof T>(event: K, listener: T[K]): this {
    this.emitter.on(event as string, listener);
    return this;
  }
}

// Global error emitter instance.
export const errorEmitter = new TypedEventEmitter<AppEvents>();
