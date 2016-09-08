"use strict";
//
// Data
//

var vectorScale = d3.scaleLinear().domain([0, 1]).range([-14, 14]);

var memoryData = [{ x: 0.4, y: 0.2 }, { x: 0.2, y: 0.2 }, { x: 0.1, y: 0.9 }, { x: 0.9, y: 0.9 }, { x: 0.4, y: 0.3 }];
var interpolationData = [0.3];
var shiftData = [0, 0.2, 0.8];
var previousAttentionData = [0, 0.2, 0, 0.2, 0.6];

//
// DOM
//

var html = d3.selectAll("#rnn-write-detail");
var svg = html.select("svg");
var svgBBox = svg.node().getBoundingClientRect();

var query = svg.selectAll("#query").style("opacity", 0);
var memory = svg.selectAll("#memory use").style("opacity", 0);
var shift = svg.selectAll("#shift use");

//
// Render
//

// Store positions of vectors
function cachePositions(selection) {
  selection.each(function (d) {
    var bBox = this.getBoundingClientRect();
    d.top = bBox.top - svgBBox.top;
    d.left = bBox.left - svgBBox.left;
    d.width = bBox.width;
  });
}

// Render new vector lines
function renderVector(selection) {
  selection.attr("transform", function (d) {
    return "translate(" + (d.left + d.width / 2 - vectorScale(d.x) / 2) + ", " + (d.top + d.width / 2 - vectorScale(d.y) / 2) + ")";
  }).attr("x2", function (d) {
    return vectorScale(d.x);
  }).attr("y2", function (d) {
    return vectorScale(d.y);
  }).attr("marker-end", "url(#arrowhead)").style("stroke", "grey");
}

// Memory
memory.data(memoryData);
cachePositions(memory);
var memoryVector = svg.selectAll(".memory-vector").data(memoryData).enter().append("line").attr("class", "memory-vector");
renderVector(memoryVector);

var queryData = [{ x: 0.7, y: 0.8 }];
query.data(queryData);
cachePositions(query);

var queryVector = svg.selectAll(".query-vector").data(queryData).enter().append("line").attr("class", "query-vector");

var clamp = d3.scaleLinear().clamp(true);

function redraw() {

  renderVector(queryVector);

  // Dot
  var dotData = memoryData.map(function (v) {
    return 2 * (v.x - 0.5) * 2 * (queryData[0].x - 0.5) + 2 * (v.y - 0.5) * 2 * (queryData[0].y - 0.5);
  });
  svg.selectAll("#dot use").data(dotData).attr("xlink:href", function (d) {
    return d < 0 ? "#array-negative-value" : "#array-positive-value";
  }).style("opacity", function (d) {
    return Math.abs(d);
  });

  // Softmax
  var expDotData = dotData.map(Math.exp);
  var softmaxData = expDotData.map(function (x) {
    return x / d3.sum(expDotData);
  });
  svg.selectAll("#softmax use").data(softmaxData).style("opacity", function (d) {
    return d;
  });

  // Interpolate
  svg.selectAll("#previous use").data(previousAttentionData).style("opacity", function (d) {
    return d;
  });

  svg.selectAll("#interpolate-amount").data(interpolationData).style("opacity", function (d) {
    return d;
  });

  var interpolateData = previousAttentionData.map(function (d, i) {
    return interpolationData * d + (1 - interpolationData) * softmaxData[i];
  });
  svg.selectAll("#interpolate use").data(interpolateData).style("opacity", function (d) {
    return d;
  });

  // Convolve
  shift.data(shiftData).style("opacity", function (d) {
    return d;
  });

  var convolveData = dotData.map(function (x) {
    return 0;
  });
  for (var n in shiftData) {
    for (var i in convolveData) {
      if (i - (1 - n) >= 0) {
        convolveData[i - (1 - n)] += shiftData[n] * interpolateData[i];
      }
    }
  }
  // = dotData;
  svg.selectAll("#convolve use").data(convolveData).style("opacity", function (d) {
    return d;
  });

  // Sharpen
  var sharpenData = convolveData.map(function (x) {
    return x * x;
  });
  sharpenData = sharpenData.map(function (x) {
    return x / d3.sum(sharpenData);
  });
  svg.selectAll("#new-attention use").data(sharpenData).style("opacity", function (d) {
    return d;
  });
}

svg.select("#query-hover").on("mousemove", function () {
  var bbox = svg.select("#query").node().getBoundingClientRect();
  var x = d3.event.clientX - bbox.left - bbox.width / 2;
  var y = d3.event.clientY - bbox.top - bbox.height / 2;
  //TODO: this clamping is awkward
  queryData[0].x = clamp((x + 25) / 50);
  queryData[0].y = clamp((y + 25) / 50);
  redraw();
});
svg.select("#interpolate-hover").on("mousemove", function () {
  var bbox = svg.select("#interpolate-amount").node().getBoundingClientRect();
  interpolationData = [Math.max(0, Math.min(1, (d3.event.clientX - bbox.left) / bbox.width))];
  redraw();
});
// .on("mouseout", function() {
//   interpolationData = [0.3];
//   redraw();
// });

svg.select("#shift-hover").on("mousemove", function () {
  //  shiftData = [0, 0.2, 0.8];
  shiftData = [];
  shift.each(function () {
    var bbox = this.getBoundingClientRect();
    var distance = Math.abs(bbox.left - d3.event.clientX + bbox.width / 2);
    shiftData.push(Math.exp(-distance / 25));
  });
  shiftData = shiftData.map(function (d) {
    return d / d3.sum(shiftData);
  });
  redraw();
});
redraw();
