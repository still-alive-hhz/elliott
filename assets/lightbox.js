(function () {
  var overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.setAttribute("aria-hidden", "true");

  var img = document.createElement("img");
  img.className = "lightbox-img";
  img.alt = "";

  var closeBtn = document.createElement("button");
  closeBtn.className = "lightbox-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "关闭");

  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  function open(src, alt) {
    img.src = src;
    img.alt = alt || "";
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(function () { img.src = ""; }, 300);
  }

  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    close();
  });

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.getAttribute("aria-hidden") === "false") {
      close();
    }
  });

  document.addEventListener("click", function (e) {
    var card = e.target.closest(".photo-card");
    if (!card) return;
    if (e.target.tagName !== "IMG") return;

    var items = window.PHOTO_ITEMS || [];
    var photoId = card.dataset.photoId;
    var photo = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === photoId) { photo = items[i]; break; }
    }
    if (!photo) return;

    open(photo.image, photo.title);
  });
})();
