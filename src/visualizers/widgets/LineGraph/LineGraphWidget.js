/*globals define, d3, nv */
/*jshint browser: true*/

define([
    './lib/nv.d3.min',
    'css!./lib/nv.d3.min.css'
], function (
) {
    'use strict';

    var LineGraphWidget,
        WIDGET_CLASS = 'line-graph';

    LineGraphWidget = function (logger, container) {
        this._logger = logger.fork('Widget');

        this.$el = container;

        this.lineData = [];
        this._initialize();

        this._logger.debug('ctor finished');
    };

    LineGraphWidget.prototype._initialize = function () {
        // set widget class
        this.$el.addClass(WIDGET_CLASS);

        // Create the chart
        this.options = {};
        this.options.xAxis = null;
        this.options.yAxis = null;

        this.chart = null;
        this.$chart = d3.select(this.$el[0]).append('svg');
        nv.addGraph(() => {
            var chart = nv.models.lineChart()
                //.margin({left: 100})
                .useInteractiveGuideline(true)
                .showLegend(true)
                .showYAxis(true)
                .showXAxis(true);

            chart.xAxis
                .tickFormat(d3.format(',r'));

            if (this.options.xAxis) {
                chart.xAxis
                    .axisLabel(this.options.xAxis);
            }

            if (this.options.yAxis) {
                chart.yAxis
                    .axisLabel(this.options.yAxis);
            }

            var myData = this.getData();

            this.$chart
                .datum(myData)
                .call(chart);

            //Update the chart when window resizes.
            nv.utils.windowResize(() => chart.update());
            this.chart = chart;
            return chart;
        });

    };

    LineGraphWidget.prototype.getData = function () {
        return Object.keys(this.lineData).map(id => this.lineData[id]);
    };

    // Adding/Removing/Updating items
    LineGraphWidget.prototype.addNode = function (desc) {
        if (desc) {
            // Add node to a table of nodes
            if (desc.type === 'line') {
                this.lineData[desc.id] = {
                    key: desc.name,
                    values: desc.points
                };
            }
            this.updateChartData();
        }
    };

    LineGraphWidget.prototype.removeNode = function (id) {
        delete this.lineData[id];
        this.updateChartData();
    };

    LineGraphWidget.prototype.updateNode = function (desc) {
        if (desc && this.lineData[desc.id]) {
            this.lineData[desc.id].values = desc.points;
            this.lineData[desc.id].key = desc.name;
            this.updateChartData();
        }
    };

    LineGraphWidget.prototype.onWidgetContainerResize = function(width, height) {
        this.$el.css({
            width: width,
            height: height
        });
        this.updateChart();
    };

    LineGraphWidget.prototype.updateChartData = function () {
        if (this.$chart && this.chart) {
            this.$chart
                .datum(this.getData())
                .call(this.chart);
        }
    };

    LineGraphWidget.prototype.updateChart = function () {
        if (this.chart) {
            this.chart.update();
        }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    LineGraphWidget.prototype.destroy = function () {
    };

    LineGraphWidget.prototype.onActivate = function () {
        this._logger.debug('LineGraphWidget has been activated');
    };

    LineGraphWidget.prototype.onDeactivate = function () {
        this._logger.debug('LineGraphWidget has been deactivated');
    };

    return LineGraphWidget;
});
