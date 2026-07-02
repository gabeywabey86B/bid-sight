"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

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

function extractAcademicYear(term) {
  if (!term) {
    return "N/A";
  }

  const match = term.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : term;
}

function sortBiddingRows(rows) {
  return [...rows].sort((left, right) =>
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

function buildSimulationData(rows, sectionInfo) {
  const sortedRows = sortBiddingRows(rows);
  const latestRows = [...sortedRows].reverse();
  const selectedRow =
    latestRows.find(
      (row) =>
        row.median_bid !== null ||
        row.min_bid !== null ||
        row.opening_vacancy !== null
    ) ?? latestRows[0];

  return {
    selectedRow,
    historyRows: sortedRows,
    sectionInfo,
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

      const courseRows = biddingRows;
      const representativeRow =
        courseRows.find(
          (row) =>
            row.median_bid !== null ||
            row.min_bid !== null ||
            row.opening_vacancy !== null
        ) ?? courseRows[0];
      const courseId = representativeRow?.course_id;

      if (!courseId) {
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

      setSimulationData(buildSimulationData(courseRows, sectionInfo ?? null));
      setBidAmount("");
      setStatus("ready");
    }

    loadSimulation();

    return () => {
      isActive = false;
    };
  }, [rerollToken]);

  const selectedRow = simulationData?.selectedRow;
  const historyRows = simulationData?.historyRows ?? [];
  const schedule = simulationData?.sectionInfo?.schedule ?? "TBA";
  const courseAreas = simulationData?.sectionInfo?.course_areas ?? "";
  const courseAreasPreview = courseAreas
    ? courseAreas.split("|").slice(0, 3).join(" | ")
    : "No course areas available.";

  return (
    <section className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Bid Simulation
            </p>
            <div className="space-y-2">
              <p className="text-3xl leading-tight font-semibold tracking-tight">
                {selectedRow?.description ?? "Live course bid simulation"}
              </p>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Randomly loaded from Supabase using one course and its full
                bidding history across past offerings.
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
              Reroll course
            </Button>

            <label className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 sm:w-auto">
              <span className="text-sm font-medium text-muted-foreground">$</span>
              <input
                value={bidAmount}
                onChange={(event) => setBidAmount(event.target.value)}
                inputMode="decimal"
                placeholder="Enter bid"
                className="w-full min-w-32 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
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

        {status === "ready" && selectedRow ? (
          <>
            <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Historical bidding results
                  </p>
                  <p className="text-lg font-semibold">
                    Past results for {selectedRow.course_code}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Showing {historyRows.length} rows across past offerings
                </p>
              </div>

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
                    {historyRows.map((row, index) => (
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
                        <td className="px-3 py-3">${formatMoney(row.median_bid)}</td>
                        <td className="px-3 py-3">${formatMoney(row.min_bid)}</td>
                        <td className="px-3 py-3">{formatCount(row.vacancy)}</td>
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
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  Course details
                </p>
                <div className="mt-4 space-y-3">
                  <p className="text-lg leading-6">
                    School: {selectedRow.school_department || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Course Code: {selectedRow.course_code || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Academic Year: {extractAcademicYear(selectedRow.term)}
                  </p>
                  <p className="text-lg leading-6">
                    Term: {selectedRow.term || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Section: {selectedRow.section || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Professor: {selectedRow.instructor || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Timing: {schedule}
                  </p>
                  <p className="text-lg leading-6">
                    Bidding Window: {selectedRow.bidding_window || "N/A"}
                  </p>
                  <p className="text-lg leading-6">
                    Opening Vacancy: {formatCount(selectedRow.opening_vacancy)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  Snapshot
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Current median bid</p>
                    <p className="mt-2 text-2xl font-semibold">
                      ${formatMoney(selectedRow.median_bid)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Current min bid</p>
                    <p className="mt-2 text-2xl font-semibold">
                      ${formatMoney(selectedRow.min_bid)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      Before processing vacancy
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCount(selectedRow.before_process_vacancy)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Dice count</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCount(selectedRow.dice)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 rounded-lg bg-muted/30 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Session and eligibility preview
                  </p>
                  <p className="text-sm leading-6">
                    Session: {selectedRow.session_bidding_window || "N/A"}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {courseAreasPreview}
                  </p>
                  <a
                    href={simulationData.sectionInfo?.url || selectedRow.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Open class details
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
