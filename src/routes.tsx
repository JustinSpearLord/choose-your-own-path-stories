import { createHashRouter } from 'react-router';
import { Library } from './ui/screens/Library/Library';
import { NotFound } from './ui/screens/NotFound';

export const router = createHashRouter([
  { path: '/', element: <Library /> },
  { path: '*', element: <NotFound /> },
]);
