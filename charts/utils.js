/* Shared plumbing. Each chart still owns its own data mapping and drawing code. */
(() => {
  "use strict";
  if (!window.d3) {
    document.querySelectorAll(".chart-frame").forEach(container => {
      container.setAttribute("aria-busy", "false");
      container.textContent = "D3 could not load. Keep the vendor folder beside index.html.";
      container.classList.add("error");
    });
    return;
  }
  const technologies = ["LCD", "LED", "OLED"];
  const colour = d3.scaleOrdinal(technologies, ["#087e80", "#3864c7", "#b35d19"]);
  const meanColumn = "Mean(Labelled energy consumption (kWh/year))";
  const number = d3.format(",.1f");
  const integer = d3.format(",.0f");
  const percent = d3.format(".1%");

  // Number("") is 0, so check empty cells BEFORE conversion.
  function numeric(value) {
    if (value == null || String(value).trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  async function loadCSV(path, requiredColumns, convert) {
    const rows = await d3.csv(path);
    const missing = requiredColumns.filter(column => !rows.columns.includes(column));
    assert(!missing.length, `Missing CSV column(s): ${missing.join(", ")}`);
    assert(rows.length > 0, "The CSV contains no data rows.");
    return rows.map((row, i) => convert(row, i));
  }
  async function loadMeans(path) {
    const rows = await loadCSV(path, ["Screen_Tech", meanColumn], (row, i) => {
      const technology = row.Screen_Tech.trim();
      const energy = numeric(row[meanColumn]);
      assert(technologies.includes(technology), `Unknown technology at row ${i + 2}.`);
      assert(energy !== null && energy >= 0, `Invalid mean consumption at row ${i + 2}.`);
      return { technology, energy };
    });
    assert(rows.length === 3 && new Set(rows.map(d => d.technology)).size === 3,
      "Expected one mean for each of LCD, LED and OLED.");
    return rows.sort((a, b) => technologies.indexOf(a.technology) - technologies.indexOf(b.technology));
  }
  function showError(container, error) {
    container.setAttribute("aria-busy", "false");
    container.replaceChildren();
    const message = document.createElement("p");
    message.className = "error";
    message.textContent = `This chart could not load. ${location.protocol === "file:"
      ? "Open this folder with VS Code Live Server or a local HTTP server; CSV loading does not work from file://."
      : "Check that its CSV is in the data folder and reload. " + error.message}`;
    container.append(message);
    console.error(error);
  }
  async function mount(id, load, initialise) {
    const container = document.getElementById(id);
    try {
      const data = await load(); // Fetch only once; resizing reuses these parsed rows.
      container.replaceChildren();
      initialise(container, data);
      container.setAttribute("aria-busy", "false");
    } catch (error) { showError(container, error); }
  }
  function responsive(container, draw) {
    let lastWidth = -1;
    let frame;
    const redraw = () => {
      const width = Math.floor(container.getBoundingClientRect().width);
      if (width <= 0 || width === lastWidth) return;
      lastWidth = width;
      try { draw(width); } catch (error) { showError(container, error); }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(redraw);
    };
    // Observe the container, not just the window (grids can resize independently).
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(schedule);
      observer.observe(container);
    } else { window.addEventListener("resize", schedule, { passive: true }); }
    redraw();
  }
  function svg(container, id, title, description) {
    const root = d3.select(container).append("svg")
      .attr("role", "img").attr("aria-labelledby", `${id}-title ${id}-description`);
    root.append("title").attr("id", `${id}-title`).text(title);
    root.append("desc").attr("id", `${id}-description`).text(description);
    return root;
  }
  function layer(parent, className) { return parent.selectAll(`g.${className}`).data([null]).join("g").attr("class", className); }
  function label(parent, className, text, x, y, anchor = "start") {
    return parent.selectAll(`text.${className}`).data([null]).join("text")
      .attr("class", className).attr("x", x).attr("y", y).attr("text-anchor", anchor).text(text);
  }
  function axes(root, x, y, width, height, margin, options) {
    const innerHeight = height - margin.top - margin.bottom;
    const innerWidth = width - margin.left - margin.right;
    const yTicks = options.yTicks || 5;
    layer(root, "grid").attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(yTicks).tickSize(-innerWidth).tickFormat(""));
    layer(root, "x-axis").attr("class", "x-axis axis")
      .attr("transform", `translate(0,${margin.top + innerHeight})`)
      .call(options.xAxis.tickSizeOuter(0));
    layer(root, "y-axis").attr("class", "y-axis axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(yTicks).tickSize(0).tickPadding(9).tickFormat(options.yFormat || d3.format(",.0f")))
      .call(group => group.select(".domain").remove());
    label(root, "y-title", options.yTitle, margin.left, 17).classed("axis-title", true);
    label(root, "x-title", options.xTitle, margin.left + innerWidth / 2, height - 7, "middle").classed("axis-title", true);
  }
  function readout(id, text) { document.getElementById(id).textContent = text; }
  function table(id, caption, columns, rows) {
    const root = d3.select(`#${id}`).append("table");
    root.append("caption").text(caption);
    root.append("thead").append("tr").selectAll("th").data(columns).join("th")
      .attr("scope", "col").attr("class", d => d.numeric ? "numeric" : null).text(d => d.label);
    root.append("tbody").selectAll("tr").data(rows).join("tr")
      .selectAll("td").data(row => columns.map(column => ({ value: column.value(row), numeric: column.numeric })))
      .join("td").attr("class", d => d.numeric ? "numeric" : null).text(d => d.value);
  }
  // One focus stop per chart. Home/End and arrow keys inspect every record.
  function keyboard(root, count, select) {
    let index = 0;
    root.attr("tabindex", 0)
      .on("focus.keyboard", () => select(index))
      .on("keydown.keyboard", event => {
        if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "Escape"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Escape") { select(null); return; }
        if (event.key === "Home") index = 0;
        else if (event.key === "End") index = count - 1;
        else index = Math.max(0, Math.min(count - 1, index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1)));
        select(index);
      });
  }
  window.EnergyCharts = { technologies, colour, meanColumn, number, integer, percent, numeric, assert,
    loadCSV, loadMeans, mount, responsive, svg, layer, label, axes, readout, table, keyboard };
})();
