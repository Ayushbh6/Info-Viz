/* Normalized Radar charts implementation using D3.js */

class RadarChart {
    constructor(containerId, axesKeys, displayLabels) {
        this.containerId = containerId;
        this.axesKeys = axesKeys; // e.g. ['head_tar_pct', 'body_tar_pct', 'leg_tar_pct']
        this.labels = displayLabels; // e.g. ['Head', 'Body', 'Leg']
        this.margin = { top: 35, right: 35, bottom: 35, left: 35 };
        this.colors = {
            f1: "rgba(255, 18, 52, 0.45)",  // Semi-transparent Crimson (Red corner)
            f1_stroke: "#ff1234",
            f2: "rgba(13, 110, 253, 0.45)", // Semi-transparent Blue (Blue corner)
            f2_stroke: "#0d6efd"
        };
        this.f1_data = null;
        this.f2_data = null;

        this.init();
    }

    init() {
        const container = d3.select(this.containerId);
        container.html(""); // clear

        const rect = container.node().getBoundingClientRect();
        this.width = (rect.width || 250) - this.margin.left - this.margin.right;
        this.height = Math.max(220, rect.height || 220) - this.margin.top - this.margin.bottom;
        this.radius = Math.min(this.width, this.height) / 2;

        this.svg = container.append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${(this.width / 2) + this.margin.left},${(this.height / 2) + this.margin.top})`);

        this.rScale = d3.scaleLinear().domain([0, 100]).range([0, this.radius]);

        this.drawGrid();
    }

    drawGrid() {
        // Draw concentric circle grid rings (20%, 40%, 60%, 80%, 100%)
        const levels = 5;
        this.svg.selectAll(".grid-ring").remove();
        
        for (let i = 1; i <= levels; i++) {
            const r = this.radius * (i / levels);
            this.svg.append("circle")
                .attr("class", "grid-ring")
                .attr("r", r)
                .attr("fill", "none")
                .attr("stroke", "rgba(255,255,255,0.06)")
                .attr("stroke-width", 0.8);

            // Ring text labels
            this.svg.append("text")
                .attr("x", 4)
                .attr("y", -r + 10)
                .attr("fill", "rgba(255,255,255,0.55)")
                .style("font-family", "Roboto Mono, monospace")
                .style("font-size", "0.62rem")
                .text(`${(i / levels) * 100}%`);
        }

        // Draw radial spokes lines & axis labels
        const totalAxes = this.axesKeys.length;
        this.angleSlice = (Math.PI * 2) / totalAxes;

        this.svg.selectAll(".grid-spoke").remove();
        this.svg.selectAll(".axis-label").remove();

        for (let i = 0; i < totalAxes; i++) {
            const angle = this.angleSlice * i - Math.PI / 2;
            const x = Math.cos(angle) * this.radius;
            const y = Math.sin(angle) * this.radius;

            this.svg.append("line")
                .attr("class", "grid-spoke")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", x)
                .attr("y2", y)
                .attr("stroke", "rgba(255,255,255,0.12)")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "2,2");

            // Text labels positioned slightly outside the radius
            const labelFactor = 1.18;
            const lx = Math.cos(angle) * (this.radius * labelFactor);
            const ly = Math.sin(angle) * (this.radius * (labelFactor - 0.05));

            this.svg.append("text")
                .attr("class", "axis-label")
                .attr("x", lx)
                .attr("y", ly)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .attr("fill", "#f5f5f7")
                .style("font-family", "Rajdhani, sans-serif")
                .style("font-size", "0.78rem")
                .style("font-weight", "bold")
                .text(this.labels[i]);
        }
    }

    setProfiles(f1_profile, f2_profile) {
        this.f1_data = f1_profile;
        this.f2_data = f2_profile;
        this.update();
    }

    // Map raw career-average values into a 0–100 radar axis.
    // kd_avg scales by 180× so 0.55 KDs/fight ≈ 100 (empirical max across UFC).
    // sub_att_avg scales by 120× so 0.83 subs/fight ≈ 100.
    // ctrl_pct is already 0–1 so multiplied by 100.
    // Other percentage columns are already 0–100.
    normalizeValue(key, profile) {
        if (!profile) return 0;
        let val = parseFloat(profile[key]);
        if (isNaN(val)) return 0;

        // Special scaling for grappling/output ratios to stay beautifully within 0-100 range
        if (key === 'ctrl_pct') {
            return Math.min(100, val * 100.0);
        }
        if (key === 'kd_avg') {
            return Math.min(100, val * 180.0); // scale knockdowns
        }
        if (key === 'sub_att_avg') {
            return Math.min(100, val * 120.0); // scale submission attempts
        }
        return Math.min(100, Math.max(0, val));
    }

    update() {
        this.svg.selectAll(".radar-shape").remove();
        this.svg.selectAll(".radar-node").remove();

        const totalAxes = this.axesKeys.length;
        const lineGenerator = d3.lineRadial()
            .radius(d => this.rScale(d.value))
            .angle((d, i) => i * this.angleSlice)
            .curve(d3.curveLinearClosed);

        // 1. Draw Fighter 1 shape (Red corner)
        if (this.f1_data) {
            const f1_coords = this.axesKeys.map((key, i) => {
                return { value: this.normalizeValue(key, this.f1_data) };
            });

            this.svg.append("path")
                .datum(f1_coords)
                .attr("class", "radar-shape")
                .attr("d", lineGenerator)
                .attr("fill", this.colors.f1)
                .attr("stroke", this.colors.f1_stroke)
                .attr("stroke-width", 2.0)
                .attr("opacity", 0)
                .transition().duration(250)
                .attr("opacity", 1);

            // Mini Circles nodes
            f1_coords.forEach((coord, i) => {
                const angle = this.angleSlice * i - Math.PI / 2;
                const r = this.rScale(coord.value);
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;

                this.svg.append("circle")
                    .attr("class", "radar-node")
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", 3.5)
                    .attr("fill", this.colors.f1_stroke)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 0.8);
            });
        }

        // 2. Draw Fighter 2 shape (Blue corner)
        if (this.f2_data) {
            const f2_coords = this.axesKeys.map((key, i) => {
                return { value: this.normalizeValue(key, this.f2_data) };
            });

            this.svg.append("path")
                .datum(f2_coords)
                .attr("class", "radar-shape")
                .attr("d", lineGenerator)
                .attr("fill", this.colors.f2)
                .attr("stroke", this.colors.f2_stroke)
                .attr("stroke-width", 2.0)
                .attr("opacity", 0)
                .transition().duration(250)
                .attr("opacity", 1);

            // Mini Circles nodes
            f2_coords.forEach((coord, i) => {
                const angle = this.angleSlice * i - Math.PI / 2;
                const r = this.rScale(coord.value);
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;

                this.svg.append("circle")
                    .attr("class", "radar-node")
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", 3.5)
                    .attr("fill", this.colors.f2_stroke)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 0.85);
            });
        }
    }
}
