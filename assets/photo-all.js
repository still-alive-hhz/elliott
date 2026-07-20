(function () {
  var items = window.PHOTO_ITEMS || [];
  var locConfig = window.LOCATION_CONFIG;
  var levels = locConfig.levels;

  /* ---- location helpers ---- */

  function getLocationValue(photo, level) {
    var loc = window.getPhotoLocation(photo);
    return loc[level] || "";
  }

  function getLocationValues(arr, level) {
    return arr.map(function (p) { return getLocationValue(p, level); }).filter(Boolean);
  }

  function dedup(arr) {
    return arr.filter(function (v, i) { return arr.indexOf(v) === i; });
  }

  /* ---- determine visible levels ---- */

  function getVisibleLevels() {
    var startIdx = levels.length;
    for (var i = 0; i < levels.length; i++) {
      var vals = dedup(getLocationValues(items, levels[i]));
      if (vals.length > 1) {
        startIdx = i;
        break;
      }
    }
    if (startIdx > 0) startIdx--;

    return levels.slice(startIdx).filter(function (level) {
      return items.some(function (p) { return !!getLocationValue(p, level); });
    });
  }

  var visibleLevels = getVisibleLevels();

  /* ---- DOM refs ---- */

  var locSelects = {};
  levels.forEach(function (level) {
    locSelects[level] = document.querySelector("#loc-" + level);
  });

  var monthFilter = document.querySelector("#month-filter");
  var orderFilter = document.querySelector("#order-filter");
  var grid = document.querySelector("#photo-grid");
  var count = document.querySelector("#result-count");
  var emptyState = document.querySelector("#empty-state");

  /* ---- initialise visible location labels ---- */

  var visibleIdx = {};
  visibleLevels.forEach(function (level, idx) {
    visibleIdx[level] = idx;
  });

  levels.forEach(function (level) {
    var label = locSelects[level].parentNode;
    if (visibleLevels.indexOf(level) !== -1) {
      label.removeAttribute("hidden");
    }
  });

  /* ---- cascading options ---- */

  function getAvailableForLevel(level) {
    var idx = visibleIdx[level];
    if (idx === undefined) return [];

    var filtered = items.slice();

    for (var i = 0; i < idx; i++) {
      var parentLevel = visibleLevels[i];
      var parentVal = locSelects[parentLevel].value;
      if (!parentVal) return [];
      filtered = filtered.filter(function (p) {
        return getLocationValue(p, parentLevel) === parentVal;
      });
    }

    return dedup(getLocationValues(filtered, level));
  }

  function populateSelect(level) {
    var select = locSelects[level];
    if (!select || visibleLevels.indexOf(level) === -1) return;

    var values = getAvailableForLevel(level);
    var isCountry = level === "country";

    if (isCountry) {
      select.innerHTML = '<option value="中国">中国</option>';
      select.value = "中国";
      return;
    }

    select.innerHTML = '<option value="">不限</option>';

    values.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  visibleLevels.forEach(function (level) {
    populateSelect(level);
  });

  /* ---- location change handler ---- */

  visibleLevels.forEach(function (level, idx) {
    locSelects[level].addEventListener("change", function () {
      for (var j = idx + 1; j < visibleLevels.length; j++) {
        locSelects[visibleLevels[j]].value = "";
        populateSelect(visibleLevels[j]);
      }
      render();
    });
  });

  /* ---- populate other filters ---- */

  var MONTH_LABELS = {
    "01": "1月", "02": "2月", "03": "3月", "04": "4月",
    "05": "5月", "06": "6月", "07": "7月", "08": "8月",
    "09": "9月", "10": "10月", "11": "11月", "12": "12月"
  };

  function monthLabel(value) {
    if (!value) return "";
    var parts = value.split("-");
    return parts[0] + "年" + (MONTH_LABELS[parts[1]] || parts[1]);
  }

  var months = dedup(items.map(function (p) { return p.month; })).sort().reverse();

  months.forEach(function (m) {
    var opt = document.createElement("option");
    opt.value = m;
    opt.textContent = monthLabel(m);
    monthFilter.append(opt);
  });

  /* ---- EXIF cache ---- */

  if (!window._EXIF_CACHE) window._EXIF_CACHE = new Map();

  /* ---- filter / sort ---- */

  function matchesLocation(photo) {
    for (var i = 0; i < visibleLevels.length; i++) {
      var level = visibleLevels[i];
      var sel = locSelects[level].value;
      if (!sel) continue;
      if (getLocationValue(photo, level) !== sel) return false;
    }
    return true;
  }

  function matchesPhoto(photo) {
    var month = monthFilter.value;

    if (!matchesLocation(photo)) return false;
    if (month && photo.month !== month) return false;
    return true;
  }

  function sortPhotos(photos) {
    var order = orderFilter.value;
    if (!order) return photos;

    return photos.slice().sort(function (a, b) {
      var aTime = new Date(a.date).getTime();
      var bTime = new Date(b.date).getTime();
      return order === "newest" ? bTime - aTime : aTime - bTime;
    });
  }

  /* ---- render ---- */

  function render() {
    var photos = sortPhotos(items.filter(matchesPhoto));
    grid.innerHTML = "";
    count.textContent = photos.length + " 张照片";
    emptyState.hidden = photos.length > 0;

    photos.forEach(function (photo) {
      var card = document.createElement("article");
      card.className = "photo-card";
      card.dataset.photoId = photo.id;
      card.innerHTML =
        '<img src="' + photo.image + '" alt="' + photo.title + '" loading="lazy">' +
        '<div class="photo-card-copy">' +
        '<h2>' + photo.title + "</h2>" +
        '<div class="photo-location-row">' +
        '<p class="photo-location">' + window.getLocationDisplay(photo) + "</p>" +
        (photo.note ? '<button class="photo-note-trigger" aria-label="札记">札记</button>' : "") +
        "</div>" +
        (photo.note ? '<div class="photo-note-popover" hidden><p class="photo-note-text">' + photo.note + "</p></div>" : "") +
        '<p class="photo-date">' + formatDate(photo.date) + "</p>" +
        '<dl class="photo-meta" aria-label="拍摄参数"></dl>' +
        "</div>";
      grid.append(card);
      if (photo.note) {
        var trigger = card.querySelector(".photo-note-trigger");
        var popover = card.querySelector(".photo-note-popover");
        trigger.addEventListener("click", function (e) {
          e.stopPropagation();
          popover.hidden = !popover.hidden;
        });
      }
      renderMeta(card, photo.fallbackMeta || {});
      hydrateExif(card, photo);
    });
  }

  function formatDate(value) {
    if (!value) return "";
    return value.split("-").filter(Boolean).join(".");
  }

  function metaItems(meta) {
    return [
      ["相机", meta.camera],
      ["镜头", meta.lens],
      ["光圈", meta.aperture],
      ["快门", meta.shutter],
      ["ISO", meta.iso],
      ["焦距", meta.focalLength]
    ].filter(function (pair) { return pair[1]; });
  }

  function renderMeta(card, meta) {
    var list = card.querySelector(".photo-meta");
    var items = metaItems(meta);
    list.hidden = items.length === 0;
    list.innerHTML = items.map(function (pair) {
      return '<div><dt>' + pair[0] + "</dt><dd>" + pair[1] + "</dd></div>";
    }).join("");
  }

  async function hydrateExif(card, photo) {
    if (!window.readPhotoExif) return;

    var cached = window._EXIF_CACHE.get(photo.image);
    if (cached !== undefined) {
      applyExif(card, photo, cached);
      return;
    }

    var exif = await window.readPhotoExif(photo.image);
    window._EXIF_CACHE.set(photo.image, exif);
    if (!document.body.contains(card)) return;
    applyExif(card, photo, exif);
  }

  function applyExif(card, photo, exif) {
    var merged = {};
    var fallback = photo.fallbackMeta || {};
    Object.keys(fallback).forEach(function (k) { merged[k] = fallback[k]; });
    Object.keys(exif).forEach(function (k) {
      if (exif[k]) merged[k] = exif[k];
    });
    renderMeta(card, merged);
  }

  /* ---- event binding ---- */

  [monthFilter, orderFilter].forEach(function (el) {
    el.addEventListener("change", render);
  });

  render();
})();
