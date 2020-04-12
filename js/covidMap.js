mapboxgl.accessToken = 'pk.eyJ1IjoiYWNrZXJtYW5zaiIsImEiOiJjazhydDgyemIwNXhuM2VxejlvbDg0dm03In0.BX33WuCGqmsXjDS-k28mqQ';
const mapboxStyle = 'mapbox://styles/mapbox/dark-v10';
// const dataLink = 'https://data.humdata.org/hxlproxy/api/data-preview.csv?url=https%3A%2F%2Fraw.githubusercontent.com%2FCSSEGISandData%2FCOVID-19%2Fmaster%2Fcsse_covid_19_data%2Fcsse_covid_19_time_series%2Ftime_series_covid19_confirmed_global.csv&filename=time_series_covid19_confirmed_global.csv';
const outcomesLink = 'http://api.coronastatistics.live/timeline/global';
const dataLink = '/data/time_series_covid19_confirmed_global.csv';
const mapCenter = [31.4606, 20.7927];
const mapZoom = 1;
const scaleOffset = 20;
const minScale = 25;
const slider = document.getElementById('slider');
const autorunCheckbox = document.getElementById('autorun');
const dateLabel = document.getElementById('dateLabel');
const radios = document.forms['visControls'].elements['speed'];
const activeGraph = document.getElementById('active');
const recoveredGraph = document.getElementById('recovered');
const deathGraph = document.getElementById('deaths');
const activeTotal = document.getElementById('active-total');
const recoveredTotal = document.getElementById('recovered-total');
const deathTotal = document.getElementById('death-total');
const outcomesRequest = new XMLHttpRequest();

var map;
var dates;
var headers;
var autoRun;
var autorunning = true;
var jsonData;
var totalCases;
var slowSpeed = 1500;
var mediumSpeed = 500;
var fastSpeed = 100;
var outcomes = [];
var featureArray = [];
var currentMarkers = [];
var selectedDateIndex = 0;
var currentSpeed = mediumSpeed;
let mapReady = false;
let globalTimelineDataReady = false;

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
    scale = scale * scaleOffset;
    scale = ((scale > minScale) ? scale : minScale);
    return scale;
};

function removeMarkersFromMap() {
    if (currentMarkers !== []) {
        for (var i = currentMarkers.length - 1; i >= 0; i--) {
          currentMarkers[i].remove();
        }
    }
}

function addMarkersToMap() {
    featureArray.forEach(function(marker, i) {
        if(parseInt(jsonData[i][dates[selectedDateIndex]]) > 0) {
            var markerScale = setScaleOfMarker(jsonData[i][dates[selectedDateIndex]]);
            var el = document.createElement('div');
            el.className = 'marker-container';
            el.innerHTML = '<div class="marker" style="width: ' + markerScale + 'px; height: ' + markerScale + 'px;"><span>' + jsonData[i][dates[selectedDateIndex]] + '</span></div>'
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

function getGraphPercentage(val) {
    return val/totalCases*100;
}

function numberWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function updateStatusGraph() {
    activeTotal.innerHTML = numberWithCommas(outcomes[selectedDateIndex].cases);
    recoveredTotal.innerHTML = numberWithCommas(outcomes[selectedDateIndex].recovered);
    deathTotal.innerHTML = numberWithCommas(outcomes[selectedDateIndex].deaths);
    activeGraph.style.minWidth = getGraphPercentage(outcomes[selectedDateIndex].cases) + "%";
    recoveredGraph.style.minWidth = getGraphPercentage(outcomes[selectedDateIndex].recovered) + "%";
    deathGraph.style.minWidth = getGraphPercentage(outcomes[selectedDateIndex].deaths) + "%";
}

function setDateOnMap(dateIndex) {
    selectedDateIndex = dateIndex;
    dateLabel.textContent = 'Data for : ' + dates[dateIndex];
    removeMarkersFromMap();
    addMarkersToMap();
    updateStatusGraph();
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

function init() {
    if(mapReady && globalTimelineDataReady) {
        slider.setAttribute('max', dates.length - 1);
        setDateOnMap(0);
        autoRun = setInterval(autoIncrementDate, currentSpeed);
    } else {
        setTimeout(init, 500);
    }
}

map = new mapboxgl.Map({
    attributionControl: false,
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
        mapReady = true;
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

// Load outcomes
outcomesRequest.open('GET', outcomesLink, true);

outcomesRequest.onload = function() {
    var data = JSON.parse(outcomesRequest.responseText);
    for(var prop in data) {
        outcomes.push(data[prop]); 
    }
    globalTimelineDataReady = true;
    totalCases = outcomes[outcomes.length - 1].cases;
};

outcomesRequest.send();