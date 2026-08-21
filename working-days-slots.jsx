import { useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SLOTS = [
  { key: "morning", label: "Morning", range: "6am – 12pm", icon: "🌅" },
  { key: "afternoon", label: "Afternoon", range: "12pm – 5pm", icon: "☀️" },
  { key: "evening", label: "Evening", range: "5pm – 10pm", icon: "🌙" },
];

const DEFAULT_SCHEDULE = {
  Monday: { morning: true, afternoon: true, evening: false },
  Tuesday: { morning: true, afternoon: false, evening: false },
  Wednesday: { morning: true, afternoon: false, evening: false },
  Thursday: { morning: true, afternoon: false, evening: false },
  Friday: { morning: true, afternoon: false, evening: false },
  Saturday: { morning: true, afternoon: false, evening: false },
  Sunday: { morning: false, afternoon: false, evening: false },
};

const TEAL = "#0F766E";
const TEAL_BG = "#F0FDFA";
const BORDER = "#E5E7EB";
const MUTED = "#6B7280";
const INK = "#0F172A";

function summarize(day) {
  const on = SLOTS.filter((s) => day[s.key]);
  if (on.length === 0) return "Not working";
  if (on.length === 3) return "All day";
  return on.map((s) => s.label).join(", ");
}

export default function WorkingDaysSlots() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [expanded, setExpanded] = useState("Monday");

  const toggleSlot = (day, key) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [key]: !prev[day][key] },
    }));
  };

  const applyMondayToWeekdays = () => {
    const mon = schedule.Monday;
    setSchedule((prev) => {
      const next = { ...prev };
      ["Tuesday", "Wednesday", "Thursday", "Friday"].forEach((d) => {
        next[d] = { ...mon };
      });
      return next;
    });
  };

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        maxWidth: 380,
        margin: "0 auto",
        background: "#F9FAFB",
        minHeight: 500,
        padding: "20px 16px",
      }}
    >
      <div style={{ marginBottom: 4, fontSize: 17, fontWeight: 700, color: INK }}>
        Working days &amp; time slots
      </div>
      <div style={{ marginBottom: 16, fontSize: 13, color: MUTED }}>
        Tap a day to choose when you're available
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DAYS.map((day) => {
          const isOpen = expanded === day;
          const daySchedule = schedule[day];
          const isWorking = SLOTS.some((s) => daySchedule[s.key]);
          return (
            <div
              key={day}
              style={{
                background: "#fff",
                border: `1px solid ${isOpen ? TEAL : BORDER}`,
                borderRadius: 14,
                overflow: "hidden",
                transition: "border-color 150ms",
              }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : day)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isWorking ? TEAL : "#D1D5DB",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>{day}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: isWorking ? TEAL : MUTED, fontWeight: 500 }}>
                    {summarize(daySchedule)}
                  </span>
                  <span
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 150ms",
                    }}
                  >
                    ›
                  </span>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {SLOTS.map((slot) => {
                    const active = daySchedule[slot.key];
                    return (
                      <button
                        key={slot.key}
                        onClick={() => toggleSlot(day, slot.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "11px 12px",
                          borderRadius: 10,
                          border: `1px solid ${active ? TEAL : BORDER}`,
                          background: active ? TEAL_BG : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 16 }}>{slot.icon}</span>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>
                              {slot.label}
                            </div>
                            <div style={{ fontSize: 12, color: MUTED }}>{slot.range}</div>
                          </div>
                        </div>
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            border: `1.5px solid ${active ? TEAL : "#D1D5DB"}`,
                            background: active ? TEAL : "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {active ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                  {day === "Monday" && (
                    <button
                      onClick={applyMondayToWeekdays}
                      style={{
                        marginTop: 2,
                        padding: "9px 10px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: TEAL,
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      Apply to Tue–Fri →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
