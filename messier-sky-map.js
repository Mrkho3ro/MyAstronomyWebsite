/**
 * Interactive Messier sky map — pan/zoom all-sky view with category markers.
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
  var scale = 1;
  var minScale = 0.6;
  var maxScale = 6;
  var offsetX = 0;
  var offsetY = 0;
  var dragging = false;
  var dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
  var imgW = 3600;
  var imgH = 1800;
  var visibleCats = {};
  var selected = null;
  var highlightNum = null;
  var pinchDist = null;
  var didDrag = false;

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
    var x = (raHours / 24) * imgW;
    var y = ((90 - decDeg) / 180) * imgH;
    return { x: x, y: y };
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
    return {
      x: (wx - imgW / 2) * scale + cx + offsetX,
      y: (wy - imgH / 2) * scale + cy + offsetY,
    };
  }

  function screenToWorld(sx, sy) {
    var rect = viewport.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    return {
      x: (sx - cx - offsetX) / scale + imgW / 2,
      y: (sy - cy - offsetY) / scale + imgH / 2,
    };
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
    if (scale > 1.8 || isHighlight) {
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

  function centerOn(obj, zoom) {
    var pos = raDecToXY(obj.ra, obj.dec);
    var rect = viewport.getBoundingClientRect();
    if (zoom) scale = Math.min(maxScale, Math.max(2, scale));
    offsetX = -(pos.x - imgW / 2) * scale;
    offsetY = -(pos.y - imgH / 2) * scale;
    selected = obj;
    highlightNum = obj.num;
    draw();
  }

  function onWheel(e) {
    e.preventDefault();
    var rect = viewport.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var factor = e.deltaY < 0 ? 1.12 : 0.89;
    var newScale = Math.min(maxScale, Math.max(minScale, scale * factor));
    var ratio = newScale / scale;
    offsetX = mx - (mx - offsetX) * ratio;
    offsetY = my - (my - offsetY) * ratio;
    scale = newScale;
    draw();
  }

  viewport.addEventListener("wheel", onWheel, { passive: false });

  viewport.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    dragging = true;
    didDrag = false;
    dragStart = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
  });

  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    if (Math.abs(e.clientX - dragStart.x) > 3 || Math.abs(e.clientY - dragStart.y) > 3) {
      didDrag = true;
    }
    offsetX = dragStart.ox + (e.clientX - dragStart.x);
    offsetY = dragStart.oy + (e.clientY - dragStart.y);
    draw();
  });

  window.addEventListener("mouseup", function () {
    dragging = false;
  });

  viewport.addEventListener("click", function (e) {
    if (didDrag) return;
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
      if (e.touches.length === 1) {
        dragging = true;
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offsetX, oy: offsetY };
      } else if (e.touches.length === 2) {
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
      if (e.touches.length === 1 && dragging) {
        offsetX = dragStart.ox + (e.touches[0].clientX - dragStart.x);
        offsetY = dragStart.oy + (e.touches[0].clientY - dragStart.y);
        draw();
      } else if (e.touches.length === 2 && pinchDist) {
        var d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        var factor = d / pinchDist;
        scale = Math.min(maxScale, Math.max(minScale, scale * factor));
        pinchDist = d;
        draw();
      }
    },
    { passive: true }
  );

  viewport.addEventListener("touchend", function () {
    dragging = false;
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

  bgImg.addEventListener("load", function () {
    if (bgImg.naturalWidth) {
      imgW = bgImg.naturalWidth;
      imgH = bgImg.naturalHeight;
    }
    bgImg.style.transform = "translate(" + offsetX + "px," + offsetY + "px) scale(" + scale + ")";
    resizeCanvas();
  });

  function syncBgTransform() {
    var cx = viewport.clientWidth / 2;
    var cy = viewport.clientHeight / 2;
    bgImg.style.transformOrigin = cx + "px " + cy + "px";
    bgImg.style.transform = "translate(" + offsetX + "px," + offsetY + "px) scale(" + scale + ")";
  }

  var origDraw = draw;
  draw = function () {
    syncBgTransform();
    origDraw();
  };

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
