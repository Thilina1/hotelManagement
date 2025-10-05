'use client';

import { getAuth } from "firebase/auth";
import { initializeFirebase } from ".";

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  
  constructor(context: SecurityRuleContext) {
    // Generate a detailed error message that will be caught by the Next.js overlay
    const { auth } = initializeFirebase();
    const currentUser = auth.currentUser;

    const message = `
FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
{
  "auth": ${currentUser ? JSON.stringify(currentUser.toJSON(), null, 2) : 'null'},
  "method": "${context.operation}",
  "path": "/databases/(default)/documents/${context.path}"
  ${context.requestResourceData ? `,"resource": ${JSON.stringify(context.requestResourceData, null, 2)}` : ''}
}
`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is to make the error object more readable in the console
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
