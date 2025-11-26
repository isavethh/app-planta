import { createContext } from 'react';

export const AuthContext = createContext({
  signIn: () => {},
  signOut: () => {},
  userToken: null,
  userInfo: null,
});

