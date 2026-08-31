import equipmentList from '../equipmentList.js';

/**
 * Writer state stores numeric equipment IDs. The DB and prompts need labels.
 * Production QA C wrote bodyweight-only days because IDs were sent through as-is
 * (nothing matched COMMON_GYM_EQUIPMENT → "Bodyweight only").
 */
export function resolveEquipmentLabels(equipment = [], catalog = equipmentList) {
  if (!Array.isArray(equipment) || equipment.length === 0) return [];

  const byValue = new Map(catalog.map((item) => [String(item.value), item.label]));
  const byLabel = new Map(catalog.map((item) => [item.label.toLowerCase(), item.label]));
  const resolved = [];
  const seen = new Set();

  for (const item of equipment) {
    if (item == null || item === '') continue;
    const asString = String(item).trim();
    const fromId = byValue.get(asString);
    const fromLabel = byLabel.get(asString.toLowerCase());
    const label = fromId || fromLabel || (/^\d+$/.test(asString) ? null : asString);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(label);
  }

  return resolved;
}

export function pickEquipmentLabels(
  { requestEquipment, dbEquipment } = {},
  catalog = equipmentList
) {
  const fromRequest = resolveEquipmentLabels(requestEquipment, catalog);
  if (fromRequest.length > 0) return fromRequest;
  return resolveEquipmentLabels(dbEquipment, catalog);
}
