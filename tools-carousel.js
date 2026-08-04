(function () {
  document.querySelectorAll("[data-carousel]").forEach(function (carousel) {
    var track = carousel.querySelector(".Tel-Carousel-Track");
    var prev = carousel.querySelector(".Tel-Carousel-Arrow--prev");
    var next = carousel.querySelector(".Tel-Carousel-Arrow--next");
    if (!track || !next) return;

    function updateArrows() {
      var scrollLeft = track.scrollLeft;
      var maxScroll = track.scrollWidth - track.clientWidth;
      var atStart = scrollLeft <= 8;
      var atEnd = scrollLeft >= maxScroll - 8;

      if (prev) prev.hidden = atStart;
      next.hidden = atEnd || maxScroll <= 0;
    }

    function scrollByDir(dir) {
      var item = track.querySelector(".Tel-Carousel-Item");
      var gap = parseFloat(getComputedStyle(track).gap) || 24;
      var amount = item ? item.offsetWidth + gap : track.clientWidth * 0.75;
      track.scrollBy({ left: dir * amount, behavior: "smooth" });
    }

    if (prev) {
      prev.addEventListener("click", function () {
        scrollByDir(-1);
      });
    }

    next.addEventListener("click", function () {
      scrollByDir(1);
    });

    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();
  });
})();
