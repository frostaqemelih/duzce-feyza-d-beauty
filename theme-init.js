(function () {
  try {
    var t = localStorage.getItem('fdb-theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
