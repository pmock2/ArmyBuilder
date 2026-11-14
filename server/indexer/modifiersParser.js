const SKIP_WARGEAR_NAMES = [
  'enhancements',
  'crusade',
  'weapon modifications',
  'weapon upgrades',
  'terminator honours upgrade',
  'warlord',
  'totemic presence upgrade',
  'battle honours',
  'battle scars',
  'relics'
];

function shouldSkipWargearNode(node) {
  if (!node || !node.name) return true;
  if (node.hidden) return true;
  const lower = node.name.toLowerCase();
  return SKIP_WARGEAR_NAMES.some((s) => lower.includes(s));
}

function evaluateStaticCondition(c, ancestorIds) {
  if (!c) return null;
  if (c.scope && c.scope !== 'ancestor') return null;
  if (c.type === 'instanceOf') return ancestorIds ? ancestorIds.has(c.childId) : false;
  if (c.type === 'notInstanceOf') return ancestorIds ? !ancestorIds.has(c.childId) : true;
  return null;
}

function evaluateStaticConditionGroup(cg, ancestorIds) {
  if (!cg) return true;
  const results = [];
  for (const c of (cg.conditions || [])) {
    const r = evaluateStaticCondition(c, ancestorIds);
    if (r === null) return null;
    results.push(r);
  }
  for (const sub of (cg.conditionGroups || [])) {
    const r = evaluateStaticConditionGroup(sub, ancestorIds);
    if (r === null) return null;
    results.push(r);
  }
  if (results.length === 0) return true;
  return cg.type === 'or' ? results.some(Boolean) : results.every(Boolean);
}

function areStaticConditionsMet(node, ancestorIds) {
  const hasConds = (node.conditions && node.conditions.length > 0) || (node.conditionGroups && node.conditionGroups.length > 0);
  if (!hasConds) return true;
  if (!ancestorIds) return false;
  return evaluateStaticConditionGroup({ type: 'and', conditions: node.conditions, conditionGroups: node.conditionGroups }, ancestorIds) === true;
}

function collectActiveStaticModifiers(ancestorIds, ...nodes) {
  const active = [];
  for (const n of nodes) {
    if (!n) continue;
    for (const m of (n.modifiers || [])) {
      if (!m || (m.repeats && m.repeats.length)) continue;
      if (areStaticConditionsMet(m, ancestorIds)) {
        active.push(m);
      }
    }
    for (const mg of (n.modifierGroups || [])) {
      if (!mg || (mg.repeats && mg.repeats.length)) continue;
      if (!areStaticConditionsMet(mg, ancestorIds)) continue;
      for (const m of (mg.modifiers || [])) {
        if (!m || (m.repeats && m.repeats.length)) continue;
        if (areStaticConditionsMet(m, ancestorIds)) {
          active.push(m);
        }
      }
    }
  }
  return active;
}

function isHiddenByAncestorModifiers(ancestorIds, ...nodes) {
  const active = collectActiveStaticModifiers(ancestorIds, ...nodes);
  return active.some((m) => m.field === 'hidden' && m.type === 'set' && (m.value === true || m.value === 'true'));
}

/**
 * Collects `set` modifiers (unconditional or statically matching `ancestorIds`)
 * that override a constraint's value (e.g. "set max to 1 for Crisis Fireknife").
 */
function getUnconditionalConstraintOverrides(ancestorIds, ...nodes) {
  const overrides = new Map();
  const active = collectActiveStaticModifiers(ancestorIds, ...nodes);
  for (const m of active) {
    if (!m || m.type !== 'set' || !m.field || m.field === 'hidden') continue;
    overrides.set(m.field, Number(m.value));
  }
  return overrides;
}

function getWargearMinMax(node, resolved, ancestorIds = null) {
  const constraints = [
    ...(node.constraints || []),
    ...((resolved && resolved !== node && resolved.constraints) || [])
  ];
  const overrides = getUnconditionalConstraintOverrides(ancestorIds, node, resolved !== node ? resolved : null);
  const valueOf = (c) => (overrides.has(c.id) ? overrides.get(c.id) : Number(c.value));

  const minC = constraints.find(
    (c) => c.type === 'min' && c.field === 'selections' && (!c.scope || c.scope === 'parent')
  );
  const maxC = constraints.find(
    (c) => c.type === 'max' && c.field === 'selections' && (!c.scope || c.scope === 'parent')
  );
  const maxVal = maxC ? valueOf(maxC) : null;
  return {
    min: minC ? valueOf(minC) : 0,
    // A max of -1 in BattleScribe means "unlimited"
    max: maxVal === null || maxVal < 0 || isNaN(maxVal) ? null : maxVal
  };
}

