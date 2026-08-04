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
  var maxUserZoom = 5;
  var imgW = 4000;
  var imgH = 2000;
  var visibleCats = {};
  var selected = null;
  var highlightNum = null;
  var pinchDist = null;
  var viewReady = false;

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

  function getFitScale() {
    var rect = viewport.getBoundingClientRect();
    return Math.min(rect.width / imgW, rect.height / imgH);
  }

  function getTotalScale() {
    return getFitScale() * userZoom;
  }

  function getMapLayout() {
    var rect = viewport.getBoundingClientRect();
    var fitScale = Math.min(rect.width / imgW, rect.height / imgH);
    var totalScale = fitScale * userZoom;
    var scaledW = imgW * totalScale;
    var scaledH = imgH * totalScale;
    return {
      fitScale: fitScale,
      totalScale: totalScale,
      offsetX: (rect.width - scaledW) / 2,
      offsetY: (rect.height - scaledH) / 2,
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
    transformLayer.style.transform = "translate(-50%, -50%) scale(" + totalScale + ")";
  }

  function resetView() {
    userZoom = 1;
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
    if (selected) showPopup(selected);
  }

  function showPopup(obj) {
    var pos = raDecToXY(obj.ra, obj.dec);
    var scr = imageToScreen(pos.x, pos.y);
    var L = getMapLayout();
    var left = Math.min(Math.max(scr.x + 14, 8), L.vpW - 220);
    var top = Math.min(Math.max(scr.y - 80, 8), L.vpH - 100);
    popup.style.left = left + "px";
    popup.style.top = top + "px";
    popup.hidden = false;
    popup.innerHTML =
      '<img src="' +
      obj.thumb +
      '" alt="M' +
      obj.num +
      '" class="M-SkyMap-Popup-Img" />' +
      '<p class="M-SkyMap-Popup-Cap">M' +
      obj.num +
      " – " +
      formatType(obj.type) +
      "</p>" +
      '<a href="messier/M' +
      obj.num +
      '.html" class="M-SkyMap-Popup-Link">View details →</a>';
  }

  function formatType(t) {
    return t || "Unknown";
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
    applyTransform();
    draw();
  }

  function centerOn(obj, doZoom) {
    if (doZoom) userZoom = Math.min(maxUserZoom, Math.max(2.2, userZoom));
    selected = obj;
    highlightNum = obj.num;
    applyTransform();
    draw();
  }

  function onWheel(e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(userZoom * factor);
  }

  viewport.addEventListener("wheel", onWheel, { passive: false });

  viewport.addEventListener("click", function (e) {
    var rect = viewport.getBoundingClientRect();
    var hit = findAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      selected = hit;
      highlightNum = hit.num;
      draw();
    } else {
      selected = null;
      popup.hidden = true;
      draw();
    }
  });

  viewport.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length === 2) {
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
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
      }
    },
    { passive: true }
  );

  viewport.addEventListener("touchend", function () {
    pinchDist = null;
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
        highlightNum = null;
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

  window.addEventListener("resize", resizeCanvas);
  buildLegend();
})();
