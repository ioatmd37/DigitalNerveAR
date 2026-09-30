import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { InstructorLoginScreen } from './screens/InstructorLoginScreen';
import { InstructorScreen } from './screens/InstructorScreen';
import { LandingScreen } from './screens/LandingScreen';
import { ViewerScreen } from './screens/ViewerScreen';

export default function App() {
  const screen = useAppStore((s) => s.screen);
  const language = useAppStore((s) => s.language);
  const unlocked = useAppStore((s) => s.instructor.unlocked);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  switch (screen) {
    case 'ar':
      return <ViewerScreen key="ar" kind="ar" />;
    case 'explorer':
      return <ViewerScreen key="explorer" kind="explorer" />;
    case 'instructorLogin':
      return <InstructorLoginScreen />;
    case 'instructor':
      return unlocked ? <InstructorScreen /> : <InstructorLoginScreen />;
    default:
      return <LandingScreen />;
  }
}
