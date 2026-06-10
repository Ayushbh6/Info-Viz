/* Main JavaScript Orchestrator for The Octagon Archetypes Dashboard */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Dashboard State
    window.state = {
        activeYear: 2026,
        activeWeight: "ALL",
        isPlaying: false,
        playInterval: null,
        fightersProfiles: [], // static collection
        selectedF1: null, // Red profile
        selectedF2: null  // Blue profile
    };

    // 2. Instantiate Chart Visual Objects
    window.streamChart = new StreamgraphChart("#streamgraph-chart", "#stream-tooltip");
    window.scatterPlot = new MigrationScatterPlot("#migration-chart", "#scatter-tooltip");
    
    window.targetRadar = new RadarChart(
        "#radar-targets", 
        ['head_tar_pct', 'body_tar_pct', 'leg_tar_pct'], 
        ['Head Strike', 'Body Strike', 'Leg Strike']
    );
    window.tacticRadar = new RadarChart(
        "#radar-tactics", 
        ['dist_pos_pct', 'clinch_pos_pct', 'ground_pos_pct'], 
        ['Distance %', 'Clinch %', 'Ground %']
    );
    window.grappleRadar = new RadarChart(
        "#radar-grappling", 
        ['ctrl_pct', 'td_pct', 'sig_str_pct', 'kd_avg', 'sub_att_avg'], 
        ['Control Time', 'TD Acc %', 'Strike Acc %', 'KD Power', 'Sub Rate %']
    );

    // 3. Fetch data collections initially
    fetchStreamgraphData();
    fetchFighterYears();
    fetchFighterProfiles();

    // 4. Set Up Interactive Event Listeners
    setupControls();
    setupAutocomplete("search-f1", "f1-results", "f1");
    setupAutocomplete("search-f2", "f2-results", "f2");

    // 5. Cross-Chart Interactive Notifications (Brushing & Linking)
    window.addEventListener("timelineChange", (e) => {
        const yr = e.detail.year;
        d3.select("#year-slider").property("value", yr);
        updateTimelineYear(yr);
    });

    window.addEventListener("archetypeSelected", (e) => {
        const arch = e.detail.archetype;
        // Cross-filter scatter: briefly highlight dots belonging to this archetype
        d3.selectAll(".fighter-dot")
            .attr("stroke", d => d.archetype === arch ? "#fff" : "rgba(0,0,0,0.5)")
            .attr("stroke-width", d => d.archetype === arch ? 1.6 : 0.8)
            .attr("r", d => d.archetype === arch ? 6.5 : 3.2);
    });

    window.addEventListener("fighterSelected", (e) => {
        const name = e.detail.name;
        // Try filling empty or alternate corner, defaulting to RED first then BLUE
        if (!window.state.selectedF1) {
            loadFighterInCorner(name, "f1");
        } else if (!window.state.selectedF2) {
            loadFighterInCorner(name, "f2");
        } else {
            // Replace Red corner, select Blue as new Red
            loadFighterInCorner(name, "f1");
        }
    });
});

/* Fetch API aggregations */
function fetchStreamgraphData() {
    fetch('/api/streamgraph')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Streamgraph API failure:", data.error);
                return;
            }
            window.streamChart.setData(data);
        })
        .catch(err => console.error("Error fetching stream:", err));
}

function fetchFighterYears() {
    fetch('/api/fighter_years')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Fighter snapshots API failure:", data.error);
                return;
            }
            window.scatterPlot.setData(data);
        })
        .catch(err => console.error("Error fetching snapshots:", err));
}

function fetchFighterProfiles() {
    fetch('/api/fighter_profiles')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Profiles API failure:", data.error);
                return;
            }
            window.state.fightersProfiles = data;
            
            // Set default compare on page load (Khabib vs Conor)
            loadFighterInCorner("KHABIB NURMAGOMEDOV", "f1");
            loadFighterInCorner("CONOR MCGREGOR", "f2");
        })
        .catch(err => console.error("Error fetching profiles:", err));
}

