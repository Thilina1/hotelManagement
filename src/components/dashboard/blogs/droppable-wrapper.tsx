
'use client';

import { useEffect, useState } from 'react';
import { Droppable as OriginalDroppable, DroppableProps } from 'react-beautiful-dnd';

export const Droppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <OriginalDroppable {...props}>{children}</OriginalDroppable>;
};
