import { createHashRouter } from 'react-router';
import { Ending } from './ui/screens/Ending/Ending';
import { Endings } from './ui/screens/Endings/Endings';
import { Import } from './ui/screens/Import/Import';
import { Library } from './ui/screens/Library/Library';
import { ChangeLook, ImportLook } from './ui/screens/Look/Look';
import { Make } from './ui/screens/Make/Make';
import { StoryMapScreen } from './ui/screens/Map/StoryMapScreen';
import { NotFound } from './ui/screens/NotFound';
import { Paths } from './ui/screens/Paths/Paths';
import { Decision, PlayLayout, PlayScene } from './ui/screens/Play/Play';
import { Review } from './ui/screens/Review/Review';
import { Settings } from './ui/screens/Settings/Settings';
import { StoryMenu } from './ui/screens/StoryMenu/StoryMenu';
import { Update } from './ui/screens/Update/Update';

export const router = createHashRouter([
  { path: '/', element: <Library /> },
  { path: '/story/:id', element: <StoryMenu /> },
  { path: '/story/:id/endings', element: <Endings /> },
  { path: '/story/:id/map', element: <StoryMapScreen /> },
  { path: '/story/:id/look', element: <ChangeLook /> },
  { path: '/story/:id/paths', element: <Paths /> },
  { path: '/import', element: <Import /> },
  { path: '/import/look', element: <ImportLook /> },
  { path: '/import/update', element: <Update /> },
  { path: '/make', element: <Make /> },
  {
    path: '/play/:runId',
    element: <PlayLayout />,
    children: [
      { index: true, element: <PlayScene /> },
      { path: 'decide', element: <Decision /> },
    ],
  },
  { path: '/run/:runId/end', element: <Ending /> },
  { path: '/run/:runId', element: <Review /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <NotFound /> },
]);
