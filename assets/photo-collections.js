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
    "洋县县城": "yangxian_city.html"
  };

  var EN_MAP = {
    "洋县县城": "Yangxian Downtown"
  };

  var tiles = document.createElement("div");
  tiles.className = "photo-tiles collection-tiles";

  groupNames.forEach(function (group, idx) {
    var photos = groups[group];
    var imgs = photos.map(function (p) { return p.image; });
    var page = PAGE_MAP[group] || (group + ".html");
    var en = EN_MAP[group] || "Collection";

    var tile = document.createElement("a");
    tile.className = "photo-tile collection-tile";
    tile.href = page;

    var bgImg = document.createElement("img");
    bgImg.className = "tile-bg-img";
    bgImg.src = imgs[Math.floor(Math.random() * imgs.length)];

    tile.appendChild(bgImg);

    var index = document.createElement("span");
    index.className = "tile-index";
    index.textContent = String(idx + 1).padStart(2, "0");
    tile.appendChild(index);

    var title = document.createElement("span");
    title.className = "tile-title";
    title.textContent = group;
    tile.appendChild(title);

    var sub = document.createElement("span");
    sub.className = "tile-subtitle";
    sub.textContent = en;
    tile.appendChild(sub);

    var stat = document.createElement("span");
    stat.className = "tile-stat";
    stat.textContent = photos.length + " 张照片";
    tile.appendChild(stat);

    tiles.appendChild(tile);

    if (imgs.length > 1) {
      setInterval(function () {
        var preload = new Image();
        preload.onload = function () {
          bgImg.style.opacity = "0";
          var done = false;
          function onEnd() {
            if (done) return;
            done = true;
            bgImg.removeEventListener("transitionend", onEnd);
            bgImg.src = preload.src;
            bgImg.style.opacity = "1";
          }
          bgImg.addEventListener("transitionend", onEnd);
        };
        preload.src = imgs[Math.floor(Math.random() * imgs.length)];
      }, 6000);
    }
  });

  container.appendChild(tiles);
})();
