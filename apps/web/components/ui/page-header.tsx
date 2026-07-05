import * as React from "react";

export interface PageHeaderProps {
  /** Uppercase eyebrow (e.g. "OnlineJourno · Story Scores"). */
  eyebrow?: string;
  title: string;
  /** Optional standfirst / deck. */
  deck?: string;
}

/** The canonical page header: `.ds-label` eyebrow + `.ds-h1` title + `.ds-deck`. */
export function PageHeader({ eyebrow, title, deck }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {eyebrow ? <p className="ds-label mb-2">{eyebrow}</p> : null}
      <h1 className="ds-h1">{title}</h1>
      {deck ? <p className="ds-deck mt-3 max-w-2xl">{deck}</p> : null}
    </header>
  );
}
