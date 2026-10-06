/* Scatter: star2 (x) versus energy_consumpt (y). One mark per source row. */
(() => {
  "use strict";
  const C = window.EnergyCharts;
  if (!C) return;
  C.mount("scatter-chart", () => C.loadCSV("data/Ex5_TV_energy.csv",
    ["brand", "screen_tech", "screensize", "energy_consumpt", "star2", "count"], (row, i) => {
      const point = { id: i, brand: row.brand, technology: row.screen_tech === "LCD (LED)" ? "LED" : row.screen_tech,
        size: C.numeric(row.screensize), energy: C.numeric(row.energy_consumpt), stars: C.numeric(row.star2), count: C.numeric(row.count) };
      C.assert([point.size, point.energy, point.stars, point.count].every(value => value !== null && value >= 0), `Invalid number at TV row ${i + 2}.`);
      C.assert(C.technologies.includes(point.technology), `Unknown technology at TV row ${i + 2}.`);
      return point;
    }), (container, data) => {
      data.sort((a, b) => d3.ascending(a.stars, b.stars) || d3.ascending(a.energy, b.energy) || a.id - b.id);
      const hint = `${C.integer(data.length)} records. Hover or tap a point; use arrow keys when focused.`;
      const root = C.svg(container, "scatter", "TV energy consumption versus star rating",
        `${data.length} source records. Horizontal axis: star rating. Vertical axis: kWh per year. LCD (LED) is labelled LED. Focus and use arrow keys for record details.`);
      C.readout("scatter-readout", hint);
      C.table("scatter-table", "All TV records, ordered by star rating. Values shown to one decimal place.", [
        { label: "Brand", value: d => d.brand }, { label: "Technology", value: d => d.technology },
        { label: "Inches", numeric: true, value: d => C.number(d.size) },
        { label: "Stars", numeric: true, value: d => C.number(d.stars) },
        { label: "kWh/year", numeric: true, value: d => C.number(d.energy) },
        { label: "Source count", numeric: true, value: d => C.integer(d.count) }
      ], data);
      C.responsive(container, width => {
        const height = width < 440 ? 330 : 350;
        const margin = { top: 34, right: 14, bottom: 50, left: 53 };
        root.attr("viewBox", `0 0 ${width} ${height}`);
        const x = d3.scaleLinear().domain([0, Math.ceil(d3.max(data, d => d.stars)) + .3]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, d3.max(data, d => d.energy) * 1.06]).nice().range([height - margin.bottom, margin.top]);
        C.axes(root, x, y, width, height, margin, { xAxis: d3.axisBottom(x).ticks(width < 400 ? 4 : 8), xTitle: "Star rating", yTitle: width < 360 ? "Energy (kWh/year)" : "Energy consumption (kWh/year)" });
        C.layer(root, "marks").selectAll("circle.point").data(data, d => d.id).join("circle")
          .attr("class", "point").attr("cx", d => x(d.stars)).attr("cy", d => y(d.energy))
          .attr("r", width < 400 ? 2.6 : 3.1).attr("fill", d => C.colour(d.technology)).attr("fill-opacity", .52);
        const selected = C.layer(root, "selected").selectAll("circle").data([null]).join("circle")
          .attr("r", 6).attr("fill", "none").attr("stroke", "#132f4c").attr("stroke-width", 2)
          .attr("pointer-events", "none").attr("visibility", "hidden");
        function inspect(index) {
          if (index === null) { selected.attr("visibility", "hidden"); C.readout("scatter-readout", hint); return; }
          const d = data[index];
          selected.attr("cx", x(d.stars)).attr("cy", y(d.energy)).attr("visibility", "visible");
          C.readout("scatter-readout", `${d.brand} · ${d.technology} · ${C.number(d.size)} inches · ${C.number(d.stars)} stars · ${C.number(d.energy)} kWh/year · source count ${C.integer(d.count)}`);
        }
        // Nearest-point lookup avoids hundreds of individual event handlers.
        const delaunay = d3.Delaunay.from(data, d => x(d.stars), d => y(d.energy));
        root.on("pointermove.inspect pointerdown.inspect", event => {
          const [px, py] = d3.pointer(event, root.node());
          const index = delaunay.find(px, py);
          const d = data[index];
          inspect(Math.hypot(px - x(d.stars), py - y(d.energy)) < 22 ? index : null);
        }).on("pointerleave.inspect", () => { if (document.activeElement !== root.node()) inspect(null); });
        C.keyboard(root, data.length, inspect);
      });
    });
})();
