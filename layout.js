fetch("header.html")
.then(r => r.text())
.then(html => {
    document.getElementById("header-placeholder").innerHTML = html;
});
