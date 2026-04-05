import React, { useEffect, useMemo, useState } from "react";

/* =========================================================
   YOUTH BASKETBALL TRACKER - SINGLE FILE APP (CHUNK 1)
   Chunk 1 includes:
   - constants / helpers / storage
   - app state / localStorage
   - seasons / players / lineup / live tracker
   - event system / undo
   - saved shifts tab
   - shared derived data helpers
   - shared UI helpers
   Chunk 2 will include:
   - Games tab + post-game box score editor
   - Rankings
   - Leaderboards
   - Synergy
   - Growth
   - Player Logs
   - final render close
========================================================= */

const STORAGE_KEY = "youth_basketball_tracker_v2_single_file";

const TABS = [
  "Live Tracker",
  "Saved Shifts",
  "Games",
  "Rankings",
  "Leaderboards",
  "Synergy",
  "Growth",
  "Player Logs",
  "Player Profiles",
  "Period Averages",
];

const POSITIONS = [1, 2, 3, 4, 5];

const TRACKED_STAT_KEYS = [
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "plusMinus",
];

const EVENT_TYPES = [
  { key: "2PM", label: "+2 made", team: "us", statBucket: "points" },
  { key: "2PA_MISS", label: "2PT miss", team: "us", statBucket: "points" },
  { key: "3PM", label: "+3 made", team: "us", statBucket: "points" },
  { key: "3PA_MISS", label: "3PT miss", team: "us", statBucket: "points" },
  { key: "FTM", label: "FT made", team: "us", statBucket: "points" },
  { key: "FTA_MISS", label: "FT miss", team: "us", statBucket: "points" },
  { key: "OREB", label: "OREB", team: "us", statBucket: "rebounds" },
  { key: "DREB", label: "DREB", team: "us", statBucket: "rebounds" },
  { key: "AST", label: "Assist", team: "us", statBucket: "assists" },
  { key: "TO", label: "Turnover", team: "us", statBucket: "turnovers" },
  { key: "STL", label: "Steal", team: "us", statBucket: "steals" },
  { key: "BLK", label: "Block", team: "us", statBucket: "blocks" },
  { key: "JB", label: "Jump ball", team: "us", statBucket: "points" },
  { key: "OPP_FT", label: "Opponent FT", team: "them", statBucket: null },
  { key: "OPP_2", label: "Opponent +2", team: "them", statBucket: null },
  { key: "OPP_3", label: "Opponent +3", team: "them", statBucket: null },
];

const DEFAULT_TRACKED = {
  points: true,
  rebounds: true,
  assists: true,
  steals: true,
  blocks: true,
  turnovers: true,
  plusMinus: true,
};

const EMPTY_TRACKED_COUNTS = {
  points: 0,
  rebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  plusMinus: 0,
};

const PLAYER_NUMERIC_FIELDS = [
  "points",
  "twoPM",
  "twoPA",
  "threePM",
  "threePA",
  "ftm",
  "ftMiss",
  "oreb",
  "dreb",
  "treb",
  "ast",
  "stl",
  "blk",
  "to",
  "jb",
  "plusMinus",
  "shifts",
];

const GAME_LOG_FIELDS = [
  "points",
  "treb",
  "ast",
  "stl",
  "blk",
  "to",
  "jb",
  "plusMinus",
  "twoPA",
  "threePA",
  "ftm",
  "ftMiss",
  "shifts",
];

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to load tracker data", error);
    return null;
  }
}

function saveStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save tracker data", error);
  }
}

function createBlankPlayerStats() {
  return {
    points: 0,
    twoPM: 0,
    twoPA: 0,
    threePM: 0,
    threePA: 0,
    ftm: 0,
    ftMiss: 0,
    oreb: 0,
    dreb: 0,
    treb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    to: 0,
    jb: 0,
    plusMinus: 0,
    shifts: 0,
    trackedShiftCounts: { ...EMPTY_TRACKED_COUNTS },
  };
}

function createTrackedValue(value = 0, tracked = true) {
  return {
    value: tracked ? safeNumber(value) : null,
    tracked,
  };
}

function createBlankBoxScoreForPlayer(tracked = DEFAULT_TRACKED) {
  const pointsTracked = !!tracked.points;
  const reboundsTracked = !!tracked.rebounds;
  const assistsTracked = !!tracked.assists;
  const stealsTracked = !!tracked.steals;
  const blocksTracked = !!tracked.blocks;
  const turnoversTracked = !!tracked.turnovers;
  const plusMinusTracked = !!tracked.plusMinus;

  return {
    points: createTrackedValue(0, pointsTracked),
    twoPM: createTrackedValue(0, pointsTracked),
    twoPA: createTrackedValue(0, pointsTracked),
    threePM: createTrackedValue(0, pointsTracked),
    threePA: createTrackedValue(0, pointsTracked),
    ftm: createTrackedValue(0, pointsTracked),
    ftMiss: createTrackedValue(0, pointsTracked),
    oreb: createTrackedValue(0, reboundsTracked),
    dreb: createTrackedValue(0, reboundsTracked),
    treb: createTrackedValue(0, reboundsTracked),
    ast: createTrackedValue(0, assistsTracked),
    stl: createTrackedValue(0, stealsTracked),
    blk: createTrackedValue(0, blocksTracked),
    to: createTrackedValue(0, turnoversTracked),
    jb: createTrackedValue(0, pointsTracked),
    plusMinus: createTrackedValue(0, plusMinusTracked),
    shifts: createTrackedValue(0, true),
  };
}

function createEmptySeason(name = "Season 1") {
  return {
    id: createId(),
    name,
    players: [],
    games: [],
    currentLineup: {
      1: "",
      2: "",
      3: "",
      4: "",
      5: "",
    },
    createdAt: new Date().toISOString(),
  };
}

function getEventDefinition(type) {
  return EVENT_TYPES.find((event) => event.key === type) || null;
}

function getStatBucketForField(field) {
  if (
    ["points", "twoPM", "twoPA", "threePM", "threePA", "ftm", "ftMiss", "jb"].includes(field)
  ) {
    return "points";
  }
  if (["oreb", "dreb", "treb"].includes(field)) return "rebounds";
  if (field === "ast") return "assists";
  if (field === "stl") return "steals";
  if (field === "blk") return "blocks";
  if (field === "to") return "turnovers";
  if (field === "plusMinus") return "plusMinus";
  if (field === "shifts") return "shifts";
  return null;
}

function buildBlankShiftStats(lineup) {
  const playerStats = {};
  Object.values(lineup).forEach((playerId) => {
    if (!playerId) return;
    if (!playerStats[playerId]) {
      playerStats[playerId] = createBlankPlayerStats();
    }
  });
  return playerStats;
}

function buildTrackedShiftCountsForShift(tracked = DEFAULT_TRACKED) {
  return {
    points: tracked.points ? 1 : 0,
    rebounds: tracked.rebounds ? 1 : 0,
    assists: tracked.assists ? 1 : 0,
    steals: tracked.steals ? 1 : 0,
    blocks: tracked.blocks ? 1 : 0,
    turnovers: tracked.turnovers ? 1 : 0,
    plusMinus: tracked.plusMinus ? 1 : 0,
  };
}

function addTrackedShiftCounts(target, source) {
  TRACKED_STAT_KEYS.forEach((key) => {
    target[key] = safeNumber(target[key]) + safeNumber(source[key]);
  });
}

function formatDecimal(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(value).toFixed(digits);
}

function formatPercent(made, attempts) {
  if (made === null || attempts === null) return null;
  if (!attempts) return "0.0%";
  return `${((made / attempts) * 100).toFixed(1)}%`;
}

function displayTrackedValue(value, tracked = true, digits = null) {
  if (!tracked || value === null || value === undefined) {
    return { text: "N/A", na: true };
  }
  if (digits !== null) {
    return { text: Number(value).toFixed(digits), na: false };
  }
  return { text: String(value), na: false };
}

function trackedFieldValueFromBoxScore(boxScoreEntry, field) {
  if (!boxScoreEntry || !boxScoreEntry[field]) {
    return { value: null, tracked: false };
  }
  return {
    value: boxScoreEntry[field].tracked ? safeNumber(boxScoreEntry[field].value) : null,
    tracked: !!boxScoreEntry[field].tracked,
  };
}

function summarizeShiftEvents(events, playersById) {
  if (!events.length) return "No events logged";
  return events
    .map((event) => {
      const playerName = event.playerId ? playersById[event.playerId]?.name || "Unknown" : "";
      const eventLabel = getEventDefinition(event.type)?.label || event.type;
      return playerName ? `${playerName} ${eventLabel}` : eventLabel;
    })
    .join(" • ");
}

function lineupToText(lineup, playersById) {
  return POSITIONS.map((pos) => {
    const pid = lineup[pos];
    const name = pid ? playersById[pid]?.name || "Unknown" : "—";
    return `P${pos}: ${name}`;
  }).join(" | ");
}

function doesFieldUseTrackedSetting(field, tracked) {
  const bucket = getStatBucketForField(field);
  if (bucket === "shifts") return true;
  if (!bucket) return false;
  return !!tracked[bucket];
}

function normalizeBoxScoreForTracked(boxScoreEntry, tracked) {
  const out = {};
  PLAYER_NUMERIC_FIELDS.forEach((field) => {
    if (field === "shifts") {
      const raw = boxScoreEntry?.[field];
      out[field] =
        raw && raw.tracked
          ? { value: safeNumber(raw.value), tracked: true }
          : { value: 0, tracked: true };
      return;
    }

    const shouldTrack = doesFieldUseTrackedSetting(field, tracked);
    const raw = boxScoreEntry?.[field];

    if (!shouldTrack) {
      out[field] = { value: null, tracked: false };
      return;
    }

    if (raw && typeof raw === "object") {
      out[field] = {
        value: raw.tracked ? safeNumber(raw.value) : null,
        tracked: !!raw.tracked,
      };
    } else {
      out[field] = { value: 0, tracked: true };
    }
  });

  return out;
}

function createGameFromLive({ opponent, tracked, players, gameDate }) {
  const baseBoxScoreEdits = {};
  players.forEach((player) => {
    baseBoxScoreEdits[player.id] = createBlankBoxScoreForPlayer(tracked);
  });

  return {
    id: createId(),
    date: gameDate || new Date().toISOString().slice(0, 10),
    opponent: opponent || "",
    tracked: { ...DEFAULT_TRACKED, ...(tracked || {}) },
    finalScore: { us: 0, them: 0 },
    shifts: [],
    boxScoreEdits: baseBoxScoreEdits,
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

function ensureSeasonShape(season) {
  return {
    id: season.id || createId(),
    name: season.name || "Season",
    players: Array.isArray(season.players) ? season.players : [],
    games: Array.isArray(season.games) ? season.games : [],
    currentLineup: season.currentLineup || { 1: "", 2: "", 3: "", 4: "", 5: "" },
    createdAt: season.createdAt || new Date().toISOString(),
  };
}

function ensureAppShape(data) {
  if (!data || !Array.isArray(data.seasons) || !data.seasons.length) {
    const firstSeason = createEmptySeason("Season 1");
    return {
      seasons: [firstSeason],
      activeSeasonId: firstSeason.id,
    };
  }

  const seasons = data.seasons.map(ensureSeasonShape);
  const activeSeasonId = seasons.some((season) => season.id === data.activeSeasonId)
    ? data.activeSeasonId
    : seasons[0].id;

  return {
    seasons,
    activeSeasonId,
  };
}

function eventRequiresPlayer(eventType) {
  return !["OPP_FT", "OPP_2", "OPP_3"].includes(eventType);
}

function scoreValueForOpponentEvent(type) {
  if (type === "OPP_FT") return 1;
  if (type === "OPP_2") return 2;
  if (type === "OPP_3") return 3;
  return 0;
}

function applySingleEventToShift(shift, event, tracked) {
  const nextShift = deepClone(shift);
  const playerId = event.playerId;
  const pointsTracked = !!tracked.points;
  const reboundsTracked = !!tracked.rebounds;
  const assistsTracked = !!tracked.assists;
  const stealsTracked = !!tracked.steals;
  const blocksTracked = !!tracked.blocks;
  const turnoversTracked = !!tracked.turnovers;
  const plusMinusTracked = !!tracked.plusMinus;

  if (playerId && !nextShift.playerStats[playerId]) {
    nextShift.playerStats[playerId] = createBlankPlayerStats();
  }

  const ps = playerId ? nextShift.playerStats[playerId] : null;

  switch (event.type) {
    case "2PM":
      nextShift.score.us += 2;
      if (ps) {
        ps.points += 2;
        ps.twoPM += 1;
        ps.twoPA += 1;
      }
      break;
    case "2PA_MISS":
      if (ps) ps.twoPA += 1;
      break;
    case "3PM":
      nextShift.score.us += 3;
      if (ps) {
        ps.points += 3;
        ps.threePM += 1;
        ps.threePA += 1;
      }
      break;
    case "3PA_MISS":
      if (ps) ps.threePA += 1;
      break;
    case "FTM":
      nextShift.score.us += 1;
      if (ps) {
        ps.points += 1;
        ps.ftm += 1;
      }
      break;
    case "FTA_MISS":
      if (ps) ps.ftMiss += 1;
      break;
    case "OREB":
      if (ps) {
        ps.oreb += 1;
        ps.treb += 1;
      }
      break;
    case "DREB":
      if (ps) {
        ps.dreb += 1;
        ps.treb += 1;
      }
      break;
    case "AST":
      if (ps) ps.ast += 1;
      break;
    case "TO":
      if (ps) ps.to += 1;
      break;
    case "STL":
      if (ps) ps.stl += 1;
      break;
    case "BLK":
      if (ps) ps.blk += 1;
      break;
    case "JB":
      if (ps) ps.jb += 1;
      break;
    case "OPP_FT":
      nextShift.score.them += 1;
      break;
    case "OPP_2":
      nextShift.score.them += 2;
      break;
    case "OPP_3":
      nextShift.score.them += 3;
      break;
    default:
      break;
  }

  const shiftPlusMinus = nextShift.score.us - nextShift.score.them;
  nextShift.plusMinus = shiftPlusMinus;

  if (plusMinusTracked) {
    Object.values(nextShift.lineup).forEach((pid) => {
      if (!pid) return;
      if (!nextShift.playerStats[pid]) nextShift.playerStats[pid] = createBlankPlayerStats();
      nextShift.playerStats[pid].plusMinus = shiftPlusMinus;
    });
  }

  Object.keys(nextShift.playerStats).forEach((pid) => {
    const stats = nextShift.playerStats[pid];
    stats.trackedShiftCounts.points = pointsTracked ? 1 : 0;
    stats.trackedShiftCounts.rebounds = reboundsTracked ? 1 : 0;
    stats.trackedShiftCounts.assists = assistsTracked ? 1 : 0;
    stats.trackedShiftCounts.steals = stealsTracked ? 1 : 0;
    stats.trackedShiftCounts.blocks = blocksTracked ? 1 : 0;
    stats.trackedShiftCounts.turnovers = turnoversTracked ? 1 : 0;
    stats.trackedShiftCounts.plusMinus = plusMinusTracked ? 1 : 0;
  });

  return nextShift;
}

function rebuildShiftFromEvents(baseShift, tracked) {
  const rebuilt = {
    ...deepClone(baseShift),
    score: { us: 0, them: 0 },
    plusMinus: 0,
    playerStats: buildBlankShiftStats(baseShift.lineup),
  };

  rebuilt.events.forEach((event) => {
    const applied = applySingleEventToShift(rebuilt, event, tracked);
    rebuilt.score = applied.score;
    rebuilt.plusMinus = applied.plusMinus;
    rebuilt.playerStats = applied.playerStats;
  });

  Object.keys(rebuilt.playerStats).forEach((pid) => {
    rebuilt.playerStats[pid].shifts = 1;
  });

  return rebuilt;
}

function aggregateShiftStatsIntoPlayer(target, shiftStats) {
  PLAYER_NUMERIC_FIELDS.forEach((field) => {
    if (field === "shifts") return;
    target[field] += safeNumber(shiftStats[field]);
  });
  target.shifts += safeNumber(shiftStats.shifts, 1);
  addTrackedShiftCounts(target.trackedShiftCounts, shiftStats.trackedShiftCounts || EMPTY_TRACKED_COUNTS);
}

function aggregateGameBaseBoxScoreFromShifts(game, playerIds) {
  const totals = {};
  playerIds.forEach((playerId) => {
    totals[playerId] = createBlankPlayerStats();
  });

  game.shifts.forEach((shift) => {
    Object.entries(shift.playerStats || {}).forEach(([playerId, stats]) => {
      if (!totals[playerId]) totals[playerId] = createBlankPlayerStats();
      aggregateShiftStatsIntoPlayer(totals[playerId], stats);
    });
  });

  return totals;
}

function buildDisplayGamePlayerStats(game, playerIds) {
  const baseTotals = aggregateGameBaseBoxScoreFromShifts(game, playerIds);
  const display = {};

  playerIds.forEach((playerId) => {
    const tracked = game.tracked || DEFAULT_TRACKED;
    const base = baseTotals[playerId] || createBlankPlayerStats();
    const editEntry = normalizeBoxScoreForTracked(game.boxScoreEdits?.[playerId], tracked);

    display[playerId] = {
      points: tracked.points ? editEntry.points.value : null,
      twoPM: tracked.points ? editEntry.twoPM.value : null,
      twoPA: tracked.points ? editEntry.twoPA.value : null,
      threePM: tracked.points ? editEntry.threePM.value : null,
      threePA: tracked.points ? editEntry.threePA.value : null,
      ftm: tracked.points ? editEntry.ftm.value : null,
      ftMiss: tracked.points ? editEntry.ftMiss.value : null,
      oreb: tracked.rebounds ? editEntry.oreb.value : null,
      dreb: tracked.rebounds ? editEntry.dreb.value : null,
      treb: tracked.rebounds ? editEntry.treb.value : null,
      ast: tracked.assists ? editEntry.ast.value : null,
      stl: tracked.steals ? editEntry.stl.value : null,
      blk: tracked.blocks ? editEntry.blk.value : null,
      to: tracked.turnovers ? editEntry.to.value : null,
      jb: tracked.points ? editEntry.jb.value : null,
      plusMinus: tracked.plusMinus ? editEntry.plusMinus.value : null,
      shifts: editEntry.shifts.value ?? base.shifts ?? 0,
      trackedByField: {
        points: tracked.points,
        twoPM: tracked.points,
        twoPA: tracked.points,
        threePM: tracked.points,
        threePA: tracked.points,
        ftm: tracked.points,
        ftMiss: tracked.points,
        oreb: tracked.rebounds,
        dreb: tracked.rebounds,
        treb: tracked.rebounds,
        ast: tracked.assists,
        stl: tracked.steals,
        blk: tracked.blocks,
        to: tracked.turnovers,
        jb: tracked.points,
        plusMinus: tracked.plusMinus,
        shifts: true,
      },
    };
  });

  return display;
}

function getSeasonAllShifts(season) {
  return (season.games || []).flatMap((game) =>
    (game.shifts || []).map((shift, index) => ({
      ...shift,
      gameId: game.id,
      gameDate: game.date,
      opponent: game.opponent,
      tracked: game.tracked || DEFAULT_TRACKED,
      shiftIndex: index,
    }))
  );
}

function getSeasonPlayersById(players) {
  return Object.fromEntries((players || []).map((player) => [player.id, player]));
}

function aggregateSeasonPlayerStats(season) {
  const playersById = getSeasonPlayersById(season.players || []);
  const result = {};

  (season.players || []).forEach((player) => {
    result[player.id] = createBlankPlayerStats();
  });

  (season.games || []).forEach((game) => {
    const displayStats = buildDisplayGamePlayerStats(
      game,
      (season.players || []).map((player) => player.id)
    );

    Object.entries(displayStats).forEach(([playerId, stats]) => {
      if (!result[playerId]) result[playerId] = createBlankPlayerStats();

      const target = result[playerId];
      const fieldsToAdd = [
        "points",
        "twoPM",
        "twoPA",
        "threePM",
        "threePA",
        "ftm",
        "ftMiss",
        "oreb",
        "dreb",
        "treb",
        "ast",
        "stl",
        "blk",
        "to",
        "jb",
        "plusMinus",
        "shifts",
      ];

      fieldsToAdd.forEach((field) => {
        if (stats[field] !== null && stats[field] !== undefined) {
          target[field] += safeNumber(stats[field]);
        }
      });

      if (game.tracked?.points) target.trackedShiftCounts.points += safeNumber(stats.shifts);
      if (game.tracked?.rebounds) target.trackedShiftCounts.rebounds += safeNumber(stats.shifts);
      if (game.tracked?.assists) target.trackedShiftCounts.assists += safeNumber(stats.shifts);
      if (game.tracked?.steals) target.trackedShiftCounts.steals += safeNumber(stats.shifts);
      if (game.tracked?.blocks) target.trackedShiftCounts.blocks += safeNumber(stats.shifts);
      if (game.tracked?.turnovers) target.trackedShiftCounts.turnovers += safeNumber(stats.shifts);
      if (game.tracked?.plusMinus) target.trackedShiftCounts.plusMinus += safeNumber(stats.shifts);
    });
  });

  return { playersById, playerTotals: result };
}

function statPerShift(total, trackedCount) {
  if (!trackedCount) return null;
  return total / trackedCount;
}

function countTrackedGamesForPlayer(season, playerId, field) {
  return (season.games || []).reduce((count, game) => {
    const tracked = doesFieldUseTrackedSetting(field, game.tracked || DEFAULT_TRACKED);
    if (!tracked) return count;

    const display = buildDisplayGamePlayerStats(game, [playerId])[playerId];
    if (!display) return count;

    const shiftsPlayed = safeNumber(display.shifts);
    if (shiftsPlayed <= 0) return count;

    return count + 1;
  }, 0);
}

function statPerGame(season, playerId, field, total) {
  const trackedGames = countTrackedGamesForPlayer(season, playerId, field);
  if (!trackedGames) return null;
  return total / trackedGames;
}

function reorderSeasonsWithActiveSelection(seasons, activeSeasonId) {
  return {
    seasons,
    activeSeasonId: seasons.some((season) => season.id === activeSeasonId)
      ? activeSeasonId
      : seasons[0]?.id || "",
  };
}

function Card({ title, right, children, style = {} }) {
  return (
    <div style={{ ...styles.card, ...style }}>
      {(title || right) && (
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>{title}</div>
          <div>{right}</div>
        </div>
      )}
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={styles.sectionTitle}>{children}</div>;
}

function StatCell({ value, digits = null, tracked = true, positiveColor = null, negativeColor = null }) {
  const display = displayTrackedValue(value, tracked, digits);

  let color = styles.text;
  if (!display.na && typeof value === "number") {
    if (positiveColor && value > 0) color = positiveColor;
    if (negativeColor && value < 0) color = negativeColor;
  }

  return (
    <span
      style={{
        color: display.na ? styles.mutedText.color : color,
        fontStyle: display.na ? "italic" : "normal",
        opacity: display.na ? 0.75 : 1,
      }}
    >
      {display.text}
    </span>
  );
}

function TogglePill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.pill,
        ...(active ? styles.pillActive : {}),
      }}
    >
      {children}
    </button>
  );
}