function getNodeDirectPts(node, resolved) {
  let nodePts = 0;
  if (node && node.costs) {
    const c = node.costs.find((x) => x.name === 'pts' || x.typeId === '51b2-306e-1021-d207');
    if (c) nodePts = Math.max(nodePts, Number(c.value) || 0);
  }
  if (resolved && resolved !== node && resolved.costs) {
    const c = resolved.costs.find((x) => x.name === 'pts' || x.typeId === '51b2-306e-1021-d207');
    if (c) nodePts = Math.max(nodePts, Number(c.value) || 0);
  }
  return nodePts;
}

const STAT_FIELD_MAP = {
  'e703-ecb6-5ce7-aec1': { target: 'unit', stat: 'M' },
  'd29d-cf75-fc2d-34a4': { target: 'unit', stat: 'T' },
  '450-a17e-9d5e-29da': { target: 'unit', stat: 'Sv' },
  '750a-a2ec-90d3-21fe': { target: 'unit', stat: 'W' },
  '58d2-b879-49c7-43bc': { target: 'unit', stat: 'Ld' },
  'bef7-942a-1a23-59f8': { target: 'unit', stat: 'OC' },
  '55a7-5b54-c60d-11dc': { target: 'unit', stat: 'InSv' },
  '9896-9419-16a1-92fc': { target: 'ranged', stat: 'range' },
  '3bb-c35f-f54-fb08': { target: 'ranged', stat: 'A' },
  '94d-8a98-cf90-183e': { target: 'ranged', stat: 'BS' },
  '2229-f494-25db-c5d3': { target: 'ranged', stat: 'S' },
  '9ead-8a10-520-de15': { target: 'ranged', stat: 'AP' },
  'a354-c1c8-a745-f9e3': { target: 'ranged', stat: 'D' },
  '7f1b-8591-2fcf-d01c': { target: 'ranged', stat: 'keywords' },
  '2337-daa1-6682-b110': { target: 'melee', stat: 'A' },
  '95d1-95f-45b4-11d6': { target: 'melee', stat: 'WS' },
  'ab33-d393-96ce-ccba': { target: 'melee', stat: 'S' },
  '41a0-1301-112a-e2f2': { target: 'melee', stat: 'AP' },
  '3254-9fe6-d824-513e': { target: 'melee', stat: 'D' },
  '893f-9000-ccf7-648e': { target: 'melee', stat: 'keywords' }
};

