'use client';
import { useStore } from '@/provider';
import { redirect } from 'next/navigation';
import React from 'react';

import { deepSearchFirstNode } from '@/utils';

const NodePage = () => {
  const { tree } = useStore();
  const firstNode = deepSearchFirstNode(tree || []);

  if (firstNode) {
    return redirect(`/node/${firstNode.id}`);
  }

  return <></>;
};

export default NodePage;
