import { ReactNode } from "react";

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="section">
      <div className="section__header">
        <h2>{title}</h2>
        {aside ? <div>{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
