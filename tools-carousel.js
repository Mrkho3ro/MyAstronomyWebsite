(function () {
  document.querySelectorAll("[data-carousel]").forEach(function (carousel) {
    var viewport = carousel.querySelector(".Tel-Carousel-Viewport");
    var track = carousel.querySelector(".Tel-Carousel-Track");
    var prev = carousel.querySelector(".Tel-Carousel-Arrow--prev");
    var next = carousel.querySelector(".Tel-Carousel-Arrow--next");
    if (!viewport || !track || !next) return;

    function updateArrows() {
      var scrollLeft = viewport.scrollLeft;
      var maxScroll = viewport.scrollWidth - viewport.clientWidth;
      var atStart = scrollLeft <= 8;
      var atEnd = scrollLeft >= maxScroll - 8;

      if (prev) prev.hidden = atStart;
      next.hidden = atEnd || maxScroll <= 0;
    }

    function scrollAmount() {
      var item = track.querySelector(".Tel-Carousel-Item");
      var gap = parseFloat(getComputedStyle(track).gap) || 24;
      var itemStep = item ? item.offsetWidth + gap : 0;
      var viewportStep = viewport.clientWidth * 0.92;
      var twoItems = itemStep > 0 ? itemStep * 2 : 0;
      return Math.max(viewportStep, twoItems || viewportStep);
    }

    function scrollByDir(dir) {
      viewport.scrollBy({ left: dir * scrollAmount(), behavior: "smooth" });
    }

    if (prev) {
      prev.addEventListener("click", function () {
        scrollByDir(-1);
      });
    }

    next.addEventListener("click", function () {
      scrollByDir(1);
    });

    viewport.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();
  });
})();
