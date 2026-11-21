import React from 'react';

export default function FooterCopyright({copyright}) {
  const currentYear = new Date().getFullYear();
  const copyrightHtml = copyright.replace('__CURRENT_YEAR__', currentYear);

  return (
    <div
      className="footer__copyright"
      // Developer provided the HTML, so assume it's safe.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{__html: copyrightHtml}}
    />
  );
}
