/**
 * Interactive Messier sky map — fixed Milky Way background with zoomable markers.
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
  var canvas = container.querySelector(".M-SkyMap-Canvas");
  var bgImg = container.querySelector(".M-SkyMap-BG");
  var popup = container.querySelector(".M-SkyMap-Popup");
  var searchInput = container.querySelector(".M-SkyMap-Search-Input");
  var legendEl = container.querySelector(".M-SkyMap-Legend");
  var ctx = canvas.getContext("2d");

  var catalog = [];
  var zoom = 1;
  var minZoom = 0.55;
  var maxZoom = 6;
  var imgW = 3600;
  var imgH = 1800;
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

  function resetView() {
    zoom = 1;
  }

  function resizeCanvas() {
    var rect = viewport.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    draw();
  }

  function worldToScreen(wx, wy) {
    var rect = viewport.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    var bx = (wx / imgW) * rect.width;
    var by = (wy / imgH) * rect.height;
    return {
      x: (bx - cx) * zoom + cx,
      y: (by - cy) * zoom + cy,
    };
  }

  function drawMarker(x, y, cat, obj, isHighlight) {
    var catInfo = CATEGORIES[cat] || CATEGORIES.other;
    var r = (isHighlight ? 9 : 6) / Math.sqrt(Math.max(1, zoom * 0.65));
    r = Math.max(4, Math.min(r, isHighlight ? 11 : 8));
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
    if (zoom > 2.2 || isHighlight) {
      ctx.fillStyle = "#f0e0ff";
      ctx.font = "bold 10px Keania One, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("M" + obj.num, 0, -r - 4);
    }
    ctx.restore();
  }

  function draw() {
    var rect = viewport.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    catalog.forEach(function (obj) {
      if (!visibleCats[obj.category]) return;
      var pos = raDecToXY(obj.ra, obj.dec);
      var scr = worldToScreen(pos.x, pos.y);
      if (scr.x < -20 || scr.y < -20 || scr.x > rect.width + 20 || scr.y > rect.height + 20) return;
      var hi = highlightNum === obj.num || (selected && selected.num === obj.num);
      drawMarker(scr.x, scr.y, obj.category, obj, hi);
    });
    if (selected) showPopup(selected);
  }

  function showPopup(obj) {
    var pos = raDecToXY(obj.ra, obj.dec);
    var scr = worldToScreen(pos.x, pos.y);
    var rect = viewport.getBoundingClientRect();
    var left = Math.min(Math.max(scr.x + 14, 8), rect.width - 220);
    var top = Math.min(Math.max(scr.y - 80, 8), rect.height - 100);
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
      var scr = worldToScreen(pos.x, pos.y);
      var d = Math.hypot(scr.x - sx, scr.y - sy);
      if (d < bestD) {
        bestD = d;
        best = obj;
      }
    });
    return best;
  }

  function centerOn(obj, doZoom) {
    if (doZoom) zoom = Math.min(maxZoom, Math.max(1.8, zoom));
    selected = obj;
    highlightNum = obj.num;
    draw();
  }

  function onWheel(e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoom = Math.min(maxZoom, Math.max(minZoom, zoom * factor));
    draw();
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
        var factor = d / pinchDist;
        zoom = Math.min(maxZoom, Math.max(minZoom, zoom * factor));
        pinchDist = d;
        draw();
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
      resizeCanvas();
    })
    .catch(function (err) {
      console.error("Messier catalog load failed:", err);
    });

  window.addEventListener("resize", resizeCanvas);
  buildLegend();
})();
