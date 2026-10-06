/* Bar: use the supplied 55-inch group means, preserving a true zero baseline. */
(() => {
  "use strict";
  const C = window.EnergyCharts;
  if (!C) return;
  C.mount("bar-chart", () => C.loadMeans("data/Ex5_TV_energy_55inchtv_byScreenType.csv"), (container, data) => {
    const root = C.svg(container, "bar", "Mean consumption of 55-inch TVs by screen technology",
      "LCD, LED and OLED group averages in kWh per year. The vertical axis starts at zero. Focus and use arrow keys to inspect bars.");
    const hint = "Compare 55-inch TVs on a common zero baseline.";
    C.readout("bar-readout", hint);
    C.table("bar-table", "55-inch TVs only. Values shown to one decimal place.", [
      { label: "Technology", value: d => d.technology },
      { label: "Mean kWh/year", numeric: true, value: d => C.number(d.energy) }
    ], data);
    C.responsive(container, width => {
      const height = width < 440 ? 330 : 350;
      const margin = { top: 38, right: 12, bottom: 49, left: 47 };
      root.attr("viewBox", `0 0 ${width} ${height}`);
      const x = d3.scaleBand().domain(data.map(d => d.technology)).range([margin.left, width - margin.right]).padding(.38);
      const y = d3.scaleLinear().domain([0, d3.max(data, d => d.energy) * 1.16]).nice().range([height - margin.bottom, margin.top]);
      C.axes(root, x, y, width, height, margin, { xAxis: d3.axisBottom(x).tickSize(0).tickPadding(12), xTitle: "Screen technology", yTitle: width < 360 ? "Mean (kWh/year)" : "Mean consumption (kWh/year)" });
      const bars = C.layer(root, "bars").selectAll("rect.bar").data(data, d => d.technology).join("rect")
        .attr("class", "bar").attr("x", d => x(d.technology)).attr("y", d => y(d.energy))
        .attr("width", x.bandwidth()).attr("height", d => y(0) - y(d.energy))
        .attr("fill", d => C.colour(d.technology));
      C.layer(root, "bar-values").selectAll("text").data(data, d => d.technology).join("text")
        .attr("class", "value-label").attr("x", d => x(d.technology) + x.bandwidth() / 2)
        .attr("y", d => y(d.energy) - 10).attr("text-anchor", "middle").text(d => C.number(d.energy));
      function inspect(index) {
        bars.attr("opacity", (d, i) => index === null || i === index ? 1 : .38);
        if (index === null) { C.readout("bar-readout", hint); return; }
        const d = data[index];
        C.readout("bar-readout", `${d.technology} · 55-inch TVs · ${C.number(d.energy)} kWh/year mean labelled consumption.`);
      }
      bars.on("pointerenter.inspect pointerdown.inspect", (event, d) => inspect(data.indexOf(d)));
      root.on("pointerleave.inspect", () => { if (document.activeElement !== root.node()) inspect(null); });
      C.keyboard(root, data.length, inspect);
    });
  });
})();
