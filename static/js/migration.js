/* Scatter Plot for The Great Migration with Intensity Contours using d3.js */

class MigrationScatterPlot {
    constructor(containerId, tooltipId) {
        this.containerId = containerId;
        this.tooltipId = tooltipId;
        this.margin = { top: 20, right: 30, bottom: 45, left: 45 };
        this.colors = {
            "Distance Sniper": "#ff2a5f",
            "Wrestling Controller": "#00f5ff",
            "Ground & Pound Grappler": "#2bff2b",
            "Leg Kick Specialist": "#ffcc00",
            "Clinch Boxer": "#9d3fff",
            "Legacy / Historical (Limited Stats)": "#8c8c8c"
        };
        this.data = [];
        this.activeYear = 2026;
        this.weightClass = "ALL";
        this.opacity = 0.5;
        this.showContours = false;
        this.showCentroids = true;

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

        // Static Scale Dimensions (keeps stable grid layout as slider scrubs!)
        this.xScale = d3.scaleLinear().domain([-15, 15]).range([0, this.width]);
        this.yScale = d3.scaleLinear().domain([-15, 15]).range([this.height, 0]);

        // Draw background grid lines
        this.svg.append("g")
            .attr("class", "grid-axis-lines")
            .selectAll(".grid-line")
            .data(d3.range(-15, 16, 5))
            .enter()
            .append("line")
            .attr("class", "grid-line")
            .attr("x1", d => this.xScale(d))
            .attr("x2", d => this.xScale(d))
            .attr("y1", 0)
            .attr("y2", this.height);

        this.svg.append("g")
            .attr("class", "grid-axis-lines-y")
            .selectAll(".grid-line")
            .data(d3.range(-15, 16, 5))
            .enter()
            .append("line")
            .attr("class", "grid-line")
            .attr("x1", 0)
            .attr("x2", this.width)
            .attr("y1", d => this.yScale(d))
            .attr("y2", d => this.yScale(d));

        // Group container folders
        this.contourGroup = this.svg.append("g").attr("class", "contours-group");
        this.centroidGroup = this.svg.append("g").attr("class", "centroids-group");
        this.dotsGroup = this.svg.append("g").attr("class", "fights-dots-group");

        // Add axes
        this.xAxisG = this.svg.append("g")
            .attr("class", "x-axis font-mono fs-8")
            .attr("transform", `translate(0,${this.height})`);

        this.yAxisG = this.svg.append("g")
            .attr("class", "y-axis font-mono fs-8");

        this.xAxisG.call(d3.axisBottom(this.xScale).ticks(6));
        this.yAxisG.call(d3.axisLeft(this.yScale).ticks(6));
    }

    setData(data) {
        this.data = data;
        // Pre-compute centroids per year to draw centroid lines
        this.precomputeHistoricalCentroids();
        this.update();
    }

    setYear(year) {
        this.activeYear = year;
        this.update();
    }

    setWeightClass(weight) {
        this.weightClass = weight;
        this.update();
    }

    setOpacity(o) {
        this.opacity = o;
        this.dotsGroup.selectAll(".fighter-dot").attr("opacity", this.opacity);
    }

    setShowContours(val) {
        this.showContours = val;
        this.update();
    }

    setShowCentroids(val) {
        this.showCentroids = val;
        this.update();
    }

    precomputeHistoricalCentroids() {
        this.centroidsHistory = {};
        const archs = Object.keys(this.colors);

        archs.forEach(arch => {
            this.centroidsHistory[arch] = [];
        });

        // Compute average for each archetype for active years (1994 - 2026)
        // This outlines the evolutionary curve line!
        for (let yr = 1994; yr <= 2026; yr++) {
            const yr_data = this.data.filter(d => d.year === yr);
            archs.forEach(arch => {
                const sub = yr_data.filter(d => d.archetype === arch);
                if (sub.length > 0) {
                    const avg_x = d3.mean(sub, d => d.pca_x);
                    const avg_y = d3.mean(sub, d => d.pca_y);
                    this.centroidsHistory[arch].push({ year: yr, x: avg_x, y: avg_y });
                }
            });
        }
    }