function createModifiersParser(allEntriesById) {
  function extractOptionPts(item) {
    if (!item) return 0;
    const resolved = item.targetId ? allEntriesById.get(item.targetId) : item;
    const directPts = getNodeDirectPts(item, resolved);
    if (directPts > 0) return directPts;

    let childPts = 0;
    const seen = new Set();
    const sumChildren = (container) => {
      if (!container) return;
      const children = [
        ...(container.selectionEntries || []),
        ...(container.entryLinks || [])
      ];
      for (const ch of children) {
        if (!ch || (ch.id && seen.has(ch.id))) continue;
        if (ch.id) seen.add(ch.id);
        const chRes = ch.targetId ? allEntriesById.get(ch.targetId) : ch;
        const chType =
          ch.type === 'model' || (chRes && chRes.type === 'model')
            ? 'model'
            : (chRes && chRes.type) || ch.type;
        if (chType === 'model') continue;
        childPts += getNodeDirectPts(ch, chRes);
      }
    };
    sumChildren(item);
    if (resolved && resolved !== item) sumChildren(resolved);
    return childPts;
  }

  function extractStatAndRuleModifiers(item, profiles = []) {
    if (!item) return [];
    const resolved = item.targetId ? allEntriesById.get(item.targetId) : item;
    const statModifiers = [];
    const seenKeys = new Set();

    const addMod = (modObj) => {
      const key = `${modObj.target}|${modObj.stat}|${modObj.type}|${modObj.value}|${
        modObj.requiredWeaponKeyword || ''
      }`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        statModifiers.push(modObj);
      }
    };

    const inspectModifierList = (modList) => {
      if (!modList) return;
      for (const m of modList) {
        if (!m || !m.field) continue;
        const mapped = STAT_FIELD_MAP[m.field];
        if (mapped && ['increment', 'decrement', 'set', 'append'].includes(m.type)) {
          let val = m.value;
          if (mapped.stat === 'keywords' && m.type === 'append') {
            val = String(val || '').replace(/^[\s,]+|[\s,]+$/g, '');
            if (!val) continue;
          } else if (m.type === 'increment' || m.type === 'decrement') {
            const num = Number(val);
            if (!isNaN(num)) val = num;
          } else {
            val = String(val);
          }
          const modEntry = {
            target: mapped.target,
            stat: mapped.stat,
            type: m.type,
            value: val
          };
          if (m.affects && String(m.affects).includes('064a-0470-60eb-e3ef')) {
            modEntry.requiredWeaponKeyword = 'Torrent';
          }
          addMod(modEntry);
        }
      }
    };

    const visited = new Set();
    const walkMods = (node) => {
      if (!node || (node.id && visited.has(node.id))) return;
      if (node.id) visited.add(node.id);

      inspectModifierList(node.modifiers);
      if (node.modifierGroups) {
        for (const mg of node.modifierGroups) {
          inspectModifierList(mg.modifiers);
        }
      }
      if (node.selectionEntries) {
        for (const ch of node.selectionEntries) {
          if (shouldSkipWargearNode(ch)) continue;
          const chRes = ch.targetId ? allEntriesById.get(ch.targetId) : ch;
          if (ch.type === 'model' || (chRes && chRes.type === 'model')) continue;
          walkMods(ch);
        }
      }
      if (node.entryLinks) {
        for (const l of node.entryLinks) {
          if (shouldSkipWargearNode(l)) continue;
          const lRes = l.targetId ? allEntriesById.get(l.targetId) : l;
          if (l.type === 'model' || (lRes && lRes.type === 'model')) continue;
          walkMods(l);
          if (lRes && lRes !== l) walkMods(lRes);
        }
      }
    };

    walkMods(item);
    if (resolved && resolved !== item) walkMods(resolved);

    // Prose fallbacks for wargear/enhancements whose stat buffs are only in ability descriptions
    for (const p of profiles || []) {
      if (p.type !== 'ability' || !p.description) continue;
      const desc = p.description;

      if (!statModifiers.some((m) => m.target === 'unit' && m.stat === 'W')) {
        const addWMatch = desc.match(/add\s+(\d+)\s+to\s+the\s+bearer['’]?s\s+wounds\s+characteristic/i);
        const setWMatch = desc.match(/the\s+bearer\s+has\s+a\s+wounds\s+characteristic\s+of\s+(\d+)/i);
        if (addWMatch) {
          addMod({ target: 'unit', stat: 'W', type: 'increment', value: Number(addWMatch[1]) });
        } else if (setWMatch) {
          addMod({ target: 'unit', stat: 'W', type: 'set', value: String(setWMatch[1]) });
        }
      }

      if (!statModifiers.some((m) => m.target === 'unit' && m.stat === 'InSv')) {
        const invMatch = desc.match(
          /(?:bearer|model|models in (?:that|this|the bearer['’]?s) unit|this unit)\s+(?:has|have)\s+a\s+(\d\+)\s+(?:invulnerable\s+save|invsv|insv)/i
        );
        if (invMatch) {
          addMod({ target: 'unit', stat: 'InSv', type: 'set', value: invMatch[1] });
        }
      }

      if (!statModifiers.some((m) => m.target === 'unit' && m.stat === 'Sv')) {
        const svMatch = desc.match(
          /(?:the\s+bearer|models\s+in\s+(?:that|this|the\s+bearer['’]?s)\s+unit|this\s+unit)\s+(?:has|have)\s+a\s+save\s+characteristic\s+of\s+(\d\+)/i
        );
        if (svMatch) {
          addMod({ target: 'unit', stat: 'Sv', type: 'set', value: svMatch[1] });
        }
      }

      if (!statModifiers.some((m) => m.target === 'unit' && m.stat === 'T')) {
        const addTMatch = desc.match(
          /add\s+(\d+)\s+to\s+the\s+(?:bearer['’]?s\s+)?toughness\s+characteristic/i
        );
        if (addTMatch) {
          addMod({ target: 'unit', stat: 'T', type: 'increment', value: Number(addTMatch[1]) });
        }
      }

      if (!statModifiers.some((m) => m.target === 'unit' && m.stat === 'M')) {
        const addMMatch = desc.match(
          /add\s+(\d+)"?\s+to\s+(?:the\s+bearer['’]?s\s+|models\s+in\s+the\s+bearer['’]?s\s+unit['’]?s?\s+|the\s+)?move\s+characteristic/i
        );
        if (addMMatch) {
          addMod({ target: 'unit', stat: 'M', type: 'increment', value: Number(addMMatch[1]) });
        }
      }

      if (!statModifiers.some((m) => m.target === 'unit' && m.stat === 'OC')) {
        const addOCMatch = desc.match(
          /add\s+(\d+)\s+to\s+the\s+(?:bearer['’]?s\s+)?objective\s+control\s+characteristic/i
        );
        if (addOCMatch) {
          addMod({ target: 'unit', stat: 'OC', type: 'increment', value: Number(addOCMatch[1]) });
        }
      }
    }

    return statModifiers;
  }

  return {
    extractOptionPts,
    extractStatAndRuleModifiers
  };
}

module.exports = {
  SKIP_WARGEAR_NAMES,
  STAT_FIELD_MAP,
  shouldSkipWargearNode,
  isHiddenByAncestorModifiers,
  getWargearMinMax,
  getNodeDirectPts,
  createModifiersParser
};

