"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return numericValue.toFixed(2);
}

function formatCount(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return String(value);
}

function formatCompactMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return `$${Number(value).toFixed(2)}`;
}

function formatSignedMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}$${Number(value).toFixed(2)}`;
}

function extractAcademicYear(term) {
  if (!term) {
    return "N/A";
  }

  const match = term.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : term;
}

function compareBiddingRows(left, right) {
  return (
    left.term.localeCompare(right.term, undefined, {
      numeric: true,
      sensitivity: "base",
    }) ||
    left.section.localeCompare(right.section, undefined, {
      numeric: true,
      sensitivity: "base",
    }) ||
    left.bidding_window.localeCompare(right.bidding_window, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

function sortBiddingRows(rows) {
  return [...rows].sort(compareBiddingRows);
}

function getMedian(values) {
  if (!values.length) {
    return null;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  return sortedValues[middleIndex];
}

function hasMeaningfulBidValue(row) {
  const medianValue = Number(row.median_bid);
  const minValue = Number(row.min_bid);
  const hasMedianValue =
    row.median_bid !== null &&
    row.median_bid !== undefined &&
    !Number.isNaN(medianValue) &&
    medianValue > 0;
  const hasPositiveMinValue =
    row.min_bid !== null &&
    row.min_bid !== undefined &&
    !Number.isNaN(minValue) &&
    minValue > 0;

  return hasMedianValue || hasPositiveMinValue;
}

function isBeforeTargetRow(row, targetRow) {
  return compareBiddingRows(row, targetRow) < 0;
}

function getHistoryBucketKey(row) {
  return [row.term, row.bidding_window, row.session_bidding_window].join("|");
}

function getHistoryBucketLabel(row) {
  const sessionLabel = row.session_bidding_window
    ? ` ${row.session_bidding_window}`
    : "";

  return `${row.term} ${row.bidding_window}${sessionLabel}`;
}

function extractTermCode(term) {
  if (!term) {
    return "N/A";
  }

  return term.replace(" Term ", " T");
}

function extractRoundWindowCodes(text) {
  if (!text) {
    return { roundCode: null, windowCode: null };
  }

  const roundMatch = text.match(/(?:Round|Rnd)\s*([A-Za-z0-9]+)/i);
  const windowMatch = text.match(/(?:Window|Win)\s*([A-Za-z0-9]+)/i);

  return {
    roundCode: roundMatch?.[1] ? `R${roundMatch[1].toUpperCase()}` : null,
    windowCode: windowMatch?.[1] ? `W${windowMatch[1].toUpperCase()}` : null,
  };
}

function extractWindowTypeCode(text) {
  if (!text) {
    return null;
  }

  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("incoming exchange")) {
    return "IE";
  }

  if (normalizedText.includes("incoming freshmen")) {
    return "IF";
  }

  if (normalizedText.includes("freshmen")) {
    return "FR";
  }

  if (normalizedText.includes("exchange")) {
    return "EX";
  }

  if (normalizedText.includes("withdraw")) {
    return "WD";
  }

  if (normalizedText.includes("regular")) {
    return "REG";
  }

  return null;
}

function buildAxisLabel(row) {
  const termCode = extractTermCode(row.term);
  const biddingCodes = extractRoundWindowCodes(row.bidding_window);
  const sessionCodes = extractRoundWindowCodes(row.session_bidding_window);
  const roundCode = biddingCodes.roundCode ?? sessionCodes.roundCode;
  const windowCode = biddingCodes.windowCode ?? sessionCodes.windowCode;
  const hasExplicitRoundWindow = Boolean(roundCode || windowCode);
  const windowTypeCode =
    hasExplicitRoundWindow
      ? extractWindowTypeCode(row.bidding_window)
      : extractWindowTypeCode(row.bidding_window) ??
        extractWindowTypeCode(row.session_bidding_window);
  const parts = [termCode];

  if (windowTypeCode) {
    parts.push(windowTypeCode);
  }

  if (roundCode) {
    parts.push(roundCode);
  }

  if (windowCode) {
    parts.push(windowCode);
  }

  if (!windowTypeCode && !roundCode && !windowCode) {
    parts.push("BW");
  }

  return parts.join(" ");
}

function buildHistoryTrendData(rows) {
  const termGroups = rows.reduce((groups, row) => {
    const bucketKey = getHistoryBucketKey(row);
    const currentGroup = groups.get(bucketKey) ?? [];
    currentGroup.push(row);
    groups.set(bucketKey, currentGroup);
    return groups;
  }, new Map());

  return [...termGroups.entries()].map(([bucketKey, termRows]) => {
    const meaningfulRows = termRows.filter(hasMeaningfulBidValue);
    const representativeRow = termRows[0];

    const medianValues = meaningfulRows
      .map((row) => row.median_bid)
      .filter((value) => value !== null && value !== undefined)
      .map(Number)
      .filter((value) => !Number.isNaN(value) && value > 0);

    const minValues = meaningfulRows
      .map((row) => row.min_bid)
      .filter((value) => value !== null && value !== undefined)
      .map(Number)
      .filter((value) => !Number.isNaN(value) && value > 0);

    return {
      key: bucketKey,
      fullLabel: representativeRow
        ? getHistoryBucketLabel(representativeRow)
        : bucketKey,
      axisLabel: representativeRow ? buildAxisLabel(representativeRow) : bucketKey,
      medianValue: getMedian(medianValues),
      minValue: minValues.length ? Math.min(...minValues) : null,
    };
  });
}

function getUniqueSortedValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort(
    (left, right) =>
      left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      })
  );
}

function getNumericBidValue(value) {
  const parsedValue = Number(value);

  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function buildBidComparison(enteredBid, actualValue) {
  const numericActual = getNumericBidValue(actualValue);

  if (numericActual === null) {
    return null;
  }

  const difference = enteredBid - numericActual;

  return {
    actualValue: numericActual,
    difference,
    absoluteDifference: Math.abs(difference),
  };
}

function buildSimulationData(rows) {
  const sortedRows = sortBiddingRows(rows);
  const candidateRows = sortedRows.filter(
    (row) =>
      row.median_bid !== null ||
      row.min_bid !== null ||
      row.opening_vacancy !== null
  );
  const randomPool = candidateRows.length ? candidateRows : sortedRows;
  const targetRow =
    randomPool[Math.floor(Math.random() * randomPool.length)] ?? null;

  if (!targetRow) {
    return null;
  }

  const priorRows = sortedRows.filter((row) => isBeforeTargetRow(row, targetRow));

  return {
    targetRow,
    priorRows,
    termTrendRows: buildHistoryTrendData(priorRows),
  };
}

function StatusCard({ title, description }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function createHistoryRowId(row) {
  return [
    row.course_id,
    row.term,
    row.section,
    row.bidding_window,
    row.session_bidding_window,
    row.median_bid,
    row.min_bid,
    row.opening_vacancy,
    row.after_process_vacancy,
  ].join("|");
}

function TrendChart({ data }) {
  const longestAxisLabelLength = Math.max(
    ...data.map((item) => item.axisLabel?.length ?? 0),
    0
  );
  const minPointSpacing = Math.max(112, longestAxisLabelLength * 8);
  const chartWidth = Math.max(
    720,
    52 + 24 + Math.max(data.length - 1, 1) * minPointSpacing
  );
  const chartHeight = 260;
  const padding = { top: 20, right: 24, bottom: 52, left: 52 };
  const drawableWidth = chartWidth - padding.left - padding.right;
  const drawableHeight = chartHeight - padding.top - padding.bottom;
  const allValues = data.flatMap((item) =>
    [item.medianValue, item.minValue].filter(
      (value) => value !== null && value !== undefined
    )
  );

  if (!allValues.length) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
        No usable bid trend data is available from earlier offerings for this
        course.
      </div>
    );
  }

  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;
  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const value = maxValue - (range * index) / 3;
    return {
      label: formatCompactMoney(value),
      y: padding.top + (drawableHeight * index) / 3,
    };
  });

  const getX = (index) => {
    if (data.length === 1) {
      return padding.left + drawableWidth / 2;
    }

    return padding.left + (drawableWidth * index) / (data.length - 1);
  };

  const getY = (value) =>
    padding.top + ((maxValue - value) / range) * drawableHeight;

  const buildSeriesPath = (key) => {
    const points = data
      .map((item, index) => {
        const value = item[key];

        if (value === null || value === undefined) {
          return null;
        }

        return `${getX(index)},${getY(value)}`;
      })
      .filter(Boolean);

    if (!points.length) {
      return null;
    }

    return `M ${points.join(" L ")}`;
  };

  const medianPath = buildSeriesPath("medianValue");
  const minPath = buildSeriesPath("minValue");

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
          Median bid
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
          Min bid
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-[260px]"
          style={{ width: `${chartWidth}px`, minWidth: `${chartWidth}px` }}
          role="img"
          aria-label="Median and minimum resulting bid trend by prior bidding window"
        >
          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                strokeOpacity="0.12"
              />
              <text
                x={padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {medianPath ? (
            <path
              d={medianPath}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-foreground"
            />
          ) : null}

          {minPath ? (
            <path
              d={minPath}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-muted-foreground"
            />
          ) : null}

          {data.map((item, index) => {
            const x = getX(index);

            return (
              <g key={item.key}>
                {item.medianValue !== null ? (
                  <circle
                    cx={x}
                    cy={getY(item.medianValue)}
                    r="3.5"
                    className="fill-foreground"
                  />
                ) : null}

                {item.minValue !== null ? (
                  <circle
                    cx={x}
                    cy={getY(item.minValue)}
                    r="3.5"
                    className="fill-muted-foreground"
                  />
                ) : null}

                <text
                  x={x}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {item.axisLabel}
                </text>

                <title>{item.fullLabel}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Each point represents one prior bidding-window bucket in this filtered
        history. The black line shows the median of all recorded median bids in
        that bucket, and the gray line shows the lowest recorded minimum bid in
        that bucket.
      </p>
    </div>
  );
}

function ResultMetricCard({ title, comparison }) {
  if (!comparison) {
    return (
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold">N/A</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No recorded value is available for this target round.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold">
        {formatCompactMoney(comparison.actualValue)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Difference: {formatSignedMoney(comparison.difference)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Absolute gap: {formatCompactMoney(comparison.absoluteDifference)}
      </p>
    </div>
  );
}

const BIDDING_ROW_SELECT =
  "course_id,bidding_window,term,session_bidding_window,course_code,description,section,median_bid,min_bid,vacancy,opening_vacancy,before_process_vacancy,after_process_vacancy,dice,enrolled_students,instructor,school_department,url";

async function fetchRandomCourseRows(supabase) {
  const { count, error: countError } = await supabase
    .from("bidding_table_info")
    .select("course_code", { count: "estimated", head: true });

  if (countError) {
    return { data: null, error: countError };
  }

  if (!count) {
    return { data: [], error: null };
  }

  const randomOffset = Math.floor(Math.random() * count);
  const { data: randomSeedRows, error: randomSeedError } = await supabase
    .from("bidding_table_info")
    .select("course_code,course_id")
    .order("course_code", { ascending: true })
    .order("course_id", { ascending: true })
    .range(randomOffset, randomOffset);

  if (randomSeedError) {
    return { data: null, error: randomSeedError };
  }

  const courseCode = randomSeedRows?.[0]?.course_code;

  if (!courseCode) {
    return { data: [], error: null };
  }

  const { data: courseRows, error: courseRowsError } = await supabase
    .from("bidding_table_info")
    .select(BIDDING_ROW_SELECT)
    .eq("course_code", courseCode)
    .order("term", { ascending: true })
    .order("section", { ascending: true })
    .order("bidding_window", { ascending: true });

  if (courseRowsError) {
    return { data: null, error: courseRowsError };
  }

  const dedupedRows = [];
  const seenRowIds = new Set();

  courseRows.forEach((row) => {
    const rowId = createHistoryRowId(row);

    if (seenRowIds.has(rowId)) {
      return;
    }

    seenRowIds.add(rowId);
    dedupedRows.push(row);
  });

  return { data: dedupedRows, error: null };
}

export default function BidSimulationPage() {
  const [simulationData, setSimulationData] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [rerollToken, setRerollToken] = useState(0);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [hasSubmittedBid, setHasSubmittedBid] = useState(false);
  const [termFilter, setTermFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [biddingWindowFilter, setBiddingWindowFilter] = useState("all");

  useEffect(() => {
    let isActive = true;

    async function loadSimulation() {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        if (!isActive) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
        );
        setSimulationData(null);
        return;
      }

      setStatus("loading");
      setErrorMessage("");

      const {
        data: biddingRows,
        error: biddingError,
      } = await fetchRandomCourseRows(supabase);

      if (biddingError) {
        if (!isActive) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          `Unable to load bidding_table_info: ${biddingError.message}`
        );
        setSimulationData(null);
        return;
      }

      if (!biddingRows?.length) {
        if (!isActive) {
          return;
        }

        setStatus("empty");
        setSimulationData(null);
        return;
      }

      const simulation = buildSimulationData(biddingRows);
      const courseId = simulation?.targetRow?.course_id;

      if (!courseId || !simulation?.targetRow) {
        if (!isActive) {
          return;
        }

        setStatus("empty");
        setSimulationData(null);
        return;
      }

      const { data: sectionInfo, error: sectionError } = await supabase
        .from("section_info")
        .select("course_id,schedule,course_areas,url")
        .eq("course_id", courseId)
        .maybeSingle();

      if (sectionError) {
        if (!isActive) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          `Unable to load section_info for ${courseId}: ${sectionError.message}`
        );
        setSimulationData(null);
        return;
      }

      if (!isActive) {
        return;
      }

      setSimulationData({
        ...simulation,
        sectionInfo: sectionInfo ?? null,
      });
      setBidAmount("");
      setHasSubmittedBid(false);
      setIsHistoryCollapsed(false);
      setTermFilter("all");
      setSectionFilter("all");
      setBiddingWindowFilter("all");
      setStatus("ready");
    }

    loadSimulation();

    return () => {
      isActive = false;
    };
  }, [rerollToken]);

  const targetRow = simulationData?.targetRow;
  const priorRows = simulationData?.priorRows ?? [];
  const schedule = simulationData?.sectionInfo?.schedule ?? "TBA";
  const courseAreas = simulationData?.sectionInfo?.course_areas ?? "";
  const courseAreasPreview = courseAreas
    ? courseAreas.split("|").slice(0, 3).join(" | ")
    : "No course areas available.";
  const termOptions = useMemo(
    () => getUniqueSortedValues(priorRows, "term"),
    [priorRows]
  );
  const sectionOptions = useMemo(
    () => getUniqueSortedValues(priorRows, "section"),
    [priorRows]
  );
  const biddingWindowOptions = useMemo(
    () => getUniqueSortedValues(priorRows, "bidding_window"),
    [priorRows]
  );
  const filteredPriorRows = useMemo(
    () =>
      priorRows.filter((row) => {
        if (termFilter !== "all" && row.term !== termFilter) {
          return false;
        }

        if (sectionFilter !== "all" && row.section !== sectionFilter) {
          return false;
        }

        if (
          biddingWindowFilter !== "all" &&
          row.bidding_window !== biddingWindowFilter
        ) {
          return false;
        }

        return true;
      }),
    [biddingWindowFilter, priorRows, sectionFilter, termFilter]
  );
  const filteredTermTrendRows = useMemo(
    () => buildHistoryTrendData(filteredPriorRows),
    [filteredPriorRows]
  );
  const hasActiveFilters =
    termFilter !== "all" ||
    sectionFilter !== "all" ||
    biddingWindowFilter !== "all";

  const numericBidAmount = useMemo(() => {
    if (bidAmount.trim() === "") {
      return null;
    }

    const parsedValue = Number(bidAmount);

    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      return null;
    }

    return parsedValue;
  }, [bidAmount]);

  const medianComparison = useMemo(() => {
    if (numericBidAmount === null || !targetRow || !hasSubmittedBid) {
      return null;
    }

    return buildBidComparison(numericBidAmount, targetRow.median_bid);
  }, [hasSubmittedBid, numericBidAmount, targetRow]);

  const minComparison = useMemo(() => {
    if (numericBidAmount === null || !targetRow || !hasSubmittedBid) {
      return null;
    }

    return buildBidComparison(numericBidAmount, targetRow.min_bid);
  }, [hasSubmittedBid, numericBidAmount, targetRow]);

  return (
    <section className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Training Mode
            </p>
            <div className="space-y-2">
              <p className="text-3xl leading-tight font-semibold tracking-tight">
                {targetRow?.description ?? "Historical bid training"}
              </p>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Study only the history available before this target offering,
                place your bid, then compare it against that round&apos;s actual
                results.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <Button
              variant="outline"
              onClick={() => setRerollToken((current) => current + 1)}
              disabled={status === "loading"}
            >
              <RefreshCw className={status === "loading" ? "animate-spin" : ""} />
              Reroll target
            </Button>

            <div className="flex w-full flex-col gap-3 sm:w-auto">
              <label className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 sm:w-auto">
                <span className="text-sm font-medium text-muted-foreground">
                  $
                </span>
                <input
                  value={bidAmount}
                  onChange={(event) => {
                    setBidAmount(event.target.value);
                    if (hasSubmittedBid) {
                      setHasSubmittedBid(false);
                    }
                  }}
                  inputMode="decimal"
                  placeholder="Enter bid"
                  className="w-full min-w-32 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  aria-label="Enter your bid"
                />
              </label>

              <Button
                onClick={() => setHasSubmittedBid(true)}
                disabled={numericBidAmount === null || status !== "ready"}
              >
                Submit bid
              </Button>
            </div>
          </div>
        </div>

        {status === "loading" ? (
          <StatusCard
            title="Loading live bidding data"
            description="Fetching bidding_table_info and section_info from Supabase."
          />
        ) : null}

        {status === "error" ? (
          <StatusCard title="Simulation unavailable" description={errorMessage} />
        ) : null}

        {status === "empty" ? (
          <StatusCard
            title="No simulation data found"
            description="Supabase returned no readable rows for the simulation tables. This usually means the data is not loaded in this project yet or the publishable key still lacks a SELECT policy."
          />
        ) : null}

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  Target course details
                </p>
                <div className="mt-4 space-y-3">
                  <p className="text-lg leading-6">
                    School: {targetRow.school_department || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Course Code: {targetRow.course_code || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Academic Year: {extractAcademicYear(targetRow.term)}
                  </p>
                  <p className="text-lg leading-6">
                    Term: {targetRow.term || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Section: {targetRow.section || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Professor: {targetRow.instructor || "N/A"}
                  </p>
                  <p className="text-lg leading-6">Timing: {schedule}</p>
                  <p className="text-lg leading-6">
                    Bidding Window: {targetRow.bidding_window || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Opening Vacancy: {formatCount(targetRow.opening_vacancy)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
                {hasSubmittedBid ? (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">
                      Your result
                    </p>
                    <div className="mt-4 rounded-lg bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground">
                        Submitted bid
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {formatCompactMoney(numericBidAmount)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <ResultMetricCard
                        title="Target round median"
                        comparison={medianComparison}
                      />
                      <ResultMetricCard
                        title="Target round minimum"
                        comparison={minComparison}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">
                      Bid prompt
                    </p>
                    <div className="mt-4 space-y-3 rounded-lg bg-muted/30 p-4">
                      <p className="text-base leading-6">
                        Use the earlier history on this page to decide what you
                        would bid for this specific target round.
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        After you submit, this panel will reveal how far your bid
                        was from the actual median and minimum for{" "}
                        {targetRow.course_code} {targetRow.section} in{" "}
                        {targetRow.term}.
                      </p>
                    </div>
                  </>
                )}

                <div className="mt-4 space-y-3 rounded-lg bg-muted/30 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Session and eligibility preview
                  </p>
                  <p className="text-sm leading-6">
                    Session: {targetRow.session_bidding_window || "N/A"}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {courseAreasPreview}
                  </p>
                  <a
                    href={simulationData.sectionInfo?.url || targetRow.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Open class details
                  </a>
                </div>
              </div>
            </div>

        {status === "ready" && targetRow ? (
          <>
            <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Prior historical context
                  </p>
                  <p className="text-lg font-semibold">
                    Earlier results for {targetRow.course_code} before{" "}
                    {targetRow.term}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredPriorRows.length} earlier row
                  {filteredPriorRows.length === 1 ? "" : "s"}
                  {hasActiveFilters ? ` of ${priorRows.length}` : ""}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Term</span>
                    <select
                      value={termFilter}
                      onChange={(event) => setTermFilter(event.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    >
                      <option value="all">All terms</option>
                      {termOptions.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Section</span>
                    <select
                      value={sectionFilter}
                      onChange={(event) => setSectionFilter(event.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    >
                      <option value="all">All sections</option>
                      {sectionOptions.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Bidding Window</span>
                    <select
                      value={biddingWindowFilter}
                      onChange={(event) =>
                        setBiddingWindowFilter(event.target.value)
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    >
                      <option value="all">All bidding windows</option>
                      {biddingWindowOptions.map((biddingWindow) => (
                        <option key={biddingWindow} value={biddingWindow}>
                          {biddingWindow}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTermFilter("all");
                        setSectionFilter("all");
                        setBiddingWindowFilter("all");
                      }}
                      disabled={!hasActiveFilters}
                    >
                      Clear filters
                    </Button>
                  </div>
                </div>
              </div>

              {filteredPriorRows.length ? (
                <>
                  <TrendChart data={filteredTermTrendRows} />
                    <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setIsHistoryCollapsed((current) => !current)}
                    >
                    {isHistoryCollapsed ? <ChevronDown /> : <ChevronUp />}
                    {isHistoryCollapsed ? "Show prior results" : "Hide prior results"}
                    </Button>

                  {!isHistoryCollapsed ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left text-sm">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="pb-2 font-medium">Term</th>
                            <th className="pb-2 font-medium">Section</th>
                            <th className="pb-2 font-medium">Bidding Window</th>
                            <th className="pb-2 font-medium">Median</th>
                            <th className="pb-2 font-medium">Min</th>
                            <th className="pb-2 font-medium">Vacancy</th>
                            <th className="pb-2 font-medium">Opening</th>
                            <th className="pb-2 font-medium">Enrolled</th>
                            <th className="pb-2 font-medium">Post-Process</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPriorRows.map((row, index) => (
                            <tr
                              key={`${createHistoryRowId(row)}-${index}`}
                              className="rounded-lg bg-muted/40"
                            >
                              <td className="rounded-l-lg px-3 py-3 font-medium">
                                {row.term}
                              </td>
                              <td className="px-3 py-3">{row.section}</td>
                              <td className="px-3 py-3 font-medium">
                                {row.bidding_window}
                              </td>
                              <td className="px-3 py-3">
                                ${formatMoney(row.median_bid)}
                              </td>
                              <td className="px-3 py-3">
                                ${formatMoney(row.min_bid)}
                              </td>
                              <td className="px-3 py-3">
                                {formatCount(row.vacancy)}
                              </td>
                              <td className="px-3 py-3">
                                {formatCount(row.opening_vacancy)}
                              </td>
                              <td className="px-3 py-3">
                                {formatCount(row.enrolled_students)}
                              </td>
                              <td className="rounded-r-lg px-3 py-3">
                                {formatCount(row.after_process_vacancy)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                  {priorRows.length
                    ? "No earlier rows match the current filters."
                    : "No earlier history is available for this course before the selected target term."}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
