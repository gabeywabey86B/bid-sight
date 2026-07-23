// "Day: Tue, start time: 15:30,end time : 17:00|Day: Thu, start time: 15:30,end time : 17:00"
// -> { day: "Tue, Thu", timing: "15:30-17:00, 15:30-17:00" }
export function parseSchedule(schedule) {
  if (!schedule) return { day: "", timing: "" };
  const slots = schedule.split("|").map((slot) => {
    const day = slot.match(/Day:\s*([^,]+)/)?.[1]?.trim() ?? "";
    const start = slot.match(/start time:\s*([\d:]+)/)?.[1] ?? "";
    const end = slot.match(/end time\s*:\s*([\d:]+)/)?.[1] ?? "";
    return { day, timing: start && end ? `${start}-${end}` : "" };
  });
  return {
    day: slots.map((s) => s.day).join(", "),
    timing: slots.map((s) => s.timing).join(", "),
  };
}