    update() {
        if (!this.data || this.data.length === 0) return;

        // Filter active dataset based on sliders and selectors
        let activePoints = this.data.filter(d => d.year === this.activeYear);
        if (this.weightClass !== "ALL") {
            activePoints = activePoints.filter(d => d.weight_class === this.weightClass);
        }

        // Auto Scale domain adjust dynamically to keep centered around active points
        const padding = 2;
        const x_extent = d3.extent(this.data, d => d.pca_x);
        const y_extent = d3.extent(this.data, d => d.pca_y);
        this.xScale.domain([x_extent[0] - padding, x_extent[1] + padding]);
        this.yScale.domain([y_extent[0] - padding, y_extent[1] + padding]);

        // Redraw Axes due to dynamic zooming ranges
        this.xAxisG.transition().duration(200).call(d3.axisBottom(this.xScale).ticks(6));
        this.yAxisG.transition().duration(200).call(d3.axisLeft(this.yScale).ticks(6));

        // 1. Render Density Contours (solving Visual Noise feedback)
        this.contourGroup.selectAll(".contour").remove();
        if (this.showContours && activePoints.length > 5) {
            // Apply kernel density estimator
            const contourGenerator = d3.contourDensity()
                .x(d => this.xScale(d.pca_x))
                .y(d => this.yScale(d.pca_y))
                .size([this.width, this.height])
                .bandwidth(18)
                .thresholds(6);

            const contours = contourGenerator(activePoints);

            this.contourGroup.selectAll(".contour")
                .data(contours)
                .enter()
                .append("path")
                .attr("class", "contour")
                .attr("d", d3.geoPath())
                .attr("fill", "rgba(0, 245, 255, 0.04)")
                .attr("stroke", "rgba(0, 245, 255, 0.12)")
                .attr("stroke-width", 1.2);
        }

        // 2. Render Centroid Tracks (showing evolution history)
        this.centroidGroup.selectAll("*").remove();
        if (this.showCentroids) {
            const lineGenerator = d3.line()
                .x(d => this.xScale(d.x))
                .y(d => this.yScale(d.y));

            Object.keys(this.colors).forEach(arch => {
                const history = this.centroidsHistory[arch] || [];
                // Only take history values up to the active year
                const visible_hist = history.filter(h => h.year <= this.activeYear);
                
                if (visible_hist.length > 1) {
                    // Draw moving track line
                    this.centroidGroup.append("path")
                        .datum(visible_hist)
                        .attr("fill", "none")
                        .attr("stroke", this.colors[arch])
                        .attr("stroke-width", 2.2)
                        .attr("stroke-dasharray", "3,3")
                        .attr("opacity", 0.6)
                        .attr("d", lineGenerator);

                    // Draw head centroid circle
                    const head = visible_hist[visible_hist.length - 1];
                    this.centroidGroup.append("circle")
                        .attr("cx", this.xScale(head.x))
                        .attr("cy", this.yScale(head.y))
                        .attr("r", 6)
                        .attr("fill", this.colors[arch])
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 1.5)
                        .attr("opacity", 0.95);
                }
            });
        }

        // 3. Render scatter points
        const self = this;
        const tooltip = d3.select(this.tooltipId);

        // Bind data
        const dots = this.dotsGroup.selectAll(".fighter-dot")
            .data(activePoints, d => d.fighter);

        // Exit old dots
        dots.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .remove();

        // Enter + Update
        dots.enter()
            .append("circle")
            .attr("class", "fighter-dot")
            .attr("opacity", 0)
            .attr("r", 0.5)
            .merge(dots)
            .transition()
            .duration(250)
            .attr("cx", d => this.xScale(d.pca_x))
            .attr("cy", d => this.yScale(d.pca_y))
            .attr("r", 4.5)
            .attr("opacity", this.opacity)
            .attr("fill", d => this.colors[d.archetype])
            .attr("stroke", "rgba(0, 0, 0, 0.5)")
            .attr("stroke-width", 0.8);

        // Rebind handlers
        this.dotsGroup.selectAll(".fighter-dot")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition().duration(100)
                    .attr("r", 7.5)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 1.5)
                    .attr("opacity", 1.0);
                
                tooltip.style("display", "block");
            })
            .on("mousemove", function(event, d) {
                tooltip.html(`
                    <div class="fw-bold text-uppercase mb-1" style="border-bottom:1px solid #444">${d.fighter}</div>
                    <div>Style: <span class="fw-bold" style="color:${self.colors[d.archetype]}">${d.archetype}</span></div>
                    <div>Weight: <span class="text-warning">${d.weight_class}</span></div>
                    <div>Career fights: <span class="text-info">${d.cumulative_fights}</span></div>
                    <div>Career wins: <span class="text-success">${Math.round(d.win_rate * 100)}%</span></div>
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .transition().duration(150)
                    .attr("r", 4.5)
                    .attr("stroke", "rgba(0, 0, 0, 0.5)")
                    .attr("stroke-width", 0.8)
                    .attr("opacity", self.opacity);
                
                tooltip.style("display", "none");
            })
            .on("click", function(event, d) {
                // When clicked, automatically load their profiles incomparison area!
                // Red vs Blue corners
                const compareEvent = new CustomEvent("fighterSelected", { detail: { name: d.fighter } });
                window.dispatchEvent(compareEvent);
            });
    }
}
