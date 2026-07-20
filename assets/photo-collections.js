(function () {
  var items = window.PHOTO_ITEMS || [];
  var container = document.querySelector("#collections-container");
  var emptyState = document.querySelector("#collections-empty");

  /* ---- group by collection ---- */

  var groups = {};
  items.forEach(function (photo) {
    var col = photo.collection;
    if (!col) return;
    if (!groups[col]) groups[col] = [];
    groups[col].push(photo);
  });

  var groupNames = Object.keys(groups).sort();

  if (!groupNames.length) {
    emptyState.hidden = false;
    return;
  }

  /* ---- shared EXIF cache (also used by photo-all.js) ---- */

  if (!window._EXIF_CACHE) window._EXIF_CACHE = new Map();

  /* ---- render utilities (mirrors photo-all.js for independence) ---- */

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

  /* ---- render groups ---- */

  groupNames.forEach(function (group) {
    var photos = groups[group];

    var section = document.createElement("section");
    section.className = "collection-group";

    var header = document.createElement("div");
    header.className = "collection-header";
    header.innerHTML =
      '<p class="kicker">Collection</p>' +
      '<h2>' + group + "</h2>" +
      '<p class="collection-sub">' + photos.length + " 张照片" +
      ' &middot; <a href="/photo/all/">查看全部 &rarr;</a></p>';

    var grid = document.createElement("div");
    grid.className = "photo-grid";

    section.append(header);
    section.append(grid);
    container.append(section);

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
  });
})();
