mapboxgl.accessToken = 'pk.eyJ1IjoiYWNrZXJtYW5zaiIsImEiOiJjazhydDgyemIwNXhuM2VxejlvbDg0dm03In0.BX33WuCGqmsXjDS-k28mqQ';
const mapboxStyle = 'mapbox://styles/mapbox/dark-v10';
// const dataLink = 'https://data.humdata.org/hxlproxy/api/data-preview.csv?url=https%3A%2F%2Fraw.githubusercontent.com%2FCSSEGISandData%2FCOVID-19%2Fmaster%2Fcsse_covid_19_data%2Fcsse_covid_19_time_series%2Ftime_series_covid19_confirmed_global.csv&filename=time_series_covid19_confirmed_global.csv';
const dataLink = '../data/time_series_covid19_confirmed_global.csv';
const mapCenter = [31.4606, 20.7927];
const mapZoom = 1;
const slider = document.getElementById('slider');
const autorunCheckbox = document.getElementById('autorun');
const dateLabel = document.getElementById('dateLabel');
const radios = document.forms['visControls'].elements['speed'];

var map;
var dates;
var headers;
var autoRun;
var autorunning = true;
var jsonData;
var slowSpeed = 1500;
var mediumSpeed = 500;
var fastSpeed = 100;
var featureArray = [];
var currentMarkers = [];
var selectedDateIndex = 0;
var currentSpeed = mediumSpeed;

function csvToJson(csv){
    var lines = csv.split("\n");
    var result = [];
    headers = lines[0].split(",");
    for(var i = 1; i < lines.length; i++){
        var obj = {};
        var currentline = lines[i].split(',');
        for(var j = 0; j < headers.length; j++){
            obj[headers[j]] = currentline[j];
        }
        result.push(obj);
    }
    dates = headers.slice(4, headers.length);
    return JSON.stringify(result);
}

function buildMapFeaturesArray() {
    for(var i=0; i<jsonData.length; i++) {
        var feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [
                    jsonData[i].Long,
                    jsonData[i].Lat
                ]
            }
        }
        featureArray.push(feature);
    }
    return featureArray;
}

function setScaleOfMarker(val) {
    var scale = Math.round(100*Math.log(val)/Math.log(10))/100;
    // SAckerman - make these numbers vars..
    scale = scale * 20;
    scale = ((scale > 25) ? scale : 25);
    return scale;
};

function removeMarkersFromMap() {
    if (currentMarkers !== []) {
        for (var i = currentMarkers.length - 1; i >= 0; i--) {
          currentMarkers[i].remove();
        }
    }
}

function addMarkersToMap(dateIndex) {
    featureArray.forEach(function(marker, i) {
        if(parseInt(jsonData[i][dates[dateIndex]]) > 0) {
            var markerScale = setScaleOfMarker(jsonData[i][dates[dateIndex]]);
            var el = document.createElement('div');
            el.className = 'marker-container';
            el.innerHTML = '<div class="marker" style="width: ' + markerScale + 'px; height: ' + markerScale + 'px;"><span>' + jsonData[i][dates[dateIndex]] + '</span></div>'
            new mapboxgl.Marker(el)
            .setLngLat(marker.geometry.coordinates)
            .addTo(map);
            currentMarkers.push(el);
        }
    });
}

function killAutoPlay() {
    clearInterval(autoRun);
    autorunning = false;
    autorunCheckbox.checked = false;
}

function autoIncrementDate() {
    autorunCheckbox.checked = true;
    selectedDateIndex++;
    if(selectedDateIndex == dates.length) {
        selectedDateIndex = 0;
    }
    slider.value = selectedDateIndex;
    setDateOnMap(selectedDateIndex);
}

function setDateOnMap(dateIndex) {
    selectedDateIndex = dateIndex;
    dateLabel.textContent = 'Data for : ' + dates[dateIndex];
    removeMarkersFromMap();
    addMarkersToMap(dateIndex);
}

function init() {
    slider.setAttribute('max', dates.length - 1);
    setDateOnMap(0);
    autoRun = setInterval(autoIncrementDate, currentSpeed);
}

map = new mapboxgl.Map({
    container: 'map',
    style: mapboxStyle,
    center: mapCenter,
    zoom: mapZoom
});
 
map.on('load', function() {
    fetch(dataLink)
        .then(function(response) {
            return response.text();
        })
        .then(function(csvData) {
            jsonData = JSON.parse(csvToJson(csvData));
        map.addSource('covidCases', {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': buildMapFeaturesArray()
            }
        });
        map.on('move', killAutoPlay);
        map.on('zoom', killAutoPlay);
        init();
    });
});
    
slider.addEventListener('input', function(e) {
    killAutoPlay();
    selectedDateIndex = parseInt(e.target.value);
    setDateOnMap(selectedDateIndex);
});

autorunCheckbox.addEventListener('input', function(e) {
    if(autorunning) {
        killAutoPlay();
    } else {
        autorunning = true;
        autoRun = setInterval(autoIncrementDate, currentSpeed);
    }
});

for(var i = 0, max = radios.length; i < max; i++) {
    radios[i].onclick = function() {
        killAutoPlay();
        autorunCheckbox.checked = true;
        autorunning = true;
        currentSpeed = eval(this.value);
        autoRun = setInterval(autoIncrementDate, currentSpeed);
    }
}