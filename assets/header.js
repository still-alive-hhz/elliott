(function () {
  var path = location.pathname;
  var isPhoto = /^\/photo(\/|$)/.test(path);

  var header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML =
    '<a class="brand" href="/">Elliott</a>' +
    '<nav aria-label="主导航">' +
    '<a href="/"' + (isPhoto ? "" : ' class="is-active"') + ">Home</a>" +
    '<a href="/photo/"' + (isPhoto ? ' class="is-active"' : "") + ">Photo</a>" +
    "</nav>";

  document.body.prepend(header);
})();
