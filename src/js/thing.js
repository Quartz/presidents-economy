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
var MIN_DATE = new Date(2000, 0, 1);
var MAX_DATE = new Date(2021, 0, 1);
var TICK_VALUES = [
	MIN_DATE,
	new Date(2004, 0, 1),
	new Date(2008, 0, 1),
	new Date(2012, 0, 1),
	new Date(2016, 0, 1),
	new Date(2020, 0, 1)
];
var DISPLAY_ORDER = [
	'gdp',
	'unemployment',
	'labor',
	'poverty',
	'trade',
	'stocks',
	'wages',
	'budget',
	'debt',
	'coal'
]

var TERMS = [{
	'president': 'Clinton',
	'start': new Date(2000, 0, 1),
	'end': new Date(2000, 11, 31)
}, {
	'president': 'Bush',
	'start': new Date(2001, 0, 1),
	'end': new Date(2008, 11, 31)
}, {
	'president': 'Obama',
	'start': new Date(2009, 0, 1),
	'end': new Date(2016, 11, 31)
}, {
	'president': 'Trump',
	'start': new Date(2017, 0, 1),
	'end': new Date(2020, 11, 31)
}];

var PRESIDENTS = [{
	'name': 'Bush',
	'date': new Date(2005, 0, 1)
}, {
	'name': 'Obama',
	'date': new Date(2013, 0, 1)
}, {
	'name': 'Trump',
	'date': new Date(2019, 0, 1)
}];

var RECESSIONS = [{
	'start': new Date(2001, 0, 1),
	'end': new Date(2001, 11, 31)
}, {
	'start': new Date(2007, 9, 1),
	'end': new Date(2009, 5, 30)
}];

var RECESSION_LABELS = [
	new Date(2001, 6, 1),
	new Date(2008, 7, 1)
];

var graphicData = null;
var isMobile = false;

/**
 * Initialize the graphic.
 *
 * Fetch data, format data, cache HTML references, etc.
 */
function init() {
	var timestamp = (new Date()).getTime();
	request.json('data/metrics.json?t='+timestamp, function(error, data) {
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

	_.forEach(DISPLAY_ORDER, function(key) {
		var data = graphicData[key];

		var wrapper = container.append('div')
			.attr('id', key)
			.attr('class', 'chart-wrapper');

		wrapper.append('div')
			.attr('class', 'right-column clearfix')
			.append('h2')
				.text(data['metric']);

		wrapper.append('div')
			.attr('class', 'chart');

		wrapper.append('div')
			.attr('class', 'source')
			.html(data['frequency'] + ' data. <span class="source-link">&nbsp;&nbsp;&nbsp;Source: <a href="' + data['url'] + '">' + data['source'] + '</a></span>. <span class="last-updated">&nbsp;&nbsp;&nbsp;Last updated: ' + data['last_updated'] + '.</span> <span class="brand">&nbsp;&nbsp;&nbsp;Quartz | <a href="https://qz.com/">qz.com</a></span>');

		wrapper.append('div')
			.attr('class', 'right-column clearfix')
			.html(data['description']);
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
			data: graphicData[key],
			labelPresidents: (key == DISPLAY_ORDER[0])
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
	var aspectRatio = isMobile ? 2.5 / 1 : 5 / 1;

	var margins = {
		top: 25,
		right: 20,
		bottom: 30,
		left: 50
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
		.domain([ MIN_DATE, MAX_DATE ]);

	var yScale = d3.scale.linear()
		.range([chartHeight, 0])
		.domain([ config['data']['min'], config['data']['max'] ]);

	// Shading
	_.forEach(TERMS, function(term) {
		chartElement.append('rect')
			.attr('class', 'president ' + utils.classify(term['president']))
			.attr('x', xScale(term['start']))
			.attr('width', xScale(term['end']) - xScale(term['start']))
			.attr('y', 0)
			.attr('height', chartHeight);
	})

	_.forEach(RECESSIONS, function(recession) {
		chartElement.append('rect')
			.attr('class', 'recession')
			.attr('x', xScale(recession['start']))
			.attr('width', xScale(recession['end']) - xScale(recession['start']))
			.attr('y', 0)
			.attr('height', chartHeight + 30);
	})

	// Create axes
	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient('bottom')
		.tickValues(TICK_VALUES)
		.tickFormat(function(d) {
			return d.getFullYear();
		});

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient('left');

	if (config['data']['ticks']) {
		var tickValues = config['data']['ticks'];

		yAxis.tickValues(tickValues)
			.tickFormat(function(d) {
				if (d <= 0) {
					return d;
				}

				if (config['data']['show_plus']) {
					return '+' + d;
				}

				return d;
			});
	}

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
			.tickSize(-chartHeight, 0)
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

	if (config['data']['show_zero']) {
		chartElement.append('line')
			.attr('class', 'zero-line')
			.attr('x1', xScale(MIN_DATE))
			.attr('x2', xScale(MAX_DATE))
			.attr('y1', yScale(0))
			.attr('y2', yScale(0))
	}

	// Term lines
	_.forEach(TERMS, function(term, i) {
		if (i == 0) {
			return;
		}

		chartElement.append('line')
			.attr('class', 'term-start')
			.attr('x1', xScale(term['start']))
			.attr('x2', xScale(term['start']))
			.attr('y1', 0)
			.attr('y2', chartHeight)
	})

	// President labels
	if (config['labelPresidents']) {
		_.forEach(PRESIDENTS, function(president, i) {
			chartElement.append('text')
				.attr('class', 'president-label')
				.attr('x', xScale(president['date']))
				.attr('y', chartHeight * 3 / 4)
				.text(president['name']);
		})

		_.forEach(RECESSION_LABELS, function(recession, i) {
			chartElement.append('text')
				.attr('class', 'recession-label')
				.attr('transform', 'translate(' + xScale(recession) + ',' + (chartHeight / 2) + ')rotate(270)')
				.text('Recession');
		})
	}

	// Render lines
	var line = d3.svg.line()
		.interpolate('monotone')
		.x(function(d,i ) {
			return xScale(d['date']);
		})
		.y(function(d) {
			return yScale(d['value']);
		});

	chartElement.append('g')
		.attr('class', 'lines')
		.append('path')
		.attr('d', function(d) {
			return line(config['data']['data']);
		});

	// Label
	var bubble = chartElement.append('rect')
		.attr('class', 'label-bubble')
		.attr('x', xScale(MIN_DATE) - 9)
		.attr('y', -10)
		.attr('height', 20);

	var label = chartElement.append('text')
		.attr('class', 'label')
		.attr('x', xScale(MIN_DATE) - 9)
		.attr('y', yScale(config['data']['max']))
		.attr('dy', '.32em')
		.text(config['data']['label']);

	bubble.attr('width', label[0][0].getComputedTextLength() + 10)
}

// Bind on-load handler
$(document).ready(function() {
	init();
});