/* Timeline era labeling */
function getHistoricalEraLabel(year) {
    if (year <= 2000) {
        return "Vale-Tudo Pioneer Era";
    } else if (year <= 2005) {
        return "Zuffa Expansion Era";
    } else if (year <= 2015) {
        return "Championship Growth Era";
    } else {
        return "Modern Hybrid Era";
    }
}

/* Unified Timeline sweep update */
function updateTimelineYear(year) {
    window.state.activeYear = year;
    d3.select("#year-display").text(year);
    d3.select("#era-label").text(getHistoricalEraLabel(year));
    
    // Update chart marks
    window.streamChart.setYear(year);
    window.scatterPlot.setYear(year);
}

/* UI Controls Hub wiring */
function setupControls() {
    // Year Slider Input
    d3.select("#year-slider").on("input", function() {
        const yr = parseInt(this.value);
        updateTimelineYear(yr);
    });

    // Weight class selection dropdown
    d3.select("#filter-weight").on("change", function() {
        const weight = this.value;
        window.state.activeWeight = weight;
        window.scatterPlot.setWeightClass(weight);
    });

    // Toggle legacy band
    d3.select("#toggle-legacy").on("change", function() {
        window.streamChart.setShowLegacy(this.checked);
    });

    // Point Opacity Slider
    d3.select("#opacity-slider").on("input", function() {
        window.scatterPlot.setOpacity(parseFloat(this.value));
    });

    // Checkboxes Density Contours and Centroids
    d3.select("#cb-contours").on("change", function() {
        window.scatterPlot.setShowContours(this.checked);
    });

    d3.select("#cb-centroids").on("change", function() {
        window.scatterPlot.setShowCentroids(this.checked);
    });

    // Play/Pause button execution Loop (Watch the 30-year sweep!)
    d3.select("#btn-play").on("click", function() {
        const btn = d3.select(this);
        
        if (window.state.isPlaying) {
            // Pause
            clearInterval(window.state.playInterval);
            window.state.isPlaying = false;
            btn.html('<i class="fa-solid fa-play"></i> <span class="ms-1 d-none d-sm-inline">Play</span>');
            btn.classed("btn-danger", true).classed("btn-warning", false);
        } else {
            // Play Loop
            window.state.isPlaying = true;
            btn.html('<i class="fa-solid fa-pause"></i> <span class="ms-1 d-none d-sm-inline">Pause</span>');
            btn.classed("btn-danger", false).classed("btn-warning", true);

            let currentYear = parseInt(d3.select("#year-slider").property("value"));
            if (currentYear >= 2026) {
                currentYear = 1994; // Reset to start if currently at the very end
                d3.select("#year-slider").property("value", currentYear);
                updateTimelineYear(currentYear);
            }

            window.state.playInterval = setInterval(() => {
                currentYear++;
                if (currentYear > 2026) {
                    // Reached the end: Stop playing automatically
                    clearInterval(window.state.playInterval);
                    window.state.isPlaying = false;
                    btn.html('<i class="fa-solid fa-play"></i> <span class="ms-1 d-none d-sm-inline">Play</span>');
                    btn.classed("btn-danger", true).classed("btn-warning", false);
                    return;
                }
                d3.select("#year-slider").property("value", currentYear);
                updateTimelineYear(currentYear);
            }, 600); // 600ms per year frame transition duration
        }
    });
}

