importScripts('cache-polyfill.js');

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    // Return true if you want to remove this cache,
                    // but remember that caches are shared across
                    // the whole origin
                }).map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open('internapp').then(function(cache) {
            return cache.addAll([
                '/',
                'assets/custom/css/components.css',
                'assets/custom/css/pages.css',
                'assets/custom/img/logo.svg',
                'assets/custom/img/tia-logo.svg',
                'assets/custom/img/tia-logo-white.svg',
                'assets/custom/favicons/36.png',
                'assets/custom/favicons/48.png',
                'assets/custom/favicons/72.png',
                'assets/custom/favicons/96.png',
                'assets/custom/favicons/144.png',
                'assets/custom/favicons/192.png',
                'assets/custom/favicons/256.png',
                'assets/custom/favicons/384.png',
                'assets/custom/favicons/512.png',
                'assets/custom/js/components.js',
                'assets/custom/js/init.js',
                'assets/custom/js/localforage.min.js',
                'assets/custom/js/pages.js',
                'assets/custom/js/themes.js',
                'assets/custom/js/vcard.js',
                'assets/custom/js/instascan.min.js',
                'assets/custom/js/DetectRTC.min.js',

                'assets/vendor/font-awesome/css/fontawesome-all.min.css',
                'assets/vendor/font-awesome/webfonts/fa-brands-400.eot',
                'assets/vendor/font-awesome/webfonts/fa-brands-400.svg',
                'assets/vendor/font-awesome/webfonts/fa-brands-400.ttf',
                'assets/vendor/font-awesome/webfonts/fa-brands-400.woff',
                'assets/vendor/font-awesome/webfonts/fa-brands-400.woff2',
                'assets/vendor/font-awesome/webfonts/fa-regular-400.eot',
                'assets/vendor/font-awesome/webfonts/fa-regular-400.svg',
                'assets/vendor/font-awesome/webfonts/fa-regular-400.ttf',
                'assets/vendor/font-awesome/webfonts/fa-regular-400.woff',
                'assets/vendor/font-awesome/webfonts/fa-regular-400.woff2',

                'assets/vendor/framework7/css/framework7.material.colors.css',
                'assets/vendor/framework7/css/framework7.material.css',
                'assets/vendor/framework7/css/framework7.material.min.css',
                'assets/vendor/framework7/css/framework7.material.rtl.css',
                'assets/vendor/framework7/img/i-f7-material.png',
                'assets/vendor/framework7/js/framework7.js',
                'assets/vendor/framework7/js/framework7.js.map',
                'assets/vendor/framework7/js/framework7.min.js',
                'assets/vendor/framework7/js/framework7.min.js.map',

                'assets/vendor/framework7-plugins/indexed-list/framework7.indexed-list.css',
                'assets/vendor/framework7-plugins/indexed-list/framework7.indexed-list.js',

                'assets/vendor/google-fonts/roboto-slab/RobotoSlab-Bold.ttf',
                'assets/vendor/google-fonts/roboto-slab/RobotoSlab-Light.ttf',
                'assets/vendor/google-fonts/roboto-slab/RobotoSlab-Regular.ttf',
                'assets/vendor/google-fonts/roboto-slab/RobotoSlab-Thin.ttf',

                'assets/vendor/hamburgers/hamburgers.css',
                'assets/vendor/hamburgers/hamburgers.min.css',

                'assets/vendor/jquery/jquery-2.2.4.min.js',

                'assets/vendor/material-icons/material-icons.css',
                'assets/vendor/material-icons/MaterialIcons-Regular.eot',
                'assets/vendor/material-icons/MaterialIcons-Regular.ijmap',
                'assets/vendor/material-icons/MaterialIcons-Regular.svg',
                'assets/vendor/material-icons/MaterialIcons-Regular.ttf',
                'assets/vendor/material-icons/MaterialIcons-Regular.woff',
                'assets/vendor/material-icons/MaterialIcons-Regular.woff2',

                'assets/vendor/nectar/nectar.css',
                'assets/vendor/nectar/nectar.js',

                'assets/vendor/vivus/vivus.min.js',

                'assets/vendor/qrc/alignpat.js',
                'assets/vendor/qrc/bitmat.js',
                'assets/vendor/qrc/bmparser.js',
                'assets/vendor/qrc/datablock.js',
                'assets/vendor/qrc/databr.js',
                'assets/vendor/qrc/datamask.js',
                'assets/vendor/qrc/decoder.js',
                'assets/vendor/qrc/detector.js',
                'assets/vendor/qrc/errorlevel.js',
                'assets/vendor/qrc/findpat.js',
                'assets/vendor/qrc/formatinf.js',
                'assets/vendor/qrc/gf256.js',
                'assets/vendor/qrc/gf256poly.js',
                'assets/vendor/qrc/grid.js',
                'assets/vendor/qrc/qrcode.js',
                'assets/vendor/qrc/rsdecoder.js',
                'assets/vendor/qrc/version.js',

                'index.html',
                'login.html',
                'walkthrough.html',
                'home.html',
                'relasi.html',
                'relasi_capture.html',
            ]);
        })
    );
});

self.addEventListener('fetch', function(event) {
    console.log(event.request.url);
    event.respondWith(
        fetch(event.request).catch(function() {
            return caches.match(event.request);
        })
    );
});

