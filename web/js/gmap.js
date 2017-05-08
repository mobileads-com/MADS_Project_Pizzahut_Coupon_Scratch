// var mapApp = new mads();
// function directionClick (url) {
//     mapApp.linkOpener(url);

//     return false;
// } 

var map;

/*
 * Map object that takes configuration parameters as object
 *
 * Parameters:
 * id - unique identifier for the Map object
 * containerElement - HTML div element that we assign Map object to
 * componentData - parameter that consists of few properties below
 * componentData.addresses - array of locations to create Markers on the Map
 * componentData.zoom - map zoom level (0 - zoom out to show all addresses (default if user's current location not available), numeric value to determine km to zoom in according to user's current location)
 * componentData.mapType - type of the Map (can be ROADMAP, SATELLITE, HYBRID, TERRAIN)
 * customLocImg - custom location pointer image
 * customUserLocImg - custom user's location pointer image
 * */
var GMap = function(options) {
    this.id = options.id;
    this.containerElement = options.containerElement;
    this.componentData = options.componentData;
    this.markers = [];

    this.infoWindow = new google.maps.InfoWindow();

    // create and initialize the Map with Markers
    this.createMap();
};

/*
 * This method creates Map
 * */
GMap.prototype.createMap = function() {
    // Try HTML5 geolocation to get current user's location
    var that = this;
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            // here we have current user's location
            var userPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            var mapOptions = {
                mapTypeId: google.maps.MapTypeId[that.componentData.mapType]
            };

            map = new google.maps.Map(that.containerElement, mapOptions);

            // show current user's location
            that.createMarker(true, null, userPosition, 'Current user\'s location', 'Current user\'s location', that.componentData.customUserLocImg, map);

            // show all the locations from the addresses array
            var addresses = that.componentData.addresses;
            for (var i = 0; i < addresses.length; i++) {
                that.createMarker(true, userPosition, new google.maps.LatLng(addresses[i].lat, addresses[i].long), addresses[i].title, addresses[i].address, that.componentData.customLocImg, map);
            }

            // get correct zoom to show all the markers according to distance
            var new_boundary = new google.maps.LatLngBounds();
            if (that.componentData.zoom == 0) {
                // get such zoom to be able to see all the markers on the map
                for (var index in that.markers) {
                    new_boundary.extend(that.markers[index].position);
                }
            } else {
                for (var index in that.markers) {
                    // show markers that are in appropriate radius based on the zoom parameter
                    if (that.getDistanceInKm(userPosition, that.markers[index].position) <= that.componentData.zoom) {
                        new_boundary.extend(that.markers[index].position);
                    }
                }
            }
            map.fitBounds(new_boundary);
        }, function(error) {
            // this means that we can not get current user's location because of browser settings restriction
            console.log("Error: The Geolocation service failed. " + error.message);

            var addresses = that.componentData.addresses;
            var mapOptions = {
                mapTypeId: google.maps.MapTypeId[that.componentData.mapType]
            };

            map = new google.maps.Map(that.containerElement, mapOptions);

            // show all the locations from the addresses
            for (var i = 0; i < addresses.length; i++) {
                that.createMarker(true, null, new google.maps.LatLng(addresses[i].lat, addresses[i].long), addresses[i].title, addresses[i].address, that.componentData.customLocImg, map);
            }

            // get zoom to show all the markers
            var new_boundary = new google.maps.LatLngBounds();
            for (var index in that.markers) {
                new_boundary.extend(that.markers[index].position);
            }
            map.fitBounds(new_boundary);
        });

        /* Render Map */
        var addresses = that.componentData.addresses;
        var mapOptions = {
            mapTypeId: google.maps.MapTypeId[that.componentData.mapType]
        };

        map = new google.maps.Map(that.containerElement, mapOptions);

        // show all the locations from the addresses
        for (var i = 0; i < addresses.length; i++) {
            that.createMarker(true, null, new google.maps.LatLng(addresses[i].lat, addresses[i].long), addresses[i].title, addresses[i].address, that.componentData.customLocImg, map);
        }

        // get zoom to show all the markers
        var new_boundary = new google.maps.LatLngBounds();
        for (var index in that.markers) {
            new_boundary.extend(that.markers[index].position);
        }
        map.fitBounds(new_boundary);

    } else {
        console.log('Error: Your browser doesn\'t support geolocation.');
    }
};

/*
 * This method creates one marker
 * */
