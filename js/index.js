var vid = document.getElementById('videoel');
var overlay = document.getElementById('overlay');
var overlayCC = overlay.getContext('2d');

/********** check and set up video/webcam **********/

function enablestart() {
  var startbutton = document.getElementById('startbutton');
  startbutton.value = "start";
  startbutton.disabled = null;
}

/*var insertAltVideo = function(video) {
  if (supports_video()) {
    if (supports_ogg_theora_video()) {
      video.src = "../media/cap12_edit.ogv";
    } else if (supports_h264_baseline_video()) {
      video.src = "../media/cap12_edit.mp4";
    } else {
      return false;
    }
    //video.play();
    return true;
  } else return false;
}*/
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

// check for camerasupport
if (navigator.getUserMedia) {
  // set up stream

  var videoSelector = {video : true};
  if (window.navigator.appVersion.match(/Chrome\/(.*?) /)) {
    var chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
    if (chromeVersion < 20) {
      videoSelector = "video";
    }
  };

  navigator.getUserMedia(videoSelector, function( stream ) {
    if (vid.mozCaptureStream) {
      vid.mozSrcObject = stream;
    } else {
      vid.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
    }
    vid.play();
  }, function() {
    //insertAltVideo(vid);
    alert("There was some problem trying to fetch video from your webcam. If you have a webcam, please make sure to accept when the browser asks for access to your webcam.");
  });
} else {
  //insertAltVideo(vid);
  alert("This demo depends on getUserMedia, which your browser does not seem to support. :(");
}

vid.addEventListener('canplay', enablestart, false);

/*********** setup of emotion detection *************/

var ctrack = new clm.tracker({useWebGL : true});
ctrack.init(pModel);

function startVideo() {
  // start video
  vid.play();
  // start tracking
  ctrack.start(vid);
  // start loop to draw face
  drawLoop();
}

function drawLoop() {
  requestAnimFrame(drawLoop);
  overlayCC.clearRect(0, 0, 400, 300);
  //psrElement.innerHTML = "score :" + ctrack.getScore().toFixed(4);
  if (ctrack.getCurrentPosition()) {
    ctrack.draw(overlay);
  }
  var cp = ctrack.getCurrentParameters();

  var er = ec.meanPredict(cp);
  if (er) {
    updateData(er);
    for (var i = 0;i < er.length;i++) {
      if (er[i].value > 0.4) {
        document.getElementById('icon'+(i+1)).style.visibility = 'visible';
      } else {
        document.getElementById('icon'+(i+1)).style.visibility = 'hidden';
      }
    }
  }
}

var ec = new emotionClassifier();
ec.init(emotionModel);
var emotionData = ec.getBlank();

/************ d3 code for barchart *****************/

var margin = {top : 20, right : 20, bottom : 10, left : 40},
  width = 400 - margin.left - margin.right,
  height = 100 - margin.top - margin.bottom;

var barWidth = 30;

var formatPercent = d3.format(".0%");

var x = d3.scale.linear()
  .domain([0, ec.getEmotions().length]).range([margin.left, width+margin.left]);

var y = d3.scale.linear()
  .domain([0,1]).range([0, height]);

var svg = d3.select("#emotion_chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)

svg.selectAll("rect").
  data(emotionData).
  enter().
  append("svg:rect").
  attr("x", function(datum, index) { return x(index); }).
  attr("y", function(datum) { return height - y(datum.value); }).
  attr("height", function(datum) { return y(datum.value); }).
  attr("width", barWidth).
  attr("fill", "#2d578b");

svg.selectAll("text.labels").
  data(emotionData).
  enter().
  append("svg:text").
  attr("x", function(datum, index) { return x(index) + barWidth; }).
  attr("y", function(datum) { return height - y(datum.value); }).
  attr("dx", -barWidth/2).
  attr("dy", "1.2em").
  attr("text-anchor", "middle").
  text(function(datum) { return datum.value;}).
  attr("fill", "white").
  attr("class", "labels");

svg.selectAll("text.yAxis").
  data(emotionData).
  enter().append("svg:text").
  attr("x", function(datum, index) { return x(index) + barWidth; }).
  attr("y", height).
  attr("dx", -barWidth/2).
  attr("text-anchor", "middle").
  attr("style", "font-size: 12").
  text(function(datum) { return datum.emotion;}).
  attr("transform", "translate(0, 18)").
  attr("class", "yAxis");

var pagefeel = new Object();

function updateData(data) {
  // update
  var pKey = "positionY" + window.scrollY;

  if(!(pKey in pagefeel)) {
    pagefeel[pKey] = new Object();
    pagefeel[pKey]["count"] = 0;
    pagefeel[pKey]["emotions"] = {};
  }

  pagefeel[pKey]["count"]++;

  Object.keys(data).forEach(function(key,index) {
    // key: the name of the object key
    // index: the ordinal position of the key within the object
    // console.log(data[key]["emotion"] + " " + data[key]["value"]);
    if(!(data[key]["emotion"] in pagefeel[pKey]["emotions"])) {
      pagefeel[pKey]["emotions"][data[key]["emotion"]] = 0;
    }
    pagefeel[pKey]["emotions"][data[key]["emotion"]] += data[key]["value"]
  });

  var rects = svg.selectAll("rect")
    .data(data)
    .attr("y", function(datum) { return height - y(datum.value); })
    .attr("height", function(datum) { return y(datum.value); });
  var texts = svg.selectAll("text.labels")
    .data(data)
    .attr("y", function(datum) { return height - y(datum.value); })
    .text(function(datum) { return datum.value.toFixed(1);});

  // enter
  rects.enter().append("svg:rect");
  texts.enter().append("svg:text");

  // exit
  rects.exit().remove();
  texts.exit().remove();
}

/******** stats ********/

stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
document.getElementById('container').appendChild( stats.domElement );

// update stats on every iteration
document.addEventListener('clmtrackrIteration', function(event) {
  stats.update();
}, false);
