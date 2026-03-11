
// Offline Tactical Analysis Computer
// Replaces external AI dependency with local logic

export const getTacticalAnalysis = async (wave: number, enemyDescriptions: string[], bossInfo?: string): Promise<string> => {
  // Simulate processing time for realism
  await new Promise(resolve => setTimeout(resolve, 600));

  // 1. Boss Logic
  if (bossInfo) {
    const bossResponses = [
      `CRITICAL ALERT: Class-5 Entity "${bossInfo}" detected. Concentrate fire on the core!`,
      `WARNING: Massive signature "${bossInfo}" approaching. All batteries, open fire!`,
      `BOSS DETECTED: "${bossInfo}". Standard rounds ineffective. Use heavy ordnance.`,
      `TACTICAL UPDATE: "${bossInfo}" has entered the sector. Defense protocols elevated to RED.`,
      `Scanner detection: "${bossInfo}". High durability confirmed. Sustain maximum DPS.`
    ];
    return bossResponses[Math.floor(Math.random() * bossResponses.length)];
  }

  // 2. Analysis Logic based on enemy traits
  const enemyStr = enemyDescriptions.join(' ').toUpperCase();
  const responses: string[] = [];

  if (enemyStr.includes('FAST') || enemyStr.includes('SPEEDSTER')) {
    responses.push("Fast movers inbound. Pulse Cannons and Lasers recommended for tracking.");
    responses.push("Velocity warning. Targets are moving quickly. Use rapid-fire defenses.");
  }
  
  if (enemyStr.includes('TANK') || enemyStr.includes('ARMORED')) {
    responses.push("Heavy armor detected. Plasma Mortars and Rockets required for penetration.");
    responses.push("Targets heavily plated. Low caliber weapons will be ineffective.");
  }

  if (enemyStr.includes('REGEN')) {
    responses.push("Bio-signature regenerating. Maintain continuous fire to suppress healing.");
    responses.push("Targets are self-repairing. Burst damage recommended.");
  }

  if (enemyStr.includes('SHIELD')) {
    responses.push("Energy shields detected. Overwhelm them with high rate of fire.");
    responses.push("Hostiles have active shielding. Lasers are effective at stripping shields.");
  }

  if (enemyStr.includes('SWARM') || enemyDescriptions.length > 2) {
    responses.push("Swarm tactics detected. Area-of-effect weapons (Plasma/Rocket) advised.");
    responses.push("Multiple signatures inbound. Crowd control recommended.");
  }

  // If we found specific advice, return one randomly
  if (responses.length > 0) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // 3. Generic fallback responses
  const genericResponses = [
    `Wave ${wave} inbound. Check ammunition feeds and capacitor charges.`,
    "Hostiles approaching from the north. Defense grid is green.",
    "Tactical computer online. No anomalies detected. Engage at will.",
    "Enemy signatures confirmed. Protect the core at all costs.",
    "Standard defensive patterns loaded. Good luck, Commander.",
    "Sensors are clear. Prepare for engagement.",
    "Incoming wave. Stay sharp.",
    "Energy levels nominal. Systems ready."
  ];

  return genericResponses[Math.floor(Math.random() * genericResponses.length)];
};
