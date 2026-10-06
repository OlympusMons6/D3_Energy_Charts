# Energy in perspective — D3 Exercise 5

One responsive HTML page with four D3 charts. No framework, bundler, API key or online dependency is needed at runtime. D3 7.9.0 is included locally in `vendor/` with its licence.

## Run the page

1. Extract the entire ZIP. Keep `index.html`, `charts/`, `css/`, `data/` and `vendor/` together.
2. Open the extracted folder in VS Code, then open `index.html` using **Live Server**.
3. Alternatively, in a terminal in that folder, run `python -m http.server 8000` (or `python3 -m http.server 8000`), then visit `http://localhost:8000`.

Opening `index.html` by double-clicking uses `file://`. Browsers normally block CSV fetches from that protocol. Use one of the HTTP options above; no internet connection is needed once the ZIP is extracted.

## File responsibilities

| File | Purpose |
| --- | --- |
| `index.html` | Introduction, four chart containers, chart explanations and accessible table containers. Loads scripts in dependency order using `defer`. |
| `css/styles.css` | Colours, spacing, responsive page grid, chart typography, focus outlines, tables and print styles. |
| `charts/scatter.js` | Loads TV records, maps stars and consumption onto two linear scales, and draws one point per row. |
| `charts/donut.js` | Loads all-sizes means, computes arc angles with `d3.pie()` and draws the ring with `d3.arc()`. |
| `charts/bar.js` | Loads 55-inch means, uses a band scale for technologies and a linear scale for bar heights. |
| `charts/line.js` | Loads the supplied annual average, sorts years and draws straight line segments with `d3.line()`. |
| `charts/utils.js` | Shared parsing, validation, colours, number formatting, SVG/axis helpers, responsive rendering, keyboard navigation and tables. |
| `data/` | Unmodified copies of all four supplied CSV files. |
| `vendor/` | Pinned D3 distribution and its licence. |

Each chart has its own JavaScript file inside `charts`, as required. `utils.js` removes duplicated infrastructure rather than combining the chart implementations.

## Exact data mapping

| Chart | CSV | Columns used |
| --- | --- | --- |
| Scatter | `Ex5_TV_energy.csv` | `star2` on x; `energy_consumpt` on y; `screen_tech` for colour; `brand`, `screensize`, `count` for details |
| Donut | `Ex5_TV_energy_Allsizes_byScreenType.csv` | `Screen_Tech` and `Mean(Labelled energy consumption (kWh/year))` |
| Bar | `Ex5_TV_energy_55inchtv_byScreenType.csv` | `Screen_Tech` and `Mean(Labelled energy consumption (kWh/year))` |
| Line | `Ex5_ARE_Spot_Prices.csv` | `Year` and `Average Price (notTas-Snowy)` |

The supplied CSV filenames and column names are preserved exactly, including the `ARE` spelling in the price filename. No outside energy dataset has been added.

### Important interpretation choices

- The TV file contains **587 source rows**, not necessarily 587 individual models. Some rows have a `count` greater than one. The scatter shows one point per source row with equal point sizes. It does not expand or weight those rows.
- `LCD (LED)` in the raw data is labelled **LED** in the scatter so the category matches the two supplied summary files. The source CSV itself is unchanged.
- Both technology summaries contain **means**. Their figures match unweighted averages of the relevant source rows, to the precision supplied. They are not weighted by the `count` column. The page uses the prepared values as requested rather than silently substituting count-weighted means.
- The all-sizes means are LCD **306.4962387**, LED **355.679272**, and OLED **533.0641742 kWh/year**.
- The 55-inch means are LCD **326.0016667**, LED **330.3027091**, and OLED **386.5431548 kWh/year**.
- A donut normally represents parts of a meaningful whole. Here the supplied file has means, so its angles deliberately show `technology mean / sum of the three means`. These are proportions of an artificial comparison total, **not shares of actual energy use, TVs or sales**. That limitation is visible directly below the chart. A bar chart would be preferable for precise comparison of these means, but the donut is retained to meet the exercise.
- The price chart uses all **27 annual records from 1998 through 2024**, inclusive. It plots the supplied average of Queensland, NSW, Victoria and South Australia. Tasmania and Snowy are excluded. Its peak is **A$144.50/MWh in 2022**; the 2024 value is **A$132.50/MWh**.
- Energy is labelled in **kWh/year**; spot price is **A$/MWh**. These are different measures, and the wholesale series is not a household tariff. No inflation adjustment is applied.
- The scatter includes the full range, including the **2,652 kWh/year** outlier. Screen size and overlapping marks limit conclusions about a simple relationship between star rating and energy use.

## The D3 workflow, explained

### 1. Find and load

Each script passes its filename and expected columns to the shared loader:

```js
const rows = await d3.csv(path);
```

The result is an array of objects keyed by the CSV header. The code checks that expected columns exist before proceeding. Each chart loads independently, so a missing file produces an error in its own panel while the other charts can still work.

### 2. Format and validate

CSV values are strings. A scale needs numbers, so the code converts them explicitly:

```js
function numeric(value) {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
```

This avoids `Number("")` turning missing data into zero. Bad required values produce a visible error rather than silently dropping rows. Blank price values remain missing and create gaps in the line. Technology names are validated, and duplicate summary categories or years are rejected. Display formatting rounds labels, but the full parsed precision is used for positions and calculations.

### 3. Measure and create scales

SVG has an internal coordinate system controlled by `viewBox`. On each width change, the code sets that coordinate system to the current container width and a readable chart height. Margins reserve space for axes.

For a numeric y-axis:

