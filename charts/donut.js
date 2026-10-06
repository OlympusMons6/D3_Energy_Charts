/* Donut: the provided all-sizes file contains MEANS, not consumption totals. */
(() => {
  "use strict";
  const C = window.EnergyCharts;
  if (!C) return;
  C.mount("donut-chart", () => C.loadMeans("data/Ex5_TV_energy_Allsizes_byScreenType.csv"), (container, data) => {
    const sumOfMeans = d3.sum(data, d => d.energy);
    C.assert(sumOfMeans > 0, "The donut needs at least one positive value.");
    const arcs = d3.pie().sort(null).value(d => d.energy)(data);
    const root = C.svg(container, "donut", "Relative mean consumption across all screen sizes",
      "Each segment is a technology mean divided by the sum of all three technology means. These percentages are not market consumption shares. Focus and use arrow keys to inspect segments.");
    const hint = "Percentages compare the three means; they do not show total energy shares.";
    C.readout("donut-readout", hint);
    C.table("donut-table", "All screen sizes. Percentages use the sum of the three means as the denominator.", [
      { label: "Technology", value: d => d.technology },
      { label: "Mean kWh/year", numeric: true, value: d => C.number(d.energy) },
      { label: "Share of means", numeric: true, value: d => C.percent(d.energy / sumOfMeans) }
    ], data);
    C.responsive(container, width => {
      const compact = width < 470;
      const height = width < 440 ? 330 : 350;
      const radius = compact ? Math.min(110, width * .39) : Math.min(135, width * .235);
      const cx = compact ? width / 2 : radius + 9;
      const cy = compact ? 115 : height / 2 - 7;
      root.attr("viewBox", `0 0 ${width} ${height}`);
      const ring = C.layer(root, "ring").attr("transform", `translate(${cx},${cy})`);
      const arc = d3.arc().innerRadius(radius * .52).outerRadius(radius).padAngle(.025).cornerRadius(2);
      const labelArc = d3.arc().innerRadius(radius * .76).outerRadius(radius * .76);
      const segments = ring.selectAll("path.segment").data(arcs, d => d.data.technology).join("path")
        .attr("class", "segment").attr("d", arc).attr("fill", d => C.colour(d.data.technology))
        .attr("stroke", "white").attr("stroke-width", 1.5);
      ring.selectAll("text.donut-percent").data(arcs, d => d.data.technology).join("text")
        .attr("class", "donut-percent").style("font-size", compact ? "13px" : "15px").attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("text-anchor", "middle").attr("dy", ".35em").text(d => C.percent(d.data.energy / sumOfMeans));
      C.label(ring, "donut-centre-title", "All sizes", 0, -2, "middle").style("font-size", compact ? "19px" : "22px");
      C.label(ring, "donut-centre-label", "3 technologies", 0, 21, "middle").style("font-size", compact ? "12px" : "13px");
      const keys = C.layer(root, "donut-key").selectAll("g.key-row").data(data, d => d.technology).join("g")
        .attr("class", "key-row").attr("transform", (d, i) => compact
          ? `translate(${width / 6 + i * width / 3},257)`
          : `translate(${cx + radius + 28},${cy - 67 + i * 66})`);
      keys.selectAll("text.donut-key-label").data(d => [d]).join("text")
        .attr("class", "donut-key-label").attr("text-anchor", compact ? "middle" : "start")
        .attr("fill", d => C.colour(d.technology)).text(d => d.technology);
      keys.selectAll("text.donut-key-value").data(d => [d]).join("text")
        .attr("class", "donut-key-value").attr("y", 23).attr("text-anchor", compact ? "middle" : "start")
        .text(d => C.number(d.energy));
      keys.selectAll("text.unit").data([null]).join("text").attr("class", "unit donut-key-value")
        .attr("y", 42).attr("text-anchor", compact ? "middle" : "start").text("kWh/year");
      function inspect(index) {
        segments.attr("opacity", (d, i) => index === null || i === index ? 1 : .38);
        if (index === null) { C.readout("donut-readout", hint); return; }
        const d = data[index];
        C.readout("donut-readout", `${d.technology}: ${C.number(d.energy)} kWh/year mean · ${C.percent(d.energy / sumOfMeans)} of the sum of the three means.`);
      }
      segments.on("pointerenter.inspect pointerdown.inspect", (event, d) => inspect(data.indexOf(d.data)));
      root.on("pointerleave.inspect", () => { if (document.activeElement !== root.node()) inspect(null); });
      C.keyboard(root, data.length, inspect);
    });
  });
})();
