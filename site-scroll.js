/**
 * Lightweight scroll reveal — adds .is-visible when elements enter viewport.
 */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".Scroll-Reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var els = document.querySelectorAll(".Scroll-Reveal");
  if (!els.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  els.forEach(function (el) {
    observer.observe(el);
  });
})();