```js
const y = d3.scaleLinear()
  .domain([0, maximumValue])
  .range([height - margin.bottom, margin.top]);
```

The **domain** is the data range. The **range** is the screen-coordinate range. SVG y-coordinates increase downward, so larger data values must map toward the smaller top coordinate. `.nice()` extends the domain to readable tick boundaries. The bars use `scaleBand()` for evenly spaced category slots. The line uses a linear year scale because the dataset has annual numeric years; a daily or irregular timestamp dataset would normally use `scaleUtc()` or `scaleTime()`.

### 4. Bind records to marks

```js
marks.selectAll("circle.point")
  .data(data, d => d.id)
  .join("circle")
  .attr("cx", d => x(d.stars))
  .attr("cy", d => y(d.energy));
```

`.data()` associates each row with a DOM element. The key identifies the same record across redraws. `.join()` creates needed elements, updates existing ones and removes obsolete ones. Resizing updates the existing SVG instead of appending another chart.

### 5. Draw the four chart types

- **Scatter:** each record becomes a circle. Its centre is `(x(stars), y(energy))`. Semitransparency makes overlapping records more visible without inventing new values through jitter.
- **Donut:** `d3.pie().value(d => d.energy)` calculates segment angles. `d3.arc().innerRadius(...).outerRadius(...)` converts them into paths. A nonzero inner radius creates the hole. The category order stays consistent with the legend and bar chart.
- **Bar:** `scaleBand()` supplies each bar’s x-position and width. Its top is `y(energy)` and its height is `y(0) - y(energy)`. Starting at zero makes lengths proportional to the actual values.
- **Line:** `d3.line()` turns year/price pairs into one SVG path. Sorting by year prevents a zigzag caused by source order. `.defined(d => d.price !== null)` breaks the path at missing prices. Straight segments avoid implying unsupported smooth variation between annual observations.

### 6. Resize efficiently

CSS Grid changes from two columns to one at 900px. Separately, `ResizeObserver` measures each chart container. A `requestAnimationFrame` callback batches rapid notifications, ignores unchanged widths, updates the SVG dimensions and recalculates scales and tick density. Parsed data stays in the chart’s closure, so resizing does **not** fetch the CSV again.

Simply putting `width: 100%` on a fixed SVG would shrink the axis text on a phone. Recalculating its coordinate system preserves readable text and reduces the number of ticks where necessary. The fallback uses the window resize event for browsers without `ResizeObserver`.

### 7. Inspect data accessibly

- Hover or tap marks to show a persistent readout below the chart.
- Tab to a chart, then use arrow keys, Home or End to inspect records. Escape resets the readout. There is one keyboard focus stop per chart, avoiding 587 scatter points in the tab sequence.
- Each SVG includes a title and description. Readouts use a polite live region for updates.
- Expand **View … data** for a semantic HTML table of every plotted record. Tables expose values without depending on colour or hover.
- The scatter uses `d3.Delaunay.find()` for efficient nearest-point lookup. The line uses a bisector to select the nearest year. The bar and donut charts each have only three marks to handle directly.
- Text from data is inserted with `.text()` or `textContent`, rather than interpreted as HTML.

## Design and engineering trade-offs

- All charts use the same LCD/LED/OLED colour mapping. The price line uses navy because it is a separate measure.
- Units and averaging scope appear next to the data. Values and tables supplement colour, and the donut states its denominator explicitly.
- There are no 3D effects, decorative gradients, truncated bar axes or animation delays.
- Native HTML, CSS and D3 keep this exercise easy to inspect. The project deliberately avoids React and a build step.
- D3 is vendored and version-pinned for reproducible, offline use. A production bundle could import only needed D3 modules to reduce its download size, at the cost of adding a build tool.
- A shared helper file avoids repeating error handling and resizing code. Chart-specific scales and marks remain visible in their own files for learning.
- For hundreds of points SVG is appropriate. For tens of thousands of points, Canvas rendering, aggregation or density plots would be worth considering. No points were sampled out here.

## Manual validation checklist

Automated DOM/SVG checks passed for the chart counts and reference values below, keyboard navigation, redraws at 590px/405px/260px chart widths, one data fetch per CSV, and isolation of a missing-CSV error. Generated chart images were visually reviewed. Full browser page-layout and real-device touch checks were not available in the build environment; the checklist below covers those remaining checks.

1. Serve the folder over HTTP and confirm four charts load without console errors.
2. Check 587 scatter marks, three donut segments, three bars and 27 price observations.
3. Confirm the bar labels are **326.0**, **330.3** and **386.5** and the line’s final year is 2024.
4. Resize the window through desktop, tablet and phone widths. The page should stack cleanly and charts should not accumulate duplicate marks.
5. Try a mouse, touch and keyboard. Inspect first/last records with Home/End and reset with Escape.
6. Expand every data table and compare values with its original CSV.
7. Temporarily rename one CSV, reload and confirm only that panel shows an error; restore the filename afterward.

## D3 references

- [Loading CSV data](https://d3js.org/d3-fetch)
- [Data joins](https://d3js.org/d3-selection/joining)
- [Linear scales](https://d3js.org/d3-scale/linear)
- [Band scales](https://d3js.org/d3-scale/band)
- [Pie layouts](https://d3js.org/d3-shape/pie)
- [Arc generators](https://d3js.org/d3-shape/arc)
- [Line generators](https://d3js.org/d3-shape/line)
- [Delaunay lookup](https://d3js.org/d3-delaunay/delaunay)

The energy values come solely from the supplied exercise files. These links explain the D3 APIs, not the provenance of the data.
