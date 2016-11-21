// NPM modules
var d3 = require('d3');
var request = require('d3-request');
var _ = require('lodash');

// Local modules
var features = require('./detectFeatures')();
var fm = require('./fm');
var utils = require('./utils');

// Globals
var DEFAULT_WIDTH = 940;
var MOBILE_BREAKPOINT = 600;

var graphicData = null;
var isMobile = false;

/**
 * Initialize the graphic.
 *
 * Fetch data, format data, cache HTML references, etc.
 */
function init() {
	request.json('data/metrics.json', function(error, data) {
		graphicData = formatData(data);

		makeHTML();
		render();
		$(window).resize(utils.throttle(onResize, 250));
	});
}

/**
 * Format data or generate any derived variables.
 */
function formatData(data) {
	_.forIn(data, function(value, key) {
		var date_format = d3.time.format('%Y-%m-%d');

		if (value['frequency'] == 'Annual') {
			date_format = d3.time.format('%Y');
		} else if (value['frequency'] == 'Monthly') {
			date_format = d3.time.format('%Y-%m');
		}

		_.forEach(value['data'], function(d) {
			d['date'] = date_format.parse(d['period']);
		});
	});

	return data;
}

/**
 * Create DOM elements for charts.
 */
function makeHTML() {
	var container = d3.select('#charts');

	_.forIn(graphicData, function(value, key) {
		var wrapper = container.append('div')
			.attr('id', key)
			.attr('class', 'chart-wrapper');

		wrapper.append('h2')
			.text(value['metric']);

		wrapper.append('div')
			.attr('class', 'chart');
	});
}

/**
 * Invoke on resize. By default simply rerenders the graphic.
 */
function onResize() {
	render();
}

/**
 * Figure out the current frame size and render the graphic.
 */
function render() {
	var width = $('#interactive-content').width();

	if (width <= MOBILE_BREAKPOINT) {
		isMobile = true;
	} else {
		isMobile = false;
	}

	_.forIn(graphicData, function(value, key) {
		renderGraphic({
			container: '#' + key + ' .chart',
			width: width,
			data: graphicData[key]['data']
		});
	});

	// Inform parent frame of new height
	fm.resize()
}

/*
 * Render the graphic.
 */
function renderGraphic(config) {
	// Configuration
	var aspectRatio = 5 / 1;

	var margins = {
		top: 10,
		right: 20,
		bottom: 50,
		left: 30
	};

	// Calculate actual chart dimensions
	var width = config['width'];
	var height = width / aspectRatio;

	var chartWidth = width - (margins['left'] + margins['right']);
	var chartHeight = height - (margins['top'] + margins['bottom']);

	// Clear existing graphic (for redraw)
	var containerElement = d3.select(config['container']);
	containerElement.html('');

	// Create the root SVG element
	var chartWrapper = containerElement.append('div')
		.attr('class', 'graphic-wrapper');

	var chartElement = chartWrapper.append('svg')
		.attr('width', chartWidth + margins['left'] + margins['right'])
		.attr('height', chartHeight + margins['top'] + margins['bottom'])
		.append('g')
		.attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

	// Create scales
	var xScale = d3.time.scale()
		.range([0, chartWidth])
		.domain(d3.extent(config['data'], function(d) {
			return d['date'];
		}));

	var yScale = d3.scale.linear()
		.range([chartHeight, 0])
		.domain(d3.extent(config['data'], function(d) {
			return d['value'];
		}));

	// Create axes
	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient('bottom');

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient('left');

	// Render axes
	var xAxisElement = chartElement.append('g')
		.attr('class', 'x axis')
		.attr('transform', utils.makeTranslate(0, chartHeight))
		.call(xAxis);

	var yAxisElement = chartElement.append('g')
		.attr('class', 'y axis')
		.call(yAxis);

	// Render axes grids
	var xAxisGrid = function() {
		return xAxis;
	};

	xAxisElement.append('g')
		.attr('class', 'x grid')
		.call(xAxisGrid()
			.tickSize(chartHeight, 0)
			.tickFormat('')
		);

	var yAxisGrid = function() {
		return yAxis;
	};

	yAxisElement.append('g')
		.attr('class', 'y grid')
		.call(yAxisGrid()
			.tickSize(-chartWidth, 0)
			.tickFormat('')
		);

	// Render lines
	var line = d3.svg.line()
		.interpolate('monotone')
		.x(function(d) {
			return xScale(d['date']);
		})
		.y(function(d) {
			return yScale(d['value']);
		});

	chartElement.append('g')
		.attr('class', 'lines')
		.append('path')
		.attr('d', function(d) {
			return line(config['data']);
		});
}

// Bind on-load handler
$(document).ready(function() {
	init();
});
