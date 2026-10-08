import { createContext, useContext } from 'react';
export const FencerFollowsContext = createContext(null);
export const useFencerFollows = () => useContext(FencerFollowsContext);
