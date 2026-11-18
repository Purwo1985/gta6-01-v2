// CINDER FALLS — save: one small localStorage record. Mission
// progress, cash, busted count and where Dana last stood survive a
// reload, so the start screen can offer Continue. A corrupt record is
// ignored rather than crashing the boot.
const KEY = 'cinderfalls-save-v1';

export function defaultSave() {
  return {
    cash: 150,
    missionIndex: 0,
    completed: [],
    busted: 0,
    ammo: 0,
    hasGun: false,
    armor: 0,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave();
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Private mode or a full store: the game still plays, it just
    // cannot remember. Never let saving break playing.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do: the record is already gone or unreachable.
  }
}
