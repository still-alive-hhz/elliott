(function () {
  var items = window.PHOTO_ITEMS || [];
  var container = document.querySelector("#collections-container");
  var emptyState = document.querySelector("#collections-empty");

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

  var PAGE_MAP = {
    "洋县县城": "yangxian_town.html"
  };

  var tiles = document.createElement("div");
  tiles.className = "photo-tiles collection-tiles";

  groupNames.forEach(function (group, idx) {
    var photos = groups[group];
    var firstImg = photos[0].image;
    var page = PAGE_MAP[group] || (group + ".html");

    var tile = document.createElement("a");
    tile.className = "photo-tile collection-tile";
    tile.href = page;

    tile.innerHTML =
      '<img class="tile-bg-img" src="' + firstImg + '" alt="" loading="lazy">' +
      '<span class="tile-index">' + String(idx + 1).padStart(2, "0") + '</span>' +
      '<span class="tile-title">' + group + "</span>" +
      '<span class="tile-subtitle">Collection</span>' +
      '<span class="tile-stat">' + photos.length + " 张照片</span>";

    tiles.appendChild(tile);
  });

  container.appendChild(tiles);
})();
