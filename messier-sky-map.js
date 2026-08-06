/**
 * Interactive Messier sky map — unified zoom on background + markers.
 * Background: ESA/Gaia/DPAC equirectangular (CC BY-SA 3.0 IGO), Acknowledgement: A. Moitinho
 */
(function () {
  "use strict";

  var CATEGORIES = {
    "open-cluster": { label: "Open Cluster", color: "#5ce0ff", symbol: "circle" },
    "globular-cluster": { label: "Globular Cluster", color: "#ffd060", symbol: "circle-filled" },
    "diffuse-nebula": { label: "Diffuse Nebula", color: "#ff6eb4", symbol: "square" },
    "planetary-nebula": { label: "Planetary Nebula", color: "#b060ff", symbol: "diamond" },
    "supernova-remnant": { label: "Supernova Remnant", color: "#ff5050", symbol: "cross" },
    galaxy: { label: "Galaxy", color: "#60ffa0", symbol: "hex" },
    other: { label: "Other", color: "#c0c0d0", symbol: "triangle" },
  };

  var container = document.getElementById("messier-sky-map");
  if (!container) return;

  var viewport = container.querySelector(".M-SkyMap-Viewport");
  var transformLayer = container.querySelector(".M-SkyMap-Transform");
  var canvas = container.querySelector(".M-SkyMap-Canvas");
  var bgImg = container.querySelector(".M-SkyMap-BG");
  var popup = container.querySelector(".M-SkyMap-Popup");
  var searchInput = container.querySelector(".M-SkyMap-Search-Input");
  var legendEl = container.querySelector(".M-SkyMap-Legend");
  var ctx = canvas.getContext("2d");

  var catalog = [];
  var userZoom = 1;
  var minUserZoom = 1;
  var maxUserZoom = 10;
  var panX = 0;
  var panY = 0;
  var imgW = 4000;
  var imgH = 2000;
  var visibleCats = {};
  var selected = null;
  var hoverObj = null;
  var highlightNum = null;
  var pinchDist = null;
  var viewReady = false;
  var isDragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var panStartX = 0;
  var panStartY = 0;
  var dragMoved = false;

  Object.keys(CATEGORIES).forEach(function (k) {
    visibleCats[k] = true;
  });

  function buildLegend() {
    legendEl.innerHTML = "";
    Object.keys(CATEGORIES).forEach(function (key) {
      var cat = CATEGORIES[key];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "M-SkyMap-Legend-Btn" + (visibleCats[key] ? " is-active" : "");
      btn.dataset.category = key;
      btn.innerHTML =
        '<span class="M-SkyMap-Legend-Sym" style="color:' +
        cat.color +
        '">' +
        symbolSvg(cat.symbol, cat.color) +
        "</span>" +
        '<span class="M-SkyMap-Legend-Label">' +
        cat.label +
        "</span>";
      btn.addEventListener("click", function () {
        visibleCats[key] = !visibleCats[key];
        btn.classList.toggle("is-active", visibleCats[key]);
        draw();
      });
      legendEl.appendChild(btn);
    });
  }

  function symbolSvg(type, color) {
    switch (type) {
      case "circle-filled":
        return "●";
      case "square":
        return "■";
      case "diamond":
        return "◆";
      case "cross":
        return "✚";
      case "hex":
        return "⬡";
      case "triangle":
        return "▲";
      default:
        return "○";
    }
  }

  function raDecToXY(raHours, decDeg) {
    return { x: (raHours / 24) * imgW, y: ((90 - decDeg) / 180) * imgH };
  }

  function getCoverScale() {
    var rect = viewport.getBoundingClientRect();
    return Math.max(rect.width / imgW, rect.height / imgH);
  }

  function getTotalScale() {
    return getCoverScale() * userZoom;
  }

  function clampPan() {
    if (userZoom <= 1) {
      panX = 0;
      panY = 0;
      return;
    }
    var rect = viewport.getBoundingClientRect();
    var totalScale = getTotalScale();
    var scaledW = imgW * totalScale;
    var scaledH = imgH * totalScale;
    var maxPanX = Math.max(0, (scaledW - rect.width) / 2);
    var maxPanY = Math.max(0, (scaledH - rect.height) / 2);
    panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
    panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
  }

  function getMapLayout() {
    var rect = viewport.getBoundingClientRect();
    var coverScale = getCoverScale();
    var totalScale = coverScale * userZoom;
    var scaledW = imgW * totalScale;
    var scaledH = imgH * totalScale;
    return {
      fitScale: coverScale,
      totalScale: totalScale,
      offsetX: (rect.width - scaledW) / 2 + panX,
      offsetY: (rect.height - scaledH) / 2 + panY,
      vpW: rect.width,
      vpH: rect.height,
    };
  }

  function imageToScreen(ix, iy) {
    var L = getMapLayout();
    return {
      x: L.offsetX + ix * L.totalScale,
      y: L.offsetY + iy * L.totalScale,
    };
  }

  function applyTransform() {
    var totalScale = getTotalScale();
    transformLayer.style.width = imgW + "px";
    transformLayer.style.height = imgH + "px";
    transformLayer.style.transform =
      "translate(calc(-50% + " + panX + "px), calc(-50% + " + panY + "px)) scale(" + totalScale + ")";
    viewport.classList.toggle("is-pannable", userZoom > 1);
  }

  function resetView() {
    userZoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function resizeCanvas() {
    var dpr = devicePixelRatio || 1;
    canvas.width = Math.round(imgW * dpr);
    canvas.height = Math.round(imgH * dpr);
    canvas.style.width = imgW + "px";
    canvas.style.height = imgH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyTransform();
    draw();
  }

  function drawMarker(x, y, cat, obj, isHighlight) {
    var catInfo = CATEGORIES[cat] || CATEGORIES.other;
    var r = isHighlight ? 9 : 6;
    ctx.save();
    ctx.translate(x, y);
    if (isHighlight) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(192,96,232,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = catInfo.color;
    ctx.strokeStyle = "#0a0618";
    ctx.lineWidth = 1.5;
    switch (catInfo.symbol) {
      case "circle-filled":
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case "square":
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        break;
      case "diamond":
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "cross":
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = catInfo.color;
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.stroke();
        break;
      case "hex":
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
          var a = (Math.PI / 3) * i - Math.PI / 6;
          var px = r * Math.cos(a);
          var py = r * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, r);
        ctx.lineTo(-r, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = catInfo.color;
        ctx.stroke();
    }
    if (userZoom > 1.8 || isHighlight) {
      ctx.fillStyle = "#f0e0ff";
      ctx.font = "bold 11px Keania One, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("M" + obj.num, 0, -r - 5);
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, imgW, imgH);
    catalog.forEach(function (obj) {
      if (!visibleCats[obj.category]) return;
      var pos = raDecToXY(obj.ra, obj.dec);
      var hi = highlightNum === obj.num || (selected && selected.num === obj.num);
      drawMarker(pos.x, pos.y, obj.category, obj, hi);
    });
    var active = hoverObj || selected;
    if (active) showQuickReview(active);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  function getTypeLabel(obj) {
    var cat = CATEGORIES[obj.category];
    return (cat && cat.label) || obj.type || "Object";
  }

  function getThumbSrc(obj) {
    return obj.thumb || "M" + obj.num + "-thumb.jpg";
  }

  function positionPopup(sx, sy) {
    var L = getMapLayout();
    var popupW = 168;
    var popupH = 148;
    var left = Math.min(Math.max(sx + 16, 8), L.vpW - popupW - 8);
    var top = Math.min(Math.max(sy - popupH / 2, 8), L.vpH - popupH - 8);
    popup.style.left = left + "px";
    popup.style.top = top + "px";
  }

  function showQuickReview(obj, sx, sy) {
    var typeLabel = getTypeLabel(obj);
    popup.hidden = false;
    popup.className = "M-SkyMap-Popup M-SkyMap-QuickReview";
    popup.innerHTML =
      '<img class="M-SkyMap-Popup-Img" src="' +
      escapeHtml(getThumbSrc(obj)) +
      '" alt="M' +
      obj.num +
      '" loading="lazy" width="140" height="140" />' +
      '<p class="M-SkyMap-QR-Caption">' +
      escapeHtml(typeLabel) +
      " · M" +
      obj.num +
      "</p>";
    if (sx != null && sy != null) positionPopup(sx, sy);
    else {
      var pos = raDecToXY(obj.ra, obj.dec);
      var scr = imageToScreen(pos.x, pos.y);
      positionPopup(scr.x, scr.y);
    }
  }

  function getObjectPageUrl(obj) {
    return "messier/M" + obj.num + ".html";
  }

  function navigateToObject(obj, e) {
    var url = getObjectPageUrl(obj);
    if (e && (e.ctrlKey || e.metaKey || e.button === 1)) {
      window.open(url, "_blank", "noopener");
    } else {
      window.location.href = url;
    }
  }

  function findAt(sx, sy) {
    var best = null;
    var bestD = 18;
    catalog.forEach(function (obj) {
      if (!visibleCats[obj.category]) return;
      var pos = raDecToXY(obj.ra, obj.dec);
      var scr = imageToScreen(pos.x, pos.y);
      var d = Math.hypot(scr.x - sx, scr.y - sy);
      if (d < bestD) {
        bestD = d;
        best = obj;
      }
    });
    return best;
  }

  function setZoom(next) {
    userZoom = Math.min(maxUserZoom, Math.max(minUserZoom, next));
    if (userZoom <= 1) {
      panX = 0;
      panY = 0;
    } else {
      clampPan();
    }
    applyTransform();
    draw();
  }

  function centerOn(obj, doZoom) {
    if (doZoom) userZoom = Math.min(maxUserZoom, Math.max(2.2, userZoom));
    selected = obj;
    hoverObj = null;
    highlightNum = obj.num;
    clampPan();
    applyTransform();
    draw();
  }

  function onWheel(e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(userZoom * factor);
  }

  viewport.addEventListener("wheel", onWheel, { passive: false });

  viewport.addEventListener("mousedown", function (e) {
    if (userZoom <= 1 || e.button !== 0) return;
    isDragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = panX;
    panStartY = panY;
    viewport.classList.add("is-grabbing");
  });

  window.addEventListener("mousemove", function (e) {
    if (isDragging) {
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      panX = panStartX + dx;
      panY = panStartY + dy;
      clampPan();
      applyTransform();
      draw();
      return;
    }

    var rect = viewport.getBoundingClientRect();
    var sx = e.clientX - rect.left;
    var sy = e.clientY - rect.top;
    if (sx < 0 || sy < 0 || sx > rect.width || sy > rect.height) return;

    var hit = findAt(sx, sy);
    if (hit !== hoverObj) {
      hoverObj = hit;
      if (hit) {
        highlightNum = hit.num;
        showQuickReview(hit, sx, sy);
      } else if (!selected) {
        popup.hidden = true;
        highlightNum = null;
      }
      draw();
    } else if (hit) {
      positionPopup(sx, sy);
    }
  });

  window.addEventListener("mouseup", function () {
    if (isDragging) {
      isDragging = false;
      viewport.classList.remove("is-grabbing");
    }
  });

  viewport.addEventListener("click", function (e) {
    if (dragMoved || e.button !== 0) return;
    var rect = viewport.getBoundingClientRect();
    var hit = findAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      navigateToObject(hit, e);
    } else {
      selected = null;
      hoverObj = null;
      popup.hidden = true;
      highlightNum = null;
      draw();
    }
  });

  viewport.addEventListener("auxclick", function (e) {
    if (e.button !== 1 || dragMoved) return;
    var rect = viewport.getBoundingClientRect();
    var hit = findAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      e.preventDefault();
      navigateToObject(hit, e);
    }
  });

  viewport.addEventListener("mouseleave", function () {
    hoverObj = null;
    if (!selected) {
      popup.hidden = true;
      highlightNum = null;
    } else {
      highlightNum = selected.num;
    }
    draw();
  });

  viewport.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length === 2) {
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 1 && userZoom > 1) {
        isDragging = true;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        panStartX = panX;
        panStartY = panY;
      }
    },
    { passive: true }
  );

  viewport.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches.length === 2 && pinchDist) {
        var d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        setZoom(userZoom * (d / pinchDist));
        pinchDist = d;
      } else if (isDragging && e.touches.length === 1 && userZoom > 1) {
        panX = panStartX + (e.touches[0].clientX - dragStartX);
        panY = panStartY + (e.touches[0].clientY - dragStartY);
        clampPan();
        applyTransform();
        draw();
      }
    },
    { passive: true }
  );

  viewport.addEventListener("touchend", function () {
    pinchDist = null;
    isDragging = false;
  });

  if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var q = searchInput.value.trim().toLowerCase().replace(/^m/, "");
      if (!q) return;
      var num = parseInt(q, 10);
      var found = catalog.find(function (o) {
        return o.num === num || String(o.num).indexOf(q) === 0;
      });
      if (!found) {
        found = catalog.find(function (o) {
          return o.name.toLowerCase().indexOf(q) !== -1;
        });
      }
      if (found) centerOn(found, true);
    });
    searchInput.addEventListener("input", function () {
      var q = searchInput.value.trim().toLowerCase().replace(/^m/, "");
      if (!q) {
        highlightNum = selected ? selected.num : null;
        draw();
        return;
      }
      var num = parseInt(q, 10);
      var found = catalog.find(function (o) {
        return o.num === num;
      });
      if (found) {
        highlightNum = found.num;
        draw();
      }
    });
  }

  bgImg.addEventListener("load", onBgReady);
  if (bgImg.complete && bgImg.naturalWidth) {
    onBgReady();
  }

  function onBgReady() {
    if (bgImg.naturalWidth) {
      imgW = bgImg.naturalWidth;
      imgH = bgImg.naturalHeight;
    }
    resetView();
    viewReady = true;
    resizeCanvas();
  }

  fetch("messier-catalog.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      catalog = data;
      buildLegend();
      if (viewReady) draw();
    })
    .catch(function (err) {
      console.error("Messier catalog load failed:", err);
    });

  window.addEventListener("resize", function () {
    clampPan();
    resizeCanvas();
  });
  buildLegend();
})();
