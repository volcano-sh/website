(function () {
    const links = document.getElementsByTagName('a')
    const currentUrl = location.href
    for (const link of links) {
        if (currentUrl.indexOf(link.href) !== -1) {
            link.classList.add('active')
        } else {
            if (currentUrl.indexOf("blog") !== -1 && link.href.indexOf("#posts") !== -1) {
                link.classList.add('active')
            }
        }
    }
}())