/* Autocomplete Implementation */
function setupAutocomplete(inputId, dropdownId, corner) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    input.addEventListener("input", function() {
        const term = this.value.trim().toUpperCase();
        dropdown.innerHTML = "";

        if (!term || term.length < 2) {
            dropdown.style.display = "none";
            return;
        }

        // Filter fighter index collection
        const matches = window.state.fightersProfiles.filter(p => 
            p.fighter.toUpperCase().includes(term)
        ).slice(0, 10); // Limit dropdown to top 10 matches for neat layout

        if (matches.length === 0) {
            dropdown.style.display = "none";
            return;
        }

        matches.forEach(match => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.innerText = `${match.fighter} (${match.weight_class})`;
            
            item.addEventListener("click", () => {
                input.value = match.fighter;
                dropdown.style.display = "none";
                loadFighterInCorner(match.fighter, corner);
            });
            dropdown.appendChild(item);
        });

        dropdown.style.display = "block";
    });

    // Close dropdowns if clicked outside the target elements
    document.addEventListener("click", (e) => {
        if (e.target !== input && e.target !== dropdown) {
            dropdown.style.display = "none";
        }
    });
}

/* Fetch detailed comparative records and fill info cards + update Radars */
function loadFighterInCorner(name, corner) {
    if (!name) return;
    
    // Set text input values
    const searchInput = document.getElementById(corner === "f1" ? "search-f1" : "search-f2");
    if (searchInput) searchInput.value = name;

    const loaderUrl = `/api/compare?${corner}=${encodeURIComponent(name)}`;
    
    fetch(loaderUrl)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Comparison load failure:", data.error);
                return;
            }
            
            const profile = data[corner];
            if (!profile) return;

            // 1. Update overall active comparison state
            if (corner === "f1") {
                window.state.selectedF1 = profile;
            } else {
                window.state.selectedF2 = profile;
            }

            // 2. Fill Brief text card nodes
            fillFighterCard(profile, corner);

            // 3. Update the 3 Radar overlays
            updateRadars();
        })
        .catch(err => console.error("Error loading comparison details:", err));
}

/* Card Content Filling Node helpers */
function fillFighterCard(profile, corner) {
    const cardName = document.getElementById(`${corner}-card-name`);
    const cardArch = document.getElementById(`${corner}-card-arch`);
    const cardClass = document.getElementById(`${corner}-card-class`);
    const cardRecord = document.getElementById(`${corner}-card-record`);
    const cardPhys = document.getElementById(`${corner}-card-phys`);

    if (cardName) cardName.innerText = profile.fighter;
    if (cardArch) {
        cardArch.innerText = profile.archetype;
        // Apply styling colors
        let archColor = "#8c8c8c";
        if (profile.archetype === "Distance Sniper") archColor = "#ff2a5f";
        else if (profile.archetype === "Wrestling Controller") archColor = "#00f5ff";
        else if (profile.archetype === "Ground & Pound Grappler") archColor = "#2bff2b";
        else if (profile.archetype === "Leg Kick Specialist") archColor = "#ffcc00";
        else if (profile.archetype === "Clinch Boxer") archColor = "#9d3fff";
        cardArch.style.color = archColor;
    }
    if (cardClass) cardClass.innerText = profile.weight_class;
    
    const winRate = Math.round(profile.win_rate * 100);
    if (cardRecord) cardRecord.innerText = `${profile.total_fights} bouts (${winRate}% Winner)`;

    // Convert height / reach to human-readable measurements
    const hInches = profile.height ? Math.round(profile.height / 2.54) : null;
    const hFeet = hInches ? Math.floor(hInches / 12) : null;
    const hInchRem = hInches ? hInches % 12 : null;
    const formattedHeight = hFeet ? `${hFeet}' ${hInchRem}\"` : "N/A";
    const formattedReach = profile.reach ? `${Math.round(profile.reach / 2.54)}\"` : "N/A";
    
    if (cardPhys) cardPhys.innerText = `${formattedHeight} / ${formattedReach} Reach (${profile.stance})`;
}

/* Feed comparative profile values into all 3 radar charts */
function updateRadars() {
    const f1 = window.state.selectedF1;
    const f2 = window.state.selectedF2;

    window.targetRadar.setProfiles(f1, f2);
    window.tacticRadar.setProfiles(f1, f2);
    window.grappleRadar.setProfiles(f1, f2);
}
