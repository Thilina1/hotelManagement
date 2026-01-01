
'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

// A custom error class for Firestore permission errors with context.
export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext, serverError?: Error) {
    // Construct a detailed error message for developers.
    const message = `Firestore Permission Denied: The following request was denied by security rules: ${JSON.stringify(context, null, 2)}`;
    
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // You might want to chain the original error for more detailed debugging.
    if (serverError) {
      this.stack = serverError.stack;
    }
  }
}
