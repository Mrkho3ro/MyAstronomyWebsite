(function () {
  function initCenterLogo(nav) {
    var logo = nav.querySelector(".site-nav__logo--center");
    var brand = nav.querySelector(".site-nav__brand");
    var toggle = nav.querySelector(".site-nav__toggle");
    if (!logo || !brand) return;

    function syncCenterLogo() {
      if (window.innerWidth > 720) {
        logo.style.opacity = "";
        logo.style.transform = "translate(-50%, -50%)";
        return;
      }

      var inner = nav.querySelector(".site-nav__inner");
      if (!inner) return;

      var centerX = inner.getBoundingClientRect().left + inner.getBoundingClientRect().width / 2;
      var brandRight = brand.getBoundingClientRect().right;
      var toggleLeft = toggle && toggle.offsetParent ? toggle.getBoundingClientRect().left : inner.getBoundingClientRect().right;
      var logoHalf = logo.offsetWidth / 2 + 8;
      var overlaps = centerX - logoHalf < brandRight || centerX + logoHalf > toggleLeft;

      logo.style.opacity = overlaps ? "0.88" : "1";
      logo.style.transform = overlaps
        ? "translate(-50%, -50%) scale(0.92)"
        : "translate(-50%, -50%)";
    }

    window.addEventListener("resize", syncCenterLogo, { passive: true });
    syncCenterLogo();
  }

  function initNav(nav) {
    var toggle = nav.querySelector(".site-nav__toggle");
    var menu = nav.querySelector("#site-nav-menu, .site-nav__links");
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });

      menu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }

    initCenterLogo(nav);

    var path = (window.location.pathname || "").replace(/\\/g, "/");
    var file = path.split("/").pop() || "index.html";
    if (!file || file === "/") file = "index.html";

    var section = "home";
    if (/Solar-System\.html$/i.test(file) || /\/planets\//i.test(path)) {
      section = "solar";
    } else if (/Messier-Objects\.html$/i.test(file) || /\/messier\//i.test(path)) {
      section = "messier";
    } else if (/Tools\.html$/i.test(file)) {
      section = "tools";
    } else if (/^(index|Home)\.html$/i.test(file) || file === "") {
      section = "home";
    }

    nav.querySelectorAll(".site-nav__links a").forEach(function (link) {
      var href = (link.getAttribute("href") || "").replace(/\\/g, "/");
      var linkFile = href.split("/").pop() || "";
      var match = false;

      if (section === "home" && /^(index|Home)\.html$/i.test(linkFile)) match = true;
      if (section === "solar" && /Solar-System\.html$/i.test(linkFile)) match = true;
      if (section === "messier" && /Messier-Objects\.html$/i.test(linkFile)) match = true;
      if (section === "tools" && /Tools\.html$/i.test(linkFile)) match = true;

      if (match) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  document.querySelectorAll("nav.site-nav, nav").forEach(initNav);
})();
