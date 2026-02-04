/**
 * Docs Table of Contents scroll-spy highlighting.
 *
 * Uses IntersectionObserver to track which heading is in view and
 * applies an active class to the corresponding ToC link.
 *
 * This is a progressive enhancement: if IntersectionObserver is not
 * available, the docs behave as before (no JS highlight).
 */
(function () {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    return;
  }

  // Only run on pages that actually have a docs ToC and content.
  var tocRoot = document.getElementById('TableOfContents');
  var docsContent =
    document.querySelector('#docs-content .article-style') ||
    document.querySelector('#docs-content') ||
    document.querySelector('.docs-content .article-style') ||
    document.querySelector('.docs-content');

  if (!tocRoot || !docsContent) {
    return;
  }

  // Collect ToC links and map them by target heading id.
  var tocLinks = Array.prototype.slice.call(
    tocRoot.querySelectorAll('a[href^="#"]')
  );

  if (!tocLinks.length) {
    return;
  }

  var linkById = new Map();
  tocLinks.forEach(function (link) {
    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) !== '#') {
      return;
    }
    var id = href.slice(1);
    if (!id) {
      return;
    }
    try {
      id = decodeURIComponent(id);
    } catch (e) {
      // If decoding fails, fall back to raw id.
    }
    // In case of duplicates, prefer the first appearance.
    if (!linkById.has(id)) {
      linkById.set(id, link);
    }
  });

  // Collect headings in the main article content that appear in the ToC.
  var headings = Array.prototype.slice.call(
    docsContent.querySelectorAll('h2[id], h3[id], h4[id]')
  ).filter(function (heading) {
    return heading.id && linkById.has(heading.id);
  });

  if (!headings.length) {
    return;
  }

  var visibility = {};
  headings.forEach(function (h) {
    visibility[h.id] = false;
  });

  var activeId = null;

  function setActive(id) {
    if (id === activeId) {
      return;
    }

    if (activeId && linkById.has(activeId)) {
      var prev = linkById.get(activeId);
      prev.classList.remove('toc-link-active');
      prev.removeAttribute('aria-current');
    }

    if (id && linkById.has(id)) {
      var next = linkById.get(id);
      next.classList.add('toc-link-active');
      next.setAttribute('aria-current', 'true');
      activeId = id;
    } else {
      activeId = null;
    }
  }

  var observerOptions = {
    root: null, // viewport
    rootMargin: '-10% 0% -85% 0%',
    threshold: 0
  };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var target = entry.target;
      if (!target || !target.id) {
        return;
      }
      visibility[target.id] = entry.isIntersecting;
    });

    // Headings that are currently visible, in document order.
    var visibleHeadings = headings.filter(function (h) {
      return visibility[h.id];
    });

    var newActiveId = null;

    if (visibleHeadings.length) {
      newActiveId = visibleHeadings[0].id;
    } else {
      // If none are visible (e.g. near extremes of the page), choose the
      // nearest logical section based on scroll position.
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      var first = headings[0];
      var last = headings[headings.length - 1];
      var firstTop = first.getBoundingClientRect().top + scrollY;
      var lastTop = last.getBoundingClientRect().top + scrollY;

      if (scrollY + 50 < firstTop) {
        newActiveId = first.id;
      } else if (scrollY >= lastTop) {
        newActiveId = last.id;
      }
    }

    if (newActiveId) {
      setActive(newActiveId);
    }
  }, observerOptions);

  headings.forEach(function (heading) {
    observer.observe(heading);
  });

  // Enhance ToC clicks with smooth scrolling that accounts for the fixed navbar.
  function getNavbarOffset() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) {
      return 0;
    }
    return navbar.offsetHeight || 0;
  }

  tocLinks.forEach(function (link) {
    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) !== '#') {
      return;
    }

    link.addEventListener('click', function (event) {
      var id = href.slice(1);
      if (!id) {
        return;
      }

      var target = document.getElementById(id);
      if (!target) {
        return;
      }

      event.preventDefault();

      var offset = getNavbarOffset();
      var rect = target.getBoundingClientRect();
      var absoluteTop = rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0);

      var scrollTarget = absoluteTop - offset - 10;

      try {
        window.history.replaceState(null, '', '#' + id);
      } catch (e) {
        // Ignore history errors in restrictive environments.
      }

      window.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
      });
    });
  });
})();

