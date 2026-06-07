/* Streamgraph visualization using D3.js */

class StreamgraphChart {
    constructor(containerId, tooltipId) {
        this.containerId = containerId;
        this.tooltipId = tooltipId;
        this.margin = { top: 20, right: 30, bottom: 40, left: 30 };
        this.colors = {
            "Distance Sniper": "#ff2a5f",            // Neon Pink
            "Wrestling Controller": "#00f5ff",        // Cyan
            "Ground & Pound Grappler": "#2bff2b",    // Neon Green
            "Leg Kick Specialist": "#ffcc00",        // Gold
            "Clinch Boxer": "#9d3fff",                // Purple
            "Legacy / Historical (Limited Stats)": "#8c8c8c" // Grey
        };
        this.data = [];
        this.selectedYear = 2026;
        this.showLegacy = true;

        this.init();
    }

    init() {
        const container = d3.select(this.containerId);
        container.html(""); // clear loading

        const rect = container.node().getBoundingClientRect();
        this.width = (rect.width || 600) - this.margin.left - this.margin.right;
        this.height = Math.max(300, rect.height || 350) - this.margin.top - this.margin.bottom;

        this.svg = container.append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        // Add Year Marker line group
        this.markerGroup = this.svg.append("g").attr("class", "year-marker-group");
        this.markerLine = this.markerGroup.append("line")
            .attr("stroke", "#ff1234")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,2")
            .attr("y1", 0)
            .attr("y2", this.height)
            .style("opacity", 0.7);

        // Add interactive overlay
        this.svg.append("rect")
            .attr("class", "interactive-overlay")
            .attr("width", this.width)
            .attr("height", this.height)
            .style("fill", "none")
            .style("pointer-events", "all");
    }

    setData(data) {
        this.raw_data = data;
        this.update();
    }

    setYear(year) {
        this.selectedYear = year;
        this.updateMarker();
    }

    setShowLegacy(showLegacy) {
        this.showLegacy = showLegacy;
        this.update();
    }

    update() {
        if (!this.raw_data || this.raw_data.length === 0) return;

        // Clone and filter data based on legacy status
        const keys = Object.keys(this.colors).filter(k => {
            if (!this.showLegacy && k === "Legacy / Historical (Limited Stats)") return false;
            return true;
        });

        // Normalize rows to sum up to 100 for proper stream visualization
        const processedData = this.raw_data.map(d => {
            const row = { year: d.year };
            let sum = 0.0;
            keys.forEach(k => {
                row[k] = d[k] || 0.0;
                sum += row[k];
            });
            // Re-normalize percentage to fit 100%
            keys.forEach(k => {
                row[k] = sum > 0 ? (row[k] / sum) * 100.0 : 0.0;
            });
            return row;
        });

        // Set scales domains
        this.xScale.domain(d3.extent(processedData, d => d.year));
        this.yScale.domain([0, 100]); // percentage stream scale

        // Set Up Stack
        const stack = d3.stack()
            .keys(keys)
            .offset(d3.stackOffsetNone);

        const series = stack(processedData);

        // Map Areas
        const area = d3.area()
            .x(d => this.xScale(d.data.year))
            .y0(d => this.yScale(d[0]))
            .y1(d => this.yScale(d[1]))
            .curve(d3.curveBasis); // smooth stream curve

        // Render streams
        this.svg.selectAll(".layer-path").remove();
        
        const self = this;
        const tooltip = d3.select(this.tooltipId);

        const layers = this.svg.selectAll(".layer-path")
            .data(series)
            .enter()
            .append("path")
            .attr("class", "layer-path")
            .attr("d", area)
            .attr("fill", d => this.colors[d.key])
            .attr("opacity", 0.8)
            .style("transition", "opacity 0.2s")
            .on("mouseover", function(event, d) {
                d3.selectAll(".layer-path").attr("opacity", 0.3);
                d3.select(this).attr("opacity", 1.0);
                tooltip.style("display", "block");
            })
            .on("mousemove", function(event, d) {
                // Find nearest year using mouse x coordinate
                const mouseX = d3.pointer(event)[0];
                const year = Math.round(self.xScale.invert(mouseX));
                const record = processedData.find(r => r.year === year);
                
                if (record) {
                    const percentage = record[d.key].toFixed(1);
                    tooltip.html(`
                        <div class="fw-bold text-danger text-uppercase mb-1" style="border-bottom: 1px solid #444">${d.key}</div>
                        <div>Year: <span class="text-warning">${year}</span></div>
                        <div>Distribution: <span class="text-info">${percentage}%</span></div>
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px");
                }
            })
            .on("mouseout", function() {
                d3.selectAll(".layer-path").attr("opacity", 0.8);
                tooltip.style("display", "none");
            })
            .on("click", function(event, d) {
                // Dispatch event when stream is clicked to filter other charts!
                const customEvent = new CustomEvent("archetypeSelected", { detail: { archetype: d.key } });
                window.dispatchEvent(customEvent);
            });

        this.renderLegend();

        // Hover overlay interaction to let users click timeline directly
        this.svg.select(".interactive-overlay")
            .on("click", function(event) {
                const mouseX = d3.pointer(event)[0];
                const year = Math.round(self.xScale.invert(mouseX));
                const yearClamped = Math.max(1994, Math.min(2026, year));
                
                // Dispatch custom timeline event
                const yearEvent = new CustomEvent("timelineChange", { detail: { year: yearClamped } });
                window.dispatchEvent(yearEvent);
            });

        // Add axes
        this.svg.selectAll(".x-axis").remove();
        
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.format("d"))
            .ticks(8);

        this.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.height})`)
            .call(xAxis);

        this.updateMarker();
    }

    updateMarker() {
        if (!this.xScale || isNaN(this.xScale(this.selectedYear))) return;
        const xPos = this.xScale(this.selectedYear);
        this.markerLine
            .attr("x1", xPos)
            .attr("x2", xPos)
            .style("display", "block");
    }

    renderLegend() {
        this.svg.selectAll(".legend-group").remove();
        const archetypes = Object.keys(this.colors);
        const legend = this.svg.append("g")
            .attr("class", "legend-group")
            .attr("transform", `translate(${this.width - 155}, 10)`);

        archetypes.forEach((arch, i) => {
            const g = legend.append("g")
                .attr("transform", `translate(0, ${i * 18})`)
                .style("cursor", "pointer")
                .on("click", () => {
                    const customEvent = new CustomEvent("archetypeSelected", { detail: { archetype: arch } });
                    window.dispatchEvent(customEvent);
                });

            g.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", this.colors[arch])
                .attr("rx", 2);

            g.append("text")
                .attr("x", 18)
                .attr("y", 10)
                .attr("fill", "#8c8c8c")
                .style("font-family", "Roboto Mono, monospace")
                .style("font-size", "0.62rem")
                .text(arch);
        });
    }
}
