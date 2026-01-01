
import { useMemo, DependencyList } from 'react';
import { CollectionReference, DocumentData, Query } from 'firebase/firestore';

// Define a type that includes the __memo property.
export type MemoizableQuery = (CollectionReference<DocumentData> | Query<DocumentData>) & { __memo?: boolean };

/**
 * Memoizes a Firestore query or collection reference to prevent re-renders.
 *
 * @param factory A function that returns a Firestore query or collection reference.
 * @param deps An array of dependencies for the useMemo hook.
 * @returns The memoized query or collection reference.
 */
export function useMemoFirebase<T extends MemoizableQuery>(
  factory: () => T,
  deps: DependencyList
): T {
  const memoizedQuery = useMemo(() => {
    const query = factory();
    if (query) {
      query.__memo = true;
    }
    return query;
  }, deps);

  return memoizedQuery;
}
