import { useState } from 'react';
import { useMemberSearch as useDomainMemberSearch } from '../../../members/hooks/useMemberSearch';

export function useMemberSearch(query: string) {
  return useDomainMemberSearch(query);
}
