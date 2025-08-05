import React from 'react';
import clsx from 'clsx';
import './styles.css';

export default function SectionContainer({children, className}) {
  return (
    <section className={clsx('section-container', className)}>
      <div className="section-content">
        {children}
      </div>
    </section>
  );
}
