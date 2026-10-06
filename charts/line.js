/* Line: use the supplied four-state average, not a newly calculated average. */
(() => {
  "use strict";
  const C = window.EnergyCharts;
  if (!C) return;
  const averageColumn = "Average Price (notTas-Snowy)";
  C.mount("line-chart", () => C.loadCSV("data/Ex5_ARE_Spot_Prices.csv", ["Year", averageColumn], (row, i) => {
    const year = C.numeric(row.Year);
    const price = C.numeric(row[averageColumn]);
    C.assert(Number.isInteger(year), `Invalid year at price row ${i + 2}.`);
    C.assert(price !== null || String(row[averageColumn]).trim() === "", `Invalid price at row ${i + 2}.`);
    return { year, price };
  }), (container, rows) => {
    const data = rows.filter(d => d.year >= 1998 && d.year <= 2024).sort((a, b) => a.year - b.year);
    C.assert(data.length && new Set(data.map(d => d.year)).size === data.length, "No years in range, or duplicate years.");
    const available = data.filter(d => d.price !== null);
    C.assert(available.length > 0, "No average prices are available.");
    const root = C.svg(container, "line", "Average annual electricity spot prices from 1998 to 2024",
      "Australian dollars per megawatt hour. The supplied average excludes Tasmania and Snowy. Straight segments connect observed annual prices. Focus and use arrow keys to inspect years.");
    const peak = d3.greatest(available, d => d.price);
    const latest = available[available.length - 1];
    const hint = `${latest.year}: A$${C.number(latest.price)}/MWh. Peak in this dataset: ${peak.year}, A$${C.number(peak.price)}/MWh.`;
    C.readout("line-readout", hint);
    C.table("line-table", "Supplied average for Queensland, NSW, Victoria and South Australia.", [
      { label: "Year", value: d => d.year },
      { label: "Average A$/MWh", numeric: true, value: d => d.price === null ? "Missing" : d3.format(".2f")(d.price) }
    ], data);
    C.responsive(container, width => {
      const height = width < 440 ? 330 : 350;
      const margin = { top: 44, right: 22, bottom: 49, left: 47 };
      root.attr("viewBox", `0 0 ${width} ${height}`);
      const x = d3.scaleLinear().domain([1998, 2024]).range([margin.left, width - margin.right]);
      const y = d3.scaleLinear().domain([Math.min(0, d3.min(available, d => d.price)), d3.max(available, d => d.price) * 1.2])
        .nice().range([height - margin.bottom, margin.top]);
      const years = width < 400 ? [1998, 2010, 2024] : [1998, 2005, 2010, 2015, 2020, 2024];
      C.axes(root, x, y, width, height, margin, { xAxis: d3.axisBottom(x).tickValues(years).tickFormat(d3.format("d")), xTitle: "Year", yTitle: width < 360 ? "Spot price (A$/MWh)" : "Average spot price (A$/MWh)" });
      // .defined creates a gap for a missing value instead of plotting it at zero.
      const line = d3.line().defined(d => d.price !== null).x(d => x(d.year)).y(d => y(d.price));
      C.layer(root, "price-line").selectAll("path").data([data]).join("path")
        .attr("fill", "none").attr("stroke", "#132f4c").attr("stroke-width", 2.5).attr("d", line);
      C.layer(root, "year-points").selectAll("circle").data(available, d => d.year).join("circle")
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.price)).attr("r", 3)
        .attr("fill", "#132f4c").attr("stroke", "white").attr("stroke-width", 1);
      C.label(root, "peak-label", `${peak.year} peak · $${C.number(peak.price)}`, x(peak.year) - 4, y(peak.price) - 16, "end").classed("annotation", true);
      const cursor = C.layer(root, "price-cursor").attr("pointer-events", "none").attr("visibility", "hidden");
      cursor.selectAll("line").data([null]).join("line").attr("y1", margin.top).attr("y2", height - margin.bottom)
        .attr("stroke", "#7c91a7").attr("stroke-dasharray", "4 4");
      cursor.selectAll("circle").data([null]).join("circle").attr("r", 5).attr("fill", "#132f4c").attr("stroke", "white").attr("stroke-width", 2);
      function inspect(index) {
        if (index === null) { cursor.attr("visibility", "hidden"); C.readout("line-readout", hint); return; }
        const d = data[index];
        cursor.attr("visibility", d.price === null ? "hidden" : "visible");
        cursor.select("line").attr("x1", x(d.year)).attr("x2", x(d.year));
        cursor.select("circle").attr("cx", x(d.year)).attr("cy", d.price === null ? 0 : y(d.price));
        C.readout("line-readout", d.price === null ? `${d.year}: average price is missing.` : `${d.year} · A$${d3.format(".2f")(d.price)} per MWh · supplied four-state average.`);
      }
      const nearest = d3.bisector(d => d.year).center;
      root.on("pointermove.inspect pointerdown.inspect", event => {
        const [px, py] = d3.pointer(event, root.node());
        inspect(px >= margin.left && px <= width - margin.right && py >= margin.top && py <= height - margin.bottom
          ? nearest(data, x.invert(px)) : null);
      }).on("pointerleave.inspect", () => { if (document.activeElement !== root.node()) inspect(null); });
      C.keyboard(root, data.length, inspect);
    });
  });
})();
