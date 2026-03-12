import React from 'react';
import clsx from 'clsx';
import './styles.css';

export default function Container({children, className}) {
  return (
    <section className={clsx('container', className)}>
      <div className="content">
        {children}
      </div>
    </section>
  );
}