GMap.prototype.createMarker = function(show, currentUserLatLon, markerLatLon, title, address, icon, map) {
    var marker;
    var _this = this;

    // if icon is not set, then we will use default icon
    if (icon) {
        marker = new google.maps.Marker({
            position: markerLatLon,
            title: title,
            map: map,
            icon: icon
        });
    } else {
        marker = new google.maps.Marker({
            position: markerLatLon,
            title: title,
            map: map
        });
    }

    this.markers.push(marker);

    // create link for "href" attribute in "a" HTML element to be able to open Google Navigation with correct locations
    var link = this.createLinkToGoogleNavigation(currentUserLatLon, markerLatLon);
    // count distance between current user's location and marker's location
    var distance = this.getDistanceInKm(currentUserLatLon, markerLatLon);

    // handling click event on marker if it is not current user's location marker
    if (show) {
        google.maps.event.addListener(marker, 'click', function() {
            // create template for info popup
            // on this popup we can see location title, location address (this is set in configuration),
            // distance between current user's location and marker's location
            // and directions button that opens Google Navigation
            // if current user's location is available we will open Google Navigation with Directions from current user's location to marker's location
            // if current user's location is not available we will open Google Navigation with only marker's location parameters.
            // To see Directions in this case we should fill in To field on Google Navigation console
            var popupTemplate;
            if (currentUserLatLon == null) {
                popupTemplate = '<div class="marker-popup">' +
                    '<div class="directions">' +
                    '<a target="_blank" onclick="directionClick(\'' + link + '\')">' +
                    '<div class="directions-icon"></div>' +
                    '<p class="directions-button">Directions</p>' +
                    '</a>' +
                    '</div>' +
                    '<div class="location-info">' +
                    '<p class="info-title">' + title + '</p>' +
                    '<p class="info-address">' + address + '</p>' +
                    '</div>' +
                    '<div class="clear"></div>' +
                    '</div>';
            } else {
                popupTemplate = '<div class="marker-popup">' +
                    '<div class="directions">' +
                    '<a target="_blank" onclick="directionClick(\'' + link + '\')">' +
                    '<div class="directions-icon"></div>' +
                    '<p class="directions-button">Directions</p>' +
                    '</a>' +
                    '</div>' +
                    '<div class="location-info">' +
                    '<p class="info-title">' + title + '</p>' +
                    '<p class="info-address">' + address + '</p>' +
                    '<p class="info-address">Distance from current location is: ' + distance + 'km' + '</p>' +
                    '</div>' +
                    '<div class="clear"></div>' +
                    '</div>';
            }

            // initializing popup
            _this.infoWindow.setContent(popupTemplate);
            _this.infoWindow.setPosition(markerLatLon);
            _this.infoWindow.open(map);
        });
    }
};

/*
 * This method prepares url for "href" attribute in "a" HTML element in following way
 * http://maps.google.com/maps?saddr=49.8424334,24.025559899999962&daddr=49.831081,23.996779999999944
 * */
GMap.prototype.createLinkToGoogleNavigation = function(from, to) {
    var link = "http://maps.google.com/maps";
    var toLat = to.lat();
    var toLng = to.lng();

    if (from != null) {
        var fromLat = from.lat();
        var fromLng = from.lng();
        link += "?saddr=" + fromLat + "," + fromLng + "&daddr=" + toLat + "," + toLng;
    } else {
        link += "?saddr=" + toLat + "," + toLng;
    }

    return link;
};

/*
 * This method calculates distance between two locations in kilometers as decimal number with 2 fixed characters after dot
 * */
GMap.prototype.getDistanceInKm = function(latLngA, latLngB) {
    return latLngA != null ? (google.maps.geometry.spherical.computeDistanceBetween(latLngA, latLngB) / 1000).toFixed(2) : 0;
};