function SmallButton({ children, onClick, variant = "secondary", disabled = false, style = {} }) {
  const variantStyle =
    variant === "primary"
      ? styles.primaryButton
      : variant === "danger"
      ? styles.dangerButton
      : styles.secondaryButton;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles.buttonBase,
        ...variantStyle,
        ...(disabled ? styles.buttonDisabled : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function TableScroll({ children }) {
  return <div style={styles.tableScroll}>{children}</div>;
}

const styles = {
  bg: "#08182e",
  panel: "#102746",
  panelAlt: "#17355f",
  panelAlt2: "#0d2140",
  border: "#294b79",
  accent: "#f2c14e",
  accentSoft: "#fff2c7",
  text: "#ffffff",
  mutedText: { color: "#9eb3cf" },
  green: "#70d48a",
  red: "#ff7b7b",
  neutral: "#d7e2f1",

  app: {
    minHeight: "100vh",
    background: "#08182e",
    color: "#ffffff",
    fontFamily: "Inter, system-ui, sans-serif",
    padding: "16px",
  },
  headingFont: {
    fontFamily: '"Bebas Neue", Inter, sans-serif',
    letterSpacing: "0.04em",
  },
  headerTitle: {
    fontFamily: '"Bebas Neue", Inter, sans-serif',
    fontSize: "40px",
    lineHeight: 1,
    letterSpacing: "0.05em",
    margin: 0,
  },
  topBar: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "end",
    marginBottom: "16px",
  },
  topBarRight: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  label: {
    display: "block",
    fontSize: "12px",
    color: "#9eb3cf",
    marginBottom: "6px",
  },
  input: {
    background: "#0d2140",
    color: "#ffffff",
    border: "1px solid #294b79",
    borderRadius: "10px",
    padding: "10px 12px",
    minHeight: "40px",
    outline: "none",
  },
  select: {
    background: "#0d2140",
    color: "#ffffff",
    border: "1px solid #294b79",
    borderRadius: "10px",
    padding: "10px 12px",
    minHeight: "40px",
    outline: "none",
  },
  textarea: {
    background: "#0d2140",
    color: "#ffffff",
    border: "1px solid #294b79",
    borderRadius: "10px",
    padding: "10px 12px",
    minHeight: "88px",
    outline: "none",
    width: "100%",
    resize: "vertical",
  },
  tabBar: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  tabButton: {
    background: "#102746",
    color: "#ffffff",
    border: "1px solid #294b79",
    borderRadius: "999px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  tabButtonActive: {
    background: "#f2c14e",
    color: "#08182e",
    border: "1px solid #f2c14e",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: "16px",
  },
  contentGridSingle: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "16px",
  },
  card: {
    background: "#102746",
    border: "1px solid #294b79",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: "10px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },
  cardTitle: {
    fontFamily: '"Bebas Neue", Inter, sans-serif',
    fontSize: "26px",
    letterSpacing: "0.05em",
  },
  sectionTitle: {
    fontFamily: '"Bebas Neue", Inter, sans-serif',
    fontSize: "22px",
    letterSpacing: "0.04em",
    marginBottom: "10px",
  },
  statStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
  },
  statBox: {
    background: "#17355f",
    border: "1px solid #294b79",
    borderRadius: "14px",
    padding: "12px",
  },
    statLabel: {
    fontSize: "12px",
    color: "#9eb3cf",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 800,
  },
  divider: {
    height: "1px",
    background: "rgba(255,255,255,0.08)",
    margin: "14px 0",
  },
  buttonBase: {
    border: "none",
    borderRadius: "12px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
    transition: "0.15s ease",
  },
  primaryButton: {
    background: "#f2c14e",
    color: "#08182e",
  },
  secondaryButton: {
    background: "#17355f",
    color: "#ffffff",
    border: "1px solid #294b79",
  },
  dangerButton: {
    background: "#5d1f2b",
    color: "#fff1f1",
    border: "1px solid #9c4253",
  },
  buttonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  pill: {
    borderRadius: "999px",
    border: "1px solid #294b79",
    background: "#0d2140",
    color: "#ffffff",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 600,
  },
  pillActive: {
    background: "#f2c14e",
    color: "#08182e",
    border: "1px solid #f2c14e",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  },
  lineupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
  },
  eventGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
    gap: "10px",
  },
  eventButton: {
    background: "#17355f",
    border: "1px solid #294b79",
    color: "#ffffff",
    borderRadius: "14px",
    padding: "12px",
    minHeight: "56px",
    cursor: "pointer",
    textAlign: "left",
    fontWeight: 700,
  },
  activeEventButton: {
    background: "#f2c14e",
    color: "#08182e",
    border: "1px solid #f2c14e",
  },
  miniText: {
    fontSize: "12px",
    color: "#9eb3cf",
  },
  eventLogList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "300px",
    overflow: "auto",
  },
  eventLogItem: {
    background: "#0d2140",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "10px 12px",
  },
  tableScroll: {
    overflowX: "auto",
    width: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "820px",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "#fff2c7",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  shiftCard: {
    background: "#17355f",
    border: "1px solid #294b79",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "12px",
  },
  badge: {
    display: "inline-block",
    borderRadius: "999px",
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: 700,
    background: "#0d2140",
    border: "1px solid #294b79",
    marginRight: "6px",
    marginBottom: "6px",
  },
  chipNA: {
    display: "inline-block",
    color: "#9eb3cf",
    fontStyle: "italic",
  },
    clickableName: {
    color: "#fff2c7",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },

  summaryRank: {
    marginLeft: "8px",
    color: "#f2c14e",
    fontWeight: 800,
    fontSize: "12px",
  },
  summaryRankTop3: (rank) => ({
  marginLeft: "8px",
  fontWeight: 900,
  fontSize: "12px",
  borderRadius: "999px",
  padding: "2px 6px",
  border: "1px solid",
  ...(rank === 1 && {
    color: "#FFD700",
    background: "rgba(255, 215, 0, 0.18)",
    borderColor: "rgba(255, 215, 0, 0.6)",
  }),
  ...(rank === 2 && {
    color: "#C0C0C0",
    background: "rgba(192, 192, 192, 0.18)",
    borderColor: "rgba(192, 192, 192, 0.6)",
  }),
  ...(rank === 3 && {
    color: "#CD7F32",
    background: "rgba(205, 127, 50, 0.18)",
    borderColor: "rgba(205, 127, 50, 0.6)",
  }),
}),
  summaryStatLabel: {
    fontWeight: 700,
    color: "#fff2c7",
  },

};

/* =========================================================
   MAIN COMPONENT
========================================================= */

function buildDuoMatrixData(players, synergyMap, selectedMatrixPlayerId) {
  const playerIds = players.map((player) => player.id);
  const values = [];
  const positiveValues = [];
  const negativeValues = [];
  const cellMap = {};

  playerIds.forEach((a) => {
    playerIds.forEach((b) => {
      if (a === b) return;
      const key = [a, b].sort().join("|");
      const row = synergyMap[key];
      const value = row ? row.avgPlusMinus : null;

      if (value !== null) {
        values.push(value);
        if (value > 0) positiveValues.push(value);
        if (value < 0) negativeValues.push(value);
      }

      cellMap[key] = value;
    });
  });

  const sortedPositive = [...positiveValues].sort((a, b) => a - b);
  const sortedNegative = [...negativeValues].sort((a, b) => a - b);

  const positiveMidCut = sortedPositive.length
    ? sortedPositive[Math.floor(sortedPositive.length * 0.5)]
    : null;

  const positiveTopCut = sortedPositive.length
    ? sortedPositive[Math.floor(sortedPositive.length * 0.8)]
    : null;

  const negativeWorstCut = sortedNegative.length
    ? sortedNegative[Math.floor(sortedNegative.length * 0.2)]
    : null;

  const negativeMidCut = sortedNegative.length
    ? sortedNegative[Math.floor(sortedNegative.length * 0.5)]
    : null;

  return {
    playerIds: selectedMatrixPlayerId
      ? playerIds.filter((pid) => pid === selectedMatrixPlayerId)
      : playerIds,
    allPlayerIds: playerIds,
    cellMap,
    positiveMidCut,
    positiveTopCut,
    negativeWorstCut,
    negativeMidCut,
  };
}

function getRowRankStyle(rowPlayerId, colPlayerId, duoMatrix, allPlayerIds) {
  const rowValues = allPlayerIds
    .filter((otherId) => otherId !== rowPlayerId)
    .map((otherId) => duoMatrix?.[rowPlayerId]?.[otherId])
    .filter((value) => value !== null && value !== undefined)
    .sort((a, b) => b - a);

  const value = duoMatrix?.[rowPlayerId]?.[colPlayerId];
  if (value === null || value === undefined || !rowValues.length) {
    return "neutral";
  }

  const firstIndex = rowValues.findIndex((v) => v === value);
  if (firstIndex === -1) return "neutral";

  const rankIndex = firstIndex;
  const total = rowValues.length;

  if (rankIndex === 0) return "best";
  if (rankIndex === total - 1) return "worst";

  const midpoint = total / 2;

  if (rankIndex < midpoint) return "upper";
  return "lower";
}
function buildSimpleDuoMatrix(players, synergyRows) {
  const playerIds = players.map((player) => player.id);
  const matrix = {};

  playerIds.forEach((rowId) => {
    matrix[rowId] = {};
    playerIds.forEach((colId) => {
      if (rowId === colId) {
        matrix[rowId][colId] = null;
        return;
      }

      const key = [rowId, colId].sort().join("|");
      const row = synergyRows.find((item) => item.key === key);
      matrix[rowId][colId] = row ? row.avgPlusMinus : null;
    });
  });

  return matrix;
}

function getGamePlayerImpactScore(stats) {
  if (!stats) return null;

  const points = stats.points ?? 0;
  const rebounds = stats.treb ?? 0;
  const assists = stats.ast ?? 0;
  const steals = stats.stl ?? 0;
  const blocks = stats.blk ?? 0;
  const plusMinus = stats.plusMinus ?? 0;
  const jumpBalls = stats.jb ?? 0;
  const turnovers = stats.to ?? 0;

  const twoPM = stats.twoPM ?? 0;
  const twoPA = stats.twoPA ?? 0;
  const threePM = stats.threePM ?? 0;
  const threePA = stats.threePA ?? 0;
  const ftMiss = stats.ftMiss ?? 0;

  const missedFG = (twoPA - twoPM) + (threePA - threePM);

  const score =
    points +
    1.2 * rebounds +
    1.5 * assists +
    2.0 * steals +
    2.0 * blocks +
    0.8 * plusMinus +
    0.75 * jumpBalls -
    1.2 * turnovers -
    0.4 * missedFG -
    0.25 * ftMiss;

  return Number(score.toFixed(2));
}

