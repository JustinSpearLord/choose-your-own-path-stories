import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BackIcon } from './Icons';
import ui from './ui.module.css';

export interface HeaderProps {
  title: string;
  sub?: ReactNode;
  backTo: string;
  backLabel: string;
  /** Story screens show the title as written; app screens show it in capitals. */
  plain?: boolean;
  right?: ReactNode;
}

export function Header({ title, sub, backTo, backLabel, plain, right }: HeaderProps) {
  return (
    <header className={ui.header}>
      <Link to={backTo} aria-label={backLabel} className={ui.iconBtn}>
        <BackIcon />
      </Link>
      <div className={ui.headerText}>
        <h1 className={plain ? ui.titlePlain : ui.title}>{title}</h1>
        {sub ? <span className={ui.sub}>{sub}</span> : null}
      </div>
      {right}
    </header>
  );
}