// demo with two Maps (one - with markers in Ukraine to be able to test whole functionality, and second - with markers in the USA)
function qqqq() {
    /* component instantiation with json format options */
    var container1 = document.getElementById('container1'); // a div element as the container of the generated map
    var gmap1 = new GMap({
        id: 'tab1',
        containerElement: container1,
        componentData: { // data for this component
            addresses: [
                { "title": "Ciputra Mall", "address": "Ciputra (Citraland) Mall Lt. 1, Jl. S. Parman Jakarta 11470", "lat": "-6.167855", "long": "106.786400" },
                { "title": "Citra Enam", "address": "Perumahan Citra 6 Blok L1 A, Citra Garden City Kel. Tegal Alur, Kec. Kalideres Jakarta Barat", "lat": "-6.126730", "long": "106.712925" },
                { "title": "Kemanggisan", "address": "Jl. Kemanggisan Raya 4, RT. 011 RW. 05, Kebon Jeruk, Jakarta Barat", "lat": "-6.194760", "long": "106.781797" },
                { "title": "Lokasari", "address": "Komplek Taman Hiburan Blok A No. 16 , Jl. Mangga Besar Raya No. 81, Kelurahan Tangki, Kecamatan Taman Sari, Jakarta Barat", "lat": "-6.147675", "long": "106.823679" },
                { "title": "Matahari Mall Tangerang", "address": "Mall Matahari Ground Floor LD 30 - 31, Jl. Daan Mogot Raya KM 16, Jakarta 11840", "lat": "-6.151517", "long": "106.714314" },
                { "title": "Puri Indah Mall", "address": "Puri Indah Mall Lt. 1, No. 101 Kembangan, Jakarta Barat 11610", "lat": "-6.188422", "long": "106.733580" },
                { "title": "Slipi Jaya Plaza", "address": "Slipi Jaya Plaza Lt. Dasar, Jl. S Parman Jakarta Barat 11480", "lat": "-6.189146", "long": "106.796368" },
                { "title": "Taman Anggrek Mall", "address": "Taman Anggrek Mall Lt. 3, Jl. S Parman Kav. 21, Jakarta Barat 11470", "lat": "-6.178835", "long": "106.792235" },
                { "title": "Taman Ratu Jakarta", "address": "Taman Ratu Indah Blok AA2 / 35, Jakarta Barat", "lat": "-6.169674", "long": "106.766626" },
                { "title": "JAKARTA PUSAT", "address": "Bendungan Hilir, Jl. Bendungan Hilir Raya No. 73, Jakarta Pusat 10210", "lat": "-6.210254", "long": "106.812400" },
                { "title": "Cempaka Putih", "address": "Jl. Cempaka Putih Raya No. 145, Jakarta Pusat 10510", "lat": "-6.176742", "long": "106.875000" },
                { "title": "Gajah Mada Plaza", "address": "Gajah Mada Plaza GF 65 - 75, Jl. Gajah Mada No. 19-26, Petojo Utara Jakarta Pusat 10130", "lat": "-6.160739", "long": "106.818342" },
                { "title": "Gunung Sahari", "address": "Golden Truly Superstore Lt. 1, Jl. Raya Gunung Sahari, Jakarta Pusat 10610", "lat": "-6.161432", "long": "106.838312" },
                { "title": "ITC Cempaka Mas", "address": "ITC Cempaka Mas LG No. 170, Jl. Letjend Suprapto Kav 1, Jakarta Pusat 10640", "lat": "-6.164835", "long": "106.877340" },
                { "title": "Juanda Jakarta", "address": "Jl. Ir. H Juanda Raya No.13 Rt 010 Rw 004 Kebon Kelapa, Gambir Jakarta Pusat. 10120", "lat": "-6.167255", "long": "106.828072" },
                { "title": "Mangga Dua Mall", "address": "Mangga Dua Mall Lt. Dasar & Lt 1, Jl. Mangga Dua Raya, Jakarta Utara 10730", "lat": "-6.137068", "long": "106.824602" },
                { "title": "Menara Cakrawala", "address": "Gedung Menara Cakrawala Lt. Dasar, Jl. MH Thamrin No. 9, Jakarta Pusat 10340", "lat": "-6.186761", "long": "106.823618" },
                { "title": "Segitiga Senen", "address": "Atrium Gedung Antiq, Jl. Senen Raya No. 135 , Jakarta Pusat 10410", "lat": "-6.176667", "long": "106.840712" },
                { "title": "JAKARTA SELATAN", "address": "Bintaro Veteran 2, Jl.RC Veteran No.27 RT 008 RW 01, Kelurahan Bintaro, Kec. Pesangrahan, Jakarta Selatan", "lat": "-6.262880", "long": "106.766257" },
                { "title": "Blok M Plaza", "address": "Gedung Blok M Plaza Lt. 2, Jl. Bulungan No. 76, Jakarta 12130", "lat": "-6.244081", "long": "106.797626" },
                { "title": "Buncit", "address": "Jl. Raya Buncit No. 2, Jakarta Selatan 12790", "lat": "-6.274601", "long": "106.830598" },
                { "title": "Carrefour Lebak Bulus", "address": "Jl Lebak Bulus Raya No.8, Pondok Pinang Jakarta Selatan 12310", "lat": "-6.287675", "long": "106.775897" },
                { "title": "Cilandak", "address": "Jl. Raya Cilandak KKO No. 59, Cilandak 12550", "lat": "-6.300522", "long": "106.814163" },
                { "title": "Gandaria City", "address": "Gandaria City Mall LG, Jl. KH M Syafii Hadzani No. 8, Jakarta Selatan 12240", "lat": "-6.244475", "long": "106.782978" },
                { "title": "Gatot Subroto Jakarta", "address": "Jl. Gatot Subroto Kav. 1000, Rt 10/Rw 01 (sebelah All Fresh), Pancoran Jakarta Selatan", "lat": "-6.241563", "long": "106.839620" },
                { "title": "Kalibata Plaza", "address": "Kalibata Plaza Ground Floor No. 141, Jl. Raya Kalibata Pasar Minggu, Jakarta Selatan 12750", "lat": "-6.257244", "long": "106.855743" },
                { "title": "Kemang", "address": "Jl. Kemang Raya No. 77, Jakarta Selatan 12730", "lat": "-6.268311", "long": "106.815945" },
                { "title": "Kota Kasablanka Mall", "address": "Kota Kasablanka Mall LG Unit 23, Jalan Kasablanka Raya Kav. 88", "lat": "-6.223391", "long": "106.843199" },
                { "title": "Kuningan", "address": "ITC Kuningan Ground Floor, Jl. DR. Prof. Satrio, Kuningan, Jakarta 12940", "lat": "-6.223069", "long": "106.825972" },
                { "title": "Lapangan Ross", "address": "Jln.Lapangan Ross Raya No. 127 B, Tebet Timur Jakarta 12820", "lat": "-6.224838", "long": "106.855347" },
                { "title": "Pasar Festival", "address": "Gedung Bakri Pesona Rasuna Lt. 1, Jl. Rasuna Said Kav. C22, Jakarta Selatan 12940", "lat": "-6.220742", "long": "106.832792" },
                { "title": "Permata Hijau", "address": "Ruko ITC Permata Hijau No. 6 - 7, Jl. Arteri Permata Hijau, Jakarta Selatan 12210", "lat": "-6.220910", "long": "106.782851" },
                { "title": "Semanggi Plaza", "address": "Semanggi Plaza Ground Floor, Jl. Jend. Sudirman Kav. 50 Jakarta 12930", "lat": "-6.219700", "long": "106.814482" },
                { "title": "Buaran Plaza", "address": "Buaran Plaza Ground Floor 35 - 36, Jl. I Gusti Ngurah Rai, Buaran Klender, Jakarta 13470", "lat": "-6.217867", "long": "106.923979" },
                { "title": "Cibubur Junction", "address": "Cibubur Junction Lt. Dasar, Jl. Raya Jambore No. 1 Cibubur", "lat": "-6.370164", "long": "106.886287" },
                { "title": "Tamini Square", "address": "Tamini Square Ground Floor, Jl. Raya Taman Mini Pinang Ranti, Jakarta Timur 13560", "lat": "-6.290668", "long": "106.881580" },
                { "title": "Ancol", "address": "Selasar Ancol Bay, Komp. Taman Impian Jaya Ancol, Jakarta Utara 14430", "lat": "-6.121987", "long": "106.843609" },
                { "title": "Artha Gading Mall", "address": "Mall Artha Gading GF B7/3-7, Jl. Yos Sudarso, Jakarta Utara 14240", "lat": "-6.146268", "long": "106.892443" },
                { "title": "Emporium Mall Pluit", "address": "Emporium Pluit CBD Pluit Blok S-6, Lt. 4 No. 22-23, Jl. Pluit Selatan Raya, Jakarta Utara 14440", "lat": "-6.127322", "long": "106.791090" },
                { "title": "Kelapa Gading Mall", "address": "Kelapa Gading Mall II Lt. Dasar, Jl. Boulevard No. 96, Jakarta Utara 14240", "lat": "-6.158625", "long": "106.906981" },
                { "title": "Kelapa Gading Mall 3", "address": "Kelapa Gading Mall 3 Lt. Dasar, Jl. Boulevard no. 96, Kelapa Gading Jakarta Utara, 14240", "lat": "-6.155849", "long": "106.908983" },
                { "title": "Mall of Indonesia", "address": "Mall of Indonesia Ground Floor, Jl. Boulevard Barat Raya, Kelapa Gading, Jakarta 14240", "lat": "-6.150802", "long": "106.892389" },
                { "title": "Pluit Village", "address": "Pluit Village Lt. Dasar No. F05, Jl. Pluit Indah Raya, Jakarta Utara 14440", "lat": "-6.116636", "long": "106.789831" },
                { "title": "Sunter Mall", "address": "Gedung Sunter Mall, Lt. 1 Kav. G7-11, Jl. Danau Sunter Utara, Jakarta Utara 14356 ", "lat": "-6.138131", "long": "106.870755" },

            ],
            zoom: 6, // map zoom level (0 - zoom out to show all addresses (default if user's current location not available), numeric value to determine km to zoom in according to user's current location)
            customLocImg: '../web/img/pin-location.png', // custom location pointer image
        }
    });
};