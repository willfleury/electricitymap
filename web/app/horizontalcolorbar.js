var d3 = require('d3');

function HorizontalColorbar(selector, d3ColorScale, d3TickFormat, d3TickValues) {
    this.PADDING_X = 13; // Inner padding allow place for the axis text
    this.PADDING_Y = 10; // Inner padding allow place for the axis text

    this.root = d3.select(selector);
    this.root.selectAll('*').remove();
    this.d3TickFormat = d3TickFormat;
    this.d3TickValues = d3TickValues;
    this.originalColorScale = d3ColorScale;
    this._setDomainAndRange(
        d3ColorScale.domain(),
        d3ColorScale.range ? d3ColorScale.range() : undefined)

    this.gColorbar = this.root.append('g')
        .attr('transform', 'translate(' + this.PADDING_X + ', 0)');
    
    if (this.scale.ticks) {
        // Linear scale

        // Create gradient
        this.gGradient = this.gColorbar.append('linearGradient')
            .attr('id', selector + 'gradient')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', '100%')
            .attr('y2', 0)

        // Create fill
        this.gColorbar.append('rect')
            .attr('class', 'gradient')
            .style('fill', 'url(#' + selector + 'gradient' + ')');

        // Prepare an invisible marker
        this.gColorbar.append('line')
            .attr('class', 'marker')
            .style('stroke', 'gray')
            .style('stroke-width', 2)
            .attr('y1', 0)
            .style('display', 'none');

    } else {
        // Ordinal scale

        // Prepare an invisible marker
        this.gColorbar.append('rect')
            .attr('class', 'marker')
            .style('stroke', 'gray')
            .style('stroke-width', 2)
            .style('fill', 'none')
            .attr('y', 0)
            .style('display', 'none');
    }

    // Draw a container around the colorbar
    this.gColorbar.append('rect')
        .attr('class', 'border')
        .attr('x', 0)
        .attr('y', 0)
        .style('fill', 'none')
        .style('stroke', 'gray')
        .style('stroke-width', 1)
        .attr('shape-rendering', 'crispEdges');

    // Prepare axis
    this.gColorbarAxis = this.gColorbar.append('g');

    return this;
}

HorizontalColorbar.prototype.render = function() {
    this.width = this.root.node().getBoundingClientRect().width;
    this.height = this.root.node().getBoundingClientRect().height;

    this.colorbarWidth = this.width - 2 * this.PADDING_X;
    this.colorbarHeight = this.height - 2 * this.PADDING_Y;

    var that = this;

    if (this.scale.ticks) {
        // Linear scale
        var pixelRelativeScale = d3.scaleLinear()
            .domain([d3.min(this._domain), d3.max(this._domain)])
            .range([0, 1]);
        this.scale
            .range(this._domain.map(function (d, i) {
                return pixelRelativeScale(d) * that.colorbarWidth;
            }));

        // Place the colors on the gradient
        var stops = this.gGradient.selectAll('stop')
            .data(this.colors);
        stops.enter()
            .append('stop')
        .merge(stops)
            .attr('offset', function(d, i) { 
                return i / (that.colors.length - 1);
            })
            .attr('stop-color', function (d) { return d; });
        // Add a rect with the gradient
        this.gColorbar.select('rect.gradient')
            .attr('width', this.colorbarWidth)
            .attr('height', this.colorbarHeight);

    } else {
        // Ordinal scale
        this.scale.rangeBands([0, this.colorbarWidth]);
        this.deltaOrdinal = this.colorbarWidth / this.scale.range().length;
        this.gColorbar.selectAll('rect')
            .data(this.scale.range())
            .enter()
                .append('rect')
                .attr('x', function(d, i) { return i * that.deltaOrdinal; })
                .attr('width', this.deltaOrdinal)
                .attr('y', 0)
                .attr('height', this.colorbarHeight)
                .style('fill', function(d, i) { return that.colors[i];});
    }

    // Prepare an invisible marker
    if (this.scale.ticks) {
        this.gColorbar.select('line')
            .attr('y2', this.colorbarHeight)
    } else {
        this.gColorbar.select('rect')
            .attr('width', this.deltaOrdinal)
    }

    // Draw a container around the colorbar
    this.gColorbar.select('rect.border')
        .attr('width', this.colorbarWidth)
        .attr('height', this.colorbarHeight);

    // Draw the horizontal axis
    var axis = d3.axisBottom(this.scale)
        .tickSizeInner(this.colorbarHeight / 2.0)
        .tickPadding(3).ticks(7);
    if (this.d3TickFormat)
        axis.tickFormat(this.d3TickFormat);
    if (this.d3TickValues)
        axis.tickValues(this.d3TickValues);
    
    this.gColorbarAxis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0, ' + (this.colorbarHeight) + ')')
        .call(axis)
    this.gColorbarAxis.selectAll('.tick text')
        .attr('fill', 'gray');
    this.gColorbarAxis.selectAll('.tick line')
            .style('stroke', 'gray')
            .style('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges')
    this.gColorbarAxis.select('path')
            .style('fill', 'none')
            .style('stroke', 'none');

    return this;
}

HorizontalColorbar.prototype.currentMarker = function(d) {
    if (d !== undefined) {
        if (this.scale.ticks) {
            // Linear
            this.gColorbar.select('.marker')
                .attr('x1', this.scale(d))
                .attr('x2', this.scale(d))
                .style('display', 'block')
        } else {
            // Ordinal
            this.gColorbar.select('.marker')
                .attr('x', this.scale(d))
                .attr('width', this.delta)
                .style('display', 'block')
        }
    } else {
        this.gColorbar.select('.marker')
            .style('display', 'none')
    }
    return this;
}

HorizontalColorbar.prototype.markerColor = function(arg) {
    this.gColorbar.select('.marker')
        .style('stroke', arg);
    return this;
}

HorizontalColorbar.prototype.domain = function(arg) {
    if (!arg) return this._domain;
    this._setDomainAndRange(arg, undefined);
    return this;
}

HorizontalColorbar.prototype._setDomainAndRange = function(d, r) {
    var that = this;

    this._domain = d;
    this.colors = r ?
        r :
        d3.range(10).map(function(i) { 
            var e = d3.extent(that._domain);
            return that.originalColorScale(d3.interpolate(e[0], e[1])(i / (10 - 1)));
        });
    this.scale = d3.scaleLinear()
        .range(this.colors)
        .domain(this._domain);
}

module.exports = HorizontalColorbar;