function getImpactFromTotals(stats) {
  if (!stats) return null;

  const points = stats.points ?? 0;
  const rebounds = stats.treb ?? 0;
  const assists = stats.ast ?? 0;
  const steals = stats.stl ?? 0;
  const blocks = stats.blk ?? 0;
  const plusMinus = stats.plusMinus ?? 0;
  const jumpBalls = stats.jb ?? 0;
  const turnovers = stats.to ?? 0;

  const twoPM = stats.twoPM ?? 0;
  const twoPA = stats.twoPA ?? 0;
  const threePM = stats.threePM ?? 0;
  const threePA = stats.threePA ?? 0;
  const ftMiss = stats.ftMiss ?? 0;

  const missedFG = (twoPA - twoPM) + (threePA - threePM);

  const score =
    points +
    1.2 * rebounds +
    1.5 * assists +
    2.0 * steals +
    2.0 * blocks +
    0.8 * plusMinus +
    0.75 * jumpBalls -
    1.2 * turnovers -
    0.4 * missedFG -
    0.25 * ftMiss;

  return Number(score.toFixed(2));
}

function getSuggestedMVPsForGame(game, players) {
  const displayStats = buildDisplayGamePlayerStats(
    game,
    players.map((player) => player.id)
  );

   return players
    .map((player) => {
      const stats = displayStats[player.id];
      if (!stats) return null;

      return {
        playerId: player.id,
        name: player.name,
        jersey: player.jersey || "",
        impactScore: getGamePlayerImpactScore(stats),
        stats,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.impactScore - a.impactScore);
}

function getTrackedCountForCategory(stats, category) {
  switch (category) {
    case "points":
    case "twoPM":
    case "twoPA":
    case "threePM":
    case "threePA":
    case "ftm":
    case "ftMiss":
    case "jb":
      return stats.trackedShiftCounts.points;
    case "oreb":
    case "dreb":
    case "treb":
      return stats.trackedShiftCounts.rebounds;
    case "ast":
      return stats.trackedShiftCounts.assists;
    case "stl":
      return stats.trackedShiftCounts.steals;
    case "blk":
      return stats.trackedShiftCounts.blocks;
    case "to":
      return stats.trackedShiftCounts.turnovers;
    case "plusMinus":
      return stats.trackedShiftCounts.plusMinus;
    default:
      return 0;
  }
}

function buildPeriodPlayerTotals(games, players) {
  const totals = {};

  players.forEach((player) => {
    totals[player.id] = createBlankPlayerStats();
    totals[player.id].trackedGames = {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      plusMinus: 0,
    };
  });

  games.forEach((game) => {
    const displayStats = buildDisplayGamePlayerStats(
      game,
      players.map((player) => player.id)
    );

    players.forEach((player) => {
      const stats = displayStats[player.id];
      if (!stats) return;

      const target = totals[player.id];

      [
        "points",
        "twoPM",
        "twoPA",
        "threePM",
        "threePA",
        "ftm",
        "ftMiss",
        "oreb",
        "dreb",
        "treb",
        "ast",
        "stl",
        "blk",
        "to",
        "jb",
        "plusMinus",
        "shifts",
      ].forEach((field) => {
        if (stats[field] !== null && stats[field] !== undefined) {
          target[field] += safeNumber(stats[field]);
        }
      });

      if (game.tracked?.points) target.trackedGames.points += 1;
      if (game.tracked?.rebounds) target.trackedGames.rebounds += 1;
      if (game.tracked?.assists) target.trackedGames.assists += 1;
      if (game.tracked?.steals) target.trackedGames.steals += 1;
      if (game.tracked?.blocks) target.trackedGames.blocks += 1;
      if (game.tracked?.turnovers) target.trackedGames.turnovers += 1;
      if (game.tracked?.plusMinus) target.trackedGames.plusMinus += 1;

      if (game.tracked?.points) target.trackedShiftCounts.points += safeNumber(stats.shifts);
      if (game.tracked?.rebounds) target.trackedShiftCounts.rebounds += safeNumber(stats.shifts);
      if (game.tracked?.assists) target.trackedShiftCounts.assists += safeNumber(stats.shifts);
      if (game.tracked?.steals) target.trackedShiftCounts.steals += safeNumber(stats.shifts);
      if (game.tracked?.blocks) target.trackedShiftCounts.blocks += safeNumber(stats.shifts);
      if (game.tracked?.turnovers) target.trackedShiftCounts.turnovers += safeNumber(stats.shifts);
      if (game.tracked?.plusMinus) target.trackedShiftCounts.plusMinus += safeNumber(stats.shifts);
    });
  });

  return totals;
}

function getPeriodDisplayValue(totals, mode, field) {
  if (mode === "totals") {
    if (field === "ftPct") {
      const fta = totals.ftm + totals.ftMiss;
      return fta ? (totals.ftm / fta) * 100 : null;
    }
    if (field === "fta") return totals.ftm + totals.ftMiss;
    return totals[field];
  }

  if (mode === "perShift") {
    if (field === "ftPct") {
      const fta = totals.ftm + totals.ftMiss;
      return fta ? (totals.ftm / fta) * 100 : null;
    }
    if (field === "fta") {
      const tracked = getTrackedCountForCategory(totals, "ftm");
      return tracked ? (totals.ftm + totals.ftMiss) / tracked : null;
    }

    const tracked = getTrackedCountForCategory(totals, field);
    return tracked ? totals[field] / tracked : null;
  }

  if (mode === "perGame") {
  if (field === "ftPct") {
    const trackedGames = totals.trackedGames.points;
    const fta = totals.ftm + totals.ftMiss;
    return trackedGames && fta ? (totals.ftm / fta) * 100 : null;
  }

  if (field === "fta") {
    const trackedGames = totals.trackedGames.points;
    return trackedGames ? (totals.ftm + totals.ftMiss) / trackedGames : null;
  }

  if (field === "shifts") {
    const gameCount = Math.max(
      totals.trackedGames.points,
      totals.trackedGames.rebounds,
      totals.trackedGames.assists,
      totals.trackedGames.steals,
      totals.trackedGames.blocks,
      totals.trackedGames.turnovers,
      totals.trackedGames.plusMinus
    );

    return gameCount ? totals.shifts / gameCount : null;
  }

  let trackedGames = 0;

  if (["points", "twoPM", "twoPA", "threePM", "threePA", "ftm", "ftMiss", "jb"].includes(field)) {
    trackedGames = totals.trackedGames.points;
  } else if (["oreb", "dreb", "treb"].includes(field)) {
    trackedGames = totals.trackedGames.rebounds;
  } else if (field === "ast") {
    trackedGames = totals.trackedGames.assists;
  } else if (field === "stl") {
    trackedGames = totals.trackedGames.steals;
  } else if (field === "blk") {
    trackedGames = totals.trackedGames.blocks;
  } else if (field === "to") {
    trackedGames = totals.trackedGames.turnovers;
  } else if (field === "plusMinus") {
    trackedGames = totals.trackedGames.plusMinus;
  }

  return trackedGames ? totals[field] / trackedGames : null;
}

   return null;
}

function getPlayerProfileSeasonHighs(season, playerId) {
  const highs = {
    plusMinus: null,
    points: null,
    rebounds: null,
    steals: null,
    impact: null,
  };

  (season.games || []).forEach((game) => {
    const stats = buildDisplayGamePlayerStats(game, [playerId])[playerId];
    if (!stats) return;

    function maybeUpdateHigh(key, isTracked, rawValue) {
      if (!isTracked || rawValue === null || rawValue === undefined) return;

      const numericValue = safeNumber(rawValue);
      if (!highs[key] || numericValue > highs[key].value) {
        highs[key] = {
          value: numericValue,
          gameId: game.id,
          date: game.date,
          opponent: game.opponent || "",
        };
      }
    }

    maybeUpdateHigh("plusMinus", !!stats.trackedByField?.plusMinus, stats.plusMinus);
    maybeUpdateHigh("points", !!stats.trackedByField?.points, stats.points);
    maybeUpdateHigh("rebounds", !!stats.trackedByField?.treb, stats.treb);
    maybeUpdateHigh("steals", !!stats.trackedByField?.stl, stats.stl);

    const impactFullyTracked =
      !!stats.trackedByField?.points &&
      !!stats.trackedByField?.treb &&
      !!stats.trackedByField?.ast &&
      !!stats.trackedByField?.stl &&
      !!stats.trackedByField?.blk &&
      !!stats.trackedByField?.to &&
      !!stats.trackedByField?.plusMinus;

    if (impactFullyTracked) {
      const impactValue = getGamePlayerImpactScore(stats);
      maybeUpdateHigh("impact", true, impactValue);
    }
  });

  return highs;
}

function getPlayerOnCourtStats(season, playerId) {
  const result = {
    pointsForOnCourt: 0,
    pointsAgainstOnCourt: 0,
    netOnCourt: 0,
    shiftsPlayed: 0,
  };

  (season.games || []).forEach((game) => {
    (game.shifts || []).forEach((shift) => {
      const lineupPlayerIds = Object.values(shift.lineup || {}).filter(Boolean);
      if (!lineupPlayerIds.includes(playerId)) return;

      const pointsFor = safeNumber(shift.score?.us);
      const pointsAgainst = safeNumber(shift.score?.them);

      result.pointsForOnCourt += pointsFor;
      result.pointsAgainstOnCourt += pointsAgainst;
      result.shiftsPlayed += 1;
    });
  });

  result.netOnCourt = result.pointsForOnCourt - result.pointsAgainstOnCourt;

  return result;
}

function buildPlayerProfileData(season, playerId, playerTotals) {
  if (!playerId) return null;

  const totals = playerTotals[playerId] || createBlankPlayerStats();
  const player = (season.players || []).find((p) => p.id === playerId);
  if (!player) return null;
  const onCourtStats = getPlayerOnCourtStats(season, playerId);

  const gamesWithPlayer = (season.games || []).filter((game) => {
    const stats = buildDisplayGamePlayerStats(game, [playerId])[playerId];
    return stats && safeNumber(stats.shifts) > 0;
  });

  const trackedGames = {
    points: countTrackedGamesForPlayer(season, playerId, "points"),
    rebounds: countTrackedGamesForPlayer(season, playerId, "treb"),
    assists: countTrackedGamesForPlayer(season, playerId, "ast"),
    steals: countTrackedGamesForPlayer(season, playerId, "stl"),
    blocks: countTrackedGamesForPlayer(season, playerId, "blk"),
    turnovers: countTrackedGamesForPlayer(season, playerId, "to"),
    plusMinus: countTrackedGamesForPlayer(season, playerId, "plusMinus"),
  };

  const perShift = {
    points: statPerShift(totals.points, totals.trackedShiftCounts.points),
    rebounds: statPerShift(totals.treb, totals.trackedShiftCounts.rebounds),
    assists: statPerShift(totals.ast, totals.trackedShiftCounts.assists),
    steals: statPerShift(totals.stl, totals.trackedShiftCounts.steals),
    blocks: statPerShift(totals.blk, totals.trackedShiftCounts.blocks),
    turnovers: statPerShift(totals.to, totals.trackedShiftCounts.turnovers),
    plusMinus: statPerShift(totals.plusMinus, totals.trackedShiftCounts.plusMinus),
    impact: statPerShift(
      getImpactFromTotals(totals),
      totals.trackedShiftCounts.plusMinus
    ),
  };

  const perGame = {
    points: statPerGame(season, playerId, "points", totals.points),
    rebounds: statPerGame(season, playerId, "treb", totals.treb),
    assists: statPerGame(season, playerId, "ast", totals.ast),
    steals: statPerGame(season, playerId, "stl", totals.stl),
    blocks: statPerGame(season, playerId, "blk", totals.blk),
    turnovers: statPerGame(season, playerId, "to", totals.to),
    plusMinus: statPerGame(season, playerId, "plusMinus", totals.plusMinus),
    impact:
      trackedGames.plusMinus > 0
        ? getImpactFromTotals(totals) / trackedGames.plusMinus
        : null,
  };

    return {
    player,
    totals: {
      ...totals,
      impact: getImpactFromTotals(totals),
    },
    perGame,
    perShift,
    onCourtStats,
    seasonHighs: getPlayerProfileSeasonHighs(season, playerId),
    trackedGames,
    gamesPlayed: gamesWithPlayer.length,
  };
}

export default function App() {
  const [appData, setAppData] = useState(() => ensureAppShape(loadStorage()));
  const [activeTab, setActiveTab] = useState("Live Tracker");

  const [liveOpponent, setLiveOpponent] = useState("");
  const [liveGameDate, setLiveGameDate] = useState(new Date().toISOString().slice(0, 10));
  const [liveTracked, setLiveTracked] = useState({ ...DEFAULT_TRACKED });

  const [currentGameId, setCurrentGameId] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [selectedLivePlayerId, setSelectedLivePlayerId] = useState("");
  const [editingShiftId, setEditingShiftId] = useState(null);

  const [selectedGameId, setSelectedGameId] = useState(null);
  const [boxScoreDraft, setBoxScoreDraft] = useState(null);

  const [rankingsSort, setRankingsSort] = useState({ key: "points", dir: "desc" });
  const [leaderboardMode, setLeaderboardMode] = useState("totals");
  const [visibleLeaderboardStats, setVisibleLeaderboardStats] = useState([
    "impact",
    "points",
    "plusMinus",
    "treb",
    "ast",
    "stl",
  ]);

  const [synergyMode, setSynergyMode] = useState("duos");
  const [synergySortKey, setSynergySortKey] = useState("avg");
  const [synergyMinTimes, setSynergyMinTimes] = useState(1);
  const [synergyExactOnly, setSynergyExactOnly] = useState(false);
  const [synergyFocusPlayerId, setSynergyFocusPlayerId] = useState("");
  const [selectedSynergyKey, setSelectedSynergyKey] = useState("");
  const [selectedMatrixPlayerId, setSelectedMatrixPlayerId] = useState("");

  const [growthRangeAStart, setGrowthRangeAStart] = useState(1);
  const [growthRangeAEnd, setGrowthRangeAEnd] = useState(3);
  const [growthRangeBStart, setGrowthRangeBStart] = useState(4);
  const [growthRangeBEnd, setGrowthRangeBEnd] = useState(6);
  const [growthMode, setGrowthMode] = useState("perShift");

  const [periodStartGame, setPeriodStartGame] = useState(1);
  const [periodEndGame, setPeriodEndGame] = useState(3);
  const [periodMode, setPeriodMode] = useState("perGame");

    const [selectedLogPlayerId, setSelectedLogPlayerId] = useState("");
  const [selectedProfilePlayerId, setSelectedProfilePlayerId] = useState("");
  const [profileDisplayMode, setProfileDisplayMode] = useState("perGame");

  useEffect(() => {
    saveStorage(appData);
  }, [appData]);

  const activeSeason = useMemo(() => {
    return (
      appData.seasons.find((season) => season.id === appData.activeSeasonId) ||
      appData.seasons[0]
    );
  }, [appData]);

  const players = activeSeason?.players || [];
  const playersById = useMemo(() => getSeasonPlayersById(players), [players]);

  const currentGame = useMemo(() => {
    if (!currentGameId) return null;
    return (activeSeason.games || []).find((game) => game.id === currentGameId) || null;
  }, [activeSeason.games, currentGameId]);

  const allSeasonShifts = useMemo(() => getSeasonAllShifts(activeSeason), [activeSeason]);

  const { playerTotals } = useMemo(() => aggregateSeasonPlayerStats(activeSeason), [activeSeason]);

  const leaderboardStatOptions = [
    { key: "impact", label: "Impact" },
    { key: "points", label: "Points" },
    { key: "plusMinus", label: "+/-" },
    { key: "treb", label: "Rebounds" },
    { key: "ast", label: "Assists" },
    { key: "stl", label: "Steals" },
    { key: "blk", label: "Blocks" },
    { key: "to", label: "Turnovers" },
    { key: "twoPM", label: "2PM" },
    { key: "twoPA", label: "2PA" },
    { key: "threePM", label: "3PM" },
    { key: "threePA", label: "3PA" },
    { key: "ftm", label: "FTM" },
    { key: "fta", label: "FTA" },
    { key: "ftPct", label: "FT%" },
    { key: "jb", label: "Jump Balls" },
  ];

  const selectedPlayerProfile = useMemo(() => {
    return buildPlayerProfileData(
      activeSeason,
      selectedProfilePlayerId,
      playerTotals
    );
  }, [activeSeason, selectedProfilePlayerId, playerTotals]);

  useEffect(() => {
    if (!selectedLogPlayerId && players.length) {
      setSelectedLogPlayerId(players[0].id);
    }
  }, [players, selectedLogPlayerId]);

  useEffect(() => {
    if (!selectedProfilePlayerId && players.length) {
      setSelectedProfilePlayerId(players[0].id);
    }
  }, [players, selectedProfilePlayerId]);

  function updateActiveSeason(updater) {
    setAppData((prev) => {
      const seasons = prev.seasons.map((season) =>
        season.id === prev.activeSeasonId ? updater(season) : season
      );
      return {
        ...prev,
        seasons,
      };
    });
  }

  function setCurrentLineupPosition(position, playerId) {
    updateActiveSeason((season) => ({
      ...season,
      currentLineup: {
        ...(season.currentLineup || { 1: "", 2: "", 3: "", 4: "", 5: "" }),
        [position]: playerId,
      },
    }));
  }

  function addSeason() {
    const nextNumber = appData.seasons.length + 1;
    const name = window.prompt("Season name", `Season ${nextNumber}`);
    if (!name || !name.trim()) return;

    const newSeason = createEmptySeason(name.trim());
    setAppData((prev) => ({
      seasons: [...prev.seasons, newSeason],
      activeSeasonId: newSeason.id,
    }));
    setCurrentGameId(null);
    setCurrentShift(null);
    setEditingShiftId(null);
  }

  function renameSeason() {
    const currentName = activeSeason?.name || "Season";
    const nextName = window.prompt("Rename season", currentName);
    if (!nextName || !nextName.trim()) return;

    updateActiveSeason((season) => ({
      ...season,
      name: nextName.trim(),
    }));
  }

  function addPlayer() {
    const name = window.prompt("Player name");
    if (!name || !name.trim()) return;
    const jersey = window.prompt("Jersey number (optional)") || "";

    updateActiveSeason((season) => ({
      ...season,
      players: [
        ...season.players,
        {
          id: createId(),
          name: name.trim(),
          jersey: jersey.trim(),
        },
      ],
    }));
  }

  function deletePlayer(playerId) {
    const player = playersById[playerId];
    const okay = window.confirm(`Delete ${player?.name || "this player"}?`);
    if (!okay) return;

    updateActiveSeason((season) => ({
      ...season,
      players: season.players.filter((player) => player.id !== playerId),
      currentLineup: Object.fromEntries(
        Object.entries(season.currentLineup || {}).map(([pos, pid]) => [
          pos,
          pid === playerId ? "" : pid,
        ])
      ),
      games: season.games.map((game) => ({
        ...game,
        shifts: (game.shifts || []).map((shift) => {
          const updatedLineup = Object.fromEntries(
            Object.entries(shift.lineup || {}).map(([pos, pid]) => [pos, pid === playerId ? "" : pid])
          );

          const updatedPlayerStats = { ...(shift.playerStats || {}) };
          delete updatedPlayerStats[playerId];

          return {
            ...shift,
            lineup: updatedLineup,
            playerStats: updatedPlayerStats,
          };
        }),
        boxScoreEdits: Object.fromEntries(
          Object.entries(game.boxScoreEdits || {}).filter(([pid]) => pid !== playerId)
        ),
      })),
    }));

        if (selectedLivePlayerId === playerId) setSelectedLivePlayerId("");
    if (selectedLogPlayerId === playerId) setSelectedLogPlayerId("");
    if (selectedProfilePlayerId === playerId) setSelectedProfilePlayerId("");
    if (synergyFocusPlayerId === playerId) setSynergyFocusPlayerId("");
    if (selectedMatrixPlayerId === playerId) setSelectedMatrixPlayerId("");
  }

  function toggleTrackedSetting(key) {
    setLiveTracked((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function toggleLeaderboardStat(statKey) {
    setVisibleLeaderboardStats((prev) =>
      prev.includes(statKey)
        ? prev.filter((key) => key !== statKey)
        : [...prev, statKey]
    );
  }

function getPlayerRank(players, getValue, playerId) {
  const ranked = players
    .map((p) => ({
      id: p.id,
      value: getValue(p.id),
    }))
    .filter((p) => p.value !== null)
    .sort((a, b) => b.value - a.value);

  const index = ranked.findIndex((p) => p.id === playerId);
  return index === -1 ? null : index + 1;
}

  function startGame() {
    if (!players.length) {
      window.alert("Add players before starting a game.");
      return;
    }

    const game = createGameFromLive({
      opponent: liveOpponent,
      tracked: liveTracked,
      players,
      gameDate: liveGameDate,
    });

    updateActiveSeason((season) => ({
      ...season,
      games: [...season.games, game],
    }));

    setCurrentGameId(game.id);
    setCurrentShift(null);
    setEditingShiftId(null);
    setSelectedLivePlayerId("");
    setSelectedGameId(game.id);
  }

  function endGame() {
    setCurrentShift(null);
    setEditingShiftId(null);
    setSelectedLivePlayerId("");
    setCurrentGameId(null);
  }

  function startNewShift() {
    if (!currentGame) {
      window.alert("Start a game first.");
      return;
    }

    const lineup = activeSeason.currentLineup || {};
    const lineupPlayerIds = Object.values(lineup).filter(Boolean);

    if (!lineupPlayerIds.length) {
      window.alert("Assign at least one player in the lineup before starting a shift.");
      return;
    }

    const shiftNumber = (currentGame.shifts?.length || 0) + 1;

    const newShift = {
      id: createId(),
      shiftNumber,
      gameId: currentGame.id,
      lineup: { ...lineup },
      score: { us: 0, them: 0 },
      plusMinus: 0,
      events: [],
      playerStats: buildBlankShiftStats(lineup),
      createdAt: new Date().toISOString(),
    };

    setCurrentShift(newShift);
    setEditingShiftId(null);

    const firstActive = lineupPlayerIds[0] || "";
    setSelectedLivePlayerId(firstActive);
  }

  function editSavedShift(shiftId) {
    if (!currentGame) return;
    const shift = (currentGame.shifts || []).find((item) => item.id === shiftId);
    if (!shift) return;

    setCurrentShift(deepClone(shift));
    setEditingShiftId(shiftId);

    const activeLineupPlayers = Object.values(shift.lineup || {}).filter(Boolean);
    setSelectedLivePlayerId(activeLineupPlayers[0] || "");
    setActiveTab("Live Tracker");
  }

  function deleteSavedShift(shiftId) {
    if (!currentGame) return;
    const okay = window.confirm("Delete this shift?");
    if (!okay) return;

    updateActiveSeason((season) => ({
      ...season,
      games: season.games.map((game) => {
        if (game.id !== currentGame.id) return game;
        const nextShifts = (game.shifts || [])
          .filter((shift) => shift.id !== shiftId)
          .map((shift, index) => ({
            ...shift,
            shiftNumber: index + 1,
          }));

        const nextFinalScore = nextShifts.reduce(
          (acc, shift) => ({
            us: acc.us + safeNumber(shift.score?.us),
            them: acc.them + safeNumber(shift.score?.them),
          }),
          { us: 0, them: 0 }
        );

        return {
          ...game,
          shifts: nextShifts,
          finalScore: nextFinalScore,
        };
      }),
    }));

    if (editingShiftId === shiftId) {
      setCurrentShift(null);
      setEditingShiftId(null);
    }
  }

  function saveCurrentShift() {
    if (!currentGame || !currentShift) return;

    const rebuilt = rebuildShiftFromEvents(currentShift, currentGame.tracked || DEFAULT_TRACKED);

    updateActiveSeason((season) => ({
      ...season,
      games: season.games.map((game) => {
        if (game.id !== currentGame.id) return game;

        let nextShifts;
        if (editingShiftId) {
          nextShifts = (game.shifts || []).map((shift) =>
            shift.id === editingShiftId ? rebuilt : shift
          );
        } else {
          nextShifts = [...(game.shifts || []), rebuilt];
        }

        nextShifts = nextShifts.map((shift, index) => ({
          ...shift,
          shiftNumber: index + 1,
        }));

        const nextFinalScore = nextShifts.reduce(
          (acc, shift) => ({
            us: acc.us + safeNumber(shift.score?.us),
            them: acc.them + safeNumber(shift.score?.them),
          }),
          { us: 0, them: 0 }
        );

        const nextGame = {
          ...game,
          shifts: nextShifts,
          finalScore: nextFinalScore,
        };

       const baseTotals = aggregateGameBaseBoxScoreFromShifts(
  nextGame,
  (season.players || []).map((player) => player.id)
);

const oldEdits = { ...(nextGame.boxScoreEdits || {}) };
const nextBoxScoreEdits = {};

(season.players || []).forEach((player) => {
  const tracked = nextGame.tracked || DEFAULT_TRACKED;
  const base = baseTotals[player.id] || createBlankPlayerStats();
  const existing = normalizeBoxScoreForTracked(oldEdits[player.id], tracked);

  function mergedField(field, baseValue, isTracked) {
    const oldField = existing?.[field];
    if (!isTracked) {
      return { value: null, tracked: false };
    }

    // If there was a manual N/A, preserve it
    if (oldField && oldField.tracked === false) {
      return { value: null, tracked: false };
    }

    // Otherwise refresh from latest shift/game totals
    return {
      value: safeNumber(baseValue),
      tracked: true,
    };
  }

  nextBoxScoreEdits[player.id] = {
    points: mergedField("points", base.points, tracked.points),
    twoPM: mergedField("twoPM", base.twoPM, tracked.points),
    twoPA: mergedField("twoPA", base.twoPA, tracked.points),
    threePM: mergedField("threePM", base.threePM, tracked.points),
    threePA: mergedField("threePA", base.threePA, tracked.points),
    ftm: mergedField("ftm", base.ftm, tracked.points),
    ftMiss: mergedField("ftMiss", base.ftMiss, tracked.points),
    oreb: mergedField("oreb", base.oreb, tracked.rebounds),
    dreb: mergedField("dreb", base.dreb, tracked.rebounds),
    treb: mergedField("treb", base.treb, tracked.rebounds),
    ast: mergedField("ast", base.ast, tracked.assists),
    stl: mergedField("stl", base.stl, tracked.steals),
    blk: mergedField("blk", base.blk, tracked.blocks),
    to: mergedField("to", base.to, tracked.turnovers),
    jb: mergedField("jb", base.jb, tracked.points),
    plusMinus: mergedField("plusMinus", base.plusMinus, tracked.plusMinus),
    shifts: {
      value: safeNumber(base.shifts),
      tracked: true,
    },
  };
});

nextGame.boxScoreEdits = nextBoxScoreEdits;
        return nextGame;
      }),
    }));

    setCurrentShift(null);
    setEditingShiftId(null);
  }

  function cancelShiftEdit() {
    setCurrentShift(null);
    setEditingShiftId(null);
  }

  function assignPlayer(position, playerId) {
    setCurrentLineupPosition(position, playerId);

    if (currentShift) {
      setCurrentShift((prev) => {
        if (!prev) return prev;
        const nextShift = deepClone(prev);
        nextShift.lineup[position] = playerId;

        Object.values(nextShift.lineup).forEach((pid) => {
          if (!pid) return;
          if (!nextShift.playerStats[pid]) {
            nextShift.playerStats[pid] = createBlankPlayerStats();
          }
        });

        Object.keys(nextShift.playerStats).forEach((pid) => {
          if (!Object.values(nextShift.lineup).includes(pid)) {
            delete nextShift.playerStats[pid];
          }
        });

        return nextShift;
      });
    }
  }

  function logEvent(type) {
    if (!currentGame || !currentShift) return;

    const eventDef = getEventDefinition(type);
    if (!eventDef) return;

    let playerId = null;
    if (eventRequiresPlayer(type)) {
      playerId = selectedLivePlayerId;
      if (!playerId) {
        window.alert("Select an active player from the lineup first.");
        return;
      }
      if (!Object.values(currentShift.lineup || {}).includes(playerId)) {
        window.alert("Selected player is not in the current lineup.");
        return;
      }
    }

    const nextEvent = {
      id: createId(),
      type,
      playerId,
      timestamp: new Date().toISOString(),
    };

    setCurrentShift((prev) => {
      if (!prev) return prev;
      const withEvent = {
        ...prev,
        events: [...prev.events, nextEvent],
      };
      return rebuildShiftFromEvents(withEvent, currentGame.tracked || DEFAULT_TRACKED);
    });
  }

  function undoLastEvent() {
    if (!currentShift || !(currentShift.events || []).length) return;

    setCurrentShift((prev) => {
      if (!prev) return prev;
      const next = deepClone(prev);
      next.events.pop();
      return rebuildShiftFromEvents(next, currentGame?.tracked || DEFAULT_TRACKED);
    });
  }

  function activeLineupPlayers() {
    const lineupIds = Object.values(currentShift?.lineup || activeSeason.currentLineup || {}).filter(Boolean);
    return lineupIds
      .map((pid) => playersById[pid])
      .filter(Boolean);
  }

  function renderTopBar() {
    return (
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.headerTitle}>Youth Basketball Tracker</h1>
          <div style={styles.miniText}>
            Live stat entry, season analysis, synergy, growth, logs, and post-game correction
          </div>
        </div>

        <div style={styles.topBarRight}>
          <div>
            <div style={styles.label}>Season</div>
            <select
              value={activeSeason?.id || ""}
              onChange={(e) => {
                setAppData((prev) => ({
                  ...prev,
                  activeSeasonId: e.target.value,
                }));
                setCurrentGameId(null);
                setCurrentShift(null);
                setEditingShiftId(null);
              }}
              style={styles.select}
            >
              {appData.seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>

          <SmallButton variant="secondary" onClick={addSeason}>
            Add Season
          </SmallButton>
          <SmallButton variant="secondary" onClick={renameSeason}>
            Rename Season
          </SmallButton>
        </div>
      </div>
    );
  }

  function renderTabs() {
    return (
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab ? styles.tabButtonActive : {}),
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    );
  }

  function renderPlayersCard() {
    return (
      <Card
        title="Players"
        right={
          <SmallButton variant="primary" onClick={addPlayer}>
            Add Player
          </SmallButton>
        }
      >
        {!players.length ? (
          <div style={styles.miniText}>No players added yet.</div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {players.map((player) => (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  alignItems: "center",
                  background: styles.panelAlt2,
                  border: `1px solid ${styles.border}`,
                  borderRadius: "12px",
                  padding: "10px 12px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {player.name} {player.jersey ? `#${player.jersey}` : ""}
                  </div>
                  <div style={styles.miniText}>{player.id.slice(0, 8)}</div>
                </div>
                <SmallButton variant="danger" onClick={() => deletePlayer(player.id)}>
                  Delete
                </SmallButton>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderLiveSetupCard() {
    return (
      <Card title="Live Game Setup">
        <div style={styles.grid3}>
          <div>
            <label style={styles.label}>Opponent (optional)</label>
            <input
              value={liveOpponent}
              onChange={(e) => setLiveOpponent(e.target.value)}
              style={styles.input}
              placeholder="Opponent name"
            />
          </div>

          <div>
            <label style={styles.label}>Game date</label>
            <input
              type="date"
              value={liveGameDate}
              onChange={(e) => setLiveGameDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ display: "flex", alignItems: "end", gap: "8px" }}>
            {!currentGame ? (
              <SmallButton variant="primary" onClick={startGame} style={{ width: "100%" }}>
                Start Game
              </SmallButton>
            ) : (
              <SmallButton variant="danger" onClick={endGame} style={{ width: "100%" }}>
                End Game
              </SmallButton>
            )}
          </div>
        </div>

        <div style={styles.divider} />

        <SectionTitle>Tracked Stats For This Game</SectionTitle>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {TRACKED_STAT_KEYS.map((key) => (
            <TogglePill
              key={key}
              active={!!liveTracked[key]}
              onClick={() => setLiveTracked((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              {key}
            </TogglePill>
          ))}
        </div>

        <div style={{ ...styles.miniText, marginTop: "10px" }}>
          Untracked stats flow through as N/A later instead of zero.
        </div>
      </Card>
    );
  }

  function renderLineupCard() {
    const lineup = activeSeason.currentLineup || {};

    return (
      <Card title="Current Lineup">
        <div style={styles.lineupGrid}>
          {POSITIONS.map((position) => (
            <div key={position}>
              <label style={styles.label}>Position {position}</label>
              <select
                value={lineup[position] || ""}
                onChange={(e) => assignPlayer(position, e.target.value)}
                style={styles.select}
              >
                <option value="">-- Empty --</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} {player.jersey ? `#${player.jersey}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div style={styles.divider} />

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <SmallButton
            variant="primary"
            onClick={startNewShift}
            disabled={!currentGame}
          >
            Start New Shift
          </SmallButton>

          {currentShift && (
            <>
              <SmallButton variant="secondary" onClick={saveCurrentShift}>
                {editingShiftId ? "Save Shift Edit" : "Save Shift"}
              </SmallButton>
              <SmallButton variant="danger" onClick={cancelShiftEdit}>
                Cancel
              </SmallButton>
            </>
          )}
        </div>

        <div style={{ ...styles.miniText, marginTop: "10px" }}>
          Position 5 can be left empty if needed for younger groups.
        </div>
      </Card>
    );
  }

  function renderLiveTrackerCard() {
    const gameScore = currentGame?.finalScore || { us: 0, them: 0 };
    const liveScore = currentShift
      ? {
          us: safeNumber(gameScore.us) - safeNumber(currentShift.score?.us) + safeNumber(currentShift.score?.us),
          them:
            safeNumber(gameScore.them) - safeNumber(currentShift.score?.them) + safeNumber(currentShift.score?.them),
        }
      : gameScore;

    const activePlayers = activeLineupPlayers();

    return (
      <Card
        title={editingShiftId ? "Editing Saved Shift" : "Live Tracker"}
        right={
          currentShift ? (
            <span style={styles.badge}>
              Shift {currentShift.shiftNumber || (currentGame?.shifts?.length || 0) + 1}
            </span>
          ) : null
        }
      >
        <div style={styles.statStrip}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Game Score</div>
            <div style={styles.statValue}>
              {currentGame ? `${currentGame.finalScore.us} - ${currentGame.finalScore.them}` : "—"}
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Current Shift Score</div>
            <div style={styles.statValue}>
              {currentShift ? `${currentShift.score.us} - ${currentShift.score.them}` : "—"}
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Current Shift +/-</div>
            <div style={styles.statValue}>{currentShift ? currentShift.plusMinus : "—"}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Opponent</div>
            <div style={styles.statValue}>{currentGame?.opponent || "—"}</div>
          </div>
        </div>

        <div style={styles.divider} />

        <SectionTitle>Active Player</SectionTitle>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
          {activePlayers.length ? (
            activePlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedLivePlayerId(player.id)}
                style={{
                  ...styles.pill,
                  ...(selectedLivePlayerId === player.id ? styles.pillActive : {}),
                }}
              >
                {player.name} {player.jersey ? `#${player.jersey}` : ""}
              </button>
            ))
          ) : (
            <div style={styles.miniText}>No active lineup yet.</div>
          )}
        </div>

        <SectionTitle>Event Buttons</SectionTitle>
        <div style={styles.eventGrid}>
          {EVENT_TYPES.map((event) => {
            const requiresPlayer = eventRequiresPlayer(event.key);
            const disabled = !currentShift || (requiresPlayer && !selectedLivePlayerId);
            return (
              <button
                key={event.key}
                type="button"
                disabled={disabled}
                onClick={() => logEvent(event.key)}
                style={{
                  ...styles.eventButton,
                  ...(disabled ? styles.buttonDisabled : {}),
                }}
              >
                <div>{event.label}</div>
                <div style={styles.miniText}>
                  {requiresPlayer
                    ? selectedLivePlayerId
                      ? playersById[selectedLivePlayerId]?.name || "Selected player"
                      : "Select player"
                    : "Opponent/team event"}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
          <SmallButton
            variant="secondary"
            onClick={undoLastEvent}
            disabled={!currentShift || !(currentShift.events || []).length}
          >
            Undo Last Event
          </SmallButton>

          <SmallButton
            variant="primary"
            onClick={saveCurrentShift}
            disabled={!currentShift}
          >
            {editingShiftId ? "Save Edited Shift" : "Save Shift"}
          </SmallButton>
        </div>

        <div style={styles.divider} />

        <SectionTitle>Current Shift Event Log</SectionTitle>
        <div style={styles.eventLogList}>
          {!currentShift || !(currentShift.events || []).length ? (
            <div style={styles.miniText}>No events logged yet.</div>
          ) : (
            currentShift.events.map((event, index) => {
              const playerName = event.playerId ? playersById[event.playerId]?.name || "Unknown" : "";
              const label = getEventDefinition(event.type)?.label || event.type;

              return (
                <div key={event.id || `${event.type}_${index}`} style={styles.eventLogItem}>
                  <div style={{ fontWeight: 700 }}>
                    {index + 1}. {label}
                  </div>
                  <div style={styles.miniText}>{playerName || "Opponent / team event"}</div>
                </div>
              );
            })
          )}
        </div>

        <div style={styles.divider} />

        <SectionTitle>Current Shift Player Summary</SectionTitle>
        {!currentShift ? (
          <div style={styles.miniText}>Start a shift to see live stats.</div>
        ) : (
          <TableScroll>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Player</th>
                  <th style={styles.th}>PTS</th>
                  <th style={styles.th}>2PM</th>
                  <th style={styles.th}>2FGA</th>
                  <th style={styles.th}>3PM</th>
                  <th style={styles.th}>3FGA</th>
                  <th style={styles.th}>FTM</th>
                  <th style={styles.th}>FT Miss</th>
                  <th style={styles.th}>OREB</th>
                  <th style={styles.th}>DREB</th>
                  <th style={styles.th}>AST</th>
                  <th style={styles.th}>STL</th>
                  <th style={styles.th}>BLK</th>
                  <th style={styles.th}>TO</th>
                  <th style={styles.th}>JB</th>
                  <th style={styles.th}>+/-</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(currentShift.lineup)
                  .filter(Boolean)
                  .map((playerId) => {
                    const stats = currentShift.playerStats[playerId] || createBlankPlayerStats();
                    const player = playersById[playerId];
                    return (
                      <tr key={playerId}>
                        <td style={styles.td}>{player?.name || "Unknown"}</td>
                        <td style={styles.td}>{stats.points}</td>
                        <td style={styles.td}>{stats.twoPM}</td>
                        <td style={styles.td}>{stats.twoPA}</td>
                        <td style={styles.td}>{stats.threePM}</td>
                        <td style={styles.td}>{stats.threePA}</td>
                        <td style={styles.td}>{stats.ftm}</td>
                        <td style={styles.td}>{stats.ftMiss}</td>
                        <td style={styles.td}>{stats.oreb}</td>
                        <td style={styles.td}>{stats.dreb}</td>
                        <td style={styles.td}>{stats.ast}</td>
                        <td style={styles.td}>{stats.stl}</td>
                        <td style={styles.td}>{stats.blk}</td>
                        <td style={styles.td}>{stats.to}</td>
                        <td style={styles.td}>{stats.jb}</td>
                        <td style={styles.td}>{stats.plusMinus}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>
    );
  }

  function renderSavedShiftsTab() {
    if (!currentGame) {
      return (
        <Card title="Saved Shifts">
          <div style={styles.miniText}>Start or select a game to view saved shifts.</div>
        </Card>
      );
    }

    const shifts = currentGame.shifts || [];

    return (
      <div style={styles.contentGridSingle}>
        <Card
          title="Saved Shifts"
          right={<span style={styles.badge}>{shifts.length} saved</span>}
        >
          {!shifts.length ? (
            <div style={styles.miniText}>No saved shifts yet.</div>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} style={styles.shiftCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "18px" }}>
                      Shift {shift.shiftNumber}
                    </div>
                    <div style={styles.miniText}>
                      {lineupToText(shift.lineup, playersById)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={styles.badge}>Score {shift.score.us}-{shift.score.them}</span>
                    <span style={styles.badge}>+/- {shift.plusMinus}</span>
                    <SmallButton variant="secondary" onClick={() => editSavedShift(shift.id)}>
                      Edit Shift
                    </SmallButton>
                    <SmallButton variant="danger" onClick={() => deleteSavedShift(shift.id)}>
                      Delete Shift
                    </SmallButton>
                  </div>
                </div>

                <div style={styles.divider} />

                <div style={{ marginBottom: "10px" }}>
                  <div style={styles.label}>Event Summary</div>
                  <div>{summarizeShiftEvents(shift.events || [], playersById)}</div>
                </div>

                <TableScroll>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Player</th>
                        <th style={styles.th}>PTS</th>
                        <th style={styles.th}>REB</th>
                        <th style={styles.th}>AST</th>
                        <th style={styles.th}>STL</th>
                        <th style={styles.th}>BLK</th>
                        <th style={styles.th}>TO</th>
                        <th style={styles.th}>JB</th>
                        <th style={styles.th}>+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(shift.lineup)
                        .filter(Boolean)
                        .map((playerId) => {
                          const stats = shift.playerStats?.[playerId] || createBlankPlayerStats();
                          const player = playersById[playerId];
                          const tracked = currentGame.tracked || DEFAULT_TRACKED;

                          return (
                            <tr key={playerId}>
                              <td style={styles.td}>{player?.name || "Unknown"}</td>
                              <td style={styles.td}>
                                <StatCell value={stats.points} tracked={tracked.points} />
                              </td>
                              <td style={styles.td}>
                                <StatCell value={stats.treb} tracked={tracked.rebounds} />
                              </td>
                              <td style={styles.td}>
                                <StatCell value={stats.ast} tracked={tracked.assists} />
                              </td>
                              <td style={styles.td}>
                                <StatCell value={stats.stl} tracked={tracked.steals} />
                              </td>
                              <td style={styles.td}>
                                <StatCell value={stats.blk} tracked={tracked.blocks} />
                              </td>
                              <td style={styles.td}>
                                <StatCell value={stats.to} tracked={tracked.turnovers} />
                              </td>
                              <td style={styles.td}>
                                <StatCell value={stats.jb} tracked={tracked.points} />
                              </td>
                              <td style={styles.td}>
                                <StatCell value={stats.plusMinus} tracked={tracked.plusMinus} />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            ))
          )}
        </Card>
      </div>
    );
  }

  function renderLiveTab() {
    return (
      <div style={styles.contentGrid}>
        <div style={{ display: "grid", gap: "16px" }}>
          {renderLiveSetupCard()}
          {renderLineupCard()}
          {renderLiveTrackerCard()}
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          {renderPlayersCard()}

          <Card title="Current Game">
            {!currentGame ? (
              <div style={styles.miniText}>No active game. Use Start Game to begin.</div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                <div><strong>Date:</strong> {currentGame.date}</div>
                <div><strong>Opponent:</strong> {currentGame.opponent || "—"}</div>
                <div>
                  <strong>Final Score So Far:</strong> {currentGame.finalScore.us} - {currentGame.finalScore.them}
                </div>
                <div>
                  <strong>Tracked:</strong>{" "}
                  {TRACKED_STAT_KEYS.filter((key) => currentGame.tracked?.[key]).join(", ") || "None"}
                </div>
              </div>
            )}
          </Card>

          {currentGame && (
            <Card title="Quick Shift List">
              {!(currentGame.shifts || []).length ? (
                <div style={styles.miniText}>No saved shifts yet.</div>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {currentGame.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        alignItems: "center",
                        background: styles.panelAlt2,
                        border: `1px solid ${styles.border}`,
                        borderRadius: "12px",
                        padding: "10px 12px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          Shift {shift.shiftNumber} • {shift.score.us}-{shift.score.them}
                        </div>
                        <div style={styles.miniText}>+/- {shift.plusMinus}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <SmallButton variant="secondary" onClick={() => editSavedShift(shift.id)}>
                          Edit
                        </SmallButton>
                        <SmallButton variant="danger" onClick={() => deleteSavedShift(shift.id)}>
                          Delete
                        </SmallButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    );
  }

    function openGameEditor(gameId) {
    const game = (activeSeason.games || []).find((item) => item.id === gameId);
    if (!game) return;

    setSelectedGameId(gameId);

    const draft = {
      gameId,
      tracked: { ...(game.tracked || DEFAULT_TRACKED) },
      notes: game.notes || "",
      boxScoreEdits: deepClone(game.boxScoreEdits || {}),
    };

    (players || []).forEach((player) => {
      const existing = draft.boxScoreEdits[player.id];
      draft.boxScoreEdits[player.id] = normalizeBoxScoreForTracked(
        existing || createBlankBoxScoreForPlayer(draft.tracked),
        draft.tracked
      );
    });

    setBoxScoreDraft(draft);
    setActiveTab("Games");
  }

  function closeGameEditor() {
    setSelectedGameId(null);
    setBoxScoreDraft(null);
  }

  function updateDraftTrackedSetting(key, nextValue) {
    setBoxScoreDraft((prev) => {
      if (!prev) return prev;

      const nextTracked = {
        ...prev.tracked,
        [key]: nextValue,
      };

      const nextBoxScores = { ...prev.boxScoreEdits };
      Object.keys(nextBoxScores).forEach((playerId) => {
        nextBoxScores[playerId] = normalizeBoxScoreForTracked(nextBoxScores[playerId], nextTracked);
      });

      return {
        ...prev,
        tracked: nextTracked,
        boxScoreEdits: nextBoxScores,
      };
    });
  }

  function updateDraftStat(playerId, field, mode, nextValue) {
    setBoxScoreDraft((prev) => {
      if (!prev) return prev;

      const next = deepClone(prev);
      if (!next.boxScoreEdits[playerId]) {
        next.boxScoreEdits[playerId] = createBlankBoxScoreForPlayer(next.tracked);
      }

      const entry = next.boxScoreEdits[playerId][field];
      if (!entry) return prev;

      if (mode === "tracked") {
        entry.tracked = !!nextValue;
        entry.value = entry.tracked ? safeNumber(entry.value) : null;
      }

      if (mode === "value") {
        entry.value = entry.tracked ? safeNumber(nextValue) : null;
      }

      if (field === "oreb" || field === "dreb") {
        const oreb = next.boxScoreEdits[playerId].oreb.tracked
          ? safeNumber(next.boxScoreEdits[playerId].oreb.value)
          : null;
        const dreb = next.boxScoreEdits[playerId].dreb.tracked
          ? safeNumber(next.boxScoreEdits[playerId].dreb.value)
          : null;

        if (oreb === null || dreb === null || !next.tracked.rebounds) {
          next.boxScoreEdits[playerId].treb = { value: null, tracked: false };
        } else {
          next.boxScoreEdits[playerId].treb = { value: oreb + dreb, tracked: true };
        }
      }

      return next;
    });
  }

  function saveBoxScoreDraft() {
    if (!boxScoreDraft?.gameId) return;

    updateActiveSeason((season) => ({
      ...season,
      games: season.games.map((game) => {
        if (game.id !== boxScoreDraft.gameId) return game;

        const nextTracked = { ...boxScoreDraft.tracked };
        const nextBoxScoreEdits = {};
        (season.players || []).forEach((player) => {
          nextBoxScoreEdits[player.id] = normalizeBoxScoreForTracked(
            boxScoreDraft.boxScoreEdits[player.id] || createBlankBoxScoreForPlayer(nextTracked),
            nextTracked
          );
        });

        return {
          ...game,
          tracked: nextTracked,
          notes: boxScoreDraft.notes || "",
          boxScoreEdits: nextBoxScoreEdits,
        };
      }),
    }));

    setBoxScoreDraft(null);
  }

  function renderGamesTab() {
    const games = activeSeason.games || [];

    return (
      <div style={styles.contentGridSingle}>
        <Card title="Completed Games" right={<span style={styles.badge}>{games.length} games</span>}>
          {!games.length ? (
            <div style={styles.miniText}>No completed games yet.</div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {games.map((game) => {
                const displayStats = buildDisplayGamePlayerStats(
                  game,
                  players.map((player) => player.id)
                );
const suggestedMVPs = getSuggestedMVPsForGame(game, players);
const topThreeMVPs = suggestedMVPs.slice(0, 3);
const remainingMVPs = suggestedMVPs.slice(3);

                return (
                  <div key={game.id} style={styles.shiftCard}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "18px" }}>
                          {game.date} {game.opponent ? `vs ${game.opponent}` : ""}
                        </div>
                        <div style={styles.miniText}>
                          Final: {game.finalScore.us} - {game.finalScore.them} • {game.shifts?.length || 0} shifts
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {TRACKED_STAT_KEYS.map((key) =>
                          game.tracked?.[key] ? (
                            <span key={key} style={styles.badge}>
                              {key}
                            </span>
                          ) : null
                        )}
                        <SmallButton
  variant="secondary"
  onClick={() => {
    setCurrentGameId(game.id);
    setCurrentShift(null);
    setEditingShiftId(null);
  }}
>
  View as Current
</SmallButton>
                        <SmallButton variant="primary" onClick={() => openGameEditor(game.id)}>
                          Edit Box Score
                        </SmallButton>
                      </div>
                    </div>

                    <div style={styles.divider} />

<div style={{ marginBottom: "12px" }}>
  <div style={{ ...styles.label, marginBottom: "8px" }}>Suggested MVPs</div>

  {!suggestedMVPs.length ? (
    <div style={styles.miniText}>No MVP suggestions yet.</div>
  ) : (
    <>
      <div style={{ display: "grid", gap: "8px", marginBottom: remainingMVPs.length ? "12px" : "0" }}>
        {topThreeMVPs.map((entry, index) => (
          <div
            key={entry.playerId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              alignItems: "center",
              background: styles.panelAlt2,
              border: `1px solid ${styles.border}`,
              borderRadius: "12px",
              padding: "10px 12px",
            }}
          >
            <div>
              <strong>
                {index + 1}. {entry.name} {entry.jersey ? `#${entry.jersey}` : ""}
              </strong>
              <div style={styles.miniText}>
                PTS {entry.stats.points ?? "N/A"} | REB {entry.stats.treb ?? "N/A"} | AST {entry.stats.ast ?? "N/A"} | STL {entry.stats.stl ?? "N/A"} | BLK {entry.stats.blk ?? "N/A"} | +/- {entry.stats.plusMinus ?? "N/A"}
              </div>
            </div>
            <div style={{ fontWeight: 800 }}>
              Impact {entry.impactScore.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {remainingMVPs.length > 0 && (
        <div
          style={{
            background: styles.panelAlt2,
            border: `1px solid ${styles.border}`,
            borderRadius: "12px",
            padding: "10px 12px",
          }}
        >
          <div style={{ ...styles.label, marginBottom: "8px" }}>Full Ranking</div>
          <div style={{ display: "grid", gap: "6px" }}>
            {remainingMVPs.map((entry, index) => (
              <div
                key={entry.playerId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  fontSize: "13px",
                  color: styles.mutedText.color,
                }}
              >
                <span>
                  {index + 4}. {entry.name} {entry.jersey ? `#${entry.jersey}` : ""}
                </span>
                <span>{entry.impactScore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )}
</div>

<div style={styles.divider} />

                    <TableScroll>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Player</th>
                            <th style={styles.th}>PTS</th>
                            <th style={styles.th}>REB</th>
                            <th style={styles.th}>AST</th>
                            <th style={styles.th}>STL</th>
                            <th style={styles.th}>BLK</th>
                            <th style={styles.th}>TO</th>
                            <th style={styles.th}>JB</th>
                            <th style={styles.th}>+/-</th>
                            <th style={styles.th}>Shifts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {players.map((player) => {
                            const stats = displayStats[player.id];
                            if (!stats) return null;

                            return (
                              <tr key={player.id}>
                                <td style={styles.td}>
                                  {player.name} {player.jersey ? `#${player.jersey}` : ""}
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.points} tracked={stats.trackedByField.points} />
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.treb} tracked={stats.trackedByField.treb} />
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.ast} tracked={stats.trackedByField.ast} />
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.stl} tracked={stats.trackedByField.stl} />
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.blk} tracked={stats.trackedByField.blk} />
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.to} tracked={stats.trackedByField.to} />
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.jb} tracked={stats.trackedByField.jb} />
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.plusMinus} tracked={stats.trackedByField.plusMinus} />
                                </td>
                                <td style={styles.td}>
                                  <StatCell value={stats.shifts} tracked />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </TableScroll>

                    {game.notes ? (
                      <>
                        <div style={styles.divider} />
                        <div>
                          <div style={styles.label}>Notes</div>
                          <div>{game.notes}</div>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {selectedGameId && boxScoreDraft && (
          <Card
            title="Post-Game Box Score Editor"
            right={
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <SmallButton variant="primary" onClick={saveBoxScoreDraft}>
                  Save Box Score
                </SmallButton>
                <SmallButton variant="danger" onClick={closeGameEditor}>
                  Close
                </SmallButton>
              </div>
            }
          >
            <div style={styles.grid2}>
              <div>
                <SectionTitle>Tracked Stat Toggles</SectionTitle>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {TRACKED_STAT_KEYS.map((key) => (
                    <TogglePill
                      key={key}
                      active={!!boxScoreDraft.tracked[key]}
                      onClick={() => updateDraftTrackedSetting(key, !boxScoreDraft.tracked[key])}
                    >
                      {key}
                    </TogglePill>
                  ))}
                </div>
                <div style={{ ...styles.miniText, marginTop: "10px" }}>
                  Turning a tracked stat off converts related values to N/A instead of zero.
                </div>
              </div>

              <div>
                <label style={styles.label}>Game notes</label>
                <textarea
                  style={styles.textarea}
                  value={boxScoreDraft.notes}
                  onChange={(e) =>
                    setBoxScoreDraft((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Optional notes about this game"
                />
              </div>
            </div>

            <div style={styles.divider} />

            <SectionTitle>Edit Player Box Scores</SectionTitle>

            <div style={{ display: "grid", gap: "14px" }}>
              {players.map((player) => {
                const entry =
                  boxScoreDraft.boxScoreEdits[player.id] ||
                  createBlankBoxScoreForPlayer(boxScoreDraft.tracked);

                const fields = [
                  "points",
                  "twoPM",
                  "twoPA",
                  "threePM",
                  "threePA",
                  "ftm",
                  "ftMiss",
                  "oreb",
                  "dreb",
                  "treb",
                  "ast",
                  "stl",
                  "blk",
                  "to",
                  "jb",
                  "plusMinus",
                  "shifts",
                ];

                return (
                  <div key={player.id} style={styles.shiftCard}>
                    <div style={{ fontWeight: 800, marginBottom: "10px" }}>
                      {player.name} {player.jersey ? `#${player.jersey}` : ""}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {fields.map((field) => {
                        const item = entry[field];
                        const tracked = !!item?.tracked;
                        const value = tracked ? safeNumber(item?.value) : "";

                        return (
                          <div
                            key={field}
                            style={{
                              background: styles.panelAlt2,
                              border: `1px solid ${styles.border}`,
                              borderRadius: "12px",
                              padding: "10px",
                            }}
                          >
                            <div style={{ ...styles.label, textTransform: "none" }}>{field}</div>

                            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                              <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "13px" }}>
                                <input
                                  type="checkbox"
                                  checked={tracked}
                                  onChange={(e) =>
                                    updateDraftStat(player.id, field, "tracked", e.target.checked)
                                  }
                                />
                                Tracked
                              </label>
                            </div>

                            <input
                              type="number"
                              value={tracked ? value : ""}
                              disabled={!tracked}
                              onChange={(e) =>
                                updateDraftStat(player.id, field, "value", e.target.value)
                              }
                              style={{
                                ...styles.input,
                                width: "100%",
                                opacity: tracked ? 1 : 0.55,
                              }}
                              placeholder={tracked ? "0" : "N/A"}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    );
  }

  function renderRankingsTab() {
    const rows = players.map((player) => {
      const totals = playerTotals[player.id] || createBlankPlayerStats();
      const ftAtt = totals.ftm + totals.ftMiss;

      return {
        id: player.id,
        player: `${player.name}${player.jersey ? ` #${player.jersey}` : ""}`,
        shifts: totals.shifts,
        points: totals.points,
        pointsPerShift: statPerShift(totals.points, totals.trackedShiftCounts.points),
        twoPM: totals.twoPM,
        twoPA: totals.twoPA,
        threePM: totals.threePM,
        threePA: totals.threePA,
        ftm: totals.ftm,
        fta: ftAtt,
        ftPct: ftAtt ? (totals.ftm / ftAtt) * 100 : null,
        oreb: totals.oreb,
        dreb: totals.dreb,
        treb: totals.treb,
        ast: totals.ast,
        stl: totals.stl,
        blk: totals.blk,
        to: totals.to,
        jb: totals.jb,
      };
    });

    const sorted = [...rows].sort((a, b) => {
      const aVal = a[rankingsSort.key];
      const bVal = b[rankingsSort.key];

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === "string") {
        return rankingsSort.dir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return rankingsSort.dir === "asc" ? aVal - bVal : bVal - aVal;
    });

    const headers = [
      ["player", "Player"],
      ["shifts", "Shifts"],
      ["points", "Points"],
      ["pointsPerShift", "PTS / Shift"],
      ["twoPM", "2PM"],
      ["twoPA", "2FGA"],
      ["threePM", "3PM"],
      ["threePA", "3FGA"],
      ["ftm", "FTM"],
      ["fta", "FTA"],
      ["ftPct", "FT%"],
      ["oreb", "OREB"],
      ["dreb", "DREB"],
      ["treb", "TREB"],
      ["ast", "AST"],
      ["stl", "STL"],
      ["blk", "BLK"],
      ["to", "TO"],
      ["jb", "JB"],
    ];

    function toggleSort(key) {
      setRankingsSort((prev) => ({
        key,
        dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
      }));
    }

    return (
      <Card title="Season Rankings">
        <TableScroll>
          <table style={styles.table}>
            <thead>
              <tr>
                {headers.map(([key, label]) => (
                  <th
                    key={key}
                    style={{ ...styles.th, cursor: "pointer" }}
                    onClick={() => toggleSort(key)}
                  >
                    {label} {rankingsSort.key === key ? (rankingsSort.dir === "desc" ? "▼" : "▲") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.player}</td>
                  <td style={styles.td}>{row.shifts}</td>
                  <td style={styles.td}>{row.points}</td>
                  <td style={styles.td}>
                    <StatCell
                      value={row.pointsPerShift}
                      tracked={row.pointsPerShift !== null}
                      digits={1}
                    />
                  </td>
                  <td style={styles.td}>{row.twoPM}</td>
                  <td style={styles.td}>{row.twoPA}</td>
                  <td style={styles.td}>{row.threePM}</td>
                  <td style={styles.td}>{row.threePA}</td>
                  <td style={styles.td}>{row.ftm}</td>
                  <td style={styles.td}>{row.fta}</td>
                 <td style={styles.td}>
  {row.ftPct === null ? (
    <span style={styles.chipNA}>N/A</span>
  ) : (
    `${row.ftPct.toFixed(1)}%`
  )}
</td>
                  <td style={styles.td}>{row.oreb}</td>
                  <td style={styles.td}>{row.dreb}</td>
                  <td style={styles.td}>{row.treb}</td>
                  <td style={styles.td}>{row.ast}</td>
                  <td style={styles.td}>{row.stl}</td>
                  <td style={styles.td}>{row.blk}</td>
                  <td style={styles.td}>{row.to}</td>
                  <td style={styles.td}>{row.jb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
    );
  }

 function renderLeaderboardsTab() {
  const categories = [
    "impact",
    "points",
    "plusMinus",
    "twoPM",
    "twoPA",
    "threePM",
    "threePA",
    "ftm",
    "fta",
    "ftPct",
    "oreb",
    "dreb",
    "treb",
    "ast",
    "stl",
    "blk",
    "to",
    "jb",
  ];

  function getLeaderboardValue(playerId, category) {
    const totals = playerTotals[playerId] || createBlankPlayerStats();
    const fta = totals.ftm + totals.ftMiss;
    const impact = getImpactFromTotals(totals);

    const baseMap = {
      impact,
      points: totals.points,
      plusMinus: totals.plusMinus,
      twoPM: totals.twoPM,
      twoPA: totals.twoPA,
      threePM: totals.threePM,
      threePA: totals.threePA,
      ftm: totals.ftm,
      fta,
      ftPct: fta ? (totals.ftm / fta) * 100 : null,
      oreb: totals.oreb,
      dreb: totals.dreb,
      treb: totals.treb,
      ast: totals.ast,
      stl: totals.stl,
      blk: totals.blk,
      to: totals.to,
      jb: totals.jb,
    };

    const total = baseMap[category];

    if (leaderboardMode === "totals") {
      return total;
    }

    if (leaderboardMode === "per shift") {
      if (category === "impact") {
        const trackedCount = totals.trackedShiftCounts.points;
        return trackedCount ? impact / trackedCount : null;
      }

      const trackedCount =
        category === "points" ||
        ["twoPM", "twoPA", "threePM", "threePA", "ftm", "fta", "ftPct", "jb"].includes(category)
          ? totals.trackedShiftCounts.points
          : category === "oreb" || category === "dreb" || category === "treb"
          ? totals.trackedShiftCounts.rebounds
          : category === "ast"
          ? totals.trackedShiftCounts.assists
          : category === "stl"
          ? totals.trackedShiftCounts.steals
          : category === "blk"
          ? totals.trackedShiftCounts.blocks
          : category === "to"
          ? totals.trackedShiftCounts.turnovers
          : category === "plusMinus"
          ? totals.trackedShiftCounts.plusMinus
          : 0;

      if (!trackedCount) return null;
      if (category === "ftPct") return total;
      return total / trackedCount;
    }

       if (leaderboardMode === "per game") {
      if (category === "impact") {
        const trackedGames = countTrackedGamesForPlayer(activeSeason, playerId, "points");
        return trackedGames ? impact / trackedGames : null;
      }

      if (category === "ftPct") {
        const trackedGames = countTrackedGamesForPlayer(activeSeason, playerId, "points");
        return trackedGames ? total : null;
      }

      if (category === "fta") {
        const trackedGames = countTrackedGamesForPlayer(activeSeason, playerId, "ftm");
        return trackedGames ? total / trackedGames : null;
      }

      const trackedGames = countTrackedGamesForPlayer(activeSeason, playerId, category);
      return trackedGames ? total / trackedGames : null;
    }

    return total;
  }

  return (
    <div style={styles.contentGridSingle}>
      <Card title="Leaderboard Controls">
  <div style={{ display: "grid", gap: "12px" }}>
    <div>
      <div style={{ ...styles.label, marginBottom: "8px" }}>Mode</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {["totals", "per shift", "per game"].map((mode) => (
          <TogglePill
            key={mode}
            active={leaderboardMode === mode}
            onClick={() => setLeaderboardMode(mode)}
          >
            {mode}
          </TogglePill>
        ))}
      </div>
    </div>

    <div>
      <div style={{ ...styles.label, marginBottom: "8px" }}>Show Stats</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {leaderboardStatOptions.map((stat) => (
          <TogglePill
            key={stat.key}
            active={visibleLeaderboardStats.includes(stat.key)}
            onClick={() => toggleLeaderboardStat(stat.key)}
          >
            {stat.label}
          </TogglePill>
        ))}
      </div>
    </div>

    <div style={styles.miniText}>
      Per-game mode ignores games where that stat bucket was not tracked.
    </div>
  </div>
</Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "14px",
        }}
      >
        {categories
  .filter((category) => visibleLeaderboardStats.includes(category))
  .map((category) => {
          const rows = players
            .map((player) => ({
              player,
              value: getLeaderboardValue(player.id, category),
            }))
            .filter((row) => row.value !== null)
            .sort((a, b) => {
              if (category === "to") return a.value - b.value;
              return b.value - a.value;
            });

          return (
            <Card key={category} title={category}>
              {!rows.length ? (
                <div style={styles.miniText}>No tracked data</div>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {rows.map((row, index) => (
                    <div
                      key={row.player.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        background: styles.panelAlt2,
                        border: `1px solid ${styles.border}`,
                        borderRadius: "12px",
                        padding: "10px 12px",
                      }}
                    >
                      <div>
                        <strong>
                          {index + 1}. {row.player.name}
                        </strong>
                        <div style={styles.miniText}>
                          {row.player.jersey ? `#${row.player.jersey}` : ""}
                        </div>
                      </div>

                      <div style={{ fontWeight: 800 }}>
                        {row.value === null
                          ? "N/A"
                          : category === "ftPct"
                          ? `${row.value.toFixed(1)}%`
                          : Number.isInteger(row.value)
                          ? row.value
                          : row.value.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
    

function renderSynergyTab() {
  const modeSize =
    synergyMode === "duos"
      ? 2
      : synergyMode === "trios"
      ? 3
      : synergyMode === "4-man"
      ? 4
      : 5;

  function getCombos(array, size) {
    const results = [];

    function helper(start, combo) {
      if (combo.length === size) {
        results.push(combo);
        return;
      }

      for (let i = start; i < array.length; i += 1) {
        helper(i + 1, [...combo, array[i]]);
      }
    }

    helper(0, []);
    return results;
  }

  const synergyMap = {};

  allSeasonShifts.forEach((shift) => {
    const lineupIds = Object.values(shift.lineup || {}).filter(Boolean);
    if (lineupIds.length < modeSize) return;

    const sourceCombos = synergyExactOnly
      ? lineupIds.length === modeSize
        ? [lineupIds]
        : []
      : getCombos(lineupIds, modeSize);

    sourceCombos.forEach((combo) => {
      const sortedCombo = [...combo].sort();

      if (synergyFocusPlayerId && !sortedCombo.includes(synergyFocusPlayerId)) {
        return;
      }

      const key = sortedCombo.join("|");

      if (!synergyMap[key]) {
        synergyMap[key] = {
          key,
          playerIds: sortedCombo,
          times: 0,
          totalPlusMinus: 0,
          shifts: [],
        };
      }

      synergyMap[key].times += 1;
      synergyMap[key].totalPlusMinus += safeNumber(shift.plusMinus);
      synergyMap[key].shifts.push(shift);
    });
  });

  const synergyRows = Object.values(synergyMap)
    .map((row) => ({
      ...row,
      avgPlusMinus: row.times ? row.totalPlusMinus / row.times : 0,
    }))
    .filter((row) => row.times >= safeNumber(synergyMinTimes, 1))
    .sort((a, b) => {
      if (synergySortKey === "times") return b.times - a.times;
      if (synergySortKey === "total") return b.totalPlusMinus - a.totalPlusMinus;
      return b.avgPlusMinus - a.avgPlusMinus;
    });

  const selectedSynergyRow =
    synergyRows.find((row) => row.key === selectedSynergyKey) || null;
const duoMatrix =
  synergyMode === "duos" ? buildSimpleDuoMatrix(players, synergyRows) : null;
  const duoMatrixData =
    synergyMode === "duos" ? buildDuoMatrixData(players, synergyMap, selectedMatrixPlayerId) : null;

  return (
    <div style={styles.contentGridSingle}>
      <Card title="Synergy Controls">
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["duos", "trios", "4-man", "5-man"].map((mode) => (
              <TogglePill
                key={mode}
                active={synergyMode === mode}
                onClick={() => {
                  setSynergyMode(mode);
                  setSelectedSynergyKey("");
                }}
              >
                {mode}
              </TogglePill>
            ))}
          </div>

          <div style={styles.grid4}>
            <div>
              <label style={styles.label}>Sort by</label>
              <select
                value={synergySortKey}
                onChange={(e) => setSynergySortKey(e.target.value)}
                style={styles.select}
              >
                <option value="avg">Average +/-</option>
                <option value="total">Total +/-</option>
                <option value="times">Times together</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Minimum times</label>
              <input
                type="number"
                min="1"
                value={synergyMinTimes}
                onChange={(e) =>
                  setSynergyMinTimes(clamp(safeNumber(e.target.value, 1), 1, 999))
                }
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Focus player</label>
              <select
                value={synergyFocusPlayerId}
                onChange={(e) => setSynergyFocusPlayerId(e.target.value)}
                style={styles.select}
              >
                <option value="">All players</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "end" }}>
              <label
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  fontSize: "14px",
                  background: styles.panelAlt2,
                  border: `1px solid ${styles.border}`,
                  borderRadius: "12px",
                  padding: "10px 12px",
                  width: "100%",
                }}
              >
                <input
                  type="checkbox"
                  checked={synergyExactOnly}
                  onChange={(e) => setSynergyExactOnly(e.target.checked)}
                />
                Exact match only
              </label>
            </div>
          </div>
        </div>
      </Card>

{synergyMode === "duos" && duoMatrix && (
  <Card title="Duo Matrix">
    <TableScroll>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Player</th>
            {players.map((player) => (
              <th key={player.id} style={styles.th}>
                {player.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((rowPlayer) => (
            <tr key={rowPlayer.id}>
              <td style={styles.td}>{rowPlayer.name}</td>
              {players.map((colPlayer) => {
                const value = duoMatrix[rowPlayer.id]?.[colPlayer.id];
                const pairKey = [rowPlayer.id, colPlayer.id].sort().join("|");

                               let bg = "transparent";
if (value !== null) {
 const rankStyle = getRowRankStyle(
  rowPlayer.id,
  colPlayer.id,
  duoMatrix,
  duoMatrixData?.allPlayerIds || []
);

  if (rankStyle === "best") {
    bg = "rgba(18, 120, 60, 0.85)";
  } else if (rankStyle === "upper") {
    bg = "rgba(112, 212, 138, 0.45)";
  } else if (rankStyle === "worst") {
    bg = "rgba(170, 25, 25, 0.85)";
  } else if (rankStyle === "lower") {
    bg = "rgba(255, 123, 123, 0.35)";
  } else {
    bg = "rgba(255,255,255,0.06)";
  }
}

                return (
                  <td
                    key={colPlayer.id}
                    style={{
                      ...styles.td,
                      background: bg,
                      cursor: value === null ? "default" : "pointer",
                    }}
                    onClick={() => {
                      if (value === null || rowPlayer.id === colPlayer.id) return;
                      setSelectedSynergyKey(pairKey);
                    }}
                  >
                    {value === null ? (
                      <span style={styles.chipNA}>—</span>
                    ) : (
                      value.toFixed(1)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  </Card>
)}
      <Card title="Synergy Results">
        {!synergyRows.length ? (
          <div style={styles.miniText}>No matching combos.</div>
        ) : (
          <TableScroll>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Combo</th>
                  <th style={styles.th}>Times Together</th>
                  <th style={styles.th}>Total +/-</th>
                  <th style={styles.th}>Avg +/-</th>
                </tr>
              </thead>
              <tbody>
                {synergyRows.map((row) => (
                  <tr
                    key={row.key}
                    style={{
                      background:
                        selectedSynergyKey === row.key
                          ? "rgba(242,193,78,0.14)"
                          : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedSynergyKey(row.key)}
                  >
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {row.playerIds.map((pid) => (
                          <span
                            key={pid}
                            style={styles.clickableName}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSynergyFocusPlayerId(pid);
                            }}
                          >
                            {playersById[pid]?.name || "Unknown"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={styles.td}>{row.times}</td>
                    <td style={styles.td}>{row.totalPlusMinus}</td>
                    <td style={styles.td}>{row.avgPlusMinus.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>

      {selectedSynergyRow && (
        <Card title="Shifts For Selected Combo">
          {!selectedSynergyRow.shifts.length ? (
            <div style={styles.miniText}>No shifts found.</div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {selectedSynergyRow.shifts.map((shift) => (
                <div key={shift.id} style={styles.shiftCard}>
                  <div style={{ fontWeight: 800 }}>
                    {shift.gameDate} {shift.opponent ? `vs ${shift.opponent}` : ""} • Shift{" "}
                    {shift.shiftNumber}
                  </div>
                  <div style={styles.miniText}>
                    Score {shift.score.us}-{shift.score.them} • +/- {shift.plusMinus}
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    {lineupToText(shift.lineup, playersById)}
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    {summarizeShiftEvents(shift.events || [], playersById)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

     function renderGrowthTab() {
    const chronologicalShifts = [...allSeasonShifts].sort((a, b) =>
      new Date(a.createdAt || a.gameDate).getTime() - new Date(b.createdAt || b.gameDate).getTime()
    );

    function clampRange(start, end, length) {
      const s = clamp(safeNumber(start, 1), 1, Math.max(length, 1));
      const e = clamp(safeNumber(end, s), s, Math.max(length, 1));
      return { start: s, end: e };
    }

    const aRange = clampRange(growthRangeAStart, growthRangeAEnd, chronologicalShifts.length);
    const bRange = clampRange(growthRangeBStart, growthRangeBEnd, chronologicalShifts.length);

    const rangeAShifts = chronologicalShifts.slice(aRange.start - 1, aRange.end);
    const rangeBShifts = chronologicalShifts.slice(bRange.start - 1, bRange.end);

    function aggregateRange(shifts) {
      const totals = {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        turnovers: 0,
        plusMinus: 0,
        trackedCounts: { ...EMPTY_TRACKED_COUNTS },
      };

      shifts.forEach((shift) => {
        Object.values(shift.playerStats || {}).forEach((stats) => {
          totals.points += safeNumber(stats.points);
          totals.rebounds += safeNumber(stats.treb);
          totals.assists += safeNumber(stats.ast);
          totals.steals += safeNumber(stats.stl);
          totals.turnovers += safeNumber(stats.to);
          totals.plusMinus += safeNumber(stats.plusMinus);
        });

        const tracked = shift.tracked || DEFAULT_TRACKED;
        if (tracked.points) totals.trackedCounts.points += 1;
        if (tracked.rebounds) totals.trackedCounts.rebounds += 1;
        if (tracked.assists) totals.trackedCounts.assists += 1;
        if (tracked.steals) totals.trackedCounts.steals += 1;
        if (tracked.turnovers) totals.trackedCounts.turnovers += 1;
        if (tracked.plusMinus) totals.trackedCounts.plusMinus += 1;
      });

      return totals;
    }

    const aggA = aggregateRange(rangeAShifts);
    const aggB = aggregateRange(rangeBShifts);

    const growthRows = [
      ["points", "Points", aggA.points, aggB.points, aggA.trackedCounts.points, aggB.trackedCounts.points],
      ["rebounds", "Rebounds", aggA.rebounds, aggB.rebounds, aggA.trackedCounts.rebounds, aggB.trackedCounts.rebounds],
      ["assists", "Assists", aggA.assists, aggB.assists, aggA.trackedCounts.assists, aggB.trackedCounts.assists],
      ["steals", "Steals", aggA.steals, aggB.steals, aggA.trackedCounts.steals, aggB.trackedCounts.steals],
      ["turnovers", "Turnovers", aggA.turnovers, aggB.turnovers, aggA.trackedCounts.turnovers, aggB.trackedCounts.turnovers],
      ["plusMinus", "+/-", aggA.plusMinus, aggB.plusMinus, aggA.trackedCounts.plusMinus, aggB.trackedCounts.plusMinus],
    ].map(([key, label, aTotal, bTotal, aTracked, bTracked]) => {
      const aValue = growthMode === "totals" ? (aTracked ? aTotal : null) : aTracked ? aTotal / aTracked : null;
      const bValue = growthMode === "totals" ? (bTracked ? bTotal : null) : bTracked ? bTotal / bTracked : null;
      const delta = aValue === null || bValue === null ? null : bValue - aValue;

      return {
        key,
        label,
        aValue,
        bValue,
        delta,
      };
    });

    return (
      <div style={styles.contentGridSingle}>
        <Card title="Growth Controls">
          <div style={styles.grid4}>
            <div>
              <label style={styles.label}>Range A Start</label>
              <input
                type="number"
                min="1"
                value={growthRangeAStart}
                onChange={(e) => setGrowthRangeAStart(safeNumber(e.target.value, 1))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Range A End</label>
              <input
                type="number"
                min="1"
                value={growthRangeAEnd}
                onChange={(e) => setGrowthRangeAEnd(safeNumber(e.target.value, 1))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Range B Start</label>
              <input
                type="number"
                min="1"
                value={growthRangeBStart}
                onChange={(e) => setGrowthRangeBStart(safeNumber(e.target.value, 1))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Range B End</label>
              <input
                type="number"
                min="1"
                value={growthRangeBEnd}
                onChange={(e) => setGrowthRangeBEnd(safeNumber(e.target.value, 1))}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["totals", "perShift"].map((mode) => (
              <TogglePill
                key={mode}
                active={growthMode === mode}
                onClick={() => setGrowthMode(mode)}
              >
                {mode === "perShift" ? "Per Shift" : "Totals"}
              </TogglePill>
            ))}
          </div>

          <div style={{ ...styles.miniText, marginTop: "10px" }}>
            Untracked ranges show N/A instead of 0.0. Delta also shows N/A if either side was untracked.
          </div>
        </Card>

        <Card title="Growth Comparison">
          <TableScroll>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Stat</th>
                  <th style={styles.th}>Range A</th>
                  <th style={styles.th}>Range B</th>
                  <th style={styles.th}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {growthRows.map((row) => {
                  const isTurnovers = row.key === "turnovers";
                  const deltaColor =
                    row.delta === null
                      ? styles.mutedText.color
                      : isTurnovers
                      ? row.delta < 0
                        ? styles.green
                        : row.delta > 0
                        ? styles.red
                        : styles.neutral
                      : row.delta > 0
                      ? styles.green
                      : row.delta < 0
                      ? styles.red
                      : styles.neutral;

                  return (
                    <tr key={row.key}>
                      <td style={styles.td}>{row.label}</td>
                      <td style={styles.td}>
                        <StatCell value={row.aValue} tracked={row.aValue !== null} digits={1} />
                      </td>
                      <td style={styles.td}>
                        <StatCell value={row.bValue} tracked={row.bValue !== null} digits={1} />
                      </td>
                      <td style={styles.td}>
                        {row.delta === null ? (
                          <span style={styles.chipNA}>N/A</span>
                        ) : (
                          <span style={{ color: deltaColor, fontWeight: 800 }}>
                            {row.delta > 0 ? "+" : ""}
                            {row.delta.toFixed(1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      </div>
    );
  }

  function renderPlayerLogsTab() {
    const playerId = selectedLogPlayerId || players[0]?.id || "";
    const selectedPlayer = playersById[playerId];

    return (
      <div style={styles.contentGridSingle}>
        <Card title="Player Logs Controls">
          <div style={{ maxWidth: "320px" }}>
            <label style={styles.label}>Player</label>
            <select
              value={playerId}
              onChange={(e) => setSelectedLogPlayerId(e.target.value)}
              style={styles.select}
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.jersey ? `#${player.jersey}` : ""}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card title={`Game Logs${selectedPlayer ? ` - ${selectedPlayer.name}` : ""}`}>
          {!playerId ? (
            <div style={styles.miniText}>Add players first.</div>
          ) : (
            <TableScroll>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Opponent</th>
                    <th style={styles.th}>PTS</th>
                    <th style={styles.th}>REB</th>
                    <th style={styles.th}>AST</th>
                    <th style={styles.th}>STL</th>
                    <th style={styles.th}>BLK</th>
                    <th style={styles.th}>TO</th>
                    <th style={styles.th}>JB</th>
                    <th style={styles.th}>+/-</th>
                    <th style={styles.th}>2FGA</th>
                    <th style={styles.th}>3FGA</th>
                    <th style={styles.th}>FTM</th>
                    <th style={styles.th}>FT Miss</th>
                    <th style={styles.th}>Shifts</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeSeason.games || []).map((game) => {
                    const display = buildDisplayGamePlayerStats(game, [playerId])[playerId];
                    if (!display) return null;

                    return (
                      <tr key={game.id}>
                        <td style={styles.td}>{game.date}</td>
                        <td style={styles.td}>{game.opponent || "—"}</td>
                        <td style={styles.td}>
                          <StatCell value={display.points} tracked={display.trackedByField.points} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.treb} tracked={display.trackedByField.treb} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.ast} tracked={display.trackedByField.ast} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.stl} tracked={display.trackedByField.stl} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.blk} tracked={display.trackedByField.blk} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.to} tracked={display.trackedByField.to} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.jb} tracked={display.trackedByField.jb} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.plusMinus} tracked={display.trackedByField.plusMinus} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.twoPA} tracked={display.trackedByField.twoPA} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.threePA} tracked={display.trackedByField.threePA} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.ftm} tracked={display.trackedByField.ftm} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.ftMiss} tracked={display.trackedByField.ftMiss} />
                        </td>
                        <td style={styles.td}>
                          <StatCell value={display.shifts} tracked />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Card>
            </div>
    );
  }

 function renderPlayerProfilesTab() {
  const playerId = selectedProfilePlayerId || players[0]?.id || "";
  const profile = selectedPlayerProfile;
  const selectedPlayer = profile?.player || playersById[playerId] || null;

  const getProfileValue = (id, key) => {
    const p = buildPlayerProfileData(activeSeason, id, playerTotals);
    if (!p) return null;

    if (key === "ppg") return p.perGame.points;
    if (key === "rpg") return p.perGame.rebounds;
    if (key === "spg") return p.perGame.steals;
    if (key === "pmg") return p.perGame.plusMinus;
    if (key === "impact") return p.perGame.impact;

    if (key === "onCourtFor")
      return p.gamesPlayed ? p.onCourtStats.pointsForOnCourt / p.gamesPlayed : null;

    if (key === "onCourtAgainst")
      return p.gamesPlayed ? p.onCourtStats.pointsAgainstOnCourt / p.gamesPlayed : null;

    if (key === "onCourtNet")
      return p.gamesPlayed ? p.onCourtStats.netOnCourt / p.gamesPlayed : null;

    return null;
  };

  const getPlayerRank = (getValue, targetPlayerId, lowerIsBetter = false) => {
    const ranked = players
      .map((p) => ({
        id: p.id,
        value: getValue(p.id),
      }))
      .filter((p) => p.value !== null)
      .sort((a, b) => (lowerIsBetter ? a.value - b.value : b.value - a.value));

    const index = ranked.findIndex((p) => p.id === targetPlayerId);
    return index === -1 ? null : index + 1;
  };

  const summaryRows = [
  { key: "ppg", label: "Points / Game", lowerIsBetter: false },
  { key: "rpg", label: "Rebounds / Game", lowerIsBetter: false },
  { key: "spg", label: "Steals / Game", lowerIsBetter: false },
  { key: "pmg", label: "Plus/Minus / Game", lowerIsBetter: false },
  { key: "impact", label: "Impact / Game", lowerIsBetter: false },
  { key: "onCourtFor", label: "Team Scored / Game", lowerIsBetter: false },
  { key: "onCourtAgainst", label: "Team Allowed / Game", lowerIsBetter: true },
  { key: "onCourtNet", label: "Net / Game", lowerIsBetter: false },
];

  return (
    <div style={styles.contentGridSingle}>
      <Card title="Player Profile Controls">
        {!players.length ? (
          <div style={styles.miniText}>Add players first.</div>
        ) : (
          <div style={{ display: "grid", gap: "14px", maxWidth: "520px" }}>
            <div style={{ maxWidth: "320px" }}>
              <label style={styles.label}>Player</label>
              <select
                value={playerId}
                onChange={(e) => setSelectedProfilePlayerId(e.target.value)}
                style={styles.select}
              >
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} {player.jersey ? `#${player.jersey}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Stat View</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <TogglePill
                  active={profileDisplayMode === "perGame"}
                  onClick={() => setProfileDisplayMode("perGame")}
                >
                  Per Game
                </TogglePill>

                <TogglePill
                  active={profileDisplayMode === "totals"}
                  onClick={() => setProfileDisplayMode("totals")}
                >
                  Totals
                </TogglePill>

                <TogglePill
                  active={profileDisplayMode === "perShift"}
                  onClick={() => setProfileDisplayMode("perShift")}
                >
                  Per Shift
                </TogglePill>
              </div>
            </div>
          </div>
        )}
      </Card>

      {!playerId || !profile ? (
        <Card title="Player Profile">
          <div style={styles.miniText}>Select a player.</div>
        </Card>
      ) : (
        <>
          <Card title="Player Profile">
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={styles.profileNameBlock}>
                <div style={styles.profileName}>
                  {selectedPlayer ? selectedPlayer.name : "Player"}
                </div>
                <div style={styles.profileSubtext}>
                  {selectedPlayer?.jersey ? `#${selectedPlayer.jersey} • ` : ""}
                  {profile.gamesPlayed} games played • {profile.totals.shifts} shifts
                </div>
              </div>

              <SectionTitle>Player Summary</SectionTitle>
              <TableScroll>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Stat</th>
                      <th style={styles.th}>Per Game</th>
                      <th style={styles.th}>Per Shift</th>
                      <th style={styles.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((stat) => {
                      const perGame = getProfileValue(playerId, stat.key);

                      const perShift =
                        stat.key === "onCourtFor"
                          ? profile.onCourtStats.shiftsPlayed
                            ? profile.onCourtStats.pointsForOnCourt / profile.onCourtStats.shiftsPlayed
                            : null
                          : stat.key === "onCourtAgainst"
                          ? profile.onCourtStats.shiftsPlayed
                            ? profile.onCourtStats.pointsAgainstOnCourt / profile.onCourtStats.shiftsPlayed
                            : null
                          : stat.key === "onCourtNet"
                          ? profile.onCourtStats.shiftsPlayed
                            ? profile.onCourtStats.netOnCourt / profile.onCourtStats.shiftsPlayed
                            : null
                          : stat.key === "rpg"
                          ? profile.perShift.rebounds
                          : stat.key === "spg"
                          ? profile.perShift.steals
                          : stat.key === "pmg"
                          ? profile.perShift.plusMinus
                          : stat.key === "impact"
                          ? profile.perShift.impact
                          : profile.perShift.points;

                      const total =
                        stat.key === "onCourtFor"
                          ? profile.onCourtStats.pointsForOnCourt
                          : stat.key === "onCourtAgainst"
                          ? profile.onCourtStats.pointsAgainstOnCourt
                          : stat.key === "onCourtNet"
                          ? profile.onCourtStats.netOnCourt
                          : stat.key === "rpg"
                          ? profile.totals.treb
                          : stat.key === "spg"
                          ? profile.totals.stl
                          : stat.key === "pmg"
                          ? profile.totals.plusMinus
                          : stat.key === "impact"
                          ? profile.totals.impact
                          : profile.totals.points;

                      const rank = getPlayerRank(
                        (id) => getProfileValue(id, stat.key),
                        playerId,
                        stat.lowerIsBetter
                      );

                      return (
                        <tr key={stat.key}>
                         <td style={styles.td}>
  <span style={styles.summaryStatLabel}>{stat.label}</span>
</td>

<td style={styles.td}>
  <StatCell value={perGame} tracked={perGame !== null} digits={1} />
  {rank ? (
    <span style={rank <= 3 ? styles.summaryRankTop3(rank) : styles.summaryRank}>
      #{rank}
    </span>
  ) : null}
</td>

                          <td style={styles.td}>
                            <StatCell value={perShift} tracked={perShift !== null} digits={1} />
                          </td>

                          <td style={styles.td}>
                            <StatCell value={total} tracked={total !== null} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableScroll>

              <div style={styles.divider} />

              <SectionTitle>
                {profileDisplayMode === "totals"
                  ? "Team Results While This Player Was On Court — Totals"
                  : profileDisplayMode === "perShift"
                  ? "Team Results While This Player Was On Court — Per Shift"
                  : "Team Results While This Player Was On Court — Per Game"}
              </SectionTitle>

              <TableScroll>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Team Scored</th>
                      <th style={styles.th}>Team Allowed</th>
                      <th style={styles.th}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.td}>
                        <StatCell
                          value={
                            profileDisplayMode === "totals"
                              ? profile.onCourtStats.pointsForOnCourt
                              : profileDisplayMode === "perShift"
                              ? profile.onCourtStats.shiftsPlayed
                                ? profile.onCourtStats.pointsForOnCourt / profile.onCourtStats.shiftsPlayed
                                : null
                              : profile.gamesPlayed
                              ? profile.onCourtStats.pointsForOnCourt / profile.gamesPlayed
                              : null
                          }
                          tracked={
                            profileDisplayMode === "totals"
                              ? true
                              : profileDisplayMode === "perShift"
                              ? profile.onCourtStats.shiftsPlayed > 0
                              : profile.gamesPlayed > 0
                          }
                          digits={profileDisplayMode === "totals" ? null : 1}
                        />
                      </td>

                      <td style={styles.td}>
                        <StatCell
                          value={
                            profileDisplayMode === "totals"
                              ? profile.onCourtStats.pointsAgainstOnCourt
                              : profileDisplayMode === "perShift"
                              ? profile.onCourtStats.shiftsPlayed
                                ? profile.onCourtStats.pointsAgainstOnCourt / profile.onCourtStats.shiftsPlayed
                                : null
                              : profile.gamesPlayed
                              ? profile.onCourtStats.pointsAgainstOnCourt / profile.gamesPlayed
                              : null
                          }
                          tracked={
                            profileDisplayMode === "totals"
                              ? true
                              : profileDisplayMode === "perShift"
                              ? profile.onCourtStats.shiftsPlayed > 0
                              : profile.gamesPlayed > 0
                          }
                          digits={profileDisplayMode === "totals" ? null : 1}
                        />
                      </td>

                      <td style={styles.td}>
                        <StatCell
                          value={
                            profileDisplayMode === "totals"
                              ? profile.onCourtStats.netOnCourt
                              : profileDisplayMode === "perShift"
                              ? profile.onCourtStats.shiftsPlayed
                                ? profile.onCourtStats.netOnCourt / profile.onCourtStats.shiftsPlayed
                                : null
                              : profile.gamesPlayed
                              ? profile.onCourtStats.netOnCourt / profile.gamesPlayed
                              : null
                          }
                          tracked={
                            profileDisplayMode === "totals"
                              ? true
                              : profileDisplayMode === "perShift"
                              ? profile.onCourtStats.shiftsPlayed > 0
                              : profile.gamesPlayed > 0
                          }
                          digits={profileDisplayMode === "totals" ? null : 1}
                          positiveColor={styles.green}
                          negativeColor={styles.red}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </TableScroll>
            </div>
          </Card>

          <Card title="Season Highs">
            <TableScroll>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Best</th>
                    <th style={styles.th}>Game</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.td}>Points Scored</td>
                    <td style={styles.td}>
                      {profile.seasonHighs.points ? profile.seasonHighs.points.value : <span style={styles.chipNA}>N/A</span>}
                    </td>
                    <td style={styles.td}>
                      {profile.seasonHighs.points
                        ? `${profile.seasonHighs.points.date || "—"}${profile.seasonHighs.points.opponent ? ` vs ${profile.seasonHighs.points.opponent}` : ""}`
                        : "—"}
                    </td>
                  </tr>

                  <tr>
                    <td style={styles.td}>Rebounds</td>
                    <td style={styles.td}>
                      {profile.seasonHighs.rebounds ? profile.seasonHighs.rebounds.value : <span style={styles.chipNA}>N/A</span>}
                    </td>
                    <td style={styles.td}>
                      {profile.seasonHighs.rebounds
                        ? `${profile.seasonHighs.rebounds.date || "—"}${profile.seasonHighs.rebounds.opponent ? ` vs ${profile.seasonHighs.rebounds.opponent}` : ""}`
                        : "—"}
                    </td>
                  </tr>

                  <tr>
                    <td style={styles.td}>Steals</td>
                    <td style={styles.td}>
                      {profile.seasonHighs.steals ? profile.seasonHighs.steals.value : <span style={styles.chipNA}>N/A</span>}
                    </td>
                    <td style={styles.td}>
                      {profile.seasonHighs.steals
                        ? `${profile.seasonHighs.steals.date || "—"}${profile.seasonHighs.steals.opponent ? ` vs ${profile.seasonHighs.steals.opponent}` : ""}`
                        : "—"}
                    </td>
                  </tr>

                  <tr>
                    <td style={styles.td}>Best +/-</td>
                    <td style={styles.td}>
                      {profile.seasonHighs.plusMinus ? `${profile.seasonHighs.plusMinus.value > 0 ? "+" : ""}${profile.seasonHighs.plusMinus.value}` : <span style={styles.chipNA}>N/A</span>}
                    </td>
                    <td style={styles.td}>
                      {profile.seasonHighs.plusMinus
                        ? `${profile.seasonHighs.plusMinus.date || "—"}${profile.seasonHighs.plusMinus.opponent ? ` vs ${profile.seasonHighs.plusMinus.opponent}` : ""}`
                        : "—"}
                    </td>
                  </tr>

                  <tr>
                    <td style={styles.td}>Highest Impact</td>
                    <td style={styles.td}>
                      {profile.seasonHighs.impact ? profile.seasonHighs.impact.value.toFixed(1) : <span style={styles.chipNA}>N/A</span>}
                    </td>
                    <td style={styles.td}>
                      {profile.seasonHighs.impact
                        ? `${profile.seasonHighs.impact.date || "—"}${profile.seasonHighs.impact.opponent ? ` vs ${profile.seasonHighs.impact.opponent}` : ""}`
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </TableScroll>
          </Card>
        </>
      )}
    </div>
  );
}
function renderPeriodAveragesTab() {

  const games = activeSeason.games || [];
  const maxGame = Math.max(games.length, 1);

  const start = clamp(periodStartGame, 1, maxGame);
  const end = clamp(periodEndGame, start, maxGame);

  const selectedGames = games.slice(start - 1, end);
  const totalsByPlayer = buildPeriodPlayerTotals(selectedGames, players);

  const rows = players.map((player) => {
  const totals = totalsByPlayer[player.id] || createBlankPlayerStats();
  return {
    player,
    totals,
    impact: getImpactFromTotals(totals),
  };
});

  return (
    <div style={styles.contentGridSingle}>
      <Card title="Period Averages Controls">
        <div style={styles.grid3}>
          <div>
            <label style={styles.label}>Start Game</label>
            <input
              type="number"
              min="1"
              max={maxGame}
              value={periodStartGame}
              onChange={(e) => setPeriodStartGame(safeNumber(e.target.value, 1))}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>End Game</label>
            <input
              type="number"
              min="1"
              max={maxGame}
              value={periodEndGame}
              onChange={(e) => setPeriodEndGame(safeNumber(e.target.value, 1))}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Mode</label>
            <select
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value)}
              style={styles.select}
            >
              <option value="totals">Totals</option>
              <option value="perGame">Per Game</option>
              <option value="perShift">Per Shift</option>
            </select>
          </div>
        </div>

        <div style={{ ...styles.miniText, marginTop: "10px" }}>
          Range: Games {start}–{end} • {selectedGames.length} game(s)
        </div>
      </Card>

      <Card title="Player Period Stats">
        <TableScroll>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Player</th>
                <th style={styles.th}>Shifts</th>
                <th style={styles.th}>Impact</th>
                <th style={styles.th}>PTS</th>
                <th style={styles.th}>REB</th>
                <th style={styles.th}>AST</th>
                <th style={styles.th}>STL</th>
                <th style={styles.th}>BLK</th>
                <th style={styles.th}>TO</th>
                <th style={styles.th}>+/-</th>
                <th style={styles.th}>2PM</th>
                <th style={styles.th}>2FGA</th>
                <th style={styles.th}>3PM</th>
                <th style={styles.th}>3FGA</th>
                <th style={styles.th}>FTM</th>
                <th style={styles.th}>FTA</th>
                <th style={styles.th}>FT%</th>
              </tr>
            </thead>
<tbody>
  {rows.map(({ player, totals, impact }) => (
    <tr key={player.id}>
      <td style={styles.td}>
        {player.name} {player.jersey ? `#${player.jersey}` : ""}
      </td>

      <td style={styles.td}>
        <StatCell
          value={
            periodMode === "totals"
              ? totals.shifts
              : getPeriodDisplayValue(totals, periodMode, "shifts")
          }
          tracked
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={
            periodMode === "totals"
              ? impact
              : periodMode === "perGame"
              ? (() => {
                  const gameCount = Math.max(
                    totals.trackedGames.points,
                    totals.trackedGames.rebounds,
                    totals.trackedGames.assists,
                    totals.trackedGames.steals,
                    totals.trackedGames.blocks,
                    totals.trackedGames.turnovers,
                    totals.trackedGames.plusMinus
                  );
                  return gameCount ? impact / gameCount : null;
                })()
              : (() => {
                  const tracked = totals.trackedShiftCounts.points;
                  return tracked ? impact / tracked : null;
                })()
          }
          tracked={impact !== null}
          digits={periodMode === "totals" ? 1 : 2}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "points")}
          tracked={getPeriodDisplayValue(totals, periodMode, "points") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "treb")}
          tracked={getPeriodDisplayValue(totals, periodMode, "treb") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "ast")}
          tracked={getPeriodDisplayValue(totals, periodMode, "ast") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "stl")}
          tracked={getPeriodDisplayValue(totals, periodMode, "stl") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "blk")}
          tracked={getPeriodDisplayValue(totals, periodMode, "blk") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "to")}
          tracked={getPeriodDisplayValue(totals, periodMode, "to") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "plusMinus")}
          tracked={getPeriodDisplayValue(totals, periodMode, "plusMinus") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "twoPM")}
          tracked={getPeriodDisplayValue(totals, periodMode, "twoPM") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "twoPA")}
          tracked={getPeriodDisplayValue(totals, periodMode, "twoPA") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "threePM")}
          tracked={getPeriodDisplayValue(totals, periodMode, "threePM") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "threePA")}
          tracked={getPeriodDisplayValue(totals, periodMode, "threePA") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "ftm")}
          tracked={getPeriodDisplayValue(totals, periodMode, "ftm") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        <StatCell
          value={getPeriodDisplayValue(totals, periodMode, "fta")}
          tracked={getPeriodDisplayValue(totals, periodMode, "fta") !== null}
          digits={periodMode === "totals" ? null : 1}
        />
      </td>

      <td style={styles.td}>
        {getPeriodDisplayValue(totals, periodMode, "ftPct") === null ? (
          <span style={styles.chipNA}>N/A</span>
        ) : (
          `${getPeriodDisplayValue(totals, periodMode, "ftPct").toFixed(1)}%`
        )}
      </td>
    </tr>
  ))}
</tbody>
          </table>
        </TableScroll>
      </Card>
    </div>
  );
}

   return (
    <div style={styles.app}>
      {renderTopBar()}
      {renderTabs()}

      {activeTab === "Live Tracker" && renderLiveTab()}
      {activeTab === "Saved Shifts" && renderSavedShiftsTab()}
      {activeTab === "Games" && renderGamesTab()}
      {activeTab === "Rankings" && renderRankingsTab()}
      {activeTab === "Leaderboards" && renderLeaderboardsTab()}
      {activeTab === "Synergy" && renderSynergyTab()}
      {activeTab === "Growth" && renderGrowthTab()}
      {activeTab === "Player Logs" && renderPlayerLogsTab()}
      {activeTab === "Player Profiles" && renderPlayerProfilesTab()}
      {activeTab === "Period Averages" && renderPeriodAveragesTab()}
    </div>
  );
}