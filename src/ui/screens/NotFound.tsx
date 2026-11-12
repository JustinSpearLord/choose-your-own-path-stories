import { Link } from 'react-router';
import ui from '../app-theme/ui.module.css';

export function NotFound({ message }: { message?: string }) {
  return (
    <main className={ui.page}>
      <h1 className={ui.title}>Nothing here</h1>
      <p className={ui.body}>{message ?? 'This page does not exist, or what it showed has been removed.'}</p>
      <Link to="/" className={ui.primary}>
        Back to the library
      </Link>
    </main>
  );
}
